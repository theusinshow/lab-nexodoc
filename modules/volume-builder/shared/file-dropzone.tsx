"use client";

import { useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";

interface FileDropzoneProps {
  onFilesAccepted: (files: File[]) => void;
  /**
   * O QUE O PRÓPRIO DROPZONE RECUSOU (V09). O ODT soltado aqui nunca chegava ao
   * callback de aceitos — onde morava o aviso de ODT —, então a recusa era um
   * silêncio. Quem chama recebe o arquivo e o motivo.
   */
  onFilesRejected?: (rejeitados: { file: File; motivo: string }[]) => void;
  accept?: Record<string, string[]>;
  label?: string;
  description?: string;
}

export function FileDropzone({
  onFilesAccepted,
  onFilesRejected,
  accept = { "application/pdf": [".pdf"] },
  label = "Importar PDFs",
  description = "Arraste arquivos PDF ou clique (Enter) para escolher",
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesAccepted(acceptedFiles);
    },
    [onFilesAccepted]
  );

  const onDropRejected = useCallback(
    (rejeicoes: FileRejection[]) => {
      onFilesRejected?.(
        rejeicoes.map((r) => ({
          file: r.file,
          motivo: r.file.name.toLowerCase().endsWith(".odt")
            ? "ODT não é aceito: exporte o documento em PDF e importe o PDF."
            : r.errors.some((e) => e.code === "file-invalid-type")
              ? "Tipo não aceito: só PDF."
              : r.errors.map((e) => e.message).join("; ") || "Arquivo recusado.",
        })),
      );
    },
    [onFilesRejected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept,
  });

  return (
    <div
      {...getRootProps({ "aria-label": `${label}: ${description}` })}
      className={cn(
        /*
         * A GRADE TECNICA. Esta e a area onde entram pranchas e memoriais, e a
         * grade de pontos diz isso antes de qualquer texto: coordenada, modulo,
         * prancheta. Ela e ESTATICA — a linha d'agua (DESIGN.md secao 4) proibe
         * borrao sob o que se le, e uma grade parada a 3% nao borra nada. Custo
         * de runtime zero: um gradiente, nenhum JavaScript.
         *
         * O raio tracejado fica: a secao 11 lista o campo tracejado como uma das
         * tres excecoes em que o raio sobrevive ao chanfro, porque tracejado nao
         * atravessa o recorte.
         */
        "nx-dotgrid flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-6 outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring",
        isDragActive
          ? "border-primary bg-primary/8"
          : "border-border hover:border-primary/50"
      )}
    >
      <input {...getInputProps({ "aria-label": label })} data-entrada-de-arquivos />
      <Upload className="h-8 w-8 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
