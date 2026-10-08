"use client";

/**
 * A DICA DE UMA VEZ: uma nota na própria tela, ao lado do que ela explica, com
 * "Entendi". Não é balão, não cobre o alvo e não bloqueia clique — a pessoa
 * segue trabalhando com ela aberta. Ver [[modules/nexo/lib/dicas-da-auditoria.ts]].
 */
import { Lightbulb, X } from "lucide-react";
import type { ReactNode } from "react";

import { useDica, type IdDaDica } from "@/modules/nexo/lib/dicas-da-auditoria";

import "./dica-de-uma-vez.css";

export function DicaDeUmaVez({
  id,
  titulo,
  quando = true,
  children,
}: {
  id: IdDaDica;
  titulo: string;
  /** Uma condição a mais para aparecer (ex.: três achados encerrados com o mouse). */
  quando?: boolean;
  children: ReactNode;
}) {
  const dica = useDica(id);
  if (!dica.mostrar || !quando) return null;
  return (
    <aside className="dica-uma" aria-label={titulo} data-dica={id}>
      <Lightbulb size={14} aria-hidden className="dica-uma-icone" />
      <div className="dica-uma-corpo">
        <b>{titulo}</b>
        {children}
      </div>
      <button type="button" className="dica-uma-fechar" onClick={dica.fechar}>
        Entendi
        <X size={12} aria-hidden />
      </button>
    </aside>
  );
}
