// Fixtures sintéticas da execução UX/UI: PDFs com texto identificável por página
// e um parecer derivado do fixture da bateria (52 achados), com duas fontes e um
// achado do motor novo com uma revisão guardada e outra não.
import fs from "node:fs";
import crypto from "node:crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";

export async function pdfIdentificado(prefixo, paginas) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= paginas; i++) {
    const p = doc.addPage([595, 842]);
    p.drawText(`${prefixo} - pagina ${i} de ${paginas}`, { x: 60, y: 780, size: 22, font });
    p.drawText(`UBS VILA MANAUS trecho de evidencia ${prefixo} ${i}`, { x: 60, y: 700, size: 14, font });
  }
  const bytes = Buffer.from(await doc.save());
  return { bytes, sha: crypto.createHash("sha256").update(bytes).digest("hex") };
}

export async function montarFixtures() {
  const mem = await pdfIdentificado("MEMORIAL UX", 6);
  const orc = await pdfIdentificado("ORCAMENTO UX", 3);
  const base = JSON.parse(fs.readFileSync("scripts/bateria/fixtures/parecer-117-25-incompleto.json", "utf8"));
  const report = structuredClone(base.resultado.report ?? base.resultado.payload?.report ?? base.resultado);
  report.arquivo = "ux_memorial.pdf";
  const achados = report.incongruencias.slice(0, 8).map((f, i) => ({ ...f, arquivo: "ux_memorial.pdf", pagina: String((i % 6) + 1) }));
  achados[6] = { ...achados[6], arquivo: "ux_orcamento.pdf", pagina: "2", id: "INC-007" };
  const outraRevisao = "f".repeat(64);
  achados.push({
    ...achados[1],
    id: "INC-900",
    tipo: "Volumes divergentes entre memorial e orçamento",
    prioridade: "Alta",
    impacto: "critico_documental",
    origem: "regra",
    motor: {
      version: "engine-finding/1",
      state: "confirmed",
      proposition: "Volumes divergentes entre memorial e orçamento.",
      premises: [{ id: "p1", statement: "memorial declara 12.000 L", status: "supported" }],
      references: [
        { role: "supports", documentId: "memorial", revisionId: `rev:${mem.sha}`, fileName: "ux_memorial.pdf", page: 3, start: 0, end: 10, quote: "trecho de evidencia MEMORIAL UX 3", uniqueOnPage: true },
        { role: "supports", documentId: "orcamento", revisionId: `rev:${outraRevisao}`, fileName: "ux_orcamento.pdf", page: 1, start: 0, end: 10, quote: "revisão que não foi guardada" },
      ],
      consequence: "O reservatório pode ser executado com volume insuficiente.",
      suggestedAction: "Unificar o volume adotado.",
      limits: [], contestedPremises: [], origin: { kind: "relation", ruleId: null }, lineage: null,
    },
  });
  report.incongruencias = achados;
  report.total_incongruencias = achados.length;
  return {
    mem, orc, report,
    arquivos: [
      { fileName: "ux_memorial.pdf", checksumSha256: mem.sha },
      { fileName: "ux_orcamento.pdf", checksumSha256: orc.sha },
    ],
  };
}
