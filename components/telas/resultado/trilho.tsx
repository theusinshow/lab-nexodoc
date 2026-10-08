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

import { Girando, Orbe } from "@/components/ds/basicos";
import { Dica } from "@/components/ds/micro";
import { useMoldura } from "@/components/moldura/contexto";
import { abrirParecerEmPdf, type AuditView } from "@/components/audit-result";
import { avaliarEmissao, type AuditReport } from "@/lib/audit-report";
import { incompletudeDoParecer } from "@/lib/auditoria-incompleta";
import { useTempo } from "@/lib/ds/tempo";

import { RITMO, SUAVE } from "../comum/ritmo";
import "./trilho.css";

type Estado = ReturnType<typeof avaliarEmissao>["estado"];

export const SELO: Record<Estado, { rotulo: string; tom: "block" | "decide" | "ok" }> = {
  incompleto: { rotulo: "Análise parcial", tom: "block" },
  nao_emitir: { rotulo: "Não emitir", tom: "block" },
  revisar: { rotulo: "Revisar antes de emitir", tom: "decide" },
  liberado_com_ressalvas: { rotulo: "Liberado com ressalvas", tom: "ok" },
  liberado: { rotulo: "Liberado", tom: "ok" },
};

/**
 * O anel do tratamento — o mesmo gesto do relógio da auditoria — com o
 * veredito no meio: o ponto na cor de emitir ou não (02/10/2026, pedido do
 * Matheus: "o símbolo de emitir ou não dentro do ring").
 */
function Anel({ fracao, completo, comVeredito }: { fracao: number; completo: boolean; comVeredito?: boolean }) {
  const { k } = useTempo();
  return (
    <svg className={`rs-anel${completo ? " rs-anel--completo" : ""}`} viewBox="0 0 64 64" aria-hidden>
      {comVeredito && <circle cx="32" cy="32" r="9" className="rs-anel-veredito" />}
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

export type VistaDoResultado = AuditView | "documento" | "geral";

export function TrilhoDoResultado({
  report,
  total,
  tratados,
  vista,
  podeVerNoDocumento,
  onVista,
  compacto = false,
  onPerguntar,
}: {
  /** Leva à conversa desta auditoria, com o campo pronto para a pergunta. */
  onPerguntar?: () => void;
  /**
   * SÓ ÍCONES, como no lab dentro do palco da conversa: o chat já ocupa a
   * direita, e a fila precisa da largura. O rótulo e o porquê vão para a dica.
   */
  compacto?: boolean;
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
  /*
   * O PORQUÊ NUMA FRASE. Na análise que não terminou, o aviso inteiro (em
   * caixa-alta, com o que não foi lido) já abre o conteúdo à esquerda;
   * repeti-lo aqui era a mesma notícia duas vezes. O trilho diz o que ela
   * significa para a emissão, como no lab.
   */
  const porque =
    estado === "incompleto"
      ? "Parte do documento não foi lida: os achados valem, mas não dá para liberar. O aviso ao lado diz o que faltou."
      : veredito.detail;

  const NAV: { id: VistaDoResultado; rotulo: string; Icone: typeof FileText; conta?: number; tecla: string }[] = [
    { id: "summary", rotulo: "Resumo", Icone: SquareStack, tecla: "1" },
    { id: "findings", rotulo: "Achados", Icone: ListChecks, conta: total - tratados || undefined, tecla: "2" },
    { id: "report", rotulo: "Relatório", Icone: ScrollText, tecla: "3" },
    ...(podeVerNoDocumento ? [{ id: "documento" as const, rotulo: "No documento", Icone: FileSearch, tecla: "4" }] : []),
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
        {!compacto && (
          <span className="rs-selo">
            <i />
            {selo.rotulo}
          </span>
        )}
        {!compacto && <p className="re-porque">{porque}</p>}
        {/*
          O VEREDITO NO ANEL, e o anel abre o RESUMO COMPLETO: a mesma tela da
          auditoria em curso, depois de pronta (linha do tempo, páginas, achados
          por nível). No palco o trilho é só ícones; a dica diz tudo.
        */}
        <Dica texto={`${selo.rotulo}. ${tratados} de ${total} tratados. Resumo completo`} lado="esquerda">
        <button
          type="button"
          className={`re-tratado${vista === "geral" ? " re-tratado--atual" : ""}`}
          onClick={() => onVista("geral")}
          aria-label={`${selo.rotulo}: ${porque} ${tratados} de ${total} tratados. Abrir o resumo completo`}
          aria-pressed={vista === "geral"}
        >
          <Anel fracao={tratados / Math.max(1, total)} completo={total > 0 && tratados >= total} comVeredito />
          {!compacto && (
            <span>
              <b className="ds-num">
                {tratados} <small>de {total}</small>
              </b>
              <small>{total === 0 ? "nenhum achado" : tratados >= total ? "todos tratados" : "tratados"}</small>
            </span>
          )}
        </button>
        </Dica>
      </section>

      <nav className="re-nav" aria-label="Vistas da auditoria">
        {NAV.map((n) => {
          const atual = vista === n.id;
          return (
            <Dica key={n.id} texto={n.rotulo} tecla={n.tecla} lado="esquerda">
              <button type="button" aria-label={compacto ? n.rotulo : undefined} aria-current={atual ? "page" : undefined} aria-pressed={atual} data-tour={n.id === "documento" ? "chip-no-documento" : undefined} onClick={() => onVista(n.id)}>
                {atual && <motion.i layoutId="nx-trilho-vista" className="re-nav-fundo" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
                <n.Icone aria-hidden />
                {!compacto && <span className="re-nav-rotulo">{n.rotulo}</span>}
                {n.conta ? <em className="ds-num">{n.conta}</em> : null}
                {!compacto && n.id === "findings" && incompleta && <span className="nx-trilho-incompleta">incompleta</span>}
              </button>
            </Dica>
          );
        })}
      </nav>

      <section className="re-acoes">
        {!compacto && <h3>Levar adiante</h3>}
        {onPerguntar && (
          <Dica texto="Perguntar ao Nexo sobre esta auditoria" lado="esquerda">
            <button type="button" className="re-acao re-acao--nexo" aria-label={compacto ? "Perguntar ao Nexo sobre esta auditoria" : undefined} onClick={onPerguntar}>
              <Orbe tamanho={16} />
              {!compacto && (
                <span>
                  Perguntar ao Nexo
                  <small>na conversa desta auditoria</small>
                </span>
              )}
            </button>
          </Dica>
        )}
        <Dica texto="Parecer em PDF, numa aba nova" lado="esquerda">
          <button type="button" className="re-acao re-acao--principal" aria-label={compacto ? "Parecer em PDF" : undefined} onClick={() => void pdf()} disabled={gerando}>
            {gerando ? <Girando tamanho={14} /> : <FileText aria-hidden />}
            {!compacto && (
              <span>
                Parecer em PDF
                <small>{gerando ? "gerando…" : "abre numa aba nova"}</small>
              </span>
            )}
          </button>
        </Dica>
      </section>
    </aside>
  );
}
