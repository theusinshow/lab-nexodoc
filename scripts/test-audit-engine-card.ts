/**
 * Modelo do cartão do achado (P6.3), puro. Sem rede.
 *
 *   node --import ./scripts/lib/resolver-de-imports.mjs scripts/test-audit-engine-card.ts
 */
import assert from "node:assert/strict";
import { ENGINE_CONTRACT_VERSION, type Candidate, type CalculationRecord, type InvestigationResult } from "../lib/audit-engine/contracts.ts";
import { findingCard } from "../lib/audit-engine/finding-card.ts";
import { toAuditFinding } from "../lib/audit-engine/report-contract.ts";
import { refFor, revision } from "./audit-engine-fixtures/index.ts";

let passed = 0;
async function test(name: string, fn: () => unknown) { await fn(); passed++; console.log(`OK ${name}`); }

const LONG = "MEMORIAL-DESCRITIVO-HIDROSSANITARIO-BLOCO-ADMINISTRATIVO-REVISAO-FINAL-EMITIDA-PARA-APROVACAO.pdf";
const MEM = revision("memorial", LONG, ["Capa.", "Volume útil de 12.000 L. Volume útil de 12.000 L no anexo."]);
const ESP = revision("espec", "especificacao.pdf", ["Reservatório inferior com volume útil de 15.000 L."]);
const names: Record<string, string> = { [MEM.revision.revisionId]: LONG, [ESP.revision.revisionId]: "especificacao.pdf" };
const texts: Record<string, string[]> = { [MEM.revision.revisionId]: MEM.pages, [ESP.revision.revisionId]: ESP.pages };
const a = refFor(MEM, 2, "Volume útil de 12.000 L", 0);
const b = refFor(ESP, 1, "volume útil de 15.000 L");
const cand: Candidate = {
  id: "c", kind: "comparison", proposition: "Volumes divergentes para o reservatório inferior.", origin: { kind: "relation", relationId: "r" },
  factIds: [], refs: [a, b], premises: [{ id: "p1", statement: "memorial declara 12.000 L" }, { id: "p2", statement: "especificação declara 15.000 L" }, { id: "p3", statement: "mesmo reservatório" }],
  claimScope: "", counterEvidenceToSeek: [],
};
const cov = { scope: "t", pages: [], planned: [], extracted: [], submitted: [], completed: [], failed: [], synthesized: false, visual: { assessed: [], requiredNotAssessed: [] }, inherited: [] };
const res = (decision: "confirmed" | "inconclusive", statuses: string[], calculations: CalculationRecord[] = []): InvestigationResult => ({
  contractVersion: ENGINE_CONTRACT_VERSION, candidateId: "c", coverage: cov, trace: [], kind: "decision", decision, finalProposition: cand.proposition,
  derivedCandidate: null, missingContext: decision === "inconclusive" ? ["trava:counterevidence_not_addressed"] : [], summary: "s",
  proof: { premises: statuses.map((st, i) => ({ premiseId: `p${i + 1}`, status: st as "supported" })),
    refs: [{ ref: a, role: "supports", premiseIds: ["p1"], integrity: "anchored" }, { ref: b, role: "supports", premiseIds: ["p2"], integrity: "anchored" }], conditions: [], calculations },
});
const make = (r: InvestigationResult, withText = true) => toAuditFinding({
  id: "E", candidate: cand, result: r, fileName: id => names[id], severity: { prioridade: "Alta", consequence: "O reservatório pode ser executado com volume insuficiente.", action: "Unificar o volume adotado nos dois documentos." },
  ...(withText ? { pageText: (id: string, p: number) => texts[id]?.[p - 1] } : {}),
})!;
const everything = { hasRevision: () => true };

await test("ordem e conteúdo: problema, evidência por lado, consequência, ação, estado", () => {
  const card = findingCard(make(res("confirmed", ["supported", "supported", "supported"])), everything);
  assert.equal(card.problem, cand.proposition);
  assert.deepEqual(card.sources.map(s => [s.role, s.fileName, s.page]), [["sustenta", LONG, 2], ["sustenta", "especificacao.pdf", 1]]);
  assert.equal(card.consequence, "O reservatório pode ser executado com volume insuficiente.");
  assert.equal(card.action, "Unificar o volume adotado nos dois documentos.");
  assert.equal(card.state.kind, "confirmed");
  assert.match(card.state.examined, /especificacao\.pdf p\.1/);
  assert.equal(card.sources[0].fileName.length, LONG.length, "nome longo preservado; o corte é da tela");
});

await test("realce só com citação única na página; sem texto conhecido, abre sem realçar", () => {
  const card = findingCard(make(res("confirmed", ["supported", "supported", "supported"])), everything);
  const [mem, esp] = card.sources.map(s => s.navigation);
  assert(mem.kind === "open" && mem.highlight === null, "citação repetida na página: não realça a primeira coincidência");
  assert(esp.kind === "open" && esp.highlight === "volume útil de 15.000 L");
  const unknown = findingCard(make(res("confirmed", ["supported", "supported", "supported"]), false), everything);
  assert(unknown.sources.every(s => s.navigation.kind === "open" && s.navigation.highlight === null), "sem coordenada nem unicidade provada: sem realce");
});

await test("arquivo indisponível ou removido: mostra a citação e a indisponibilidade, não abre outro", () => {
  const card = findingCard(make(res("confirmed", ["supported", "supported", "supported"])), { hasRevision: id => id !== ESP.revision.revisionId });
  const esp = card.sources.find(s => s.fileName === "especificacao.pdf")!;
  assert.deepEqual(esp.navigation, { kind: "unavailable", fileName: "especificacao.pdf", page: 1, reason: "file_not_available" });
  assert.equal(esp.quote, "volume útil de 15.000 L");
});

await test("inconclusão: consequência no condicional, limites e premissas em aberto explícitos", () => {
  const card = findingCard(make(res("inconclusive", ["supported", "supported", "unresolved"])), everything);
  assert.equal(card.state.kind, "open");
  assert.match(card.state.label, /não confirmado/);
  assert.match(card.consequence!, /^Se confirmado: /);
  assert(card.state.limits.includes("verificação automática não passou: counterevidence_not_addressed"));
  assert(card.state.limits.includes("premissa em aberto: mesmo reservatório"));
});

await test("cálculo extenso traz operandos com fontes; hipótese deixa a consequência no condicional", () => {
  const calc: CalculationRecord = { expression: "(a + b + c) * d", result: 4321.5, unit: "W", rounding: "4 sig",
    operands: [
      { name: "a", value: 1200, unit: "W", source: { kind: "fact", factId: "f1" } },
      { name: "b", value: 1800.25, unit: "W", source: { kind: "fact", factId: "f2" } },
      { name: "c", value: 600, unit: "W", source: { kind: "ref", refIndex: 0 } },
      { name: "d", value: 1.2, unit: null, source: { kind: "hypothesis", note: "fator de simultaneidade suposto" } },
    ] };
  const card = findingCard(make(res("confirmed", ["supported", "supported", "supported"], [calc])), everything);
  assert.equal(card.calculations.length, 1);
  assert.deepEqual(card.calculations[0].operands.map(o => o.source), ["valor do documento", "valor do documento", "citação", "hipótese: fator de simultaneidade suposto"]);
  assert.equal(card.calculations[0].result, "4.321,5 W");
  assert.match(card.consequence!, /^Se confirmado/, "conta com hipótese não afirma consequência");
});

await test("achado legado ou motor ilegível: nada inventado", () => {
  const legacy = findingCard({ descricao: "d", conflito: "Conflito antigo", evidencia: "p.3: trecho", sugestao_correcao: "Revisar", pagina: "3" }, everything);
  assert.equal(legacy.state.kind, "legacy");
  assert.deepEqual(legacy.sources, []);
  assert.equal(legacy.problem, "Conflito antigo");
  const broken = findingCard({ descricao: "d", conflito: "c", evidencia: "", sugestao_correcao: "", pagina: "", motor: { version: "engine-finding/1" } }, everything);
  assert.match(broken.state.label, /ilegíveis/);
});

await test("nada de especialista, chamadas ou tokens no cartão", () => {
  const card = findingCard(make(res("confirmed", ["supported", "supported", "supported"])), everything);
  assert(!/especialista|agente|token|chamada|concord/i.test(JSON.stringify(card)));
});

console.log(`${passed} testes do cartão do achado passaram. Nenhuma chamada de rede.`);
