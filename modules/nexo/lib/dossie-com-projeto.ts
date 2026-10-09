/**
 * O DOSSIÊ DO MEMORIAL com o degrau "projeto" da escada (09/10/2026).
 *
 * O classificador já põe a capa antes do corpo em cada campo; o que faltava
 * era o meio: o que o projeto já sabe (a capa do geral, gravada antes).
 * Quando a capa do próprio memorial falou, o valor do dossiê fica como está
 * (o município vem em caixa de título dele); senão o projeto vence o corpo.
 *
 * Módulo puro (imports relativos): os testes rodam em node cru.
 */
import { escadaDaIdentidade } from "../../../lib/escada-da-identidade.ts";
import { CAMPOS_DA_IDENTIDADE, type IdentidadeDoProjeto } from "../../../lib/identidade-do-projeto.ts";
import type { NexoDossieDraft } from "../types";

export function aplicarEscadaAoDossie(dossie: NexoDossieDraft, projeto: IdentidadeDoProjeto | null): NexoDossieDraft {
  const daCapa = (c: (typeof CAMPOS_DA_IDENTIDADE)[number]) => (dossie.capa?.[c] ?? "").trim();
  const capa = dossie.capa
    ? Object.fromEntries(CAMPOS_DA_IDENTIDADE.map((c) => [c, daCapa(c) ? dossie[c] || daCapa(c) : ""]))
    : null;
  const corpo = Object.fromEntries(CAMPOS_DA_IDENTIDADE.map((c) => [c, daCapa(c) ? "" : (dossie[c] ?? "")]));
  const escada = escadaDaIdentidade({ codigoDoArquivo: dossie.codigo, capa, projeto, corpo });

  const origens: NonNullable<NexoDossieDraft["origens"]> = {};
  const proximo: NexoDossieDraft = { ...dossie, origens };
  for (const campo of CAMPOS_DA_IDENTIDADE) {
    const degrau = escada[campo];
    if (!degrau) continue;
    proximo[campo] = degrau.valor;
    origens[campo] = { origem: degrau.origem, ...(degrau.fonte ? { fonte: degrau.fonte } : {}) };
  }
  return proximo;
}
