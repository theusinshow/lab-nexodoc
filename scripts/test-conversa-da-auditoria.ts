/**
 * A CONVERSA QUE JÁ GUARDA A AUDITORIA — o link não duplica conversa.
 *
 *   node scripts/test-conversa-da-auditoria.ts
 */
import assert from "node:assert/strict";

import { conversaQueGuarda } from "../modules/nexo/lib/conversa-da-auditoria.ts";

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

const aud = (artifactId: string, auditId?: string) => ({
  artifactId,
  kind: "auditoria",
  ...(auditId ? { payload: { auditId } } : {}),
});

test("acha a conversa aberta antes pelo link (id auditoria:<auditId>)", () => {
  const r = conversaQueGuarda(
    [
      { id: "a", updatedAt: 1, results: [aud("auditoria:outra")] },
      { id: "b", updatedAt: 2, results: [aud("auditoria:xyz")] },
    ],
    "xyz",
  );
  assert.equal(r?.id, "b");
});

test("acha a conversa em que a auditoria NASCEU (id por proposta, auditId no payload)", () => {
  const r = conversaQueGuarda(
    [{ id: "a", updatedAt: 1, results: [aud("auditoria:117-25:m1", "xyz")] }],
    "xyz",
  );
  assert.equal(r?.id, "a");
});

test("com várias, fica a mais recente", () => {
  const r = conversaQueGuarda(
    [
      { id: "velha", updatedAt: 1, results: [aud("auditoria:xyz")] },
      { id: "nova", updatedAt: 9, results: [aud("auditoria:xyz")] },
    ],
    "xyz",
  );
  assert.equal(r?.id, "nova");
});

test("nenhuma guarda → nulo (o link segue para o servidor)", () => {
  assert.equal(conversaQueGuarda([{ id: "a", updatedAt: 1, results: [] }], "xyz"), null);
});

test("outro tipo de artefato com o mesmo id não conta, e registro sem results não quebra", () => {
  const r = conversaQueGuarda(
    [
      { id: "a", updatedAt: 1, results: [{ artifactId: "auditoria:xyz", kind: "capa" }] },
      { id: "b", updatedAt: 2 },
    ],
    "xyz",
  );
  assert.equal(r, null);
});

console.log(`\n${passed} teste(s) ok`);
