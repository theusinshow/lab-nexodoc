/**
 * Contratos do núcleo de investigação do Audit (etapa 3 do plano em
 * docs/auditoria/execucao-claude-code/). Tipos e funções puras: sem Prisma, sem
 * HTTP, sem provedor. Ainda NÃO é importado pela rota de produção.
 *
 * Tudo que chega de modelo, ferramenta ou JSON persistido é entrada não
 * confiável: passa por `parse*` antes de virar tipo. Os validadores devolvem
 * motivos enumerados, não mensagens livres, para que o teste e o relatório
 * possam contar falhas por tipo.
 *
 * Offsets: índices UTF-16 de string JavaScript (`String.prototype.slice`) sobre
 * o texto canônico da página, de ponta a ponta. Nunca bytes nem code points.
 * Página: física, 1-based. Número impresso é só rótulo.
 */
import { createHash } from "node:crypto";

export const ENGINE_CONTRACT_VERSION = "audit-engine/1";
export const OFFSET_UNIT = "utf16" as const;

// ---------------------------------------------------------------- serialização

/**
 * JSON com chaves ordenadas, para tudo que participa de hash. Recusa o que o
 * `JSON.stringify` esconderia calado: NaN e infinito viram `null`, `undefined`
 * em array vira `null`, Date vira string dependente de fuso.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(stabilize(value, "$"));
}

function stabilize(value: unknown, path: string): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`non_finite_number:${path}`);
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) {
    return value.map((item, i) => {
      if (item === undefined) throw new Error(`undefined_in_array:${path}[${i}]`);
      return stabilize(item, `${path}[${i}]`);
    });
  }
  if (typeof value === "object") {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw new Error(`non_plain_object:${path}`);
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as object).sort()) {
      const item = (value as Record<string, unknown>)[key];
      if (item === undefined) continue;
      out[key] = stabilize(item, `${path}.${key}`);
    }
    return out;
  }
  throw new Error(`unsupported_type:${typeof value}:${path}`);
}

export const sha256Hex = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");
export const stableHash = (value: unknown) => sha256Hex(stableStringify(value));

// ---------------------------------------------------------------- documento

/**
 * Uma revisão imutável de um documento. Nome de arquivo não é identidade: dois
 * uploads chamados `memorial.pdf` são revisões distintas se os bytes diferem.
 * `supersedes` só existe quando a relação foi declarada no documento ou pelo
 * usuário — nunca inferida por data de upload ou nome.
 */
export type DocumentRevision = {
  documentId: string;
  revisionId: string;
  bytesHash: string;
  extractionHash: string;
  extractorVersion: string;
  displayName: string;
  declaredType: string | null;
  pageCount: number;
  supersedes: { revisionId: string; basis: "declared_in_document" | "user" } | null;
  authority: string | null;
  discipline: string | null;
  effectiveDate: string | null;
};

/** Texto canônico por página física: `pages[0]` é a página 1. */
export type RevisionText = { revision: DocumentRevision; pages: string[] };

export type TableCellRef = { tableId: string; row: number; column: number; headers: string[] };

export type EvidenceRef = {
  documentId: string;
  revisionId: string;
  page: number;
  start: number;
  end: number;
  quote: string;
  /** sha256 do texto canônico inteiro da página em que os offsets valem. */
  pageTextHash: string;
  printedPageLabel: string | null;
  table: TableCellRef | null;
};

// ---------------------------------------------------------------- cobertura

export type Interval = { revisionId: string; page: number; start: number; end: number };
export type FailedInterval = Interval & {
  reason: "truncated" | "call_failed" | "cancelled" | "budget_exhausted" | "output_limit";
};
export type PageRef = { revisionId: string; page: number };

/**
 * Estados separados de propósito: extraído ≠ submetido ≠ concluído. Falha de
 * chamada não promove texto submetido a concluído, e visual é dimensão própria —
 * página transcrita não é desenho auditado. Herdado de reuso fica à parte.
 */
export type Coverage = {
  scope: string;
  /** Páginas físicas no escopo, inclusive as sem texto (que não geram intervalo). */
  pages: PageRef[];
  planned: Interval[];
  extracted: Interval[];
  submitted: Interval[];
  completed: Interval[];
  failed: FailedInterval[];
  synthesized: boolean;
  visual: { assessed: PageRef[]; requiredNotAssessed: PageRef[] };
  inherited: Interval[];
};

/** Relatório antigo não traz cobertura rastreada: é desconhecida, não completa. */
export type CoverageState =
  | { kind: "tracked"; coverage: Coverage }
  | { kind: "unknown"; reason: "legacy_report" | "not_recorded" };

// ---------------------------------------------------------------- fato e candidato

export type Fact = {
  id: string;
  entity: string;
  attribute: string;
  literal: string;
  normalized: number | string | null;
  /** Como o literal virou `normalized` quando havia leitura alternativa (ex.: "1.800"). */
  normalizationNote: string | null;
  unit: string | null;
  /** Ambiente, sistema, disciplina, fase, equipamento... Chave ausente = desconhecida. */
  scope: Record<string, string>;
  conditions: string[];
  revisionId: string;
  basis: "explicit" | "inferred";
  refs: EvidenceRef[];
};

export type Premise = { id: string; statement: string };

export type CandidateOrigin =
  | { kind: "rule"; ruleId: string }
  | { kind: "reading_pass"; pass: string }
  | { kind: "relation"; relationId: string }
  | { kind: "derived"; parentCandidateId: string }
  | { kind: "legacy_finding"; findingId: string };

export type CandidateKind = "comparison" | "calculation" | "identity" | "reference" | "interpretation";

/** Suspeita verificável. Não é achado confirmado. */
export type Candidate = {
  id: string;
  /** Opcional: suspeita da leitura pode não saber classificar. Cálculo exige a ferramenta. */
  kind?: CandidateKind;
  proposition: string;
  origin: CandidateOrigin;
  factIds: string[];
  refs: EvidenceRef[];
  premises: Premise[];
  claimScope: string;
  counterEvidenceToSeek: string[];
};

// ---------------------------------------------------------------- prova e resultado

export type RefRole = "supports" | "refutes" | "context";
export type RefIntegrity = "anchored" | "not_found" | "ambiguous" | "revision_unknown" | "unchecked";

export type CalculationRecord = {
  expression: string;
  operands: Array<{
    name: string;
    value: number;
    unit: string | null;
    source: { kind: "ref"; refIndex: number } | { kind: "fact"; factId: string } | { kind: "hypothesis"; note: string };
  }>;
  result: number;
  unit: string | null;
  rounding: string;
};

/**
 * Duas citações não são duas premissas comprovadas: cada referência declara o
 * papel e quais premissas toca, e cada premissa tem estado próprio.
 */
export type ProofBundle = {
  premises: Array<{ premiseId: string; status: "supported" | "refuted" | "unresolved" }>;
  refs: Array<{ ref: EvidenceRef; role: RefRole; premiseIds: string[]; integrity: RefIntegrity }>;
  conditions: Array<{ description: string; resolution: "satisfied" | "not_satisfied" | "unknown"; refIndexes: number[] }>;
  calculations: CalculationRecord[];
};

export type OperationalFailureReason =
  | "tool_error"
  | "provider_error"
  | "invalid_response"
  | "refused"
  | "output_limit"
  | "budget_exhausted"
  | "cancelled"
  /** O ledger recusou uma transição (envio/acerto/incerto/liberação): não se finge que ocorreu. */
  | "ledger_error";

export type TraceOp = { op: string; detail: string };

/**
 * Discriminado: falha operacional NÃO é decisão inconclusiva. Inconclusivo é
 * uma conclusão sobre o mérito ("faltou o memorial de cálculo"); falha é "não
 * consegui examinar". O relatório conta os dois de formas diferentes.
 */
export type InvestigationResult = {
  contractVersion: typeof ENGINE_CONTRACT_VERSION;
  candidateId: string;
  coverage: Coverage;
  trace: TraceOp[];
} & (
  | {
      kind: "decision";
      decision: "confirmed" | "rejected" | "inconclusive";
      finalProposition: string;
      /** Preenchido quando a proposição final mudou: a confirmação é do derivado. */
      derivedCandidate: Candidate | null;
      proof: ProofBundle;
      missingContext: string[];
      summary: string;
    }
  | { kind: "operational_failure"; reason: OperationalFailureReason; detail: string }
);

// ---------------------------------------------------------------- validação

export type Parsed<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const isNonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isNullableString = (v: unknown) => v === null || typeof v === "string";
const isIndex = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const isPage = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 1;
const HEX64 = /^[0-9a-f]{64}$/;

export function parseDocumentRevision(v: unknown): Parsed<DocumentRevision> {
  const errors: string[] = [];
  if (!isRecord(v)) return { ok: false, errors: ["not_object"] };
  for (const key of ["documentId", "revisionId", "extractorVersion", "displayName"]) {
    if (!isNonEmpty(v[key])) errors.push(`invalid_${key}`);
  }
  for (const key of ["bytesHash", "extractionHash"]) {
    if (typeof v[key] !== "string" || !HEX64.test(v[key] as string)) errors.push(`invalid_${key}`);
  }
  if (!Number.isSafeInteger(v.pageCount) || (v.pageCount as number) < 0) errors.push("invalid_pageCount");
  for (const key of ["declaredType", "authority", "discipline", "effectiveDate"]) {
    if (!isNullableString(v[key])) errors.push(`invalid_${key}`);
  }
  const s = v.supersedes;
  if (s !== null && !(isRecord(s) && isNonEmpty(s.revisionId) &&
    (s.basis === "declared_in_document" || s.basis === "user") && s.revisionId !== v.revisionId)) {
    errors.push("invalid_supersedes");
  }
  return errors.length ? { ok: false, errors } : { ok: true, value: v as unknown as DocumentRevision };
}

export function parseEvidenceRef(v: unknown): Parsed<EvidenceRef> {
  const errors: string[] = [];
  if (!isRecord(v)) return { ok: false, errors: ["not_object"] };
  if (!isNonEmpty(v.documentId)) errors.push("missing_document");
  if (!isNonEmpty(v.revisionId)) errors.push("missing_revision");
  if (!isPage(v.page)) errors.push("invalid_page");
  if (!isIndex(v.start) || !isIndex(v.end) || (v.end as number) <= (v.start as number)) errors.push("invalid_offsets");
  if (!isNonEmpty(v.quote)) errors.push("empty_quote");
  else if (isIndex(v.start) && isIndex(v.end) && v.quote.length !== (v.end as number) - (v.start as number)) {
    errors.push("quote_length_mismatch");
  }
  if (typeof v.pageTextHash !== "string" || !HEX64.test(v.pageTextHash)) errors.push("invalid_pageTextHash");
  if (!isNullableString(v.printedPageLabel)) errors.push("invalid_printedPageLabel");
  const t = v.table;
  if (t !== null && !(isRecord(t) && isNonEmpty(t.tableId) && isIndex(t.row) && isIndex(t.column) &&
    Array.isArray(t.headers) && t.headers.every(h => typeof h === "string"))) {
    errors.push("invalid_table");
  }
  return errors.length ? { ok: false, errors } : { ok: true, value: v as unknown as EvidenceRef };
}

export type RefCheck =
  | "ok"
  | "revision_unknown"
  | "document_mismatch"
  | "page_out_of_range"
  | "offsets_out_of_range"
  | "page_text_hash_mismatch"
  | "quote_mismatch";

/**
 * Verificação literal contra o texto da revisão citada. Sem normalização aqui:
 * busca normalizada (P3.2) acha candidatos e devolve offsets; a prova guardada
 * é o trecho exato. Nunca procura a citação em outra página ou revisão.
 */
export function verifyRef(ref: EvidenceRef, corpus: RevisionText[]): RefCheck {
  const entry = corpus.find(c => c.revision.revisionId === ref.revisionId);
  if (!entry) return "revision_unknown";
  if (entry.revision.documentId !== ref.documentId) return "document_mismatch";
  if (ref.page > entry.revision.pageCount || ref.page > entry.pages.length) return "page_out_of_range";
  const text = entry.pages[ref.page - 1];
  if (sha256Hex(text) !== ref.pageTextHash) return "page_text_hash_mismatch";
  if (ref.end > text.length) return "offsets_out_of_range";
  return text.slice(ref.start, ref.end) === ref.quote ? "ok" : "quote_mismatch";
}

export type AdmissionError =
  | "not_a_decision"
  | "invalid_ref"
  | `ref_${Exclude<RefCheck, "ok">}`
  | "integrity_not_anchored"
  | "no_premises"
  | "premise_not_supported"
  | "premise_without_anchored_support"
  | "unknown_premise_in_ref"
  | "condition_unresolved"
  | "calculation_ref_invalid"
  | "proposition_changed_without_derivation"
  | "derived_candidate_not_linked"
  | "empty_summary";

/**
 * Regra de admissão: o que precisa valer para um `confirmed` entrar no
 * parecer. Rejeitado/inconclusivo não passam por aqui — não afirmam problema.
 *
 * Isto verifica integridade (o texto existe, na revisão e página citadas, e
 * cada premissa tem suporte ancorado). Não verifica adequação semântica: isso
 * é revisão do investigador e avaliação humana, não prova formal.
 */
export function admitConfirmed(
  result: InvestigationResult,
  candidate: Candidate,
  corpus: RevisionText[],
): { admitted: boolean; errors: AdmissionError[] } {
  if (result.kind !== "decision" || result.decision !== "confirmed") {
    return { admitted: false, errors: ["not_a_decision"] };
  }
  const errors = new Set<AdmissionError>();
  const target = result.derivedCandidate ?? candidate;
  if (result.derivedCandidate) {
    const o = result.derivedCandidate.origin;
    if (o.kind !== "derived" || o.parentCandidateId !== candidate.id) errors.add("derived_candidate_not_linked");
  } else if (result.finalProposition.trim() !== candidate.proposition.trim()) {
    errors.add("proposition_changed_without_derivation");
  }
  if (!result.summary.trim()) errors.add("empty_summary");

  const premiseIds = new Set(target.premises.map(p => p.id));
  if (!premiseIds.size) errors.add("no_premises");
  const anchoredSupport = new Map<string, number>();
  result.proof.refs.forEach(entry => {
    const parsed = parseEvidenceRef(entry.ref);
    if (!parsed.ok) { errors.add("invalid_ref"); return; }
    const check = verifyRef(entry.ref, corpus);
    if (check !== "ok") { errors.add(`ref_${check}`); return; }
    if (entry.premiseIds.some(id => !premiseIds.has(id))) errors.add("unknown_premise_in_ref");
    if (entry.role !== "supports") return;
    if (entry.integrity !== "anchored") { errors.add("integrity_not_anchored"); return; }
    for (const id of entry.premiseIds) anchoredSupport.set(id, (anchoredSupport.get(id) ?? 0) + 1);
  });
  for (const id of premiseIds) {
    const state = result.proof.premises.find(p => p.premiseId === id)?.status;
    if (state !== "supported") errors.add("premise_not_supported");
    if (!anchoredSupport.get(id)) errors.add("premise_without_anchored_support");
  }
  if (result.proof.conditions.some(c => c.resolution === "unknown")) errors.add("condition_unresolved");
  for (const calc of result.proof.calculations) {
    for (const op of calc.operands) {
      if (op.source.kind === "ref" && !result.proof.refs[op.source.refIndex]) errors.add("calculation_ref_invalid");
    }
  }
  return { admitted: errors.size === 0, errors: [...errors] };
}

/**
 * Leitura de relatório gravado antes deste contrato. O campo versionado de
 * cobertura entra no relatório em P6.5; até lá todo relatório é legado e a
 * cobertura é desconhecida — mesmo com `status_analise: "concluida"`.
 */
export function coverageOfLegacyReport(report: { status_analise?: string }): CoverageState {
  void report;
  return { kind: "unknown", reason: "legacy_report" };
}
