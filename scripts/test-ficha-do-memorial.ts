/**
 * A ficha do memorial: montar a partir do que a capa leu, corrigir um campo, e
 * a correção chegar ao dossiê — que é a régua da auditoria.
 *
 * Por que existe (02/10/2026): "A obra está errada" mandava texto ao agente, que
 * não tem ação de corrigir a identidade; a auditoria seguia com a leitura crua.
 */
import assert from "node:assert/strict";

import {
  corrigirDossie,
  corrigirFicha,
  fichaDoMemorial,
  patchDaIdentidade,
} from "../modules/nexo/lib/ficha-do-memorial.ts";
import type { NexoDossieDraft } from "../modules/nexo/types.ts";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FALHOU  ${name}`);
    console.error(err instanceof Error ? err.stack : err);
    process.exitCode = 1;
  }
}

function dossie(over: Partial<NexoDossieDraft> = {}): NexoDossieDraft {
  return {
    obra: "UBS VILA MANAUS - PORTE 1",
    orgao: "PREFEITURA MUNICIPAL DE CRICIÚMA",
    municipio: "Criciúma",
    codigo: "117-25",
    mesAno: "OUTUBRO/2025",
    disciplinas: [],
    volumes: [],
    semVolume: [],
    arquivos: [],
    ...over,
  } as NexoDossieDraft;
}

test("a ficha traz os sete campos na ordem da capa, e o que não foi lido como null", () => {
  const f = fichaDoMemorial(dossie(), "117_25_md_geral_a.pdf");
  assert.deepEqual(
    f.linhas.map((l) => l.campo),
    ["obra", "orgao", "secretaria", "bairro", "municipio", "codigo", "mesAno"],
  );
  assert.equal(f.linhas.find((l) => l.campo === "obra")?.valor, "UBS VILA MANAUS - PORTE 1");
  assert.equal(f.linhas.find((l) => l.campo === "secretaria")?.valor, null);
  assert.equal(f.divergencia, undefined);
});

test("o bairro da ficha é o da capa, como na identidade", () => {
  const d = dossie({ bairro: "Vila Manaus", capa: { bairro: "BAIRRO VILA MANAUS" } as NexoDossieDraft["capa"] });
  assert.equal(fichaDoMemorial(d, "x.pdf").linhas.find((l) => l.campo === "bairro")?.valor, "BAIRRO VILA MANAUS");
});

test("sem leitura nenhuma, a ficha existe com tudo em branco", () => {
  const f = fichaDoMemorial(null, "x.pdf");
  assert.equal(f.linhas.length, 7);
  assert.ok(f.linhas.every((l) => l.valor === null));
});

test("corrigir marca só a linha corrigida", () => {
  const f = corrigirFicha(fichaDoMemorial(dossie(), "x.pdf"), "obra", "  UBS BAIRRO OPERÁRIA  ");
  const obra = f.linhas.find((l) => l.campo === "obra");
  assert.equal(obra?.valor, "UBS BAIRRO OPERÁRIA");
  assert.equal(obra?.corrigido, true);
  assert.ok(f.linhas.filter((l) => l.campo !== "obra").every((l) => !l.corrigido));
});

test("valor vazio não corrige nada", () => {
  const antes = fichaDoMemorial(dossie(), "x.pdf");
  assert.equal(corrigirFicha(antes, "obra", "   "), antes);
  const d = dossie();
  assert.equal(corrigirDossie(d, "obra", ""), d);
});

test("a correção chega ao dossiê, que é a régua da auditoria", () => {
  const d = corrigirDossie(dossie(), "obra", "UBS BAIRRO OPERÁRIA");
  assert.equal(d?.obra, "UBS BAIRRO OPERÁRIA");
  assert.equal(d?.codigo, "117-25");
});

test("o bairro corrigido vai para a capa também", () => {
  const d = corrigirDossie(
    dossie({ capa: { bairro: "BAIRRO ERRADO" } as NexoDossieDraft["capa"] }),
    "bairro",
    "BAIRRO VILA MANAUS",
  );
  assert.equal(d?.bairro, "BAIRRO VILA MANAUS");
  assert.equal(d?.capa?.bairro, "BAIRRO VILA MANAUS");
});

test("só os campos da identidade viram patch da identidade", () => {
  assert.deepEqual(patchDaIdentidade("obra", " X "), { obra: "X" });
  assert.deepEqual(patchDaIdentidade("codigo", "117-25"), { codigo: "117-25" });
  assert.equal(patchDaIdentidade("municipio", "Criciúma"), null);
  assert.equal(patchDaIdentidade("mesAno", "OUTUBRO/2025"), null);
  assert.equal(patchDaIdentidade("obra", "  "), null);
});

console.log(`\n${passed} teste(s) passaram`);
