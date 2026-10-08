/**
 * O SERVIÇO DO SUPORTE — a única porta de escrita dos chamados.
 *
 * Duas entradas: `registrarErro` (o sistema viu um erro; agrupa pela impressão)
 * e `abrirManual` (alguém relatou; ou complementa um chamado automático). As
 * regras de decisão moram em [[lib/suporte/regras.ts]] e têm teste próprio;
 * aqui é só banco e e-mail.
 */
import { Prisma } from "@prisma/client";

import { guardarNoCofre } from "@/lib/cofre";
import { getPrisma } from "@/lib/db";
import { normalizarRota, type Categoria, type ContextoDoChamado, type StatusDoChamado } from "@/lib/suporte/comum";
import {
  decidirOcorrencia,
  impressaoDoErro,
  JANELA_DE_CASAMENTO_MS,
  podeAbrirManual,
  TETO_AUTOMATICO_POR_HORA,
  type Decisao,
} from "@/lib/suporte/regras";

import { avisarAutor, avisarDev, type ResumoDoChamado } from "./avisos";

export type Quem = { email: string; nome: string | null; organizationId: string } | null;
export type ChamadoCurto = { id: string; protocolo: number };

const UMA_HORA = 3_600_000;
const RESUMO = { id: true, protocolo: true, origem: true, categoria: true, rota: true, ocorrencias: true, nome: true, email: true } as const;

/** O commit que está no ar (a Railway injeta); "local" na máquina de quem programa. */
export const versaoDoApp = () => process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) || "local";

export async function registrarErro(a: {
  origem: "ERRO_CLIENTE" | "ERRO_SERVIDOR";
  rota: string;
  nome: string;
  mensagem: string;
  digest?: string | null;
  stack?: string | null;
  http?: boolean;
  quem: Quem;
  contexto: Record<string, unknown>;
}): Promise<ChamadoCurto | null> {
  const prisma = getPrisma();
  const rota = normalizarRota(a.rota);
  const agora = new Date();

  /*
   * O 5xx QUE O NAVEGADOR VIU costuma ser o erro que o servidor JÁ registrou
   * (onRequestError). Casar pela rota numa janela curta evita dois chamados
   * para um defeito — e o complemento de quem estava na tela cai no certo.
   */
  if (a.http) {
    const doServidor = await prisma.chamadoDeSuporte.findFirst({
      where: { origem: "ERRO_SERVIDOR", rota, ultimaOcorrencia: { gte: new Date(agora.getTime() - JANELA_DE_CASAMENTO_MS) } },
      orderBy: { ultimaOcorrencia: "desc" },
      select: { id: true, protocolo: true, email: true },
    });
    if (doServidor) {
      if (!doServidor.email && a.quem) {
        await prisma.chamadoDeSuporte.update({
          where: { id: doServidor.id },
          data: { email: a.quem.email, nome: a.quem.nome, organizationId: a.quem.organizationId },
        });
      }
      return { id: doServidor.id, protocolo: doServidor.protocolo };
    }
  }

  const impressao = impressaoDoErro({ rota, nome: a.nome, mensagem: a.mensagem });
  const contexto = {
    ...a.contexto,
    versao: versaoDoApp(),
    erro: { nome: a.nome.slice(0, 200), mensagem: a.mensagem.slice(0, 1000), ...(a.stack && { stack: a.stack.slice(0, 4000) }) },
  } as Prisma.InputJsonValue;

  const executar = () =>
    prisma.$transaction(
      async (tx): Promise<{ chamado: ResumoDoChamado; d: Decisao } | null> => {
        const existente = await tx.chamadoDeSuporte.findFirst({
          where: { impressao },
          orderBy: { createdAt: "desc" },
          select: { id: true, status: true, ocorrencias: true },
        });
        if (!existente) {
          const recentes = await tx.chamadoDeSuporte.count({
            where: { origem: { not: "MANUAL" }, createdAt: { gte: new Date(agora.getTime() - UMA_HORA) } },
          });
          if (recentes >= TETO_AUTOMATICO_POR_HORA) return null;
        }
        const d = decidirOcorrencia(existente);
        const quem = a.quem ? { email: a.quem.email, nome: a.quem.nome, organizationId: a.quem.organizationId } : {};
        const chamado = existente
          ? await tx.chamadoDeSuporte.update({
              where: { id: existente.id },
              data: {
                ocorrencias: d.ocorrencias,
                ultimaOcorrencia: agora,
                ...(d.acao === "reabrir" && { status: "ABERTO" as const }),
                ...(a.digest && { digest: a.digest }),
                contexto,
              },
              select: RESUMO,
            })
          : await tx.chamadoDeSuporte.create({
              data: { origem: a.origem, categoria: "ERRO", rota, digest: a.digest ?? null, impressao, contexto, ...quem },
              select: RESUMO,
            });
        return { chamado, d };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

  let r: Awaited<ReturnType<typeof executar>>;
  try {
    r = await executar();
  } catch (err) {
    // Duas ocorrências simultâneas da mesma impressão: uma perde a serialização. Uma nova tentativa basta.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") r = await executar();
    else throw err;
  }
  if (!r) return null;
  if (r.d.avisar && r.d.motivo) await avisarDev(r.chamado, r.d.motivo);
  return { id: r.chamado.id, protocolo: r.chamado.protocolo };
}

export async function abrirManual(a: {
  quem: NonNullable<Quem>;
  categoria: Categoria;
  texto: string;
  rota: string;
  contexto: ContextoDoChamado;
  print: Uint8Array | null;
  chamadoId: string | null;
}): Promise<{ ok: true; chamado: ChamadoCurto } | { ok: false; status: number; erro: string }> {
  const prisma = getPrisma();
  const mensagem = { papel: "USUARIO" as const, autorEmail: a.quem.email, autorNome: a.quem.nome, texto: a.texto };

  // COMPLEMENTO: a pessoa conta o que fazia quando o erro automático aconteceu.
  if (a.chamadoId) {
    const alvo = await prisma.chamadoDeSuporte.findUnique({ where: { id: a.chamadoId }, select: { id: true, email: true, printChecksum: true } });
    // 404 também para chamado de outra pessoa: "existe, mas não é seu" já entrega que existe.
    if (!alvo || (alvo.email && alvo.email !== a.quem.email)) return { ok: false, status: 404, erro: "Chamado não encontrado." };
    const printChecksum = await guardarPrint(a.print, a.quem.organizationId);
    const chamado = await prisma.chamadoDeSuporte.update({
      where: { id: alvo.id },
      data: {
        categoria: a.categoria,
        ...(!alvo.email && { email: a.quem.email, nome: a.quem.nome, organizationId: a.quem.organizationId }),
        ...(!alvo.printChecksum && printChecksum && { printChecksum }),
        mensagens: { create: mensagem },
      },
      select: RESUMO,
    });
    await avisarDev(chamado, "complemento", a.texto);
    return { ok: true, chamado: { id: chamado.id, protocolo: chamado.protocolo } };
  }

  const naHora = await prisma.chamadoDeSuporte.count({
    where: { email: a.quem.email, origem: "MANUAL", createdAt: { gte: new Date(Date.now() - UMA_HORA) } },
  });
  if (!podeAbrirManual(naHora)) return { ok: false, status: 429, erro: "Muitos chamados em uma hora. Tente de novo mais tarde." };

  const printChecksum = await guardarPrint(a.print, a.quem.organizationId);
  const chamado = await prisma.chamadoDeSuporte.create({
    data: {
      origem: "MANUAL",
      categoria: a.categoria,
      email: a.quem.email,
      nome: a.quem.nome,
      organizationId: a.quem.organizationId,
      rota: normalizarRota(a.rota),
      contexto: { ...a.contexto, versao: versaoDoApp() } as Prisma.InputJsonValue,
      printChecksum,
      mensagens: { create: mensagem },
    },
    select: RESUMO,
  });
  await avisarDev(chamado, "novo", a.texto);
  return { ok: true, chamado: { id: chamado.id, protocolo: chamado.protocolo } };
}

/** O print no cofre. Se o cofre recusar, o chamado segue sem print — nunca trava o relato. */
async function guardarPrint(bytes: Uint8Array | null, organizationId: string): Promise<string | null> {
  if (!bytes) return null;
  try {
    return (await guardarNoCofre({ bytes, organizationId, mimeType: "image/webp" })).checksumSha256;
  } catch (err) {
    console.error("[suporte] o print não foi guardado:", err);
    return null;
  }
}

export async function meusChamados(email: string) {
  const linhas = await getPrisma().chamadoDeSuporte.findMany({
    where: { email },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      protocolo: true,
      categoria: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      mensagens: { where: { papel: "DEV" }, orderBy: { createdAt: "desc" }, take: 1, select: { texto: true, createdAt: true } },
    },
  });
  return linhas.map(({ mensagens, ...c }) => ({ ...c, ultimaResposta: mensagens[0] ?? null }));
}

export async function listarChamados() {
  return getPrisma().chamadoDeSuporte.findMany({
    // enum ordena pela declaração: ABERTO, EM_ANALISE, RESOLVIDO
    orderBy: [{ status: "asc" }, { ultimaOcorrencia: "desc" }],
    take: 200,
    select: { ...RESUMO, status: true, ultimaOcorrencia: true, createdAt: true, _count: { select: { mensagens: true } } },
  });
}

export async function detalheDoChamado(id: string) {
  return getPrisma().chamadoDeSuporte.findUnique({
    where: { id },
    include: { mensagens: { orderBy: { createdAt: "asc" } } },
  });
}

export async function responderChamado(
  id: string,
  dev: { email: string; nome: string | null },
  m: { texto: string | null; status: StatusDoChamado | null },
) {
  const prisma = getPrisma();
  const chamado = await prisma.chamadoDeSuporte.update({
    where: { id },
    data: {
      ...(m.status && { status: m.status }),
      ...(m.texto && { mensagens: { create: { papel: "DEV" as const, autorEmail: dev.email, autorNome: dev.nome, texto: m.texto } } }),
    },
    select: { protocolo: true, status: true, email: true },
  });
  if (chamado.email && (m.texto || m.status === "RESOLVIDO")) await avisarAutor(chamado.email, chamado, m.texto);
  return chamado;
}
