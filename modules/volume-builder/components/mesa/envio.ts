/**
 * O QUE VAI PARA O SERVIDOR — conferência, relatório e exportação partem do
 * MESMO manifesto efetivo (V06/V07).
 *
 * O `status` de cada volume é o que a prontidão calculou agora, e não o que o
 * volume carregava desde a criação ("sem_problemas" num volume vazio era como o
 * relatório dizia OK sobre nada).
 */

import type { EstadoDaMontagem, prontidaoDaMontagem } from "@/modules/volume-builder/lib/volume/mesa";
import type { AssemblyRow } from "@/modules/volume-builder/lib/volume/volume-types";

export function rowsParaEnvio(
  estado: EstadoDaMontagem,
  prontidao: ReturnType<typeof prontidaoDaMontagem>,
): AssemblyRow[] {
  return estado.rows.map((row) => {
    const p = prontidao.volumes.find((v) => v.rowId === row.id);
    const status = !p
      ? row.status
      : p.bloqueios.length > 0
        ? "problema_de_montagem"
        : p.avisos.length > 0
          ? "ponto_de_atencao"
          : "sem_problemas";
    return {
      ...row,
      status,
      warnings: p ? [...p.bloqueios, ...p.avisos].map((x) => x.texto) : row.warnings,
      requiresManualConfirmation: status === "problema_de_montagem",
    };
  });
}

export function arquivosUsados(rows: AssemblyRow[]): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.cover?.selection) ids.add(row.cover.selection.sourceFileId);
    for (const b of row.blocks) {
      for (const s of [b.separator, b.ld, ...b.documents, ...(b.appendices ?? [])]) {
        if (s?.selection) ids.add(s.selection.sourceFileId);
      }
    }
  }
  return ids;
}
