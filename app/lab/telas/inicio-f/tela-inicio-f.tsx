"use client";

import { useState } from "react";

import { BarraDeComando } from "../_comum/barra-de-comando";
import { Topo } from "../_comum/topo";
import "./inicio-f.css";

export type SituacaoF = "abrindo" | "codigo" | "tarefa" | "pedido" | "arquivo" | "sem-resultado" | "executando" | "primeiro-acesso";

const INICIAL: Record<SituacaoF, string> = {
  abrindo: "",
  codigo: "117",
  tarefa: "aud",
  pedido: "refaz a LD da 063-26 com a revisão C",
  arquivo: "",
  "sem-resultado": "prancha xyz 999",
  executando: "117",
  "primeiro-acesso": "",
};

/**
 * INÍCIO F — a home inteira é a barra de comando, no modo fixo. A lógica da
 * barra mora em _comum/barra-de-comando (a mesma que o Início D usa suspensa).
 */
export function TelaInicioF({ situacao }: { situacao: SituacaoF }) {
  const primeiro = situacao === "primeiro-acesso";
  const [arquivo, setArquivo] = useState(situacao === "arquivo");
  const [soltando, setSoltando] = useState(false);

  return (
    <div
      className="cf"
      onDragOver={(e) => {
        e.preventDefault();
        setSoltando(true);
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setSoltando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSoltando(false);
        setArquivo(true);
      }}
    >
      <Topo atual="Painel" />
      <div className={`cf-centro${soltando ? " cf-centro--soltando" : ""}`}>
        <p className="cf-legenda">
          {primeiro ? "Comece por uma tarefa, ou solte um PDF em qualquer lugar da tela." : "Digite uma obra, uma tarefa ou um pedido. Solte PDFs em qualquer lugar."}
        </p>
        <BarraDeComando
          modo="fixa"
          inicialQ={INICIAL[situacao]}
          primeiro={primeiro}
          executandoInicial={situacao === "executando"}
          arquivo={arquivo}
          onArquivo={setArquivo}
        />
      </div>
    </div>
  );
}
