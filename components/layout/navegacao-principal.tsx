"use client";

/**
 * A NAVEGAÇÃO PRINCIPAL desenhada — G01. Links de texto, sempre visíveis onde
 * cabem; `aria-current="page"` no destino atual. Os destinos e a ordem moram em
 * [[lib/navegacao-principal.ts]].
 */
import Link from "next/link";
import { usePathname } from "next/navigation";

import { destinoAtivo, destinosPara } from "@/lib/navegacao-principal";
import { cn } from "@/lib/utils";

export function NavegacaoPrincipal({
  ehAdmin,
  className,
  compacta = false,
}: {
  ehAdmin: boolean;
  className?: string;
  /** Grade de duas colunas (barra lateral do Nexo) em vez de uma fileira. */
  compacta?: boolean;
}) {
  const caminho = usePathname() ?? "/";
  return (
    <nav aria-label="Navegação principal" className={className} data-navegacao-principal>
      <ul
        className={cn(
          "m-0 list-none p-0",
          compacta ? "grid grid-cols-2 gap-x-2 gap-y-0.5" : "flex flex-wrap items-center gap-x-1 gap-y-1",
        )}
      >
        {destinosPara(ehAdmin).map((d) => {
          const atual = destinoAtivo(d, caminho);
          return (
            <li key={d.href} className="min-w-0">
              <Link
                href={d.href}
                title={d.resumo}
                aria-current={atual ? "page" : undefined}
                className={cn(
                  "block truncate outline-none transition-colors duration-[var(--duration-fast)] focus-visible:text-foreground focus-visible:underline",
                  compacta
                    ? "px-2 py-1 text-[12.5px]"
                    : "nx-cut-6 px-2.5 py-1.5 text-[13px]",
                  atual
                    ? "bg-[var(--nexodoc-raised)] font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {d.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
