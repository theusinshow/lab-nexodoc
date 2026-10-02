"use client";

/**
 * AS PASTAS DA COLUNA DE CONVERSAS: uma por obra (projeto vinculado, pasta
 * legada ou "A endereçar"), a mais recente aberta. O agrupamento e o filtro
 * moram em [[../lib/cartoes-de-projeto.ts]]; aqui é só a lista.
 *
 * Abre sozinha a pasta da conversa ativa; sem ativa, a mais recente. Abrir
 * outra fecha a anterior — a coluna é estreita, e duas pastas abertas
 * empurrariam a conversa que se procura para fora da tela.
 */

import { useMemo, useState } from "react";

import { filtrarCartoes } from "../lib/cartoes-de-projeto";
import { useCartoesDeProjeto } from "../state/use-cartoes-de-projeto";
import type { ConversationSummary } from "../lib/nexo-db";
import { CartaoDeProjeto } from "./CartaoDeProjeto";

export function ListaDeProjetos({
  conversations,
  query,
  activeId,
  onSelect,
}: {
  conversations: readonly ConversationSummary[];
  query: string;
  activeId?: string;
  onSelect?: (id: string) => void;
}) {
  const [aberto, setAberto] = useState<string | null>(null);
  const [estendidos, setEstendidos] = useState<ReadonlySet<string>>(() => new Set());

  const cartoes = useCartoesDeProjeto(conversations);
  const filtrados = useMemo(() => filtrarCartoes(cartoes, query), [cartoes, query]);

  const doAtivo = useMemo(
    () => cartoes.find((c) => [...c.conversas, ...c.ocultas].some((x) => x.id === activeId))?.chave ?? null,
    [cartoes, activeId],
  );
  const doMaisRecente = useMemo(() => {
    let melhor: { chave: string; quando: number } | null = null;
    for (const c of cartoes) {
      const topo = c.conversas[0]?.updatedAt ?? 0;
      if (!melhor || topo > melhor.quando) melhor = { chave: c.chave, quando: topo };
    }
    return melhor?.chave ?? null;
  }, [cartoes]);
  const abertoAgora = aberto ?? doAtivo ?? doMaisRecente;

  if (filtrados.length === 0) {
    return (
      <p className="nx-conversas-vazio">
        {query.trim() ? `Nenhuma obra com “${query.trim()}”.` : "Nenhuma conversa ainda. Solte as pranchas ou o memorial na conversa e a obra nasce do carimbo."}
      </p>
    );
  }

  return (
    <ul className="nx-lista-de-pastas">
      {filtrados.map((c) => {
        const estendido = estendidos.has(c.chave) || c.ocultas.some((x) => x.id === activeId);
        return (
          <CartaoDeProjeto
            key={c.chave || "sem-codigo"}
            cartao={c}
            aberto={abertoAgora === c.chave}
            {...(activeId ? { conversaAtiva: activeId } : {})}
            onAlternar={() => setAberto((atual) => (atual === c.chave ? "" : c.chave))}
            onAbrirConversa={(id) => onSelect?.(id)}
            estendido={estendido}
            onVerTudo={(chave) =>
              setEstendidos((atual) => {
                const proximo = new Set(atual);
                if (estendido) proximo.delete(chave);
                else proximo.add(chave);
                return proximo;
              })
            }
          />
        );
      })}
    </ul>
  );
}
