/**
 * As regras da ENTRADA das pranchas guardadas: o que passa pelo portão do
 * `POST /api/pranchas` e o que a montagem recusa. Puro → node cru.
 *
 *   node scripts/test-pranchas.ts   (== npm run test:pranchas)
 */
import assert from "node:assert/strict";

import {
  cabeNaCota,
  CHECKSUM,
  COTA_DO_PROJETO_BYTES,
  ehPdf,
  faltantes,
  lerComTeto,
  nomeDePrancha,
  TETO_DA_PRANCHA_BYTES,
} from "../lib/pranchas/regras.ts";

let passed = 0;
async function test(nome: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${nome}`);
  } catch (err) {
    console.error(`FALHOU  ${nome}`);
    console.error(err);
    process.exitCode = 1;
  }
}

const bytes = (texto: string) => new TextEncoder().encode(texto);
function corpo(pedacos: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(c) {
      for (const p of pedacos) c.enqueue(p);
      c.close();
    },
  });
}

console.log("pranchas guardadas\n");

await test("PDF de verdade passa", () => assert.equal(ehPdf(bytes("%PDF-1.7\n...")), true));
await test("PDF com lixo antes do cabeçalho (até 1 KB) passa, como o pdf.js aceita", () =>
  assert.equal(ehPdf(bytes(`${" ".repeat(10)}%PDF-1.4`)), true));
await test("extensão trocada não passa", () => assert.equal(ehPdf(bytes("PK\x03\x04 zip")), false));
await test("vazio não passa", () => assert.equal(ehPdf(new Uint8Array()), false));

await test("lê o corpo inteiro abaixo do teto", async () => {
  const r = await lerComTeto(corpo([bytes("%PDF-"), bytes("abc")]), 100);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(new TextDecoder().decode(r.bytes), "%PDF-abc");
});
await test("corta assim que passa do teto, sem ler o resto", async () => {
  let puxados = 0;
  const infinito = new ReadableStream<Uint8Array>({
    pull(c) {
      puxados++;
      c.enqueue(new Uint8Array(10));
    },
  });
  const r = await lerComTeto(infinito, 25);
  assert.deepEqual(r, { ok: false, motivo: "grande-demais" });
  assert.ok(puxados <= 4, `puxou ${puxados} pedaços`);
});
await test("corpo nulo ou vazio é recusado", async () => {
  assert.deepEqual(await lerComTeto(null, 10), { ok: false, motivo: "vazio" });
  assert.deepEqual(await lerComTeto(corpo([]), 10), { ok: false, motivo: "vazio" });
});

await test("teto da prancha é 40 MB", () => assert.equal(TETO_DA_PRANCHA_BYTES, 40 * 1024 * 1024));
await test("cota de 2 GB por projeto", () => {
  assert.equal(COTA_DO_PROJETO_BYTES, 2 * 1024 ** 3);
  assert.equal(cabeNaCota(COTA_DO_PROJETO_BYTES - 10, 10), true);
  assert.equal(cabeNaCota(COTA_DO_PROJETO_BYTES - 10, 11), false);
  assert.equal(cabeNaCota(0, 5, 4), false);
});

await test("nome válido é aparado", () => assert.equal(nomeDePrancha("  084-25-ARQ-01.pdf "), "084-25-ARQ-01.pdf"));
await test("extensão em maiúscula vale", () => assert.equal(nomeDePrancha("A.PDF"), "A.PDF"));
await test("nome com caminho é recusado", () => {
  assert.equal(nomeDePrancha("../x.pdf"), null);
  assert.equal(nomeDePrancha("pasta\\x.pdf"), null);
});
await test("nome sem .pdf, vazio ou nulo é recusado", () => {
  assert.equal(nomeDePrancha("x.dwg"), null);
  assert.equal(nomeDePrancha("   "), null);
  assert.equal(nomeDePrancha(null), null);
  assert.equal(nomeDePrancha(`${"a".repeat(252)}.pdf`), null);
});

await test("faltantes: só os nomes cujo checksum não tem ficha, sem repetir", () => {
  const a = "a".repeat(64);
  const b = "b".repeat(64);
  assert.deepEqual(
    faltantes(
      [
        { checksum: a, nome: "01.pdf" },
        { checksum: b, nome: "02.pdf" },
        { checksum: b, nome: "02.pdf" },
      ],
      [a],
    ),
    ["02.pdf"],
  );
  assert.deepEqual(faltantes([{ checksum: a, nome: "01.pdf" }], new Set([a])), []);
});
await test("checksum só em hex minúsculo de 64", () => {
  assert.equal(CHECKSUM.test("a".repeat(64)), true);
  assert.equal(CHECKSUM.test("A".repeat(64)), false);
  assert.equal(CHECKSUM.test("a".repeat(63)), false);
});

console.log(`\n${passed} ok`);
