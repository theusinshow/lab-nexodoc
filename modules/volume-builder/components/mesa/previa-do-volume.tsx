"use client";

/**
 * A PRÉVIA DE UM VOLUME — o PDF de verdade, página a página, ao lado da
 * sequência que o explica (auditoria UX/UI, V07).
 *
 * Era só para "PDF único" e passava pelo servidor, que GRAVAVA os artefatos no
 * projeto a cada prévia. Agora o PDF é montado AQUI, pela mesma função da
 * exportação (`buildRowPdf`), com os bytes que já estão na tela: dá para abrir
 * o volume 2 de um pacote de 3 sem baixar nem descompactar ZIP, e ver uma
 * prévia não registra nada em lugar nenhum.
 *
 * A árvore da estrutura NÃO substitui isto: ela diz o que a montagem pretende;
 * aqui é o que o PDF contém.
 */

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { rotuloDoVolume, sequenciaDoVolume, type EstadoDaMontagem } from "@/modules/volume-builder/lib/volume/mesa";
import { cn } from "@/lib/utils";

pdfjs.GlobalWorkerOptions.workerSrc = "/assets/pdfjs/pdf.worker.react-pdf.mjs";

type Montado = { rowId: string; url: string; paginas: number } | { rowId: string; erro: string };

export default function PreviaDoVolume({
  estado,
  bytes,
  rowIdInicial,
  onFechar,
}: {
  estado: EstadoDaMontagem;
  bytes: ReadonlyMap<string, File>;
  rowIdInicial: string;
  onFechar: () => void;
}) {
  const [rowId, setRowId] = useState(rowIdInicial);
  const [montado, setMontado] = useState<Montado | null>(null);
  const [pagina, setPagina] = useState(1);
  const [largura, setLargura] = useState(520);
  const fechar = useRef<HTMLButtonElement>(null);
  const sequencia = sequenciaDoVolume(estado, rowId);

  // Foco no diálogo ao abrir; Escape fecha. O retorno do foco é de quem abriu.
  useEffect(() => {
    fechar.current?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  useEffect(() => {
    const medir = () => setLargura(Math.max(260, Math.min(640, window.innerWidth - (window.innerWidth >= 1024 ? 420 : 48))));
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  useEffect(() => {
    let vivo = true;
    let url: string | null = null;
    queueMicrotask(() => {
      if (vivo) {
        setMontado(null);
        setPagina(1);
      }
    });
    void (async () => {
      const row = estado.rows.find((r) => r.id === rowId);
      if (!row) return;
      try {
        const buffers = new Map<string, ArrayBuffer>();
        for (const [id, file] of bytes) buffers.set(id, await file.arrayBuffer());
        const { buildRowPdf } = await import("@/modules/volume-builder/lib/volume/assembly-builder");
        const pdf = await buildRowPdf(row, buffers);
        const blob = new Blob([pdf as BlobPart], { type: "application/pdf" });
        url = URL.createObjectURL(blob);
        if (!vivo) {
          URL.revokeObjectURL(url);
          return;
        }
        const { PDFDocument } = await import("pdf-lib");
        const paginas = (await PDFDocument.load(pdf)).getPageCount();
        setMontado({ rowId, url, paginas });
      } catch (e) {
        if (vivo) setMontado({ rowId, erro: e instanceof Error ? e.message : "Não foi possível montar a prévia." });
      }
    })();
    return () => {
      vivo = false;
      // Revoga a URL desta prévia quando ela sai de uso (troca de volume/fechar).
      if (url) URL.revokeObjectURL(url);
    };
  }, [estado, bytes, rowId]);

  const pronto = montado && "url" in montado ? montado : null;
  const total = pronto?.paginas ?? 0;
  const atual = sequencia[pagina - 1];

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/70 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="previa-titulo"
      data-previa-do-volume={rowId}
    >
      <div className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden border bg-[var(--nexodoc-panel)]">
        <header className="flex flex-wrap items-center gap-2 border-b bg-background px-3 py-2">
          <h2 id="previa-titulo" className="text-sm font-semibold">
            Prévia do PDF
          </h2>
          <Select
            aria-label="Volume da prévia"
            value={rowId}
            onChange={(e) => setRowId(e.target.value)}
            className="h-8 min-w-[10rem]"
          >
            {estado.rows.map((r) => (
              <option key={r.id} value={r.id}>
                {rotuloDoVolume(estado, r.id)} — {r.outputFileName || "sem nome"}
              </option>
            ))}
          </Select>
          <span className="font-mono text-[11px] text-muted-foreground" data-paginas-da-previa={total || undefined}>
            {pronto ? `${total} página${total === 1 ? "" : "s"}` : montado ? "" : "montando…"}
          </span>
          <Button ref={fechar} type="button" size="sm" variant="ghost" className="ml-auto" onClick={onFechar} aria-label="Fechar prévia">
            <X aria-hidden />
            Fechar
          </Button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-auto lg:grid-cols-[minmax(0,1fr)_22rem] lg:overflow-hidden">
          <div className="flex min-h-0 flex-col items-center gap-2 overflow-auto bg-muted/25 p-3">
            {!montado ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Montando o PDF deste volume…
              </p>
            ) : "erro" in montado ? (
              <p className="max-w-md text-sm text-[var(--status-critical)]" role="alert" data-previa-erro>
                Não foi possível montar a prévia: {montado.erro}
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)} aria-label="Página anterior da prévia">
                    <ChevronLeft aria-hidden />
                  </Button>
                  <span className="font-mono text-xs" aria-live="polite">
                    página {pagina} de {total}
                  </span>
                  <Button type="button" size="sm" variant="outline" disabled={pagina >= total} onClick={() => setPagina((p) => p + 1)} aria-label="Próxima página da prévia">
                    <ChevronRight aria-hidden />
                  </Button>
                </div>
                {atual ? (
                  <p className="text-center text-xs text-muted-foreground">
                    {atual.papel}
                    {atual.grupo ? ` · ${atual.grupo}` : ""} · {atual.origem}
                  </p>
                ) : null}
                <div className="border bg-white shadow-lg">
                  <Document file={montado.url} loading={<Loader2 className="m-8 size-5 animate-spin" aria-hidden />}>
                    <Page pageNumber={pagina} width={largura} renderAnnotationLayer={false} />
                  </Document>
                </div>
              </>
            )}
          </div>

          <aside className="min-h-0 overflow-auto border-t p-3 lg:border-l lg:border-t-0" aria-label="Sequência do volume">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Sequência</h3>
            <ol className="mt-2 space-y-1">
              {sequencia.map((s) => (
                <li key={s.pagina}>
                  <button
                    type="button"
                    onClick={() => setPagina(s.pagina)}
                    aria-current={s.pagina === pagina ? "page" : undefined}
                    data-sequencia={s.pagina}
                    className={cn(
                      "grid w-full grid-cols-[2.5rem_minmax(0,1fr)] gap-2 border px-2 py-1 text-left text-xs",
                      s.pagina === pagina ? "border-[var(--ring)] bg-muted/40" : "hover:bg-muted/25",
                    )}
                  >
                    <span className="font-mono tabular-nums">{s.pagina}</span>
                    <span className="min-w-0">
                      <span className="block font-medium">{s.papel}</span>
                      <span className="block truncate text-muted-foreground">{s.origem}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </div>
    </div>
  );
}
