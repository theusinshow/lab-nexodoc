/**
 * O NOME DO ZIP do conjunto de volumes — centro de custo + disciplina + volume.
 *
 *   node --import ./scripts/lib/resolver-de-imports.mjs scripts/test-nexo-nome-do-zip.ts
 *   (== npm run test:nexo:nome-do-zip)
 */
import assert from "node:assert/strict";

import { nomeDoVolume, nomeDoZipDosVolumes, nomesDosEditaveis } from "../modules/nexo/lib/nome-do-volume.ts";

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

const folha = (disciplina: string, codigo = "084-25"): any => ({
  // O nome do arquivo carrega a sigla, como nos projetos reais -- e o carimbo
  // repete a disciplina por extenso.
  fileName: "084_25_met_001_a.pdf",
  pageNumber: 1,
  codigo,
  disciplina,
  revisao: "R00",
  obra: "Ginasio",
});

test("o nome que o escritorio usa", () => {
  assert.equal(
    nomeDoZipDosVolumes([folha("Estrutura metálica")], { codigo: "084-25" }, "12"),
    "084_25_met_vol_12.zip",
  );
});

test('"Volume 12" nao vira vol_volume_12', () => {
  assert.equal(
    nomeDoZipDosVolumes([folha("Estrutura metálica")], { codigo: "084-25" }, "Volume 12"),
    "084_25_met_vol_12.zip",
  );
});

test("sem volume declarado, o trecho nao entra", () => {
  assert.equal(
    nomeDoZipDosVolumes([folha("Estrutura metálica")], { codigo: "084-25" }, ""),
    "084_25_met.zip",
  );
  assert.equal(
    nomeDoZipDosVolumes([folha("Estrutura metálica")], { codigo: "084-25" }, undefined),
    "084_25_met.zip",
  );
});

test("o codigo corrigido a mao vence o do carimbo", () => {
  assert.equal(
    nomeDoZipDosVolumes([folha("Estrutura metálica", "999-99")], { codigo: "084-25" }, "12"),
    "084_25_met_vol_12.zip",
  );
});

test("sem nada, cai no rotulo antigo em vez de sair um zip sem nome", () => {
  assert.equal(nomeDoZipDosVolumes([], {}, ""), "volumes-montados.zip");
});

/*
 * O VOLUME MISTO (09/10/2026): o escritório escreve TODAS as disciplinas, na
 * ordem em que aparecem — `084_25_cab_cft_capa_a.pdf`, `084_25_vol8_cab_cft_a.pdf`
 * (084-25 vol. 8). Antes saía só a de mais folhas (`084_25_cab_capas.odt`).
 */
const prancha = (fileName: string, disciplina: string): any => ({
  fileName,
  pageNumber: 1,
  codigo: "084-25",
  disciplina,
  revisao: "a",
  obra: "EMEB",
});
const misto = [
  prancha("084_25_cab_001_a.pdf", "Cabeamento"),
  prancha("084_25_cab_002_a.pdf", "Cabeamento"),
  prancha("084_25_cab_003_a.pdf", "Cabeamento"),
  prancha("084_25_cft_001_a.pdf", "CFTV"),
];

test("misto: editáveis com todas as disciplinas, na ordem em que aparecem", () => {
  const n = nomesDosEditaveis(misto, { codigo: "084-25" });
  assert.equal(n.capa, "084_25_cab_cft_capas.odt");
  assert.equal(n.separatriz, "084_25_cab_cft_separatriz.odt");
  assert.equal(n.zip, "084_25_editaveis.zip");
});

test("misto: o PDF do volume e o zip dos volumes também", () => {
  assert.equal(nomeDoVolume(misto, { codigo: "084-25" }, { atual: 0, numero: 1 }), "084_25_cab_cft.pdf");
  assert.equal(nomeDoZipDosVolumes(misto, { codigo: "084-25" }, "8"), "084_25_cab_cft_vol_8.zip");
});

test("disciplina dupla no nome do arquivo não se repete", () => {
  const n = nomesDosEditaveis(
    [prancha("138_26_est_met_001_a.pdf", "Estrutura metálica"), prancha("138_26_met_002_a.pdf", "Estrutura metálica")],
    { codigo: "138-26" },
  );
  assert.equal(n.capa, "138_26_est_met_capas.odt");
});

console.log(`
${passed} teste(s) passaram.`);
