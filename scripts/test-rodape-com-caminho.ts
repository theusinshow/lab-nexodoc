/**
 * Teste do CAMINHO NO RODAPÉ do ODT da LD.
 *
 * O PDF leva o caminho como propriedade do documento (texto fixo: a conversão
 * no servidor não pode trocá-lo pela pasta temporária); o editável leva o campo
 * "nome do arquivo" do LibreOffice, o costume do escritório.
 *
 *   node scripts/test-rodape-com-caminho.ts
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";

import { generateOdtBuffer, type GeneratePayload } from "../lib/ld/ld-generation.ts";

const CAMINHO = "P:\\cad\\pmcriciuma\\116_25\\eletrico\\documentos\\1_emissão inicial_out-25\\116_25_elt_ld_a.odt";

const base: GeneratePayload = {
  ldData: {
    projectCode: "116_25",
    formattedCode: "116-25",
    discipline: "ELT",
    revision: "a",
    sectionTitle: "LISTA DE DOCUMENTOS PROJETO ELÉTRICO",
    client: "PREFEITURA MUNICIPAL DE CRICIÚMA",
    workName: "UBS RENASCER",
    phase: "PROJETO EXECUTIVO",
  },
  rows: [{ sheet: "01/02", file: "116_25_elt_001_a", description: "PLANTA" }],
  tomos: [],
};

async function partes(payload: GeneratePayload) {
  const zip = await JSZip.loadAsync(await generateOdtBuffer(payload));
  return {
    meta: await zip.file("meta.xml")!.async("string"),
    styles: await zip.file("styles.xml")!.async("string"),
  };
}

function rodape(styles: string): string {
  return styles.match(/<style:footer>[\s\S]*?<\/style:footer>/)?.[0] ?? "";
}

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FALHOU  ${name}`);
    throw err;
  }
}

await test("fixo: propriedade no meta e campo antes do Pág.", async () => {
  const { meta, styles } = await partes({ ...base, caminho: { texto: CAMINHO, campo: "fixo" } });
  assert.match(meta, /<meta:user-defined meta:name="Caminho">P:\\cad\\pmcriciuma[^<]*116_25_elt_ld_a\.odt<\/meta:user-defined>/);
  const r = rodape(styles);
  assert.match(r, /<text:user-defined text:name="Caminho">P:\\cad[^<]*<\/text:user-defined><text:tab\/>P/);
  assert.doesNotMatch(r, /text:file-name/);
});

await test("editável: campo nome do arquivo com o caminho em cache", async () => {
  const { styles } = await partes({ ...base, caminho: { texto: CAMINHO, campo: "arquivo" } });
  assert.match(rodape(styles), /<text:file-name text:display="full">P:\\cad[^<]*<\/text:file-name><text:tab\/>P/);
});

await test("sem caminho o rodapé é o do template", async () => {
  const { styles } = await partes(base);
  const zip = await JSZip.loadAsync(await readFile(path.join(process.cwd(), "templates", "modelo_ld_empresa.odt")));
  const original = await zip.file("styles.xml")!.async("string");
  assert.equal(
    rodape(styles).replace(/<text:user-defined[^>]*>[^<]*<\/text:user-defined>|<text:subject>[^<]*<\/text:subject>|<text:description>[^<]*<\/text:description>/g, ""),
    rodape(original).replace(/<text:user-defined[^>]*>[^<]*<\/text:user-defined>|<text:subject>[^<]*<\/text:subject>|<text:description>[^<]*<\/text:description>/g, ""),
  );
});

console.log(`\n${passed} testes passaram.`);
