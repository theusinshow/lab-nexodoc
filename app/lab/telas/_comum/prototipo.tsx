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
  | "nexo-auditoria"
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

/** Um aviso passageiro do protótipo (o mesmo das Peças). */
export type AvisoDoPrototipo = { tom: "ok" | "falha"; titulo: string; texto?: string };

export const NoPrototipo = createContext<{ ir: Ir; avisar?: (a: AvisoDoPrototipo) => void } | null>(null);

/** Leva a outra tela no protótipo; no lab, não faz nada. */
export function useIr(): Ir {
  const ctx = useContext(NoPrototipo);
  return useCallback<Ir>((tela, situacao) => ctx?.ir(tela, situacao), [ctx]);
}

/** Mostra um aviso passageiro no protótipo; no lab, não faz nada. */
export function useAvisar() {
  const ctx = useContext(NoPrototipo);
  return useCallback((a: AvisoDoPrototipo) => ctx?.avisar?.(a), [ctx]);
}

export function useNoPrototipo() {
  return useContext(NoPrototipo) !== null;
}

/** Os destinos da barra de cima e onde cada um cai. */
export const DESTINO_DA_BARRA: Record<string, [IdTela, string?]> = {
  Painel: ["inicio"],
  Projetos: ["projetos"],
  // o Nexo abre na conversa mais recente: a auditoria do memorial geral da 117-25
  Nexo: ["nexo-auditoria", "pronta"],
  Achados: ["achados"],
  Ajuda: ["ajuda"],
  Administração: ["admin", "cockpit"],
};
