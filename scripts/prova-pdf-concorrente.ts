/**
 * PDFS AO MESMO TEMPO — o LibreOffice local aguenta conversões simultâneas?
 *
 * Duas pessoas gerando PDF no mesmo segundo viram dois `soffice` disputando o
 * MESMO perfil de usuário (o padrão é um por HOME). O que se sabe do
 * LibreOffice: a segunda instância se entrega à primeira ou sai sem gerar o
 * arquivo, e o erro chega como "falha na conversão" esporádica.
 *
 * Converte o mesmo modelo N vezes em paralelo e exige N PDFs válidos.
 *
 *   node scripts/test-pdf-concorrente.ts [N]      (padrão: 6)
 *
 * Precisa de `LIBREOFFICE_PATH` (no `.env.local` ou no ambiente).
 */
import { readFileSync } from "node:fs";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
// Depois do env: o módulo lê `DOCUMENT_CONVERTER_URL` ao ser importado.
const { convertOdtToPdf } = await import("../server/pdf/index.ts");

if (!process.env.LIBREOFFICE_PATH) {
  console.error("LIBREOFFICE_PATH ausente: não há LibreOffice local para testar.");
  process.exit(1);
}
if (process.env.DOCUMENT_CONVERTER_URL?.trim()) {
  console.error("DOCUMENT_CONVERTER_URL definida: o teste mediria o conversor remoto, não o local.");
  process.exit(1);
}

const N = Number(process.argv[2] ?? 6);
const modelo = readFileSync("templates/capas/prefchap/modelo-capa.odt");

const inicio = Date.now();
const resultados = await Promise.all(
  Array.from({ length: N }, async (_, i) => {
    const t = Date.now();
    const r = await convertOdtToPdf(modelo);
    const ok = Boolean(r.pdfBuffer && r.pdfBuffer.subarray(0, 5).toString() === "%PDF-");
    return { i: i + 1, ok, ms: Date.now() - t, erro: r.error };
  }),
);

for (const r of resultados) {
  console.log(`  ${r.ok ? "ok    " : "FALHOU"} conversão ${r.i} em ${r.ms} ms${r.erro ? ` — ${r.erro.slice(0, 160)}` : ""}`);
}
const falhas = resultados.filter((r) => !r.ok).length;
console.log(`\n${N - falhas}/${N} PDFs em ${Date.now() - inicio} ms (simultâneos).`);
process.exit(falhas === 0 ? 0 : 1);
