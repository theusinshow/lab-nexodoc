"use client";

/**
 * O MEMORIAL CARREGADO UMA VEZ, com as páginas pedidas em miniatura — para a
 * leitura "No documento". Uma `Document` só, e uma `Page` pequena dentro de cada
 * coluna: carregar o PDF por página seria baixá-lo N vezes.
 *
 * Carregado só no cliente (next/dynamic, ssr:false), como o visor.
 */
import type { ReactNode } from "react";
import { Document, Page, pdfjs } from "react-pdf";

// O mesmo worker do visor (components/audit-pdf-viewer-internal.tsx): tem de casar
// com o pdfjs que o react-pdf usa.
pdfjs.GlobalWorkerOptions.workerSrc = "/assets/pdfjs/pdf.worker.react-pdf.mjs";

export default function DocumentoComMiniaturas({
  url,
  paginas,
  largura,
  coluna,
  className,
}: {
  url: string;
  paginas: number[];
  largura: number;
  /** Monta a coluna de cada página com a miniatura dela. */
  coluna: (pagina: number, miniatura: ReactNode) => ReactNode;
  className?: string;
}) {
  return (
    <Document
      file={url}
      className={className}
      loading={<p className="nd-vazio">Abrindo o memorial…</p>}
      error={<p className="nd-vazio">Não foi possível abrir o PDF nesta sessão.</p>}
    >
      {paginas.map((p) =>
        coluna(
          p,
          <Page pageNumber={p} width={largura} renderTextLayer={false} renderAnnotationLayer={false} loading={<span className="nd-folha nd-folha--carregando" />} />,
        ),
      )}
    </Document>
  );
}
