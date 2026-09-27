/**
 * Roteamento seletivo sem triagem paga. Nenhuma chamada pergunta "devo
 * investigar?": a pré-verificação LOCAL olha fatos verificáveis do caso e
 * decide. Confiança declarada por modelo nunca entra.
 *
 * - direto: 1 chamada sem ferramentas, só quando nada local exige aprofundar;
 * - investigação: laço com ferramentas;
 * - direto que não fecha escala; escalada que falha preserva a inconclusão.
 *
 * A política é versionada pelo hash dos próprios parâmetros e razões: mudar um
 * limite ou uma razão muda a versão registrada em cada rota.
 */
import { stableHash, verifyRef, type Candidate, type RevisionText } from "./contracts.ts";
import { confirmationBlockers, type ProjectContext } from "./relations.ts";
import { refutationLeads } from "./discovery.ts";

export const ROUTE_REASONS = [
  "calculation_required",
  "context_truncated",
  "candidate_ref_unverified",
  "candidate_without_refs",
  "refutation_lead_pending",
  "relation_blocked",
  "not_from_relation",
] as const;
export type RouteReason = (typeof ROUTE_REASONS)[number];

export type RoutingParams = {
  maxCallsPerCandidate: number;
  directCalls: number;
  quotaPerRevision: number;
  quotaPerKind: number;
  kindWeight: Record<string, number>;
  reasons: readonly RouteReason[];
};
export const DEFAULT_ROUTING: RoutingParams = {
  maxCallsPerCandidate: 4, directCalls: 1, quotaPerRevision: 1, quotaPerKind: 1,
  kindWeight: { identity: 3, calculation: 3, comparison: 2, reference: 1, interpretation: 1 },
  reasons: ROUTE_REASONS,
};

export const routingVersion = (p: RoutingParams) => `routing-${stableHash(p).slice(0, 12)}`;

export type Preflight = { route: "direct" | "investigate"; reasons: RouteReason[]; policyVersion: string };

/**
 * Motivos locais para aprofundar. Todos apontam para o estado do caso (fonte
 * verificável, relação com bloqueio, pista pendente, contexto que não coube),
 * nunca para autoconfiança.
 */
export function preflight(
  candidate: Candidate,
  ctx: ProjectContext,
  corpus: RevisionText[],
  context: { candidateRefsMissing: number },
  params: RoutingParams = DEFAULT_ROUTING,
): Preflight {
  const reasons = new Set<RouteReason>();
  if (candidate.kind === "calculation") reasons.add("calculation_required");
  if (context.candidateRefsMissing > 0) reasons.add("context_truncated");
  if (!candidate.refs.length) reasons.add("candidate_without_refs");
  if (candidate.refs.some(r => verifyRef(r, corpus) !== "ok")) reasons.add("candidate_ref_unverified");
  if (refutationLeads(candidate, ctx).factIds.length) reasons.add("refutation_lead_pending");
  if (candidate.origin.kind !== "relation") reasons.add("not_from_relation");
  else {
    const originId = candidate.origin.relationId;
    const relation = ctx.relations.find(r => r.id === originId);
    if (!relation || confirmationBlockers(relation, ctx).length) reasons.add("relation_blocked");
  }
  const active = [...reasons].filter(r => params.reasons.includes(r)).sort();
  return { route: active.length ? "investigate" : "direct", reasons: active, policyVersion: routingVersion(params) };
}

export type Prioritized = {
  order: Candidate[];
  notExamined: Array<{ candidateId: string; revisionIds: string[]; reason: "budget" }>;
};

/**
 * Ordem de exame: primeiro garante a cota de cada revisão e de cada tipo (para
 * nenhum documento ou família sumir), depois impacto potencial, déficit de
 * prova e redundância (fontes já cobertas por candidato escolhido valem menos).
 * O que não couber em `slots` volta listado, nunca some.
 */
export function prioritize(
  candidates: Candidate[],
  ctx: ProjectContext,
  slots: number,
  params: RoutingParams = DEFAULT_ROUTING,
): Prioritized {
  const revisionsOf = (c: Candidate) => [...new Set(c.refs.map(r => r.revisionId))].sort();
  const deficit = (c: Candidate) => {
    if (c.origin.kind !== "relation") return 2;
    const originId = c.origin.relationId;
    const rel = ctx.relations.find(r => r.id === originId);
    return rel ? confirmationBlockers(rel, ctx).length : 2;
  };
  const score = (c: Candidate) => (params.kindWeight[c.kind ?? "interpretation"] ?? 1) * 10 + deficit(c);
  const ranked = [...candidates].sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));

  const chosen: Candidate[] = [];
  const seenRefs = new Set<string>();
  const take = (c: Candidate) => { chosen.push(c); c.refs.forEach(r => seenRefs.add(`${r.revisionId}:${r.page}:${r.start}`)); };
  const perRevision = new Map<string, number>();
  const perKind = new Map<string, number>();
  const count = (c: Candidate) => {
    revisionsOf(c).forEach(r => perRevision.set(r, (perRevision.get(r) ?? 0) + 1));
    perKind.set(c.kind ?? "interpretation", (perKind.get(c.kind ?? "interpretation") ?? 0) + 1);
  };
  // 1) cotas de cobertura
  for (const c of ranked) {
    if (chosen.length >= slots) break;
    const needsRevision = revisionsOf(c).some(r => (perRevision.get(r) ?? 0) < params.quotaPerRevision);
    const needsKind = (perKind.get(c.kind ?? "interpretation") ?? 0) < params.quotaPerKind;
    if (needsRevision || needsKind) { take(c); count(c); }
  }
  // 2) o resto por pontuação, com penalidade de redundância
  const rest = ranked.filter(c => !chosen.includes(c)).sort((a, b) => {
    const red = (c: Candidate) => c.refs.filter(r => seenRefs.has(`${r.revisionId}:${r.page}:${r.start}`)).length;
    return (score(b) - red(b) * 5) - (score(a) - red(a) * 5) || a.id.localeCompare(b.id);
  });
  for (const c of rest) { if (chosen.length >= slots) break; take(c); count(c); }
  return {
    order: chosen,
    notExamined: ranked.filter(c => !chosen.includes(c)).map(c => ({ candidateId: c.id, revisionIds: revisionsOf(c), reason: "budget" })),
  };
}

export type RouteRecord = {
  candidateId: string;
  policyVersion: string;
  route: "direct" | "investigate" | "direct_escalated";
  reasons: RouteReason[];
  callsExecuted: number;
  /** Só contado quando a rota CONCLUIU (confirmed/rejected): não conclusão não é economia. */
  callsAvoided: number;
  savingsClaimed: boolean;
  finalDecision: string;
  escalationFailed: boolean;
  elapsedMs: number;
};

// ---------------------------------------------------------------- especialistas (P5.1)

export type Specialty = "identity" | "calculation" | "coherence";

/**
 * DESLIGADA por padrão. Um especialista por candidato, profundidade 1, sem
 * especialista chamando outro, sem paralelismo no mesmo caso; as chamadas saem
 * do limite do PAI (mesmo ledger). Modelo: o mesmo do pai, para isolar o efeito
 * da especialização.
 */
export type SpecialistPolicy = {
  enabled: boolean;
  maxPerCandidate: 1;
  /** Chamadas do especialista + 1 reservada para o pai concluir. */
  callsPerConsultation: number;
  minRemainingMicros: number;
  maxElapsedMs: number;
};
export const DEFAULT_SPECIALIST_POLICY: SpecialistPolicy = {
  enabled: false, maxPerCandidate: 1, callsPerConsultation: 2, minRemainingMicros: 50_000, maxElapsedMs: 600_000,
};

/** Estado VERIFICÁVEL da investigação, extraído do resultado e do ledger. Sem autoconfiança. */
export type SpecialistState = {
  kind: string | null;
  decision: "confirmed" | "rejected" | "inconclusive" | "operational_failure";
  unresolvedPremises: string[];
  unknownConditions: string[];
  relationBlockers: string[];
  leadsPending: number;
  anchoredSources: number;
  distinctRevisions: number;
  calculationExecuted: boolean;
  /** Divergência com razão "limpa" sem fator declarado que a explique (de `explainDivergence`). */
  unexplainedCleanRatio: boolean;
  contextMissing: boolean;
  specialistsUsed: number;
  remainingCalls: number;
  remainingMicros: number;
  elapsedMs: number;
};

export type SpecialistChoice =
  | { chosen: Specialty; question: string; reasons: string[] }
  | { chosen: null; reasons: string[] };

/**
 * Escolhe no máximo UM especialista, ou explica por que nenhum. O gatilho
 * precisa nomear uma questão não resolvida, as evidências já obtidas e o efeito
 * possível na decisão; "confiança baixa" não existe como entrada.
 */
export function selectSpecialist(s: SpecialistState, policy: SpecialistPolicy = DEFAULT_SPECIALIST_POLICY): SpecialistChoice {
  const no = (...reasons: string[]): SpecialistChoice => ({ chosen: null, reasons });
  if (!policy.enabled) return no("disabled");
  if (s.specialistsUsed >= policy.maxPerCandidate) return no("already_consulted");
  if (s.decision === "operational_failure") return no("operational_failure_is_not_a_specialist_question");
  if (s.decision !== "inconclusive") return no("decision_already_reached");
  if (s.contextMissing) return no("missing_context_needs_reading_not_specialist");
  if (s.remainingCalls < policy.callsPerConsultation) return no("insufficient_calls");
  if (s.remainingMicros < policy.minRemainingMicros) return no("insufficient_budget");
  if (s.elapsedMs > policy.maxElapsedMs) return no("time_limit");

  const open = [...s.unresolvedPremises, ...s.unknownConditions];
  const evidence = `${s.anchoredSources} fonte(s) ancorada(s) em ${s.distinctRevisions} revisão(ões)`;

  if (s.kind === "calculation") {
    if (!s.calculationExecuted) return no("run_calculate_tool_first");
    if (!s.unexplainedCleanRatio && !open.length) return no("no_open_question");
    return {
      chosen: "calculation", reasons: ["calculation_executed", s.unexplainedCleanRatio ? "clean_ratio_without_declared_factor" : "open_premise"],
      question: `A conta já foi executada pela ferramenta (${evidence}). Resta decidir: ${open.join("; ") || "se há fator, premissa ou aplicabilidade que explique a diferença"}. Isso decide entre confirmar e rejeitar.`,
    };
  }
  if (s.leadsPending > 0 || s.unknownConditions.length) {
    if (!s.anchoredSources) return no("no_evidence_collected");
    return {
      chosen: "coherence", reasons: [s.leadsPending ? "refutation_lead_pending" : "condition_unknown"],
      question: `Há ${s.leadsPending} exceção/ressalva pendente e ${s.unknownConditions.length} condição(ões) em aberto (${evidence}). Decidir se se aplicam ao caso: ${open.join("; ") || "exceção citada"}. A resposta pode rejeitar a suspeita.`,
    };
  }
  const identityBlock = s.relationBlockers.some(b => b === "ambiguous_entity" || b === "undeclared_revision_precedence");
  if ((s.kind === "identity" || s.kind === "comparison") && identityBlock) {
    if (s.distinctRevisions < 2 || s.anchoredSources < 2) return no("needs_two_conflicting_sources");
    return {
      chosen: "identity", reasons: ["conflicting_sources", ...s.relationBlockers.filter(b => b === "ambiguous_entity" || b === "undeclared_revision_precedence")],
      question: `Duas ou mais fontes conflitam (${evidence}), com ${s.relationBlockers.join(", ")}. Decidir se tratam da mesma entidade, versão e escopo: ${open.join("; ") || "identidade do objeto"}. Isso decide se há conflito.`,
    };
  }
  return no(open.length ? "open_question_outside_specialties" : "no_open_question");
}
