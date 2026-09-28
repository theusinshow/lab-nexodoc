/**
 * O cartão do achado como DADO, antes de qualquer React: Problema → Evidência →
 * Consequência → Ação → Estado e limites. Puro e testável em node; a tela só
 * desenha o que sai daqui.
 *
 * - Navegação por revisão + página física. Arquivo indisponível vira aviso com a
 *   citação — nunca abre outro arquivo em silêncio.
 * - Realce só quando a citação é comprovadamente única na página
 *   (`uniqueOnPage`); senão abre a página sem realçar.
 * - Consequência que depende de hipótese vai no condicional.
 * - Nada de "agente X concordou": especialista, chamadas e tokens não entram.
 */
import type { CalculationRecord } from "./contracts.ts";
import { parseEngineFinding, type EngineFindingV1, type EngineReference } from "./report-contract.ts";

export type CardNavigation =
  | { kind: "open"; revisionId: string; fileName: string; page: number; highlight: string | null }
  | { kind: "unavailable"; fileName: string; page: number; reason: "file_not_available" };

export type CardSource = {
  role: "sustenta" | "contradiz" | "contexto" | "possível exceção";
  fileName: string;
  page: number;
  quote: string;
  navigation: CardNavigation;
};

export type CardCalculation = {
  expression: string;
  operands: Array<{ name: string; value: string; source: string }>;
  result: string;
};

export type FindingCardModel = {
  problem: string;
  sources: CardSource[];
  calculations: CardCalculation[];
  consequence: string | null;
  action: string;
  state: { label: string; kind: "confirmed" | "open" | "contested" | "not_verified" | "legacy"; limits: string[]; examined: string };
};

const ROLE: Record<EngineReference["role"], CardSource["role"]> = {
  supports: "sustenta", refutes: "contradiz", context: "contexto", counter_lead: "possível exceção",
};

const STATE: Record<EngineFindingV1["state"], { label: string; kind: FindingCardModel["state"]["kind"] }> = {
  confirmed: { label: "Confirmado com fontes verificadas", kind: "confirmed" },
  inconclusive: { label: "Em aberto — não confirmado", kind: "open" },
  rejected: { label: "Regra com premissa contestada — revisar", kind: "contested" },
  operational_failure: { label: "Não verificado — a investigação não concluiu", kind: "not_verified" },
};

const num = (n: number) => Number(n.toPrecision(10)).toLocaleString("pt-BR", { maximumFractionDigits: 6 });

function calc(c: CalculationRecord): CardCalculation {
  return {
    expression: c.expression,
    operands: c.operands.map(o => ({
      name: o.name, value: `${num(o.value)}${o.unit ? ` ${o.unit}` : ""}`,
      source: o.source.kind === "hypothesis" ? `hipótese: ${o.source.note}` : o.source.kind === "fact" ? "valor do documento" : "citação",
    })),
    result: `${num(c.result)}${c.unit ? ` ${c.unit}` : ""}`,
  };
}

/** Forma mínima do achado legado lida aqui. */
export type CardInput = {
  descricao: string; conflito: string; evidencia: string; sugestao_correcao: string;
  arquivo?: string; pagina: string; motor?: unknown;
};

export function findingCard(
  f: CardInput,
  // `fileName` vai junto (A03, 28/09/2026): o resolvedor da tela só aceita cair
  // para o nome quando a revisão não traz hash — e para isso precisa do nome.
  availability: { hasRevision: (revisionId: string, fileName?: string) => boolean },
): FindingCardModel {
  const parsed = parseEngineFinding(f.motor);
  if (parsed.kind !== "engine") {
    // Parecer anterior ao motor (ou `motor` ilegível): mostra o que há, sem inventar fonte estruturada.
    return {
      problem: f.conflito || f.descricao, sources: [], calculations: [], consequence: null,
      action: f.sugestao_correcao || "Revisar o trecho indicado.",
      state: {
        label: parsed.kind === "invalid" ? "Dados do motor ilegíveis — estado não verificável" : "Achado anterior ao motor — estado não rastreado",
        kind: "legacy", limits: parsed.kind === "invalid" ? parsed.errors : [],
        examined: f.evidencia ? `Evidência registrada: ${f.evidencia}` : "Sem evidência estruturada.",
      },
    };
  }
  const m = parsed.value;
  const sources: CardSource[] = m.references.map(r => ({
    role: ROLE[r.role], fileName: r.fileName, page: r.page, quote: r.quote,
    navigation: availability.hasRevision(r.revisionId, r.fileName)
      ? { kind: "open", revisionId: r.revisionId, fileName: r.fileName, page: r.page, highlight: r.uniqueOnPage === true ? r.quote : null }
      : { kind: "unavailable", fileName: r.fileName, page: r.page, reason: "file_not_available" },
  }));
  const hypothesis = m.state !== "confirmed" || m.premises.some(p => p.status === "unresolved") ||
    (m.calculations ?? []).some(c => c.operands.some(o => o.source.kind === "hypothesis"));
  const consequence = m.consequence ? (hypothesis ? `Se confirmado: ${m.consequence}` : m.consequence) : null;
  const files = [...new Set(m.references.filter(r => r.role !== "counter_lead").map(r => `${r.fileName} p.${r.page}`))];
  const exceptions = m.references.filter(r => r.role === "counter_lead" || r.role === "refutes").length;
  return {
    problem: m.proposition,
    sources,
    calculations: (m.calculations ?? []).map(calc),
    consequence,
    action: m.suggestedAction ?? f.sugestao_correcao ?? "Revisar as fontes citadas.",
    state: {
      ...STATE[m.state],
      limits: [
        ...m.limits.map(l => (l.startsWith("trava:") ? `verificação automática não passou: ${l.slice(6)}` : l)),
        ...m.contestedPremises.map(id => `premissa contestada: ${m.premises.find(p => p.id === id)?.statement ?? id}`),
        ...m.premises.filter(p => p.status === "unresolved").map(p => `premissa em aberto: ${p.statement}`),
      ],
      examined: `Fontes examinadas: ${files.join(", ") || "nenhuma"}${exceptions ? `; ${exceptions} possível(is) exceção(ões) ou contraevidência(s) consideradas` : ""}.`,
    },
  };
}
