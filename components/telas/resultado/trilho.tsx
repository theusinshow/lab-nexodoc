"use client";

/**
 * O TRILHO DO RESULTADO (desenho do lab: a coluna da direita do Resultado E).
 * Três perguntas, de cima para baixo: como está o parecer (o veredito, numa
 * palavra, e o porquê), quanto já foi tratado, e para onde ir — as quatro
 * leituras do mesmo parecer e o que se leva adiante dele.
 *
 * O veredito sai da regra única (`avaliarEmissao`), a mesma do parecer em PDF
 * e do cartão do chat: tela, papel e chat não podem discordar.
 */

import { motion } from "motion/react";
import { FileSearch, FileText, ListChecks, ScrollText, SquareStack } from "lucide-react";
import { useState } from "react";

import { Girando } from "@/components/ds/basicos";
import { useMoldura } from "@/components/moldura/contexto";
import { abrirParecerEmPdf, type AuditView } from "@/components/audit-result";
import { avaliarEmissao, type AuditReport } from "@/lib/audit-report";
import { incompletudeDoParecer } from "@/lib/auditoria-incompleta";
import { useTempo } from "@/lib/ds/tempo";

import { RITMO, SUAVE } from "../comum/ritmo";
import "./trilho.css";

type Estado = ReturnType<typeof avaliarEmissao>["estado"];

const SELO: Record<Estado, { rotulo: string; tom: "block" | "decide" | "ok" }> = {
  incompleto: { rotulo: "Análise parcial", tom: "block" },
  nao_emitir: { rotulo: "Não emitir", tom: "block" },
  revisar: { rotulo: "Revisar antes de emitir", tom: "decide" },
  liberado_com_ressalvas: { rotulo: "Liberado com ressalvas", tom: "ok" },
  liberado: { rotulo: "Liberado", tom: "ok" },
};

/** O anel do tratamento — o mesmo gesto do relógio da auditoria. */
function Anel({ fracao, completo }: { fracao: number; completo: boolean }) {
  const { k } = useTempo();
  return (
    <svg className={`rs-anel${completo ? " rs-anel--completo" : ""}`} viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r="27" className="rs-anel-trilho" />
      <motion.circle
        cx="32"
        cy="32"
        r="27"
        className="rs-anel-arco"
        transform="rotate(-90 32 32)"
        initial={false}
        animate={{ pathLength: Math.max(0.001, fracao) }}
        transition={{ duration: RITMO.entra * 2 * k, ease: SUAVE }}
      />
    </svg>
  );
}

export type VistaDoResultado = AuditView | "documento";

export function TrilhoDoResultado({
  report,
  total,
  tratados,
  vista,
  podeVerNoDocumento,
  onVista,
}: {
  report: AuditReport;
  /** Os achados principais (os que contam no veredito e na aba Achados). */
  total: number;
  tratados: number;
  vista: VistaDoResultado;
  podeVerNoDocumento: boolean;
  onVista: (v: VistaDoResultado) => void;
}) {
  const { k } = useTempo();
  const { avisar } = useMoldura();
  const [gerando, setGerando] = useState(false);
  const { estado, veredito } = avaliarEmissao(report);
  const selo = SELO[estado];
  const incompleta = incompletudeDoParecer(report).incompleta;
  // Na análise que não terminou, o rótulo inteiro do veredito é a notícia: ele vai na frase.
  const porque = estado === "incompleto" ? `${veredito.label}. ${veredito.detail}` : veredito.detail;

  const NAV: { id: VistaDoResultado; rotulo: string; Icone: typeof FileText; conta?: number }[] = [
    { id: "summary", rotulo: "Resumo", Icone: SquareStack },
    { id: "findings", rotulo: "Achados", Icone: ListChecks, conta: total },
    { id: "report", rotulo: "Parecer", Icone: ScrollText },
    ...(podeVerNoDocumento ? [{ id: "documento" as const, rotulo: "No documento", Icone: FileSearch }] : []),
  ];

  async function pdf() {
    setGerando(true);
    const erro = await abrirParecerEmPdf(report);
    setGerando(false);
    if (erro) avisar({ tom: "falha", titulo: "O parecer em PDF não saiu", texto: erro });
  }

  return (
    <aside className={`re-trilho re-trilho--${selo.tom} nx-trilho`} aria-label="Resultado">
      <section className="re-estado" data-tour="veredito-parecer">
        <span className="rs-selo">
          <i />
          {selo.rotulo}
        </span>
        <p className="re-porque">{porque}</p>
        <button type="button" className="re-tratado" onClick={() => onVista("findings")} title={`${tratados} de ${total} tratados`}>
          <Anel fracao={tratados / Math.max(1, total)} completo={total > 0 && tratados >= total} />
          <span>
            <b className="ds-num">
              {tratados} <small>de {total}</small>
            </b>
            <small>{total === 0 ? "nenhum achado" : tratados >= total ? "todos tratados" : "tratados"}</small>
          </span>
        </button>
      </section>

      <nav className="re-nav" aria-label="Vistas da auditoria">
        {NAV.map((n) => {
          const atual = vista === n.id;
          return (
            <button key={n.id} type="button" aria-current={atual ? "page" : undefined} aria-pressed={atual} data-tour={n.id === "documento" ? "chip-no-documento" : undefined} onClick={() => onVista(n.id)}>
              {atual && <motion.i layoutId="nx-trilho-vista" className="re-nav-fundo" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
              <n.Icone aria-hidden />
              <span className="re-nav-rotulo">{n.rotulo}</span>
              {n.conta ? <em className="ds-num">{n.conta}</em> : null}
              {n.id === "findings" && incompleta && <span className="nx-trilho-incompleta">incompleta</span>}
            </button>
          );
        })}
      </nav>

      <section className="re-acoes">
        <h3>Levar adiante</h3>
        <button type="button" className="re-acao re-acao--principal" onClick={() => void pdf()} disabled={gerando}>
          {gerando ? <Girando tamanho={14} /> : <FileText aria-hidden />}
          <span>
            Parecer em PDF
            <small>{gerando ? "gerando…" : "abre numa aba nova"}</small>
          </span>
        </button>
      </section>
    </aside>
  );
}
