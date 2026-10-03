/**
 * QUANTO CADA ETAPA COSTUMA LEVAR — medido nas auditorias que já terminaram
 * neste navegador, para a linha do tempo desenhar o previsto e o cronômetro
 * dizer "~1:47 para terminar".
 *
 * O motor não manda previsão (só o teto de algumas etapas, que não é previsão).
 * O lab já dizia de onde ela viria: "da média das últimas auditorias". Aqui é a
 * MEDIANA das últimas oito do mesmo nível — uma corrida que travou não arrasta
 * a estimativa. A leitura do documento e a capítulo a capítulo crescem com o
 * documento, então são medidas por página e escaladas para o atual; as outras
 * valem em segundos.
 *
 * Sem histórico (primeira auditoria do navegador), não há previsão: a tela diz
 * isso em vez de inventar. Guardado no localStorage, que pode faltar (janela
 * anônima, dado apagado): toda leitura e escrita é protegida.
 */
import type { PassadaDaAuditoria } from "@/lib/audit-progress";
import { etapasDosMarcos, type MarcoRecebido } from "./etapas-da-auditoria";

const CHAVE = "nexo:tempos-da-auditoria";
const GUARDADAS = 8;
/** As que crescem com o documento: medidas em segundos por página. */
const POR_PAGINA: ReadonlySet<PassadaDaAuditoria> = new Set(["global", "blocos"]);

interface CorridaMedida {
  nivel: "standard" | "deep";
  paginas: number;
  /** Segundos de cada etapa. */
  duracoes: Partial<Record<PassadaDaAuditoria, number>>;
}

function lerCorridas(): CorridaMedida[] {
  try {
    const cru = window.localStorage.getItem(CHAVE);
    const lidas = cru ? (JSON.parse(cru) as CorridaMedida[]) : [];
    return Array.isArray(lidas) ? lidas : [];
  } catch {
    return [];
  }
}

/** Guarda as durações de uma corrida que chegou ao parecer. As outras não ensinam nada. */
export function guardarCorrida(nivel: "standard" | "deep", marcos: readonly MarcoRecebido[]) {
  const etapas = etapasDosMarcos(marcos);
  if (!etapas.some((e) => e.passada === "parecer" && e.concluida)) return;
  const paginas = paginasDosMarcos(marcos);
  if (!paginas) return;
  const duracoes: CorridaMedida["duracoes"] = {};
  for (const e of etapas) {
    if (e.concluida && e.fimMs !== undefined) duracoes[e.passada] = Math.max(0, (e.fimMs - e.inicioMs) / 1000);
  }
  try {
    const corridas = [...lerCorridas(), { nivel, paginas, duracoes }].slice(-GUARDADAS);
    window.localStorage.setItem(CHAVE, JSON.stringify(corridas));
  } catch {
    /* sem armazenamento: a próxima corrida só não terá previsão */
  }
}

function mediana(valores: number[]) {
  const v = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(v.length / 2);
  return v.length % 2 ? v[meio] : (v[meio - 1] + v[meio]) / 2;
}

/** Segundos previstos por etapa para um documento de `paginas` páginas; null sem histórico. */
export function previsaoPorEtapa(nivel: "standard" | "deep", paginas: number | null): Partial<Record<PassadaDaAuditoria, number>> | null {
  const corridas = lerCorridas().filter((c) => c.nivel === nivel && c.paginas > 0);
  if (corridas.length === 0) return null;
  const previsto: Partial<Record<PassadaDaAuditoria, number>> = {};
  const passadas = new Set(corridas.flatMap((c) => Object.keys(c.duracoes) as PassadaDaAuditoria[]));
  for (const p of passadas) {
    const valores = corridas.flatMap((c) => {
      const d = c.duracoes[p];
      if (d === undefined) return [];
      return POR_PAGINA.has(p) && paginas ? [(d / c.paginas) * paginas] : [d];
    });
    if (valores.length) previsto[p] = mediana(valores);
  }
  return previsto;
}

/** As páginas do documento, do marco da abertura. */
export function paginasDosMarcos(marcos: readonly MarcoRecebido[]): number | null {
  return marcos.find((m) => m.passada === "extracao" && m.paginas)?.paginas ?? null;
}

/** O valor mais recente de um campo entre os marcos (o store guarda um por passada e estado). */
export function maisRecente<K extends "blocos" | "foto">(marcos: readonly MarcoRecebido[], campo: K): MarcoRecebido[K] | undefined {
  let melhor: MarcoRecebido | undefined;
  for (const m of marcos) {
    if (m[campo] === undefined) continue;
    if (!melhor || (m.ultimoMs ?? m.emMs) >= (melhor.ultimoMs ?? melhor.emMs)) melhor = m;
  }
  return melhor?.[campo];
}

/** Quanto a auditoria inteira deve levar, em segundos; null sem histórico. */
export function previsaoTotal(nivel: "standard" | "deep", paginas: number | null): number | null {
  const p = previsaoPorEtapa(nivel, paginas);
  if (!p) return null;
  const soma = Object.values(p).reduce((s, v) => s + (v ?? 0), 0);
  return soma > 0 ? soma : null;
}

/** "uns 4 minutos", "menos de um minuto". */
export function falaDaDuracao(segundos: number): string {
  if (segundos < 60) return "menos de um minuto";
  const min = Math.round(segundos / 60);
  return min === 1 ? "cerca de um minuto" : `uns ${min} minutos`;
}
