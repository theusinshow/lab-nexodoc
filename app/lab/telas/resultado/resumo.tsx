"use client";

import { motion } from "motion/react";
import { ArrowRight, FileSearch, RotateCcw } from "lucide-react";

import { Botao, Tecla } from "@/components/ds/basicos";
import { FaixaDeVeredito, MapaDasPaginas, NiveisEmFaixa, type GrupoDoMapa } from "@/components/ds/graficos";
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
  { rotulo: "Com ressalvas", tom: "ok" as const, ate: 50 },
  { rotulo: "Revisar antes", tom: "decide" as const, ate: 75 },
  { rotulo: "Não emitir", tom: "block" as const, ate: 100 },
];
const POSICAO: Record<EstadoEmissao, number> = { liberado: 12.5, liberado_com_ressalvas: 37.5, revisar: 62.5, nao_emitir: 87.5, incompleto: 87.5 };

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];
const conta = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/**
 * RESUMO. Três coisas, cada uma dita uma vez só: por que o veredito é esse
 * (a faixa), o que há para tratar (os níveis, com uma pílula por achado que
 * abre direto nele) e onde (o mapa). O selo e o anel lá em cima já dizem o
 * veredito e quanto foi tratado — aqui não se repete.
 */
export function Resumo({
  achados,
  parcial,
  comparado,
  onAbrir,
}: {
  achados: Achado[];
  parcial: boolean;
  comparado: boolean;
  revisao: string;
  onAbrir: (id?: string) => void;
}) {
  const { dur } = useTempo();
  const estado = estadoDaEmissao(achados, parcial);
  const n = (i: string) => achados.filter((a) => a.impacto === i).length;

  const porque = {
    incompleto: "3 de 12 blocos não foram lidos: o orçamento da etapa acabou. Os achados valem, mas a ausência de outros não significa que não existam.",
    nao_emitir: `${conta(n("block"), "achado bloqueia", "achados bloqueiam")} a emissão. Corrija o documento e audite a nova revisão.`,
    revisar: `${conta(n("decide"), "ponto técnico precisa", "pontos técnicos precisam")} de aceite do responsável antes de executar.`,
    liberado_com_ressalvas: `Só ajustes de texto, sem impacto documental. Nenhuma inconsistência confirmada no escopo analisado.`,
    liberado: "Nenhum achado no escopo analisado.",
  }[estado];
  const marcador = {
    incompleto: "leitura incompleta",
    nao_emitir: conta(n("block"), "bloqueio", "bloqueios"),
    revisar: conta(n("decide"), "decisão técnica", "decisões técnicas"),
    liberado_com_ressalvas: conta(n("note") + n("texto"), "ajuste de texto", "ajustes de texto"),
    liberado: "nenhum achado",
  }[estado];

  const niveis: GrupoDoMapa[] = IMPACTOS.map((i) => {
    const doNivel = achados.filter((a) => a.impacto === i.id);
    const disciplinas = [...new Set(doNivel.map((a) => a.disciplina))];
    return {
      id: i.id,
      rotulo: i.nome,
      tom: i.id,
      itens: disciplinas.map((d) => ({ id: d, rotulo: d, valor: doNivel.filter((a) => a.disciplina === d).length })),
      achados: doNivel.map((a) => ({ id: a.id, titulo: a.titulo, feito: !!a.desfecho })),
    };
  });

  const entrar = (i: number) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: dur("enter"), delay: i * 0.05, ease: ease(CURVA.out) } });

  return (
    <div className="rs-resumo">
      {/* ---------- por que o veredito é esse ---------- */}
      <motion.section className={`rs-porque rs-porque--${estado}`} {...entrar(0)}>
        <div className="rs-porque-texto">
          <h2>Por que</h2>
          <p>{porque}</p>
          <span className="rs-nota">
            {estado === "incompleto"
              ? "Com a leitura incompleta, o veredito não vale como liberação."
              : "O veredito é desta revisão. Tratar os achados não o muda; auditar a revisão corrigida, sim."}
          </span>
        </div>
        <div className="rs-porque-faixa">
          <FaixaDeVeredito posicao={POSICAO[estado]} faixas={FAIXAS} valor={marcador} />
        </div>
        {estado === "incompleto" && (
          <Botao variante="primary" tamanho="sm" className="rs-porque-acao">
            <RotateCcw />
            Auditar de novo
          </Botao>
        )}
      </motion.section>

      {comparado && (
        <motion.section className="rs-comparado" {...entrar(1)}>
          <span className="rs-comparado-titulo">
            Desde a auditoria de <b>18/09</b>
          </span>
          <span className="rs-delta rs-delta--ok">
            <b className="ds-num">4</b> corrigidos
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

      <div className="rs-grade2">
        {/* ---------- o que há para tratar ---------- */}
        <motion.section className="rs-bloco rs-bloco--niveis" {...entrar(2)}>
          <h3>
            O que tratar
            <span className="rs-nota">clique numa pílula para abrir o achado</span>
          </h3>
          <NiveisEmFaixa niveis={niveis} onAbrir={(id) => onAbrir(id)} />
          <div className="rs-bloco-pe">
            <Botao variante="primary" tamanho="sm" onClick={() => onAbrir()}>
              Abrir a fila <Tecla>A</Tecla>
            </Botao>
          </div>
        </motion.section>

        {/* ---------- onde ---------- */}
        <motion.section className="rs-bloco rs-bloco--onde" {...entrar(3)}>
          <h3>
            Onde estão
            <button type="button" className="rs-link">
              <FileSearch size={13} /> No documento
            </button>
          </h3>
          <MapaDasPaginas colunas={9} paginas={pontosPorPagina(achados)} lidas={parcial ? 30 : PAGINAS_DO_MEMORIAL} atuais={[]} />
        </motion.section>
      </div>

      {/* ---------- o que foi lido: uma linha ---------- */}
      <motion.p className="rs-lido" {...entrar(4)}>
        <span>
          Lido: 42 páginas, <span className={parcial ? "rs-falta" : undefined}>{parcial ? "9 de 12 blocos" : "12 de 12 blocos"}</span>, 38 regras locais; o segundo modelo manteve{" "}
          {achados.length} de 11 pontos.
        </span>
        <button type="button" className="rs-link">
          O Nexo deixou passar algo? Registrar erro ausente
        </button>
      </motion.p>
    </div>
  );
}
