import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { AccessDenied } from "@/lib/actor";
import { getUserAccess, requireActor } from "@/lib/access-control";
import { redirectToLogin } from "@/lib/auth-redirect";
import { linkDoNexo } from "@/lib/contexto-da-url";
import { isDatabaseConfigured } from "@/lib/db";
import { enviadosPor, pendenciasDe, type EnvioEmAberto, type ProjetoComPendencia } from "@/lib/fila-de-achados";
import { formatarEmBrasilia } from "@/lib/fuso-de-brasilia";
import { plural } from "@/lib/plural";

/**
 * ACHADOS — a entrada consolidada (auditoria UX/UI, G01, 28/09/2026).
 *
 * Não é um segundo motor nem uma segunda fila: são as MESMAS consultas que já
 * existiam (`pendenciasDe`, a pendência da home) mais o que você atribuiu e
 * ainda está aberto. Cada linha abre o parecer no Nexo, onde a fila, os filtros
 * e o tratamento moram.
 */
export default async function AchadosPage() {
  const session = await auth();
  if (!session?.user) redirectToLogin("/achados");
  const access = await getUserAccess(session.user.email, session.user.name);
  if (!access.isActive) redirect("/sem-acesso");

  let recebidos: ProjetoComPendencia[] = [];
  let enviados: EnvioEmAberto[] = [];
  let semBanco = false;
  if (!isDatabaseConfigured()) {
    semBanco = true;
  } else {
    try {
      const actor = await requireActor();
      [recebidos, enviados] = await Promise.all([
        pendenciasDe(actor.email, actor.organizationId),
        enviadosPor(actor.userId, actor.organizationId),
      ]);
    } catch (err) {
      if (err instanceof AccessDenied) redirect("/sem-acesso");
      throw err;
    }
  }

  const abrir = (auditId: string) => `/nexo?auditoria=${encodeURIComponent(auditId)}`;
  const quando = (iso: string) => formatarEmBrasilia(iso, { dateStyle: "short" });

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-7">
      <PageHeader
        navegacao={{ ehAdmin: access.isAdmin }}
        title="Achados"
        description="Os achados de auditoria que estão com você e os que você atribuiu a alguém. Abrir leva ao parecer no Nexo, com a fila, os filtros e o tratamento."
      >
        <Button asChild variant="outline" size="sm">
          <Link href={linkDoNexo({ intencao: "auditar" })}>Nova auditoria</Link>
        </Button>
      </PageHeader>

      {semBanco ? (
        <p role="status" className="text-sm text-muted-foreground">
          Sem banco configurado neste ambiente, não há achados para listar.
        </p>
      ) : null}

      <section aria-labelledby="com-voce" className="space-y-3" data-secao-achados="recebidos">
        <h2 id="com-voce" className="text-lg font-semibold tracking-[-0.01em]">
          Com você <span className="font-mono text-sm text-muted-foreground">({recebidos.reduce((n, r) => n + r.total, 0)})</span>
        </h2>
        {recebidos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum achado atribuído a você está em aberto.</p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {recebidos.map((r) => (
              <li key={r.auditId} className="nx-cut-8 flex flex-wrap items-center gap-x-4 gap-y-2 bg-card p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs text-muted-foreground">
                    {r.code}
                    {r.client ? ` · ${r.client}` : ""}
                  </p>
                  <p className="text-sm font-medium text-foreground [overflow-wrap:anywhere]">{r.auditTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {plural(r.total, "achado", "achados")}
                    {r.enviadoPor ? ` · enviado por ${r.enviadoPor}` : ""} · {quando(r.enviadoEm)}
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link href={abrir(r.auditId)}>Abrir o parecer</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="atribuidos" className="space-y-3" data-secao-achados="enviados">
        <h2 id="atribuidos" className="text-lg font-semibold tracking-[-0.01em]">
          Atribuídos por você, ainda abertos{" "}
          <span className="font-mono text-sm text-muted-foreground">({enviados.reduce((n, r) => n + r.total, 0)})</span>
        </h2>
        {enviados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada do que você atribuiu está esperando.</p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {enviados.map((e) => (
              <li key={`${e.auditId}-${e.para}`} className="nx-cut-8 flex flex-wrap items-center gap-x-4 gap-y-2 bg-card p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs text-muted-foreground">
                    {e.code}
                    {e.client ? ` · ${e.client}` : ""}
                  </p>
                  <p className="text-sm font-medium text-foreground [overflow-wrap:anywhere]">{e.auditTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {plural(e.total, "achado", "achados")} com {e.para} · desde {quando(e.enviadoEm)}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={abrir(e.auditId)}>Abrir o parecer</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
