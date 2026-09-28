"use client";

/**
 * DADOS DO VOLUME, em uma linha — e o formulário só quando se pede (V04).
 *
 * O formulário de oito campos ocupava ~560px acima da mesa em 1280×800 e, no
 * celular, empurrava a montagem para baixo de tudo. Os dados continuam a um
 * clique ("Editar dados do volume") e o resumo fica sempre visível, porque é
 * dele que saem o nome do arquivo e o cabeçalho do relatório.
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { VolumeMetadata } from "@/modules/volume-builder/lib/volume/volume-types";
import { VolumeMetadataForm } from "../volume-metadata-form";

export function DadosDoVolume({
  metadata,
  onChange,
}: {
  metadata: VolumeMetadata;
  onChange: (m: VolumeMetadata) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const partes = [
    metadata.projectCode || "sem código",
    metadata.projectName || "sem nome",
    metadata.volume ? `vol. ${metadata.volume}` : null,
    metadata.tomo ? `tomo ${metadata.tomo}` : null,
    metadata.revision ? `rev. ${metadata.revision}` : null,
    metadata.date || null,
  ].filter(Boolean);

  return (
    <section aria-label="Dados do volume" className="border bg-card">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
          Dados do volume
        </span>
        <span className="min-w-0 flex-1 truncate text-sm" data-resumo-dos-dados>
          {partes.join(" · ")}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-expanded={aberto}
          aria-controls="dados-do-volume-form"
          onClick={() => setAberto((v) => !v)}
        >
          <Pencil aria-hidden />
          {aberto ? "Fechar dados" : "Editar dados do volume"}
          {aberto ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
        </Button>
      </div>
      {aberto ? (
        <div id="dados-do-volume-form" className="border-t">
          <VolumeMetadataForm metadata={metadata} onChange={onChange} />
        </div>
      ) : null}
    </section>
  );
}
