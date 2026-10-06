"use client";

/**
 * A DOCA DE ENTREGA (06/10/2026): a entrega flutua no rodapé do canvas, sempre
 * à vista — passo 1 (editáveis), passo 2 (volumes), o total, e os dois botões.
 * A regra é a de `entrega-do-volume.ts`; aqui é só a forma.
 */
import { CircleCheck, Circle, FileDown, FolderDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { Button } from "@/components/ui/button";
import { CURVA, DURACAO } from "@/lib/ds/movimento";
import { formatarDataHora } from "@/lib/fuso-de-brasilia";
import type { SeloForLd } from "@/server/nexo/build-ld-proposal";

import { formatarMb } from "../lib/entrega-do-volume";
import { useEntregaDoVolume } from "../state/use-entrega-do-volume";

export function DocaDaEntrega({ selos }: { selos: SeloForLd[] }) {
  const e = useEntregaDoVolume(selos);
  const reduzido = useReducedMotion();
  const { passos } = e;
  const visivel = e.temEditaveis || e.tomos.length > 0;
  const peso = e.tomos.reduce((s, t) => s + (t.bytes ?? 0), 0);
  const trava = passos.volumes.motivo;

  return (
    <AnimatePresence>
      {visivel && (
        <motion.div
          key="doca"
          initial={reduzido ? false : { y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduzido ? { opacity: 0 } : { y: 24, opacity: 0 }}
          transition={{ duration: DURACAO.layout, ease: CURVA.out }}
          className="absolute bottom-3 left-1/2 z-20 flex w-[min(760px,calc(100%-140px))] -translate-x-1/2 flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-card/95 px-3 py-2 shadow-[var(--shadow-panel)] backdrop-blur"
          data-prova="doca-da-entrega"
          role="region"
          aria-label="Entrega do volume"
        >
          <span className="flex items-center gap-1.5 text-xs">
            {passos.editaveis.feito ? <CircleCheck className="h-3.5 w-3.5 text-[var(--status-ok)]" aria-hidden /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
            {passos.editaveis.feito && passos.editaveis.quando ? `Editáveis baixados ${formatarDataHora(passos.editaveis.quando)}` : "1 · Editáveis na pasta do projeto"}
          </span>
          <span className="flex items-center gap-1.5 text-xs">
            <Circle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />2 · Volumes
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {passos.prontos} de {Math.max(passos.planejados, 1)} montados{peso > 0 ? ` · ${formatarMb(peso)}` : ""}
          </span>
          <span className="ml-auto flex items-center gap-2">
            <Button size="sm" variant={passos.editaveis.feito ? "secondary" : "default"} loading={e.ocupado === "editaveis"} disabled={e.ocupado !== null} onClick={() => void e.baixarEditaveisZip()}>
              <FolderDown className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Editáveis (ODT)
            </Button>
            <Button size="sm" variant={passos.editaveis.feito ? "default" : "secondary"} loading={e.ocupado === "volumes"} disabled={e.ocupado !== null || !passos.volumes.liberado} title={trava ?? undefined} onClick={() => void e.baixarVolumes()}>
              <FileDown className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              {passos.planejados > 1 ? `Baixar os ${passos.planejados} volumes` : "Baixar o volume"}
            </Button>
          </span>
          {(trava || passos.editaveis.motivo || e.erro) && (
            <motion.p
              key={trava ?? e.erro ?? passos.editaveis.motivo ?? ""}
              initial={reduzido ? false : { x: -4 }}
              animate={{ x: [-4, 4, -2, 0] }}
              transition={{ duration: DURACAO.layout, ease: CURVA.feedback }}
              className={`basis-full text-xs ${e.erro ? "text-[var(--destructive)]" : "text-[var(--status-warning)]"}`}
            >
              {e.erro ?? passos.editaveis.motivo ?? trava}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
