/**
 * A SIGLA DO ACHADO: ACH na tela, INC gravado.
 *
 *   node scripts/test-rotulo-do-achado.ts
 */
import assert from "node:assert/strict";

import {
  achadoComRotulos,
  idDoAchado,
  rotuloDoAchado,
  textoComRotulos,
} from "../lib/rotulo-do-achado.ts";

let passed = 0;
function test(nome: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${nome}`);
  } catch (err) {
    console.error(`FALHOU  ${nome}`);
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

test("o id gravado aparece como ACH", () => {
  assert.equal(rotuloDoAchado("INC-014"), "ACH-014");
  assert.equal(rotuloDoAchado("INC-1234"), "ACH-1234");
});

test("id que não é de achado passa como veio", () => {
  assert.equal(rotuloDoAchado("AUD-007"), "AUD-007");
  assert.equal(rotuloDoAchado("abc"), "abc");
  assert.equal(rotuloDoAchado(undefined), undefined);
});

test("no texto do Nexo, a referência vira ACH", () => {
  assert.equal(
    textoComRotulos("A ocorrência foi consolidada no INC-019. Tratar ambas pelo INC-019."),
    "A ocorrência foi consolidada no ACH-019. Tratar ambas pelo ACH-019.",
  );
});

test("prancha de incêndio citada (INC-01) NÃO vira achado", () => {
  assert.equal(textoComRotulos("ver prancha INC-01 e INC-02"), "ver prancha INC-01 e INC-02");
});

test("o que a pessoa digita volta ao id gravado, nas duas formas", () => {
  assert.equal(idDoAchado("ACH-014"), "INC-014");
  assert.equal(idDoAchado("ach-14"), "INC-014");
  assert.equal(idDoAchado(" INC-014 "), "INC-014");
  assert.equal(idDoAchado("outra-coisa"), "outra-coisa");
});

test("ida e volta: rótulo de um id gravado volta ao mesmo id", () => {
  for (const id of ["INC-001", "INC-099", "INC-1000"]) {
    assert.equal(idDoAchado(rotuloDoAchado(id)), id);
  }
});

test("o achado inteiro sai com ACH, sem tocar a evidência e sem mutar o original", () => {
  const original = {
    id: "INC-052",
    tipo: "Achado duplicado",
    descricao: "A ocorrência foi consolidada no INC-019.",
    evidencia: "ver prancha INC-001 do preventivo",
  };
  const lido = achadoComRotulos(original);
  assert.equal(lido.id, "ACH-052");
  assert.equal(lido.descricao, "A ocorrência foi consolidada no ACH-019.");
  assert.equal(lido.evidencia, "ver prancha INC-001 do preventivo", "citação do memorial é intocável");
  assert.equal(original.id, "INC-052");
});

console.log(`\n${passed} teste(s) ok`);
