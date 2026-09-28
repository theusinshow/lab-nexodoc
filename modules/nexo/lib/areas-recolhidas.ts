"use client";

/**
 * AS ÁREAS RECOLHIDAS DO SHELL — auditoria UX/UI, G05 (28/09/2026).
 *
 * Em 1280×800 a lista de projetos (300px) e o chat (520px) deixavam 368px para
 * o parecer e o documento. O splitter já existia, mas só servia a quem o
 * descobria. Aqui a pessoa recolhe projetos, chat, ou os dois ("Foco na
 * revisão") por botões nomeados — e a escolha volta na próxima visita.
 *
 * Recolher NÃO desmonta: o shell só esconde a coluna. O chat mantém histórico,
 * rascunho e rolagem, e reaparece igual ao "Mostrar chat".
 */
import { useSyncExternalStore } from "react";

export type AreasRecolhidas = { projetos: boolean; chat: boolean };

const CHAVE = "nexo:areas-recolhidas";
const NENHUMA: AreasRecolhidas = { projetos: false, chat: false };
const ouvintes = new Set<() => void>();
let atual: AreasRecolhidas | null = null;

function ler(): AreasRecolhidas {
  if (atual) return atual;
  try {
    const cru = JSON.parse(window.localStorage.getItem(CHAVE) ?? "null") as Partial<AreasRecolhidas> | null;
    atual = { projetos: cru?.projetos === true, chat: cru?.chat === true };
  } catch {
    atual = NENHUMA;
  }
  return atual;
}

function definir(proximo: AreasRecolhidas) {
  atual = proximo;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(proximo));
  } catch {
    // Sem armazenamento a escolha vale só nesta aba — continua funcionando.
  }
  for (const f of ouvintes) f();
}

function assinar(f: () => void) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

export function useAreasRecolhidas() {
  const areas = useSyncExternalStore(assinar, ler, () => NENHUMA);
  return {
    ...areas,
    foco: areas.projetos && areas.chat,
    alternarProjetos: () => definir({ ...ler(), projetos: !ler().projetos }),
    alternarChat: () => definir({ ...ler(), chat: !ler().chat }),
    /** Foco na revisão liga os dois; sair do foco devolve os dois. */
    alternarFoco: () => {
      const a = ler();
      const ligar = !(a.projetos && a.chat);
      definir({ projetos: ligar, chat: ligar });
    },
  };
}
