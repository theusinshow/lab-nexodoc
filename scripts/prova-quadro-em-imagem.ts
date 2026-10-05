/**
 * A PROVA CONTRA O PROVEDOR — UMA chamada de visão na p12 do 141-26.
 *
 * `npm run test:quadro-em-imagem` prova o caminho sem rede: o critério, a fusão
 * em `textoDaImagem`, a trava lendo o mesmo texto. Falta o que só o modelo
 * responde: o Quadro de Áreas, que é uma imagem de 849x945 px, chega com os
 * números? Esta prova rasteriza a folha como o navegador rasteriza (escala 2,
 * fundo branco, PNG — ver `modules/nexo/lib/pagina-muda-render.ts`), chama o
 * MESMO `transcreverPagina` da rota e confere os valores.
 *
 * GASTA IA: uma folha, centavos. Não roda auditoria nenhuma.
 *
 *   npm run prova:quadro-em-imagem [caminho.pdf] [pagina]
 *
 * O render usa o `@napi-rs/canvas`, dependência opcional do pdf.js que já está
 * em `node_modules`. O produto continua rasterizando no navegador.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const { getAiConfiguration } = await import("../lib/ai-providers.ts");
const { transcreverPagina } = await import("../lib/transcricao-por-visao.ts");
const { aplicarTranscricao, diagnosticarPaginasMudas } = await import("../lib/pagina-muda.ts");
const { extractPdfText, textoDaPaginaParaIA } = await import("../lib/pdf-text.ts");

const PADRAO = "C:/Users/matheus.mendes/Desktop/NexoDoc/NEXO - TESTES/Memoriais/141_26_md_geral_a TESTE.pdf";
const caminho = process.argv[2] ?? PADRAO;
const pagina = Number(process.argv[3] ?? 12);

if (!existsSync(caminho)) {
  console.log(`Arquivo não encontrado: ${caminho}`);
  process.exit(0);
}

const bytes = readFileSync(caminho);
const extraido = await extractPdfText(bytes);
const d = diagnosticarPaginasMudas(extraido);
assert.ok(d.quadrosEmImagem.includes(pagina), `p${pagina} não é quadro em imagem: ${d.quadrosEmImagem.join(",")}`);

// O render, como o navegador faz.
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), disableWorker: true } as never).promise;
const page = await doc.getPage(pagina);
const viewport = page.getViewport({ scale: 2 });
const { createCanvas } = await import("@napi-rs/canvas");
const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#ffffff";
ctx.fillRect(0, 0, canvas.width, canvas.height);
await page.render({ canvasContext: ctx as never, viewport, canvas: canvas as never } as never).promise;
const png = canvas.toBuffer("image/png");
await doc.destroy();
const imagemDataUrl = `data:image/png;base64,${png.toString("base64")}`;
console.log(`render: ${canvas.width}x${canvas.height} px, ${Math.round(png.length / 1024)} KB`);

const { model } = getAiConfiguration().auditTranscricao;
const t0 = Date.now();
const t = await transcreverPagina({ imagemDataUrl, pagina, model });
const usage = (t.response as { usage?: Record<string, unknown> })?.usage;
console.log(`modelo: ${t.model} · ${Date.now() - t0} ms · uso: ${JSON.stringify(usage)}`);
console.log(`\n--- transcrição p${pagina} ---\n${t.texto}\n---`);

// O Quadro de Áreas chegou, com os números que estão SÓ na imagem.
const so = (s: string) => s.replace(/\s+/g, "");
for (const valor of ["57718,65", "19572,23", "10946,74", "13789,17", "24353,48"]) {
  assert.ok(so(t.texto).includes(valor), `faltou ${valor} na transcrição`);
}
assert.ok(!extraido.pages[pagina - 1].text.includes("57718,65"), "o número não estava no texto do PDF");

// E chega à IA pelo caminho do produto, sem tocar a folha.
const fundido = aplicarTranscricao(extraido, [{ pagina, texto: t.texto }]);
assert.equal(fundido.pages[pagina - 1].text, extraido.pages[pagina - 1].text);
assert.ok(so(textoDaPaginaParaIA(fundido.pages[pagina - 1])).includes("57718,65"));
console.log("\nOK: o Quadro de Áreas chegou com os números, e só no texto da IA.");
