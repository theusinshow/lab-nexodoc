/**
 * AS REGRAS DO SUPORTE no servidor: o que é "o mesmo erro", quando somar,
 * quando reabrir e quando o dev recebe e-mail. Puro (só `node:crypto`), para o
 * teste decidir sem banco.
 */
import { createHash } from "node:crypto";

import { normalizarRota, type StatusDoChamado } from "./comum.ts";

export const TETO_MANUAL_POR_HORA = 10;
export const TETO_AUTOMATICO_POR_HORA = 200;
/** Um 5xx visto no navegador casa com o erro de servidor da mesma rota dentro desta janela. */
export const JANELA_DE_CASAMENTO_MS = 120_000;

/**
 * Rota normalizada + nome do erro + primeira linha da mensagem com os números
 * apagados ("timeout after 3012ms" e "after 18ms" são o mesmo defeito).
 */
export function impressaoDoErro(a: { rota: string; nome: string; mensagem: string }): string {
  const linha = (String(a.mensagem).split("\n")[0] ?? "").trim().slice(0, 200).replace(/\d+/g, "N");
  return createHash("sha1").update(`${normalizarRota(a.rota)}\n${a.nome}\n${linha}`).digest("hex");
}

/** 1, 10, 100, 1000… */
export function ehMarco(n: number): boolean {
  if (n < 1) return false;
  let m = 1;
  while (m < n) m *= 10;
  return m === n;
}

export type Decisao = { acao: "criar" | "somar" | "reabrir"; ocorrencias: number; avisar: boolean; motivo: "novo" | "marco" | "reaberto" | null };

export function decidirOcorrencia(existente: { status: StatusDoChamado; ocorrencias: number } | null): Decisao {
  if (!existente) return { acao: "criar", ocorrencias: 1, avisar: true, motivo: "novo" };
  const ocorrencias = existente.ocorrencias + 1;
  if (existente.status === "RESOLVIDO") return { acao: "reabrir", ocorrencias, avisar: true, motivo: "reaberto" };
  const marco = ehMarco(ocorrencias);
  return { acao: "somar", ocorrencias, avisar: marco, motivo: marco ? "marco" : null };
}

export const podeAbrirManual = (criadosNaUltimaHora: number) => criadosNaUltimaHora < TETO_MANUAL_POR_HORA;
