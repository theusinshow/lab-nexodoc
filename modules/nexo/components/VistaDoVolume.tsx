"use client";

/**
 * VOLUME OU LISTA, no mapa do volume (06/10/2026). O CANVAS É O PADRÃO, sempre
 * — é onde se organiza e, agora, onde se monta e baixa (cabeçalho de cada
 * tomo + doca). A Lista (capas A4 + tomos) é a alternativa sem canvas. A vista
 * "Obra" entra na etapa 3 do desenho; até lá não aparece — um botão que não
 * leva a lugar nenhum se lê como defeito.
 */
import { useState, type ReactNode } from "react";

import type { SeloForLd } from "@/server/nexo/build-ld-proposal";

import { useConversation } from "../state/conversation-store";
import { DocaDaEntrega } from "./DocaDaEntrega";
import { PainelDoVolume } from "./PainelDoVolume";

export function VistaDoVolume({ selos, mapa }: { selos: SeloForLd[]; mapa: ReactNode }) {
  const { results } = useConversation();
  const temDocumentos = results.some((r) => r.kind === "capa" || r.kind === "ld" || r.kind === "volume");
  const [vista, setVista] = useState<"volume" | "lista">("volume");
  const lista = temDocumentos && vista === "lista";

  return (
    <div className="relative flex h-full min-h-0 flex-col" data-prova="vista-do-volume">
      {/* Abaixo da barra de navegação, à esquerda: em cima à direita ele cobria
          o título da coluna de conferência. */}
      {temDocumentos && (
        <div className="absolute left-3 top-14 z-20">
          <span className="nw-vistas" role="group" aria-label="Vista do volume">
            <button type="button" aria-pressed={!lista} onClick={() => setVista("volume")}>
              Volume
            </button>
            <button type="button" aria-pressed={lista} onClick={() => setVista("lista")}>
              Lista
            </button>
          </span>
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        {lista ? (
          <PainelDoVolume selos={selos} />
        ) : (
          <>
            {mapa}
            <DocaDaEntrega selos={selos} />
          </>
        )}
      </div>
    </div>
  );
}
