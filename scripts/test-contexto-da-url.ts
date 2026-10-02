/**
 * O CONTEXTO DA URL — sem navegador (auditoria UX/UI, G03 / T01).
 *
 *   node scripts/test-contexto-da-url.ts   (== npm run test:contexto-da-url)
 */
import assert from "node:assert/strict";

import {
  decidirProjeto,
  lerContextoDaUrl,
  linkDoNexo,
  urlMandaNoDestino,
} from "../lib/contexto-da-url.ts";

let passed = 0;
function test(nome: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${nome}`);
}

test("projeto canonico e o legado `project` sao lidos", () => {
  assert.equal(lerContextoDaUrl("?projeto=p1").projeto, "p1");
  assert.equal(lerContextoDaUrl("?project=p2").projeto, "p2");
});

test("com os dois, o canonico vence", () => {
  assert.equal(lerContextoDaUrl("?project=velho&projeto=novo").projeto, "novo");
});

test("valor fora do formato nao vira id (nem seletor nem rota)", () => {
  assert.equal(lerContextoDaUrl("?projeto=../../x").projeto, null);
  assert.equal(lerContextoDaUrl("?conversa=a%20b").conversa, null);
});

test("achado sem auditoria e descartado", () => {
  assert.equal(lerContextoDaUrl("?achado=INC-001").achado, null);
  const c = lerContextoDaUrl("?auditoria=a1&achado=INC-001");
  assert.equal(c.auditoria, "a1");
  assert.equal(c.achado, "INC-001");
});

test("intencao conhecida passa; desconhecida vira null", () => {
  assert.equal(lerContextoDaUrl("?intencao=LD").intencao, "ld");
  assert.equal(lerContextoDaUrl("?intencao=capa").intencao, "capa");
  assert.equal(lerContextoDaUrl("?intencao=apagar-tudo").intencao, null);
});

test("link canonico escreve `projeto`, nunca `project`, e ida e volta fecha", () => {
  const url = linkDoNexo({ projeto: "p9", intencao: "capa" });
  assert.equal(url, "/nexo?projeto=p9&intencao=capa");
  const lido = lerContextoDaUrl(url.split("?")[1]);
  assert.equal(lido.projeto, "p9");
  assert.equal(lido.intencao, "capa");
  assert.equal(linkDoNexo({}), "/nexo");
  // Achado sem auditoria nao e escrito.
  assert.equal(linkDoNexo({ achado: "INC-1" }), "/nexo");
});

test("mensagem livre ida e volta, aparada e com teto", () => {
  const url = linkDoNexo({ mensagem: "  refaz a LD da 063-26 " });
  const lido = lerContextoDaUrl(url.split("?")[1]);
  assert.equal(lido.mensagem, "refaz a LD da 063-26");
  assert.equal(lerContextoDaUrl("?mensagem=").mensagem, null);
  assert.equal(lerContextoDaUrl(`?mensagem=${"a".repeat(900)}`).mensagem?.length, 500);
  assert.equal(urlMandaNoDestino(lido), true);
});

test("destino explicito suprime a restauracao da ultima conversa", () => {
  assert.equal(urlMandaNoDestino(lerContextoDaUrl("")), false);
  for (const q of ["?projeto=b", "?project=b", "?conversa=c", "?auditoria=a", "?intencao=auditar"]) {
    assert.equal(urlMandaNoDestino(lerContextoDaUrl(q)), true, q);
  }
});

test("T01: link do projeto B numa conversa do projeto A e conflito, nao troca", () => {
  assert.deepEqual(decidirProjeto({ pedido: "B", atual: "A" }), {
    tipo: "conflito",
    pedido: "B",
    atual: "A",
  });
  assert.deepEqual(decidirProjeto({ pedido: "B", atual: null }), { tipo: "vincular", projeto: "B" });
  assert.deepEqual(decidirProjeto({ pedido: "B", atual: "B" }), { tipo: "mesmo" });
  assert.deepEqual(decidirProjeto({ pedido: null, atual: "A" }), { tipo: "nenhum" });
});

console.log(`\n${passed} testes ok`);
