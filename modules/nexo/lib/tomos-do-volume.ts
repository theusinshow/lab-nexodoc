/**
 * OS TOMOS DE UM VOLUME e o id do volume de cada um. Saíram de
 * `ConfirmationCard.tsx` (06/10/2026) porque o canvas passou a montar e baixar
 * por tomo: duas contas de "qual é o id do volume do Tomo 02" divergem no
 * primeiro volume que começa no Tomo 05.
 *
 * PURO: só `import type`. `node scripts/test-nexo-tomos-do-volume.ts`.
 */
import type { SavedResult } from "../state/conversation-store";

export interface TomoDaProposta {
  /** 0 = documento único; 1..N = posição na divisão. */
  atual: number;
  /** O número que sai impresso ("TOMO 05"). */
  numero: number;
  /** `""` no volume único; `:tNN` (número real) com vários. */
  sufixo: string;
}

/**
 * Cada tomo é um volume físico: com 2 tomos saem 2 capas, 2 LDs, 2 volumes.
 * Um tomo só devolve `atual: 0` — as chaves ficam as de sempre e nada migra.
 */
export function tomosDaProposta(numTomos: number, tomoInicial: number): TomoDaProposta[] {
  if (numTomos <= 1) return [{ atual: 0, numero: tomoInicial, sufixo: "" }];
  return Array.from({ length: numTomos }, (_, i) => {
    const numero = tomoInicial + i;
    return { atual: i + 1, numero, sufixo: `:t${String(numero).padStart(2, "0")}` };
  });
}

/** A divisão vem da primeira LD/capa gerada que a declara; sem nada, um tomo. */
export function tomosDoVolume(results: readonly SavedResult[]): TomoDaProposta[] {
  const comTomos = results.find(
    (r) => (r.kind === "ld" || r.kind === "capa") && typeof (r.payload as { numTomos?: unknown } | undefined)?.numTomos === "number",
  );
  const p = comTomos?.payload as { numTomos?: number; tomoInicial?: number } | undefined;
  return tomosDaProposta(p?.numTomos ?? 1, p?.tomoInicial ?? 1);
}

export function idDoVolume(codigo: string | null | undefined, sufixo: string): string {
  return `volume:${codigo ?? "x"}${sufixo}`;
}

/** A fileira do canvas é o tomo do artefato (`tomoDoArtefato`): 0 = sem divisão. */
export function sufixoDoTomoNoCanvas(tomoDaFileira: number): string {
  return tomoDaFileira > 0 ? `:t${String(tomoDaFileira).padStart(2, "0")}` : "";
}
