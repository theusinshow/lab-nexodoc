"use client";

/**
 * CONFERÊNCIA — o que falta, e a conferência PRESA À VERSÃO (V01/V06).
 *
 * Duas coisas diferentes, e a tela não as mistura:
 * 1. PENDÊNCIAS ESTRUTURAIS: calculadas aqui, sem rede e sem IA, a cada
 *    mudança. Volume vazio, grupo sem pranchas, página que não existe, arquivo
 *    sem conteúdo neste dispositivo, nome final ausente ou repetido. Cada uma
 *    leva ao lugar que precisa de atenção.
 * 2. CONFERÊNCIA DA MONTAGEM: o pedido ao servidor (regras locais + IA, se
 *    configurada) guarda a ASSINATURA da versão enviada. Mudou a montagem, o
 *    resultado vira "de uma versão anterior" — e uma resposta que chegue
 *    atrasada nunca aprova a versão nova.
 */

import { useState } from "react";
import { AlertCircle, ArrowRight, Brain, CheckCircle2, History, Info, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarEmBrasilia } from "@/lib/fuso-de-brasilia";
import {
  assinaturaDaMontagem,
  situacaoDaConferencia,
  type EstadoDaMontagem,
  type Pendencia,
  type prontidaoDaMontagem,
} from "@/modules/volume-builder/lib/volume/mesa";
import { getVolumeApiEndpoint } from "@/modules/volume-builder/lib/utils/volume-api-endpoint";
import type { BatchAnalysisResult } from "@/modules/volume-builder/lib/volume/volume-types";
import type { ConferenciaDaMesa } from "../use-mesa";
import { rowsParaEnvio } from "./envio";

export function ConferenciaDaMontagem({
  estado,
  prontidao,
  assinatura,
  conferencia,
  onConferido,
  onIrPara,
}: {
  estado: EstadoDaMontagem;
  prontidao: ReturnType<typeof prontidaoDaMontagem>;
  assinatura: string;
  conferencia: ConferenciaDaMesa | null;
  onConferido: (c: ConferenciaDaMesa) => void;
  onIrPara: (p: Pendencia) => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const situacao = situacaoDaConferencia(conferencia, assinatura);

  async function conferir() {
    // A ASSINATURA DO PEDIDO, lida AGORA — não a da hora da resposta.
    const enviada = assinaturaDaMontagem(estado);
    setEnviando(true);
    setErro(null);
    try {
      const r = await fetch(getVolumeApiEndpoint("/api/volume/analyze"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: rowsParaEnvio(estado, prontidao),
          metadata: estado.metadata,
          importedFiles: estado.importedFiles,
        }),
      });
      const corpo = (await r.json().catch(() => null)) as (BatchAnalysisResult & { error?: string }) | null;
      if (!r.ok || !corpo || !("status" in corpo)) {
        throw new Error(corpo?.error ?? `O servidor não conferiu (HTTP ${r.status}).`);
      }
      onConferido({ assinatura: enviada, resultado: corpo, em: Date.now() });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível conferir.");
    } finally {
      setEnviando(false);
    }
  }

  const volumesComPendencia = prontidao.volumes.filter((v) => v.bloqueios.length + v.avisos.length > 0);

  return (
    <section aria-label="Conferência" className="space-y-3">
      <div className="border bg-card p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Pendências da montagem</h2>
          {estado.rows.length === 0 ? (
            <Badge variant="secondary">sem volumes</Badge>
          ) : prontidao.bloqueios > 0 ? (
            <Badge variant="warning" data-pendencias={prontidao.bloqueios}>
              {prontidao.bloqueios} impede{prontidao.bloqueios === 1 ? "" : "m"} exportar
            </Badge>
          ) : (
            <Badge variant="ok" data-pendencias="0">
              nada impede exportar
            </Badge>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Regras da estrutura, calculadas aqui a cada mudança — sem IA e sem custo.
        </p>
        {estado.rows.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Crie um volume para começar.</p>
        ) : volumesComPendencia.length === 0 ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-[var(--status-ok)]">
            <CheckCircle2 className="size-4" aria-hidden />
            Estrutura completa em todos os volumes.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {[...prontidao.volumes.flatMap((v) => v.bloqueios), ...prontidao.volumes.flatMap((v) => v.avisos)].map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onIrPara(p)}
                  data-pendencia={p.gravidade}
                  className="flex w-full items-start gap-2 border px-2 py-1.5 text-left text-xs hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {p.gravidade === "bloqueio" ? (
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-[var(--status-critical)]" aria-hidden />
                  ) : (
                    <Info className="mt-0.5 size-3.5 shrink-0 text-[var(--status-warning)]" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="sr-only">{p.gravidade === "bloqueio" ? "Impede exportar: " : "Aviso: "}</span>
                    {p.texto}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] text-muted-foreground">
                    ir para
                    <ArrowRight className="size-3" aria-hidden />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border bg-card p-3" data-conferencia={situacao}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Conferência da montagem</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void conferir()}
            disabled={enviando || estado.rows.length === 0}
          >
            {enviando ? <Loader2 className="animate-spin" aria-hidden /> : <Brain aria-hidden />}
            {situacao === "valida" ? "Conferir de novo" : "Conferir esta versão"}
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Regras do servidor e, se configurada, análise por IA. Vale só para a versão conferida.
        </p>
        <p className="mt-2 text-sm" role="status">
          {situacao === "nunca" ? (
            "Esta montagem ainda não foi conferida."
          ) : situacao === "valida" ? (
            <span className="inline-flex items-center gap-1.5 text-[var(--status-ok)]">
              <CheckCircle2 className="size-4" aria-hidden />
              Conferida às {formatarEmBrasilia(new Date(conferencia!.em).toISOString(), { timeStyle: "short" })} — é
              esta versão.
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[var(--status-warning)]">
              <History className="size-4" aria-hidden />
              Montagem alterada depois da conferência de{" "}
              {formatarEmBrasilia(new Date(conferencia!.em).toISOString(), { timeStyle: "short" })}. O resultado abaixo é da
              versão anterior — confira de novo.
            </span>
          )}
        </p>
        {erro ? <p className="mt-2 text-xs text-[var(--status-critical)]" role="alert">{erro}</p> : null}
        {conferencia ? (
          <ResultadoDaConferencia resultado={conferencia.resultado} antigo={situacao !== "valida"} />
        ) : null}
      </div>
    </section>
  );
}

function ResultadoDaConferencia({ resultado, antigo }: { resultado: BatchAnalysisResult; antigo: boolean }) {
  const problemas = resultado.rowWarnings?.flatMap((r) => r.problems.map((p) => `${r.rowTitle}: ${p}`)) ?? [];
  const avisos = [
    ...(resultado.batchWarnings ?? []),
    ...(resultado.rowWarnings?.flatMap((r) => r.warnings.map((w) => `${r.rowTitle}: ${w}`)) ?? []),
  ];
  return (
    <div className={antigo ? "mt-2 opacity-60" : "mt-2"}>
      <p className="text-xs text-muted-foreground">{resultado.summary}</p>
      {problemas.length + avisos.length === 0 ? (
        <p className="mt-1 text-xs text-[var(--status-ok)]">Nenhum problema apontado.</p>
      ) : (
        <ul className="mt-1 space-y-0.5 text-xs">
          {problemas.map((p, i) => (
            <li key={`p${i}`} className="text-[var(--status-critical)]">
              {p}
            </li>
          ))}
          {avisos.map((w, i) => (
            <li key={`w${i}`} className="text-[var(--status-warning)]">
              {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
