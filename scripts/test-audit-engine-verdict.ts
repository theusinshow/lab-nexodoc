/**
 * Veredito de emissão com UMA regra (P6.2): `avaliarEmissao`, usada pelo texto
 * exportado, pela tela, pelo cartão do Nexo e pelo grafo. Sem rede.
 *
 *   node --import ./scripts/lib/resolver-de-imports.mjs scripts/test-audit-engine-verdict.ts
 */
import assert from "node:assert/strict";
import { avaliarEmissao, makeTextReport, type AuditFinding, type AuditReport } from "../lib/audit-report.ts";
import { coverageReport, markSynthesized, planCoverage, recordCompleted, recordSubmitted } from "../lib/audit-engine/coverage.ts";
import { ENGINE_FINDING_VERSION, ENGINE_REPORT_VERSION, type EngineReportV1 } from "../lib/audit-engine/report-contract.ts";
import { buildAuditGraph } from "../server/nexo/audit/build-audit-graph.ts";
import { blocosDoParecer } from "../lib/parecer-em-papel.ts";
import { revision } from "./audit-engine-fixtures/index.ts";

let passed = 0;
async function test(name: string, fn: () => unknown) { await fn(); passed++; console.log(`OK ${name}`); }

const finding = (over: Partial<AuditFinding> = {}): AuditFinding => ({
  id: "INC-1", prioridade: "Media", pagina: "3", capitulo: "", local: "", tipo: "Ajuste de texto", descricao: "d", evidencia: "e",
  conflito: "c", sugestao_correcao: "s", confianca: "media", origem: "ia", impacto: "revisao_editorial", ...over,
});
const report = (over: Partial<AuditReport> = {}): AuditReport => ({
  tipo_auditoria: "memorial", tipo_documento: "memorial", obra: "", codigo: "", municipio: "", data_documento: "",
  status_analise: "concluida", status_geral: "sem achados críticos", total_incongruencias: 0,
  arquivos_analisados: [{ arquivo: "memorial.pdf", tipo_documento: "memorial", paginas: 2, resumo: "" }],
  comparacoes: [], incongruencias: [], conclusao: "", ...over,
} as AuditReport);
const rt = revision("m", "memorial.pdf", ["texto um", "texto dois"]);
const all = [1, 2].map(p => ({ revisionId: rt.revision.revisionId, page: p, start: 0, end: rt.pages[p - 1].length }));
const motor = (over: Partial<EngineReportV1> = {}, complete = true): EngineReportV1 => {
  let c = planCoverage("leitura", [rt]);
  if (complete) c = markSynthesized(recordCompleted(recordSubmitted(c, all, [rt]), all, [rt]));
  return { version: ENGINE_REPORT_VERSION, runId: "r", engineVersion: "e", coverage: coverageReport(c),
    counts: { confirmed: 0, inconclusive: 0, rejectedRules: 0, operationalFailures: 0 }, ...over };
};
const channels = (r: AuditReport) => {
  const v = avaliarEmissao(r).veredito;
  assert.deepEqual(buildAuditGraph(r).verdict, v, "grafo usa a mesma regra");
  assert(makeTextReport(r).includes(`${v.emoji} ${v.label} — ${v.detail}`), "texto exportado usa a mesma regra");
  return v;
};

await test("zero achados + status parcial sem passada registrada: nunca liberado", () => {
  const r = report({ status_analise: "parcial" });
  const a = avaliarEmissao(r);
  assert.equal(a.estado, "incompleto");
  assert.match(a.veredito.label, /NÃO USE PARA EMITIR/);
  assert(a.aviso);
  channels(r);
});

await test("leitura global abortada segue vermelha em todos os canais", () => {
  const r = report({ runtime: { passadas_incompletas: [{ passada: "leitura global", motivo: "timeout" }] } } as Partial<AuditReport>);
  const v = channels(r);
  assert.equal(v.emoji, "🔴");
});

await test("cobertura parcial, falha operacional ou resumo ilegível do motor bloqueiam a liberação", () => {
  const partial = avaliarEmissao(report({ motor: motor({}, false) }));
  assert.equal(partial.estado, "incompleto");
  assert(partial.pendencias.some(p => /cobertura do motor not_started/.test(p)));
  const failures = avaliarEmissao(report({ motor: motor({ counts: { confirmed: 0, inconclusive: 0, rejectedRules: 0, operationalFailures: 2 } }) }));
  assert(failures.estado === "incompleto" && failures.pendencias.some(p => /2 verificaç(ão|ões)/.test(p)));
  const broken = avaliarEmissao(report({ motor: { version: "engine-report/1" } as unknown as EngineReportV1 }));
  assert(broken.estado === "incompleto" && broken.pendencias.some(p => /integridade da persistência/.test(p)));
});

await test("liberado diz o escopo efetivo, nunca conformidade integral; sugestão não acende", () => {
  const r = report({ motor: motor(), incongruencias: [finding({ tier: "sugestao", impacto: "critico_documental", prioridade: "Alta" })] });
  const a = avaliarEmissao(r);
  assert.equal(a.estado, "liberado");
  assert.match(a.veredito.detail, /no escopo analisado \(1 arquivo, 2 páginas; cobertura rastreada \(complete\)\)/);
  channels(r);
  const legacy = avaliarEmissao(report());
  assert.match(legacy.escopo, /cobertura não rastreada/);
});

await test("desenho não avaliado: limite no modo textual, pendência quando o modo prometia desenho", () => {
  let c = planCoverage("leitura", [rt], { visualRequired: [{ revisionId: rt.revision.revisionId, page: 2 }] });
  c = markSynthesized(recordCompleted(recordSubmitted(c, all, [rt]), all, [rt]));
  const withVisual = { ...motor(), coverage: coverageReport(c) };
  const r = report({ motor: withVisual });
  // Cobertura com visual pendente já é "partial" no motor: a auditoria não é liberada em nenhum modo...
  assert.equal(avaliarEmissao(r).estado, "incompleto");
  // ...e o modo que prometia desenho nomeia a pendência explicitamente.
  assert(avaliarEmissao(r, { promessaVisual: true }).pendencias.some(p => /desenho prometidas?/.test(p)));
});

await test("questão crítica em aberto impede liberado; editorial confirmado segue com ressalvas", () => {
  const open = finding({ tier: "sugestao", prioridade: "Alta", motor: {
    version: ENGINE_FINDING_VERSION, state: "inconclusive", proposition: "p", premises: [], references: [], consequence: null,
    suggestedAction: null, limits: ["vigência"], contestedPremises: [], origin: { kind: "relation", ruleId: null }, lineage: null,
  } });
  const a = avaliarEmissao(report({ motor: motor(), incongruencias: [open] }));
  assert.equal(a.estado, "revisar");
  assert.match(a.veredito.label, /REVISAR/);
  const editorial = avaliarEmissao(report({ motor: motor(), incongruencias: [finding({ tier: "principal" })] }));
  assert.equal(editorial.estado, "liberado_com_ressalvas");
});

await test("aviso vem antes do veredito no texto exportado", () => {
  const text = makeTextReport(report({ status_analise: "parcial" }));
  assert(text.indexOf("!!!") >= 0 && text.indexOf("!!!") < text.indexOf("0. Veredito de emissão"));
});

await test("papel impresso: mesmo veredito, aviso antes dele, estado e limites só em achado do motor", () => {
  const withRuntime = report({ runtime: { passadas_incompletas: [{ passada: "Revisão dos achados", motivo: "x" }] } } as Partial<AuditReport>);
  const blocos = blocosDoParecer(withRuntime).map(b => b.texto);
  const v = avaliarEmissao(withRuntime).veredito;
  const iVer = blocos.indexOf(`${v.label} — ${v.detail}`);
  const iAviso = blocos.findIndex(t => t.startsWith("ANÁLISE INCOMPLETA"));
  assert(iVer > 0 && iAviso > 0 && iAviso < iVer, "status concluída + passada incompleta: o papel avisa, antes do veredito");
  const motorFinding = finding({ tier: "principal", origem: "regra", motor: {
    version: ENGINE_FINDING_VERSION, state: "rejected", proposition: "Regra contestada.", premises: [{ id: "p1", statement: "mesmo projeto", status: "refuted" }],
    references: [{ role: "refutes", documentId: "d", revisionId: "r", fileName: "capa.pdf", page: 2, start: 0, end: 5, quote: "Exemplo" }],
    consequence: null, suggestedAction: null, limits: [], contestedPremises: ["p1"], origin: { kind: "rule", ruleId: "identidade" }, lineage: null,
  } });
  const papel = blocosDoParecer(report({ incongruencias: [motorFinding, finding({ id: "INC-2", tier: "principal" })] }));
  const rotulos = papel.filter(b => b.estilo === "rotulo").map(b => b.texto);
  assert.equal(rotulos.filter(r => r === "ESTADO E LIMITES").length, 1, "só o achado do motor ganha o bloco");
  const estado = papel[papel.findIndex(b => b.texto === "ESTADO E LIMITES") + 1].texto;
  assert.match(estado, /Regra com premissa contestada — revisar/);
  assert.match(estado, /premissa contestada: mesmo projeto/);
});

await test("R10: estrutura aninhada corrompida vira integridade não verificada — sem quebrar tela/exportação, nunca liberado", () => {
  const good = motor();
  const corrupt: Array<[string, unknown]> = [
    ["cobertura só com status", { ...good, coverage: { status: "complete" } }],
    ["revisions ausente", { ...good, coverage: { ...good.coverage, revisions: undefined } }],
    ["revisão sem números", { ...good, coverage: { ...good.coverage, revisions: [{ revisionId: "x" }] } }],
    ["status fora do enum", { ...good, coverage: { ...good.coverage, status: "ok" } }],
    ["razão > 1", { ...good, coverage: { ...good.coverage, completedRatio: 7 } }],
    ["visualPending não array", { ...good, coverage: { ...good.coverage, revisions: good.coverage.revisions.map(r => ({ ...r, visualPending: "1" })) } }],
  ];
  for (const [name, m] of corrupt) {
    const r = report({ motor: m as EngineReportV1 });
    const a = avaliarEmissao(r); // não lança
    assert.notEqual(a.estado, "liberado", name);
    assert.notEqual(a.estado, "liberado_com_ressalvas", name);
    assert(a.pendencias.some(p => /ilegível/.test(p)), name);
    makeTextReport(r); blocosDoParecer(r); buildAuditGraph(r);
  }
});

await test("R10: achado do motor corrompido ou contagem incoerente bloqueiam; legado válido segue igual", () => {
  const bad = finding({ motor: { version: ENGINE_FINDING_VERSION, state: "confirmed", proposition: "x", premises: [], references: [{ role: "supports", documentId: "d", revisionId: "r", fileName: "f", page: 1, start: 9, end: 2, quote: "q" }],
    consequence: null, suggestedAction: null, limits: [], contestedPremises: [], origin: { kind: "relation", ruleId: null }, lineage: null } as never });
  const a = avaliarEmissao(report({ motor: motor(), incongruencias: [bad], total_incongruencias: 1 }));
  assert(a.pendencias.some(p => /ilegível/.test(p)), JSON.stringify(a.pendencias));
  const incoerente = avaliarEmissao(report({ motor: motor({ counts: { confirmed: 3, inconclusive: 0, rejectedRules: 0, operationalFailures: 0 } }) }));
  assert(incoerente.pendencias.some(p => /não confere/.test(p)));
  assert.notEqual(incoerente.estado, "liberado");
  assert.equal(avaliarEmissao(report()).estado, avaliarEmissao(report()).estado, "legado sem motor continua lido");
  assert.equal(avaliarEmissao(report({ motor: motor() })).estado, "liberado", "relatório íntegro e completo continua liberável");
});

console.log(`${passed} testes do veredito único passaram. Nenhuma chamada de rede.`);
