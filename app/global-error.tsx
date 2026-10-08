"use client";

import { useEffect, useState } from "react";

import { reportarErro } from "@/lib/suporte/cliente";
import { formatarProtocolo } from "@/lib/suporte/comum";

/*
 * O ERRO QUE DERRUBOU O LAYOUT RAIZ. Aqui não há moldura nem Reportador
 * (eles moram no layout que caiu), então a página é mínima e de estilo
 * próprio: diz o que houve, o protocolo do chamado já aberto e tenta de novo.
 */
export default function ErroGlobal({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [protocolo, setProtocolo] = useState<number | null>(null);
  useEffect(() => {
    void reportarErro({ nome: error.name || "Error", mensagem: error.message || "erro sem mensagem", digest: error.digest }).then((c) =>
      setProtocolo(c?.protocolo ?? null),
    );
  }, [error]);
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a0b0d", color: "#eeeff2", font: "15px/1.5 system-ui, sans-serif" }}>
        <main style={{ maxWidth: 440, padding: 24 }}>
          <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>O Nexo não carregou.</h1>
          <p style={{ color: "#a4a8b3", margin: "0 0 20px" }}>
            Nada foi alterado. {protocolo !== null ? `Já fomos avisados (${formatarProtocolo(protocolo)}).` : "Estamos registrando o problema."}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ padding: "10px 18px", borderRadius: 999, border: 0, background: "#f2f3f5", color: "#0a0b0d", font: "inherit", cursor: "pointer" }}
          >
            Tentar de novo
          </button>
        </main>
      </body>
    </html>
  );
}
