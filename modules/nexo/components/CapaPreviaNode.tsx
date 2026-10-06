"use client";

/**
 * A CAPA ANTES DE GERAR, no canvas (06/10/2026, §7 do desenho do canvas da
 * montagem). Enquanto não há capa nem LD, cada fileira mostra a capa como vai
 * sair — o MESMO frame do "Ver como sai" do plano, com o que falta decidir
 * aceso. Editar aqui é editar no plano (`editarNoFrame` → `aoEditarNoFrame`):
 * uma fonte para as decisões. Só o TOMO muda de fileira para fileira.
 */
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import { useGeradorDoPlano } from "../state/montadores-de-volume";
import { FrameDoDocumento } from "./FrameDoDocumento";

export type CapaPreviaData = {
  /** O número impresso ("TOMO 05"); 0 = volume sem divisão. */
  numeroDoTomo: number;
};

export function CapaPreviaNode({ data }: NodeProps<Node<CapaPreviaData & Record<string, unknown>>>) {
  const { gerador, editarNoFrame } = useGeradorDoPlano();
  const frame = gerador?.frame;
  if (!frame) return null;
  const derivados = {
    ...frame.derivados,
    TOMO: data.numeroDoTomo > 0 ? `TOMO ${String(data.numeroDoTomo).padStart(2, "0")}` : "",
  };
  return (
    <div className="nodrag nopan nowheel w-[340px] rounded-md border border-border bg-card p-3" data-prova="capa-previa">
      <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">Capa · como vai sair</p>
      <FrameDoDocumento
        layout={frame.layout}
        prefeitura={frame.prefeitura}
        campos={frame.campos}
        valores={frame.valores}
        derivados={derivados}
        destaques={frame.destaques}
        opcoes={frame.opcoes}
        onChange={editarNoFrame}
      />
      {frame.layout.length === 0 && (
        <p className="text-xs text-[var(--status-warning)]">Escolha a prefeitura no plano do chat para ver a capa.</p>
      )}
      <Handle type="source" position={Position.Right} className="!opacity-0" style={{ top: 48 }} />
    </div>
  );
}
