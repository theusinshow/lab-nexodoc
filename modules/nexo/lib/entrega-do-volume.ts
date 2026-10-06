/**
 * A ENTREGA DO VOLUME — o que já está montado, quanto pesa, e o que trava o
 * download (06/10/2026, Parte 3 e Parte 9 de
 * docs/superpowers/specs/2026-10-06-montagem-de-volume-design.md).
 *
 * Três travas, nesta ordem de leitura: falta tomo para montar; algum tomo passa
 * do teto de 20 MB (regra do escritório); os editáveis não foram baixados, ou
 * envelheceram. A dos editáveis já existia (`liberacaoDoVolume`); ela entra
 * aqui PRONTA, por parâmetro — este módulo é puro e não importa valor.
 *
 * PURO: só `import type`. `node scripts/test-nexo-entrega-painel.ts`.
 */
import type { SavedResult } from "../state/conversation-store";

/** 20 MB como o Windows mostra (MiB): os volumes do escritório param em 19,8. */
export const TETO_DO_TOMO_BYTES = 20 * 1024 * 1024;

const PDF = "application/pdf";

export function formatarMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export function rotuloDoTomo(tomo: number): string {
  return tomo > 0 ? `Tomo ${String(tomo).padStart(2, "0")}` : "Volume";
}

export type VereditoDoTomo = "ok" | "aviso" | "critico" | "sem-conferencia";

export interface TomoMontado {
  /** `0` = volume sem divisão em tomos. */
  tomo: number;
  nome: string;
  url: string;
  /** Peso do PDF; `null` quando o registro não guardou (conversa antiga). */
  bytes: number | null;
  acimaDoTeto: boolean;
  veredito: VereditoDoTomo;
  /** Achados de conferência que pedem um olhar (crítico + aviso; info não conta). */
  pontos: number;
}

interface ConferenciaGravada {
  veredito?: unknown;
  findings?: { severidade?: unknown }[];
}

function vereditoDe(conferencia: ConferenciaGravada | undefined): { veredito: VereditoDoTomo; pontos: number } {
  const v = conferencia?.veredito;
  if (v !== "ok" && v !== "aviso" && v !== "critico") return { veredito: "sem-conferencia", pontos: 0 };
  const pontos = (conferencia?.findings ?? []).filter((f) => f.severidade === "critico" || f.severidade === "aviso").length;
  return { veredito: v, pontos };
}

/** Os tomos montados, em ordem, com peso, teto e conferência. */
export function tomosMontados(results: readonly SavedResult[]): TomoMontado[] {
  const tomos: TomoMontado[] = [];
  for (const r of results) {
    if (r.kind !== "volume") continue;
    const arquivo = r.files.find((f) => f.mime === PDF && f.primary) ?? r.files.find((f) => f.mime === PDF);
    if (!arquivo?.url) continue;
    const payload = (r.payload ?? {}) as { tomo?: unknown; conferencia?: ConferenciaGravada };
    const tomo = typeof payload.tomo === "number" ? payload.tomo : 0;
    const bytes = typeof arquivo.sizeBytes === "number" ? arquivo.sizeBytes : null;
    tomos.push({
      tomo,
      nome: arquivo.name,
      url: arquivo.url,
      bytes,
      acimaDoTeto: bytes !== null && bytes > TETO_DO_TOMO_BYTES,
      ...vereditoDe(payload.conferencia),
    });
  }
  return tomos.sort((a, b) => a.tomo - b.tomo);
}

/**
 * Quantos tomos o volume TEM de ter: o maior entre o declarado na capa/LD
 * (`payload.numTomos`) e o que já foi montado. Comparar só com os montados
 * diria "completo" com 4 de 6.
 */
export function tomosPlanejados(results: readonly SavedResult[]): number {
  let declarado = 0;
  let montados = 0;
  for (const r of results) {
    const n = (r.payload as { numTomos?: unknown } | undefined)?.numTomos;
    if (typeof n === "number" && Number.isFinite(n)) declarado = Math.max(declarado, Math.floor(n));
    if (r.kind === "volume") montados++;
  }
  return Math.max(declarado, montados);
}

/** O número do volume impresso na capa ("3", "I"), ou "" sem capa. */
export function volumeDaCapa(results: readonly SavedResult[]): string {
  for (const r of results) {
    if (r.kind !== "capa") continue;
    const v = (r.payload as { volume?: unknown } | undefined)?.volume;
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

export interface PassosDaEntrega {
  editaveis: { feito: boolean; quando: number | null; motivo: string | null };
  volumes: { liberado: boolean; motivo: string | null };
  acimaDoTeto: TomoMontado[];
  prontos: number;
  planejados: number;
}

export function passosDaEntrega(args: {
  tomos: readonly TomoMontado[];
  planejados: number;
  liberacao: { liberado: boolean; motivo: string | null };
  editaveisSalvosEm: number | null;
}): PassosDaEntrega {
  const { tomos, planejados, liberacao, editaveisSalvosEm } = args;
  const acimaDoTeto = tomos.filter((t) => t.acimaDoTeto);
  const feito = editaveisSalvosEm !== null && liberacao.liberado;
  // Nunca baixou é PENDENTE, não erro: o motivo só aparece quando envelheceu.
  const editaveis = {
    feito,
    quando: feito ? editaveisSalvosEm : null,
    motivo: !feito && editaveisSalvosEm !== null ? liberacao.motivo : null,
  };

  const faltam = Math.max(0, planejados - tomos.length);
  let motivo: string | null = null;
  if (faltam > 0) {
    motivo = `Faltam ${faltam} de ${planejados} tomos para montar.`;
  } else if (acimaDoTeto.length === 1) {
    const t = acimaDoTeto[0];
    motivo = `O ${rotuloDoTomo(t.tomo)} tem ${formatarMb(t.bytes ?? 0)} — passa do teto de 20 MB.`;
  } else if (acimaDoTeto.length > 1) {
    motivo = `${acimaDoTeto.length} tomos passam do teto de 20 MB (${acimaDoTeto.map((t) => rotuloDoTomo(t.tomo)).join(", ")}).`;
  } else if (!liberacao.liberado) {
    motivo = editaveisSalvosEm === null ? "Baixe os editáveis primeiro." : liberacao.motivo;
  }

  return {
    editaveis,
    volumes: { liberado: motivo === null && tomos.length > 0, motivo },
    acimaDoTeto,
    prontos: tomos.length,
    planejados,
  };
}
