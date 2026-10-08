"use client";

/**
 * VOLUME OU LISTA, no mapa do volume (06/10/2026). O CANVAS É O PADRÃO, sempre
 * — é onde se organiza e, agora, onde se monta e baixa (cabeçalho de cada
 * tomo + doca). A Lista (capas A4 + tomos) é a alternativa sem canvas. A
 * Obra mostra todos os volumes do projeto, para quem monta vários de uma vez —
 * só aparece quando a conversa já tem projeto.
 */
import { useState, type ReactNode } from "react";

import type { SeloForLd } from "@/server/nexo/build-ld-proposal";

import { useConversation } from "../state/conversation-store";
import { DocaDaEntrega } from "./DocaDaEntrega";
import { PainelDoVolume } from "./PainelDoVolume";
import { VistaDaObra } from "./VistaDaObra";

export function VistaDoVolume({
  selos,
  mapa,
  onAbrirConversa,
}: {
  selos: SeloForLd[];
  mapa: ReactNode;
  /** Abre outra conversa (o mesmo caminho da barra lateral). */
  onAbrirConversa: (id: string) => void;
}) {
  const { results, projectId, pastaDaObra } = useConversation();
  const temObra = Boolean(pastaDaObra || projectId);
  const temDocumentos = results.some((r) => r.kind === "capa" || r.kind === "ld" || r.kind === "volume");
  const [vista, setVista] = useState<"obra" | "volume" | "lista">("volume");
  const lista = temDocumentos && vista === "lista";
  const obra = temObra && vista === "obra";
  /*
   * Numa conversa só de memorial não há volume: as abas "Obra | Volume" ficavam
   * sobre o palco vazio de quem veio auditar (07/10/2026, U08). Elas aparecem
   * quando há o que montar — folhas lidas ou documentos gerados.
   */
  const mostrarControle = temDocumentos || (temObra && selos.length > 0);

  return (
    <div className="relative flex h-full min-h-0 flex-col" data-prova="vista-do-volume">
      {/* Abaixo da barra de navegação, à esquerda: em cima à direita ele cobria
          o título da coluna de conferência. */}
      {mostrarControle && (
        <div className="absolute left-3 top-14 z-20">
          <span className="nw-vistas" role="group" aria-label="Vista do volume">
            {temObra && (
              <button type="button" aria-pressed={obra} onClick={() => setVista("obra")}>
                Obra
              </button>
            )}
            <button type="button" aria-pressed={!lista && !obra} onClick={() => setVista("volume")}>
              Volume
            </button>
            {temDocumentos && (
              <button type="button" aria-pressed={lista} onClick={() => setVista("lista")}>
                Lista
              </button>
            )}
          </span>
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        {obra ? (
          <VistaDaObra
            onAbrir={(id) => {
              // Abrir um volume leva ao canvas DELE — a Obra é o mapa, não o destino.
              setVista("volume");
              onAbrirConversa(id);
            }}
          />
        ) : lista ? (
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
