/**
 * As faixas do grifo: os retalhos de uma linha viram uma faixa só.
 *
 *   node scripts/test-faixas-do-grifo.ts   (== npm run test:faixas-do-grifo)
 */
import assert from "node:assert/strict";

import { faixasPorLinha } from "../lib/faixas-do-grifo.ts";

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

const SEM_FOLGA = { x: 0, y: 0 };

test("quatro retalhos da mesma linha viram uma faixa, sem buraco", () => {
  const faixas = faixasPorLinha(
    [
      { x: 10, y: 100, w: 30, h: 10 },
      { x: 44, y: 100, w: 12, h: 10 },
      { x: 60, y: 101, w: 50, h: 9 },
      { x: 114, y: 100, w: 6, h: 10 },
    ],
    SEM_FOLGA,
  );
  assert.equal(faixas.length, 1);
  assert.deepEqual(faixas[0], { x: 10, y: 100, w: 110, h: 10 });
});

test("o trecho que quebra a linha vira duas faixas, na ordem de leitura", () => {
  const faixas = faixasPorLinha(
    [
      { x: 10, y: 120, w: 40, h: 10 },
      { x: 200, y: 100, w: 80, h: 10 },
    ],
    SEM_FOLGA,
  );
  assert.equal(faixas.length, 2);
  assert.equal(faixas[0].y, 100);
  assert.equal(faixas[1].y, 120);
});

test("linhas coladas (entrelinha apertada) não se fundem", () => {
  const faixas = faixasPorLinha(
    [
      { x: 10, y: 100, w: 40, h: 10 },
      { x: 10, y: 108, w: 40, h: 10 },
    ],
    SEM_FOLGA,
  );
  assert.equal(faixas.length, 2);
});

test("a folga é proporcional à altura da linha", () => {
  const [f] = faixasPorLinha([{ x: 100, y: 100, w: 50, h: 10 }], { x: 0.2, y: 0.1 });
  assert.deepEqual(f, { x: 98, y: 99, w: 54, h: 12 });
});

test("caixa vazia (span sem largura) é ignorada", () => {
  assert.deepEqual(faixasPorLinha([{ x: 10, y: 10, w: 0, h: 10 }]), []);
});

console.log(`\n${passed} ok`);
