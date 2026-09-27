/**
 * Contrato PÚBLICO do motor no parecer — versionado e OPCIONAL, ao lado do
 * `AuditFinding` legado (nenhum campo antigo muda de nome ou sentido).
 *
 * - `toAuditFinding` é a conversão ÚNICA do resultado interno para o relatório:
 *   preenche os campos legados (arquivo, página, evidência, texto) para leitores
 *   antigos e anexa `motor` com o estado real;
 * - confirmado → achado principal; inconclusivo → questão em aberto, marcada;
 *   rejeitado → só rastro técnico, EXCETO achado de regra, que nunca é apagado:
 *   fica com a premissa contestada explícita, pedindo revisão;
 * - relatório antigo sem `motor` é lido como legado, com cobertura DESCONHECIDA;
 * - `motor` presente e inválido é erro controlado, nunca cast.
 *
 * Tipos puros e funções puras: o relatório é lido também no navegador.
 */
import type { CalculationRecord, Candidate, EvidenceRef, InvestigationResult, RefRole } from "./contracts.ts";
import type { CoverageReport } from "./coverage.ts";
import type { Lineage } from "./reuse.ts";

export const ENGINE_FINDING_VERSION = "engine-finding/1";
export const ENGINE_REPORT_VERSION = "engine-report/1";

export type EngineState = "confirmed" | "inconclusive" | "rejected" | "operational_failure";

export type EngineReference = {
  role: RefRole | "counter_lead";
  documentId: string;
  revisionId: string;
  fileName: string;
  page: number;
  start: number;
  end: number;
  quote: string;
  /**
   * A citação aparece UMA vez na página: só então o visor pode realçá-la por
   * busca de texto. Ausente = desconhecido = não realçar (nunca a primeira coincidência).
   */
  uniqueOnPage?: boolean;
};

export type EngineFindingV1 = {
  version: typeof ENGINE_FINDING_VERSION;
  state: EngineState;
  proposition: string;
  premises: Array<{ id: string; statement: string; status: "supported" | "refuted" | "unresolved" }>;
  references: EngineReference[];
  consequence: string | null;
  suggestedAction: string | null;
  /** O que ficou sem verificar: contexto faltante, travas acionadas, falha operacional. */
  limits: string[];
  contestedPremises: string[];
  origin: { kind: Candidate["origin"]["kind"]; ruleId: string | null };
  lineage: Pick<Lineage, "logicalId" | "occurrence" | "inheritedFrom"> | null;
  /** Contas executadas pela ferramenta, com operandos e fontes. Opcional (v1 sem contas continua válido). */
  calculations?: CalculationRecord[];
};

export type EngineReportV1 = {
  version: typeof ENGINE_REPORT_VERSION;
  runId: string;
  engineVersion: string;
  coverage: CoverageReport;
  counts: { confirmed: number; inconclusive: number; rejectedRules: number; operationalFailures: number };
};

/** Forma mínima do `AuditFinding` legado usada aqui (evita importar o módulo de UI). */
export type LegacyFinding = {
  id: string; arquivo?: string; prioridade: "Alta" | "Media/Alta" | "Media" | "Baixa/Media" | "Baixa"; pagina: string; capitulo: string;
  local: string; tipo: string; descricao: string; evidencia: string; conflito: string; sugestao_correcao: string;
  confianca: "alta" | "media" | "baixa"; origem?: "regra" | "ia" | "chat"; tier?: "principal" | "sugestao";
  referencia_comparada?: string; motor?: EngineFindingV1;
};

type PageText = (revisionId: string, page: number) => string | undefined;
function countIn(hay: string, needle: string) {
  let n = 0;
  for (let at = hay.indexOf(needle); at >= 0; at = hay.indexOf(needle, at + 1)) n++;
  return n;
}
const refOf = (r: EvidenceRef, role: EngineReference["role"], fileName: (revisionId: string) => string, pageText?: PageText): EngineReference => {
  const text = pageText?.(r.revisionId, r.page);
  return {
    role, documentId: r.documentId, revisionId: r.revisionId, fileName: fileName(r.revisionId), page: r.page, start: r.start, end: r.end, quote: r.quote,
    ...(text !== undefined ? { uniqueOnPage: countIn(text, r.quote) === 1 } : {}),
  };
};

/**
 * Resultado interno → achado do parecer. Devolve `null` para candidato de IA
 * rejeitado (fica no rastro técnico, fora da contagem). `severity` vem da matriz
 * de severidade do chamador: estado da investigação não é prioridade.
 */
const TIPO_LEGADO: Record<string, string> = {
  comparison: "Divergência de valor entre fontes",
  calculation: "Cálculo ou quantitativo que não fecha",
  identity: "Identidade do projeto divergente",
  reference: "Remissão sem alvo no escopo",
  interpretation: "Interpretação",
};

export function toAuditFinding(args: {
  id: string;
  candidate: Candidate;
  result: InvestigationResult;
  fileName: (revisionId: string) => string;
  severity: { prioridade: LegacyFinding["prioridade"]; consequence: string | null; action: string | null };
  leads?: EvidenceRef[];
  lineage?: Lineage | null;
  capitulo?: string;
  /** Texto canônico da página, para marcar se a citação é única (realce seguro). */
  pageText?: PageText;
}): LegacyFinding | null {
  const { candidate: c, result: r } = args;
  const isRule = c.origin.kind === "rule";
  const state: EngineState = r.kind === "decision" ? r.decision : "operational_failure";
  if (state === "rejected" && !isRule) return null;

  const proofRefs = r.kind === "decision" ? r.proof.refs.map(x => refOf(x.ref, x.role, args.fileName, args.pageText)) : [];
  // Sem prova (falha, ou inconclusivo sem citação): as fontes do candidato, como CONTEXTO — nunca como suporte inventado.
  const references = proofRefs.length ? proofRefs : c.refs.map(x => refOf(x, "context", args.fileName, args.pageText));
  for (const l of args.leads ?? []) {
    if (!references.some(x => x.revisionId === l.revisionId && x.page === l.page && x.start === l.start)) references.push(refOf(l, "counter_lead", args.fileName, args.pageText));
  }
  const premiseStatus = (id: string) => (r.kind === "decision" ? r.proof.premises.find(p => p.premiseId === id)?.status ?? "unresolved" : "unresolved");
  const contested = r.kind === "decision" ? r.proof.premises.filter(p => p.status === "refuted").map(p => p.premiseId) : [];
  const limits = r.kind === "decision" ? r.missingContext : [`falha operacional: ${r.reason}`];
  const motor: EngineFindingV1 = {
    version: ENGINE_FINDING_VERSION, state, proposition: r.kind === "decision" ? r.finalProposition : c.proposition,
    premises: c.premises.map(p => ({ id: p.id, statement: p.statement, status: premiseStatus(p.id) })),
    references, consequence: args.severity.consequence, suggestedAction: args.severity.action, limits, contestedPremises: contested,
    origin: { kind: c.origin.kind, ruleId: c.origin.kind === "rule" ? c.origin.ruleId : null },
    lineage: args.lineage ? { logicalId: args.lineage.logicalId, occurrence: args.lineage.occurrence, inheritedFrom: args.lineage.inheritedFrom } : null,
    ...(r.kind === "decision" && r.proof.calculations.length ? { calculations: r.proof.calculations } : {}),
  };

  // Campos legados: cada lado do conflito com o SEU arquivo.
  const main = references.find(x => x.role === "supports") ?? references[0];
  const other = references.find(x => x !== main && x.revisionId !== main?.revisionId && x.role !== "counter_lead");
  const pages = [...new Set(references.filter(x => x.revisionId === main?.revisionId && x.role !== "counter_lead").map(x => x.page))].sort((a, b) => a - b);
  const legacyState = state === "confirmed" ? "" : state === "inconclusive" ? "[Questão em aberto — não confirmada] " : state === "rejected" ? "[Regra com premissa contestada — revisar] " : "[Não investigado por falha] ";
  return {
    id: args.id,
    arquivo: main?.fileName,
    prioridade: args.severity.prioridade,
    pagina: pages.join(", "),
    capitulo: args.capitulo ?? "",
    local: "",
    // Rótulo em português: a tela mostra `tipo`, e a matriz de severidade e os filtros
    // leem o escopo por palavra ("identidade", "area"...). Com o `kind` cru em inglês,
    // divergência de identidade saía como Baixa.
    tipo: TIPO_LEGADO[c.kind ?? "interpretation"] ?? "Interpretação",
    descricao: `${legacyState}${motor.proposition}`,
    evidencia: references.filter(x => x.role !== "counter_lead").map(x => `${x.fileName} p.${x.page}: "${x.quote}"`).join(" | "),
    conflito: motor.proposition,
    sugestao_correcao: args.severity.action ?? "Revisar as fontes citadas.",
    // Integridade da prova verificada; adequação semântica não: nunca "alta" por padrão.
    confianca: state === "confirmed" ? "media" : "baixa",
    origem: isRule ? "regra" : "ia",
    tier: state === "confirmed" || isRule ? "principal" : "sugestao",
    ...(other ? { referencia_comparada: `${other.fileName} p.${other.page}` } : {}),
    motor,
  };
}

// ---------------------------------------------------------------- leitura tolerante

export type ReadResult<T> = { kind: "engine"; value: T } | { kind: "legacy" } | { kind: "invalid"; errors: string[] };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isStr = (v: unknown) => typeof v === "string";
const isNullableStr = (v: unknown) => v === null || typeof v === "string";
const isIndex = (v: unknown) => Number.isSafeInteger(v) && (v as number) >= 0;
const isFiniteNum = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const isRatio = (v: unknown) => v === null || (isFiniteNum(v) && (v as number) >= 0 && (v as number) <= 1);
const isIntArr = (v: unknown) => Array.isArray(v) && v.every(isIndex);
const COVERAGE_STATUS = ["empty", "not_started", "partial", "complete", "complete_with_inherited"];

/**
 * A forma INTEIRA que `avaliarEmissao`, a tela e a exportação leem. Checar só o
 * `status` deixava passar `{status: "complete"}` e a leitura de `revisions`
 * derrubava a tela — e um relatório corrompido podia parecer liberável.
 */
function validCoverage(c: unknown): boolean {
  if (!isObj(c) || !isStr(c.scope) || !COVERAGE_STATUS.includes(String(c.status)) || typeof c.synthesized !== "boolean") return false;
  if (!isRatio(c.pagesWithTextRatio) || !isRatio(c.completedRatio) || !Array.isArray(c.revisions)) return false;
  return c.revisions.every(r => isObj(r) && isStr(r.revisionId) &&
    ["pages", "plannedChars", "submittedChars", "completedChars", "inheritedChars", "failedOutstandingChars"].every(k => isIndex(r[k])) &&
    Array.isArray(r.failedReasons) && r.failedReasons.every(isStr) &&
    isIntArr(r.pagesWithoutText) && isIntArr(r.visualPending) && isIntArr(r.visualAssessed));
}

function validCalculation(c: unknown): boolean {
  return isObj(c) && isStr(c.expression) && isFiniteNum(c.result) && isNullableStr(c.unit) && isStr(c.rounding) &&
    Array.isArray(c.operands) && c.operands.every(o => isObj(o) && isStr(o.name) && isFiniteNum(o.value) && isNullableStr(o.unit) && isObj(o.source) &&
      ((o.source.kind === "ref" && isIndex(o.source.refIndex)) || (o.source.kind === "fact" && isStr(o.source.factId)) || (o.source.kind === "hypothesis" && isStr(o.source.note))));
}

export function parseEngineFinding(v: unknown): ReadResult<EngineFindingV1> {
  if (v === undefined || v === null) return { kind: "legacy" };
  if (!isObj(v)) return { kind: "invalid", errors: ["not_object"] };
  const e: string[] = [];
  if (v.version !== ENGINE_FINDING_VERSION) e.push("unknown_version");
  if (!["confirmed", "inconclusive", "rejected", "operational_failure"].includes(String(v.state))) e.push("invalid_state");
  if (!isStr(v.proposition) || !(v.proposition as string).trim()) e.push("invalid_proposition");
  if (!Array.isArray(v.premises) || !v.premises.every(p => isObj(p) && isStr(p.id) && isStr(p.statement) && ["supported", "refuted", "unresolved"].includes(String(p.status)))) e.push("invalid_premises");
  if (!Array.isArray(v.references) || !v.references.every(r => isObj(r) && isStr(r.documentId) && isStr(r.revisionId) && isStr(r.fileName) &&
    Number.isSafeInteger(r.page) && (r.page as number) >= 1 && isStr(r.quote) && ["supports", "refutes", "context", "counter_lead"].includes(String(r.role)) &&
    isIndex(r.start) && isIndex(r.end) && (r.start as number) <= (r.end as number))) e.push("invalid_references");
  if (!isNullableStr(v.consequence) || !isNullableStr(v.suggestedAction)) e.push("invalid_texts");
  if (!Array.isArray(v.limits) || !v.limits.every(isStr)) e.push("invalid_limits");
  if (!Array.isArray(v.contestedPremises) || !v.contestedPremises.every(isStr)) e.push("invalid_contested");
  if (!isObj(v.origin) || !["rule", "reading_pass", "relation", "derived", "legacy_finding"].includes(String(v.origin.kind)) || !isNullableStr(v.origin.ruleId)) e.push("invalid_origin");
  if (v.lineage !== null && !(isObj(v.lineage) && isStr(v.lineage.logicalId) && Number.isSafeInteger(v.lineage.occurrence) && (v.lineage.occurrence as number) >= 1 &&
    (v.lineage.inheritedFrom === null || (isObj(v.lineage.inheritedFrom) && isStr(v.lineage.inheritedFrom.runId) && Number.isSafeInteger(v.lineage.inheritedFrom.occurrence)))))
    e.push("invalid_lineage");
  if (v.calculations !== undefined && !(Array.isArray(v.calculations) && v.calculations.every(validCalculation))) e.push("invalid_calculations");
  if (v.state === "confirmed" && Array.isArray(v.references) && !v.references.some(r => isObj(r) && r.role === "supports")) e.push("confirmed_without_support");
  return e.length ? { kind: "invalid", errors: e } : { kind: "engine", value: v as unknown as EngineFindingV1 };
}

export function readEngineReport(report: unknown): ReadResult<EngineReportV1> & { coverage: "tracked" | "unknown" } {
  if (!isObj(report)) return { kind: "invalid", errors: ["not_object"], coverage: "unknown" };
  const m = report.motor;
  if (m === undefined || m === null) return { kind: "legacy", coverage: "unknown" };
  if (!isObj(m)) return { kind: "invalid", errors: ["motor_not_object"], coverage: "unknown" };
  const e: string[] = [];
  if (m.version !== ENGINE_REPORT_VERSION) e.push("unknown_version");
  if (!isStr(m.runId) || !isStr(m.engineVersion)) e.push("invalid_ids");
  if (!validCoverage(m.coverage)) e.push("invalid_coverage");
  const counts = m.counts;
  if (!isObj(counts) || !["confirmed", "inconclusive", "rejectedRules", "operationalFailures"].every(k => Number.isSafeInteger(counts[k]) && (counts[k] as number) >= 0)) e.push("invalid_counts");
  return e.length ? { kind: "invalid", errors: e, coverage: "unknown" } : { kind: "engine", value: m as unknown as EngineReportV1, coverage: "tracked" };
}

/**
 * Contagem pelo ESTADO real. Achado legado (sem `motor`) conta à parte: não se
 * sabe se foi confirmado por prova. Sugestão/inconclusivo nunca entra em
 * "confirmados"; `motor` inválido conta como inválido, não como confirmado.
 */
export function countByState(findings: ReadonlyArray<object>) {
  const out = { confirmed: 0, inconclusive: 0, rejectedRules: 0, operationalFailures: 0, legacy: 0, invalid: 0 };
  for (const f of findings) {
    const r = parseEngineFinding((f as { motor?: unknown }).motor);
    if (r.kind === "legacy") out.legacy++;
    else if (r.kind === "invalid") out.invalid++;
    else if (r.value.state === "confirmed") out.confirmed++;
    else if (r.value.state === "inconclusive") out.inconclusive++;
    else if (r.value.state === "rejected") out.rejectedRules++;
    else out.operationalFailures++;
  }
  return out;
}
