"use client";

import { useEffect, useRef } from "react";

/**
 * A CONFIRMAÇÃO DE AÇÃO DESTRUTIVA, na tela, no lugar do botão que a pediu.
 *
 * Nasceu em `app/admin/pessoas` e saiu de lá para substituir os três
 * `window.confirm` que restavam (excluir projeto, auditorias e LDs). O diálogo
 * do navegador não sabe o nome da obra, não diz o que fica, cobre a tela que
 * explicava o que se estava apagando — e, num clique distraído, o Enter já
 * confirma, porque o foco nasce no "OK".
 *
 * Aqui é o contrário, e é a regra aprovada no laboratório (peças de toda tela,
 * "confirmar antes de apagar"):
 *  - o botão REPETE O VERBO ("Excluir permanentemente", nunca "OK");
 *  - o foco nasce em Cancelar: desistir é o gesto mais fácil, e um Enter
 *    distraído não apaga nada;
 *  - Esc desiste.
 *
 * Coral na borda e no confirmar: `--status-critical` é a cor de perigo, seja
 * status ou ação (§2).
 */
export function CartaoDeConfirmacao({
  pergunta,
  verbo = "Confirmar",
  ocupado = false,
  onConfirmar,
  onCancelar,
}: {
  pergunta: string;
  /** O que o botão faz, com as palavras da ação: "Excluir", "Excluir permanentemente". */
  verbo?: string;
  /** Enquanto a ação roda: os dois botões travam, para não confirmar duas vezes. */
  ocupado?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const cancelar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelar.current?.focus();
  }, []);

  return (
    <div
      role="alertdialog"
      aria-label={pergunta}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || ocupado) return;
        event.preventDefault();
        onCancelar();
      }}
      className="nx-edge-8 flex flex-wrap items-center gap-3 p-3 [--nx-edge:var(--status-critical)]"
    >
      <p className="min-w-0 flex-1 text-sm">{pergunta}</p>
      <button
        type="button"
        onClick={onConfirmar}
        disabled={ocupado}
        className="nx-edge-7 inline-flex h-10 items-center px-4 font-mono text-[12px] text-[var(--status-critical)] [--nx-edge:var(--status-critical)] [--nx-fill:var(--status-critical-tint)] disabled:opacity-50"
      >
        {ocupado ? "Aguarde…" : verbo}
      </button>
      <button
        ref={cancelar}
        type="button"
        onClick={onCancelar}
        disabled={ocupado}
        className="nx-edge-7 inline-flex h-10 items-center px-4 font-mono text-[12px] text-muted-foreground transition-colors [--nx-edge:var(--border)] [--nx-fill:var(--card)] hover:text-foreground disabled:opacity-50"
      >
        Cancelar
      </button>
    </div>
  );
}
