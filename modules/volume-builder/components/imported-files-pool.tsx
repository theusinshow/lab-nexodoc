"use client";

/**
 * ARQUIVOS DA MESA — importar, ver o que aconteceu com CADA arquivo, corrigir o
 * tipo depois e remover sabendo o impacto (auditoria UX/UI, V09/V05).
 *
 * Antes: o ODT solto no dropzone era recusado em silêncio; a contagem de
 * páginas rodava antes de qualquer sinal na tela (importar parecia clique sem
 * efeito); PDF corrompido virava um arquivo com "0 páginas"; o mesmo PDF
 * entrava duas vezes; e o tipo escolhido antes de importar não tinha volta.
 *
 * Agora cada arquivo passa por uma FILA com estado próprio (lendo, importado,
 * ilegível, duplicado, recusado), a mensagem mora junto do nome, e o tipo é
 * trocável no cartão sem tirar do lugar o que já foi montado.
 */

import { useCallback, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, EyeOff, FileText, FileUp, Loader2, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { plural } from "@/lib/plural";
import { countPages } from "@/modules/volume-builder/lib/pdf/count-pages";
import { formatFileSize } from "@/modules/volume-builder/lib/utils/format-file-size";
import { ROTULO_DO_PAPEL, fraseDoImpacto, type Impacto } from "@/modules/volume-builder/lib/volume/mesa";
import { createImportedPdfFile, isPdfFile } from "@/modules/volume-builder/lib/volume/volume-extractor";
import type { ImportedPdfFile, PageAssetRole } from "@/modules/volume-builder/lib/volume/volume-types";
import { FileDropzone } from "@/modules/volume-builder/shared/file-dropzone";
import { PdfPageThumbnailGrid } from "./pdf-page-thumbnail-grid";

type ItemDaFila = {
  id: number;
  nome: string;
  estado: "lendo" | "importado" | "ilegivel" | "duplicado" | "recusado";
  mensagem: string;
};

interface ImportedFilesPoolProps {
  files: ImportedPdfFile[];
  fileDataMap: Map<string, File>;
  onFilesImported: (files: ImportedPdfFile[], fileData: File[]) => void;
  onRemoveFile: (fileId: string) => void;
  onReclassify: (fileId: string, role: PageAssetRole) => void;
  impactoDe: (fileId: string) => Impacto;
  onCollapse?: () => void;
}

async function sha256(file: File): Promise<string | null> {
  try {
    const d = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

let contadorDaFila = 0;

export function ImportedFilesPool({
  files,
  fileDataMap,
  onFilesImported,
  onRemoveFile,
  onReclassify,
  impactoDe,
  onCollapse,
}: ImportedFilesPoolProps) {
  const [selectedRole, setSelectedRole] = useState<PageAssetRole>("document");
  const [showImportedList, setShowImportedList] = useState(true);
  const [fila, setFila] = useState<ItemDaFila[]>([]);

  const atualizar = (id: number, patch: Partial<ItemDaFila>) =>
    setFila((f) => f.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const recusados = useCallback((lista: { file: File; motivo: string }[]) => {
    setFila((f) => [
      ...lista.map((r) => ({ id: ++contadorDaFila, nome: r.file.name, estado: "recusado" as const, mensagem: r.motivo })),
      ...f,
    ]);
  }, []);

  const handleFilesAccepted = useCallback(
    async (acceptedFiles: File[]) => {
      const naoPdf = acceptedFiles.filter((f) => !isPdfFile(f));
      if (naoPdf.length) recusados(naoPdf.map((file) => ({ file, motivo: "Tipo não aceito: só PDF." })));
      const pdfs = acceptedFiles.filter(isPdfFile);
      if (pdfs.length === 0) return;

      // Todos aparecem JÁ, como "lendo" — importar não parece clique sem efeito.
      const itens = pdfs.map((file) => ({ file, id: ++contadorDaFila }));
      setFila((f) => [
        ...itens.map(({ file, id }) => ({ id, nome: file.name, estado: "lendo" as const, mensagem: "lendo o PDF…" })),
        ...f,
      ]);

      const conhecidos = new Map(files.filter((f) => f.checksum).map((f) => [f.checksum!, f.name]));
      const novos: ImportedPdfFile[] = [];
      const bytes: File[] = [];
      for (const { file, id } of itens) {
        const checksum = await sha256(file);
        if (checksum && conhecidos.has(checksum)) {
          atualizar(id, { estado: "duplicado", mensagem: `Já importado (${conhecidos.get(checksum)}). Não entrou de novo.` });
          continue;
        }
        const importado = createImportedPdfFile(file, selectedRole);
        try {
          importado.pageCount = await countPages(await file.arrayBuffer());
        } catch {
          atualizar(id, { estado: "ilegivel", mensagem: "PDF ilegível ou corrompido — não foi importado. Gere o PDF de novo." });
          continue;
        }
        if (importado.pageCount === 0) {
          atualizar(id, { estado: "ilegivel", mensagem: "O PDF não tem páginas — não foi importado." });
          continue;
        }
        if (checksum) {
          importado.checksum = checksum;
          conhecidos.set(checksum, file.name);
        }
        novos.push(importado);
        bytes.push(file);
        atualizar(id, {
          estado: "importado",
          mensagem: `${plural(importado.pageCount, "página", "páginas")} como ${ROTULO_DO_PAPEL[selectedRole]}.`,
        });
      }
      if (novos.length > 0) onFilesImported(novos, bytes);
    },
    [files, onFilesImported, recusados, selectedRole],
  );

  const roleCounts = ROLE_OPTIONS.map((option) => ({
    ...option,
    count: files.filter((file) => file.role === option.value).length,
  }));
  const concluidos = fila.filter((i) => i.estado !== "lendo").length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileUp className="h-4 w-4" aria-hidden />
            Arquivos
          </CardTitle>
          {onCollapse && files.length > 0 && (
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onCollapse}>
              <EyeOff className="mr-1 h-3 w-3" aria-hidden />
              Ocultar importação
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground" id="tipo-da-importacao-ajuda">
          O tipo escolhido vale para os próximos PDFs; dá para trocar depois, arquivo por arquivo.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Tipo dos próximos PDFs importados" aria-describedby="tipo-da-importacao-ajuda">
          {roleCounts.map((role) => (
            <Button
              key={role.value}
              type="button"
              role="radio"
              aria-checked={selectedRole === role.value}
              variant={selectedRole === role.value ? "default" : "outline"}
              size="sm"
              className="h-auto justify-between gap-2 px-2 py-2 text-xs"
              onClick={() => setSelectedRole(role.value)}
            >
              <span className="truncate">{role.label}</span>
              <Badge variant="secondary" className="h-4 px-1 text-[11px]">
                {role.count}
              </Badge>
            </Button>
          ))}
        </div>

        <FileDropzone onFilesAccepted={handleFilesAccepted} onFilesRejected={recusados} />

        {fila.length > 0 ? (
          <section aria-label="Fila de importação" className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
                Importação · {concluidos}/{fila.length}
              </span>
              {concluidos === fila.length ? (
                <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => setFila([])}>
                  Limpar fila
                </Button>
              ) : null}
            </div>
            <ul className="space-y-1" aria-live="polite">
              {fila.map((item) => (
                <li
                  key={item.id}
                  data-fila={item.estado}
                  className="flex items-start gap-2 border px-2 py-1.5 text-xs"
                >
                  {item.estado === "lendo" ? (
                    <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin" aria-hidden />
                  ) : item.estado === "importado" ? (
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[var(--status-ok)]" aria-hidden />
                  ) : (
                    <AlertCircle
                      className={`mt-0.5 size-3.5 shrink-0 ${item.estado === "duplicado" ? "text-[var(--status-warning)]" : "text-[var(--status-critical)]"}`}
                      aria-hidden
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.nome}</span>
                    <span className="text-muted-foreground">{ROTULO_DA_FILA[item.estado]}: {item.mensagem}</span>
                  </span>
                  {item.estado !== "lendo" ? (
                    <button
                      type="button"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => setFila((f) => f.filter((i) => i.id !== item.id))}
                      aria-label={`Dispensar aviso de ${item.nome}`}
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {files.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">Nenhum arquivo importado.</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between border bg-muted/20 px-2 py-1.5">
              <span className="text-xs text-muted-foreground">
                {plural(files.length, "arquivo", "arquivos")}, {files.reduce((t, f) => t + f.pageCount, 0)} páginas
                {files.some((f) => !fileDataMap.has(f.id)) ? (
                  <span className="ml-1 text-[var(--status-critical)]">
                    · {files.filter((f) => !fileDataMap.has(f.id)).length} sem conteúdo neste dispositivo
                  </span>
                ) : null}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-[11px]"
                aria-expanded={showImportedList}
                onClick={() => setShowImportedList((c) => !c)}
              >
                {showImportedList ? <ChevronUp className="mr-1 h-3 w-3" aria-hidden /> : <ChevronDown className="mr-1 h-3 w-3" aria-hidden />}
                {showImportedList ? "Esconder lista" : "Mostrar lista"}
              </Button>
            </div>
            {showImportedList && (
              <ul className="space-y-2">
                {files.map((file) => (
                  <li key={file.id}>
                    <CartaoDoArquivo
                      file={file}
                      fileData={fileDataMap.get(file.id)}
                      impacto={impactoDe(file.id)}
                      onRemove={() => onRemoveFile(file.id)}
                      onReclassify={(r) => onReclassify(file.id, r)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CartaoDoArquivo({
  file,
  fileData,
  impacto,
  onRemove,
  onReclassify,
}: {
  file: ImportedPdfFile;
  fileData?: File;
  impacto: Impacto;
  onRemove: () => void;
  onReclassify: (r: PageAssetRole) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const frase = fraseDoImpacto(impacto);
  return (
    <div className="space-y-2 border bg-card/80 p-2" data-arquivo={file.id}>
      <div className="flex items-start gap-2">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium" title={file.name}>
            {file.name}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {formatFileSize(file.size)} · {plural(file.pageCount, "página", "páginas")} · {frase}
          </p>
          {!fileData ? (
            <p className="mt-0.5 text-[11px] text-[var(--status-critical)]">
              Conteúdo indisponível neste dispositivo — importe o PDF de novo para exportar.
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <label className="sr-only" htmlFor={`tipo-${file.id}`}>
          Tipo de {file.name}
        </label>
        <Select
          id={`tipo-${file.id}`}
          value={file.role}
          onChange={(e) => onReclassify(e.target.value as PageAssetRole)}
          className="h-7 min-w-[7rem] flex-1 text-[11px]"
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {ROTULO_DO_PAPEL[o.value]}
            </option>
          ))}
        </Select>
        {fileData ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px]"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Esconder páginas" : "Ver páginas"}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] text-[var(--status-critical)]"
          onClick={onRemove}
          aria-label={`Remover ${file.name}. ${frase} Dá para desfazer.`}
          title={frase}
        >
          <Trash2 aria-hidden />
          Remover
        </Button>
      </div>
      {expanded && fileData && <PdfPageThumbnailGrid file={fileData} pageCount={file.pageCount} />}
    </div>
  );
}

const ROTULO_DA_FILA: Record<ItemDaFila["estado"], string> = {
  lendo: "Lendo",
  importado: "Importado",
  ilegivel: "Não importado",
  duplicado: "Duplicado",
  recusado: "Recusado",
};

const ROLE_OPTIONS: Array<{ value: PageAssetRole; label: string }> = [
  { value: "cover", label: "Capas" },
  { value: "ld", label: "LDs" },
  { value: "separator", label: "Separatrizes" },
  { value: "document", label: "Pranchas" },
  { value: "appendix", label: "Anexos" },
];
