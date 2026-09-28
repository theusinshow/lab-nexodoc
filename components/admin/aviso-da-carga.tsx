"use client";

/**
 * O AVISO DA CARGA — a frase e a saída de cada fase (auditoria UX/UI, P02).
 *
 * Uma peça só para as telas do painel, porque cada uma tinha a sua versão do
 * "aguardando consulta", e três delas não tinham nenhuma: sem token, a tela
 * desenhava zeros e listas vazias como se o servidor tivesse respondido.
 *
 * Fases (ver `lib/estado-da-carga.ts`):
 * - `sem-token`: nada foi consultado — diz onde informar o token;
 * - `carregando`: pedido em voo;
 * - `erro`: a frase do tipo de falha, "Tentar de novo" e, se houver dados de
 *   antes, o horário deles — para ninguém ler número velho como atual;
 * - `ok`: nada (a tela mostra os dados; o horário fica com quem já o mostrava).
 */

import { AlertTriangle, Info, Loader2, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatarEmBrasilia } from "@/lib/fuso-de-brasilia";
import { fraseDaFalha, type FalhaDaCarga, type FaseDaCarga } from "@/lib/estado-da-carga";

export function AvisoDaCarga({
  fase,
  erro,
  detalhe,
  oque,
  atualizadoEm,
  onTentar,
}: {
  fase: FaseDaCarga;
  erro?: FalhaDaCarga | null;
  /** O `error` que o servidor mandou, quando mandou. */
  detalhe?: string | null;
  /** "os números", "as pessoas"… entra nas frases. */
  oque: string;
  /** Quando os dados na tela foram obtidos (ISO), se houver dados. */
  atualizadoEm?: string | null;
  onTentar?: () => void;
}) {
  if (fase === "ok") return null;

  if (fase === "sem-token") {
    return (
      <p
        role="status"
        data-carga="sem-token"
        className="nx-edge-8 flex items-start gap-2 p-3 text-sm text-muted-foreground"
      >
        <Info className="mt-0.5 size-4 shrink-0 text-[var(--signal-info)]" aria-hidden />
        <span>
          Nada foi consultado ainda. Informe o token de administração no rodapé do trilho, à
          esquerda, para carregar {oque}.
        </span>
      </p>
    );
  }

  if (fase === "carregando") {
    return (
      <p
        role="status"
        data-carga="carregando"
        className="nx-edge-8 flex items-center gap-2 p-3 text-sm text-muted-foreground"
      >
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
        Carregando {oque}…
        {atualizadoEm ? (
          <span className="font-mono text-[11px]">
            (na tela: dados de {formatarEmBrasilia(atualizadoEm, { timeStyle: "short" })})
          </span>
        ) : null}
      </p>
    );
  }

  const tipo = erro ?? "servidor";
  return (
    <div
      role="alert"
      data-carga="erro"
      data-falha={tipo}
      className="nx-edge-8 flex flex-wrap items-start gap-3 p-3 text-sm text-[var(--status-critical)] [--nx-edge:var(--status-critical)] [--nx-fill:var(--status-critical-tint)]"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p>{fraseDaFalha(tipo, detalhe)}</p>
        {atualizadoEm ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Os dados abaixo são de{" "}
            {formatarEmBrasilia(atualizadoEm, { dateStyle: "short", timeStyle: "short" })},
            anteriores à falha.
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            Nenhum dado foi carregado — o que aparece abaixo não é resposta do servidor.
          </p>
        )}
      </div>
      {onTentar ? (
        <Button type="button" size="sm" variant="outline" onClick={onTentar}>
          <RotateCw aria-hidden />
          Tentar de novo
        </Button>
      ) : null}
    </div>
  );
}
