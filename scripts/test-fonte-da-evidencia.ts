/**
 * A FONTE DA EVIDÊNCIA — sem navegador (auditoria UX/UI, A02/A03 / T03).
 *
 *   node scripts/test-fonte-da-evidencia.ts   (== npm run test:fonte-da-evidencia)
 */
import assert from "node:assert/strict";

import {
  catalogoDeFontes,
  catalogoDoParecer,
  resolverFonte,
  type FonteDoCatalogo,
} from "../lib/fonte-da-evidencia.ts";

let passed = 0;
function test(nome: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${nome}`);
}

const H1 = "a".repeat(64);
const H2 = "b".repeat(64);
const H3 = "c".repeat(64);
const memorial: FonteDoCatalogo = { nome: "117_25_md.pdf", url: `/api/arquivos/${H1}`, checksum: H1, origem: "servidor" };
const planilha: FonteDoCatalogo = { nome: "117_25_orc.pdf", url: `/api/arquivos/${H2}`, checksum: H2, origem: "servidor" };
const local: FonteDoCatalogo = { nome: "117_25_md.pdf", url: "blob:local-1", checksum: H1, origem: "local" };

test("duas fontes: cada revisão abre o SEU arquivo", () => {
  const cat = catalogoDeFontes([memorial, planilha]);
  const r1 = resolverFonte({ revisao: `rev:${H1}`, arquivo: "117_25_md.pdf" }, cat);
  const r2 = resolverFonte({ revisao: `sha256:${H2}` }, cat);
  assert.ok(r1.tipo === "arquivo" && r1.fonte.url.endsWith(H1) && r1.criterio === "revisao");
  assert.ok(r2.tipo === "arquivo" && r2.fonte.url.endsWith(H2));
});

test("revisão guardada em nenhum lugar é AUSENTE — mesmo com nome que casa", () => {
  const r = resolverFonte({ revisao: H3, arquivo: "117_25_md.pdf" }, [memorial]);
  assert.equal(r.tipo, "ausente");
  assert.equal(r.tipo === "ausente" && r.motivo, "revisao-nao-guardada");
});

test("local e servidor do mesmo conteúdo viram um só, e o local fica", () => {
  const cat = catalogoDeFontes([memorial, local]);
  assert.equal(cat.length, 1);
  assert.equal(cat[0].url, "blob:local-1");
  const r = resolverFonte({ revisao: H1 }, cat);
  assert.ok(r.tipo === "arquivo" && r.fonte.origem === "local");
});

test("legado: nome casa → fonte por nome (critério explícito)", () => {
  const r = resolverFonte({ arquivo: "117_25_ORC.pdf" }, catalogoDeFontes([memorial, planilha]));
  assert.ok(r.tipo === "arquivo" && r.criterio === "nome" && r.fonte.checksum === H2);
});

test("legado: nome citado com sufixo ainda casa, se único", () => {
  const r = resolverFonte({ arquivo: "117_25_md.pdf (p. 3)" }, [memorial]);
  assert.ok(r.tipo === "arquivo" && r.criterio === "nome");
});

test("legado: achado de OUTRO arquivo não cai no único PDF disponível", () => {
  const r = resolverFonte({ arquivo: "prancha_03.pdf" }, [memorial]);
  assert.equal(r.tipo, "ausente");
  assert.equal(r.tipo === "ausente" && r.motivo, "arquivo-nao-guardado");
});

test("legado sem nome e uma fonte só: usa a única, dizendo que é a única", () => {
  const r = resolverFonte({}, [memorial]);
  assert.ok(r.tipo === "arquivo" && r.criterio === "unico");
});

test("legado sem nome e duas fontes: ambíguo, não 'a primeira'", () => {
  const r = resolverFonte({}, catalogoDeFontes([memorial, planilha]));
  assert.equal(r.tipo === "ausente" && r.motivo, "ambiguo");
});

test("duas revisões com o mesmo nome e referência sem hash: ambíguo", () => {
  const v2: FonteDoCatalogo = { ...memorial, url: `/api/arquivos/${H3}`, checksum: H3 };
  const r = resolverFonte({ arquivo: "117_25_md.pdf" }, catalogoDeFontes([memorial, v2]));
  assert.equal(r.tipo === "ausente" && r.motivo, "ambiguo");
});

test("catálogo vazio diz que não há fonte, sem inventar", () => {
  const r = resolverFonte({ revisao: H1 }, []);
  assert.equal(r.tipo === "ausente" && r.motivo, "sem-fontes");
});

test("parecer: memorial local de OUTRA revisão não substitui o auditado", () => {
  const cat = catalogoDoParecer({
    local: { nome: "117_25_md.pdf", url: "blob:novo", checksum: H3 },
    auditados: [{ fileName: "117_25_md.pdf", checksumSha256: H1 }],
  });
  assert.equal(cat.length, 1);
  assert.equal(cat[0].url, `/api/arquivos/${H1}`);
});

test("parecer: memorial local da MESMA revisão é usado (sem rede)", () => {
  const cat = catalogoDoParecer({
    local: { nome: "117_25_md.pdf", url: "blob:igual", checksum: H1.toUpperCase() },
    auditados: [
      { fileName: "117_25_md.pdf", checksumSha256: H1 },
      { fileName: "orc.pdf", checksumSha256: H2 },
    ],
  });
  assert.deepEqual(
    cat.map((c) => c.url),
    ["blob:igual", `/api/arquivos/${H2}`],
  );
});

test("parecer sem lista do servidor: o local é o que há", () => {
  const cat = catalogoDoParecer({ local: { nome: "m.pdf", url: "blob:x", checksum: null }, auditados: [] });
  assert.equal(cat.length, 1);
  assert.equal(catalogoDoParecer({ local: null, auditados: [] }).length, 0);
});

test("checksum malformado do servidor não vira caminho de URL", () => {
  const cat = catalogoDoParecer({ local: null, auditados: [{ fileName: "x.pdf", checksumSha256: "../../etc" }] });
  assert.equal(cat.length, 0);
});

console.log(`\n${passed} testes ok`);
