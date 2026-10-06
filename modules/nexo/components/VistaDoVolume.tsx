"use client";

/**
 * PAINEL OU FOLHAS, no mapa do volume (06/10/2026). Com um volume montado o
 * mapa abre no painel — é a pergunta da hora ("ficou certo? onde baixo?"); a
 * vista "Folhas" é o canvas de sempre, onde se arruma as folhas. Sem volume
 * montado não há o que escolher: o canvas aparece sozinho, sem controle.
 *
 * A escolha da pessoa vale até ela trocar.
 */
import { useState, type ReactNode } from "react";

import type { SeloForLd } from "@/server/nexo/build-ld-proposal";

import { useConversation } from "../state/conversation-store";
import { PainelDoVolume } from "./PainelDoVolume";

export function VistaDoVolume({ selos, mapa }: { selos: SeloForLd[]; mapa: ReactNode }) {
  const { results } = useConversation();
  const temVolume = results.some((r) => r.kind === "volume");
  const [escolha, setEscolha] = useState<"painel" | "folhas" | null>(null);
  if (!temVolume) return <>{mapa}</>;
  const vista = escolha ?? "painel";

  return (
    <div className="flex h-full min-h-0 flex-col" data-prova="vista-do-volume">
      <div className="flex px-4 pt-3">
        <span className="nw-vistas" role="group" aria-label="Vista do volume">
          <button type="button" aria-pressed={vista === "painel"} onClick={() => setEscolha("painel")}>
            Painel
          </button>
          <button type="button" aria-pressed={vista === "folhas"} onClick={() => setEscolha("folhas")}>
            Folhas
          </button>
        </span>
      </div>
      <div className="min-h-0 flex-1">{vista === "painel" ? <PainelDoVolume selos={selos} /> : mapa}</div>
    </div>
  );
}
