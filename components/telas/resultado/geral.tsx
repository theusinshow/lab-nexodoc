"use client";

/**
 * O RESUMO COMPLETO: a mesma tela da auditoria em curso, depois de pronta
 * (pedido do Matheus, 02/10/2026: o anel do trilho, com o veredito no meio,
 * abre "o resumo completo que tem a mesma tela que enquanto a auditoria tá
 * rodando").
 *
 * De cima para baixo, como lá: o veredito, a obra e o documento com o tempo
 * que levou; a linha do tempo das etapas; as páginas, com onde os achados
 * caem; e os achados por nível e tipo, cada pílula abrindo o seu na fila.
 *
 * Só o que o parecer guarda: a linha do tempo vem de `runtime.etapas`, gravado
 * desde 02/10/2026; num parecer mais antigo ela não existe, e a tela diz isso.
 */
import { FileText } from "lucide-react";

import { LinhaDoTempo, MapaDasPaginas, NiveisEmFaixa, type GrupoDoMapa, type PassoDaLinha } from "@/components/ds/graficos";
import { avaliarEmissao, classifyFindingErrorType, getErrorTypeLabel, type AuditReport } from "@/lib/audit-report";
import { formatarEmBrasilia } from "@/lib/fuso-de-brasilia";
import { NIVEIS, type Nivel } from "@/lib/nivel-do-achado";
import { tituloDoMemorial } from "@/lib/titulo-do-memorial";

import { conta } from "./textos";
import type { ParecerVivo } from "./use-parecer-vivo";
import "@/components/telas/auditoria/auditoria.css";

/** Os nomes curtos da linha do tempo (os mesmos da auditoria em curso). */
const ROTULO: Record<string, string> = {
  extracao: "Abrindo o memorial",
  regras: "Identidade e coerência",
  global: "Lendo o documento",
  blocos: "Capítulo a capítulo",
  evidencia: "Evidências no texto",
  confronto: "Entre os documentos",
  validacao: "Segundo modelo",
  parecer: "Fechando o parecer",
};

const VEREDITO: Record<ReturnType<typeof avaliarEmissao>["estado"], { rotulo: string; tom: "block" | "decide" | "ok" }> = {
  incompleto: { rotulo: "Análise parcial", tom: "block" },
  nao_emitir: { rotulo: "Não emitir", tom: "block" },
  revisar: { rotulo: "Revisar antes de emitir", tom: "decide" },
  liberado_com_ressalvas: { rotulo: "Liberado com ressalvas", tom: "ok" },
  liberado: { rotulo: "Liberado", tom: "ok" },
};

function mmss(s: number) {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

export function VisaoGeralDoParecer({
  report,
  parecer,
  onAbrir,
  onAbrirNivel,
}: {
  report: AuditReport;
  parecer: ParecerVivo;
  onAbrir: (chave?: string) => void;
  onAbrirNivel: (nivel: Nivel) => void;
}) {
  const { estado, veredito } = avaliarEmissao(report);
  const v = VEREDITO[estado];
  const runtime = report.runtime;
  const arquivo = report.arquivos_analisados[0]?.arquivo ?? "";
  const totalDePaginas = Math.max(0, ...report.arquivos_analisados.map((a) => a.paginas ?? 0));
  const levou = runtime?.duracao_ms ? runtime.duracao_ms / 1000 : null;
  const fim = runtime?.gerado_em ? Date.parse(runtime.gerado_em) : null;

  // ---------- a linha do tempo, do que o parecer gravou ----------
  const etapas = runtime?.etapas ?? [];
  const total = Math.max(60, levou ?? 0, ...etapas.map((e) => (e.fim_ms ?? e.inicio_ms) / 1000));
  const duracoes = etapas.map((e) => ((e.fim_ms ?? levou! * 1000) - e.inicio_ms) / 1000);
  const passos: PassoDaLinha[] = etapas.map((e, i) => ({
    id: e.passada,
    rotulo: ROTULO[e.passada] ?? e.passada,
    inicio: e.inicio_ms / 1000,
    duracao: Math.max(0, duracoes[i] || 0),
    previsto: 0,
    estado: "feito",
  }));

  // ---------- os achados confirmados: por página, por nível e tipo ----------
  const achados = parecer.achados.filter((a) => a.confirmado);
  const paginas = Array.from({ length: totalDePaginas }, (_, i) => achados.filter((a) => a.paginas.includes(i + 1)).length);
  const niveis: GrupoDoMapa[] = NIVEIS.map((n) => {
    const doNivel = achados.filter((a) => a.nivel === n.id);
    const tipos = new Map<string, number>();
    for (const a of doNivel) {
      const tipo = n.id === "texto" ? "Redação e gramática" : getErrorTypeLabel(classifyFindingErrorType(a.bruto));
      tipos.set(tipo, (tipos.get(tipo) ?? 0) + 1);
    }
    return {
      id: n.id,
      rotulo: n.nome,
      tom: n.id,
      itens: [...tipos.entries()].map(([tipo, valor]) => ({ id: tipo, rotulo: tipo, valor, ...(n.id === "texto" ? { tom: "texto" as const } : {}) })),
      // O id que se lê (ACH-014); a pílula devolve a chave gravada na hora de abrir.
      achados: doNivel.map((a) => ({ id: a.id, titulo: a.titulo, feito: Boolean(a.desfecho) })),
    };
  });
  const tratados = achados.filter((a) => a.desfecho).length;
  const colunas = paginas.length <= 42 ? 14 : Math.min(40, Math.ceil(paginas.length / 6));

  return (
    <div className="au au--embutido au--geral">
      <div className="au-corpo">
        <header className={`au-painel au-painel--concluida au-painel--${v.tom}`}>
          <div className="au-painel-topo">
            <div className="au-painel-texto">
              <div className="au-painel-linha">
                <span className="au-estado">
                  <i />
                  {v.rotulo}
                </span>
                <span className="au-obra">
                  {report.codigo && <span className="ds-code">{report.codigo}</span>}
                  {report.obra && <span>{report.obra}</span>}
                </span>
              </div>
              <h1>{tituloDoMemorial(arquivo)}</h1>
              <p className="au-arquivo">
                <FileText size={13} aria-hidden />
                <span title={arquivo}>
                  {arquivo}
                  {totalDePaginas ? `, ${totalDePaginas} páginas` : ""}
                </span>
                {runtime?.auditado_por && (
                  <>
                    <span className="au-sep" />
                    <span>{runtime.auditado_por}</span>
                  </>
                )}
              </p>
            </div>

            <div className="au-cronometro">
              <svg className={`au-anel au-anel--concluida`} viewBox="0 0 64 64" aria-hidden>
                <circle cx="32" cy="32" r="27" className="au-anel-trilho" />
                <circle cx="32" cy="32" r="27" className="au-anel-arco" />
              </svg>
              <div className="au-cronometro-texto">
                <span className="au-cronometro-tempo">
                  <b className="ds-num">{levou !== null ? mmss(levou) : "—"}</b>
                  <small>levou no total</small>
                </span>
                <span className="au-cronometro-falta">
                  {fim ? `terminou às ${formatarEmBrasilia(fim, { hour: "2-digit", minute: "2-digit" })} de ${formatarEmBrasilia(fim, { day: "2-digit", month: "2-digit" })}` : ""}
                </span>
              </div>
            </div>
          </div>
          <p className="au-geral-porque">{veredito.detail}</p>
        </header>

        <section className="au-bloco au-bloco--linha">
          <div className="au-bloco-cabeca">
            <h2>Linha do tempo</h2>
            <span className="au-legenda">
              <i className="au-leg au-leg--feito" /> feito
              <i className="au-leg au-leg--lento" /> mais lento
            </span>
          </div>
          {passos.length ? (
            <LinhaDoTempo passos={passos} agora={null} total={total} />
          ) : (
            <p className="au-nota">Este parecer é anterior ao registro do tempo de cada etapa (02/10/2026). Levou {levou !== null ? mmss(levou) : "—"} no total.</p>
          )}
        </section>

        <div className="au-grade">
          <section className="au-bloco au-paginas">
            <div className="au-bloco-cabeca">
              <h2>Páginas do memorial</h2>
              <span className="au-nota ds-num">{totalDePaginas ? `${totalDePaginas} páginas; o tom é quantos achados caem nela` : "sem a contagem de páginas"}</span>
            </div>
            {paginas.length > 0 && <MapaDasPaginas paginas={paginas} lidas={paginas.length} atuais={[]} colunas={colunas} />}
          </section>

          <section className="au-bloco au-achados">
            <div className="au-bloco-cabeca">
              <h2>Achados</h2>
              <span className="au-achados-total ds-num" title={`${tratados} de ${achados.length} tratados`}>
                {achados.length}
              </span>
            </div>
            {achados.length ? (
              <NiveisEmFaixa niveis={niveis} semFaixa onAbrir={(id) => onAbrir(achados.find((a) => a.id === id)?.chave)} onAbrirNivel={(id) => onAbrirNivel(id as Nivel)} />
            ) : (
              <p className="au-nota">Nenhum achado confirmado no escopo analisado.</p>
            )}
            {achados.length > 0 && <p className="au-nota au-geral-tratados">{conta(tratados, "tratado", "tratados")} de {achados.length}; o nível abre só os dele na fila; cada pílula abre o achado.</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
