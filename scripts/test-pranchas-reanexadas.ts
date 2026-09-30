/**
 * Reanexar as mesmas pranchas numa conversa com documentos só devolve os bytes.
 *
 *   node scripts/test-pranchas-reanexadas.ts
 */
import assert from "node:assert/strict";

import {
  pranchasJaLidas,
  temDocumentosGerados,
} from "../modules/nexo/lib/pranchas-reanexadas.ts";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FALHOU  ${name}`);
    throw err;
  }
}

const folhas = (fileName: string, pageCount: number, paginas = pageCount) =>
  Array.from({ length: paginas }, (_, i) => ({ fileName, pageNumber: i + 1, pageCount }));

const selos = [...folhas("his.pdf", 3), ...folhas("inc.pdf", 1)];

test("as mesmas pranchas, todas as páginas lidas: é reanexo", () => {
  assert.equal(pranchasJaLidas(["his.pdf", "inc.pdf"], selos), true);
});

test("só parte das pranchas de antes também é reanexo", () => {
  assert.equal(pranchasJaLidas(["inc.pdf"], selos), true);
});

test("um arquivo novo no lote manda tudo para a leitura normal", () => {
  assert.equal(pranchasJaLidas(["his.pdf", "spd.pdf"], selos), false);
});

test("página faltando no que foi lido: não é reanexo", () => {
  assert.equal(pranchasJaLidas(["his.pdf"], folhas("his.pdf", 3, 2)), false);
});

test("lote vazio não é reanexo", () => {
  assert.equal(pranchasJaLidas([], selos), false);
});

test("documentos gerados: capa, LD, separatriz ou volume", () => {
  assert.equal(temDocumentosGerados([{ kind: "ld" }]), true);
  assert.equal(temDocumentosGerados([{ kind: "auditoria" }]), false);
  assert.equal(temDocumentosGerados([]), false);
});

console.log(`\n${passed} teste(s) passaram.`);
