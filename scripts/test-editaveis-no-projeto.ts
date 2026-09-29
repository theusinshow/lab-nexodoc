/**
 * As regras da trava "salve os editáveis antes de baixar o volume".
 *
 *   node scripts/test-editaveis-no-projeto.ts
 */
import assert from "node:assert/strict";

import {
  assinaturaDosDocumentos,
  liberacaoDoVolume,
  nomeLivre,
  type EditaveisSalvos,
} from "../modules/nexo/lib/editaveis-no-projeto.ts";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FALHOU  ${name}`);
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

type R = { artifactId: string; kind: string; generatedAt?: number };
const capa: R = { artifactId: "capa-1", kind: "capa", generatedAt: 100 };
const ld: R = { artifactId: "ld-1", kind: "ld", generatedAt: 200 };
const sep: R = { artifactId: "sep-1", kind: "separatriz", generatedAt: 300 };
const vol: R = { artifactId: "vol-1", kind: "volume", generatedAt: 400 };

function salvos(results: R[], extra: Partial<EditaveisSalvos> = {}): EditaveisSalvos {
  return {
    pasta: "documentos",
    quando: 1,
    modo: "pasta",
    arquivos: ["capa.odt", "ld.odt", "separatriz.odt"],
    assinatura: assinaturaDosDocumentos(results),
    ...extra,
  };
}

test("assinatura só olha capa, LD e separatriz, e não depende da ordem", () => {
  assert.equal(
    assinaturaDosDocumentos([capa, ld, sep, vol]),
    assinaturaDosDocumentos([vol, sep, ld, capa]),
  );
  assert.equal(assinaturaDosDocumentos([vol]), "");
});

test("assinatura muda quando um documento é regerado", () => {
  const antes = assinaturaDosDocumentos([capa, ld, sep]);
  const depois = assinaturaDosDocumentos([capa, { ...ld, generatedAt: 999 }, sep]);
  assert.notEqual(antes, depois);
});

test("nada salvo -> volume travado, com o motivo", () => {
  const l = liberacaoDoVolume(null, [capa, ld, sep, vol]);
  assert.equal(l.liberado, false);
  assert.match(l.motivo ?? "", /salve os editáveis/i);
});

test("salvo com a assinatura de agora -> liberado", () => {
  const results = [capa, ld, sep, vol];
  const l = liberacaoDoVolume(salvos(results), results);
  assert.equal(l.liberado, true);
  assert.equal(l.motivo, null);
});

test("remontar o VOLUME não derruba a liberação", () => {
  const results = [capa, ld, sep, vol];
  const l = liberacaoDoVolume(salvos(results), [capa, ld, sep, { ...vol, generatedAt: 5000 }]);
  assert.equal(l.liberado, true);
});

test("regerar a LD depois de salvar -> travado de novo, dizendo por quê", () => {
  const s = salvos([capa, ld, sep, vol]);
  const l = liberacaoDoVolume(s, [capa, { ...ld, generatedAt: 999 }, sep, vol]);
  assert.equal(l.liberado, false);
  assert.match(l.motivo ?? "", /mudou depois de salvar/);
});

test("salvo pelo ZIP também libera", () => {
  const results = [capa, ld, sep, vol];
  assert.equal(liberacaoDoVolume(salvos(results, { modo: "zip" }), results).liberado, true);
});

test("nome livre: sem conflito devolve o próprio nome", () => {
  assert.equal(nomeLivre("capa.odt", new Set(["ld.odt"])), "capa.odt");
});

test("nome livre: conflito vira 'nome (2).odt', e pula os que já existem", () => {
  assert.equal(nomeLivre("capa.odt", new Set(["capa.odt"])), "capa (2).odt");
  assert.equal(
    nomeLivre("capa.odt", new Set(["capa.odt", "capa (2).odt", "capa (3).odt"])),
    "capa (4).odt",
  );
});

test("nome livre: compara sem caixa, como o Windows", () => {
  assert.equal(nomeLivre("Capa.odt", new Set(["capa.odt"])), "Capa (2).odt");
});

console.log(`\n${passed} teste(s) passaram.`);
