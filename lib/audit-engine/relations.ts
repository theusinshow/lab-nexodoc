/**
 * Relações tipadas entre fatos e o contexto do projeto.
 *
 * Regra central: nada é resolvido por maioria, nome de arquivo ou ordem de
 * upload. Precedência entre revisões só existe quando DECLARADA (no documento ou
 * pelo usuário, via `DocumentRevision.supersedes`). Escopo desconhecido ou
 * diferente impede tratar dois fatos como o mesmo atributo da mesma entidade;
 * escopo parcial vira relação AMBÍGUA, que bloqueia confirmação automática.
 */
import { stableHash, type Fact, type RevisionText } from "./contracts.ts";
import { convert, unitInfo, type Dimension } from "./facts.ts";

export type EntityMatch = "same" | "ambiguous";
export type RevisionLink =
  | "same_revision"
  | "different_documents"
  /** Mesmo documento lógico, revisões sem precedência declarada entre si. */
  | "undeclared_revisions"
  | "superseded";

export type Relation =
  | {
      kind: "same_attribute"; id: string; factIds: [string, string]; entityMatch: EntityMatch;
      values: "equal" | "different"; revisionLink: RevisionLink;
    }
  | { kind: "identity_mentions"; id: string; attribute: string; factIds: string[]; values: string[] }
  | {
      kind: "reference"; id: string; factId: string; target: string;
      resolution: "resolved" | "unresolved" | "ambiguous"; targetFactIds: string[];
    }
  | {
      kind: "rule_exception"; id: string; exceptionFactId: string; target: string;
      resolution: "resolved" | "unresolved" | "ambiguous"; ruleFactIds: string[];
    }
  | { kind: "supersedes"; id: string; from: string; to: string; basis: "declared_in_document" | "user" }
  | {
      kind: "premise_calculation"; id: string; operation: "multiply"; inputs: [string, string];
      output: string; entityMatch: EntityMatch;
    };

export type ProjectContext = {
  facts: Fact[];
  relations: Relation[];
  /** IDs de relações com conflito ou ambiguidade não resolvidos. Não se escolhe lado. */
  openIssues: string[];
  /** Pares de relações não gerados por teto: silêncio aqui seria omissão invisível. */
  saturated: boolean;
};

const relId = (parts: unknown[]) => `rel-${stableHash(parts).slice(0, 16)}`;
/** Chaves que identificam a entidade. `clause` é onde está escrito, não de quem se fala. */
const ENTITY_KEYS = ["location", "system", "aggregate", "subject"] as const;

export type ScopeRelation = "same" | "ambiguous" | "different" | "unscoped";

/**
 * Relação de escopo entre dois fatos. Total contra parcela é sempre entidade
 * diferente. Chave presente nos dois com valores diferentes separa; chave em
 * só um lado é ambíguo; nenhuma chave em NENHUM lado é "sem escopo" — não há
 * informação para relacioná-los (no 117, 2.731 de 2.821 pares eram assim:
 * "espessura" de elementos diferentes).
 */
export function scopeRelation(a: Fact, b: Fact): ScopeRelation {
  if ((a.scope.aggregate === undefined) !== (b.scope.aggregate === undefined)) return "different";
  let shared = 0;
  let oneSided = false;
  for (const k of ENTITY_KEYS) {
    const x = a.scope[k];
    const y = b.scope[k];
    if (x !== undefined && y !== undefined) {
      if (x !== y) return "different";
      shared++;
    } else if (x !== undefined || y !== undefined) oneSided = true;
  }
  if (shared > 0 && !oneSided) return "same";
  return shared === 0 && !oneSided ? "unscoped" : "ambiguous";
}

/** Mesmo atributo da mesma entidade? `null` = não relacionar (diferente ou sem escopo). */
export function compareScope(a: Fact, b: Fact): EntityMatch | null {
  const r = scopeRelation(a, b);
  return r === "same" ? "same" : r === "ambiguous" ? "ambiguous" : null;
}

function revisionLink(a: Fact, b: Fact, corpus: RevisionText[]): RevisionLink {
  if (a.revisionId === b.revisionId) return "same_revision";
  const ra = corpus.find(c => c.revision.revisionId === a.revisionId)?.revision;
  const rb = corpus.find(c => c.revision.revisionId === b.revisionId)?.revision;
  if (!ra || !rb || ra.documentId !== rb.documentId) return "different_documents";
  if (ra.supersedes?.revisionId === rb.revisionId || rb.supersedes?.revisionId === ra.revisionId) return "superseded";
  return "undeclared_revisions";
}

const dimensionOf = (f: Fact): Dimension | null => (f.unit ? unitInfo(f.unit)?.dimension ?? null : null);
const baseValue = (f: Fact): number | null => {
  const info = f.unit ? unitInfo(f.unit) : null;
  return info && typeof f.normalized === "number" ? f.normalized * info.toBase : null;
};

/** Produtos dimensionais suportados. Só estes geram relação premissa → cálculo. */
const PRODUCTS: Array<[Dimension, Dimension, Dimension]> = [
  ["area", "power_density", "power"],
  ["count", "volume_per_person", "volume"],
];

export const MAX_RELATIONS = 5000;

export function buildProjectContext(corpus: RevisionText[], facts: Fact[]): ProjectContext {
  const relations: Relation[] = [];
  let saturated = false;
  const push = (r: Relation) => { if (relations.length >= MAX_RELATIONS) saturated = true; else relations.push(r); };
  const usable = facts.filter(f => !f.conditions.includes("atributo não identificado"));

  // Mesmo atributo, mesma dimensão, escopo compatível.
  const quantitative = usable.filter(f => dimensionOf(f) && typeof f.normalized === "number" && f.attribute);
  for (let i = 0; i < quantitative.length; i++) for (let j = i + 1; j < quantitative.length; j++) {
    const a = quantitative[i];
    const b = quantitative[j];
    if (a.attribute !== b.attribute || dimensionOf(a) !== dimensionOf(b)) continue;
    const match = compareScope(a, b);
    if (!match) continue;
    const va = baseValue(a)!;
    const vb = baseValue(b)!;
    const equal = Math.abs(va - vb) <= 1e-9 * Math.max(1, Math.abs(va), Math.abs(vb));
    push({
      kind: "same_attribute", id: relId(["same", a.id, b.id]), factIds: [a.id, b.id], entityMatch: match,
      values: equal ? "equal" : "different", revisionLink: revisionLink(a, b, corpus),
    });
  }

  // Identidade: todas as menções de cada campo, com todos os valores. Sem moda.
  // Revisão substituída por declaração não disputa identidade com a vigente, e o
  // rótulo de revisão só se compara DENTRO da mesma revisão: documentos e
  // revisões diferentes declaram, naturalmente, revisões diferentes.
  const superseded = new Set(corpus.map(c => c.revision.supersedes?.revisionId).filter((x): x is string => !!x));
  const identity = new Map<string, { attribute: string; group: Fact[] }>();
  for (const f of facts.filter(f => f.attribute.startsWith("identidade.") && !superseded.has(f.revisionId) && !f.conditions.includes("captura duvidosa"))) {
    const key = f.attribute === "identidade.revisao" ? `${f.attribute}\u0000${f.revisionId}` : f.attribute;
    const entry = identity.get(key) ?? { attribute: f.attribute, group: [] };
    entry.group.push(f);
    identity.set(key, entry);
  }
  for (const { attribute, group } of identity.values()) {
    push({
      kind: "identity_mentions", id: relId(["identity", attribute, group.map(f => f.id)]), attribute,
      factIds: group.map(f => f.id), values: [...new Set(group.map(f => String(f.normalized)))].sort(),
    });
  }

  // Remissão e exceção → alvo pela cláusula rotulada, em todo o corpus autorizado.
  const labelled = facts.filter(f => f.scope.clause);
  for (const f of facts.filter(f => f.attribute === "remissao" || f.attribute === "excecao_a")) {
    const target = String(f.normalized);
    const hits = labelled.filter(t => t.scope.clause === target && t.revisionId === f.revisionId);
    const pool = hits.length ? hits : labelled.filter(t => t.scope.clause === target);
    const resolution = pool.length === 0 ? "unresolved" : new Set(pool.map(t => `${t.revisionId}:${t.refs[0].page}`)).size > 1 ? "ambiguous" : "resolved";
    const ids = pool.map(t => t.id);
    if (f.attribute === "remissao") {
      push({ kind: "reference", id: relId(["ref", f.id]), factId: f.id, target, resolution, targetFactIds: ids });
    } else {
      push({ kind: "rule_exception", id: relId(["exc", f.id]), exceptionFactId: f.id, target, resolution, ruleFactIds: ids });
    }
  }

  // Precedência: só declarada.
  for (const { revision } of corpus) {
    if (revision.supersedes) {
      push({ kind: "supersedes", id: relId(["sup", revision.revisionId]), from: revision.revisionId, to: revision.supersedes.revisionId, basis: revision.supersedes.basis });
    }
  }

  // Premissa → cálculo: a × b vs c, com escopos que não se contradizem.
  for (const [da, db, dc] of PRODUCTS) {
    const byDim = (d: Dimension) => quantitative.filter(f => dimensionOf(f) === d);
    for (const a of byDim(da)) for (const b of byDim(db)) for (const c of byDim(dc)) {
      const rels = [scopeRelation(a, b), scopeRelation(a, c), scopeRelation(b, c)];
      if (rels.includes("different")) continue;
      // Sem escopo, só a proximidade relaciona: os três na MESMA página da mesma revisão.
      const samePage = new Set([a, b, c].map(f => `${f.revisionId}:${f.refs[0]?.page}`)).size === 1;
      if (rels.includes("unscoped") && !samePage) continue;
      const pairs = rels.map(r => (r === "same" ? "same" : "ambiguous"));
      if (new Set([a.revisionId, b.revisionId, c.revisionId]).size > 1 &&
        revisionLink(a, c, corpus) === "superseded") continue;
      push({
        kind: "premise_calculation", id: relId(["calc", a.id, b.id, c.id]), operation: "multiply",
        inputs: [a.id, b.id], output: c.id, entityMatch: pairs.every(p => p === "same") ? "same" : "ambiguous",
      });
    }
  }

  const openIssues = relations.filter(r =>
    (r.kind === "same_attribute" && (r.values === "different" || r.entityMatch === "ambiguous") && r.revisionLink !== "superseded") ||
    (r.kind === "identity_mentions" && r.values.length > 1) ||
    ((r.kind === "reference" || r.kind === "rule_exception") && r.resolution !== "resolved") ||
    (r.kind === "premise_calculation" && r.entityMatch === "ambiguous"),
  ).map(r => r.id);

  return { facts, relations, openIssues, saturated };
}

export type ConfirmationBlocker =
  | "ambiguous_entity"
  | "example_context"
  | "superseded_revision"
  | "undeclared_revision_precedence"
  | "values_equal"
  | "unresolved_target"
  | "ambiguous_target"
  | "not_a_conflict_relation";

/**
 * Por que esta relação NÃO pode virar conflito confirmado automaticamente.
 * Lista vazia não é confirmação: só significa que a relação pode seguir para
 * investigação com as premissas explícitas.
 */
export function confirmationBlockers(r: Relation, ctx: ProjectContext): ConfirmationBlocker[] {
  const fact = (id: string) => ctx.facts.find(f => f.id === id);
  const out: ConfirmationBlocker[] = [];
  const example = (ids: string[]) => ids.some(id => fact(id)?.conditions.includes("citado como exemplo"));
  if (r.kind === "same_attribute") {
    if (r.entityMatch === "ambiguous") out.push("ambiguous_entity");
    if (r.values === "equal") out.push("values_equal");
    if (r.revisionLink === "superseded") out.push("superseded_revision");
    if (r.revisionLink === "undeclared_revisions") out.push("undeclared_revision_precedence");
    if (example(r.factIds)) out.push("example_context");
  } else if (r.kind === "identity_mentions") {
    if (r.values.length < 2) out.push("values_equal");
    const nonExample = r.factIds.filter(id => !fact(id)?.conditions.includes("citado como exemplo"));
    if (new Set(nonExample.map(id => String(fact(id)?.normalized))).size < 2 && r.values.length > 1) out.push("example_context");
  } else if (r.kind === "reference" || r.kind === "rule_exception") {
    if (r.resolution === "unresolved") out.push("unresolved_target");
    if (r.resolution === "ambiguous") out.push("ambiguous_target");
  } else if (r.kind === "premise_calculation") {
    if (r.entityMatch === "ambiguous") out.push("ambiguous_entity");
    if (example([...r.inputs, r.output])) out.push("example_context");
  } else out.push("not_a_conflict_relation");
  return out;
}

/** Valor do produto a × b na unidade de c, para a relação premissa → cálculo. */
export function expectedProduct(r: Extract<Relation, { kind: "premise_calculation" }>, facts: Fact[]): number | null {
  const [a, b, c] = [...r.inputs, r.output].map(id => facts.find(f => f.id === id));
  if (!a || !b || !c || typeof a.normalized !== "number" || typeof b.normalized !== "number" || !c.unit) return null;
  const va = baseValue(a);
  const vb = baseValue(b);
  if (va === null || vb === null) return null;
  const baseUnit = { power: "W", volume: "m³" }[dimensionOf(c) as "power" | "volume"];
  return baseUnit ? convert(va * vb, baseUnit, c.unit) : null;
}

/** Fatos que uma relação envolve, qualquer que seja o tipo. */
export function relationFactIds(r: Relation): string[] {
  switch (r.kind) {
    case "same_attribute": return [...r.factIds];
    case "identity_mentions": return [...r.factIds];
    case "reference": return [r.factId, ...r.targetFactIds];
    case "rule_exception": return [r.exceptionFactId, ...r.ruleFactIds];
    case "premise_calculation": return [...r.inputs, r.output];
    case "supersedes": return [];
  }
}
