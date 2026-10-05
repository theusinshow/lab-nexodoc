/**
 * A ABA PROJETOS do admin (05/10/2026) — o que cada projeto guarda.
 *
 * Só LEITURA. Apagar é com o expurgo ([[server/admin/expurgo.ts]]), pelos
 * alcances `projeto` e `itens`: um caminho só de exclusão, com a mesma prévia
 * contada no banco e a mesma lápide para as máquinas. Uma rota de apagar
 * própria desta tela seria o segundo caminho — e o segundo caminho é o que
 * esquece de recolher o arquivo órfão ou de gravar a lápide.
 *
 * O `data` das conversas só é lido no DETALHE, e só para contar as auditorias
 * que cada uma registrou: o elo conversa→auditoria vive dentro do JSON.
 */
import { getPrisma } from "@/lib/db";
import { auditoriasDasConversas } from "@/lib/expurgo";

export interface ProjetoListado {
  id: string;
  code: string;
  name: string;
  client: string;
  ownerEmail: string;
  atualizadoEm: string;
  auditorias: number;
  conversas: number;
  lds: number;
  artefatos: number;
  documentos: number;
}

export async function listarProjetos(): Promise<ProjetoListado[]> {
  const projetos = await getPrisma().project.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      code: true,
      name: true,
      client: true,
      ownerEmail: true,
      updatedAt: true,
      _count: {
        select: { audits: true, nexoConversations: true, ldDrafts: true, artifacts: true, documents: true, uploads: true },
      },
    },
  });

  return projetos.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    client: p.client,
    ownerEmail: p.ownerEmail,
    atualizadoEm: p.updatedAt.toISOString(),
    auditorias: p._count.audits,
    conversas: p._count.nexoConversations,
    lds: p._count.ldDrafts,
    artefatos: p._count.artifacts,
    documentos: p._count.documents + p._count.uploads,
  }));
}

export interface DetalheDoProjeto {
  projeto: ProjetoListado;
  conversas: {
    id: string;
    title: string;
    tipo: string | null;
    userEmail: string;
    atualizadaEm: string;
    /** Os ids das auditorias que a conversa registrou — saem com ela. */
    auditorias: string[];
  }[];
  auditorias: {
    id: string;
    title: string;
    status: string;
    achados: number;
    criadaEm: string;
    quem: string | null;
    /** A conversa que a registrou, quando há: apagá-la leva esta auditoria junto. */
    conversaId: string | null;
  }[];
  lds: { id: string; title: string; status: string; atualizadaEm: string; userEmail: string }[];
  artefatos: { id: string; fileName: string; kind: string; sizeBytes: number | null; criadoEm: string }[];
}

export async function detalheDoProjeto(id: string): Promise<DetalheDoProjeto | null> {
  const prisma = getPrisma();
  const lista = await listarProjetos();
  const projeto = lista.find((p) => p.id === id);
  if (!projeto) return null;

  const [conversas, auditorias, lds, artefatos] = await Promise.all([
    prisma.nexoConversation.findMany({
      where: { projectId: id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, tipo: true, userEmail: true, updatedAt: true, data: true },
    }),
    prisma.audit.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, status: true, totalFindings: true, createdAt: true, user: { select: { email: true } } },
    }),
    prisma.ldDraft.findMany({
      where: { projectId: id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, status: true, updatedAt: true, userEmail: true },
    }),
    prisma.documentArtifact.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, fileName: true, kind: true, sizeBytes: true, createdAt: true },
    }),
  ]);

  const conversaDaAuditoria = new Map<string, string>();
  const conversasListadas = conversas.map((c) => {
    const ids = auditoriasDasConversas([c.data]);
    for (const auditId of ids) conversaDaAuditoria.set(auditId, c.id);
    return {
      id: c.id,
      title: c.title,
      tipo: c.tipo,
      userEmail: c.userEmail,
      atualizadaEm: c.updatedAt.toISOString(),
      auditorias: ids,
    };
  });

  return {
    projeto,
    conversas: conversasListadas,
    auditorias: auditorias.map((a) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      achados: a.totalFindings,
      criadaEm: a.createdAt.toISOString(),
      quem: a.user?.email ?? null,
      conversaId: conversaDaAuditoria.get(a.id) ?? null,
    })),
    lds: lds.map((l) => ({ id: l.id, title: l.title, status: l.status, atualizadaEm: l.updatedAt.toISOString(), userEmail: l.userEmail })),
    artefatos: artefatos.map((a) => ({ id: a.id, fileName: a.fileName, kind: a.kind, sizeBytes: a.sizeBytes, criadoEm: a.createdAt.toISOString() })),
  };
}
