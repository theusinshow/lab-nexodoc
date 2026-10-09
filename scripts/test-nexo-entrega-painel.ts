/**
 * A entrega do volume e o teto de 20 MB por tomo. Núcleo PURO → node cru:
 *
 *   node scripts/test-nexo-entrega-painel.ts   (== npm run test:nexo:entrega-painel)
 */
import assert from "node:assert/strict";

import {
  TETO_DO_TOMO_BYTES,
  formatarMb,
  numerosDosTomos,
  passosDaEntrega,
  rotuloDoTomo,
  saidasDoTeto,
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
const capa = (numTomos: number, volume = "3", tomoInicial?: number): any => ({
  artifactId: "capa:x",
  kind: "capa",
  summary: "",
  payload: { numTomos, volume, ...(tomoInicial ? { tomoInicial } : {}) },
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

test("tomosMontados: PDF fora deste navegador continua montado, sem url", () => {
  const [t] = tomosMontados([{ ...volume(1), files: [], bytesAusentes: true }]);
  assert.equal(t.tomo, 1);
  assert.equal(t.url, null);
  const p = passosDaEntrega({ tomos: [t], planejados: 1, liberacao: livre, editaveisSalvosEm: 1 });
  assert.equal(p.volumes.liberado, false);
  assert.equal(p.volumes.motivo, "O PDF montado não está neste navegador. Monte de novo para baixar.");
});

test("tomosPlanejados: o maior entre o declarado na capa e o montado", () => {
  assert.equal(tomosPlanejados([capa(6), volume(1)]), 6);
  assert.equal(tomosPlanejados([volume(1), volume(2)]), 2);
  assert.equal(tomosPlanejados([]), 0);
});

test("numerosDosTomos: respeita o tomo inicial da capa", () => {
  assert.deepEqual(numerosDosTomos([capa(3, "3", 5)]), [5, 6, 7]);
  assert.deepEqual(numerosDosTomos([capa(1), volume(1)]), [1], "volume único é o tomo 1, uma vez só");
  assert.equal(tomosPlanejados([capa(3, "3", 5), volume(5)]), 3);
});

test("passos: volume único acima do teto fala do volume, não de tomo", () => {
  const tomos = tomosMontados([volume(1, 27.6 * MB)]);
  const p = passosDaEntrega({ tomos, planejados: 1, liberacao: livre, editaveisSalvosEm: 1 });
  assert.equal(p.volumes.motivo, "O volume tem 27,6 MB — passa do teto de 20 MB.");
});

test("volumeDaCapa: lê o volume declarado na capa", () => {
  assert.equal(volumeDaCapa([capa(1, "I")]), "I");
  assert.equal(volumeDaCapa([volume(1)]), "");
});

test("rotuloDoTomo: dois dígitos; 0 é o volume sem divisão", () => {
  assert.equal(rotuloDoTomo(4), "Tomo 04");
  assert.equal(rotuloDoTomo(0), "Volume");
  assert.equal(rotuloDoTomo(1, true), "Volume");
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

/* ─────────────── acima de 20 MB: comprimir ou dividir (09/10/2026) ─────────────── */

const MiB = 1024 * 1024;

test("dentro do teto não oferece nada", () => {
  assert.equal(saidasDoTeto({ bytes: 19.8 * MiB, emJpeg: 18 * MiB }), null);
});

test("volume de imagem (040-26 vol. 5): comprimir alcança, com a estimativa", () => {
  const s = saidasDoTeto({ bytes: 20.4 * MiB, emJpeg: 19.68 * MiB })!;
  assert.equal(s.comprimir.possivel, true);
  assert.ok(s.comprimir.estimativa < 15 * MiB && s.comprimir.estimativa > 13 * MiB, formatarMb(s.comprimir.estimativa));
  assert.equal(s.dividir.tomos, 2);
});

test("volume de desenho (084-25 vol. 10): comprimir desligado, com o motivo", () => {
  const s = saidasDoTeto({ bytes: 26.62 * MiB, emJpeg: 3.09 * MiB })!;
  assert.equal(s.comprimir.possivel, false);
  assert.match(s.comprimir.motivo ?? "", /desenho/);
  assert.equal(s.dividir.tomos, 2);
});

test("já comprimido: não oferece comprimir de novo", () => {
  const s = saidasDoTeto({ bytes: 21 * MiB, emJpeg: 15 * MiB, jaComprimido: true })!;
  assert.equal(s.comprimir.possivel, false);
  assert.match(s.comprimir.motivo ?? "", /já foram comprimidas/);
});

test("dividir leva tomos suficientes para cada um caber", () => {
  assert.equal(saidasDoTeto({ bytes: 45 * MiB, emJpeg: 0 })!.dividir.tomos, 3);
});

console.log(`\n${passed} teste(s) da entrega do volume OK`);
