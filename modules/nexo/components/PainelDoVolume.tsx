"use client";

/**
 * O PAINEL DO VOLUME (06/10/2026, Parte 4 do desenho): o que foi gerado, de
 * relance, e a entrega sempre à vista. O canvas continua na vista "Folhas" para
 * quem quer arrastar folha; aqui é para conferir e baixar.
 */
import { ExternalLink } from "lucide-react";
import { useMemo } from "react";

import type { SeloForLd } from "@/server/nexo/build-ld-proposal";

import {
  formatarMb,
  numerosDosTomos,
  rotuloDoTomo,
  tomosMontados,
  volumeDaCapa,
  type TomoMontado,
} from "../lib/entrega-do-volume";
import { useConversation } from "../state/conversation-store";
import { ArtifactThumb } from "./ArtifactThumb";
import { EntregaDoVolume } from "./EntregaDoVolume";

const PDF = "application/pdf";

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

function LinhaDoTomo({ numero, unico, montado }: { numero: number; unico: boolean; montado: TomoMontado | undefined }) {
  return (
    <li
      className="grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-3 border-t border-border py-2 text-xs first:border-t-0"
      data-prova="tomo-do-painel"
    >
      <span className="font-mono">{rotuloDoTomo(numero, unico)}</span>
      {montado ? (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={montado.acimaDoTeto ? "text-[var(--status-warning)]" : "text-muted-foreground"}>
            {montado.url === null
              ? "o PDF não está neste navegador"
              : montado.bytes !== null
                ? formatarMb(montado.bytes)
                : "peso desconhecido"}
            {montado.acimaDoTeto ? " · passa do teto de 20 MB" : ""}
          </span>
          <span
            className={
              montado.veredito === "ok"
                ? "text-[var(--status-ok)]"
                : montado.veredito === "sem-conferencia"
                  ? "text-muted-foreground"
                  : "text-[var(--status-warning)]"
            }
          >
            {montado.veredito === "ok"
              ? "conferido"
              : montado.veredito === "sem-conferencia"
                ? "sem conferência"
                : `${plural(montado.pontos, "ponto", "pontos")} para olhar`}
          </span>
        </span>
      ) : (
        <span className="text-muted-foreground">ainda não montado</span>
      )}
      {montado?.url ? (
        <a
          href={montado.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline"
        >
          <ExternalLink className="h-3 w-3" aria-hidden /> Abrir
        </a>
      ) : (
        <span />
      )}
    </li>
  );
}

export function PainelDoVolume({ selos }: { selos: SeloForLd[] }) {
  const { results, identidade } = useConversation();
  const tomos = useMemo(() => tomosMontados(results), [results]);
  const numeros = useMemo(() => numerosDosTomos(results), [results]);
  const volume = volumeDaCapa(results);
  const capas = useMemo(
    () =>
      results
        .filter((r) => r.kind === "capa")
        .map((r) => ({ id: r.artifactId, pdf: r.files.find((f) => f.mime === PDF)?.url ?? null }))
        .filter((c): c is { id: string; pdf: string } => c.pdf !== null),
    [results],
  );
  const unico = numeros.length <= 1;
  const pontos = tomos.reduce((s, t) => s + t.pontos, 0) + tomos.filter((t) => t.acimaDoTeto).length;

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4" data-prova="painel-do-volume">
      <header className="flex flex-col gap-1">
        <h2 className="text-base font-medium">
          {volume ? `Volume ${volume}` : "Volume"}
          {identidade?.obra ? ` · ${identidade.obra}` : ""}
        </h2>
        <p className="text-xs text-muted-foreground">
          {[
            identidade?.codigo,
            unico ? null : plural(numeros.length, "tomo", "tomos"),
            plural(selos.length, "folha", "folhas"),
            unico ? null : `${tomos.length} de ${numeros.length} montados`,
            pontos > 0 ? `${plural(pontos, "ponto", "pontos")} para olhar` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      <EntregaDoVolume selos={selos} />

      {capas.length > 0 && (
        <section className="flex flex-col gap-2" aria-label="Capas">
          <h3 className="text-xs font-medium text-muted-foreground">{capas.length > 1 ? "Capas" : "Capa"}</h3>
          <div className="flex flex-wrap gap-3">
            {capas.map((c) => (
              // A4 de verdade: 1 : 1,414 (era 3:4 no canvas e "distorcido" no chat).
              <div key={c.id} className="aspect-[1/1.414] w-[180px] overflow-hidden rounded-sm border border-border bg-white">
                <ArtifactThumb pdfUrl={c.pdf} pageNumber={1} kind="capa" width={180} />
              </div>
            ))}
          </div>
        </section>
      )}

      {numeros.length > 0 && (
        <section className="flex flex-col gap-1" aria-label="Tomos">
          <h3 className="text-xs font-medium text-muted-foreground">{unico ? "Volume montado" : "Tomos"}</h3>
          <ul className="rounded-md border border-border bg-card px-3">
            {numeros.map((n) => (
              <LinhaDoTomo key={n} numero={n} unico={unico} montado={tomos.find((t) => t.tomo === n)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
