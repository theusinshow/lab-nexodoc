import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";
import { AccessDenied } from "@/lib/actor";
import { getUserAccess, requireActor } from "@/lib/access-control";
import { redirectToLogin } from "@/lib/auth-redirect";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import { pendenciasDe } from "@/lib/fila-de-achados";

/*
 * A MOLDURA das telas no sistema novo: o que o Topo, o sino "Com você" e a
 * busca (Ctrl K) precisam saber de quem está usando. Uma consulta por tela, no
 * servidor, junto com os dados da própria tela; nada disso vive em estado do
 * navegador.
 *
 * Tudo aqui sai de consultas que o app já tinha (`getUserAccess`,
 * `pendenciasDe`, a lista de projetos do escritório). Nada é inventado para
 * enfeitar: onde o banco não está configurado, a moldura vem vazia e diz isso.
 */

export type DestinoDoTopo = "Painel" | "Nexo" | "Projetos" | "Achados" | "Ajuda" | "Administração";

export interface UsuarioDaMoldura {
  nome: string;
  email: string;
  iniciais: string;
  /** Centro de controle: quem administra o sistema. */
  ehAdmin: boolean;
  escritorio: string | null;
  /** Papel no escritório (as duas chaves de Pessoas). */
  papelNoEscritorio: "OWNER" | "ADMIN" | "MEMBER" | null;
}

export interface ComVoceNaMoldura {
  auditId: string;
  codigo: string;
  titulo: string;
  enviadoPor: string | null;
  enviadoEm: string;
  total: number;
  /** O achado que o sino abre na fila (o mais recente); nulo cai no parecer. */
  findingId: string | null;
}

export interface ObraNaMoldura {
  id: string;
  codigo: string;
  nome: string;
  cliente: string;
  atualizadoEm: string;
}

export interface RecenteNaMoldura {
  auditId: string;
  titulo: string;
  codigo: string | null;
  status: string;
  criadoEm: string;
}

export interface DadosDaMoldura {
  usuario: UsuarioDaMoldura;
  comVoce: ComVoceNaMoldura[];
  obras: ObraNaMoldura[];
  recentes: RecenteNaMoldura[];
  semBanco: boolean;
}

export function iniciaisDe(nome: string) {
  const partes = nome
    .replace(/@.*$/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  const duas = partes.length >= 2 ? partes[0][0] + partes[partes.length - 1][0] : (partes[0] ?? "?").slice(0, 2);
  return duas.toUpperCase();
}

/*
 * UMA CARGA POR REQUISIÇÃO — 03/10/2026.
 *
 * O Next monta a `app/not-found.tsx` em TODA requisição, como reserva para o
 * caso de a página chamar `notFound()`, e ela pede a moldura também. Sem o
 * `cache`, cada tela pagava a moldura duas vezes: medido no dev, Projetos fazia
 * 23 consultas e caiu para 14; o Início, de 31 para 22. Com o banco a ~175 ms
 * (Render em Oregon, Neon em São Paulo) era um segundo inteiro por clique.
 *
 * O `cache` do React vale para UMA requisição: a página e a 404 recebem o
 * mesmo resultado, e a requisição seguinte consulta de novo. Por isso a parte
 * cacheada não redireciona — só diz o que achou; quem decide o destino é
 * `carregarMoldura` (manda para o login) ou `tentarMoldura` (devolve null).
 */
type ResultadoDaMoldura =
  | { tipo: "sem-sessao" }
  | { tipo: "sem-acesso" }
  | { tipo: "ok"; dados: DadosDaMoldura };

const lerMoldura = cache(async (): Promise<ResultadoDaMoldura> => {
  const session = await auth();
  if (!session?.user) return { tipo: "sem-sessao" };
  const access = await getUserAccess(session.user.email, session.user.name);
  if (!access.isActive) return { tipo: "sem-acesso" };

  const email = access.email || session.user.email || "";
  const nome = session.user.name?.trim() || email;
  const usuario: UsuarioDaMoldura = {
    nome,
    email,
    iniciais: iniciaisDe(nome),
    ehAdmin: access.isAdmin,
    escritorio: null,
    papelNoEscritorio: null,
  };

  if (!isDatabaseConfigured()) {
    return { tipo: "ok", dados: { usuario, comVoce: [], obras: [], recentes: [], semBanco: true } };
  }

  try {
    const actor = await requireActor();
    const prisma = getPrisma();
    const [org, pendencias, projetos, auditorias] = await Promise.all([
      prisma.organization.findUnique({ where: { id: actor.organizationId }, select: { name: true } }),
      pendenciasDe(actor.email, actor.organizationId),
      prisma.project.findMany({
        where: { organizationId: actor.organizationId, deletedAt: null, status: "ACTIVE" },
        orderBy: { updatedAt: "desc" },
        take: 60,
        select: { id: true, code: true, name: true, client: true, updatedAt: true },
      }),
      actor.userId
        ? prisma.audit.findMany({
            where: { userId: actor.userId, project: { organizationId: actor.organizationId } },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: { id: true, title: true, status: true, createdAt: true, project: { select: { code: true } } },
          })
        : Promise.resolve([]),
    ]);
    usuario.escritorio = org?.name ?? null;
    usuario.papelNoEscritorio = actor.orgRole;
    return {
      tipo: "ok",
      dados: {
        usuario,
        semBanco: false,
        comVoce: pendencias.map((p) => ({ auditId: p.auditId, codigo: p.code, titulo: p.auditTitle, enviadoPor: p.enviadoPor, enviadoEm: p.enviadoEm, total: p.total, findingId: p.findingId })),
        obras: projetos.map((p) => ({ id: p.id, codigo: p.code, nome: p.name, cliente: p.client, atualizadoEm: p.updatedAt.toISOString() })),
        recentes: auditorias.map((a) => ({ auditId: a.id, titulo: a.title, codigo: a.project?.code ?? null, status: a.status, criadoEm: a.createdAt.toISOString() })),
      },
    };
  } catch (err) {
    if (err instanceof AccessDenied) return { tipo: "sem-acesso" };
    throw err;
  }
});

/**
 * A moldura de quem talvez nem esteja logado (a página 404): sem sessão ou sem
 * acesso, devolve `null` em vez de mandar para o login — a página que não
 * existe não pede login para dizer que não existe.
 */
export async function tentarMoldura(): Promise<DadosDaMoldura | null> {
  try {
    const resultado = await lerMoldura();
    return resultado.tipo === "ok" ? resultado.dados : null;
  } catch {
    return null;
  }
}

/**
 * Carrega a moldura para uma tela. Quem não está logado vai para o login (e
 * volta para `rota`); quem não está liberado, para /sem-acesso.
 */
export async function carregarMoldura(rota: string): Promise<DadosDaMoldura> {
  const resultado = await lerMoldura();
  if (resultado.tipo === "sem-sessao") redirectToLogin(rota);
  if (resultado.tipo === "sem-acesso") redirect("/sem-acesso");
  return resultado.dados;
}
