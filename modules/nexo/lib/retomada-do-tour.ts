"use client";

/**
 * ONDE A PESSOA PAROU, por roteiro. O tour não prende ninguém (um clique fora
 * encerra), então sair no meio é o caso comum — e voltar ao começo de 28
 * passos seria o castigo por ter saído. Guarda o `id` do passo, não o índice:
 * um roteiro que ganhou um passo ainda retoma no lugar certo.
 *
 * No navegador, como as dicas (decisão D4 em [[dicas-da-auditoria.ts]]).
 */
import { useSyncExternalStore } from "react";

const CHAVE = "nexo:tour-retomar";
type Mapa = Record<string, string>;

const ouvintes = new Set<() => void>();
let atual: Mapa | null = null;
const VAZIO: Mapa = {};

function ler(): Mapa {
  if (atual) return atual;
  try {
    const cru = JSON.parse(window.localStorage.getItem(CHAVE) ?? "{}") as unknown;
    atual = cru && typeof cru === "object" && !Array.isArray(cru) ? (cru as Mapa) : {};
  } catch {
    atual = {};
  }
  return atual;
}

function gravar(proximo: Mapa) {
  atual = proximo;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(proximo));
  } catch {
    // Vale só nesta aba.
  }
  for (const f of ouvintes) f();
}

function assinar(f: () => void) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

export function lerRetomada(roteiro: string): string | undefined {
  return ler()[roteiro];
}

export function guardarRetomada(roteiro: string, passoId: string) {
  if (ler()[roteiro] === passoId) return;
  gravar({ ...ler(), [roteiro]: passoId });
}

export function esquecerRetomada(roteiro: string) {
  if (!(roteiro in ler())) return;
  const resto = { ...ler() };
  delete resto[roteiro];
  gravar(resto);
}

/** O passo guardado do roteiro, ou `undefined` se não há o que retomar. */
export function useRetomada(roteiro: string): string | undefined {
  return useSyncExternalStore(assinar, () => ler()[roteiro], () => VAZIO[roteiro]);
}
