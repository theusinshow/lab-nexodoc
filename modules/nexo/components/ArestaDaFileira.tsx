"use client";

/**
 * A SETA DA FILEIRA — capa → LD → folhas → volume.
 *
 * NÃO USA A POSIÇÃO MEDIDA DAS ALÇAS (07/10/2026). O React Flow mede o tamanho
 * do nó por `offsetWidth` (imune a transform) e a posição da alça por
 * `getBoundingClientRect` (afetada por qualquer `scale` de um ancestral). Medida
 * no meio de uma animação do palco, a alça da direita saía multiplicada — a seta
 * nascia ~27 px fora do documento de origem, e a da esquerda (x = 0) não mudava.
 *
 * Aqui as pontas saem da posição e da LARGURA do nó: a seta encosta na borda
 * direita da origem e na esquerda do destino, na linha do meio da primeira
 * fileira de folhas. Um ponto na origem diz "está preso aqui".
 */

import { BaseEdge, getBezierPath, Position, useInternalNode, type EdgeProps } from "@xyflow/react";

import { ALTURA_FOLHA } from "../lib/layout-canvas";

const LINHA = ALTURA_FOLHA / 2;

export function ArestaDaFileira({ id, source, target, style }: EdgeProps) {
  const origem = useInternalNode(source);
  const destino = useInternalNode(target);
  if (!origem || !destino) return null;

  const largura = origem.measured.width ?? origem.width ?? 0;
  const sx = origem.internals.positionAbsolute.x + largura;
  const sy = origem.internals.positionAbsolute.y + LINHA;
  const tx = destino.internals.positionAbsolute.x;
  const ty = destino.internals.positionAbsolute.y + LINHA;

  const [d] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: Position.Right,
    targetX: tx,
    targetY: ty,
    targetPosition: Position.Left,
  });

  // Como os cabos do vídeo de referência: porta nas DUAS pontas, sem flecha.
  const cor = (style?.stroke as string | undefined) ?? "var(--ds-nexo)";
  const opacidade = style?.opacity ?? 1;
  return (
    <>
      <BaseEdge id={id} path={d} style={{ ...style, strokeWidth: 2 }} />
      <circle cx={sx} cy={sy} r={4} fill={cor} stroke="rgb(0 0 0 / 0.55)" strokeWidth={1.5} opacity={opacidade} />
      <circle cx={tx} cy={ty} r={4} fill={cor} stroke="rgb(0 0 0 / 0.55)" strokeWidth={1.5} opacity={opacidade} />
    </>
  );
}
