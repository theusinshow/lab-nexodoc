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

/** "Tomo 04"; num volume sem divisão em tomos (`unico`) é só "Volume". */
export function rotuloDoTomo(tomo: number, unico = false): string {
  return tomo > 0 && !unico ? `Tomo ${String(tomo).padStart(2, "0")}` : "Volume";
}

export type VereditoDoTomo = "ok" | "aviso" | "critico" | "sem-conferencia";

export interface TomoMontado {
  /** O artifactId do volume. */
  id: string;
  /** `0` = volume sem divisão em tomos. */
  tomo: number;
  nome: string;
  /**
   * `null` quando o PDF não está NESTE navegador (`bytesAusentes`: o servidor
   * guarda só a referência). O tomo continua montado — só não dá para baixar.
   */
  url: string | null;
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
    if (!arquivo?.url && !r.bytesAusentes) continue;
    const payload = (r.payload ?? {}) as { tomo?: unknown; conferencia?: ConferenciaGravada };
    const tomo = typeof payload.tomo === "number" ? payload.tomo : 0;
    const bytes = typeof arquivo?.sizeBytes === "number" ? arquivo.sizeBytes : null;
    tomos.push({
      id: r.artifactId,
      tomo,
      nome: arquivo?.name ?? "",
      url: arquivo?.url || null,
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
  return numerosDosTomos(results).length;
}

/**
 * Os NÚMEROS dos tomos, como saem na capa: o volume pode começar no Tomo 05
 * (`tomoInicial`), e listar 1..N mostraria tomos que não existem. Vem da
 * primeira LD/capa que declara a divisão (a mesma fonte de `tomosDoVolume` no
 * cartão), somada a qualquer tomo montado fora dela.
 */
export function numerosDosTomos(results: readonly SavedResult[]): number[] {
  const numeros = new Set<number>();
  const declarou = results.find(
    (r) => (r.kind === "ld" || r.kind === "capa") && typeof (r.payload as { numTomos?: unknown } | undefined)?.numTomos === "number",
  );
  if (declarou) {
    const p = declarou.payload as { numTomos: number; tomoInicial?: unknown };
    const inicio = typeof p.tomoInicial === "number" ? p.tomoInicial : 1;
    for (let i = 0; i < Math.max(1, Math.floor(p.numTomos)); i++) numeros.add(inicio + i);
  }
  for (const r of results) {
    if (r.kind !== "volume") continue;
    const t = (r.payload as { tomo?: unknown } | undefined)?.tomo;
    numeros.add(typeof t === "number" ? t : 0);
  }
  return [...numeros].sort((a, b) => a - b);
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
  } else if (tomos.some((t) => t.url === null)) {
    motivo = "O PDF montado não está neste navegador. Monte de novo para baixar.";
  } else if (acimaDoTeto.length === 1) {
    const t = acimaDoTeto[0];
    const quem = planejados <= 1 ? "O volume" : `O ${rotuloDoTomo(t.tomo)}`;
    motivo = `${quem} tem ${formatarMb(t.bytes ?? 0)} — passa do teto de 20 MB.`;
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

/*
 * A VISTA OBRA (06/10/2026, etapa 3 do desenho do canvas da montagem): um
 * trilho por volume do projeto, cada tomo uma pílula. Mora aqui para usar as
 * MESMAS contas de tomo, peso e teto da entrega — um "acima do teto" na Obra e
 * outro na doca não podem discordar.
 */

const ROMANOS: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };

/** "3" → 3, "IV" → 4, "Vol. 12" → 12, "" → null. */
export function numeroDoVolume(valor: string): number | null {
  const digitos = /\d+/.exec(valor)?.[0];
  if (digitos) return Number(digitos);
  const romano = /\b[IVXLC]+\b/i.exec(valor.trim())?.[0]?.toUpperCase();
  if (!romano) return null;
  let total = 0;
  for (let i = 0; i < romano.length; i++) {
    const atual = ROMANOS[romano[i]];
    const proximo = ROMANOS[romano[i + 1]] ?? 0;
    total += atual < proximo ? -atual : atual;
  }
  return total > 0 ? total : null;
}

export interface TomoDaObra {
  numero: number;
  estado: "pronto" | "acima-do-teto" | "nao-montado";
  bytes: number | null;
}

export interface VolumeDaObra {
  conversaId: string;
  titulo: string;
  /** Como a capa imprime ("6", "III"); "" sem capa. */
  volume: string;
  tomos: TomoDaObra[];
  montados: number;
  planejados: number;
  pesoTotal: number;
  /** Já tem capa, LD ou volume gerado. */
  temDocumentos: boolean;
}

export function resumoDoVolume(conversaId: string, titulo: string, results: readonly SavedResult[]): VolumeDaObra {
  const montados = tomosMontados(results);
  const numeros = numerosDosTomos(results);
  const unico = numeros.length <= 1;
  const tomos: TomoDaObra[] = numeros.map((n) => {
    const m = montados.find((t) => t.tomo === n);
    return {
      numero: unico ? 0 : n,
      estado: !m ? "nao-montado" : m.acimaDoTeto ? "acima-do-teto" : "pronto",
      bytes: m?.bytes ?? null,
    };
  });
  return {
    conversaId,
    titulo,
    volume: volumeDaCapa(results),
    tomos,
    montados: montados.length,
    planejados: numeros.length,
    pesoTotal: montados.reduce((s, t) => s + (t.bytes ?? 0), 0),
    temDocumentos: results.some((r) => r.kind === "capa" || r.kind === "ld" || r.kind === "volume"),
  };
}

/** Na ordem dos volumes do escritório (3, 5, 6…); sem número por último, pelo título. */
export function ordenarVolumes(volumes: readonly VolumeDaObra[]): VolumeDaObra[] {
  return [...volumes].sort((a, b) => {
    const na = numeroDoVolume(a.volume);
    const nb = numeroDoVolume(b.volume);
    if (na !== null && nb !== null && na !== nb) return na - nb;
    if (na === null && nb !== null) return 1;
    if (na !== null && nb === null) return -1;
    return a.titulo.localeCompare(b.titulo, "pt-BR");
  });
}
