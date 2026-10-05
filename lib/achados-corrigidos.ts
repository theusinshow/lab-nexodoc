/**
 * OS CORRIGIDOS — o que foi resolvido no documento, de todas as obras.
 *
 * Nasceu de um retorno (05/10/2026): o colega que recebeu um achado gostou do
 * "Meus", mas o corrigido sumia dali no instante em que era marcado. Ele queria
 * um lugar que GUARDE o que fez. E quem coordena quer o mesmo lugar para ver o
 * que cada um corrigiu.
 *
 * "Corrigido por alguém" = o achado estava com ela OU foi ela quem marcou. As
 * duas coisas contam: quem recebeu e corrigiu no documento nem sempre é quem
 * clica, e quem clicou por outra pessoa também fez o trabalho de conferir.
 *
 * As mesmas linhas de `AuditFeedback` da fila e do sino — não há tabela nova.
 */
import type { AuditReport } from "@/lib/audit-report";
import { getPrisma } from "@/lib/db";
import { nivelDoAchado } from "@/lib/nivel-do-achado";
import type { AchadoCorrigido } from "./achados-corrigidos-tipos";
import { rotuloDoAchado } from "@/lib/rotulo-do-achado";

export type { AchadoCorrigido } from "./achados-corrigidos-tipos";
export { corrigidoPor } from "./achados-corrigidos-tipos";

/** Teto da lista: é histórico para consulta, não exportação. */
const LIMITE = 500;

export async function achadosCorrigidos(organizationId: string): Promise<AchadoCorrigido[]> {
  const prisma = getPrisma();
  const linhas = await prisma.auditFeedback.findMany({
    where: {
      resolvedAt: { not: null },
      // Linha antiga encerrada sem tipo é "corrigido" — a mesma leitura da fila.
      OR: [{ resolutionKind: "FIXED_IN_DOC" }, { resolutionKind: null }],
      audit: { project: { organizationId } },
    },
    orderBy: { resolvedAt: "desc" },
    take: LIMITE,
    select: {
      id: true,
      findingId: true,
      targetKey: true,
      findingLabel: true,
      page: true,
      resolvedAt: true,
      resolvedById: true,
      assigneeEmail: true,
      audit: { select: { id: true, title: true, project: { select: { code: true, client: true, name: true } } } },
    },
  });
  if (!linhas.length) return [];

  const ids = [...new Set(linhas.map((l) => l.audit.id))];
  const relatorios = new Map<string, AuditReport | null>();
  for (const a of await prisma.audit.findMany({ where: { id: { in: ids } }, select: { id: true, report: true } })) {
    relatorios.set(a.id, a.report as AuditReport | null);
  }

  const membros = await prisma.organizationMember.findMany({
    where: { organizationId },
    select: { userId: true, email: true, name: true },
  });
  const porUsuario = new Map(membros.filter((m) => m.userId).map((m) => [m.userId as string, m]));
  const nomeDoEmail = new Map(membros.map((m) => [m.email.toLowerCase(), m.name || m.email]));

  return linhas.flatMap((l) => {
    const projeto = l.audit.project;
    if (!projeto || !l.resolvedAt) return [];
    const findingId = l.findingId ?? l.targetKey.replace(/^finding:/, "");
    const achado = relatorios.get(l.audit.id)?.incongruencias?.find((f) => f.id === findingId);
    const quem = l.resolvedById ? porUsuario.get(l.resolvedById) : undefined;
    const com = l.assigneeEmail?.toLowerCase() ?? null;
    return [
      {
        chave: l.id,
        auditId: l.audit.id,
        findingId,
        rotulo: rotuloDoAchado(findingId),
        titulo: achado?.tipo ?? l.findingLabel ?? findingId,
        nivel: achado ? nivelDoAchado(achado) : null,
        pagina: achado?.pagina ?? l.page,
        codigo: projeto.code,
        cliente: projeto.client,
        obra: projeto.name,
        parecer: l.audit.title,
        corrigidoEm: l.resolvedAt.toISOString(),
        porEmail: quem?.email.toLowerCase() ?? null,
        porNome: quem ? quem.name || quem.email : null,
        comEmail: com,
        comNome: com ? (nomeDoEmail.get(com) ?? com) : null,
      },
    ];
  });
}
