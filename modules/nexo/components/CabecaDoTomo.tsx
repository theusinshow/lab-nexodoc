"use client";

/**
 * O CABEÇALHO DO TOMO no canvas (06/10/2026, "trilho vivo"): estado, peças,
 * peso e os botões Montar/Baixar em cima da fileira. Lê tudo do contexto dos
 * montadores e decide com `trilhoDoTomo`; monta pelo montador registrado — a
 * mesma via de sempre.
 */
import { BookOpen, CircleAlert, CircleCheck, Download, LoaderCircle, RotateCcw, Shrink, SplitSquareVertical } from "lucide-react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useMemo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import { Button } from "@/components/ui/button";
import { CURVA, DURACAO, MOLA } from "@/lib/ds/movimento";

import { formatarMb, saidasDoTeto, tomosMontados, tomosPlanejados } from "../lib/entrega-do-volume";
import type { FaseDaMontagem } from "../lib/progresso-da-montagem";
import { trilhoDoTomo, type Trilho } from "../lib/trilho-do-tomo";
import { useConversation } from "../state/conversation-store";
import { useFasesDaMontagem, useGeradorDoPlano, useMontadoresDeVolume } from "../state/montadores-de-volume";
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
  const { gerador } = useGeradorDoPlano();
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
    gerador,
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

function Peca({ nome, pronta, nota }: { nome: string; pronta: boolean; nota?: string }) {
  const reduzido = useReducedMotion();
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[14px] ${pronta ? "border-[var(--status-ok)]/40 text-foreground" : "border-border text-muted-foreground"}`}>
      <AnimatePresence initial={false}>
        {pronta && (
          <motion.span
            key="ok"
            initial={reduzido ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={MOLA.snappy}
            className="inline-flex"
          >
            <CircleCheck className="h-4 w-4 text-[var(--status-ok)]" aria-hidden />
          </motion.span>
        )}
      </AnimatePresence>
      {nome}
      {nota && <span className="text-[12px] text-muted-foreground">· {nota}</span>}
    </span>
  );
}

export function CabecaDoTomo({ data }: NodeProps<Node<CabecaDoTomoData & Record<string, unknown>>>) {
  const t = useTrilho(data.idDoVolume, data.folhas);
  const { montador } = useMontadoresDeVolume();
  const { gerar } = useGeradorDoPlano();
  const { results, decisoes, decidir } = useConversation();
  const reduzido = useReducedMotion();
  const bytes = useMemo(() => tomosMontados(results).find((x) => x.id === data.idDoVolume)?.bytes ?? null, [results, data.idDoVolume]);
  /*
   * ACIMA DE 20 MB, AS DUAS SAÍDAS (Parte 9, 09/10/2026). A composição vem do
   * volume montado; volume de antes disso não a tem, e então comprimir fica
   * oferecido sem estimativa (só remontando se sabe).
   */
  const composicao = (results.find((r) => r.artifactId === data.idDoVolume)?.payload as
    | { composicao?: { emJpeg: number; comprimido: boolean } }
    | undefined)?.composicao;
  const saidas =
    t.estado === "acima-do-teto" && bytes !== null
      ? saidasDoTeto({ bytes, emJpeg: composicao?.emJpeg ?? bytes, jaComprimido: composicao?.comprimido })
      : null;
  const dividir = () => {
    if (!saidas) return;
    // Este tomo vira N: o total do volume cresce N − 1. Mesmo caminho do campo
    // "Nº de tomos" do plano — capa e LD dos tomos pedem para ser geradas de novo.
    const atual = Math.max(1, tomosPlanejados(results));
    const sobre = decisoes.numTomos?.sobre ?? String(atual);
    decidir("numTomos", String(atual - 1 + saidas.dividir.tomos), sobre);
  };
  const rotulo = data.unico ? "Volume" : `Tomo ${String(data.tomo).padStart(2, "0")}`;
  const cor =
    t.estado === "falhou" ? "text-[var(--destructive)]" : t.estado === "acima-do-teto" || t.estado === "fora-da-maquina" ? "text-[var(--status-warning)]" : t.estado === "montado" ? "text-[var(--status-ok)]" : "text-muted-foreground";

  return (
    /*
     * GRANDE DE PROPÓSITO (06/10/2026): o canvas abre afastado (zoom ~0,4 com
     * seis tomos), e com 12 px o cabeçalho virava um risco de 5 px — os botões
     * existiam e ninguém os lia. Medido no print da revisão de UX.
     */
    <div className="nodrag nopan flex w-[880px] items-center gap-4 rounded-lg border border-border bg-card/90 px-5 py-3 backdrop-blur-sm" data-prova="cabeca-do-tomo" data-estado={t.estado}>
      <span className="font-mono text-[20px] font-semibold uppercase tracking-[0.06em]">{rotulo}</span>
      <span className="flex items-center gap-1.5">
        <Peca nome="Capa" pronta={data.pecas.capa} />
        <Peca nome="Separatriz" pronta={data.pecas.separatriz} nota={data.pecas.separatriz ? undefined : "ao montar"} />
        <Peca nome="LD" pronta={data.pecas.ld} />
      </span>
      <span className={`flex min-w-0 items-center gap-2 text-[16px] ${cor}`} aria-live="polite">
        {t.estado === "montando" && <LoaderCircle className="h-5 w-5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden />}
        {t.estado === "montado" && <CircleCheck className="h-5 w-5 shrink-0" aria-hidden />}
        {(t.estado === "falhou" || t.estado === "acima-do-teto") && <CircleAlert className="h-5 w-5 shrink-0" aria-hidden />}
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
            <a href={t.baixar.url} download={t.baixar.nome} className="inline-flex h-11 items-center gap-2 rounded-md border border-border px-4 text-[16px] hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25">
              <Download className="h-5 w-5" aria-hidden /> Baixar
            </a>
          ) : (
            <span className="max-w-[260px] text-[14px] leading-tight text-muted-foreground" title={t.baixar.motivo ?? undefined}>
              {t.baixar.motivo}
            </span>
          )
        )}
        {saidas && (
          <>
            <Button
              className="h-11 px-4 text-[15px]"
              variant="secondary"
              disabled={!saidas.comprimir.possivel}
              title={saidas.comprimir.motivo ?? "Recomprime só as imagens; texto, desenho e carimbo ficam iguais. A conferência relê os carimbos depois."}
              onClick={() => void montador(data.idDoVolume)?.({ comprimirImagens: true })}
            >
              <Shrink className="mr-2 h-5 w-5" aria-hidden />
              {composicao ? `Comprimir imagens (≈ ${formatarMb(saidas.comprimir.estimativa)})` : "Comprimir imagens"}
            </Button>
            <Button className="h-11 px-4 text-[15px]" variant="secondary" onClick={dividir} title="Sem perda: as folhas deste tomo se repartem em mais tomos, e a capa e a LD de cada um são geradas de novo.">
              <SplitSquareVertical className="mr-2 h-5 w-5" aria-hidden />
              Dividir em {saidas.dividir.tomos} tomos
            </Button>
          </>
        )}
        <motion.span layout={!reduzido} transition={{ duration: DURACAO.state, ease: CURVA.out }}>
          {t.estado === "montando" ? (
            <span className="inline-flex h-11 items-center px-3" aria-hidden>
              <LoaderCircle className="h-6 w-6 animate-spin text-[var(--ds-nexo)] motion-reduce:animate-none" />
            </span>
          ) : (
            <Button
              className="h-11 px-5 text-[16px]"
              variant={t.acao.tipo === "montar" || t.acao.tipo === "gerar" ? "default" : "secondary"}
              disabled={!t.acao.habilitada}
              title={t.acao.motivo ?? undefined}
              onClick={() => void (t.acao.tipo === "gerar" ? gerar() : montador(data.idDoVolume)?.())}
            >
              {(t.acao.tipo === "remontar" || t.acao.tipo === "tentar-de-novo") && <RotateCcw className="mr-2 h-5 w-5" aria-hidden />}
              {t.acao.tipo === "gerar"
                ? "Gerar capa e LD"
                : t.acao.tipo === "montar"
                  ? "Montar"
                  : t.acao.tipo === "remontar"
                    ? "Remontar"
                    : "Tentar de novo"}
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
    <div className="relative flex aspect-[3/4] w-[200px] flex-col items-center justify-center gap-1 overflow-hidden rounded-md border border-dashed border-[var(--ring)]/60 bg-card/40 p-3 text-center" data-prova="volume-vazio">
      <EnchimentoDoVolume fase={fases[data.idDoVolume]} preenchimento={t.preenchimento} />
      <BookOpen className="relative h-8 w-8 text-muted-foreground" aria-hidden />
      <p className="relative font-mono text-[15px] font-medium uppercase tracking-[0.05em]">Volume</p>
      <p className="relative text-[13px] leading-tight text-muted-foreground">{t.estado === "montando" ? t.frase : "ainda não montado"}</p>
      {/* A seta chega na altura da primeira linha de folhas (ALTURA_FOLHA / 2), não no meio do nó. */}
      <Handle type="target" position={Position.Left} className="!opacity-0" style={{ top: 48 }} />
    </div>
  );
}
