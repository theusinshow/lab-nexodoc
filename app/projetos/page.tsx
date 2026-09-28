import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { FundoDoAmbiente } from "@/components/ambiente/fundo-do-ambiente";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectConsole, type ProjectConsoleItem } from "@/components/projects/project-console";
import { getUserAccess } from "@/lib/access-control";
import { redirectToLogin } from "@/lib/auth-redirect";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import { getUserActor, normalizeEmail } from "@/lib/project-store";

export default async function ProjectsPage() {
  const session = await auth();

  if (!session?.user) {
    redirectToLogin("/projetos");
  }

  const access = await getUserAccess(session.user.email, session.user.name);

  if (!access.isActive) {
    redirect("/sem-acesso");
  }

  if (!isDatabaseConfigured()) {
    return (
      <main className="mx-auto max-w-7xl space-y-6 px-5 py-6 sm:px-7">
        <PageHeader
          navegacao={{ ehAdmin: access.isAdmin }}
          title="Projetos"
          description="DATABASE_URL não está configurada. Configure o banco para consultar projetos."
        />
      </main>
    );
  }

  const actor = await getUserActor(normalizeEmail(session.user.email ?? ""), session.user.name);
  const projects = await getPrisma().project.findMany({
    where: {
      deletedAt: null,
      OR: [
        { ownerEmail: actor.email },
        {
          organization: {
            members: {
              some: {
                email: actor.email,
                status: "ACTIVE",
              },
            },
          },
        },
      ],
    },
    include: {
      _count: {
        select: {
          documents: true,
          uploads: true,
          artifacts: true,
          events: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  /*
   * O QUE ESPERA EM CADA PROJETO (P01): achados atribuídos e abertos, e quantos
   * estão com quem lê. Uma consulta para a página inteira, não uma por cartão.
   */
  const abertos = await getPrisma().auditFeedback.findMany({
    where: {
      resolvedAt: null,
      assigneeEmail: { not: null },
      audit: { projectId: { in: projects.map((p) => p.id) } },
    },
    select: { assigneeEmail: true, audit: { select: { projectId: true } } },
  });
  const pendencias = new Map<string, { pendentes: number; comVoce: number }>();
  for (const a of abertos) {
    const id = a.audit.projectId;
    if (!id) continue;
    const atual = pendencias.get(id) ?? { pendentes: 0, comVoce: 0 };
    atual.pendentes += 1;
    if (a.assigneeEmail?.toLowerCase() === actor.email.toLowerCase()) atual.comVoce += 1;
    pendencias.set(id, atual);
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-5 py-6 sm:px-7">
      {/* Atmosfera: esta tela nao tem orbe vivo, que e a condicao para o campo
          existir. Ver a regra em `campo-neural.tsx`. */}
      <FundoDoAmbiente />
      <PageHeader
        navegacao={{ ehAdmin: access.isAdmin }}
        title="Projetos"
        description="Os projetos do escritório, com o que está esperando em cada um. Arquivados ficam no filtro Arquivados; criar um projeto é em “Novo projeto”."
      />

      {/* Sem portão de tela larga desde a P01: com a lista primeiro e o cadastro
          sob demanda, a tela cabe numa coluna. */}
      <ProjectConsole
        initialProjects={projects.map((p) => ({ ...serializeProject(p), ...(pendencias.get(p.id) ?? {}) }))}
      />
    </main>
  );
}

function serializeProject(project: {
  id: string;
  code: string;
  name: string;
  client: string;
  description: string;
  status: string;
  updatedAt: Date;
  _count: {
    documents: number;
    uploads: number;
    artifacts: number;
    events: number;
  };
}): ProjectConsoleItem {
  return {
    id: project.id,
    code: project.code,
    name: project.name,
    client: project.client,
    description: project.description,
    status: project.status,
    updatedAt: project.updatedAt.toISOString(),
    counts: {
      documents: project._count.documents,
      uploads: project._count.uploads,
      artifacts: project._count.artifacts,
      events: project._count.events,
    },
  };
}
