/**
 * Ponte de feedback × linhagem (P6.4). Pura; sem banco nem rede.
 *
 *   node --import ./scripts/lib/resolver-de-imports.mjs scripts/test-audit-engine-feedback.ts
 */
import assert from "node:assert/strict";
import { carryFeedback, identityOf, legacyFingerprint, type BridgeFinding, type FeedbackRow } from "../lib/audit-engine/feedback-bridge.ts";
import { ENGINE_FINDING_VERSION, type EngineFindingV1 } from "../lib/audit-engine/report-contract.ts";
import { chaveEntreVersoes } from "../lib/diff-de-pareceres.ts";
import type { AuditFinding } from "../lib/audit-report.ts";

let passed = 0;
async function test(name: string, fn: () => unknown) { await fn(); passed++; console.log(`OK ${name}`); }

const row = (over: Partial<FeedbackRow>): FeedbackRow => ({
  targetKey: "finding:INC-1", findingId: "INC-1", fingerprint: null, verdict: "CONFIRMED", resolvedAt: null, resolutionKind: null,
  assigneeEmail: "eng@escritorio.com", note: "", ...over,
});
const motor = (logicalId: string, inheritedFrom: { runId: string; occurrence: number } | null): EngineFindingV1 => ({
  version: ENGINE_FINDING_VERSION, state: "confirmed", proposition: "p", premises: [], references: [{ role: "supports", documentId: "d", revisionId: "r", fileName: "f.pdf", page: 1, start: 0, end: 1, quote: "q" }],
  consequence: null, suggestedAction: null, limits: [], contestedPremises: [], origin: { kind: "relation", ruleId: null },
  lineage: { logicalId, occurrence: inheritedFrom ? 2 : 1, inheritedFrom },
});
const legacy = (id: string, tipo: string, evidencia: string): BridgeFinding => ({ id, tipo, evidencia });
const scope = "org:proj";

await test("fingerprint legado é o mesmo de chaveEntreVersoes", () => {
  const f = { id: "INC-1", tipo: "Área divergente", evidencia: "  Área útil de 420,5 m²  " };
  assert.equal(legacyFingerprint(f), chaveEntreVersoes(f as unknown as AuditFinding));
});

await test("reordenação de INCs: feedback segue a identidade, não o número", () => {
  const prev = [legacy("INC-1", "Área divergente", "Área 420"), legacy("INC-2", "Volume divergente", "Volume 12.000")];
  const cur = [legacy("INC-1", "Volume divergente", "Volume 12.000"), legacy("INC-2", "Área divergente", "Área 420")];
  const d = carryFeedback({ previous: { scopeKey: scope, findings: prev, feedback: [row({ targetKey: "finding:INC-2", findingId: "INC-2", verdict: "FALSE_POSITIVE" })] },
    current: { scopeKey: scope, findings: cur } });
  assert.deepEqual(d, [{ kind: "carry", fromTargetKey: "finding:INC-2", toTargetKey: "finding:INC-1", inheritVerdict: true, inheritResolution: true, basis: "legacy_same_fingerprint" }]);
});

await test("alteração de evidência (reanálise com a mesma identidade): relaciona, pede nova avaliação, não herda aprovação", () => {
  const prev = [{ id: "E-1", tipo: "comparison", evidencia: "a", motor: motor("log-x", null) }];
  const cur = [{ id: "E-7", tipo: "comparison", evidencia: "b", motor: motor("log-x", null) }];
  const d = carryFeedback({ previous: { scopeKey: scope, findings: prev, feedback: [row({ targetKey: "finding:E-1", findingId: "E-1", fingerprint: identityOf(prev[0]) })] },
    current: { scopeKey: scope, findings: cur } });
  assert.deepEqual(d, [{ kind: "related_requires_review", fromTargetKey: "finding:E-1", toTargetKey: "finding:E-7", inheritVerdict: false, inheritResolution: false, keepHistory: true, basis: "engine_reanalyzed" }]);
});

await test("herança comprovada carrega julgamento e desfecho de forma explícita", () => {
  const prev = [{ id: "E-1", tipo: "comparison", evidencia: "a", motor: motor("log-y", null) }];
  const cur = [{ id: "E-3", tipo: "comparison", evidencia: "a", motor: motor("log-y", { runId: "run-1", occurrence: 1 }) }];
  const d = carryFeedback({ previous: { scopeKey: scope, findings: prev, feedback: [row({ targetKey: "finding:E-1", findingId: "E-1", resolvedAt: "2026-09-20", resolutionKind: "ACCEPTED_RISK" })] },
    current: { scopeKey: scope, findings: cur } });
  assert.equal(d[0].kind, "carry");
  assert(d[0].kind === "carry" && d[0].basis === "engine_inherited" && d[0].toTargetKey === "finding:E-3");
});

await test("achado resolvido que reaparece é reaberto (inclusive 'corrigido' que continua idêntico)", () => {
  const prev = [{ id: "E-1", tipo: "comparison", evidencia: "a", motor: motor("log-z", null) }];
  const reanalyzed = [{ id: "E-2", tipo: "comparison", evidencia: "a", motor: motor("log-z", null) }];
  const inheritedSame = [{ id: "E-2", tipo: "comparison", evidencia: "a", motor: motor("log-z", { runId: "run-1", occurrence: 1 }) }];
  const fixed = row({ targetKey: "finding:E-1", findingId: "E-1", resolvedAt: "2026-09-21", resolutionKind: "FIXED_IN_DOC" });
  for (const cur of [reanalyzed, inheritedSame]) {
    const d = carryFeedback({ previous: { scopeKey: scope, findings: prev, feedback: [fixed] }, current: { scopeKey: scope, findings: cur } });
    assert.deepEqual(d, [{ kind: "reopened", fromTargetKey: "finding:E-1", toTargetKey: "finding:E-2", inheritVerdict: false, inheritResolution: false, keepHistory: true, previousResolution: "FIXED_IN_DOC" }]);
  }
});

await test("parecer antigo sem identidade gravada usa o achado anterior; ausente no atual fica onde está", () => {
  const prev = [legacy("INC-3", "Código divergente", "990-26")];
  const d = carryFeedback({ previous: { scopeKey: scope, findings: prev, feedback: [row({ targetKey: "finding:INC-3", findingId: "INC-3" })] },
    current: { scopeKey: scope, findings: [legacy("INC-1", "Outro", "x")] } });
  assert.deepEqual(d, [{ kind: "not_in_current", fromTargetKey: "finding:INC-3" }]);
});

await test("achado ausente vira item de avaliação; outro projeto não recebe feedback", () => {
  const missing = row({ targetKey: "missing:abc", findingId: null, verdict: "MISSING_FINDING", note: "faltou o conflito de cota" });
  const d = carryFeedback({ previous: { scopeKey: scope, findings: [], feedback: [missing, row({})] }, current: { scopeKey: "org:outro", findings: [legacy("INC-1", "t", "e")] } });
  assert.deepEqual(d, [
    { kind: "evaluation_item", fromTargetKey: "missing:abc", note: "faltou o conflito de cota" },
    { kind: "scope_mismatch", fromTargetKey: "finding:INC-1" },
  ]);
});

console.log(`${passed} testes da ponte de feedback passaram. Nenhuma chamada de rede.`);
