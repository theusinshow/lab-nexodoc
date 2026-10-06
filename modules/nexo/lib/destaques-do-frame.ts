/**
 * QUAIS CAMPOS DA CAPA ACENDEM antes de gerar (06/10/2026, §7 do desenho do
 * canvas da montagem): "os campos que é para olhar não estão destacados".
 *
 * - `falta`: o Gerar não passa sem ele (número do volume, título) — âmbar.
 * - `sugerido`: campo editável que o Nexo preencheu (texto fantasma) e ninguém
 *   decidiu ainda — confira.
 * - nada: decidido à mão, ou derivado fixo (tomo, data, código) que não se edita aqui.
 *
 * PURO: só `import type`. `node scripts/test-nexo-destaques-do-frame.ts`.
 */
import type { CampoDoFrame } from "../components/FrameDoDocumento";

export type Destaque = "falta" | "sugerido";

export function destaquesDoFrame(args: {
  campos: readonly CampoDoFrame[];
  valores: Readonly<Record<string, string>>;
  derivados: Readonly<Record<string, string>>;
  faltas: readonly string[];
}): Record<string, Destaque> {
  const { campos, valores, derivados, faltas } = args;
  const d: Record<string, Destaque> = {};
  for (const c of campos) {
    if (faltas.includes(c.marcador)) {
      d[c.marcador] = "falta";
      continue;
    }
    if (c.derivadoDe) continue;
    if ((valores[c.marcador] ?? "").trim()) continue;
    if ((derivados[c.marcador] ?? "").trim()) d[c.marcador] = "sugerido";
  }
  return d;
}
