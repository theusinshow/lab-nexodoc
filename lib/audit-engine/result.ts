/**
 * Fechamento da investigação: da resposta final do modelo ao
 * `InvestigationResult`, passando por travas que não dependem de confiar no
 * modelo.
 *
 * O modelo devolve decisão, premissas, citações com papel e ids de cálculos
 * que a FERRAMENTA executou. Aqui:
 * - cada citação é relocalizada na revisão/página declarada (nunca em outra), e
 *   uma que não ancora impede decisão firme;
 * - cálculo só vale se o id veio de execução real da ferramenta;
 * - premissa com valor literal exige citação que contenha esse valor;
 * - uma única citação sustentando várias premissas não basta;
 * - pista de refutação conhecida e não examinada impede confirmar;
 * - proposição mudada vira candidato derivado (a confirmação é do derivado);
 * - `rejected` exige contraevidência ancorada.
 * Trava que falha REBAIXA para inconclusivo com o motivo — não some, não vira
 * "sem achados", e nunca sobe a confiança.
 */
import {
  admitConfirmed, ENGINE_CONTRACT_VERSION, stableHash,
  type CalculationRecord, type Candidate, type Coverage, type EvidenceRef, type InvestigationResult,
  type ProofBundle, type RefIntegrity, type RefRole, type RevisionText, type TraceOp,
} from "./contracts.ts";
import { locateQuote, type RevisionIndex } from "./evidence.ts";

// ---------------------------------------------------------------- formato final

const s = { type: "string" };
const obj = (properties: Record<string, unknown>) =>
  ({ type: "object", additionalProperties: false, properties, required: Object.keys(properties) });

export const INVESTIGATOR_FINAL_SCHEMA = obj({
  decision: { type: "string", enum: ["confirmed", "rejected", "inconclusive"] },
  finalProposition: s,
  premises: { type: "array", items: obj({ premiseId: s, status: { type: "string", enum: ["supported", "refuted", "unresolved"] }, why: s }) },
  evidence: {
    type: "array", items: obj({
      revisionId: s, page: { type: "integer" }, quote: s,
      role: { type: "string", enum: ["supports", "refutes", "context"] },
      premiseIds: { type: "array", items: s }, offset: { type: ["integer", "null"] },
    }),
  },
  conditions: { type: "array", items: obj({ description: s, resolution: { type: "string", enum: ["satisfied", "not_satisfied", "unknown"] }, evidenceIndexes: { type: "array", items: { type: "integer" } } }) },
  calculationIds: { type: "array", items: s },
  missingContext: { type: "array", items: s },
  scopeLimits: { type: "array", items: s },
  summary: s,
});
export const INVESTIGATOR_FINAL_FORMAT = { type: "json_schema", name: "audit_investigation", strict: true, schema: INVESTIGATOR_FINAL_SCHEMA };

export type InvestigatorFinal = {
  decision: "confirmed" | "rejected" | "inconclusive";
  finalProposition: string;
  premises: Array<{ premiseId: string; status: "supported" | "refuted" | "unresolved"; why: string }>;
  evidence: Array<{ revisionId: string; page: number; quote: string; role: RefRole; premiseIds: string[]; offset: number | null }>;
  conditions: Array<{ description: string; resolution: "satisfied" | "not_satisfied" | "unknown"; evidenceIndexes: number[] }>;
  calculationIds: string[];
  /** Informação que falta PARA ESTA CONCLUSÃO. Não vazio impede confirmar. */
  missingContext: string[];
  /**
   * Limite de ESCOPO: o que está fora dos documentos fornecidos (errata externa,
   * desenho não enviado) e não é premissa da proposição demonstrada nos trechos.
   * Só é exibido. Separado de `missingContext` para que a regra seja estrutural,
   * e não dependa de o modelo escolher a lista "certa" para passar.
   */
  scopeLimits: string[];
  summary: string;
};

const isStr = (v: unknown, max = 6000): v is string => typeof v === "string" && v.length <= max;
const isStrArr = (v: unknown, n = 50) => Array.isArray(v) && v.length <= n && v.every(x => isStr(x, 2000));

/** Structured Outputs não substitui validação na fronteira. JSON inválido não é "recuperado". */
export function parseInvestigatorFinal(text: string): InvestigatorFinal {
  let v: unknown;
  try { v = JSON.parse(text); } catch { throw new Error("final_not_json"); }
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("final_not_object");
  const f = v as Record<string, unknown>;
  if (!["confirmed", "rejected", "inconclusive"].includes(String(f.decision))) throw new Error("final_invalid_decision");
  if (!isStr(f.finalProposition) || !f.finalProposition.trim() || !isStr(f.summary) || !isStrArr(f.missingContext) || !isStrArr(f.calculationIds)) {
    throw new Error("final_invalid_fields");
  }
  // Ausente (resposta antiga/roteiro) = sem limites; presente e inválido = recusa.
  if (f.scopeLimits === undefined) f.scopeLimits = [];
  else if (!isStrArr(f.scopeLimits)) throw new Error("final_invalid_fields");
  const premises = f.premises;
  if (!Array.isArray(premises) || premises.length > 20 || !premises.every(p => p && isStr(p.premiseId, 100) && isStr(p.why) &&
    ["supported", "refuted", "unresolved"].includes(p.status))) throw new Error("final_invalid_premises");
  const evidence = f.evidence;
  if (!Array.isArray(evidence) || evidence.length > 30 || !evidence.every(e => e && isStr(e.revisionId, 200) &&
    Number.isSafeInteger(e.page) && e.page >= 1 && isStr(e.quote) && ["supports", "refutes", "context"].includes(e.role) &&
    isStrArr(e.premiseIds, 20) && (e.offset === null || (Number.isSafeInteger(e.offset) && e.offset >= 0)))) {
    throw new Error("final_invalid_evidence");
  }
  const conditions = f.conditions;
  if (!Array.isArray(conditions) || conditions.length > 20 || !conditions.every(c => c && isStr(c.description) &&
    ["satisfied", "not_satisfied", "unknown"].includes(c.resolution) && Array.isArray(c.evidenceIndexes) &&
    c.evidenceIndexes.every((i: unknown) => Number.isSafeInteger(i) && (i as number) >= 0 && (i as number) < evidence.length))) {
    throw new Error("final_invalid_conditions");
  }
  return f as unknown as InvestigatorFinal;
}

// ---------------------------------------------------------------- travas

export type Gate =
  | "admission_failed"
  | "evidence_not_anchored"
  | "calculation_not_executed"
  | "calculation_required"
  | "literal_not_in_support"
  | "single_support_for_many_premises"
  | "counterevidence_not_addressed"
  | "rejection_without_anchored_counterevidence"
  /** Proposição final diferente da investigada: exige investigação própria (premissas novas). */
  | "derived_claim_not_investigated"
  /** O próprio resultado declara faltar informação necessária à conclusão. */
  | "required_context_missing";

export type CloseInput = {
  final: InvestigatorFinal;
  candidate: Candidate;
  corpus: RevisionIndex[];
  /** Cálculos que a ferramenta executou nesta investigação, por id. */
  calculations: Map<string, CalculationRecord>;
  /** Referências das pistas de refutação conhecidas (de `refutationLeads`). */
  leads: EvidenceRef[];
  coverage: Coverage;
  trace: TraceOp[];
};

const NUMBER = /[-−]?\d{1,3}(?:\.\d{3})+(?:,\d+)?|[-−]?\d+(?:[.,]\d+)?/g;
/** Valores que identificam uma premissa. "fonte 1" não: um dígito solto casaria com qualquer citação. */
const numbersIn = (t: string) => [...t.matchAll(NUMBER)].map(m => m[0]).filter(n => /\d.*[.,]\d|\d\d/.test(n));
const overlaps = (a: EvidenceRef, b: EvidenceRef) =>
  a.revisionId === b.revisionId && a.page === b.page && a.start < b.end && b.start < a.end;

/** Diferença além de caixa, espaço e pontuação. Reescrita cosmética não é alegação nova. */
function materiallyDifferent(a: string, b: string) {
  const n = (t: string) => t.normalize("NFC").toLowerCase().replace(/[\s\p{P}]+/gu, " ").trim();
  return n(a) !== n(b);
}

export function closeInvestigation(input: CloseInput): InvestigationResult {
  const { final, candidate, corpus } = input;
  const trace = [...input.trace];
  const gates = new Set<Gate>();

  const refs: ProofBundle["refs"] = [];
  const indexMap: number[] = [];
  for (const e of final.evidence) {
    const idx = corpus.find(c => c.rt.revision.revisionId === e.revisionId);
    const located = idx
      ? locateQuote(corpus, {
        documentId: idx.rt.revision.documentId, revisionId: e.revisionId, page: e.page, quote: e.quote,
        ...(e.offset !== null ? { disambiguation: { offset: e.offset } } : {}),
      })
      : null;
    if (located?.status === "anchored") {
      indexMap.push(refs.length);
      refs.push({ ref: located.ref, role: e.role, premiseIds: e.premiseIds, integrity: "anchored" });
    } else {
      const integrity: RefIntegrity = !located ? "revision_unknown" : located.status === "ambiguous" ? "ambiguous" : "not_found";
      trace.push({ op: "evidence_rejected", detail: `${integrity}:${located?.status ?? "revision_unknown"}` });
      indexMap.push(-1);
    }
  }

  const calcs: CalculationRecord[] = [];
  for (const id of final.calculationIds) {
    const rec = input.calculations.get(id);
    if (rec) calcs.push(rec); else gates.add("calculation_not_executed");
  }

  const derived = final.finalProposition.trim() !== candidate.proposition.trim();
  const target: Candidate = derived
    ? {
      ...candidate, id: `cand-${stableHash([candidate.id, final.finalProposition]).slice(0, 16)}`,
      proposition: final.finalProposition, origin: { kind: "derived", parentCandidateId: candidate.id },
    }
    : candidate;

  const proof: ProofBundle = {
    premises: target.premises.map(p => ({ premiseId: p.id, status: final.premises.find(x => x.premiseId === p.id)?.status ?? "unresolved" })),
    refs,
    conditions: final.conditions.map(c => ({
      description: c.description, resolution: c.resolution,
      refIndexes: c.evidenceIndexes.map(i => indexMap[i]).filter(i => i >= 0),
    })),
    calculations: calcs,
  };

  let decision = final.decision;
  // Citação que não ancora não some calada da prova de uma decisão firme.
  if (decision !== "inconclusive" && indexMap.some(i => i < 0)) gates.add("evidence_not_anchored");
  // Conta decidida (para qualquer lado) sem a ferramenta ter executado a conta não vale.
  if (decision !== "inconclusive" && candidate.kind === "calculation" && calcs.length === 0) gates.add("calculation_required");
  if (decision === "confirmed") {
    // Premissa com número exige citação de suporte que traga esse número.
    for (const p of target.premises) {
      const nums = numbersIn(p.statement);
      if (!nums.length) continue;
      const supports = refs.filter(r => r.role === "supports" && r.premiseIds.includes(p.id));
      if (supports.length && !supports.some(r => nums.some(n => r.ref.quote.includes(n)))) gates.add("literal_not_in_support");
    }
    const supportRefs = refs.filter(r => r.role === "supports");
    if (target.premises.length > 1 && supportRefs.length === 1 && supportRefs[0].premiseIds.length > 1) {
      gates.add("single_support_for_many_premises");
    }
    // Pista de refutação conhecida precisa ter sido examinada (citada em qualquer papel).
    for (const lead of input.leads) {
      if (!refs.some(r => overlaps(r.ref, lead))) gates.add("counterevidence_not_addressed");
    }
  }
  if (decision === "rejected" && !refs.some(r => r.role === "refutes")) gates.add("rejection_without_anchored_counterevidence");
  if (decision === "confirmed") {
    // As premissas verificadas são as da suspeita ORIGINAL; uma alegação nova (outro
    // escopo, entidade ou consequência) não herda a prova. Fica pendente até ter a sua.
    if (derived && materiallyDifferent(final.finalProposition, candidate.proposition)) gates.add("derived_claim_not_investigated");
    if (final.missingContext.some(m => m.trim())) gates.add("required_context_missing");
  }

  const base = {
    contractVersion: ENGINE_CONTRACT_VERSION as typeof ENGINE_CONTRACT_VERSION, candidateId: candidate.id, coverage: input.coverage,
    kind: "decision" as const, finalProposition: final.finalProposition, derivedCandidate: derived ? target : null,
    proof, summary: final.summary,
  };
  const missing = [...final.missingContext, ...final.scopeLimits.map(l => `limite de escopo: ${l}`)];
  if (decision === "confirmed") {
    const corpusTexts: RevisionText[] = corpus.map(c => c.rt);
    const admission = admitConfirmed({ ...base, trace, decision: "confirmed", missingContext: missing }, candidate, corpusTexts);
    if (!admission.admitted) {
      gates.add("admission_failed");
      trace.push({ op: "admission", detail: admission.errors.join(",") });
    }
  }
  if (gates.size && decision !== "inconclusive") {
    trace.push({ op: "gate", detail: `${decision}->inconclusive:${[...gates].sort().join(",")}` });
    missing.push(...[...gates].sort().map(g => `trava:${g}`));
    decision = "inconclusive";
  }
  return { ...base, trace, decision, missingContext: missing };
}

// ---------------------------------------------------------------- compatibilidade

/**
 * Decisão no vocabulário da validação atual (`aplicarDecisaoDaValidacao`).
 * `remover` continua significando: achado de IA vira sugestão; achado de regra
 * FICA e o desacordo é registrado como contestação. Falha operacional e
 * inconclusivo viram `rebaixar` — nunca `remover`.
 */
export function toLegacyDecision(result: InvestigationResult): { acao: "confirmar" | "rebaixar" | "remover"; motivo: string; premissasContestadas: string[] } {
  if (result.kind === "operational_failure") {
    return { acao: "rebaixar", motivo: `investigação não concluída (${result.reason})`, premissasContestadas: [] };
  }
  const contested = result.proof.premises.filter(p => p.status === "refuted").map(p => p.premiseId);
  const acao = result.decision === "confirmed" ? "confirmar" : result.decision === "rejected" ? "remover" : "rebaixar";
  return { acao, motivo: result.summary, premissasContestadas: contested };
}
