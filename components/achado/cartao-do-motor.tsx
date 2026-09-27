"use client";

/**
 * O CARTÃO DO ACHADO DO MOTOR NOVO — só desenha o que `findingCard`
 * (`lib/audit-engine/finding-card.ts`) decidiu, na ordem: o que está errado,
 * evidência de cada lado, por que importa, o que fazer, estado e limites.
 *
 * Mora aqui e não em `audit-result.tsx` pelo mesmo motivo da conversa do
 * achado: aquele arquivo já passa de quatro mil linhas.
 *
 * Regras que a tela não pode quebrar:
 * - estado ESCRITO, não só cor (o selo tem texto);
 * - fonte indisponível mostra a citação e diz que o arquivo não está aberto —
 *   não abre outro arquivo no lugar;
 * - realce só quando o modelo mandou (citação única na página).
 */
import { FileText, Wrench } from "lucide-react";

import type { CardNavigation, FindingCardModel } from "@/lib/audit-engine/finding-card";
import { cn } from "@/lib/utils";

const SELO: Record<FindingCardModel["state"]["kind"], string> = {
  confirmed: "border-[var(--status-critical)] text-[var(--status-critical)]",
  open: "border-[var(--status-warning)] text-[var(--status-warning)]",
  contested: "border-[var(--status-warning)] text-[var(--status-warning)]",
  not_verified: "border-border text-muted-foreground",
  legacy: "border-border text-muted-foreground",
};

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </h4>
  );
}

export function CartaoDoMotor({
  modelo,
  aoAbrir,
}: {
  modelo: FindingCardModel;
  aoAbrir?: (nav: Extract<CardNavigation, { kind: "open" }>) => void;
}) {
  return (
    <div className="grid content-start gap-4">
      <p className={cn("w-fit rounded-sm border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em]", SELO[modelo.state.kind])}>
        {modelo.state.label}
      </p>

      <section className="grid gap-1">
        <Titulo>O que está errado</Titulo>
        <p className="max-w-[70ch] text-sm leading-6 text-foreground">{modelo.problem}</p>
      </section>

      {modelo.sources.length ? (
        <section className="grid gap-2">
          <Titulo>Evidência</Titulo>
          <ul className="grid gap-2">
            {modelo.sources.map((s, i) => (
              <li key={`${s.fileName}-${s.page}-${i}`} className="grid gap-1 rounded-sm border bg-[var(--nexodoc-recessed)] p-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono uppercase tracking-[0.08em]">{s.role}</span>
                  <span className="min-w-0 truncate" title={s.fileName}>{s.fileName}</span>
                  <span>p. {s.page}</span>
                </div>
                <blockquote className="max-w-[70ch] text-sm leading-6 text-foreground">“{s.quote}”</blockquote>
                {s.navigation.kind === "open" && aoAbrir ? (
                  <button
                    type="button"
                    onClick={() => aoAbrir(s.navigation as Extract<CardNavigation, { kind: "open" }>)}
                    aria-label={`Abrir ${s.fileName}, página ${s.page}`}
                    className="inline-flex w-fit items-center gap-1 text-xs text-foreground underline underline-offset-2 outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <FileText className="size-3.5" aria-hidden />
                    Abrir página {s.page}
                  </button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Arquivo não disponível nesta tela: confira a página {s.page} de {s.fileName} pela citação acima.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {modelo.calculations.map((c, i) => (
        <section key={i} className="grid gap-1">
          <Titulo>Conta verificada</Titulo>
          <p className="font-mono text-xs">{c.expression} = {c.result}</p>
          <ul className="grid gap-0.5 text-xs text-muted-foreground">
            {c.operands.map((o) => (
              <li key={o.name}>
                <span className="font-mono text-foreground">{o.name}</span> = {o.value} — {o.source}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {modelo.consequence ? (
        <section className="grid gap-1">
          <Titulo>Por que importa</Titulo>
          <p className="max-w-[70ch] text-sm leading-6 text-foreground">{modelo.consequence}</p>
        </section>
      ) : null}

      <section className="nx-cut-6 bg-[var(--status-warning-bg)]/70 p-3">
        <div className="mb-1.5 flex items-center gap-2 text-[var(--status-warning)]">
          <Wrench className="size-4" aria-hidden />
          <h4 className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em]">O que fazer</h4>
        </div>
        <p className="max-w-[68ch] text-sm leading-6 text-[var(--status-warning)]">{modelo.action}</p>
      </section>

      <section className="grid gap-1">
        <Titulo>Estado e limites</Titulo>
        <p className="text-xs text-muted-foreground">{modelo.state.examined}</p>
        {modelo.state.limits.length ? (
          <ul className="grid list-disc gap-0.5 pl-4 text-xs text-muted-foreground">
            {modelo.state.limits.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
