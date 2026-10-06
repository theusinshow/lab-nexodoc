/**
 * O progresso da montagem de volume. Núcleo PURO → node cru:
 *
 *   node scripts/test-nexo-progresso-da-montagem.ts   (== npm run test:nexo:progresso-da-montagem)
 */
import assert from "node:assert/strict";

import { faseEmCurso, progressoDoLote, rotuloDaFase } from "../modules/nexo/lib/progresso-da-montagem.ts";

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

test("lote parado: nada em curso, fração zero", () => {
  const p = progressoDoLote([undefined, undefined]);
  assert.equal(p.emCurso, false);
  assert.equal(p.fracao, 0);
  assert.equal(p.atual, -1);
});

test("a barra anda DENTRO do tomo, não só entre tomos", () => {
  const a = progressoDoLote(["preparando", "aguardando"]).fracao;
  const b = progressoDoLote(["juntando", "aguardando"]).fracao;
  const c = progressoDoLote(["conferindo", "aguardando"]).fracao;
  assert.ok(a < b && b < c, `${a} < ${b} < ${c}`);
  assert.ok(c < 0.5, "o segundo tomo ainda não começou");
});

test("contagem de prontos e falhas, e o tomo em curso", () => {
  const p = progressoDoLote(["pronto", "falhou", "juntando", "aguardando"]);
  assert.equal(p.prontos, 1);
  assert.equal(p.falhas, 1);
  assert.equal(p.atual, 2);
  assert.equal(p.emCurso, true);
});

test("fila esperando o primeiro tomo já conta como em curso", () => {
  assert.equal(progressoDoLote(["aguardando", "aguardando"]).emCurso, true);
});

test("tudo pronto: fração 1, nada em curso", () => {
  const p = progressoDoLote(["pronto", "pronto"]);
  assert.equal(p.fracao, 1);
  assert.equal(p.emCurso, false);
});

test("rótulos dizem o que acontece, com a contagem de pranchas", () => {
  assert.equal(rotuloDaFase("juntando", 18), "juntando 18 pranchas");
  assert.equal(rotuloDaFase("juntando", 1), "juntando 1 prancha");
  assert.equal(rotuloDaFase("aguardando"), "na fila");
  assert.equal(rotuloDaFase("conferindo"), "montado — conferindo os carimbos");
});

test("só as fases de trabalho estão em curso", () => {
  assert.equal(faseEmCurso("juntando"), true);
  assert.equal(faseEmCurso("aguardando"), false);
  assert.equal(faseEmCurso("pronto"), false);
  assert.equal(faseEmCurso(undefined), false);
});

console.log(`\n${passed} teste(s) do progresso da montagem OK`);
