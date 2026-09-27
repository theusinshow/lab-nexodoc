/**
 * Reauditoria por dependências (P4.4). Sem rede, sem banco.
 *
 *   node --import ./scripts/lib/resolver-de-imports.mjs scripts/test-audit-engine-reuse.ts
 */
import assert from "node:assert/strict";
import { ENGINE_CONTRACT_VERSION, type Candidate, type EvidenceRef, type InvestigationResult, type RevisionText } from "../lib/audit-engine/contracts.ts";
import { coverageReport, planCoverage, recordInherited } from "../lib/audit-engine/coverage.ts";
import {
  corpusDelta, dependenciesOf, inheritedIntervals, logicalId, planLegacyReuse, planReuse, type DependencyRecord,
} from "../lib/audit-engine/reuse.ts";
import type { AccessScope } from "../lib/audit-engine/version.ts";
import { refFor, revision } from "./audit-engine-fixtures/index.ts";

let passed = 0;
async function test(name: string, fn: () => unknown) { await fn(); passed++; console.log(`OK ${name}`); }

const scope: AccessScope = { organizationId: "org", projectId: "p1", auditId: "a1" };
const ENGINE = "engine-x";
const CTX = "ctx-x";
const emptyCov = { scope: "t", pages: [], planned: [], extracted: [], submitted: [], completed: [], failed: [], synthesized: false, visual: { assessed: [], requiredNotAssessed: [] }, inherited: [] };

function decided(c: Candidate, refs: EvidenceRef[], decision: "confirmed" | "rejected" | "inconclusive" = "confirmed"): InvestigationResult {
  return {
    contractVersion: ENGINE_CONTRACT_VERSION, candidateId: c.id, coverage: emptyCov, trace: [], kind: "decision", decision,
    finalProposition: c.proposition, derivedCandidate: null, missingContext: [], summary: "s",
    proof: { premises: [], refs: refs.map(ref => ({ ref, role: "supports" as const, premiseIds: [], integrity: "anchored" as const })), conditions: [], calculations: [] },
  };
}
function record(id: string, c: Candidate, corpus: RevisionText[], over: Partial<Parameters<typeof dependenciesOf>[0]> = {}): DependencyRecord {
  return dependenciesOf({ resultId: id, runId: "run-1", scope, engineVersion: ENGINE, contextDigest: CTX, candidate: c,
    result: decided(c, c.refs), corpus, ...over });
}
const cand = (id: string, refs: EvidenceRef[], over: Partial<Candidate> = {}): Candidate => ({
  id, kind: "comparison", proposition: `Proposição ${id}.`, origin: { kind: "relation", relationId: `r-${id}` },
  factIds: [], refs, premises: [], claimScope: "", counterEvidenceToSeek: [], ...over,
});
const plan = (records: DependencyRecord[], newCorpus: RevisionText[], over: Partial<Parameters<typeof planReuse>[0]> = {}) =>
  planReuse({ records, newCorpus, scope, engineVersion: ENGINE, contextDigest: CTX, runId: "run-2", ...over });
const action = (p: ReturnType<typeof plan>, id: string) => p.decisions.find(d => d.resultId === id)!;

const A0 = revision("memorial", "memorial.pdf", ["Capa do memorial.", "Reservatório inferior com volume útil de 12.000 L.", "Seção 5 texto."]);
const B0 = revision("espec", "espec.pdf", ["Reservatório inferior com volume útil de 15.000 L."]);
const c1 = cand("c1", [refFor(A0, 2, "volume útil de 12.000 L"), refFor(B0, 1, "volume útil de 15.000 L")]);

await test("sem mudança: herda, com linhagem nova ocorrência e âncoras revalidadas", () => {
  const r = record("c1", c1, [A0, B0], { targetKeys: ["fb-1"] });
  const p = plan([r], [A0, B0]);
  const d = action(p, "c1");
  assert.equal(d.action, "inherit");
  assert(d.action === "inherit");
  assert.equal(d.lineage.logicalId, r.lineage.logicalId);
  assert.equal(d.lineage.occurrence, 2);
  assert.deepEqual(d.lineage.inheritedFrom, { runId: "run-1", occurrence: 1 });
  assert.deepEqual(d.lineage.targetKeys, ["fb-1"], "feedback atravessa pela herança");
});

await test("inserção que desloca páginas: herda com páginas remapeadas pelo conteúdo, não por aritmética", () => {
  const A1 = revision("memorial", "memorial.pdf", ["Nova folha de rosto.", ...A0.pages]);
  const delta = corpusDelta([A0, B0], [A1, B0]).find(x => x.documentId === "memorial")!;
  assert.equal(delta.status, "changed");
  assert.deepEqual(delta.movedPages, [{ from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 }]);
  const d = action(plan([record("c1", c1, [A0, B0])], [A1, B0]), "c1");
  assert(d.action === "inherit");
  assert.deepEqual(d.remapped.map(p => [p.documentId, p.page]), [["memorial", 3], ["espec", 1]]);
});

await test("alteração só no segundo arquivo: reanalisa quem depende dele, herda quem não depende", () => {
  const B1 = revision("espec", "espec.pdf", ["Reservatório inferior com volume útil de 16.000 L."]);
  const onlyA = cand("c2", [refFor(A0, 3, "Seção 5 texto.")]);
  const p = plan([record("c1", c1, [A0, B0]), record("c2", onlyA, [A0, B0])], [A0, B1]);
  assert.deepEqual(action(p, "c1"), { resultId: "c1", action: "reanalyze", reasons: ["passage_changed"], orphanedFeedback: [] });
  assert.equal(action(p, "c2").action, "inherit");
});

await test("duas citações em capítulos distantes: muda a segunda, não só a primeira página, e reanalisa", () => {
  const doc = revision("longo", "longo.pdf", ["Art. 2º Diâmetro de 100 mm.", "x", "y", "z", "Art. 9º Diâmetro de 50 mm para lavatório."]);
  const c = cand("c3", [refFor(doc, 1, "Art. 2º Diâmetro de 100 mm"), refFor(doc, 5, "Art. 9º Diâmetro de 50 mm")]);
  const changed = revision("longo", "longo.pdf", [...doc.pages.slice(0, 4), "Art. 9º Diâmetro de 75 mm para lavatório."]);
  assert.equal(action(plan([record("c3", c, [doc])], [changed]), "c3").action, "reanalyze");
});

await test("remoção do trecho com a exceção (pista) invalida a conclusão", () => {
  const rule = revision("diretriz", "d.pdf", ["Art. 2º Os ramais terão diâmetro de 100 mm.", "Art. 9º Excetuam-se do art. 2º os ramais de lavatório."]);
  const c = cand("c4", [refFor(rule, 1, "Os ramais terão diâmetro de 100 mm")]);
  const lead = refFor(rule, 2, "Excetuam-se do art. 2º os ramais de lavatório");
  const r = record("c4", c, [rule], { leads: [lead] });
  assert.equal(r.passages.length, 2, "a pista entra nas dependências");
  const withoutException = revision("diretriz", "d.pdf", ["Art. 2º Os ramais terão diâmetro de 100 mm."]);
  const d = action(plan([r], [withoutException]), "c4");
  assert(d.action === "reanalyze" && d.reasons.includes("passage_changed"));
});

await test("exclusão da premissa (documento inteiro) invalida", () => {
  const d = action(plan([record("c1", c1, [A0, B0])], [A0]), "c1");
  assert(d.action === "reanalyze" && d.reasons.includes("document_removed"));
});

await test("rename não é alteração; nome nunca basta para herdar", () => {
  const renamed = revision("memorial", "memorial-FINAL-v2.pdf", A0.pages);
  assert.equal(corpusDelta([A0], [renamed])[0].status, "unchanged");
  assert.equal(action(plan([record("c1", c1, [A0, B0])], [renamed, B0]), "c1").action, "inherit");
  // Mesmo nome, conteúdo trocado: nome não salva.
  const sameName = revision("memorial", "memorial.pdf", ["Outro conteúdo.", "Outro conteúdo 2.", "Outro 3."]);
  assert.equal(action(plan([record("c1", c1, [A0, B0])], [sameName, B0]), "c1").action, "reanalyze");
});

await test("PDF duplicado em outro projeto: escopo diferente não herda", () => {
  const d = action(plan([record("c1", c1, [A0, B0])], [A0, B0], { scope: { organizationId: "org-2", projectId: "p9", auditId: "a9" } }), "c1");
  assert(d.action === "reanalyze" && d.reasons.includes("scope_mismatch"));
});

await test("regra/versão do motor ou contexto alterados: reanalisa tudo que dependia", () => {
  const r = record("c1", c1, [A0, B0]);
  const e = action(plan([r], [A0, B0], { engineVersion: "engine-y" }), "c1");
  assert(e.action === "reanalyze" && e.reasons.includes("engine_changed"));
  const ctx = action(plan([r], [A0, B0], { contextDigest: "ctx-y" }), "c1");
  assert(ctx.action === "reanalyze" && ctx.reasons.includes("context_changed"));
});

await test("novo documento refuta ausência anterior mesmo com a página original intacta", () => {
  const cad = revision("caderno", "caderno.pdf", ["Conforme item 9.4 deste caderno."]);
  const neg = cand("c5", [refFor(cad, 1, "Conforme item 9.4 deste caderno")], { kind: "reference", proposition: 'Remissão a "item 9.4" não localizada no escopo examinado.' });
  const r = record("c5", neg, [cad]);
  assert.deepEqual(r.negativeUniverse, ["caderno"]);
  const anexo = revision("anexo", "anexo.pdf", ["Item 9.4 Caixas."]);
  const d = action(plan([r], [cad, anexo]), "c5");
  assert(d.action === "reanalyze" && d.reasons.includes("universe_changed"));
  assert.equal(action(plan([r], [cad]), "c5").action, "inherit");
});

await test("dependência transitiva invalidada propaga", () => {
  const B1 = revision("espec", "espec.pdf", ["Reservatório inferior com volume útil de 16.000 L."]);
  const derived = cand("c6", [refFor(A0, 3, "Seção 5 texto.")]);
  const p = plan([record("c1", c1, [A0, B0]), record("c6", derived, [A0, B0], { dependsOnResults: ["c1"] })], [A0, B1]);
  assert.deepEqual(action(p, "c6"), { resultId: "c6", action: "reanalyze", reasons: ["dependency_invalidated"], orphanedFeedback: [] });
});

await test("relatório legado sem dependências: reanálise completa com motivo; feedback fica órfão, não reatribuído", () => {
  const l = planLegacyReuse(["INC-1", "INC-2"], ["INC-1", "shared:abc"]);
  assert(l.decisions.every(d => d.action === "reanalyze" && d.reasons[0] === "legacy_without_dependencies"));
  assert.deepEqual(l.orphanedFeedback, ["INC-1", "shared:abc"]);
});

await test("feedback não migra para ocorrência nova só porque a descrição coincide", () => {
  const B1 = revision("espec", "espec.pdf", ["Reservatório inferior com volume útil de 16.000 L."]);
  const r = record("c1", c1, [A0, B0], { targetKeys: ["fb-antigo"] });
  const p = plan([r], [A0, B1]);
  assert.deepEqual(p.orphanedFeedback, ["fb-antigo"]);
  const d = action(p, "c1");
  assert(d.action === "reanalyze" && !("lineage" in d));
  // A identidade lógica coincide (mesma proposição, mesmos documentos), e mesmo assim o feedback
  // não é religado: após reanálise, quem decide se ele ainda vale é uma pessoa.
  assert.equal(logicalId(c1), r.lineage.logicalId);
});

await test("cobertura herdada fica separada e acompanha páginas movidas; página removida sai", () => {
  const A1 = revision("memorial", "memorial.pdf", ["Nova folha de rosto.", A0.pages[0], A0.pages[1]]);
  const old = [0, 1, 2].map(i => ({ revisionId: A0.revision.revisionId, page: i + 1, start: 0, end: A0.pages[i].length }));
  const inh = inheritedIntervals(old, [A0], [A1]);
  assert.deepEqual(inh.map(i => i.page), [2, 3]);
  const cov = recordInherited(planCoverage("leitura", [A1]), inh, [A1]);
  const rep = coverageReport(cov).revisions[0];
  assert.equal(rep.completedChars, 0, "herdado não conta como leitura atual");
  assert.equal(rep.inheritedChars, A0.pages[0].length + A0.pages[1].length);
});

console.log(`${passed} testes de reuso por dependências passaram. Nenhuma chamada de rede.`);
