/**
 * O ESTADO DA CARGA DO ADMIN — sem navegador (auditoria UX/UI, P02 / T13).
 *
 *   node scripts/test-estado-da-carga.ts   (== npm run test:estado-da-carga)
 */
import assert from "node:assert/strict";

import {
  classificarFalha,
  faseDaCarga,
  fraseDaFalha,
  valorOuTraco,
} from "../lib/estado-da-carga.ts";

let passed = 0;
function test(nome: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${nome}`);
}

const base = { restaurado: true, token: "", carregando: false, erro: null, temDados: false };

test("sem token: sem-token, e não 'vazio'", () => {
  assert.equal(faseDaCarga(base), "sem-token");
  assert.equal(faseDaCarga({ ...base, restaurado: false, token: "x" }), "sem-token");
});

test("com token e sem resposta ainda: carregando", () => {
  assert.equal(faseDaCarga({ ...base, token: "t" }), "carregando");
  assert.equal(faseDaCarga({ ...base, token: "t", carregando: true, temDados: true }), "carregando");
});

test("resposta válida: ok", () => {
  assert.equal(faseDaCarga({ ...base, token: "t", temDados: true }), "ok");
});

test("erro vence dados antigos — que continuam, mas a fase diz erro", () => {
  assert.equal(faseDaCarga({ ...base, token: "t", temDados: true, erro: "rede" }), "erro");
});

test("classificação: 401/403 negado, 5xx servidor, lançou rede, 2xx ilegível formato", () => {
  assert.equal(classificarFalha({ status: 401 }), "negado");
  assert.equal(classificarFalha({ status: 403 }), "negado");
  assert.equal(classificarFalha({ status: 500 }), "servidor");
  assert.equal(classificarFalha({ status: 404 }), "servidor");
  assert.equal(classificarFalha("rede"), "rede");
  assert.equal(classificarFalha({ status: 200 }), "formato");
});

test("frases dizem o que fazer e não afirmam configuração", () => {
  assert.match(fraseDaFalha("negado"), /token/);
  assert.match(fraseDaFalha("rede"), /tente de novo/);
  assert.doesNotMatch(fraseDaFalha("servidor"), /DATABASE_URL/);
});

test("métrica sem resposta é traço, nunca zero", () => {
  assert.equal(valorOuTraco(null, () => 0), "—");
  assert.equal(valorOuTraco({ n: 0 }, (d) => d.n), "0");
  assert.equal(valorOuTraco({ n: 1234 }, (d) => d.n), "1.234");
});

console.log(`\n${passed} testes ok`);
