/**
 * Contrato público do parecer (P6.1). Sem rede, sem banco.
 *
 *   node --import ./scripts/lib/resolver-de-imports.mjs scripts/test-audit-engine-report.ts
 */
import assert from "node:assert/strict";
import { ENGINE_CONTRACT_VERSION, type Candidate, type EvidenceRef, type InvestigationResult } from "../lib/audit-engine/contracts.ts";
import { coverageReport, planCoverage } from "../lib/audit-engine/coverage.ts";
import {
  countByState, ENGINE_REPORT_VERSION, parseEngineFinding, readEngineReport, toAuditFinding, type EngineReportV1,
} from "../lib/audit-engine/report-contract.ts";
import { classifyFindingErrorType, classifyFindingImpact, getEmissionVerdict, type AuditFinding } from "../lib/audit-report.ts";
import { refFor, revision } from "./audit-engine-fixtures/index.ts";

let passed = 0;
async function test(name: string, fn: () => unknown) { await fn(); passed++; console.log(`OK ${name}`); }

const MEM = revision("memorial", "memorial.pdf", ["Capa.", "x", "Reservatório inferior com volume útil de 12.000 L."]);
const ESP = revision("espec", "especificacao.pdf", ["Capa.", "y", "Reservatório inferior com volume útil de 15.000 L."]);
const names: Record<string, string> = { [MEM.revision.revisionId]: "memorial.pdf", [ESP.revision.revisionId]: "especificacao.pdf" };
const fileName = (id: string) => names[id] ?? "desconhecido.pdf";
const a = refFor(MEM, 3, "volume útil de 12.000 L");
const b = refFor(ESP, 3, "volume útil de 15.000 L");
const cand = (over: Partial<Candidate> = {}): Candidate => ({
  id: "c1", kind: "comparison", proposition: "Volumes divergentes entre memorial e especificação.", origin: { kind: "relation", relationId: "r1" },
  factIds: [], refs: [a, b], premises: [{ id: "p1", statement: "memorial declara 12.000 L" }, { id: "p2", statement: "especificação declara 15.000 L" }],
  claimScope: "", counterEvidenceToSeek: [], ...over,
});
const cov = { scope: "t", pages: [], planned: [], extracted: [], submitted: [], completed: [], failed: [], synthesized: false, visual: { assessed: [], requiredNotAssessed: [] }, inherited: [] };
const result = (decision: "confirmed" | "rejected" | "inconclusive", refs: Array<[EvidenceRef, "supports" | "refutes" | "context"]> = [[a, "supports"], [b, "supports"]], premises = ["supported", "supported"]): InvestigationResult => ({
  contractVersion: ENGINE_CONTRACT_VERSION, candidateId: "c1", coverage: cov, trace: [], kind: "decision", decision,
  finalProposition: "Volumes divergentes entre memorial e especificação.", derivedCandidate: null, missingContext: decision === "inconclusive" ? ["vigência"] : [], summary: "s",
  proof: { premises: premises.map((status, i) => ({ premiseId: `p${i + 1}`, status: status as "supported" })), refs: refs.map(([ref, role]) => ({ ref, role, premiseIds: [], integrity: "anchored" as const })), conditions: [], calculations: [] },
});
const sev = { prioridade: "Alta" as const, consequence: "Reservatório pode ser executado com volume errado.", action: "Unificar o volume nos dois documentos." };

await test("relatório antigo continua legível: legado, cobertura desconhecida, veredito atual funciona", () => {
  const legacy = { status_analise: "concluida", incongruencias: [{ id: "INC-1", prioridade: "Alta", pagina: "3", capitulo: "", local: "", tipo: "t", descricao: "d", evidencia: "e", conflito: "c", sugestao_correcao: "s", confianca: "alta" }] };
  assert.deepEqual(readEngineReport(legacy), { kind: "legacy", coverage: "unknown" });
  assert.deepEqual(countByState(legacy.incongruencias), { confirmed: 0, inconclusive: 0, rejectedRules: 0, operationalFailures: 0, legacy: 1, invalid: 0 });
  assert.doesNotThrow(() => getEmissionVerdict(legacy.incongruencias as AuditFinding[]));
});

await test("novo completo: confirmado é principal, com cada lado no seu arquivo mesmo em páginas iguais", () => {
  const f = toAuditFinding({ id: "E-1", candidate: cand(), result: result("confirmed"), fileName, severity: sev })!;
  assert.equal(f.tier, "principal");
  assert.equal(f.confianca, "media", "prova íntegra não é adequação semântica: nunca 'alta' por padrão");
  assert.equal(f.arquivo, "memorial.pdf");
  assert.equal(f.pagina, "3");
  assert.equal(f.referencia_comparada, "especificacao.pdf p.3");
  assert.match(f.evidencia, /memorial\.pdf p\.3: "volume útil de 12\.000 L" \| especificacao\.pdf p\.3: "volume útil de 15\.000 L"/);
  assert.equal(parseEngineFinding(f.motor).kind, "engine");
  assert.deepEqual(f.motor!.references.map(r => [r.fileName, r.page, r.role]), [["memorial.pdf", 3, "supports"], ["especificacao.pdf", 3, "supports"]]);
  assert.doesNotThrow(() => getEmissionVerdict([f as AuditFinding]));
});

await test("inconclusivo é questão em aberto, fora dos confirmados; rejeitado de IA sai do parecer", () => {
  const q = toAuditFinding({ id: "E-2", candidate: cand(), result: result("inconclusive", [[a, "supports"]], ["supported", "unresolved"]), fileName, severity: sev })!;
  assert.equal(q.tier, "sugestao");
  assert.match(q.descricao, /^\[Questão em aberto — não confirmada\]/);
  assert.deepEqual(q.motor!.limits, ["vigência"]);
  assert.equal(toAuditFinding({ id: "E-3", candidate: cand(), result: result("rejected", [[b, "refutes"]]), fileName, severity: sev }), null);
  const confirmed = toAuditFinding({ id: "E-1", candidate: cand(), result: result("confirmed"), fileName, severity: sev })!;
  assert.deepEqual(countByState([confirmed, q]), { confirmed: 1, inconclusive: 1, rejectedRules: 0, operationalFailures: 0, legacy: 0, invalid: 0 });
});

await test("regra com premissa contestada não é apagada nem vira garantia", () => {
  const rule = cand({ origin: { kind: "rule", ruleId: "identidade.volume" } });
  const f = toAuditFinding({ id: "R-1", candidate: rule, result: result("rejected", [[b, "refutes"]], ["refuted", "supported"]), fileName, severity: sev })!;
  assert(f, "regra continua no parecer");
  assert.equal(f.origem, "regra");
  assert.equal(f.tier, "principal");
  assert.match(f.descricao, /premissa contestada — revisar/);
  assert.deepEqual(f.motor!.contestedPremises, ["p1"]);
  assert.equal(f.motor!.state, "rejected");
  assert.equal(countByState([f]).rejectedRules, 1);
  assert.equal(countByState([f]).confirmed, 0);
});

await test("falha operacional não inventa suporte: fontes do candidato entram como contexto", () => {
  const failure: InvestigationResult = { contractVersion: ENGINE_CONTRACT_VERSION, candidateId: "c1", coverage: cov, trace: [], kind: "operational_failure", reason: "provider_error", detail: "x" };
  const f = toAuditFinding({ id: "E-4", candidate: cand(), result: failure, fileName, severity: sev })!;
  assert.equal(f.tier, "sugestao");
  assert(f.motor!.references.every(r => r.role === "context"));
  assert.deepEqual(f.motor!.limits, ["falha operacional: provider_error"]);
  assert.equal(parseEngineFinding(f.motor).kind, "engine");
});

await test("relatório novo parcial é rastreado; JSON incompleto ou inválido é erro controlado", () => {
  const partial: EngineReportV1 = { version: ENGINE_REPORT_VERSION, runId: "r", engineVersion: "e", coverage: coverageReport(planCoverage("leitura", [MEM])),
    counts: { confirmed: 0, inconclusive: 1, rejectedRules: 0, operationalFailures: 0 } };
  const r = readEngineReport({ motor: partial });
  assert(r.kind === "engine" && r.coverage === "tracked" && r.value.coverage.status === "not_started");
  const broken = readEngineReport({ motor: { version: ENGINE_REPORT_VERSION, runId: "r", counts: { confirmed: -1 } } });
  assert(broken.kind === "invalid" && broken.errors.includes("invalid_counts") && broken.errors.includes("invalid_coverage") && broken.coverage === "unknown");
  assert.deepEqual(readEngineReport({ motor: { version: "engine-report/9" } }).kind, "invalid");
  const f = toAuditFinding({ id: "E-1", candidate: cand(), result: result("confirmed"), fileName, severity: sev })!;
  const noSupport = parseEngineFinding({ ...f.motor, references: f.motor!.references.map(x => ({ ...x, role: "context" })) });
  assert(noSupport.kind === "invalid" && noSupport.errors.includes("confirmed_without_support"));
  const incomplete = parseEngineFinding({ version: "engine-finding/1", state: "confirmed" });
  assert(incomplete.kind === "invalid" && incomplete.errors.length >= 4);
  assert.equal(countByState([{ motor: { version: "engine-finding/1" } }]).invalid, 1, "inválido nunca conta como confirmado");
});

await test("tipo legado em português: identidade do motor entra na faixa crítica e no filtro de identidade", () => {
  const f = toAuditFinding({ id: "E-9", candidate: cand({ kind: "identity" }), result: result("inconclusive", [[a, "supports"]], ["supported", "unresolved"]), fileName, severity: sev })!;
  assert.match(f.tipo, /Identidade/);
  assert.equal(classifyFindingImpact(f as unknown as AuditFinding), "critico_documental");
  assert.equal(classifyFindingErrorType(f as unknown as AuditFinding), "identidade");
});

console.log(`${passed} testes do contrato público do parecer passaram. Nenhuma chamada de rede.`);
