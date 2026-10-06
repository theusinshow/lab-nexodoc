"use client";

/**
 * O PROGRESSO DA MONTAGEM, à vista (06/10/2026). "Montando…" num botão não dizia
 * se andava, nem em que tomo, nem o quê. Agora: uma barra com um segmento por
 * tomo, que enche DENTRO do tomo conforme a fase, e uma linha por tomo dizendo o
 * que está acontecendo. Mesma régua da `BarraDeLeitura` das folhas.
 */
import { CircleAlert, CircleCheck, Circle, LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

import { faseEmCurso, pesoDaFase, progressoDoLote, rotuloDaFase, type FaseDaMontagem } from "../lib/progresso-da-montagem";

export function BarraDaMontagem({ fases, rotulo }: { fases: readonly (FaseDaMontagem | undefined)[]; rotulo: string }) {
  const p = progressoDoLote(fases);
  if (p.total === 0) return null;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p.fracao * 100)}
      aria-label={rotulo}
      className="grid w-full gap-[3px]"
      style={{ gridTemplateColumns: `repeat(${p.total}, minmax(0, 1fr))` }}
    >
      {fases.map((f, i) => (
        <span key={i} aria-hidden className="relative h-1.5 overflow-hidden rounded-[1px] border border-border bg-[var(--nexodoc-recessed)]">
          <span
            className={cn(
              "absolute inset-y-0 left-0 transition-[width] duration-500 ease-out motion-reduce:transition-none",
              faseEmCurso(f) && "animate-pulse motion-reduce:animate-none",
            )}
            style={{
              width: `${pesoDaFase(f) * 100}%`,
              background: f === "falhou" ? "var(--destructive)" : "var(--nexodoc-accent)",
            }}
          />
        </span>
      ))}
    </div>
  );
}

function IconeDaFase({ fase }: { fase: FaseDaMontagem | undefined }) {
  if (fase === "pronto") return <CircleCheck className="h-3.5 w-3.5 shrink-0 text-[var(--status-ok)]" aria-hidden />;
  if (fase === "falhou") return <CircleAlert className="h-3.5 w-3.5 shrink-0 text-[var(--destructive)]" aria-hidden />;
  if (faseEmCurso(fase)) return <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--nexodoc-accent)] motion-reduce:animate-none" aria-hidden />;
  return <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />;
}

/** A fase de UM tomo, dentro do cartão dele: ícone girando, o que faz, e a barra. */
export function FaseDoTomo({ fase, pranchas }: { fase: FaseDaMontagem | undefined; pranchas?: number }) {
  if (!faseEmCurso(fase)) return null;
  const texto = rotuloDaFase(fase, pranchas);
  return (
    <div className="flex flex-col gap-1.5" data-prova="fase-do-tomo" aria-live="polite">
      <span className="flex items-center gap-2 text-xs">
        <IconeDaFase fase={fase} />
        <span className="first-letter:uppercase">{texto}…</span>
      </span>
      <BarraDaMontagem fases={[fase]} rotulo={texto} />
    </div>
  );
}

/** O "montar todos": barra do conjunto + uma linha por tomo. */
export function PainelDaMontagem({
  tomos,
  fases,
}: {
  tomos: readonly { id: string; rotulo: string; pranchas?: number }[];
  fases: Readonly<Record<string, FaseDaMontagem>>;
}) {
  const lista = tomos.map((t) => fases[t.id]);
  const p = progressoDoLote(lista);
  if (lista.every((f) => f === undefined)) return null;
  const titulo = p.emCurso
    ? `Montando os volumes · ${p.prontos} de ${p.total} prontos`
    : p.falhas > 0
      ? `${p.prontos} de ${p.total} volumes montados · ${p.falhas} não ${p.falhas === 1 ? "montou" : "montaram"}`
      : `${p.prontos} de ${p.total} volumes montados`;

  return (
    <section className="flex flex-col gap-2 rounded-md border border-border bg-card p-3" data-prova="painel-da-montagem" aria-label="Progresso da montagem">
      <span className="text-xs font-medium" aria-live="polite">
        {titulo}
      </span>
      <BarraDaMontagem fases={lista} rotulo={titulo} />
      <ul className="flex flex-col gap-1">
        {tomos.map((t, i) => (
          <li key={t.id} className={cn("flex items-center gap-2 text-xs", lista[i] === undefined || lista[i] === "aguardando" ? "text-muted-foreground" : "text-foreground")}>
            <IconeDaFase fase={lista[i]} />
            <span className="font-mono">{t.rotulo}</span>
            <span className="text-muted-foreground">{rotuloDaFase(lista[i], t.pranchas)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
