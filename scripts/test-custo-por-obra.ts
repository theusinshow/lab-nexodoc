/**
 * CUSTO POR OBRA — a obra da auditoria e a fusão pasta + auditoria (03/10/2026).
 *
 * O consumo de auditoria sem conversa caía todo em "sem vínculo com obra" —
 * metade do gasto da semana. Agora ele acha a obra pela própria auditoria
 * (`taskId` = id dela), e a pasta "017-26-CRICIUMA" e a auditoria da 017-26
 * viram UMA linha, pelo código.
 *
 *   node scripts/test-custo-por-obra.ts
 */
import assert from "node:assert/strict";

import { custoPorObra } from "../lib/custo-por-obra.ts";

let passed = 0;
function test(nome: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${nome}`);
}

const ev = (conversationId: string | null, usd: number, taskId: string | null = null) => ({ conversationId, taskId, estimatedCostUsd: usd, totalTokens: 100 });
const conversas = [{ id: "c1", title: "Memorial", folderKey: "017-26-CRICIUMA" }];

test("auditoria sem conversa vai para a obra dela, e não para 'sem vínculo'", () => {
  const linhas = custoPorObra([ev(null, 2, "aud-1")], [], new Map([["aud-1", "063-26"]]));
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].origem, "auditoria");
  assert.equal(linhas[0].obra, "063-26");
});

test("pasta e auditoria da mesma obra viram uma linha só, somando", () => {
  const linhas = custoPorObra([ev("c1", 1), ev(null, 2, "aud-1")], conversas, new Map([["aud-1", "017-26"]]));
  const da017 = linhas.filter((l) => l.chave === "codigo:017-26");
  assert.equal(da017.length, 1);
  assert.equal(da017[0].estimatedCostUsd, 3);
  assert.equal(da017[0].requests, 2);
  // a linha diz que junta os dois caminhos, e leva o nome da pasta (com o município)
  assert.equal(da017[0].origem, "pasta-e-auditoria");
  assert.equal(da017[0].obra, "017-26-CRICIUMA");
});

test("a ordem de chegada não muda o nome: auditoria antes da pasta também vira o nome da pasta", () => {
  const linhas = custoPorObra([ev(null, 2, "aud-1"), ev("c1", 1)], conversas, new Map([["aud-1", "017-26"]]));
  assert.equal(linhas[0].obra, "017-26-CRICIUMA");
  assert.equal(linhas[0].origem, "pasta-e-auditoria");
});

test("sem conversa e sem auditoria conhecida continua 'sem vínculo', no fim", () => {
  const linhas = custoPorObra([ev(null, 5, "x"), ev("c1", 1)], conversas, new Map());
  assert.equal(linhas.at(-1)?.origem, "sem-vinculo");
  assert.equal(linhas.at(-1)?.estimatedCostUsd, 5);
});

test("sem o mapa (chamada antiga), o comportamento de antes", () => {
  const linhas = custoPorObra([ev(null, 1, "aud-1")], []);
  assert.equal(linhas[0].origem, "sem-vinculo");
});

console.log(`\n${passed} teste(s) de custo por obra OK`);
