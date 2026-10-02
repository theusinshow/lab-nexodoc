"use client";

/**
 * OS CARTÕES DE PROJETO — uma lista só, para a barra e para a paleta.
 *
 * A barra lateral montava esta lista dentro de `ListaDeProjetos` (busca o
 * resumo do servidor, enxerta nas conversas locais, agrupa em cartões) e a
 * paleta montava OUTRA, por `groupConversations`, que só enxergava o título e o
 * `folderKey`. As duas divergiram na prática: "criciuma" achava projetos na
 * barra e NADA na paleta, porque o código e o cliente vêm do `Project` e só o
 * resumo os tem.
 *
 * Uma tecla que abre uma busca diferente da busca ao lado é pior do que não
 * ter a tecla. Aqui a montagem acontece uma vez e os dois consomem o mesmo.
 *
 * UM PEDIDO SÓ, mesmo com dois consumidores: a promessa em voo é guardada em
 * módulo. Dois `useEffect` independentes fariam duas viagens para a mesma foto
 * — e a segunda chegaria depois, fazendo a paleta e a barra discordarem por
 * alguns segundos, que é a versão intermitente do mesmo defeito.
 */

import { useEffect, useMemo, useState } from "react";

import {
  cartoesDeProjeto,
  type CartaoDeProjeto,
  type ConversaResumida,
} from "../lib/cartoes-de-projeto";
import type { ConversationSummary } from "../lib/nexo-db";
import { useConversation } from "./conversation-store";

/** O que o servidor sabe e o disco não: código, cliente, folhas, artefatos. */
type ResumoDoServidor = ConversaResumida;

let emVoo: Promise<ResumoDoServidor[]> | null = null;

function buscarResumo(): Promise<ResumoDoServidor[]> {
  if (!emVoo) {
    emVoo = fetch("/api/nexo/conversas/resumo")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((p: { conversas?: ResumoDoServidor[] }) => p.conversas ?? [])
      .catch(() => {
        /*
         * Best-effort, e a falha NÃO fica grudada: zerar a promessa deixa a
         * próxima montagem tentar de novo. Guardar a rejeição faria uma queda de
         * rede de um segundo apagar código e cliente até o F5.
         */
        emVoo = null;
        return [] as ResumoDoServidor[];
      });
  }
  return emVoo;
}

/**
 * Esquece a foto guardada — a próxima montagem busca de novo.
 *
 * Existe para quem MUDA o vínculo (endereçar uma conversa, apagar uma pasta):
 * sem isto, o código e o cliente da mudança só apareceriam no próximo F5.
 */
export function esquecerResumo(): void {
  emVoo = null;
}

/**
 * CÓDIGO E CLIENTE DE PROJETOS QUE O RESUMO AINDA NÃO CONHECE — G03/G07.
 *
 * O resumo vem das conversas que o SERVIDOR já tem. Uma conversa recém
 * endereçada nesta máquina (o link "Gerar capas" do projeto, por exemplo) ainda
 * não está lá, e a barra lateral escrevia "Trabalhando no CMUJG75SY…" — o id
 * cru do banco. Busca a lista de projetos da organização uma vez, só quando
 * falta um código.
 */
let projetosEmVoo: Promise<Map<string, { code: string; client: string }>> | null = null;
/**
 * Os projetos que já mandaram buscar a lista de novo. Um projeto CRIADO nesta
 * sessão (a auditoria de um memorial de obra nova o cria) não estava na lista
 * guardada, e a pasta dele ficava sem código nem cliente até o F5 (teste real
 * de 02/10/2026). Cada id desconhecido pede uma busca nova, uma vez — os dois
 * consumidores (barra e paleta) dividem o mesmo pedido.
 */
const jaPediram = new Set<string>();
function buscarProjetos(desconhecidos: readonly string[] = []): Promise<Map<string, { code: string; client: string }>> {
  const novos = desconhecidos.filter((id) => !jaPediram.has(id));
  for (const id of novos) jaPediram.add(id);
  if (novos.length > 0) projetosEmVoo = null;
  if (!projetosEmVoo) {
    projetosEmVoo = fetch("/api/projects?includeArchived=true")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(
        (p: { projects?: { id: string; code: string; client?: string | null }[] }) =>
          new Map((p.projects ?? []).map((x) => [x.id, { code: x.code, client: x.client ?? "" }])),
      )
      .catch(() => {
        projetosEmVoo = null;
        return new Map<string, { code: string; client: string }>();
      });
  }
  return projetosEmVoo;
}

export function useCartoesDeProjeto(
  conversations: readonly ConversationSummary[],
): CartaoDeProjeto[] {
  const [resumo, setResumo] = useState<ResumoDoServidor[] | null>(null);
  const [projetos, setProjetos] = useState<Map<string, { code: string; client: string }> | null>(
    null,
  );
  /** Projetos das conversas que nem o resumo nem a lista de projetos conhecem. */
  const semCodigo = useMemo(() => {
    const doResumo = new Set((resumo ?? []).filter((r) => r.projectCode).map((r) => r.id));
    const ids = conversations
      .filter((c) => c.projectId && !doResumo.has(c.id) && !projetos?.has(c.projectId))
      .map((c) => c.projectId as string);
    return [...new Set(ids)].sort().join(",");
  }, [conversations, resumo, projetos]);
  useEffect(() => {
    if (!semCodigo) return;
    let vivo = true;
    buscarProjetos(semCodigo.split(",")).then((m) => {
      if (vivo) setProjetos(m);
    });
    return () => {
      vivo = false;
    };
  }, [semCodigo]);

  /*
   * A CONVERSA ABERTA FALA POR SI (teste real de 02/10/2026). O resumo é uma
   * foto do servidor tirada na montagem; a conversa em que se está trabalhando
   * agora — 7 folhas lidas, LD, capa, volume montado — seguia "em branco" na
   * barra até o F5, e a pasta contava as folhas de antes. Folhas e artefatos
   * dela vêm do store, que é o que está na tela.
   */
  const { conversationId, seloResults, results } = useConversation();
  const folhasDaAberta = seloResults.length;
  const kindsDaAberta = useMemo(() => [...new Set(results.map((r) => r.kind))].sort().join(","), [results]);

  useEffect(() => {
    let vivo = true;
    buscarResumo().then((r) => {
      if (vivo) setResumo(r);
    });
    return () => {
      vivo = false;
    };
  }, []);

  return useMemo(() => {
    /*
     * O RESUMO É ENXERTADO NA LISTA, e a lista é que manda em quais conversas
     * existem. Ela vem do store (disco + servidor fundidos) e reflete o que foi
     * apagado agora; o resumo é uma foto do servidor de segundos atrás. Deixar o
     * resumo mandar faria uma conversa apagada reaparecer até o próximo F5.
     */
    const porId = new Map((resumo ?? []).map((r) => [r.id, r]));
    const cruas: ConversaResumida[] = conversations.map((c) => {
      const r = porId.get(c.id);
      return {
        id: c.id,
        title: c.title,
        folderKey: c.folderKey ?? null,
        /*
         * O VÍNCULO vem da lista local primeiro: ela reflete o que acabou de ser
         * endereçado nesta máquina, e o resumo é uma foto do servidor de
         * segundos atrás. O código e o cliente só o resumo tem — são do
         * `Project`, e a lista local nunca os viu.
         */
        projectId: c.projectId ?? r?.projectId ?? null,
        projectCode:
          r?.projectCode || projetos?.get(c.projectId ?? r?.projectId ?? "")?.code || "",
        projectClient:
          r?.projectClient || projetos?.get(c.projectId ?? r?.projectId ?? "")?.client || "",
        tipo: c.tipo ?? null,
        updatedAt: c.updatedAt,
        auditoriaPendente: c.temAuditoriaPendente,
        folhas: c.id === conversationId ? folhasDaAberta : (r?.folhas ?? 0),
        kinds: c.id === conversationId ? (kindsDaAberta ? kindsDaAberta.split(",") : []) : (r?.kinds ?? []),
      };
    });
    return cartoesDeProjeto(cruas);
  }, [conversations, resumo, projetos, conversationId, folhasDaAberta, kindsDaAberta]);
}
