/**
 * Reauditoria por DEPENDÊNCIAS. Cada resultado guarda do que depende: os
 * trechos citados (inclusive exceções e pistas), o universo de documentos
 * quando a conclusão é negativa, o contexto do projeto, a versão do motor e os
 * resultados de que deriva. Herdar exige TODAS equivalentes.
 *
 * Diferente de `lib/audit-reuso.ts` (reuso atual por capítulo, que continua
 * valendo para a rota atual): aqui aritmética de página não prova nada. Um
 * trecho só é equivalente se a página de onde veio existe na revisão nova com
 * o MESMO conteúdo (hash), uma única vez — pode ter mudado de número. Nome de
 * arquivo e primeira página citada nunca bastam.
 *
 * Feedback não segue descrição parecida: só atravessa por herança (mesmo id
 * lógico, ocorrência nova). Resultado reanalisado deixa o feedback antigo em
 * `orphanedFeedback`, para gente decidir.
 */
import { sha256Hex, stableHash, type Candidate, type EvidenceRef, type Interval, type InvestigationResult, type RevisionText } from "./contracts.ts";
import { canonicalCandidate, type AccessScope } from "./version.ts";

export type Passage = Pick<EvidenceRef, "documentId" | "revisionId" | "page" | "start" | "end" | "pageTextHash" | "quote">;

export type Lineage = {
  logicalId: string;
  occurrence: number;
  inheritedFrom: { runId: string; occurrence: number } | null;
  legacyIds: string[];
  targetKeys: string[];
};

export type DependencyRecord = {
  resultId: string;
  runId: string;
  scope: AccessScope;
  engineVersion: string;
  contextDigest: string;
  passages: Passage[];
  /** Conclusão negativa ("não há X"): depende do conjunto de documentos examinado. */
  negativeUniverse: string[] | null;
  /**
   * Documentos lógicos examinados, para QUALQUER conclusão: um documento novo pode
   * explicar ou refutar também uma confirmação, e ele não está nas passagens antigas.
   */
  universe: string[];
  dependsOnResults: string[];
  lineage: Lineage;
  /** O candidato investigado: sem ele o resultado herdado não vira achado publicável. */
  candidate: Candidate;
  result: InvestigationResult;
};

/** Identidade lógica: o que se afirma e sobre quais documentos — não página nem id de execução. */
export function logicalId(c: Candidate): string {
  const k = canonicalCandidate(c);
  return `log-${stableHash({ kind: k.kind, proposition: k.proposition, documents: [...new Set(c.refs.map(r => r.documentId))].sort() }).slice(0, 16)}`;
}

const NEGATIVE = /não (?:há|existe|consta|localizad|foi encontrad)|ausência|ausente/iu;

export function dependenciesOf(args: {
  resultId: string; runId: string; scope: AccessScope; engineVersion: string; contextDigest: string;
  candidate: Candidate; result: InvestigationResult; corpus: RevisionText[]; leads?: EvidenceRef[];
  dependsOnResults?: string[]; legacyIds?: string[]; targetKeys?: string[];
}): DependencyRecord {
  const refs: EvidenceRef[] = [...args.candidate.refs, ...(args.leads ?? [])];
  if (args.result.kind === "decision") refs.push(...args.result.proof.refs.map(r => r.ref));
  const seen = new Set<string>();
  const passages: Passage[] = [];
  for (const r of refs) {
    const key = `${r.revisionId}:${r.page}:${r.start}:${r.end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    passages.push({ documentId: r.documentId, revisionId: r.revisionId, page: r.page, start: r.start, end: r.end, pageTextHash: r.pageTextHash, quote: r.quote });
  }
  const proposition = args.result.kind === "decision" ? args.result.finalProposition : args.candidate.proposition;
  const negative = args.candidate.kind === "reference" || NEGATIVE.test(proposition);
  return {
    resultId: args.resultId, runId: args.runId, scope: args.scope, engineVersion: args.engineVersion, contextDigest: args.contextDigest,
    passages, negativeUniverse: negative ? [...new Set(args.corpus.map(c => c.revision.documentId))].sort() : null,
    universe: [...new Set(args.corpus.map(c => c.revision.documentId))].sort(),
    dependsOnResults: [...(args.dependsOnResults ?? [])].sort(),
    lineage: { logicalId: logicalId(args.candidate), occurrence: 1, inheritedFrom: null, legacyIds: args.legacyIds ?? [], targetKeys: args.targetKeys ?? [] },
    candidate: args.candidate,
    result: args.result,
  };
}

// ---------------------------------------------------------------- delta do corpus

export type DocumentDelta = {
  documentId: string;
  status: "unchanged" | "changed" | "added" | "removed";
  oldRevisionId: string | null;
  newRevisionId: string | null;
  /** Páginas do antigo cujo conteúdo aparece UMA vez no novo: antiga → nova. */
  movedPages: Array<{ from: number; to: number }>;
  changedPages: number[];
  removedPages: number[];
  addedPages: number[];
};

const pageHashes = (rt: RevisionText) => rt.pages.map(t => sha256Hex(t));

/**
 * Delta por documento LÓGICO (não por nome). Mesmo conteúdo com nome novo é
 * `unchanged`; página inserida desloca as seguintes, que aparecem como
 * movidas, não alteradas.
 */
export function corpusDelta(oldCorpus: RevisionText[], newCorpus: RevisionText[]): DocumentDelta[] {
  const ids = [...new Set([...oldCorpus, ...newCorpus].map(c => c.revision.documentId))].sort();
  return ids.map(documentId => {
    const o = oldCorpus.find(c => c.revision.documentId === documentId);
    const n = newCorpus.find(c => c.revision.documentId === documentId);
    if (!o || !n) {
      return { documentId, status: o ? "removed" : "added", oldRevisionId: o?.revision.revisionId ?? null, newRevisionId: n?.revision.revisionId ?? null,
        movedPages: [], changedPages: [], removedPages: o ? o.pages.map((_, i) => i + 1) : [], addedPages: n ? n.pages.map((_, i) => i + 1) : [] };
    }
    const oh = pageHashes(o);
    const nh = pageHashes(n);
    const moved: Array<{ from: number; to: number }> = [];
    const matchedNew = new Set<number>();
    const removed: number[] = [];
    oh.forEach((h, i) => {
      const hits = nh.flatMap((x, j) => (x === h ? [j] : []));
      if (hits.length === 1) { moved.push({ from: i + 1, to: hits[0] + 1 }); matchedNew.add(hits[0]); } else removed.push(i + 1);
    });
    const added = nh.map((_, j) => j + 1).filter(p => !matchedNew.has(p - 1));
    const same = o.revision.bytesHash === n.revision.bytesHash || (removed.length === 0 && added.length === 0 && moved.every(m => m.from === m.to));
    return {
      documentId, status: same ? "unchanged" : "changed", oldRevisionId: o.revision.revisionId, newRevisionId: n.revision.revisionId,
      movedPages: moved, changedPages: removed.filter(p => added.includes(p)), removedPages: removed, addedPages: added,
    };
  });
}

// ---------------------------------------------------------------- plano de reuso

export type ReuseReason =
  | "scope_mismatch" | "engine_changed" | "context_changed" | "document_removed" | "passage_changed"
  | "passage_ambiguous" | "universe_changed" | "dependency_invalidated" | "legacy_without_dependencies"
  | "not_a_decision"
  /** Pista de refutação no corpus NOVO que não estava entre as dependências (exceção nova). */
  | "new_counterevidence";

export type ReuseDecision =
  | { resultId: string; action: "inherit"; remapped: Passage[]; lineage: Lineage }
  | { resultId: string; action: "reanalyze"; reasons: ReuseReason[]; orphanedFeedback: string[] };

/** Trecho equivalente na revisão nova: página de conteúdo idêntico, única, mesmos offsets. */
function remap<T extends Passage>(p: T, newCorpus: RevisionText[]): T | "removed" | "changed" | "ambiguous" {
  const n = newCorpus.find(c => c.revision.documentId === p.documentId);
  if (!n) return "removed";
  const hits = n.pages.flatMap((t, i) => (sha256Hex(t) === p.pageTextHash ? [i + 1] : []));
  if (hits.length === 0) return "changed";
  if (hits.length > 1) return "ambiguous";
  const text = n.pages[hits[0] - 1];
  if (text.slice(p.start, p.end) !== p.quote) return "changed";
  return { ...p, revisionId: n.revision.revisionId, page: hits[0] };
}

export function planReuse(args: {
  records: DependencyRecord[];
  newCorpus: RevisionText[];
  scope: AccessScope;
  engineVersion: string;
  contextDigest: string;
  runId: string;
  /** Pistas de refutação do candidato no contexto NOVO (relações refeitas sobre o corpus novo). */
  newLeads?: (candidate: Candidate) => EvidenceRef[];
}): { decisions: ReuseDecision[]; orphanedFeedback: string[] } {
  const sameScope = (s: AccessScope) =>
    s.organizationId === args.scope.organizationId && s.projectId === args.scope.projectId && (s.projectId !== null || s.auditId === args.scope.auditId);
  const universe = [...new Set(args.newCorpus.map(c => c.revision.documentId))].sort();
  const first = new Map<string, ReuseDecision>();

  for (const r of args.records) {
    const reasons = new Set<ReuseReason>();
    if (!sameScope(r.scope)) reasons.add("scope_mismatch");
    if (r.engineVersion !== args.engineVersion) reasons.add("engine_changed");
    if (r.contextDigest !== args.contextDigest) reasons.add("context_changed");
    if (r.result.kind !== "decision") reasons.add("not_a_decision");
    if (r.negativeUniverse && JSON.stringify(r.negativeUniverse) !== JSON.stringify(universe)) reasons.add("universe_changed");
    // Documento NOVO pode explicar ou refutar qualquer conclusão, positiva inclusive.
    // Conservador: não há como provar que ele é alheio sem reinvestigar.
    if (universe.some(d => !r.universe.includes(d))) reasons.add("universe_changed");
    if (args.newLeads) {
      const known = (e: EvidenceRef) => r.passages.some(p => p.documentId === e.documentId && p.pageTextHash === e.pageTextHash && p.start === e.start && p.end === e.end);
      if (args.newLeads(r.candidate).some(e => !known(e))) reasons.add("new_counterevidence");
    }
    const remapped: Passage[] = [];
    for (const p of r.passages) {
      const m = remap(p, args.newCorpus);
      if (m === "removed") reasons.add("document_removed");
      else if (m === "changed") reasons.add("passage_changed");
      else if (m === "ambiguous") reasons.add("passage_ambiguous");
      else remapped.push(m);
    }
    if (!reasons.size && !materializeInherited(r, args.newCorpus)) reasons.add("passage_changed");
    first.set(r.resultId, reasons.size
      ? { resultId: r.resultId, action: "reanalyze", reasons: [...reasons].sort(), orphanedFeedback: r.lineage.targetKeys }
      : { resultId: r.resultId, action: "inherit", remapped,
        lineage: { ...r.lineage, occurrence: r.lineage.occurrence + 1, inheritedFrom: { runId: r.runId, occurrence: r.lineage.occurrence } } });
  }

  // Invalidação transitiva: quem depende de algo reanalisado também é reanalisado.
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of args.records) {
      const d = first.get(r.resultId)!;
      if (d.action !== "inherit") continue;
      if (r.dependsOnResults.some(id => first.get(id)?.action === "reanalyze" || !first.has(id))) {
        first.set(r.resultId, { resultId: r.resultId, action: "reanalyze", reasons: ["dependency_invalidated"], orphanedFeedback: r.lineage.targetKeys });
        changed = true;
      }
    }
  }
  const decisions = args.records.map(r => first.get(r.resultId)!);
  return { decisions, orphanedFeedback: decisions.flatMap(d => (d.action === "reanalyze" ? d.orphanedFeedback : [])) };
}

/**
 * O resultado herdado na revisão NOVA: toda referência (candidato, prova,
 * derivado) remapeada pelo mesmo critério das passagens. Referência que não
 * remapeia = não herda (`null`) — nunca publicar citação apontando para a
 * revisão antiga.
 */
export function materializeInherited(r: DependencyRecord, newCorpus: RevisionText[]): { candidate: Candidate; result: InvestigationResult } | null {
  const move = (ref: EvidenceRef): EvidenceRef | null => {
    const m = remap(ref, newCorpus);
    return typeof m === "string" ? null : m;
  };
  const moveAll = (refs: EvidenceRef[]) => {
    const out = refs.map(move);
    return out.every((x): x is EvidenceRef => !!x) ? out : null;
  };
  const candRefs = moveAll(r.candidate.refs);
  if (!candRefs) return null;
  const candidate = { ...r.candidate, refs: candRefs };
  if (r.result.kind !== "decision") return { candidate, result: r.result };
  const proofRefs = r.result.proof.refs.map(e => ({ ...e, ref: move(e.ref) }));
  if (proofRefs.some(e => !e.ref)) return null;
  const derived = r.result.derivedCandidate;
  const derivedRefs = derived ? moveAll(derived.refs) : [];
  if (derived && !derivedRefs) return null;
  return {
    candidate,
    result: {
      ...r.result,
      proof: { ...r.result.proof, refs: proofRefs as typeof r.result.proof.refs },
      derivedCandidate: derived ? { ...derived, refs: derivedRefs! } : null,
    },
  };
}

/** Relatório antigo sem grafo de dependências: reanálise completa, com o motivo. */
export function planLegacyReuse(findingIds: string[], targetKeys: string[]): { decisions: ReuseDecision[]; orphanedFeedback: string[] } {
  return {
    decisions: findingIds.map(id => ({ resultId: id, action: "reanalyze" as const, reasons: ["legacy_without_dependencies" as const], orphanedFeedback: [] })),
    orphanedFeedback: targetKeys,
  };
}

/**
 * Cobertura herdada: intervalos concluídos antes cujas páginas reaparecem com o
 * mesmo conteúdo (única) na revisão nova. Vai para `recordInherited`, nunca
 * para `completed`. Página removida simplesmente não reaparece.
 */
export function inheritedIntervals(oldCompleted: Interval[], oldCorpus: RevisionText[], newCorpus: RevisionText[]): Interval[] {
  const out: Interval[] = [];
  for (const i of oldCompleted) {
    const o = oldCorpus.find(c => c.revision.revisionId === i.revisionId);
    const text = o?.pages[i.page - 1];
    if (!o || text === undefined) continue;
    const n = newCorpus.find(c => c.revision.documentId === o.revision.documentId);
    if (!n) continue;
    const h = sha256Hex(text);
    const hits = n.pages.flatMap((t, j) => (sha256Hex(t) === h ? [j + 1] : []));
    if (hits.length === 1) out.push({ revisionId: n.revision.revisionId, page: hits[0], start: i.start, end: i.end });
  }
  return out;
}
