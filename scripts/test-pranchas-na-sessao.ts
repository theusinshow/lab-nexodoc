/**
 * A PRANCHA DA SESSÃO: o que a aba tem em memória somado ao que o servidor
 * guardou. Puro → node cru.
 *
 *   node scripts/test-pranchas-na-sessao.ts   (parte de npm run test:pranchas)
 */
import assert from "node:assert/strict";

import {
  comTentativas,
  emParalelo,
  enviarPrancha,
  EnvioRecusado,
  juntarPranchas,
  resumoDoEnvio,
  type FichaDePrancha,
} from "../modules/nexo/lib/pranchas-guardadas.ts";

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

const arquivo = (nome: string) => new File([new Uint8Array([1])], nome, { type: "application/pdf" });
const ficha = (fileName: string, checksum = "a".repeat(64)): FichaDePrancha => ({
  fileName,
  checksum,
  paginas: 1,
  sizeBytes: 1,
  atualizadaEm: "2026-10-09T12:00:00.000Z",
});

console.log("prancha da sessão\n");

await test("depois do F5: só fichas, todas guardadas e sem bytes", () => {
  const p = juntarPranchas([], [ficha("01.pdf"), ficha("02.pdf")], new Map());
  assert.deepEqual(p.map((x) => [x.name, x.estado, x.file]), [
    ["01.pdf", "guardada", null],
    ["02.pdf", "guardada", null],
  ]);
});

await test("arquivo que acabou de chegar e ainda sobe", () => {
  const f = arquivo("03.pdf");
  const [p] = juntarPranchas([f], [], new Map([["03.pdf", "subindo"]]));
  assert.equal(p.estado, "subindo");
  assert.equal(p.file, f);
  assert.equal(p.checksum, null);
});

await test("arquivo em memória que já tem ficha: guardada, com bytes à mão", () => {
  const f = arquivo("01.pdf");
  const [p] = juntarPranchas([f], [ficha("01.pdf", "b".repeat(64))], new Map());
  assert.equal(p.estado, "guardada");
  assert.equal(p.file, f);
  assert.equal(p.checksum, "b".repeat(64));
});

await test("trocar pelo nome: o arquivo novo subindo vence a ficha velha", () => {
  const [p] = juntarPranchas([arquivo("01.pdf")], [ficha("01.pdf")], new Map([["01.pdf", "subindo"]]));
  assert.equal(p.estado, "subindo");
  assert.equal(p.checksum, null);
});

await test("conversa sem projeto: na memória", () => {
  const [p] = juntarPranchas([arquivo("01.pdf")], [], new Map());
  assert.equal(p.estado, "na-memoria");
});

await test("a ordem é a dos arquivos e depois a das fichas, sem repetir nome", () => {
  const p = juntarPranchas([arquivo("02.pdf")], [ficha("01.pdf"), ficha("02.pdf")], new Map());
  assert.deepEqual(p.map((x) => x.name), ["02.pdf", "01.pdf"]);
});

await test("resumo do envio conta quem sobe e nomeia quem falhou", () => {
  const p = juntarPranchas(
    [arquivo("a.pdf"), arquivo("b.pdf"), arquivo("c.pdf")],
    [],
    new Map<string, "subindo" | "falhou">([["a.pdf", "subindo"], ["b.pdf", "falhou"]]),
  );
  assert.deepEqual(resumoDoEnvio(p), { subindo: 1, total: 3, falharam: ["b.pdf"] });
});

await test("tenta 3 vezes com espera crescente e desiste", async () => {
  const esperas: number[] = [];
  let chamadas = 0;
  await assert.rejects(
    comTentativas(
      async () => {
        chamadas++;
        throw new Error("rede");
      },
      { espera: async (ms) => void esperas.push(ms) },
    ),
    /rede/,
  );
  assert.equal(chamadas, 3);
  assert.deepEqual(esperas, [1000, 2000]);
});

await test("recusa do servidor (4xx) não é repetida", async () => {
  let chamadas = 0;
  await assert.rejects(
    comTentativas(
      async () => {
        chamadas++;
        throw new EnvioRecusado(415, "não é PDF");
      },
      { espera: async () => {} },
    ),
  );
  assert.equal(chamadas, 1);
});

await test("em paralelo respeita o limite", async () => {
  let agora = 0;
  let pico = 0;
  await emParalelo([1, 2, 3, 4, 5, 6, 7], 3, async () => {
    agora++;
    pico = Math.max(pico, agora);
    await new Promise((r) => setTimeout(r, 5));
    agora--;
  });
  assert.equal(pico, 3);
});

await test("acima de 40 MB nem sai do navegador, e não repete", async () => {
  let chamadas = 0;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    chamadas++;
    throw new Error("não devia chamar");
  }) as typeof fetch;
  try {
    const grande = new File([new Uint8Array(40 * 1024 * 1024 + 1)], "grande.pdf");
    await assert.rejects(
      enviarPrancha("p1", grande),
      (err: unknown) => err instanceof EnvioRecusado && err.status === 413,
    );
    assert.equal(chamadas, 0);
  } finally {
    globalThis.fetch = original;
  }
});

console.log(`\n${passed} ok`);
