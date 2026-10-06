/**
 * Quais campos da capa acendem antes de gerar. Núcleo PURO → node cru:
 *
 *   node scripts/test-nexo-destaques-do-frame.ts   (== npm run test:nexo:destaques-do-frame)
 */
import assert from "node:assert/strict";

import { destaquesDoFrame } from "../modules/nexo/lib/destaques-do-frame.ts";

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

const campos = [
  { marcador: "NOME_OBRA", rotulo: "Obra" },
  { marcador: "TITULO_CAPA", rotulo: "Título" },
  { marcador: "VOLUME", rotulo: "Volume" },
  { marcador: "TOMO", rotulo: "Tomo", derivadoDe: "da divisão" },
  { marcador: "MES_ANO", rotulo: "Data", derivadoDe: "do mês corrente" },
];

test("o que falta decidir acende âmbar", () => {
  const d = destaquesDoFrame({ campos, valores: {}, derivados: {}, faltas: ["VOLUME"] });
  assert.equal(d.VOLUME, "falta");
});

test("sugerido: editável com derivado e sem decisão", () => {
  const d = destaquesDoFrame({ campos, valores: {}, derivados: { TITULO_CAPA: "PROJETO ESTRUTURAL" }, faltas: [] });
  assert.equal(d.TITULO_CAPA, "sugerido");
});

test("decidido à mão não acende", () => {
  const d = destaquesDoFrame({ campos, valores: { TITULO_CAPA: "X" }, derivados: { TITULO_CAPA: "Y" }, faltas: [] });
  assert.equal(d.TITULO_CAPA, undefined);
});

test("derivado fixo (tomo, data) não acende — não é editável aqui", () => {
  const d = destaquesDoFrame({ campos, valores: {}, derivados: { TOMO: "TOMO 01", MES_ANO: "OUTUBRO/2026" }, faltas: [] });
  assert.deepEqual(d, {});
});

test("falta vence sugerido", () => {
  const d = destaquesDoFrame({ campos, valores: {}, derivados: { VOLUME: "do arquivo" }, faltas: ["VOLUME"] });
  assert.equal(d.VOLUME, "falta");
});

console.log(`\n${passed} teste(s) dos destaques do frame OK`);
