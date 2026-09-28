"use client";

import type { AssemblyRow, VolumeMetadata } from "@/modules/volume-builder/lib/volume/volume-types";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

interface VolumeStructurePreviewProps {
  rows: AssemblyRow[];
  metadata: VolumeMetadata;
  compact?: boolean;
}

export function VolumeStructurePreview({
  rows,
  metadata,
  compact = false,
}: VolumeStructurePreviewProps) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className={compact ? "py-4 text-center" : "py-8 text-center"}>
          <p className="text-sm text-muted-foreground">
            Nenhum volume para exibir na estrutura.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className={compact ? "py-4 space-y-3" : "py-4 space-y-4"}>
        {/* A ÁRVORE NÃO É O PDF: a prévia real é "Abrir prévia" (V07). */}
        <p className="text-sm font-medium">Estrutura planejada</p>
        <p className="text-xs text-muted-foreground">O que a montagem pretende, por volume. Para ver o PDF, use &quot;Abrir prévia&quot;.</p>
        {!compact && metadata.projectCode && (
          <p className="text-xs text-muted-foreground">
            Projeto: {metadata.projectCode} {metadata.projectName && `- ${metadata.projectName}`}
          </p>
        )}
        {rows.map((row) => (
          <div key={row.id} className="rounded border p-3 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{row.title}</p>
              <p className="text-xs text-muted-foreground">
                {row.outputFileName || "sem nome"}
              </p>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              {row.cover?.selection && (
                <p>Capa: {row.cover.selection.sourceFileName}</p>
              )}
              {row.blocks.map((block) => (
                <div key={block.id} className="ml-3">
                  <p>
                    {block.title} ({block.disciplineCode || "sem código"})
                  </p>
                  <p className="ml-3">
                    Separatriz: {block.separator?.selection?.sourceFileName ?? `${block.separatorTitle || "sem título"} (automática)`}
                  </p>
                  {block.ld?.selection && (
                    <p className="ml-3">LD: {block.ld.selection.sourceFileName}</p>
                  )}
                  {block.documents.map((doc) => (
                    <p key={doc.id} className="ml-3">
                      Prancha: {doc.selection?.sourceFileName ?? "vazio"}
                    </p>
                  ))}
                  {(block.appendices ?? []).map((a) => (
                    <p key={a.id} className="ml-3">
                      Anexo: {a.selection?.sourceFileName ?? "vazio"}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
