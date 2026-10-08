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
/*
 * A FILA RECOLHE AS CONVERSAS SOZINHA, e só enquanto ela está aberta
 * (auditoria UX do memorial, 07/10/2026, U11). A 1440 px, com a lista de
 * conversas e o chat abertos, o detalhe do achado cortava "Decisão técnica" e
 * "Falso positivo". Isto vale só na memória: não é escolha da pessoa e não vai
 * para o armazenamento. "Mostrar conversas" desfaz na hora.
 */
let pelaFila = false;
let instantaneo: AreasRecolhidas | null = null;

function guardadas(): AreasRecolhidas {
  if (atual) return atual;
  try {
    const cru = JSON.parse(window.localStorage.getItem(CHAVE) ?? "null") as Partial<AreasRecolhidas> | null;
    atual = { projetos: cru?.projetos === true, chat: cru?.chat === true };
  } catch {
    atual = NENHUMA;
  }
  return atual;
}

/** O que a tela mostra: o guardado, mais o recolhimento da fila. */
function ler(): AreasRecolhidas {
  if (instantaneo) return instantaneo;
  const g = guardadas();
  instantaneo = pelaFila && !g.projetos ? { ...g, projetos: true } : g;
  return instantaneo;
}

function avisar() {
  instantaneo = null;
  for (const f of ouvintes) f();
}

function definir(proximo: AreasRecolhidas) {
  atual = proximo;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(proximo));
  } catch {
    // Sem armazenamento a escolha vale só nesta aba — continua funcionando.
  }
  avisar();
}

/** Liga ou desliga o recolhimento temporário da lista de conversas (a fila aberta em tela estreita). */
export function recolherConversasPelaFila(ligar: boolean) {
  if (pelaFila === ligar) return;
  pelaFila = ligar;
  avisar();
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
    alternarProjetos: () => {
      // Recolhida pela fila: o clique devolve a lista, sem gravar nada.
      if (pelaFila && !guardadas().projetos) return recolherConversasPelaFila(false);
      definir({ ...guardadas(), projetos: !guardadas().projetos });
    },
    alternarChat: () => definir({ ...guardadas(), chat: !guardadas().chat }),
    alternarFoco: () => {
      const a = ler();
      const ligar = !(a.projetos && a.chat);
      pelaFila = false;
      definir({ projetos: ligar, chat: ligar });
    },
  };
}
