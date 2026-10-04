"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, FileSearch, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Botao, NumeroQueChega, Tecla } from "@/components/ds/basicos";
import { FaixaDeVeredito, MapaDasPaginas } from "@/components/ds/graficos";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";

import { IMPACTOS, PAGINAS_DO_MEMORIAL, pontosPorPagina, type Achado } from "./dados";

export type EstadoEmissao = "incompleto" | "nao_emitir" | "revisar" | "liberado_com_ressalvas" | "liberado";

/** A regra de lib/audit-report.ts (avaliarEmissao), reduzida ao que a tela precisa. */
export function estadoDaEmissao(achados: Achado[], parcial: boolean): EstadoEmissao {
  if (parcial) return "incompleto";
  if (achados.some((a) => a.impacto === "block")) return "nao_emitir";
  if (achados.some((a) => a.impacto === "decide")) return "revisar";
  if (achados.length) return "liberado_com_ressalvas";
  return "liberado";
}

const FAIXAS = [
  { rotulo: "Liberado", tom: "ok" as const, ate: 25 },
  { rotulo: "Com ressalvas de texto", tom: "ok" as const, ate: 50 },
  { rotulo: "Revisar antes de emitir", tom: "decide" as const, ate: 75 },
  { rotulo: "Não emitir", tom: "block" as const, ate: 100 },
];
const POSICAO: Record<EstadoEmissao, number> = { liberado: 12.5, liberado_com_ressalvas: 37.5, revisar: 62.5, nao_emitir: 87.5, incompleto: 87.5 };

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];
const conta = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export function Resumo({
  achados,
  parcial,
  comparado,
  revisao,
  onAbrir,
}: {
  achados: Achado[];
  parcial: boolean;
  comparado: boolean;
  revisao: string;
  onAbrir: (id?: string) => void;
}) {
  const { dur } = useTempo();
  const [sobre, setSobre] = useState<Achado | null>(null);
  const estado = estadoDaEmissao(achados, parcial);
  const n = (i: string) => achados.filter((a) => a.impacto === i).length;
  const tratados = achados.filter((a) => a.desfecho).length;
  const bloqueiosAbertos = achados.filter((a) => a.impacto === "block" && !a.desfecho).length;
  const ordem = IMPACTOS.flatMap((i) => achados.filter((a) => a.impacto === i.id));

  const veredito = {
    incompleto: {
      titulo: "Análise parcial: não use para emitir",
      tom: "block",
      texto: "3 de 12 blocos não foram lidos: o orçamento da etapa acabou. Os achados valem, mas a ausência de outros não significa que não existam.",
    },
    nao_emitir: { titulo: "Não emitir", tom: "block", texto: `${conta(n("block"), "achado bloqueia", "achados bloqueiam")} a emissão. Corrija o documento e audite a nova revisão.` },
    revisar: { titulo: "Revisar antes de emitir", tom: "decide", texto: `${conta(n("decide"), "ponto técnico precisa", "pontos técnicos precisam")} de aceite do responsável antes de executar.` },
    liberado_com_ressalvas: {
      titulo: "Liberado com ressalvas de texto",
      tom: "ok",
      texto: `${conta(n("note"), "ajuste", "ajustes")} de texto, sem impacto documental. Nenhuma inconsistência confirmada no escopo analisado.`,
    },
    liberado: { titulo: "Liberado", tom: "ok", texto: "Nenhum achado no escopo analisado: 1 arquivo, 42 páginas." },
  }[estado];

  const entrar = (i: number) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: dur("enter"), delay: i * 0.05, ease: ease(CURVA.out) } });

  return (
    <div className="rs-resumo">
      {/* ---------- o veredito ---------- */}
      <motion.section className={`rs-veredito rs-veredito--${veredito.tom}`} {...entrar(0)}>
        <div className="rs-veredito-texto">
          <small>Veredito da revisão {revisao}</small>
          <h2>{veredito.titulo}</h2>
          <p>{veredito.texto}</p>
        </div>
        <div className="rs-veredito-faixa">
          <FaixaDeVeredito posicao={POSICAO[estado]} faixas={FAIXAS} />
          <p className="rs-nota">
            {estado === "incompleto"
              ? "Com a leitura incompleta, o veredito não vale como liberação, seja qual for a faixa."
              : "O veredito é desta revisão e não muda quando você trata os achados. Corrija o documento e audite de novo para mudar."}
          </p>
        </div>
        {estado === "incompleto" && (
          <Botao variante="primary" tamanho="sm" className="rs-veredito-acao">
            <RotateCcw />
            Auditar de novo
          </Botao>
        )}
      </motion.section>

      {/* ---------- comparação com a auditoria anterior ---------- */}
      {comparado && (
        <motion.section className="rs-comparado" {...entrar(1)}>
          <span className="rs-comparado-titulo">
            Comparado com a auditoria de <b>18/09</b>, revisão A anterior
          </span>
          <span className="rs-delta rs-delta--ok">
            <b className="ds-num">4</b> corrigidos desde então
          </span>
          <span className="rs-delta rs-delta--novo">
            <b className="ds-num">1</b> novo
          </span>
          <span className="rs-delta">
            <b className="ds-num">8</b> continuam
          </span>
          <Botao variante="quiet" tamanho="sm">
            Ver o que mudou <ArrowRight />
          </Botao>
        </motion.section>
      )}

      {/* ---------- tratamento: uma pílula por achado ---------- */}
      <motion.section className="rs-tratamento" {...entrar(2)}>
        <div className="rs-tratamento-numero">
          <b>
            <NumeroQueChega valor={tratados} />
            <span className="rs-de"> de {achados.length}</span>
          </b>
          <span>achados tratados</span>
        </div>
        <div className="rs-tratamento-fila">
          <div className="rs-pilulas" onMouseLeave={() => setSobre(null)}>
            {ordem.map((a, i) => (
              <motion.button
                key={a.id}
                type="button"
                className={`rs-pilula rs-pilula--${a.impacto}${a.desfecho ? " rs-pilula--feita" : ""}`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: dur("layout"), delay: 0.1 + i * 0.03, ease: ease(CURVA.out) }}
                onMouseEnter={() => setSobre(a)}
                onFocus={() => setSobre(a)}
                onClick={() => onAbrir(a.id)}
                aria-label={`${a.id}: ${a.titulo}`}
              />
            ))}
          </div>
          <div className="gr-mapa-rodape">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={sobre?.id ?? "padrao"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur("feedback") }}>
                {sobre ? (
                  <>
                    <b>{sobre.id}</b> {sobre.titulo}
                  </>
                ) : bloqueiosAbertos ? (
                  `${conta(bloqueiosAbertos, "bloqueio ainda pendente", "bloqueios ainda pendentes")}. Cheia é tratada, vazada está pendente.`
                ) : (
                  "Cheia é tratada, vazada está pendente."
                )}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
        <Botao variante="primary" onClick={() => onAbrir()}>
          Abrir a fila <Tecla>A</Tecla>
        </Botao>
      </motion.section>

      <div className="rs-grade">
        {/* ---------- por impacto ---------- */}
        <motion.section className="rs-bloco" {...entrar(3)}>
          <h3>Por impacto</h3>
          <ul className="rs-impactos">
            {IMPACTOS.map((i) => {
              const doImpacto = achados.filter((a) => a.impacto === i.id);
              const pendentes = doImpacto.filter((a) => !a.desfecho).length;
              return (
                <li key={i.id}>
                  <button type="button" onClick={() => onAbrir(doImpacto.find((a) => !a.desfecho)?.id ?? doImpacto[0]?.id)} disabled={!doImpacto.length}>
                    <i className={`rs-ponto rs-ponto--${i.id}`} />
                    <span className="rs-impacto-texto">
                      <b>{i.nome}</b>
                      <small>{i.dica}</small>
                    </span>
                    <span className="rs-impacto-conta">
                      <b className="ds-num">{doImpacto.length}</b>
                      <small>{!doImpacto.length ? "nenhum" : pendentes ? `${pendentes} pendentes` : "tudo tratado"}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </motion.section>

        {/* ---------- onde estão ---------- */}
        <motion.section className="rs-bloco" {...entrar(4)}>
          <h3>
            Onde estão
            <button type="button" className="rs-link">
              <FileSearch size={13} /> No documento
            </button>
          </h3>
          <MapaDasPaginas paginas={pontosPorPagina(achados)} lidas={parcial ? 30 : PAGINAS_DO_MEMORIAL} atuais={[]} />
        </motion.section>

        {/* ---------- o que foi lido ---------- */}
        <motion.section className="rs-bloco" {...entrar(5)}>
          <h3>O que foi lido</h3>
          <dl className="rs-ficha">
            <div>
              <dt>Arquivo</dt>
              <dd>117_25_md_geral_a.pdf</dd>
            </div>
            <div>
              <dt>Páginas</dt>
              <dd>42 com texto, nenhuma só com desenho</dd>
            </div>
            <div>
              <dt>Capítulos</dt>
              <dd className={parcial ? "rs-falta" : undefined}>{parcial ? "9 de 12 blocos lidos" : "12 de 12 blocos lidos"}</dd>
            </div>
            <div>
              <dt>Regras locais</dt>
              <dd>38 aplicadas, 2 não se aplicam a UBS</dd>
            </div>
            <div>
              <dt>Segundo modelo</dt>
              <dd>revisou 11 pontos, manteve {achados.length}</dd>
            </div>
          </dl>
          <button type="button" className="rs-link rs-ausente">
            O Nexo deixou passar algo? Registrar erro ausente
          </button>
        </motion.section>
      </div>
    </div>
  );
}
