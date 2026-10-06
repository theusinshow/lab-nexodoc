/**
 * Os tomos de um volume e o id do volume de cada tomo — a MESMA conta do cartão
 * e do canvas. Núcleo PURO → node cru:
 *
 *   node scripts/test-nexo-tomos-do-volume.ts   (== npm run test:nexo:tomos-do-volume)
 */
import assert from "node:assert/strict";

import { idDoVolume, sufixoDoTomoNoCanvas, tomosDaProposta, tomosDoVolume } from "../modules/nexo/lib/tomos-do-volume.ts";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const r = (kind: string, payload: unknown): any => ({ artifactId: kind, kind, summary: "", payload, files: [] });

test("um tomo só: sufixo vazio, atual 0, número = tomo inicial", () => {
  assert.deepEqual(tomosDaProposta(1, 1), [{ atual: 0, numero: 1, sufixo: "" }]);
});

test("vários tomos: sufixo :tNN pelo número real", () => {
  assert.deepEqual(tomosDaProposta(2, 5), [
    { atual: 1, numero: 5, sufixo: ":t05" },
    { atual: 2, numero: 6, sufixo: ":t06" },
  ]);
});

test("tomosDoVolume lê numTomos/tomoInicial da LD ou da capa", () => {
  assert.equal(tomosDoVolume([r("ld", { numTomos: 3, tomoInicial: 2 })]).length, 3);
  assert.deepEqual(tomosDoVolume([r("capa", { numTomos: 1 })]), [{ atual: 0, numero: 1, sufixo: "" }]);
  assert.deepEqual(tomosDoVolume([]), [{ atual: 0, numero: 1, sufixo: "" }]);
});

test("idDoVolume é o mesmo id do cartão de volume", () => {
  assert.equal(idDoVolume("084-25", ":t02"), "volume:084-25:t02");
  assert.equal(idDoVolume(null, ""), "volume:x");
});

test("no canvas, a fileira 0 é o volume sem divisão", () => {
  assert.equal(sufixoDoTomoNoCanvas(0), "");
  assert.equal(sufixoDoTomoNoCanvas(3), ":t03");
});

console.log(`\n${passed} teste(s) dos tomos do volume OK`);
