import { formatarEmBrasilia, mesmoDiaEmBrasilia } from "@/lib/fuso-de-brasilia";

/** "hoje, 21:13" ou "26/09": o quando de uma linha de tabela, no fuso de Brasília. */
export function quandoNaLinha(iso: string, agora: Date = new Date()) {
  if (mesmoDiaEmBrasilia(iso, agora)) return `hoje, ${formatarEmBrasilia(iso, { hour: "2-digit", minute: "2-digit" })}`;
  return formatarEmBrasilia(iso, { day: "2-digit", month: "2-digit" });
}

/** Dias inteiros desde `iso` (para "o mais antigo espera há N dias"). */
export function diasDesde(iso: string, agora: Date = new Date()) {
  return Math.max(0, Math.floor((agora.getTime() - new Date(iso).getTime()) / 86_400_000));
}
