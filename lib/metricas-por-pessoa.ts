import { getPrisma } from "@/lib/db";
import { diaEmBrasilia, inicioDoMesEmBrasilia } from "@/lib/fuso-de-brasilia";

/*
 * O QUE CADA PESSOA FAZ, para o centro de controle (03/10/2026).
 *
 * Quase tudo já era gravado com autor — a auditoria tem `userId`, o custo de IA
 * tem `userEmail`, a decisão num achado vira mensagem `resolveu` com
 * `authorEmail`, o evento de obra tem `actorEmail`. O que faltava era juntar.
 * O acesso vem de `AcessoDiario` (ver [[lib/registro-de-acesso.ts]]), que só
 * existe a partir de 03/10/2026: antes disso não há último acesso para ninguém.
 */

export type ResumoDaPessoa = {
  ultimoAcesso: string | null;
  diasComAcesso30: number;
  custoMesUsd: number;
  auditoriasMes: number;
  achadosResolvidos: number;
};

const VAZIO: ResumoDaPessoa = { ultimoAcesso: null, diasComAcesso30: 0, custoMesUsd: 0, auditoriasMes: 0, achadosResolvidos: 0 };

/** O dia de Brasília de `dias` atrás, como a chave do `AcessoDiario`. */
function diaHaDias(dias: number, agora = new Date()): string {
  return diaEmBrasilia(new Date(agora.getTime() - dias * 86_400_000));
}

/** As cinco medidas da tabela de Pessoas, de uma vez para todo mundo (uma consulta por medida, não por pessoa). */
export async function resumoPorPessoa(pessoas: readonly { id: string; email: string }[]): Promise<Map<string, ResumoDaPessoa>> {
  const prisma = getPrisma();
  const emails = pessoas.map((p) => p.email);
  const ids = pessoas.map((p) => p.id);
  const inicioDoMes = inicioDoMesEmBrasilia();
  const [ultimos, dias30, custos, auditorias, resolvidos] = await Promise.all([
    prisma.acessoDiario.groupBy({ by: ["email"], where: { email: { in: emails } }, _max: { ultimo: true } }),
    prisma.acessoDiario.groupBy({ by: ["email"], where: { email: { in: emails }, dia: { gte: diaHaDias(29) } }, _count: { _all: true } }),
    prisma.aiUsageEvent.groupBy({ by: ["userEmail"], where: { userEmail: { in: emails }, createdAt: { gte: inicioDoMes } }, _sum: { estimatedCostUsd: true } }),
    prisma.audit.groupBy({ by: ["userId"], where: { userId: { in: ids }, createdAt: { gte: inicioDoMes } }, _count: { _all: true } }),
    prisma.auditFindingMessage.groupBy({ by: ["authorEmail"], where: { authorEmail: { in: emails }, kind: "resolveu" }, _count: { _all: true } }),
  ]);
  const emailDoId = new Map(pessoas.map((p) => [p.id, p.email]));
  const mapa = new Map<string, ResumoDaPessoa>(emails.map((e) => [e, { ...VAZIO }]));
  for (const u of ultimos) if (u._max.ultimo) mapa.get(u.email)!.ultimoAcesso = u._max.ultimo.toISOString();
  for (const d of dias30) mapa.get(d.email)!.diasComAcesso30 = d._count._all;
  for (const c of custos) if (c.userEmail) mapa.get(c.userEmail)!.custoMesUsd = Number(c._sum.estimatedCostUsd ?? 0);
  for (const a of auditorias) {
    const email = a.userId ? emailDoId.get(a.userId) : undefined;
    if (email) mapa.get(email)!.auditoriasMes = a._count._all;
  }
  for (const r of resolvidos) mapa.get(r.authorEmail)!.achadosResolvidos = r._count._all;
  return mapa;
}

export type ItemDaAtividade = {
  quando: string;
  tipo: "auditoria" | "conversa" | "ld" | "documento" | "achado" | "obra" | "recusa";
  titulo: string;
  detalhe: string;
  href: string | null;
};

const ROTULO_DO_EVENTO: Record<string, string> = {
  AUDIT_CREATED: "pediu uma auditoria",
  AUDIT_COMPLETED: "auditoria concluída",
  COVER_GENERATED: "gerou capa",
  INPUT_UPLOADED: "enviou arquivos",
  VOLUME_GENERATED: "montou volume",
  PROJECT_ARCHIVED: "arquivou a obra",
  PROJECT_CREATED: "cadastrou a obra",
  STATUS_CHANGED: "mudou o estado da obra",
  LD_GENERATED: "gerou LD",
};

/** A linha do tempo de uma pessoa no período, do mais novo para o mais antigo, com o acesso e o custo por dia. */
export async function atividadeDaPessoa(email: string, dias: number) {
  const prisma = getPrisma();
  const desde = new Date(Date.now() - dias * 86_400_000);
  const usuario = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, createdAt: true } });
  const id = usuario?.id ?? "__ninguem__";
  const [auditorias, conversas, lds, documentos, mensagens, eventos, recusas, acessos, custos] = await Promise.all([
    prisma.audit.findMany({ where: { userId: id, createdAt: { gte: desde } }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, title: true, status: true, analysisLevel: true, totalFindings: true, createdAt: true, project: { select: { code: true } } } }),
    prisma.nexoConversation.findMany({ where: { userEmail: email, createdAt: { gte: desde } }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, title: true, tipo: true, createdAt: true, project: { select: { code: true } } } }),
    prisma.ldDraft.findMany({ where: { userEmail: email, createdAt: { gte: desde } }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, title: true, status: true, projectCode: true, createdAt: true } }),
    prisma.documentArtifact.findMany({ where: { userEmail: email, createdAt: { gte: desde } }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, kind: true, fileName: true, createdAt: true, project: { select: { code: true } } } }),
    prisma.auditFindingMessage.findMany({ where: { authorEmail: email, createdAt: { gte: desde } }, orderBy: { createdAt: "desc" }, take: 100, select: { kind: true, body: true, createdAt: true, feedback: { select: { findingLabel: true, auditId: true } } } }),
    prisma.projectEvent.findMany({ where: { actorEmail: email, createdAt: { gte: desde } }, orderBy: { createdAt: "desc" }, take: 100, select: { type: true, title: true, createdAt: true, project: { select: { code: true } } } }),
    prisma.recusaDeAcesso.findMany({ where: { email, createdAt: { gte: desde } }, orderBy: { createdAt: "desc" }, take: 50, select: { motivo: true, createdAt: true } }),
    prisma.acessoDiario.findMany({ where: { email, dia: { gte: diaHaDias(dias) } }, orderBy: { dia: "asc" }, select: { dia: true, primeiro: true, ultimo: true, marcas: true } }),
    prisma.aiUsageEvent.findMany({ where: { userEmail: email, createdAt: { gte: desde } }, select: { createdAt: true, estimatedCostUsd: true } }),
  ]);

  const itens: ItemDaAtividade[] = [
    ...auditorias.map((a) => ({
      quando: a.createdAt.toISOString(),
      tipo: "auditoria" as const,
      titulo: a.title || "Auditoria",
      detalhe: [a.project?.code, a.analysisLevel === "deep" ? "profunda" : "padrão", a.status === "COMPLETED" ? `${a.totalFindings} achados` : a.status.toLowerCase()].filter(Boolean).join(" · "),
      href: `/nexo?auditoria=${encodeURIComponent(a.id)}`,
    })),
    ...conversas.map((c) => ({ quando: c.createdAt.toISOString(), tipo: "conversa" as const, titulo: c.title || "Conversa", detalhe: [c.project?.code, c.tipo].filter(Boolean).join(" · "), href: `/nexo?conversa=${encodeURIComponent(c.id)}` })),
    ...lds.map((l) => ({ quando: l.createdAt.toISOString(), tipo: "ld" as const, titulo: l.title || "Lista de documentos", detalhe: [l.projectCode, l.status === "GENERATED" ? "gerada" : "rascunho"].filter(Boolean).join(" · "), href: null })),
    ...documentos.map((d) => ({ quando: d.createdAt.toISOString(), tipo: "documento" as const, titulo: d.fileName, detalhe: [d.project?.code, d.kind.toLowerCase().replace(/_/g, " ")].filter(Boolean).join(" · "), href: null })),
    ...mensagens.map((m) => ({
      quando: m.createdAt.toISOString(),
      tipo: "achado" as const,
      titulo: `${m.kind === "resolveu" ? "Resolveu" : m.kind === "reabriu" ? "Reabriu" : "Comentou"} ${m.feedback.findingLabel ?? "um achado"}`,
      detalhe: m.body.slice(0, 140),
      href: `/nexo?auditoria=${encodeURIComponent(m.feedback.auditId)}`,
    })),
    ...eventos.map((e) => ({ quando: e.createdAt.toISOString(), tipo: "obra" as const, titulo: e.title || ROTULO_DO_EVENTO[e.type] || e.type, detalhe: [e.project.code, ROTULO_DO_EVENTO[e.type] ?? e.type].filter(Boolean).join(" · "), href: null })),
    ...recusas.map((r) => ({ quando: r.createdAt.toISOString(), tipo: "recusa" as const, titulo: "Tentou entrar e foi barrado", detalhe: r.motivo, href: null })),
  ].sort((a, b) => (a.quando < b.quando ? 1 : -1));

  const custoPorDia = new Map<string, number>();
  for (const c of custos) {
    const dia = diaEmBrasilia(c.createdAt);
    custoPorDia.set(dia, (custoPorDia.get(dia) ?? 0) + Number(c.estimatedCostUsd ?? 0));
  }

  return {
    pessoa: usuario ? { nome: usuario.name, email: usuario.email, desde: usuario.createdAt.toISOString() } : { nome: email, email, desde: null },
    dias,
    totais: {
      auditorias: auditorias.length,
      conversas: conversas.length,
      lds: lds.length,
      documentos: documentos.length,
      achadosResolvidos: mensagens.filter((m) => m.kind === "resolveu").length,
      recusas: recusas.length,
      diasComAcesso: acessos.length,
      custoUsd: [...custoPorDia.values()].reduce((s, v) => s + v, 0),
    },
    acessos: acessos.map((a) => ({ dia: a.dia, primeiro: a.primeiro.toISOString(), ultimo: a.ultimo.toISOString(), marcas: a.marcas })),
    custoPorDia: [...custoPorDia.entries()].sort().map(([dia, usd]) => ({ dia, usd })),
    itens: itens.slice(0, 200),
  };
}
