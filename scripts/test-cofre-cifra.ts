/**
 * A cifra do cofre: ida e volta, adulteração detectada, chave errada recusada.
 *
 *   node scripts/test-cofre-cifra.ts   (== npm run test:cofre-cifra)
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

import { chaveDoCofre, cifrar, decifrar, estaCifrado } from "../lib/cofre-cifra.ts";

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

const chave = randomBytes(32);
const pdf = Buffer.from("%PDF-1.7 memorial da obra 117-25");

test("ida e volta devolve os mesmos bytes", () => {
  const c = cifrar(pdf, chave);
  assert.ok(estaCifrado(c));
  assert.ok(!c.includes(Buffer.from("memorial")));
  assert.deepEqual(decifrar(c, chave), pdf);
});

test("duas gravações do mesmo arquivo não saem iguais (iv aleatório)", () => {
  assert.notDeepEqual(cifrar(pdf, chave), cifrar(pdf, chave));
});

test("um byte trocado vira erro, não arquivo adulterado", () => {
  const c = cifrar(pdf, chave);
  c[c.length - 1] ^= 1;
  assert.throws(() => decifrar(c, chave));
});

test("chave errada não abre", () => {
  assert.throws(() => decifrar(cifrar(pdf, chave), randomBytes(32)));
});

test("texto claro antigo não é confundido com cifrado", () => {
  assert.equal(estaCifrado(pdf), false);
});

test("a chave precisa ter 32 bytes", () => {
  assert.equal(chaveDoCofre(""), null);
  assert.equal(chaveDoCofre(undefined), null);
  assert.equal(chaveDoCofre(chave.toString("base64"))?.length, 32);
  assert.throws(() => chaveDoCofre(randomBytes(16).toString("base64")));
});

console.log(`\n${passed} teste(s) da cifra do cofre OK.`);
