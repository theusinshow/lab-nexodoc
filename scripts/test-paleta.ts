/**
 * A PALETA DE COMANDOS — sem navegador.
 *
 *   node scripts/test-paleta.ts   (== npm run test:paleta)
 */
import assert from "node:assert/strict";

import {
  ACOES_DA_PALETA,
  ACOES_DE_ADMIN,
  filtrarAcoes,
  normalizar,
} from "../modules/nexo/lib/paleta.ts";
import { PARTIDAS } from "../modules/nexo/lib/partidas.ts";

let passed = 0;
function test(nome: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${nome}`);
}

test("as partidas da paleta sao AS MESMAS da entrada", () => {
  const naPaleta = ACOES_DA_PALETA.filter((a) => a.grupo === "Começar");
  assert.equal(naPaleta.length, PARTIDAS.length);
  for (const p of PARTIDAS) {
    assert.ok(
      naPaleta.some((a) => a.frase === p.frase),
      p.id,
    );
  }
});

test("sem texto, a paleta mostra tudo — ela e um indice, nao um quiz", () => {
  assert.equal(filtrarAcoes("").length, ACOES_DA_PALETA.length);
  assert.equal(filtrarAcoes("   ").length, ACOES_DA_PALETA.length);
});

test("acha SEM acento: quem digita rapido nao acentua", () => {
  assert.ok(filtrarAcoes("conferir").some((a) => a.id === "partida:conferir"));
  assert.ok(filtrarAcoes("MEMORIAL").some((a) => a.id === "partida:auditar"));
});

test("acha pelo SINONIMO, e nao so pelo rotulo", () => {
  assert.ok(filtrarAcoes("obras").some((a) => a.id === "ir:projetos"));
  assert.ok(
    filtrarAcoes("custo", ACOES_DE_ADMIN).some(
      (a) => a.id === "ir:admin-usage",
    ),
  );
});

test("texto que nao casa devolve lista vazia, e nao a lista inteira", () => {
  assert.equal(filtrarAcoes("xyzabc").length, 0);
});

test("a ordem declarada e preservada: comecar antes de ir para", () => {
  const grupos = filtrarAcoes("").map((a) => a.grupo);
  assert.equal(grupos.indexOf("Ir para") > grupos.lastIndexOf("Começar"), true);
});

test("NENHUMA ACAO DESTRUTIVA na paleta — ela e alcancada por acidente", () => {
  const perigosas = /apagar|excluir|remover|deletar|limpar|desativar/i;
  for (const a of [...ACOES_DA_PALETA, ...ACOES_DE_ADMIN]) {
    assert.ok(!perigosas.test(a.rotulo), a.rotulo);
  }
});

test("toda acao leva a algum lugar: ou navega, ou escreve", () => {
  for (const a of [...ACOES_DA_PALETA, ...ACOES_DE_ADMIN]) {
    assert.ok(a.href || a.frase, `${a.id} nao faz nada`);
  }
});

test("normalizar tira acento e caixa", () => {
  assert.equal(normalizar("  Conferência  "), "conferencia");
});

test("G02: termos do trabalho acham a funcao ou dizem onde ela fica", () => {
  for (const [termo, id] of [
    ["anexo", "onde:anexo"],
    ["capa", "partida:capa"],
    ["LD", "partida:ld"],
    ["separatriz", "onde:separatriz"],
    ["exportar", "onde:exportar-volume"],
    ["reordenar", "onde:reordenar"],
    ["corrigir", "onde:corrigir-carimbo"],
    ["atribuir", "onde:atribuir"],
    ["copiar link", "onde:link-achado"],
  ] as const) {
    assert.ok(filtrarAcoes(termo).some((a) => a.id === id), termo);
  }
});

test("G02: toda funcao contextual diz o que precisa existir antes", () => {
  for (const a of ACOES_DA_PALETA.filter((x) => x.grupo === "Onde fica")) {
    assert.ok(a.requisito && a.requisito.length > 10, a.id);
  }
});

console.log(`\n${passed} ok`);
