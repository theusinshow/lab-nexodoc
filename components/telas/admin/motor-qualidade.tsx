"use client";

import { Info } from "lucide-react";
import { useEffect, useState } from "react";

import { useAdminToken } from "@/components/admin/admin-token";
import { BarraEmbutida } from "@/components/ds/medidas";
import { SerieComMeta } from "@/components/ds/serie-com-meta";
import { classificarFalha, faseDaCarga, type FalhaDaCarga } from "@/lib/estado-da-carga";
import { formatarDiaDeCalendario } from "@/lib/fuso-de-brasilia";
import { METAS_NAO_DECLARADAS, situacaoDaCobertura, situacaoDoFalsoPositivo, type MetasDeQualidade, type SemanaDeQualidade } from "@/lib/meta-de-qualidade";
import { plural } from "@/lib/plural";

import { NumeroDoPeriodo } from "./pecas";
import "./motor.css";

/*
 * A QUALIDADE DO MOTOR no sistema novo. A carga veio de
 * `components/admin/conteudo/qualidade.tsx` (/api/admin/quality): números do
 * período, a série semanal contra a meta declarada (sem meta, o painel não
 * julga) e as comparações por nível e por modelo.
 */

type Balde = {
  key: string;
  label: string;
  completedAudits: number;
  reviewedAudits: number;
  generatedFindings: number;
  confirmed: number;
  falsePositive: number;
  wrongSeverity: number;
  missingFinding: number;
  totalFeedback: number;
  confirmationRate: number | null;
  falsePositiveRate: number | null;
  reviewCoverage: number | null;
  averageDurationMs: number | null;
  averageFindings: number | null;
};

type Resposta = {
  overview: Balde;
  levels: Balde[];
  models: Balde[];
  meta?: { metas: MetasDeQualidade; origem: "banco" | "ambiente" | "nenhuma"; databaseConfigured: boolean };
  serie?: SemanaDeQualidade[];
  tendencia?: number | null;
  generatedAt: string;
};

const numero = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
const pct = (v: number | null) => (v === null ? "—" : `${v.toLocaleString("pt-BR")}%`);
const tempo = (ms: number | null) => {
  if (ms === null) return "—";
  const s = Math.max(1, Math.round(ms / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
};
const semana = (iso: string) => formatarDiaDeCalendario(iso, { day: "2-digit", month: "2-digit" });

export function useQualidade() {
  const { token, restaurado, recarga, registrarResposta } = useAdminToken();
  const [dados, setDados] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<{ tipo: FalhaDaCarga; detalhe: string | null } | null>(null);
  const [carregadoEm, setCarregadoEm] = useState<string | null>(null);
  const fase = faseDaCarga({ restaurado, token, carregando, erro: erro?.tipo ?? null, temDados: Boolean(dados) });

  async function carregar(t = token) {
    if (!t.trim()) return;
    setCarregando(true);
    setErro(null);
    let r: Response;
    try {
      r = await fetch("/api/admin/quality", { cache: "no-store", headers: { Authorization: `Bearer ${t.trim()}` } });
    } catch {
      setErro({ tipo: "rede", detalhe: null });
      setCarregando(false);
      return;
    }
    const corpo = (await r.json().catch(() => null)) as (Resposta & { error?: string }) | null;
    if (!r.ok || !corpo || "error" in corpo) {
      const tipo = classificarFalha(r);
      if (tipo === "negado") registrarResposta(false);
      setErro({ tipo, detalhe: corpo?.error ?? `HTTP ${r.status}` });
      setCarregando(false);
      return;
    }
    registrarResposta(true);
    setDados(corpo);
    setCarregadoEm(new Date().toISOString());
    setCarregando(false);
  }

  useEffect(() => {
    if (!restaurado || !token.trim()) return;
    queueMicrotask(() => void carregar(token));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, restaurado, recarga]);

  return { dados, fase, erro, carregadoEm, carregando, carregar: () => void carregar() };
}

function Comparacao({ id, titulo, sub, linhas, vazio, metas }: { id: string; titulo: string; sub: string; linhas: Balde[]; vazio: string; metas: MetasDeQualidade }) {
  return (
    <section className="adm-bloco" aria-labelledby={id}>
      <header>
        <h2 id={id}>{titulo}</h2>
      </header>
      <p className="din-lede">{sub}</p>
      {linhas.length === 0 ? (
        <p className="adm-vazio">{vazio}</p>
      ) : (
        <div className="adm-tabela mot-tabela--grupos">
          <div className="adm-linha din-cab">
            <span>Grupo</span>
            <span className="din-direita">Análises</span>
            <span className="din-direita">Rotuladas</span>
            <span className="din-direita">Achados</span>
            <span>Confirmação</span>
            <span>Falso positivo</span>
            <span className="din-direita">Gravidade</span>
            <span className="din-direita">Perdidos</span>
            <span className="din-direita">Tempo médio</span>
          </div>
          {linhas.map((g) => (
            <div key={g.key} className="adm-linha">
              <span className="mp-mono">{g.label}</span>
              <span className="ds-num din-direita">{numero(g.completedAudits)}</span>
              <span className="ds-num din-direita adm-fraco">{numero(g.reviewedAudits)}</span>
              <span className="ds-num din-direita adm-fraco">{numero(g.generatedFindings)}</span>
              <span className="mot-taxa">
                <BarraEmbutida valor={g.confirmationRate ?? 0} maximo={100} />
                <b className="ds-num">{pct(g.confirmationRate)}</b>
              </span>
              <span className="mot-taxa">
                <BarraEmbutida valor={g.falsePositiveRate ?? 0} maximo={100} />
                {/* a cor vem da meta declarada; sem meta, não julga */}
                <b className={`ds-num${situacaoDoFalsoPositivo(g.falsePositiveRate, metas) === "fora" ? " mot-fora" : ""}`}>{pct(g.falsePositiveRate)}</b>
              </span>
              <span className="ds-num din-direita adm-fraco">{numero(g.wrongSeverity)}</span>
              <span className="ds-num din-direita adm-fraco">{numero(g.missingFinding)}</span>
              <span className="ds-num din-direita adm-fraco">{tempo(g.averageDurationMs)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function QualidadeDoMotor({ q }: { q: ReturnType<typeof useQualidade> }) {
  const { dados, fase } = q;
  const v = dados?.overview;
  const metas = dados?.meta?.metas ?? METAS_NAO_DECLARADAS;
  const temMeta = metas.falsoPositivoMax > 0 || metas.coberturaMin > 0;
  const serie = dados?.serie ?? [];
  const tendencia = dados?.tendencia ?? null;
  const semResposta = fase === "sem-token" ? "Aguardando o token de administração." : fase === "erro" ? "Não carregado — veja o aviso no topo." : "Carregando…";

  return (
    <>
      <section className="adm-bloco" aria-labelledby="mot-qual">
        <header>
          <h2 id="mot-qual">Qualidade do motor</h2>
        </header>
        <p className="din-lede">Compare níveis e modelos a partir dos achados revisados manualmente. Quanto mais auditorias rotuladas, mais confiável será a decisão de produto.</p>
        <div className="adm-numeros din-numeros mot-numeros">
          <NumeroDoPeriodo rotulo="Auditorias concluídas" valor={v ? numero(v.completedAudits) : "—"} detalhe={v ? `${numero(v.reviewedAudits)} já têm revisão humana` : semResposta} serie={serie.length > 1 ? serie.map((s) => s.auditorias) : undefined} />
          <NumeroDoPeriodo rotulo="Confirmação" valor={v ? pct(v.confirmationRate) : "—"} detalhe={v ? plural(v.confirmed, "achado confirmado", "achados confirmados") : semResposta} />
          <NumeroDoPeriodo rotulo="Falsos positivos" valor={v ? pct(v.falsePositiveRate) : "—"} detalhe={v ? `${plural(v.falsePositive, "achado", "achados")} marcados como falso positivo` : semResposta} serie={serie.length > 1 ? serie.map((s) => s.taxaFalsoPositivo ?? 0) : undefined} />
          <NumeroDoPeriodo rotulo="Erros perdidos" valor={v ? numero(v.missingFinding) : "—"} detalhe={v ? `${pct(v.reviewCoverage)} das auditorias foram rotuladas` : semResposta} />
        </div>
        {v && v.reviewedAudits < 10 && (
          <p className="din-ressalva mot-ressalva">
            <Info size={14} aria-hidden />
            <span>Amostra inicial: revise pelo menos 10 auditorias de cada nível antes de decidir qual configuração vender como padrão.</span>
          </p>
        )}
      </section>

      <section className="adm-bloco" aria-labelledby="mot-semana">
        <header>
          <h2 id="mot-semana">Semana a semana</h2>
          <span className="mot-metas">
            {!dados ? "meta: —" : temMeta ? [metas.falsoPositivoMax > 0 && `meta: falso positivo ≤ ${metas.falsoPositivoMax}%`, metas.coberturaMin > 0 && `cobertura ≥ ${metas.coberturaMin}%`].filter(Boolean).join(" · ") : "meta não declarada"}
            <a href="#mot-metas-form">declarar</a>
          </span>
        </header>
        <p className="din-lede">
          A taxa divide pelos achados <b>julgados</b>, não pelos gerados: dividir pelo total faria a taxa cair sempre que alguém deixasse de revisar — melhora aparente por preguiça. Semana sem auditoria não vira linha.
        </p>
        {serie.length === 0 ? (
          <p className="adm-vazio">{dados ? "Sem auditoria concluída no histórico — a série aparece a partir da primeira." : semResposta}</p>
        ) : (
          <div className="mot-series">
            <div>
              <p className="din-sub">Falso positivo</p>
              <SerieComMeta
                pontos={serie.map((s) => ({
                  eixo: semana(s.semana),
                  valor: s.taxaFalsoPositivo ?? 0,
                  rotulo: (
                    <>
                      <b className="ds-num">{pct(s.taxaFalsoPositivo)}</b> na semana de {semana(s.semana)} · {plural(s.auditorias, "auditoria", "auditorias")}, {plural(s.achados, "achado", "achados")}
                      {situacaoDoFalsoPositivo(s.taxaFalsoPositivo, metas) === "dentro" ? " · dentro da meta" : situacaoDoFalsoPositivo(s.taxaFalsoPositivo, metas) === "fora" ? " · fora da meta" : ""}
                    </>
                  ),
                }))}
                meta={metas.falsoPositivoMax > 0 ? metas.falsoPositivoMax : null}
                sentido="max"
                teto={Math.max(30, ...serie.map((s) => s.taxaFalsoPositivo ?? 0))}
                padrao={
                  tendencia === null
                    ? "Passe o mouse numa semana."
                    : tendencia === 0
                      ? "falso positivo estável entre as duas últimas semanas julgadas"
                      : `falso positivo ${tendencia < 0 ? "caiu" : "subiu"} ${plural(Math.abs(tendencia), "ponto", "pontos")} na última semana julgada`
                }
              />
            </div>
            <div>
              <p className="din-sub">Cobertura de revisão</p>
              <SerieComMeta
                pontos={serie.map((s) => ({
                  eixo: semana(s.semana),
                  valor: s.cobertura ?? 0,
                  rotulo: (
                    <>
                      <b className="ds-num">{pct(s.cobertura)}</b> das auditorias da semana de {semana(s.semana)} revisadas
                      {situacaoDaCobertura(s.cobertura, metas) === "dentro" ? " · dentro da meta" : situacaoDaCobertura(s.cobertura, metas) === "fora" ? " · fora da meta" : ""}
                    </>
                  ),
                }))}
                meta={metas.coberturaMin > 0 ? metas.coberturaMin : null}
                sentido="min"
                teto={Math.max(60, ...serie.map((s) => s.cobertura ?? 0))}
                padrao="Passe o mouse numa semana."
              />
            </div>
          </div>
        )}
        {dados && !temMeta && <p className="din-lede">Sem meta declarada, o painel não julga: os pontos ficam sem cor.</p>}
      </section>

      <Comparacao id="mot-nivel" titulo="Comparação por nível" sub="Padrão deve ser rápido e confiável; Profundo precisa justificar maior custo com melhor cobertura." linhas={dados?.levels ?? []} vazio={dados ? "Nenhum nível com auditoria concluída." : semResposta} metas={metas} />
      <Comparacao id="mot-modelo" titulo="Comparação por modelo" sub="O modelo só vence quando reduz falhas reais em auditorias revisadas, não apenas quando produz mais achados." linhas={dados?.models ?? []} vazio={dados ? "Nenhum modelo com auditoria concluída." : semResposta} metas={metas} />
    </>
  );
}

