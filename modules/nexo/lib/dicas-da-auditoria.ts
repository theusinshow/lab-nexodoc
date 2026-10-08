"use client";

/**
 * AS DICAS DA AUDITORIA, uma vez cada (auditoria UX do memorial, 07/10/2026).
 *
 * O tour de 11 passos abria sozinho e ensinava de uma vez o que a pessoa ainda
 * não estava fazendo — metade sobre volume, para quem tinha vindo auditar.
 * Agora cada dica aparece NA HORA em que a pessoa faz aquilo, e não volta:
 *
 * - `processamento`: o que o Nexo procura enquanto lê (painel da auditoria em curso);
 * - `primeira-revisao`: o que cada botão de encerrar significa (a fila, na primeira vez);
 * - `atalhos`: J/K, C/D/F, M e ? para quem já encerrou três achados com o mouse.
 *
 * Guardadas no navegador (decisão D4): não há preferência por usuário no
 * banco, e um navegador novo mostrar as dicas de novo é um custo pequeno.
 * "Como funciona o Nexo" as traz de volta (`esquecerDicas`).
 */
import { useSyncExternalStore } from "react";

export type IdDaDica = "processamento" | "primeira-revisao" | "atalhos";

const CHAVE = "nexo:dicas-vistas";
const ouvintes = new Set<() => void>();
let vistas: ReadonlySet<IdDaDica> | null = null;
const NENHUMA: ReadonlySet<IdDaDica> = new Set();
/** No servidor e antes de ler o navegador, nenhuma dica aparece: melhor calar do que piscar. */
const TODAS: ReadonlySet<IdDaDica> = new Set(["processamento", "primeira-revisao", "atalhos"]);

function ler(): ReadonlySet<IdDaDica> {
  if (vistas) return vistas;
  try {
    const cru = JSON.parse(window.localStorage.getItem(CHAVE) ?? "[]") as unknown;
    vistas = new Set(Array.isArray(cru) ? (cru.filter((x) => typeof x === "string") as IdDaDica[]) : []);
  } catch {
    // Sem armazenamento, nenhuma dica: ela voltaria a cada visita e viraria ruído.
    vistas = TODAS;
  }
  return vistas;
}

function gravar(proximas: ReadonlySet<IdDaDica>) {
  vistas = proximas;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify([...proximas]));
  } catch {
    // Vale só nesta aba.
  }
  for (const f of ouvintes) f();
}

function assinar(f: () => void) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

/** Marca a dica como vista. Chamar mais de uma vez não faz nada. */
export function marcarDica(id: IdDaDica) {
  const atuais = ler();
  if (atuais.has(id)) return;
  gravar(new Set([...atuais, id]));
}

/** "Como funciona o Nexo": as dicas voltam a aparecer, cada uma na hora dela. */
export function esquecerDicas() {
  gravar(NENHUMA);
}

export function useDica(id: IdDaDica) {
  const atuais = useSyncExternalStore(assinar, ler, () => TODAS);
  return { mostrar: !atuais.has(id), fechar: () => marcarDica(id) };
}

/*
 * OS ATALHOS SÓ PARA QUEM JÁ ESTÁ RÁPIDO: a dica aparece depois de três achados
 * encerrados com o mouse nesta sessão. Quem já usa o teclado nunca a vê.
 */
let encerradosComMouse = 0;
const lerEncerrados = () => encerradosComMouse;

export function encerrouComMouse() {
  encerradosComMouse++;
  for (const f of ouvintes) f();
}

export function useEncerradosComMouse() {
  return useSyncExternalStore(assinar, lerEncerrados, () => 0);
}
