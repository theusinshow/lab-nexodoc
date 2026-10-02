"use client";

import { useEffect } from "react";

import "@/app/ds.css";
import "@/components/moldura/moldura.css";
import { PaginaQueNaoCarregou } from "@/components/moldura/paginas-especiais";
import { FONTES_DS } from "@/lib/ds/fontes";

/*
 * O ERRO DE UMA ROTA, no sistema novo. É componente de cliente (regra do Next),
 * então não lê a sessão para montar o Topo: a página diz o que houve e dá as
 * duas saídas. O `digest` é o código que o servidor registrou no log — é o que
 * se procura lá quando alguém relata o problema.
 */
export default function ErroDaRota({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className={`ds ${FONTES_DS} md-raiz`}>
      <main id="conteudo">
        <PaginaQueNaoCarregou onTentar={reset} codigo={error.digest} />
      </main>
    </div>
  );
}
