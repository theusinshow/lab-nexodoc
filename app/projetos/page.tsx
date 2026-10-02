import { Moldura } from "@/components/moldura/moldura";
import { TelaProjetos, type ObraDaLista } from "@/components/telas/projetos/tela-projetos";
import { cidadeDoCliente } from "@/lib/cliente-do-projeto";
import { getPrisma } from "@/lib/db";
import { carregarMoldura } from "@/lib/moldura";
import { getUserActor, normalizeEmail } from "@/lib/project-store";

/**
 * PROJETOS no sistema novo: achar a obra e entrar nela. A consulta é a de
 * antes (os projetos de quem lê, ou do escritório dele, atualizados primeiro),
 * mais o que a tela nova mostra: a cidade, os três últimos eventos da obra e
 * o que espera nela (achados abertos, e quantos com quem lê).
 */
export default async function ProjectsPage() {
  const dados = await carregarMoldura("/projetos");
  if (dados.semBanco) {
    return (
      <Moldura dados={dados} atual="Projetos">
        <TelaProjetos obras={[]} semBanco podeCriar={false} />
      </Moldura>
    );
  }

  const actor = await getUserActor(normalizeEmail(dados.usuario.email), dados.usuario.nome);
  const projetos = await getPrisma().project.findMany({
    where: {
      deletedAt: null,
      OR: [{ ownerEmail: actor.email }, { organization: { members: { some: { email: actor.email, status: "ACTIVE" } } } }],
    },
    include: {
      _count: { select: { documents: true, uploads: true, artifacts: true, events: true } },
      events: { orderBy: { createdAt: "desc" }, take: 3, select: { title: true, createdAt: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  /*
   * O QUE ESPERA EM CADA OBRA: achados atribuídos e abertos, e quantos estão
   * com quem lê. Uma consulta para a página inteira, não uma por linha.
   */
  const abertos = await getPrisma().auditFeedback.findMany({
    where: { resolvedAt: null, assigneeEmail: { not: null }, audit: { projectId: { in: projetos.map((p) => p.id) } } },
    select: { assigneeEmail: true, audit: { select: { projectId: true } } },
  });
  const espera = new Map<string, { pendentes: number; comVoce: number }>();
  for (const a of abertos) {
    const id = a.audit.projectId;
    if (!id) continue;
    const atual = espera.get(id) ?? { pendentes: 0, comVoce: 0 };
    atual.pendentes += 1;
    if (a.assigneeEmail?.toLowerCase() === actor.email.toLowerCase()) atual.comVoce += 1;
    espera.set(id, atual);
  }

  const obras: ObraDaLista[] = projetos.map((p) => ({
    id: p.id,
    codigo: p.code,
    nome: p.name,
    cliente: p.client,
    cidade: cidadeDoCliente(p.client),
    observacoes: p.description,
    arquivada: p.status === "ARCHIVED",
    atualizadoEm: p.updatedAt.toISOString(),
    contagens: { documentos: p._count.documents, arquivos: p._count.uploads, gerados: p._count.artifacts, eventos: p._count.events },
    pendentes: espera.get(p.id)?.pendentes ?? 0,
    comVoce: espera.get(p.id)?.comVoce ?? 0,
    ultimos: p.events.map((e) => ({ quando: e.createdAt.toISOString(), oque: e.title })),
  }));

  // Cadastrar projeto é ato de coordenação (a API recusa MEMBER): o botão não promete o que não vai fazer.
  const papel = dados.usuario.papelNoEscritorio;
  const podeCriar = dados.usuario.ehAdmin || papel === "OWNER" || papel === "ADMIN";

  return (
    <Moldura dados={dados} atual="Projetos">
      <TelaProjetos obras={obras} semBanco={false} podeCriar={podeCriar} />
    </Moldura>
  );
}
