/**
 * Os trechos de uma evidência, um por página. Núcleo PURO → node cru.
 *
 *   node scripts/test-trechos-da-evidencia.ts   (== npm run test:trechos-da-evidencia)
 */
import assert from "node:assert/strict";

import { paginasEmConflito, trechosDaEvidencia } from "../lib/trechos-da-evidencia.ts";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FALHOU  ${name}`);
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

// O formato real de `lib/audit-coherence.ts` (ACH-006, terraplenagem).
const DUAS = 'Pág. 10: "é de responsabilidade da Prefeitura | o trecho" | Pág. 22: "A contratada deverá executar todo movimento de terra"';

test("o confronto de duas páginas vira dois trechos, cada um com a sua página", () => {
  const t = trechosDaEvidencia(DUAS);
  assert.equal(t.length, 2);
  assert.deepEqual(t.map((x) => x.pagina), [10, 22]);
  assert.equal(t[1].texto, "A contratada deverá executar todo movimento de terra");
});

test("a barra DENTRO das aspas não corta o trecho", () => {
  assert.equal(trechosDaEvidencia(DUAS)[0].texto, "é de responsabilidade da Prefeitura | o trecho");
});

test("as aspas da moldura saem; o texto do memorial fica", () => {
  assert.equal(trechosDaEvidencia('Pág. 3: "texto"')[0].texto, "texto");
});

test("evidência de IA, sem moldura, é um trecho só e sem página", () => {
  assert.deepEqual(trechosDaEvidencia("o memorial cita a NBR 9050 de 2004"), [{ pagina: null, texto: "o memorial cita a NBR 9050 de 2004" }]);
});

test("'Pág. N:' no MEIO da frase é citação, não confronto", () => {
  const t = trechosDaEvidencia("conforme a Pág. 3: ver detalhe");
  assert.equal(t.length, 1);
  assert.equal(t[0].pagina, null);
});

test("vazio é nada", () => {
  assert.deepEqual(trechosDaEvidencia(""), []);
  assert.deepEqual(trechosDaEvidencia(undefined), []);
});

test("as páginas em conflito são as DISTINTAS, na ordem", () => {
  assert.deepEqual(paginasEmConflito(DUAS), [10, 22]);
  assert.deepEqual(paginasEmConflito('Pág. 5: "a" | Pág. 5: "b" | Pág. 9: "c"'), [5, 9]);
  assert.deepEqual(paginasEmConflito("sem moldura"), []);
});

console.log(`${passed} teste(s) OK`);
