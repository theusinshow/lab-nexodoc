"use client";

/**
 * O PDF ABERTO UMA VEZ SÓ (08/10/2026).
 *
 * A prévia do trecho, o visor grande e as duas folhas do lado a lado eram cada
 * um um `<Document>` do react-pdf — e cada `<Document>` baixa (ou lê o blob) e
 * analisa o arquivo inteiro de novo no worker. Abrir o visor com a prévia já
 * aberta custava uma segunda análise do mesmo memorial antes de a página
 * aparecer. Aqui o documento do pdf.js é carregado uma vez por URL e
 * emprestado a quem pedir; o `<Page>` aceita o documento pronto pela prop `pdf`.
 *
 * Quem para de usar devolve. Os devolvidos ficam guardados (os 2 últimos) para
 * a próxima abertura do visor; o resto é destruído para liberar o worker.
 */
import { useEffect, useState } from "react";
import { pdfjs } from "react-pdf";

type DocumentoPdf = Awaited<ReturnType<typeof pdfjs.getDocument>["promise"]>;

type Entrada = { tarefa: ReturnType<typeof pdfjs.getDocument>; usos: number; devolvidoEm: number };
const guardados = new Map<string, Entrada>();
const GUARDAR_SEM_USO = 2;

function emprestar(url: string): Entrada {
  let e = guardados.get(url);
  if (!e) {
    e = { tarefa: pdfjs.getDocument({ url }), usos: 0, devolvidoEm: 0 };
    guardados.set(url, e);
    // Falhou: sai da guarda, para a próxima tentativa carregar de novo.
    e.tarefa.promise.catch(() => {
      if (guardados.get(url) === e) guardados.delete(url);
    });
  }
  e.usos++;
  return e;
}

function devolver(e: Entrada) {
  e.usos = Math.max(0, e.usos - 1);
  if (e.usos > 0) return;
  e.devolvidoEm = Date.now();
  const semUso = [...guardados].filter(([, x]) => x.usos === 0).sort(([, a], [, b]) => b.devolvidoEm - a.devolvidoEm);
  for (const [u, x] of semUso.slice(GUARDAR_SEM_USO)) {
    guardados.delete(u);
    void x.tarefa.destroy();
  }
}

/** O documento da URL: `null` carregando, `false` se não abriu. */
export function usePdfCompartilhado(url: string): DocumentoPdf | null | false {
  const [estado, setEstado] = useState<{ url: string; pdf: DocumentoPdf | false } | null>(null);
  useEffect(() => {
    let vivo = true;
    const e = emprestar(url);
    e.tarefa.promise.then(
      (pdf) => vivo && setEstado({ url, pdf }),
      () => vivo && setEstado({ url, pdf: false }),
    );
    return () => {
      vivo = false;
      devolver(e);
    };
  }, [url]);
  return estado?.url === url ? estado.pdf : null;
}
