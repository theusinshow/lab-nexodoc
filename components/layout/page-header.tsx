import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { NavegacaoPrincipal } from "@/components/layout/navegacao-principal";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  backHref?: string;
  backLabel?: string;
  /**
   * Mostra a navegação principal no topo (G01). Recebe se quem lê administra,
   * para o destino Administração aparecer só com permissão.
   */
  navegacao?: { ehAdmin: boolean };
}

export function PageHeader({
  title,
  description,
  children,
  className,
  backHref,
  // "Painel de módulos" era o nome de uma tela que não existe mais (G07).
  backLabel = "Painel",
  navegacao,
}: PageHeaderProps) {
  return (
    <div className={cn("border-b border-border pb-4", className)}>
      {navegacao ? (
        <NavegacaoPrincipal ehAdmin={navegacao.ehAdmin} className="mb-4" />
      ) : null}
      {backHref && !navegacao && (
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {backLabel}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
          {description && (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="flex shrink-0 items-center gap-3">{children}</div>
        )}
      </div>
    </div>
  );
}
