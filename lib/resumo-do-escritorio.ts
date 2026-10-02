/**
 * O NEXO NO ESCRITÓRIO, em números que o sistema TEM — a faixa do Painel.
 *
 * No lab a série era de exemplo; aqui cada número sai de uma linha gravada:
 *
 *   · achados encontrados: `Audit.totalFindings` das auditorias concluídas, no
 *     dia em que a auditoria foi feita;
 *   · achados resolvidos: `AuditFeedback.resolvedAt`, no dia do desfecho;
 *   · volumes: os PDFs e ZIPs de volume gerados (`DocumentArtifact`);
 *   · LDs e capas: os PDFs de LD e de capa gerados;
 *   · leituras de carimbo: as chamadas de leitura de selo que deram certo
 *     (`AiUsageEvent`, fluxo `ld-extraction`, sem a checagem de identidade).
 *     "Leituras", e não "folhas": uma folha relida conta duas vezes, e chamar
 *     isso de folha seria inflar o número.
 *
 * Nada de "horas economizadas": estimativa apresentada como fato derruba a
 * credibilidade dos números verdadeiros. Tudo por dia de Brasília, do primeiro
 * dia com movimento até hoje.
 */
import { getPrisma } from "@/lib/db";
import { diaEmBrasilia, somarDiasNaChave } from "@/lib/fuso-de-brasilia";

export type DiaDoEscritorio = {
  /** "YYYY-MM-DD" em Brasília. */
  dia: string;
  encontrados: number;
  resolvidos: number;
  volumes: number;
  lds: number;
  leituras: number;
};

/** Mais que isto e a série vira um ano inteiro de colunas: o resumo é do uso recente. */
const DIAS_NO_MAXIMO = 400;

export async function resumoDoEscritorio(organizationId: string, agora: Date = new Date()): Promise<DiaDoEscritorio[]> {
  const prisma = getPrisma();
  const desde = new Date(agora.getTime() - DIAS_NO_MAXIMO * 86_400_000);
  const doEscritorio = { project: { organizationId } };

  const [auditorias, resolvidos, gerados, membros] = await Promise.all([
    prisma.audit.findMany({ where: { ...doEscritorio, status: "COMPLETED", createdAt: { gte: desde } }, select: { createdAt: true, totalFindings: true } }),
    prisma.auditFeedback.findMany({ where: { resolvedAt: { gte: desde }, audit: doEscritorio }, select: { resolvedAt: true } }),
    prisma.documentArtifact.findMany({
      where: { ...doEscritorio, createdAt: { gte: desde }, kind: { in: ["VOLUME_PDF", "VOLUME_ZIP", "LD_PDF", "COVER_PDF"] } },
      select: { createdAt: true, kind: true },
    }),
    prisma.organizationMember.findMany({ where: { organizationId }, select: { email: true } }),
  ]);
  const leituras = membros.length
    ? await prisma.aiUsageEvent.findMany({
        where: {
          flow: "ld-extraction",
          operation: { not: "nexo-selo-identidade" },
          status: "success",
          createdAt: { gte: desde },
          userEmail: { in: membros.map((m) => m.email) },
        },
        select: { createdAt: true },
      })
    : [];

  const porDia = new Map<string, DiaDoEscritorio>();
  const dia = (quando: Date) => {
    const chave = diaEmBrasilia(quando);
    let d = porDia.get(chave);
    if (!d) {
      d = { dia: chave, encontrados: 0, resolvidos: 0, volumes: 0, lds: 0, leituras: 0 };
      porDia.set(chave, d);
    }
    return d;
  };
  for (const a of auditorias) dia(a.createdAt).encontrados += a.totalFindings;
  for (const r of resolvidos) if (r.resolvedAt) dia(r.resolvedAt).resolvidos += 1;
  for (const g of gerados) {
    if (g.kind === "VOLUME_PDF" || g.kind === "VOLUME_ZIP") dia(g.createdAt).volumes += 1;
    else dia(g.createdAt).lds += 1;
  }
  for (const l of leituras) dia(l.createdAt).leituras += 1;

  if (porDia.size === 0) return [];

  // Contínua, do primeiro dia com movimento até hoje: dia sem nada também é dado.
  const chaves = [...porDia.keys()].sort();
  const hoje = diaEmBrasilia(agora);
  const serie: DiaDoEscritorio[] = [];
  for (let chave = chaves[0]; chave <= hoje; chave = somarDiasNaChave(chave, 1)) {
    serie.push(porDia.get(chave) ?? { dia: chave, encontrados: 0, resolvidos: 0, volumes: 0, lds: 0, leituras: 0 });
  }
  return serie;
}
