/**
 * As faixas do grifo: os retalhos de uma linha viram uma faixa só.
 *
 *   node scripts/test-faixas-do-grifo.ts   (== npm run test:faixas-do-grifo)
 */
import assert from "node:assert/strict";

import { alturasDosPinos, faixasPorLinha, segmentosPorItem } from "../lib/faixas-do-grifo.ts";

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

test("dois achados em itens diferentes ficam cada um com o seu", () => {
  const r = segmentosPorItem([new Map([[1, [[0, 5]]]]), new Map([[2, [[3, 9]]]])]);
  assert.deepEqual(r.get(1), [{ inicio: 0, fim: 5, grifo: 0 }]);
  assert.deepEqual(r.get(2), [{ inicio: 3, fim: 9, grifo: 1 }]);
});

test("na disputa pelo mesmo caractere, o ativo (0) ganha e o outro fica com o resto", () => {
  const r = segmentosPorItem([new Map([[1, [[4, 8]]]]), new Map([[1, [[0, 12]]]])]);
  assert.deepEqual(r.get(1), [
    { inicio: 0, fim: 4, grifo: 1 },
    { inicio: 4, fim: 8, grifo: 0 },
    { inicio: 8, fim: 12, grifo: 1 },
  ]);
});

test("o trecho todo coberto pelo ativo some do outro", () => {
  const r = segmentosPorItem([new Map([[1, [[0, 20]]]]), new Map([[1, [[5, 9]]]])]);
  assert.deepEqual(r.get(1), [{ inicio: 0, fim: 20, grifo: 0 }]);
});

test("grifo que não casou (null) não atrapalha os outros", () => {
  const r = segmentosPorItem([null, new Map([[3, [[0, 2]]]])]);
  assert.deepEqual(r.get(3), [{ inicio: 0, fim: 2, grifo: 1 }]);
});

test("pinos na mesma linha não se cobrem", () => {
  const r = alturasDosPinos([{ grifo: 0, y: 100 }, { grifo: 1, y: 102 }, { grifo: 2, y: 300 }], 20, 4);
  assert.equal(r.get(0), 100);
  assert.equal(r.get(1), 124);
  assert.equal(r.get(2), 300);
});

console.log(`\n${passed} ok`);
