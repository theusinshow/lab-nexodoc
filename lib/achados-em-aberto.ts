/**
 * OS ACHADOS EM ABERTO, por parecer, para a tela Achados.
 *
 * São as MESMAS linhas de `pendenciasDe` e `enviadosPor`
 * ([[lib/fila-de-achados.ts]]) — `AuditFeedback` atribuído e sem
 * `resolvedAt` —, com o que a tela nova mostra a mais: cada achado com o seu
 * nível, disciplina, título e página, para o parecer ser lido antes de abrir.
 *
 * O NÍVEL VEM DO RELATÓRIO GRAVADO, e não da linha de feedback: a linha só
 * guarda o rótulo e a página do momento da atribuição. Os relatórios são lidos
 * uma vez por parecer, não uma por achado.
 */
import type { AuditReport } from "@/lib/audit-report";
import type { FindingDiscipline } from "@/lib/audit-report";
import { getPrisma } from "@/lib/db";
import { disciplinaDoAchado, nivelDoAchado, type Nivel } from "@/lib/nivel-do-achado";
import { rotuloDoAchado } from "@/lib/rotulo-do-achado";

export type AchadoEmAberto = {
  id: string;
  /** Como a tela lê: ACH-014. */
  rotulo: string;
  /** Nulo quando o relatório não o traz: a linha fica, sem nível. */
  nivel: Nivel | null;
  /** O parecer tem relatório e o achado não está nele (o relatório foi refeito). */
  foraDoParecer: boolean;
  disciplina: FindingDiscipline | null;
  titulo: string;
  pagina: string | null;
};

export type ParecerEmAberto = {
  /** auditId, ou auditId::email no que você passou (um parecer pode ir a duas pessoas). */
  chave: string;
  auditId: string;
  codigo: string;
  cliente: string;
  obra: string;
  titulo: string;
  /** Com você: quem mandou (nulo quando não se sabe). Que você passou: com quem está. */
  pessoa: string | null;
  /** A atribuição mais recente do grupo. */
  desde: string;
  achados: AchadoEmAberto[];
};

type Linha = {
  findingId: string | null;
  targetKey: string;
  findingLabel: string | null;
  page: string | null;
  assignedAt: Date | null;
  assignedById: string | null;
  assigneeEmail: string | null;
  audit: { id: string; title: string; project: { code: string; client: string; name: string } | null };
};

const SELECAO = {
  findingId: true,
  targetKey: true,
  findingLabel: true,
  page: true,
  assignedAt: true,
  assignedById: true,
  assigneeEmail: true,
  audit: { select: { id: true, title: true, project: { select: { code: true, client: true, name: true } } } },
} as const;

async function detalhar(linhas: Linha[], agrupar: (l: Linha) => { chave: string; pessoa: string | null }): Promise<ParecerEmAberto[]> {
  const prisma = getPrisma();
  const ids = [...new Set(linhas.map((l) => l.audit.id))];
  const relatorios = new Map<string, AuditReport | null>();
  if (ids.length > 0) {
    const audits = await prisma.audit.findMany({ where: { id: { in: ids } }, select: { id: true, report: true } });
    for (const a of audits) relatorios.set(a.id, a.report as AuditReport | null);
  }

  const grupos = new Map<string, ParecerEmAberto>();
  for (const l of linhas) {
    const projeto = l.audit.project;
    if (!projeto) continue;
    const { chave, pessoa } = agrupar(l);
    let g = grupos.get(chave);
    if (!g) {
      g = {
        chave,
        auditId: l.audit.id,
        codigo: projeto.code,
        cliente: projeto.client,
        obra: projeto.name,
        titulo: l.audit.title,
        pessoa,
        // a primeira linha é a mais recente (ordenação da consulta)
        desde: (l.assignedAt ?? new Date()).toISOString(),
        achados: [],
      };
      grupos.set(chave, g);
    }
    const id = l.findingId ?? l.targetKey.replace(/^finding:/, "");
    const lista = relatorios.get(l.audit.id)?.incongruencias;
    const achado = lista?.find((f) => f.id === id);
    g.achados.push({
      id,
      rotulo: rotuloDoAchado(id),
      nivel: achado ? nivelDoAchado(achado) : null,
      foraDoParecer: Boolean(lista?.length) && !achado,
      disciplina: achado ? disciplinaDoAchado(achado) : null,
      titulo: achado?.tipo ?? l.findingLabel ?? id,
      pagina: achado?.pagina ?? l.page,
    });
  }
  return [...grupos.values()];
}

/** O que está com você, por parecer. `userId` diz quando o envio foi seu mesmo. */
export async function comVoce(email: string, userId: string | null, organizationId: string): Promise<ParecerEmAberto[]> {
  const prisma = getPrisma();
  const linhas = await prisma.auditFeedback.findMany({
    where: { assigneeEmail: email, resolvedAt: null, audit: { project: { organizationId } } },
    select: SELECAO,
    orderBy: { assignedAt: "desc" },
  });

  const ids = [...new Set(linhas.map((l) => l.assignedById).filter((x): x is string => Boolean(x)))];
  const autores = new Map<string, string>();
  if (ids.length > 0) {
    const usuarios = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } });
    for (const u of usuarios) autores.set(u.id, u.name || u.email);
  }

  return detalhar(linhas, (l) => ({
    chave: l.audit.id,
    pessoa: !l.assignedById ? null : l.assignedById === userId ? "você" : (autores.get(l.assignedById) ?? null),
  }));
}

/** O que você passou a alguém e ainda está aberto, por parecer e pessoa. */
export async function queVocePassou(userId: string | null, organizationId: string): Promise<ParecerEmAberto[]> {
  if (!userId) return [];
  const prisma = getPrisma();
  const linhas = await prisma.auditFeedback.findMany({
    where: { assignedById: userId, resolvedAt: null, assigneeEmail: { not: null }, audit: { project: { organizationId } } },
    select: SELECAO,
    orderBy: { assignedAt: "desc" },
  });

  const emails = [...new Set(linhas.map((l) => l.assigneeEmail as string))];
  const nomes = new Map<string, string>();
  if (emails.length > 0) {
    const membros = await prisma.organizationMember.findMany({ where: { organizationId, email: { in: emails } }, select: { email: true, name: true } });
    for (const m of membros) if (m.name) nomes.set(m.email, m.name);
  }

  return detalhar(linhas, (l) => {
    const email = l.assigneeEmail as string;
    return { chave: `${l.audit.id}::${email}`, pessoa: nomes.get(email) ?? email };
  });
}
