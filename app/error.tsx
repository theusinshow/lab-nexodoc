"use client";

import { useEffect, useState } from "react";

import "@/app/ds.css";
import "@/components/moldura/moldura.css";
import { PaginaQueNaoCarregou } from "@/components/moldura/paginas-especiais";
import { FONTES_DS } from "@/lib/ds/fontes";
import { reportarErro, type ChamadoCurto } from "@/lib/suporte/cliente";

/*
 * O ERRO DE UMA ROTA, no sistema novo. É componente de cliente (regra do Next),
 * então não lê a sessão para montar o Topo: a página diz o que houve e dá as
 * duas saídas. O `digest` é o código que o servidor registrou no log — é o que
 * se procura lá quando alguém relata o problema.
 *
 * O erro vira chamado sozinho ([[lib/suporte/cliente.ts]]); o protocolo aparece
 * na página e "Contar o que aconteceu" complementa aquele chamado.
 */
export default function ErroDaRota({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [chamado, setChamado] = useState<ChamadoCurto | null>(null);
  useEffect(() => {
    console.error(error);
    void reportarErro({ nome: error.name || "Error", mensagem: error.message || "erro sem mensagem", digest: error.digest }).then(setChamado);
  }, [error]);
  return (
    <div className={`ds ${FONTES_DS} md-raiz`}>
      <main id="conteudo">
        <PaginaQueNaoCarregou onTentar={reset} codigo={error.digest} chamado={chamado} />
      </main>
    </div>
  );
}
