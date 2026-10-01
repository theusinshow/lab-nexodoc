"use client";

import { createContext, useCallback, useContext } from "react";

/*
 * O PROTÓTIPO NAVEGÁVEL (/prototipo) junta as telas aprovadas num app só.
 * Cada tela continua a mesma do lab: onde um botão leva a outra tela, ela chama
 * `useIr()`. Dentro do protótipo isso troca de tela; no lab (fora dele) não faz
 * nada, e a vitrine segue como era.
 */

export type IdTela =
  | "entrada"
  | "inicio"
  | "conversa"
  | "nexo"
  | "mapa"
  | "projetos"
  | "projeto"
  | "achados"
  | "auditoria"
  | "resultado"
  | "admin"
  | "ajuda"
  | "pagina-404"
  | "pagina-erro"
  | "confirmacoes";

export type Ir = (tela: IdTela, situacao?: string) => void;

export const NoPrototipo = createContext<{ ir: Ir } | null>(null);

/** Leva a outra tela no protótipo; no lab, não faz nada. */
export function useIr(): Ir {
  const ctx = useContext(NoPrototipo);
  return useCallback<Ir>((tela, situacao) => ctx?.ir(tela, situacao), [ctx]);
}

export function useNoPrototipo() {
  return useContext(NoPrototipo) !== null;
}

/** Os destinos da barra de cima e onde cada um cai. */
export const DESTINO_DA_BARRA: Record<string, [IdTela, string?]> = {
  Painel: ["inicio"],
  Projetos: ["projetos"],
  "Montar volumes": ["nexo"],
  Achados: ["achados"],
  Ajuda: ["ajuda"],
  Administração: ["admin", "cockpit"],
};
