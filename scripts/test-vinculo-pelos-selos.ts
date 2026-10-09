/**
 * O VÍNCULO PELOS SELOS: o que a conversa de pranchas leva ao cadastro para
 * achar o seu projeto. Puro → node cru.
 *
 *   node scripts/test-vinculo-pelos-selos.ts   (parte de npm run test:pranchas)
 *
 * Existe porque, em 09/10/2026, as 42 conversas com pranchas lidas no banco de
 * dev estavam TODAS sem projeto: só o memorial vinculava. Sem projeto, as
 * pranchas não são guardadas e o F5 as perde.
 */
import assert from "node:assert/strict";

import { pedidoDeVinculo } from "../modules/nexo/lib/vinculo-pelos-selos.ts";

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

const selo = (fileName: string, extra: Record<string, string> = {}) => ({
  fileName,
  extraction: {
    arquivo: fileName.replace(/\.pdf$/i, ""),
    disciplina: "CABEAMENTO",
    obra: "REFORMA E AMPLIAÇÃO - EMEB",
    cliente: "PREFEITURA MUNICIPAL DE CRICIÚMA",
    ...extra,
  },
});

console.log("vínculo pelos selos\n");

test("o código dominante do carimbo vira o pedido, com prefeitura e obra", () => {
  assert.deepEqual(pedidoDeVinculo([selo("084_25_cab_001_a.pdf"), selo("084_25_cft_001_a.pdf")]), {
    codigoLido: "084-25",
    prefeitura: "PREFEITURA MUNICIPAL DE CRICIÚMA",
    obra: "REFORMA E AMPLIAÇÃO - EMEB",
  });
});

test("sem selo lido não há pedido", () => {
  assert.equal(pedidoDeVinculo([]), null);
});

test("sem código legível não há pedido — não se adivinha projeto", () => {
  assert.equal(pedidoDeVinculo([selo("planta baixa.pdf", { arquivo: "" })]), null);
});

test("selo sem extração conta pelo nome do arquivo", () => {
  assert.equal(pedidoDeVinculo([{ fileName: "117_25_arq_001_a.pdf" }])?.codigoLido, "117-25");
});

console.log(`\n${passed} ok`);
