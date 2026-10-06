/**
 * A vista Obra: o resumo de cada volume do projeto e a ordem em que aparecem.
 * Núcleo PURO → node cru:
 *
 *   node scripts/test-nexo-resumo-da-obra.ts   (== npm run test:nexo:resumo-da-obra)
 */
import assert from "node:assert/strict";

import { numeroDoVolume, ordenarVolumes, resumoDoVolume } from "../modules/nexo/lib/entrega-do-volume.ts";

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

const MB = 1024 * 1024;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const capa = (volume: string, numTomos = 1): any => ({ artifactId: "capa:x", kind: "capa", summary: "", payload: { volume, numTomos, tomoInicial: 1 }, files: [] });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const volume = (tomo: number, bytes: number, veredito = "ok"): any => ({
  artifactId: `volume:x:t${String(tomo).padStart(2, "0")}`,
  kind: "volume",
  summary: "",
  payload: { tomo, conferencia: { veredito, findings: [] } },
  files: [{ label: "PDF do volume", name: "v.pdf", mime: "application/pdf", url: "gravado", primary: true, sizeBytes: bytes }],
});

test("número do volume: arábico, romano e vazio", () => {
  assert.equal(numeroDoVolume("3"), 3);
  assert.equal(numeroDoVolume("IV"), 4);
  assert.equal(numeroDoVolume("Vol. 12"), 12);
  assert.equal(numeroDoVolume(""), null);
});

test("um volume de 2 tomos com 1 montado", () => {
  const v = resumoDoVolume("c1", "EST", [capa("6", 2), volume(1, 4 * MB)]);
  assert.equal(v.volume, "6");
  assert.equal(v.planejados, 2);
  assert.equal(v.montados, 1);
  assert.deepEqual(v.tomos.map((t) => t.estado), ["pronto", "nao-montado"]);
  assert.equal(v.pesoTotal, 4 * MB);
});

test("tomo acima do teto aparece como tal", () => {
  const v = resumoDoVolume("c1", "INC", [capa("10"), volume(1, 27.6 * MB)]);
  assert.equal(v.tomos[0].estado, "acima-do-teto");
});

test("conversa sem nada gerado: sem tomos, sem volume", () => {
  const v = resumoDoVolume("c2", "ELT", []);
  assert.equal(v.volume, "");
  assert.equal(v.temDocumentos, false);
  assert.equal(v.tomos.length, 0);
});

test("ordem: pelo número do volume; sem número por último", () => {
  const vs = ordenarVolumes([
    resumoDoVolume("a", "ELT", []),
    resumoDoVolume("b", "EST", [capa("6")]),
    resumoDoVolume("c", "TOP", [capa("III")]),
    resumoDoVolume("d", "INC", [capa("10")]),
  ]);
  assert.deepEqual(vs.map((v) => v.conversaId), ["c", "b", "d", "a"]);
});

console.log(`\n${passed} teste(s) do resumo da obra OK`);
