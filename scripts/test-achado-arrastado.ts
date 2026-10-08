/**
 * O achado arrastado da fila para o chat: a conversão da linha e a pergunta
 * montada, lida de volta pela bolha. A coreografia (ponteiro, fenda) é DOM e
 * se prova no navegador.
 *
 *   node scripts/test-achado-arrastado.ts   (== npm run test:achado-arrastado)
 */
import assert from "node:assert/strict";

import { achadoParaArrastar, lerPerguntaSobreAchado, textoDaPergunta } from "../lib/pergunta-sobre-achado.ts";

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

test("a página da linha vira número", () => {
  assert.deepEqual(achadoParaArrastar({ id: "ACH-014", titulo: "Área divergente", nivel: "block", pagina: "12" }), { id: "ACH-014", titulo: "Área divergente", nivel: "block", pagina: 12 });
});

test("página ausente ou lixo vira null", () => {
  assert.equal(achadoParaArrastar({ id: "ACH-001", titulo: "x", nivel: "note", pagina: null }).pagina, null);
  assert.equal(achadoParaArrastar({ id: "ACH-002", titulo: "x", nivel: "note", pagina: "s/n" }).pagina, null);
  assert.equal(achadoParaArrastar({ id: "ACH-003", titulo: "x", nivel: "note", pagina: "0" }).pagina, null);
});

test("a pergunta montada no chat é lida de volta pela bolha", () => {
  const a = achadoParaArrastar({ id: "ACH-014", titulo: "Área divergente", nivel: "decide", pagina: 3 });
  const lida = lerPerguntaSobreAchado(textoDaPergunta(a, a.pagina, "qual página está certa?"));
  assert.deepEqual(lida, { id: "ACH-014", titulo: "Área divergente", nivel: "decide", pagina: 3, pergunta: "qual página está certa?" });
});

test("sem nível, a pergunta sai na forma antiga e ainda é lida", () => {
  const lida = lerPerguntaSobreAchado(textoDaPergunta({ id: "ACH-007", titulo: "t", nivel: null }, null, "por quê?"));
  assert.deepEqual(lida, { id: "ACH-007", titulo: "t", nivel: null, pagina: null, pergunta: "por quê?" });
});

console.log(`\n${passed} passaram`);
