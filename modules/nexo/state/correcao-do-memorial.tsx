"use client";

/**
 * QUEM CORRIGE A FICHA DO MEMORIAL. A ficha mora numa mensagem do chat, mas a
 * leitura que a auditoria usa (`dossie`) mora no NexoWorkspace — é ele quem
 * provê a função. Sem provedor, a ficha fica só de leitura.
 */
import { createContext, useContext } from "react";

import type { CampoDoMemorial } from "../lib/ficha-do-memorial";

export type CorrigirCampoDoMemorial = (mensagemId: string, campo: CampoDoMemorial, valor: string) => void;

export const CorrecaoDoMemorialContexto = createContext<CorrigirCampoDoMemorial | null>(null);

export function useCorrecaoDoMemorial(): CorrigirCampoDoMemorial | null {
  return useContext(CorrecaoDoMemorialContexto);
}
