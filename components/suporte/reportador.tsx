"use client";

import { useCallback, useEffect, useState } from "react";

import { Pop } from "@/components/ui/pop";
import { FONTES_DS } from "@/lib/ds/fontes";
import { abrirSuporte, EVENTO_ABRIR, instalarSuporte, type ChamadoCurto, type PedidoDeAbertura } from "@/lib/suporte/cliente";
import { formatarProtocolo } from "@/lib/suporte/comum";
import { tirarPrint } from "@/lib/suporte/print";

import { GavetaDeSuporte } from "./gaveta-de-suporte";
import "./suporte.css";

/*
 * O REPORTADOR mora no layout raiz — vale em toda tela, inclusive no palco do
 * Nexo e fora da moldura. Instala a trilha, escuta o pedido de abertura
 * (`abrirSuporte()` de qualquer lugar, ou Ctrl+Shift+B) e mostra o aviso
 * quando uma requisição falha do nosso lado.
 *
 * O PRINT SAI ANTES DA GAVETA: a tela fotografada é a que a pessoa via.
 */
export function Reportador() {
  const [aberta, setAberta] = useState<{ pedido: PedidoDeAbertura; print: string | null } | null>(null);
  const [falha, setFalha] = useState<{ chamado: ChamadoCurto | null } | null>(null);

  useEffect(() => instalarSuporte((chamado) => setFalha({ chamado })), []);

  const abrir = useCallback(async (pedido: PedidoDeAbertura) => {
    setFalha(null);
    setAberta({ pedido, print: await tirarPrint() });
  }, []);

  useEffect(() => {
    const pedido = (e: Event) => void abrir((e as CustomEvent<PedidoDeAbertura>).detail ?? {});
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        void abrir({});
      }
    };
    window.addEventListener(EVENTO_ABRIR, pedido);
    document.addEventListener("keydown", tecla);
    return () => {
      window.removeEventListener(EVENTO_ABRIR, pedido);
      document.removeEventListener("keydown", tecla);
    };
  }, [abrir]);

  return (
    <div className={`ds ${FONTES_DS} sp-raiz`}>
      {aberta && <GavetaDeSuporte pedido={aberta.pedido} printInicial={aberta.print} onFechar={() => setAberta(null)} />}
      {falha && !aberta && (
        <div className="sp-aviso" data-suporte-fora="1">
          <Pop tom="falha" onFechar={() => setFalha(null)}>
            Algo falhou do nosso lado. Já fomos avisados{falha.chamado ? ` (${formatarProtocolo(falha.chamado.protocolo)})` : ""}.{" "}
            <button
              type="button"
              className="sp-aviso-link"
              onClick={() => abrirSuporte({ chamadoId: falha.chamado?.id, protocolo: falha.chamado?.protocolo, categoria: "ERRO" })}
            >
              Contar o que aconteceu
            </button>
          </Pop>
        </div>
      )}
    </div>
  );
}
