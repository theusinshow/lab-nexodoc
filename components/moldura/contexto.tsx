"use client";

import { createContext, useContext } from "react";

/** Um aviso passageiro: o que aconteceu (título) e o que fazer com isso (texto). */
export type ModeloDeAviso = { tom: "ok" | "falha"; titulo: string; texto?: string; acao?: string; link?: string };

/**
 * O que a moldura oferece a quem está dentro dela: abrir a busca e os atalhos
 * (o Topo usa) e dar um aviso passageiro (as telas usam depois de uma ação).
 * Fora da moldura, tudo vira nada — uma tela antiga que importe isto não quebra.
 */
export const ContextoDaMoldura = createContext<{
  abrirBusca: (termo?: string) => void;
  abrirAtalhos: () => void;
  avisar: (a: ModeloDeAviso, onAcao?: () => void) => void;
}>({ abrirBusca: () => {}, abrirAtalhos: () => {}, avisar: () => {} });

export const useMoldura = () => useContext(ContextoDaMoldura);
