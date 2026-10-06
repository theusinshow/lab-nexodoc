/**
 * A entrega do volume e o teto de 20 MB por tomo. Núcleo PURO → node cru:
 *
 *   node scripts/test-nexo-entrega-painel.ts   (== npm run test:nexo:entrega-painel)
 */
import assert from "node:assert/strict";

import {
  TETO_DO_TOMO_BYTES,
  formatarMb,
  passosDaEntrega,
  rotuloDoTomo,
  tomosMontados,
  tomosPlanejados,
  volumeDaCapa,
} from "../modules/nexo/lib/entrega-do-volume.ts";

const PDF = "application/pdf";
const MB = 1024 * 1024;

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const volume = (tomo: number, bytes?: number, conferencia?: unknown): any => ({
  artifactId: `volume:x:t${String(tomo).padStart(2, "0")}`,
  kind: "volume",
  summary: "",
  payload: { tomo, ...(conferencia ? { conferencia } : {}) },
  files: [{ label: "PDF do volume", name: `vol_tomo${tomo}.pdf`, mime: PDF, url: `blob:${tomo}`, primary: true, ...(bytes !== undefined ? { sizeBytes: bytes } : {}) }],
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const capa = (numTomos: number, volume = "3"): any => ({
  artifactId: "capa:x",
  kind: "capa",
  summary: "",
  payload: { numTomos, volume },
  files: [],
});

const livre = { liberado: true, motivo: null };

test("o teto é 20 MiB, como o Windows mostra", () => {
  assert.equal(TETO_DO_TOMO_BYTES, 20 * 1024 * 1024);
});

test("formatarMb usa vírgula e uma casa", () => {
  assert.equal(formatarMb(27.6 * MB), "27,6 MB");
  assert.equal(formatarMb(512 * 1024), "0,5 MB");
});

test("tomosMontados: em ordem de tomo, com peso e teto", () => {
  const t = tomosMontados([volume(2, 12 * MB), volume(1, 27.6 * MB)]);
  assert.deepEqual(t.map((x) => x.tomo), [1, 2]);
  assert.equal(t[0].acimaDoTeto, true);
  assert.equal(t[1].acimaDoTeto, false);
});

test("tomosMontados: sem peso conhecido não é declarado acima do teto", () => {
  const [t] = tomosMontados([volume(1)]);
  assert.equal(t.bytes, null);
  assert.equal(t.acimaDoTeto, false);
});

test("tomosMontados: veredito e pontos vêm da conferência gravada", () => {
  const [t] = tomosMontados([
    volume(1, MB, { veredito: "aviso", findings: [{ severidade: "aviso" }, { severidade: "info" }, { severidade: "critico" }] }),
  ]);
  assert.equal(t.veredito, "aviso");
  assert.equal(t.pontos, 2, "info não conta como ponto para olhar");
  assert.equal(tomosMontados([volume(2, MB)])[0].veredito, "sem-conferencia");
});

test("tomosPlanejados: o maior entre o declarado na capa e o montado", () => {
  assert.equal(tomosPlanejados([capa(6), volume(1)]), 6);
  assert.equal(tomosPlanejados([volume(1), volume(2)]), 2);
  assert.equal(tomosPlanejados([]), 0);
});

test("volumeDaCapa: lê o volume declarado na capa", () => {
  assert.equal(volumeDaCapa([capa(1, "I")]), "I");
  assert.equal(volumeDaCapa([volume(1)]), "");
});

test("rotuloDoTomo: dois dígitos; 0 é o volume sem divisão", () => {
  assert.equal(rotuloDoTomo(4), "Tomo 04");
  assert.equal(rotuloDoTomo(0), "Volume");
});

test("passos: faltando tomo, os volumes não liberam e dizem quantos faltam", () => {
  const tomos = tomosMontados([volume(1, MB)]);
  const p = passosDaEntrega({ tomos, planejados: 3, liberacao: livre, editaveisSalvosEm: 1 });
  assert.equal(p.volumes.liberado, false);
  assert.equal(p.volumes.motivo, "Faltam 2 de 3 tomos para montar.");
});

test("passos: um tomo acima do teto trava, com o nome e o peso", () => {
  const tomos = tomosMontados([volume(1, MB), volume(4, 27.6 * MB)]);
  const p = passosDaEntrega({ tomos, planejados: 2, liberacao: livre, editaveisSalvosEm: 1 });
  assert.equal(p.volumes.liberado, false);
  assert.equal(p.volumes.motivo, "O Tomo 04 tem 27,6 MB — passa do teto de 20 MB.");
  assert.equal(p.acimaDoTeto.length, 1);
});

test("passos: vários acima do teto viram uma frase só", () => {
  const tomos = tomosMontados([volume(1, 21 * MB), volume(2, 25 * MB)]);
  const p = passosDaEntrega({ tomos, planejados: 2, liberacao: livre, editaveisSalvosEm: 1 });
  assert.equal(p.volumes.motivo, "2 tomos passam do teto de 20 MB (Tomo 01, Tomo 02).");
});

test("passos: sem os editáveis, o passo 1 está pendente e os volumes pedem ele", () => {
  const tomos = tomosMontados([volume(1, MB)]);
  const p = passosDaEntrega({ tomos, planejados: 1, liberacao: { liberado: false, motivo: "x" }, editaveisSalvosEm: null });
  assert.equal(p.editaveis.feito, false);
  assert.equal(p.editaveis.motivo, null, "nunca baixou: pendente, sem motivo de erro");
  assert.equal(p.volumes.motivo, "Baixe os editáveis primeiro.");
});

test("passos: editáveis envelhecidos voltam a pendente com o motivo", () => {
  const tomos = tomosMontados([volume(1, MB)]);
  const motivo = "A capa, a LD ou a separatriz mudou depois do ZIP — baixe os editáveis de novo.";
  const p = passosDaEntrega({ tomos, planejados: 1, liberacao: { liberado: false, motivo }, editaveisSalvosEm: 5 });
  assert.equal(p.editaveis.feito, false);
  assert.equal(p.editaveis.motivo, motivo);
  assert.equal(p.volumes.motivo, motivo);
});

test("passos: tudo certo libera os volumes", () => {
  const tomos = tomosMontados([volume(1, MB), volume(2, 19 * MB)]);
  const p = passosDaEntrega({ tomos, planejados: 2, liberacao: livre, editaveisSalvosEm: 9 });
  assert.deepEqual(p.editaveis, { feito: true, quando: 9, motivo: null });
  assert.deepEqual(p.volumes, { liberado: true, motivo: null });
});

console.log(`\n${passed} teste(s) da entrega do volume OK`);
