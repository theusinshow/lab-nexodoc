/**
 * AS PARTIDAS DO NEXO — sem navegador.
 *
 *   node scripts/test-partidas.ts   (== npm run test:partidas)
 */
import assert from "node:assert/strict";

import { INTENCOES_DE_LINK } from "../lib/contexto-da-url.ts";
import {
  INTENCOES_SO_DE_LINK,
  PARTIDAS,
  faltaInsumo,
  partidaPorId,
} from "../modules/nexo/lib/partidas.ts";

let passed = 0;
function test(nome: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${nome}`);
}

test("sao tres partidas, e cada uma tem id, rotulo e frase", () => {
  assert.equal(PARTIDAS.length, 3);
  for (const p of PARTIDAS) {
    assert.ok(p.id && p.rotulo && p.frase, JSON.stringify(p));
  }
});

test("os ids sao unicos — a URL nao pode ser ambigua", () => {
  assert.equal(new Set(PARTIDAS.map((p) => p.id)).size, PARTIDAS.length);
});

test("o parametro da rota encontra a partida", () => {
  assert.equal(partidaPorId("auditar")?.frase, "audita o memorial");
  assert.equal(
    partidaPorId(" MONTAR ")?.id,
    "montar",
    "espaco e caixa nao podem quebrar um link",
  );
});

test("intencao desconhecida nao vira partida — link velho nao inventa pedido", () => {
  assert.equal(partidaPorId("seja-la-o-que-for"), null);
  assert.equal(partidaPorId(null), null);
  assert.equal(partidaPorId(""), null);
});

test("com o insumo em maos, nao falta nada", () => {
  assert.equal(
    faltaInsumo(partidaPorId("auditar")!, { pranchas: false, memorial: true }),
    false,
  );
  assert.equal(
    faltaInsumo(partidaPorId("montar")!, { pranchas: true, memorial: false }),
    false,
  );
});

test("e cada partida olha para o SEU insumo, nao para qualquer anexo", () => {
  // Ter pranchas nao habilita auditar um memorial: o beco seria o mesmo.
  assert.equal(
    faltaInsumo(partidaPorId("auditar")!, { pranchas: true, memorial: false }),
    true,
  );
  assert.equal(
    faltaInsumo(partidaPorId("conferir")!, { pranchas: false, memorial: true }),
    true,
  );
});

test("G03: ld e capa sao intencoes de LINK, nao chips — e o contexto da URL as conhece", () => {
  assert.equal(partidaPorId("ld")?.frase, "cria a LD dessas pranchas");
  assert.equal(partidaPorId("CAPA")?.frase, "cria a capa dessas pranchas");
  assert.ok(!PARTIDAS.some((p) => p.id === "ld" || p.id === "capa"), "nao viram chip");
  for (const p of [...PARTIDAS, ...INTENCOES_SO_DE_LINK]) {
    assert.ok((INTENCOES_DE_LINK as readonly string[]).includes(p.id), p.id);
  }
});

console.log(`\n${passed} ok`);
