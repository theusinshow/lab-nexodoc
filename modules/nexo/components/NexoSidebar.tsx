"use client";

/**
 * AS CONVERSAS, por obra — a coluna da esquerda do Nexo (migração, passo 5;
 * desenho do lab: `Conversas` em app/lab/telas/nexo/tela-nexo.tsx).
 *
 * O que saiu daqui, e para onde foi:
 *  - a marca, a navegação principal e a conta: estão no Topo, em toda tela;
 *  - "Buscar ações": a busca do Topo abre a mesma paleta (e o Ctrl K também);
 *  - o menu da obra (nova conversa a partir da mais recente, limpar, apagar a
 *    pasta inteira): saiu por decisão do Matheus em 01/10/2026 ("pode
 *    retirar"). Expurgar conversas é do Centro de controle (Dados).
 *
 * O que ficou é o trabalho: começar uma conversa, achar a obra e entrar na
 * conversa certa. E o aviso de gravação, que só aparece quando falha.
 */

import { CloudOff, Compass, MessageSquarePlus, Search, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { Botao } from "@/components/ds/basicos";
import type { ConversationSummary } from "../lib/nexo-db";
import { avisoDeGravacao } from "../lib/aviso-de-gravacao";
import type { EstadoDaSincronizacao } from "../lib/nexo-sync";
import { ListaDeProjetos } from "./ListaDeProjetos";
import "@/components/telas/mapa/mapa.css";
import "@/components/telas/nexo/nexo.css";

export function NexoSidebar({
  onNewConversation,
  conversations = [],
  activeId,
  onSelect,
  onVerTour,
  sincronizacao,
  gravacaoLocal,
}: {
  onNewConversation?: () => void;
  conversations?: ConversationSummary[];
  sincronizacao?: EstadoDaSincronizacao;
  gravacaoLocal?: "ok" | "falhou";
  activeId?: string;
  onSelect?: (id: string) => void;
  onVerTour?: () => void | Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const vazia = conversations.length === 0;

  /*
   * A GRAVAÇÃO SÓ APARECE QUANDO FALHA — E O VOLUME VEM DO RISCO. Uma das duas
   * cópias falhou: âmbar, dizendo o que está garantido. As duas: alarme, porque
   * fechar a aba perde o trabalho. Quem decide é [[aviso-de-gravacao.ts]].
   */
  const nivel = avisoDeGravacao(gravacaoLocal ?? "ok", sincronizacao?.estado ?? "desligada");

  return (
    <aside aria-label="Conversas" className="nw-conversas nx-conversas">
      {/* "Nova conversa", e não "Novo projeto" (G07): o projeto nasce dos
          documentos anexados, ou se cria em Projetos. */}
      <Botao variante="ghost" tamanho="sm" className="nw-nova" onClick={onNewConversation} aria-label="Nova conversa">
        <MessageSquarePlus size={14} aria-hidden /> Nova conversa
      </Botao>

      {!vazia && (
        <label className="mp-busca nw-busca">
          <Search size={14} aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar obra ou código" aria-label="Buscar conversas por obra ou código" />
        </label>
      )}

      <div id="nexo-historico" className="nw-pastas nx-pastas">
        {vazia ? (
          <p className="nx-conversas-vazio">Cada obra vira uma pasta aqui, com as conversas dela. O projeto nasce do carimbo: solte as pranchas ou o memorial na conversa.</p>
        ) : (
          <ListaDeProjetos conversations={conversations} query={query} {...(activeId ? { activeId } : {})} {...(onSelect ? { onSelect } : {})} />
        )}
      </div>

      {nivel === "grave" ? (
        <div role="alert" className="nx-gravacao nx-gravacao--grave">
          <TriangleAlert size={14} aria-hidden />
          <span>
            Não foi possível salvar este trabalho.
            <small>Exporte o parecer antes de fechar esta aba.</small>
          </span>
        </div>
      ) : nivel !== "nenhum" ? (
        <div role="status" className="nx-gravacao">
          <CloudOff size={14} aria-hidden />
          <span>
            {nivel === "so-disco" ? "Salvo nesta máquina, mas não no servidor." : "Salvo no servidor, mas não neste computador."}
            <small>
              {nivel === "so-disco"
                ? sincronizacao?.estado === "falhou"
                  ? sincronizacao.motivo
                  : ""
                : "O trabalho está seguro. Este navegador pode estar sem espaço."}
            </small>
          </span>
        </div>
      ) : null}

      {onVerTour && (
        <button type="button" className="nx-tour" onClick={() => void onVerTour()}>
          <Compass size={13} aria-hidden /> Como funciona o Nexo
        </button>
      )}
    </aside>
  );
}
