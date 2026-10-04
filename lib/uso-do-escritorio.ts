import type { ItemDeAtencao } from "@/lib/atencao-do-admin";
import { getPrisma } from "@/lib/db";
import { diaEmBrasilia, somarDiasNaChave } from "@/lib/fuso-de-brasilia";

/*
 * O USO DE VERDADE, para o Cockpit (03/10/2026).
 *
 * "Usuários ativos" contava CONTAS HABILITADAS — quem nunca entrou contava como
 * ativo. Aqui "ativo" é quem entrou no período (`AcessoDiario`, ver
 * [[lib/registro-de-acesso.ts]]), o funil diz quanto do convite virou uso, e os
 * alertas dizem o que pede um olhar: quem foi barrado, quem parou, gasto fora do
 * normal. O acesso só existe a partir de 03/10/2026; por isso "parado" também
 * olha a atividade (auditoria, conversa, IA), senão todo mundo nasceria parado.
 */

const DIA_MS = 86_400_000;
const DIAS_PARA_PARADO = 14;

export async function usoDoEscritorio() {
  const prisma = getPrisma();
  const agora = new Date();
  const hoje = diaEmBrasilia(agora);
  const dia = (n: number) => somarDiasNaChave(hoje, -n);
  const desde14 = new Date(agora.getTime() - DIAS_PARA_PARADO * DIA_MS);
  const desde7 = new Date(agora.getTime() - 7 * DIA_MS);

  const [acessos30, membros, comAcesso, comConversa, comIa, comAuditoria, recusas, custos15, ativos14] = await Promise.all([
    prisma.acessoDiario.findMany({ where: { dia: { gte: dia(29) } }, select: { email: true, dia: true } }),
    prisma.organizationMember.findMany({ where: { status: { in: ["ACTIVE", "INVITED"] } }, select: { email: true, status: true, createdAt: true } }),
    prisma.acessoDiario.groupBy({ by: ["email"] }),
    prisma.nexoConversation.groupBy({ by: ["userEmail"] }),
    prisma.aiUsageEvent.groupBy({ by: ["userEmail"], where: { userEmail: { not: null } } }),
    prisma.audit.findMany({ where: { userId: { not: null } }, distinct: ["userId"], select: { user: { select: { email: true } } } }),
    prisma.recusaDeAcesso.findMany({ where: { createdAt: { gte: desde7 } }, select: { email: true, motivo: true } }),
    prisma.aiUsageEvent.findMany({ where: { createdAt: { gte: new Date(agora.getTime() - 15 * DIA_MS) } }, select: { createdAt: true, estimatedCostUsd: true } }),
    Promise.all([
      prisma.acessoDiario.groupBy({ by: ["email"], where: { dia: { gte: dia(DIAS_PARA_PARADO - 1) } } }),
      prisma.nexoConversation.groupBy({ by: ["userEmail"], where: { updatedAt: { gte: desde14 } } }),
      prisma.aiUsageEvent.groupBy({ by: ["userEmail"], where: { createdAt: { gte: desde14 }, userEmail: { not: null } } }),
    ]),
  ]);

  // Ativos: quem entrou nos últimos 7 e 30 dias, e quantos entraram em cada um dos últimos 14.
  const ativosEm = (n: number) => new Set(acessos30.filter((a) => a.dia >= dia(n - 1)).map((a) => a.email)).size;
  const dias14 = Array.from({ length: 14 }, (_, i) => dia(13 - i));
  const porDia = new Map<string, Set<string>>();
  for (const a of acessos30) (porDia.get(a.dia) ?? porDia.set(a.dia, new Set()).get(a.dia)!).add(a.email);

  // O funil: convidados (no escritório) → entraram (algum sinal de uso) → auditaram.
  const usou = new Set<string>([
    ...comAcesso.map((x) => x.email),
    ...comConversa.map((x) => x.userEmail),
    ...comIa.map((x) => x.userEmail ?? ""),
  ]);
  const auditou = new Set(comAuditoria.map((a) => a.user?.email ?? ""));
  const emailsDoEscritorio = membros.map((m) => m.email);

  // Os alertas, no formato da lista de atenção que o Cockpit já mostra.
  const alertas: ItemDeAtencao[] = [];
  const barrados = [...new Set(recusas.map((r) => r.email))];
  if (barrados.length) {
    alertas.push({
      chave: "barrados",
      texto: `${barrados.length} pessoa(s) tentaram entrar e foram barradas nos últimos 7 dias: ${barrados.slice(0, 4).join(", ")}${barrados.length > 4 ? "…" : ""} (Pessoas)`,
      gravidade: "aviso",
    });
  }
  const [a14, c14, i14] = ativos14;
  const recentes = new Set<string>([...a14.map((x) => x.email), ...c14.map((x) => x.userEmail), ...i14.map((x) => x.userEmail ?? "")]);
  const parados = membros.filter((m) => m.status === "ACTIVE" && m.createdAt < desde14 && usou.has(m.email) && !recentes.has(m.email)).map((m) => m.email);
  if (parados.length) {
    alertas.push({
      chave: "parados",
      texto: `${parados.length} pessoa(s) do escritório sem usar há mais de ${DIAS_PARA_PARADO} dias: ${parados.slice(0, 4).join(", ")}${parados.length > 4 ? "…" : ""}`,
      gravidade: "aviso",
    });
  }
  const custoDoDia = new Map<string, number>();
  for (const c of custos15) custoDoDia.set(diaEmBrasilia(c.createdAt), (custoDoDia.get(diaEmBrasilia(c.createdAt)) ?? 0) + Number(c.estimatedCostUsd ?? 0));
  const custoHoje = custoDoDia.get(hoje) ?? 0;
  const anteriores = Array.from({ length: 14 }, (_, i) => custoDoDia.get(dia(i + 1)) ?? 0);
  const media = anteriores.reduce((s, v) => s + v, 0) / anteriores.length;
  if (custoHoje > Math.max(1, media * 3)) {
    alertas.push({
      chave: "gasto",
      texto: `gasto de IA hoje (US$ ${custoHoje.toFixed(2)}) está ${media > 0 ? `${(custoHoje / media).toFixed(1)}× a média dos últimos 14 dias` : "acima de um dia normal"} (Dinheiro)`,
      gravidade: "aviso",
    });
  }

  return {
    ativos7: ativosEm(7),
    ativos30: ativosEm(30),
    serieAtivos: { dias: dias14, ativos: dias14.map((d) => porDia.get(d)?.size ?? 0) },
    funil: {
      convidados: emailsDoEscritorio.length,
      entraram: emailsDoEscritorio.filter((e) => usou.has(e)).length,
      auditaram: emailsDoEscritorio.filter((e) => auditou.has(e)).length,
    },
    alertas,
  };
}
