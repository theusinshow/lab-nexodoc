/**
 * Fatos e contexto do projeto sem fabricar autoridade (P3.3). Sem rede, sem banco.
 *
 *   node --import ./scripts/lib/resolver-de-imports.mjs scripts/test-audit-engine-facts.ts
 */
import assert from "node:assert/strict";
import { verifyRef, type Fact, type RevisionText } from "../lib/audit-engine/contracts.ts";
import { convert, extractFacts, parseNumber } from "../lib/audit-engine/facts.ts";
import {
  buildProjectContext, confirmationBlockers, expectedProduct, type ProjectContext, type Relation,
} from "../lib/audit-engine/relations.ts";
import { ALL_FIXTURES, cleanDoc, clauseAndException, revision, specR0, specR1, tableDoc } from "./audit-engine-fixtures/index.ts";

let passed = 0;
async function test(name: string, fn: () => unknown) { await fn(); passed++; console.log(`OK ${name}`); }

function contextOf(...corpus: RevisionText[]): ProjectContext {
  return buildProjectContext(corpus, corpus.flatMap(rt => extractFacts(rt).facts));
}
const byAttr = (ctx: ProjectContext, attribute: string) => ctx.facts.filter(f => f.attribute === attribute);
const same = (ctx: ProjectContext) => ctx.relations.filter((r): r is Extract<Relation, { kind: "same_attribute" }> => r.kind === "same_attribute");
const blockers = (ctx: ProjectContext, r: Relation) => confirmationBlockers(r, ctx);

await test("números pt-BR e unidades: literal guardado, conversão só entre pares suportados", () => {
  assert.deepEqual(parseNumber("1.234,5"), { value: 1234.5, note: null });
  assert.deepEqual(parseNumber("420,5"), { value: 420.5, note: null });
  assert.equal(parseNumber("1.800")?.value, 1800);
  assert.match(parseNumber("1.800")?.note ?? "", /milhar/);
  assert.equal(parseNumber("14.38")?.value, 14.38);
  assert.match(parseNumber("14.38")?.note ?? "", /decimal/);
  assert.equal(parseNumber("−2,5")?.value, -2.5);
  assert.equal(parseNumber("1,2,3"), null);
  assert.equal(convert(15, "m³", "L"), 15000);
  assert.equal(convert(2.4, "kW", "W"), 2400);
  assert.equal(convert(100, "mm", "m"), 0.1);
  assert.equal(convert(1, "m²", "m"), null);
  assert.equal(convert(1, "furlong", "m"), null);
  const rt = revision("u", "u.pdf", ["Vazão de 3 gal/min no ramal. Comprimento do ramal 2: 12 m."]);
  const facts = extractFacts(rt).facts;
  assert(!facts.some(f => f.literal.includes("gal")), "unidade desconhecida não vira fato quantitativo");
  assert(facts.some(f => f.unit === "m" && f.normalized === 12));
});

await test("todo fato tem fonte rastreável que verifica na revisão", () => {
  for (const rt of ALL_FIXTURES) {
    for (const f of extractFacts(rt).facts) {
      assert.equal(f.revisionId, rt.revision.revisionId);
      assert(f.refs.length > 0);
      for (const ref of f.refs) assert.equal(verifyRef(ref, ALL_FIXTURES), "ok", `${f.attribute}: ${ref.quote}`);
      assert(f.refs[0].quote.includes(f.literal) || f.literal === f.refs[0].quote || f.attribute.startsWith("excecao") || f.attribute.startsWith("remissao"));
    }
  }
});

await test("conflito real no mesmo escopo não tem bloqueio; renomear e variar números não muda", () => {
  for (const [name, a, b] of [["alfa.pdf", "12.000", "15.000"], ["zeta-final.pdf", "8,5", "9,0"], ["x.pdf", "3.300", "2.200"]]) {
    const one = revision(`doc-${name}`, name, [`Reservatório inferior com volume útil de ${a} L.`]);
    const two = revision(`outro-${name}`, `copia-${name}`, [`Reservatório inferior com volume útil de ${b} L.`]);
    const ctx = contextOf(one, two);
    const rel = same(ctx);
    assert.equal(rel.length, 1, name);
    assert.equal(rel[0].values, "different");
    assert.equal(rel[0].entityMatch, "same");
    assert.equal(rel[0].revisionLink, "different_documents");
    assert.deepEqual(blockers(ctx, rel[0]), []);
    assert(ctx.openIssues.includes(rel[0].id));
  }
});

await test("L e m³ do mesmo atributo são comparados na mesma base", () => {
  const ctx = contextOf(
    revision("a", "a.pdf", ["Reservatório superior com volume útil de 15 m³."]),
    revision("b", "b.pdf", ["Reservatório superior com volume útil de 15.000 L."]),
  );
  assert.equal(same(ctx)[0].values, "equal");
  assert.deepEqual(blockers(ctx, same(ctx)[0]), ["values_equal"]);
});

await test("nomes próximos de entidades diferentes não se fundem", () => {
  const ctx = contextOf(
    revision("m1", "memorial.pdf", ["Área útil do bloco 1: 420,5 m²."]),
    revision("m2", "memorial.pdf", ["Área útil do bloco 10: 310,0 m²."]),
  );
  assert.deepEqual(byAttr(ctx, "area util").map(f => f.scope.location).sort(), ["bloco 1", "bloco 10"]);
  assert.equal(same(ctx).length, 0);
});

await test("seção de outro sistema não conflita", () => {
  const ctx = contextOf(revision("s", "s.pdf", [
    "Sistema de água fria: pressão estática de 10 mca.\nSistema de combate a incêndio: pressão estática de 40 mca.",
  ]));
  assert.deepEqual(byAttr(ctx, "pressao estatica").map(f => f.scope.system).sort(), ["agua fria", "combate a incendio"]);
  assert.equal(same(ctx).length, 0);
});

await test("total versus parcela não é conflito", () => {
  const ctx = contextOf(revision("t", "t.pdf", ["Ocupação do sanitário A: 3 usuários.", "Ocupação total do prédio: 4 usuários."]));
  const occ = byAttr(ctx, "ocupacao");
  assert.equal(occ.length, 2);
  assert.deepEqual(occ.map(f => f.scope.aggregate ?? f.scope.location).sort(), ["sanitario a", "total"]);
  assert.equal(same(ctx).length, 0);
});

await test("fato de escopo ambíguo impede confirmação automática", () => {
  const ctx = contextOf(
    revision("x", "x.pdf", ["O volume útil de 12.000 L atende a demanda."]),
    revision("y", "y.pdf", ["Reservatório inferior com volume útil de 15.000 L."]),
  );
  const rel = same(ctx);
  assert.equal(rel.length, 1);
  assert.equal(rel[0].entityMatch, "ambiguous");
  assert(blockers(ctx, rel[0]).includes("ambiguous_entity"));
  assert(ctx.openIssues.includes(rel[0].id));
});

await test("revisões: sem vínculo declarado fica aberto; com vínculo declarado não é conflito", () => {
  const r0 = revision("spec", "spec.pdf", ["Reservatório superior com volume útil de 9.000 L."]);
  const r1 = revision("spec", "spec (1).pdf", ["Reservatório superior com volume útil de 11.000 L."]);
  const undeclared = contextOf(r0, r1);
  const u = same(undeclared)[0];
  assert.equal(u.revisionLink, "undeclared_revisions");
  assert(blockers(undeclared, u).includes("undeclared_revision_precedence"));
  assert(undeclared.openIssues.includes(u.id));
  assert(!undeclared.relations.some(r => r.kind === "supersedes"), "nome de arquivo e ordem não criam precedência");

  const declared = contextOf(specR0, specR1);
  const d = same(declared).find(r => byAttr(declared, "volume util").some(f => f.id === r.factIds[0]))!;
  assert.equal(d.revisionLink, "superseded");
  assert(blockers(declared, d).includes("superseded_revision"));
  assert(!declared.openIssues.includes(d.id));
  assert(declared.relations.some(r => r.kind === "supersedes" && r.from === specR1.revision.revisionId && r.basis === "declared_in_document"));
});

await test("cabeçalho repetido não elege valor; menção divergente fica aberta", () => {
  const header = "PREFEITURA MUNICIPAL DE VALE AZUL\nSECRETARIA DE OBRAS";
  const ctx = contextOf(revision("h", "h.pdf", [
    `${header}\nMemorial.`, `${header}\nEspecificações.`, `${header}\nA obra fica no município de Serra Clara.`,
  ]));
  const rel = ctx.relations.find((r): r is Extract<Relation, { kind: "identity_mentions" }> => r.kind === "identity_mentions" && r.attribute === "identidade.municipio")!;
  assert.equal(rel.factIds.length, 4);
  assert.deepEqual(rel.values, ["serra clara", "vale azul"]);
  assert(ctx.openIssues.includes(rel.id), "três cabeçalhos contra uma menção não é maioria que decide");
  const clean = contextOf(revision("h2", "h2.pdf", [`${header}\nA.`, `${header}\nB.`]));
  const one = clean.relations.find(r => r.kind === "identity_mentions" && r.attribute === "identidade.municipio")!;
  assert(!clean.openIssues.includes(one.id));
});

await test("documento modelo citado como exemplo não gera conflito confirmável", () => {
  const ctx = contextOf(revision("e", "e.pdf", [
    "Prefeitura Municipal de Porto Novo.\nExemplo de preenchimento: Prefeitura Municipal de Cidade Modelo.",
  ]));
  const rel = ctx.relations.find(r => r.kind === "identity_mentions" && r.attribute === "identidade.municipio")!;
  assert(blockers(ctx, rel).includes("example_context"));
  assert(ctx.facts.some(f => f.conditions.includes("citado como exemplo")));
});

await test("tabela: célula vira fato com cabeçalho; linha deslocada vira aviso, não coluna errada", () => {
  const ok = extractFacts(tableDoc);
  const power = ok.facts.filter(f => f.attribute === "potencia");
  assert.deepEqual(power.map(f => [f.entity, f.normalized, f.unit]), [["c1", 1800, "W"], ["c2", 2400, "W"]]);
  assert.deepEqual(power[1].refs[0].table, { tableId: `${tableDoc.revision.revisionId}:p1:t0`, row: 2, column: 1, headers: ["Circuito", "Potência (W)", "Tensão (V)"] });
  assert(power.every(f => /milhar/.test(f.normalizationNote ?? "")));
  const shifted = revision("q2", "quadro.pdf", ["[TABELA]\nCircuito | Potência (W) | Tensão (V)\nC1 | 1.800 | 220\nC2 | 2.400\nC3 | 900 | 127\n[/TABELA]"]);
  const r = extractFacts(shifted);
  assert.deepEqual(r.warnings.map(w => [w.row, w.reason]), [[2, "cell_count_mismatch"]]);
  assert(!r.facts.some(f => f.entity === "c2"), "linha com célula faltando não atribui 2.400 a nenhuma coluna");
  assert.deepEqual(r.facts.filter(f => f.entity === "c3").map(f => [f.attribute, f.normalized]), [["potencia", 900], ["tensao", 127]]);
});

await test("regra e exceção distante são ligadas pela cláusula, não pela página", () => {
  const ctx = contextOf(clauseAndException);
  const exc = ctx.relations.find((r): r is Extract<Relation, { kind: "rule_exception" }> => r.kind === "rule_exception")!;
  assert.equal(exc.resolution, "resolved");
  const rule = ctx.facts.find(f => f.id === exc.ruleFactIds[0])!;
  assert.equal(rule.scope.clause, "art 2");
  assert.equal(rule.refs[0].page, 1);
  const excFact = ctx.facts.find(f => f.id === exc.exceptionFactId)!;
  assert.equal(excFact.refs[0].page, 6);
  // Exceção a artigo inexistente fica não resolvida.
  const orphan = contextOf(revision("o", "o.pdf", ["Art. 5º Excetuam-se do art. 4º os drenos de piso."]));
  const o = orphan.relations.find(r => r.kind === "rule_exception")!;
  assert(blockers(orphan, o).includes("unresolved_target"));
});

await test("premissa → cálculo é relação, não conclusão; escopo parcial fica ambíguo", () => {
  const loose = contextOf(cleanDoc);
  const calc = loose.relations.find((r): r is Extract<Relation, { kind: "premise_calculation" }> => r.kind === "premise_calculation")!;
  assert.equal(calc.entityMatch, "ambiguous", "densidade sem local declarado");
  assert.equal(expectedProduct(calc, loose.facts), 180);
  const scoped = contextOf(revision("c", "c.pdf", [
    "Área da sala técnica: 14,50 m². Densidade da sala técnica: 20 W/m². Carga de iluminação da sala técnica: 362,5 W.",
  ]));
  const c2 = scoped.relations.find((r): r is Extract<Relation, { kind: "premise_calculation" }> => r.kind === "premise_calculation")!;
  assert.equal(c2.entityMatch, "same");
  assert.equal(expectedProduct(c2, scoped.facts), 290);
  assert.deepEqual(blockers(scoped, c2), [], "a relação segue para investigação; a divergência (fator 1,25?) não é decidida aqui");
});

await test("rótulo de revisão só diverge dentro da mesma revisão; revisão substituída não disputa identidade", () => {
  const across = contextOf(specR0, specR1);
  const rev = across.relations.filter(r => r.kind === "identity_mentions" && r.attribute === "identidade.revisao");
  assert(rev.every(r => !across.openIssues.includes(r.id)), "R0 numa revisão e R1 na outra é o normal");
  const inside = contextOf(revision("r", "r.pdf", ["Revisão R2.", "Revisão R3."]));
  const one = inside.relations.find(r => r.kind === "identity_mentions" && r.attribute === "identidade.revisao")!;
  assert(inside.openIssues.includes(one.id), "a mesma revisão declarando dois rótulos é suspeita");
});

await test("remissão a seção só com texto encontra o alvo pelo rótulo", () => {
  const ctx = contextOf(revision("s", "s.pdf", ["Ver detalhe, conforme item 7.3 deste caderno.", "Item 7.3 Caixas de inspeção em alvenaria."]));
  const ref = ctx.relations.find((r): r is Extract<Relation, { kind: "reference" }> => r.kind === "reference")!;
  assert.equal(ref.resolution, "resolved");
  assert.equal(ctx.facts.find(f => f.id === ref.targetFactIds[0])?.refs[0].page, 2);
});

await test("sem escopo nos dois lados não é relação; cálculo sem escopo só na mesma página", () => {
  const unscoped = contextOf(revision("u", "u.pdf", ["Espessura de 2 cm no rodapé.", "Espessura de 30 cm na parede."]));
  assert.equal(same(unscoped).length, 0, "medida de elementos sem escopo não se compara");
  const samePage = contextOf(revision("c", "c.pdf", ["Área útil: 10,00 m². Densidade: 10 W/m². Carga: 150 W."]));
  assert.equal(samePage.relations.filter(r => r.kind === "premise_calculation").length, 1);
  const split = contextOf(revision("c2", "c2.pdf", ["Área útil: 10,00 m².", "Densidade: 10 W/m².", "Carga: 150 W."]));
  assert.equal(split.relations.filter(r => r.kind === "premise_calculation").length, 0);
});

await test("identidade compara sem pontuação e palavra solta; captura duvidosa fica fora do conflito; remissão exige número", () => {
  const ctx = contextOf(revision("id", "id.pdf", ["Prefeitura Municipal de Rio Verde em", "Município de RIO VERDE.", "Obra: 312,50 m² de área construída"]));
  const mun = ctx.relations.find(r => r.kind === "identity_mentions" && r.attribute === "identidade.municipio")!;
  assert.equal(mun.kind === "identity_mentions" && mun.values.length, 1, "mesma cidade com pontuação e 'em' solto");
  assert(ctx.facts.some(f => f.attribute === "identidade.obra" && f.conditions.includes("captura duvidosa")));
  const refs = contextOf(revision("r", "r.pdf", ["Ver detalhe em planta.", "Conforme item 4.2 do caderno."])).facts.filter(f => f.attribute === "remissao");
  assert.deepEqual(refs.map(f => f.normalized), ["item 4 2"]);
});

await test("contexto não escolhe identidade, local nem revisão vigente", () => {
  const ctx = contextOf(...ALL_FIXTURES);
  const keys = Object.keys(ctx).sort();
  assert.deepEqual(keys, ["facts", "openIssues", "relations", "saturated"]);
  assert.equal(ctx.saturated, false);
  const ids = new Set(ctx.facts.map((f: Fact) => f.id));
  assert.equal(ids.size, ctx.facts.length, "IDs de fato estáveis e únicos");
});

console.log(`${passed} testes de fatos e contexto passaram. Nenhuma chamada de rede.`);
