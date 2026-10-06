"use client";

/**
 * O CABEÇALHO DO TOMO no canvas (06/10/2026, "trilho vivo"): estado, peças,
 * peso e os botões Montar/Baixar em cima da fileira. Lê tudo do contexto dos
 * montadores e decide com `trilhoDoTomo`; monta pelo montador registrado — a
 * mesma via de sempre.
 */
import { CircleAlert, CircleCheck, Download, LoaderCircle, RotateCcw } from "lucide-react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useMemo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import { Button } from "@/components/ui/button";
import { CURVA, DURACAO, MOLA } from "@/lib/ds/movimento";

import { formatarMb, tomosMontados } from "../lib/entrega-do-volume";
import type { FaseDaMontagem } from "../lib/progresso-da-montagem";
import { trilhoDoTomo, type Trilho } from "../lib/trilho-do-tomo";
import { useConversation } from "../state/conversation-store";
import { useFasesDaMontagem, useMontadoresDeVolume } from "../state/montadores-de-volume";
import { useLiberacaoDoVolume } from "../state/use-liberacao-do-volume";

export type CabecaDoTomoData = {
  tomo: number;
  unico: boolean;
  folhas: number;
  idDoVolume: string;
  pecas: { capa: boolean; separatriz: boolean; ld: boolean };
};

/** O estado do tomo, montado das mesmas fontes em todo lugar do canvas. */
export function useTrilho(idDoVolume: string, folhas: number): Trilho {
  const { results, podeGastar, motivoParaNaoGastar } = useConversation();
  const { fases, situacoes } = useFasesDaMontagem();
  const liberacao = useLiberacaoDoVolume();
  const montado = useMemo(() => tomosMontados(results).find((t) => t.id === idDoVolume), [results, idDoVolume]);
  const s = situacoes[idDoVolume];
  return trilhoDoTomo({
    folhas,
    fase: fases[idDoVolume],
    montado,
    temMontador: s !== undefined,
    bloqueio: s?.bloqueio ?? null,
    erro: s?.erro ?? null,
    trava: podeGastar ? null : (motivoParaNaoGastar ?? "Esta conversa mudou em outra aba."),
    liberacao,
  });
}

/** O peso conta de 0 até o valor quando o volume fica pronto. */
function Peso({ bytes }: { bytes: number }) {
  const reduzido = useReducedMotion();
  const v = useMotionValue(reduzido ? bytes : 0);
  const texto = useTransform(v, (b) => formatarMb(b));
  useEffect(() => {
    if (reduzido) {
      v.set(bytes);
      return;
    }
    const c = animate(v, bytes, { duration: DURACAO.layout * 3, ease: CURVA.out });
    return () => c.stop();
  }, [bytes, reduzido, v]);
  return <motion.span className="tabular-nums">{texto}</motion.span>;
}

function Peca({ nome, pronta }: { nome: string; pronta: boolean }) {
  const reduzido = useReducedMotion();
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] ${pronta ? "border-[var(--status-ok)]/40 text-foreground" : "border-border text-muted-foreground"}`}>
      <AnimatePresence initial={false}>
        {pronta && (
          <motion.span
            key="ok"
            initial={reduzido ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={MOLA.snappy}
            className="inline-flex"
          >
            <CircleCheck className="h-3 w-3 text-[var(--status-ok)]" aria-hidden />
          </motion.span>
        )}
      </AnimatePresence>
      {nome}
    </span>
  );
}

export function CabecaDoTomo({ data }: NodeProps<Node<CabecaDoTomoData & Record<string, unknown>>>) {
  const t = useTrilho(data.idDoVolume, data.folhas);
  const { montador } = useMontadoresDeVolume();
  const { results } = useConversation();
  const reduzido = useReducedMotion();
  const bytes = useMemo(() => tomosMontados(results).find((x) => x.id === data.idDoVolume)?.bytes ?? null, [results, data.idDoVolume]);
  const rotulo = data.unico ? "Volume" : `Tomo ${String(data.tomo).padStart(2, "0")}`;
  const cor =
    t.estado === "falhou" ? "text-[var(--destructive)]" : t.estado === "acima-do-teto" || t.estado === "fora-da-maquina" ? "text-[var(--status-warning)]" : t.estado === "montado" ? "text-[var(--status-ok)]" : "text-muted-foreground";

  return (
    <div className="nodrag nopan flex w-[880px] items-center gap-3 rounded-md border border-border bg-card/80 px-3 py-2 backdrop-blur-sm" data-prova="cabeca-do-tomo" data-estado={t.estado}>
      <span className="font-mono text-[12px] font-medium uppercase tracking-[0.07em]">{rotulo}</span>
      <span className="flex items-center gap-1">
        <Peca nome="Capa" pronta={data.pecas.capa} />
        <Peca nome="Separatriz" pronta={data.pecas.separatriz} />
        <Peca nome="LD" pronta={data.pecas.ld} />
      </span>
      <span className={`flex min-w-0 items-center gap-1.5 text-xs ${cor}`} aria-live="polite">
        {t.estado === "montando" && <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden />}
        {t.estado === "montado" && <CircleCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />}
        {(t.estado === "falhou" || t.estado === "acima-do-teto") && <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />}
        <span className="truncate">
          {t.estado === "montado" && bytes !== null ? (
            <>
              <Peso bytes={bytes} /> · {t.frase.split(" · ").slice(1).join(" · ")}
            </>
          ) : (
            t.frase
          )}
        </span>
      </span>
      <span className="ml-auto flex items-center gap-2">
        {t.baixar && (
          t.baixar.habilitado && t.baixar.url ? (
            <a href={t.baixar.url} download={t.baixar.nome} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs hover:bg-accent">
              <Download className="h-3.5 w-3.5" aria-hidden /> Baixar
            </a>
          ) : (
            <span className="text-[11px] text-muted-foreground" title={t.baixar.motivo ?? undefined}>
              {t.baixar.motivo}
            </span>
          )
        )}
        <motion.span layout={!reduzido} transition={{ duration: DURACAO.state, ease: CURVA.out }}>
          {t.estado === "montando" ? (
            <span className="inline-flex h-8 items-center px-2" aria-hidden>
              <LoaderCircle className="h-4 w-4 animate-spin text-[var(--ds-nexo)] motion-reduce:animate-none" />
            </span>
          ) : (
            <Button
              size="sm"
              variant={t.acao.tipo === "montar" ? "default" : "secondary"}
              disabled={!t.acao.habilitada}
              title={t.acao.motivo ?? undefined}
              onClick={() => void montador(data.idDoVolume)?.()}
            >
              {t.acao.tipo !== "montar" && <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden />}
              {t.acao.tipo === "montar" ? "Montar" : t.acao.tipo === "remontar" ? "Remontar" : "Tentar de novo"}
            </Button>
          )}
        </motion.span>
      </span>
    </div>
  );
}

/** O volume ENCHE de baixo para cima conforme a fase; some quando não há fase. */
export function EnchimentoDoVolume({ fase, preenchimento }: { fase: FaseDaMontagem | undefined; preenchimento: number }) {
  const reduzido = useReducedMotion();
  // O pulso entra UMA vez quando a fase vira "pronto" (monta, anima até sumir e
  // fica parado). Sem estado nem efeito: o React Compiler barra setState em efeito.
  return (
    <>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgb(139_124_246/0.28),rgb(139_124_246/0.06))]"
        initial={false}
        animate={{ height: `${Math.round((fase && fase !== "pronto" && fase !== "falhou" ? preenchimento : 0) * 100)}%` }}
        transition={{ duration: reduzido ? 0 : DURACAO.layout * 2, ease: CURVA.out }}
      />
      {fase === "pronto" && !reduzido && (
        <motion.span
          key="pulso"
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-md"
          initial={{ boxShadow: "inset 0 0 0 2px var(--status-ok)", opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: DURACAO.layout * 3, ease: CURVA.out }}
        />
      )}
    </>
  );
}

/** O lugar do volume antes de ele existir: tracejado, enche durante a montagem. */
export function VolumeVazioNode({ data }: NodeProps<Node<{ idDoVolume: string; folhas: number } & Record<string, unknown>>>) {
  const t = useTrilho(data.idDoVolume, data.folhas);
  const { fases } = useFasesDaMontagem();
  return (
    <div className="relative flex aspect-[3/4] w-[200px] flex-col justify-end overflow-hidden rounded-md border border-dashed border-border bg-card/40 p-2" data-prova="volume-vazio">
      <EnchimentoDoVolume fase={fases[data.idDoVolume]} preenchimento={t.preenchimento} />
      <p className="relative font-mono text-[11px] font-medium uppercase tracking-[0.05em]">Volume</p>
      <p className="relative mt-0.5 text-[11px] text-muted-foreground">{t.estado === "montando" ? t.frase : "ainda não montado"}</p>
      <Handle type="target" position={Position.Left} className="!opacity-0" />
    </div>
  );
}
