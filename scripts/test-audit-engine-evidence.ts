/**
 * Referências canônicas e cobertura honesta (P3.2). Sem rede, sem banco.
 *
 *   node --import ./scripts/lib/resolver-de-imports.mjs scripts/test-audit-engine-evidence.ts
 */
import assert from "node:assert/strict";
import { verifyRef, type RevisionText } from "../lib/audit-engine/contracts.ts";
import { indexRevision, locateQuote, type LocateRequest } from "../lib/audit-engine/evidence.ts";
import {
  checkIntervals, coverageReport, markSynthesized, planCoverage, recordCompleted, recordFailed,
  recordInherited, recordSubmitted, recordVisualAssessed, unionIntervals,
} from "../lib/audit-engine/coverage.ts";
import {
  ALL_FIXTURES, memorialBloco1, memorialBloco2, repeatedPages, revision, specR0, specR1,
} from "./audit-engine-fixtures/index.ts";

let passed = 0;
async function test(name: string, fn: () => unknown) { await fn(); passed++; console.log(`OK ${name}`); }

const indexes = ALL_FIXTURES.map(indexRevision);
const req = (rt: RevisionText, page: number, quote: string, extra: Partial<LocateRequest> = {}): LocateRequest =>
  ({ documentId: rt.revision.documentId, revisionId: rt.revision.revisionId, page, quote, ...extra });
const locate = (rt: RevisionText, page: number, quote: string, extra: Partial<LocateRequest> = {}) =>
  locateQuote([...indexes, indexRevision(rt)], req(rt, page, quote, extra));

await test("citação certa no arquivo errado de mesmo nome não ancora", () => {
  const quote = "Área útil de 420,5 m²";
  assert.equal(locate(memorialBloco1, 1, quote).status, "anchored");
  assert.equal(locate(memorialBloco2, 1, quote).status, "not_found");
  const crossed = locateQuote(indexes, { ...req(memorialBloco1, 1, quote), documentId: memorialBloco2.revision.documentId });
  assert.equal(crossed.status, "document_mismatch");
});

await test("mesma página em duas revisões: cada referência vale só na sua", () => {
  const r1 = locate(specR1, 1, "volume útil de 15.000 L");
  assert.equal(r1.status, "anchored");
  assert.equal(locate(specR0, 1, "volume útil de 15.000 L").status, "not_found");
  // Página 2 idêntica nas duas revisões: a citação é verdadeira em ambas, com revisão explícita.
  const a = locate(specR0, 2, "Consumo diário adotado: 150 L");
  const b = locate(specR1, 2, "Consumo diário adotado: 150 L");
  assert(a.status === "anchored" && b.status === "anchored");
  assert.notEqual(a.ref.revisionId, b.ref.revisionId);
  assert.equal(verifyRef(a.ref, ALL_FIXTURES), "ok");
});

await test("citação inventada, curta ou fora da página não vira prova", () => {
  assert.equal(locate(specR1, 1, "volume útil de 18.000 L").status, "not_found");
  assert.equal(locate(specR1, 1, "15.000 L").status, "quote_too_short");
  assert.equal(locate(specR1, 9, "volume útil de 15.000 L").status, "page_out_of_range");
  assert.equal(locate(specR1, 0, "volume útil de 15.000 L").status, "page_out_of_range");
  assert.equal(locateQuote(indexes, { ...req(specR1, 1, "volume útil de 15.000 L"), revisionId: "rev-x" }).status, "revision_unknown");
});

await test("espaços e quebras são tolerados; a prova guarda o texto original", () => {
  const rt = revision("quebras", "quebras.pdf", ["O ramal\n  de   esgoto terá\ndeclividade de 2%."]);
  const r = locate(rt, 1, "o RAMAL de esgoto terá declividade de 2%");
  assert.equal(r.status, "anchored");
  assert(r.status === "anchored");
  assert.equal(r.ref.quote, "O ramal\n  de   esgoto terá\ndeclividade de 2%");
  assert.equal(verifyRef(r.ref, [rt]), "ok");
});

await test("sinal, número e negação não são cortados da citação", () => {
  const rt = revision("sinais", "sinais.pdf", [
    "Inclinação de −30° de inclinação máxima. Cota 15,0 m de altura livre. O dreno não deverá ser instalado sob a laje.",
  ]);
  assert.equal(locate(rt, 1, "30° de inclinação máxima").status, "cuts_number_or_sign");
  assert.equal(locate(rt, 1, "−30° de inclinação máxima").status, "anchored");
  assert.equal(locate(rt, 1, "5,0 m de altura livre").status, "cuts_number_or_sign");
  assert.equal(locate(rt, 1, "Cota 15,0 m de altura").status, "anchored");
  assert.equal(locate(rt, 1, "Cota 15,0 m de altura livre. O").status, "anchored");
  assert.equal(locate(rt, 1, "Inclinação de −30° de inclinação máxima. Cota 1").status, "cuts_number_or_sign");
  assert.equal(locate(rt, 1, "máxima. Cota 15,").status, "cuts_number_or_sign");
  assert.equal(locate(rt, 1, "deverá ser instalado sob a laje").status, "drops_negation");
  assert.equal(locate(rt, 1, "não deverá ser instalado sob a laje").status, "anchored");
  // Hífen comum não é o sinal de menos tipográfico.
  assert.equal(locate(rt, 1, "-30° de inclinação máxima").status, "not_found");
});

await test("texto repetido exige offset ou contexto válido", () => {
  const rt = revision("rep", "rep.pdf", ["Nota geral: ver detalhe 7. Seção A. Nota geral: ver detalhe 7. Seção B."]);
  const amb = locate(rt, 1, "Nota geral: ver detalhe 7.");
  assert.equal(amb.status, "ambiguous");
  assert.equal(amb.occurrences, 2);
  const second = rt.pages[0].lastIndexOf("Nota geral");
  const byOffset = locate(rt, 1, "Nota geral: ver detalhe 7.", { disambiguation: { offset: second } });
  assert(byOffset.status === "anchored" && byOffset.ref.start === second);
  const byContext = locate(rt, 1, "Nota geral: ver detalhe 7.", { disambiguation: { context: "Seção A. Nota geral: ver detalhe 7. Seção B" } });
  assert(byContext.status === "anchored" && byContext.ref.start === second);
  assert.equal(locate(rt, 1, "Nota geral: ver detalhe 7.", { disambiguation: { offset: 3 } }).status, "disambiguation_not_matched");
  assert.equal(locate(rt, 1, "Nota geral: ver detalhe 7.", { disambiguation: { context: "Nota geral: ver detalhe 7." } }).status, "disambiguation_not_matched");
});

await test("ocorrência única ancora mesmo com dica de offset/contexto errada (dica só desempata)", () => {
  const rt = revision("uni", "uni.pdf", ["Proprietário: Prefeitura Municipal de Chapecó; endereço em Criciúma/SC."]);
  const at = rt.pages[0].indexOf("Prefeitura");
  const byBadOffset = locate(rt, 1, "Prefeitura Municipal de Chapecó", { disambiguation: { offset: 9999 } });
  assert(byBadOffset.status === "anchored" && byBadOffset.ref.start === at);
  const byBadContext = locate(rt, 1, "Prefeitura Municipal de Chapecó", { disambiguation: { context: "texto que não existe" } });
  assert(byBadContext.status === "anchored" && byBadContext.ref.start === at);
});

await test("tabela renderizada duas vezes na página é ambígua sem desambiguação", () => {
  const rt = revision("tabela2x", "quadro.pdf", [
    "Circuito C3 potência 2.750 W tensão 220 V\n[TABELA]\nCircuito | Potência (W) | Tensão (V)\nC3 | 2.750 | 220\n[/TABELA]",
  ]);
  // Fluxo e grade têm formatação diferente: citação do fluxo é única e ancora.
  assert.equal(locate(rt, 1, "Circuito C3 potência 2.750 W").status, "anchored");
  // Linha idêntica no fluxo e na grade: sem desambiguação, não se escolhe a primeira.
  const rowTwice = revision("linha2x", "quadro.pdf", ["C3 | 2.750 | 220\n[TABELA]\nC3 | 2.750 | 220\n[/TABELA]"]);
  assert.equal(locate(rowTwice, 1, "C3 | 2.750 | 220").status, "ambiguous");
});

await test("texto em outra página vira sugestão sem referência; usar exige nova localização", () => {
  const miss = locate(repeatedPages, 3, "o contratado fornecerá as-built ao final");
  assert.equal(miss.status, "not_found");
  assert.deepEqual(miss.elsewhere, [{ page: 1 }, { page: 2 }]);
  assert(!("ref" in miss));
  assert.equal(locate(repeatedPages, miss.elsewhere[0].page, "o contratado fornecerá as-built ao final").status, "anchored");
});

// ---------------------------------------------------------------- cobertura

const two = revision("cov", "cov.pdf", ["a".repeat(100), "b".repeat(50)]);
const id = two.revision.revisionId;
const iv = (page: number, start: number, end: number) => ({ revisionId: id, page, start, end });

await test("extração integral não aparece como auditoria integral", () => {
  let c = planCoverage("leitura", [two]);
  c = recordSubmitted(c, [iv(1, 0, 100)], [two]);
  c = recordCompleted(c, [iv(1, 0, 100)], [two]);
  const r = coverageReport(markSynthesized(c));
  assert.equal(r.pagesWithTextRatio, 1);
  assert.equal(r.completedRatio, 100 / 150);
  assert.equal(r.status, "partial");
});

await test("erro de chamada não promove submetido a concluído", () => {
  let c = planCoverage("leitura", [two]);
  c = recordSubmitted(c, [iv(1, 0, 100), iv(2, 0, 50)], [two]);
  c = recordFailed(c, [iv(1, 0, 100), iv(2, 0, 50)], "call_failed", [two]);
  const r = coverageReport(c);
  assert.equal(r.revisions[0].submittedChars, 150);
  assert.equal(r.revisions[0].completedChars, 0);
  assert.equal(r.revisions[0].failedOutstandingChars, 150);
  assert.deepEqual(r.revisions[0].failedReasons, ["call_failed"]);
  assert.equal(r.status, "not_started");
  // Retry concluído limpa a pendência da falha, mas não conta em dobro.
  c = recordCompleted(c, [iv(1, 0, 100), iv(2, 0, 50)], [two]);
  const after = coverageReport(markSynthesized(c));
  assert.equal(after.revisions[0].failedOutstandingChars, 0);
  assert.equal(after.status, "complete");
});

await test("truncamento fica registrado e impede cobertura completa", () => {
  let c = planCoverage("leitura", [two]);
  c = recordSubmitted(c, [iv(1, 0, 60), iv(2, 0, 50)], [two]);
  c = recordFailed(c, [iv(1, 60, 100)], "truncated", [two]);
  c = recordCompleted(c, [iv(1, 0, 60), iv(2, 0, 50)], [two]);
  const r = coverageReport(markSynthesized(c));
  assert.equal(r.status, "partial");
  assert.equal(r.revisions[0].failedOutstandingChars, 40);
  assert.deepEqual(r.revisions[0].failedReasons, ["truncated"]);
});

await test("releitura não infla; concluir sem submeter não conta; nada ultrapassa o total", () => {
  let c = planCoverage("leitura", [two]);
  c = recordSubmitted(c, [iv(1, 0, 50)], [two]);
  c = recordCompleted(c, [iv(1, 0, 50), iv(1, 0, 50), iv(1, 20, 100), iv(2, 0, 50)], [two]);
  const r = coverageReport(c).revisions[0];
  assert.equal(r.completedChars, 50);
  assert(r.completedChars <= r.submittedChars && r.submittedChars <= r.plannedChars);
  assert.deepEqual(unionIntervals([iv(1, 0, 10), iv(1, 5, 20), iv(1, 20, 30)], i => i.revisionId), [iv(1, 0, 30)]);
});

await test("página muda e visual pendente impedem cobertura completa", () => {
  const mute = revision("muda", "muda.pdf", ["texto da folha um", ""]);
  const mid = mute.revision.revisionId;
  let c = planCoverage("leitura", [mute]);
  c = recordSubmitted(c, [{ revisionId: mid, page: 1, start: 0, end: 17 }], [mute]);
  c = recordCompleted(c, [{ revisionId: mid, page: 1, start: 0, end: 17 }], [mute]);
  let r = coverageReport(markSynthesized(c));
  assert.deepEqual(r.revisions[0].pagesWithoutText, [2]);
  assert.equal(r.pagesWithTextRatio, 0.5);
  assert.equal(r.completedRatio, 1);
  assert.equal(r.status, "partial");
  r = coverageReport(markSynthesized(recordVisualAssessed(c, [{ revisionId: mid, page: 2 }])));
  assert.equal(r.status, "complete");

  // Página com texto suficiente mas desenho decisivo: visual é dimensão própria.
  let d = planCoverage("leitura", [two], { visualRequired: [{ revisionId: id, page: 2 }] });
  d = recordSubmitted(d, [iv(1, 0, 100), iv(2, 0, 50)], [two]);
  d = markSynthesized(recordCompleted(d, [iv(1, 0, 100), iv(2, 0, 50)], [two]));
  assert.equal(coverageReport(d).status, "partial");
  assert.deepEqual(coverageReport(d).revisions[0].visualPending, [2]);
  assert.equal(coverageReport(recordVisualAssessed(d, [{ revisionId: id, page: 2 }])).status, "complete");
  assert.throws(() => planCoverage("x", [two], { visualRequired: [{ revisionId: id, page: 9 }] }), /out_of_scope/);
});

await test("zero páginas é vazio, não 100%", () => {
  const empty = revision("vazio", "vazio.pdf", []);
  const r = coverageReport(planCoverage("leitura", [empty]));
  assert.equal(r.status, "empty");
  assert.equal(r.pagesWithTextRatio, null);
  assert.equal(r.completedRatio, null);
});

await test("offsets fora de limite são erro, não recorte silencioso", () => {
  const c = planCoverage("leitura", [two]);
  assert.deepEqual(checkIntervals([iv(1, 0, 101)], [two]), ["offsets_out_of_range"]);
  assert.deepEqual(checkIntervals([iv(3, 0, 1)], [two]), ["page_out_of_range"]);
  assert.deepEqual(checkIntervals([{ ...iv(1, 0, 1), revisionId: "x" }], [two]), ["revision_unknown"]);
  assert.deepEqual(checkIntervals([iv(1, -1, 5)], [two]), ["offsets_out_of_range"]);
  assert.throws(() => recordSubmitted(c, [iv(1, 0, 101)], [two]), /invalid_intervals/);
  assert.throws(() => recordCompleted(c, [iv(0, 0, 1)], [two]), /invalid_intervals/);
});

await test("herdado fica em campo separado e marca a cobertura como herdada", () => {
  let c = planCoverage("leitura", [two]);
  c = recordSubmitted(c, [iv(1, 0, 100)], [two]);
  c = recordCompleted(c, [iv(1, 0, 100)], [two]);
  c = markSynthesized(recordInherited(c, [iv(1, 0, 100), iv(2, 0, 50)], [two]));
  const r = coverageReport(c);
  assert.equal(r.revisions[0].completedChars, 100);
  assert.equal(r.revisions[0].inheritedChars, 50);
  assert.equal(r.completedRatio, 100 / 150);
  assert.equal(r.status, "complete_with_inherited");
});

console.log(`${passed} testes de evidência e cobertura passaram. Nenhuma chamada de rede.`);
