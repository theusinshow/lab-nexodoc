/**
 * O achado arrastado da fila para o chat: o que a linha põe no `dataTransfer`
 * volta inteiro no chat, e a pergunta montada é lida de volta pela bolha.
 *
 *   node scripts/test-achado-arrastado.ts   (== npm run test:achado-arrastado)
 */
import assert from "node:assert/strict";

import { arrastarAchado, lerAchadoArrastado, lerPerguntaSobreAchado, temAchadoArrastado, textoDaPergunta, TIPO_DO_ACHADO_ARRASTADO } from "../lib/pergunta-sobre-achado.ts";

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

/** O mínimo de `DataTransfer` que o arrasto usa. */
function dataTransfer() {
  const dados = new Map<string, string>();
  return {
    effectAllowed: "none",
    get types() {
      return [...dados.keys()];
    },
    setData: (t: string, v: string) => void dados.set(t, v),
    getData: (t: string) => dados.get(t) ?? "",
  } as unknown as DataTransfer;
}

test("o achado vai e volta pelo dataTransfer", () => {
  const dt = dataTransfer();
  arrastarAchado(dt, { id: "ACH-014", titulo: "Área divergente", nivel: "block", pagina: "12" });
  assert.equal(temAchadoArrastado(dt), true);
  assert.equal(dt.effectAllowed, "copy");
  assert.deepEqual(lerAchadoArrastado(dt), { id: "ACH-014", titulo: "Área divergente", nivel: "block", pagina: 12 });
  assert.equal(dt.getData("text/plain"), "ACH-014 — Área divergente");
});

test("página ausente ou lixo vira null", () => {
  const dt = dataTransfer();
  arrastarAchado(dt, { id: "ACH-001", titulo: "x", nivel: "note", pagina: null });
  assert.equal(lerAchadoArrastado(dt)?.pagina, null);
  const dt2 = dataTransfer();
  arrastarAchado(dt2, { id: "ACH-002", titulo: "x", nivel: "note", pagina: "s/n" });
  assert.equal(lerAchadoArrastado(dt2)?.pagina, null);
});

test("arquivo arrastado não é achado", () => {
  const dt = dataTransfer();
  dt.setData("Files", "");
  assert.equal(temAchadoArrastado(dt), false);
  assert.equal(lerAchadoArrastado(dt), null);
});

test("carga quebrada não derruba o chat", () => {
  const dt = dataTransfer();
  dt.setData(TIPO_DO_ACHADO_ARRASTADO, "{não é json");
  assert.equal(lerAchadoArrastado(dt), null);
  dt.setData(TIPO_DO_ACHADO_ARRASTADO, JSON.stringify({ id: 3 }));
  assert.equal(lerAchadoArrastado(dt), null);
});

test("a pergunta montada no chat é lida de volta pela bolha", () => {
  const dt = dataTransfer();
  arrastarAchado(dt, { id: "ACH-014", titulo: "Área divergente", nivel: "decide", pagina: 3 });
  const a = lerAchadoArrastado(dt)!;
  const lida = lerPerguntaSobreAchado(textoDaPergunta(a, a.pagina, "qual página está certa?"));
  assert.deepEqual(lida, { id: "ACH-014", titulo: "Área divergente", nivel: "decide", pagina: 3, pergunta: "qual página está certa?" });
});

test("sem nível, a pergunta sai na forma antiga e ainda é lida", () => {
  const lida = lerPerguntaSobreAchado(textoDaPergunta({ id: "ACH-007", titulo: "t", nivel: null }, null, "por quê?"));
  assert.deepEqual(lida, { id: "ACH-007", titulo: "t", nivel: null, pagina: null, pergunta: "por quê?" });
});

console.log(`\n${passed} passaram`);
