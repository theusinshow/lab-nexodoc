/**
 * O QUE HÁ DE NOVO: quais novidades acendem o sino. Puro → node cru.
 *
 *   node scripts/test-novidades.ts   (== npm run test:novidades)
 */
import assert from "node:assert/strict";

import { dataCurta, marcaDeVisto, naoVistas, NOVIDADES, type Novidade } from "../lib/novidades.ts";

let passed = 0;
function test(nome: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${nome}`);
  } catch (err) {
    console.error(`FALHOU  ${nome}`);
    console.error(err);
    process.exitCode = 1;
  }
}

const lista: Novidade[] = [
  { id: "2026-10-09-c", titulo: "C", linha: "" },
  { id: "2026-10-09-b", titulo: "B", linha: "" },
  { id: "2026-09-01-a", titulo: "A", linha: "" },
];

test("só as depois da última vista", () => {
  assert.deepEqual(naoVistas(lista, "2026-10-09-b", "2026-10-09").map((n) => n.titulo), ["C"]);
  assert.deepEqual(naoVistas(lista, "2026-10-09-c", "2026-10-09"), []);
});

test("quem nunca abriu vê só as dos últimos 14 dias", () => {
  assert.deepEqual(naoVistas(lista, null, "2026-10-10").map((n) => n.titulo), ["C", "B"]);
});

test("abrir o sino marca a mais nova", () => {
  assert.equal(marcaDeVisto(lista), "2026-10-09-c");
  assert.equal(marcaDeVisto([]), null);
});

test("a lista publicada: ids únicos, mais nova primeiro, data válida", () => {
  const ids = NOVIDADES.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids].sort().reverse(), ids);
  for (const id of ids) assert.match(id, /^\d{4}-\d{2}-\d{2}[a-z]-[a-z0-9-]+$/);
  for (const n of NOVIDADES) assert.ok(n.titulo && n.linha, n.id);
});

test("data curta", () => {
  assert.equal(dataCurta("2026-10-09-x"), "9 de out.");
});

console.log(`\n${passed} ok`);
