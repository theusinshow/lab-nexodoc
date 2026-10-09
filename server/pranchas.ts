/**
 * AS PRANCHAS GUARDADAS no servidor (09/10/2026): a ficha no Postgres, os bytes
 * no cofre. Desenho: docs/superpowers/specs/2026-10-08-pranchas-guardadas-design.md
 *
 * Toda função recebe o projeto JÁ conferido contra o escritório — quem confere
 * é `projetoDoEscritorio`, chamado pela rota antes de qualquer outra coisa.
 */
import { PDFDocument } from "pdf-lib";

import { guardarNoCofre, lerDoCofre } from "@/lib/cofre";
import { getPrisma } from "@/lib/db";
import { cabeNaCota, ehPdf, faltantes } from "@/lib/pranchas/regras";

export type FichaDePrancha = {
  fileName: string;
  checksum: string;
  paginas: number;
  sizeBytes: number;
  atualizadaEm: string;
};

export class PranchaRecusada extends Error {
  readonly codigo: "nao-e-pdf" | "cota";
  constructor(codigo: "nao-e-pdf" | "cota", mensagem: string) {
    super(mensagem);
    this.name = "PranchaRecusada";
    this.codigo = codigo;
  }
}

function ficha(linha: {
  fileName: string;
  checksumSha256: string;
  paginas: number;
  sizeBytes: number;
  updatedAt: Date;
}): FichaDePrancha {
  return {
    fileName: linha.fileName,
    checksum: linha.checksumSha256,
    paginas: linha.paginas,
    sizeBytes: linha.sizeBytes,
    atualizadaEm: linha.updatedAt.toISOString(),
  };
}

/** O projeto existe, não foi apagado e é DESTE escritório. */
export async function projetoDoEscritorio(projectId: string, organizationId: string): Promise<boolean> {
  const p = await getPrisma().project.findFirst({
    where: { id: projectId, organizationId, deletedAt: null },
    select: { id: true },
  });
  return Boolean(p);
}

/**
 * Guarda uma prancha. Ordem: é PDF? abre? cabe na cota? → cofre → ficha.
 * A ficha por último: ficha sem bytes seria prancha "guardada" que não monta.
 */
export async function guardarPrancha(args: {
  organizationId: string;
  projectId: string;
  fileName: string;
  bytes: Uint8Array;
  email: string;
}): Promise<FichaDePrancha> {
  if (!ehPdf(args.bytes)) throw new PranchaRecusada("nao-e-pdf", "O arquivo não é um PDF.");

  let paginas: number;
  try {
    const doc = await PDFDocument.load(args.bytes, { ignoreEncryption: true, updateMetadata: false });
    paginas = doc.getPageCount();
  } catch {
    throw new PranchaRecusada("nao-e-pdf", "O PDF não abriu — o arquivo pode estar corrompido.");
  }

  const prisma = getPrisma();
  // A cota soma as OUTRAS fichas: trocar a prancha de mesmo nome não conta duas vezes.
  const usado = await prisma.pranchaDoProjeto.aggregate({
    where: { projectId: args.projectId, NOT: { fileName: args.fileName } },
    _sum: { sizeBytes: true },
  });
  if (!cabeNaCota(usado._sum.sizeBytes ?? 0, args.bytes.byteLength)) {
    throw new PranchaRecusada("cota", "Este projeto chegou ao limite de 2 GB de pranchas guardadas.");
  }

  const guardado = await guardarNoCofre({
    bytes: args.bytes,
    organizationId: args.organizationId,
    mimeType: "application/pdf",
  });

  const linha = await prisma.pranchaDoProjeto.upsert({
    where: { projectId_fileName: { projectId: args.projectId, fileName: args.fileName } },
    create: {
      projectId: args.projectId,
      fileName: args.fileName,
      checksumSha256: guardado.checksumSha256,
      paginas,
      sizeBytes: guardado.sizeBytes,
      enviadaPor: args.email,
    },
    update: {
      checksumSha256: guardado.checksumSha256,
      paginas,
      sizeBytes: guardado.sizeBytes,
      enviadaPor: args.email,
    },
  });
  return ficha(linha);
}

export async function listarPranchas(projectId: string): Promise<FichaDePrancha[]> {
  const linhas = await getPrisma().pranchaDoProjeto.findMany({
    where: { projectId },
    orderBy: { fileName: "asc" },
  });
  return linhas.map(ficha);
}

/** Tira a ficha. Os bytes ficam no cofre até o expurgo do projeto. */
export async function removerPrancha(projectId: string, fileName: string): Promise<void> {
  await getPrisma().pranchaDoProjeto.deleteMany({ where: { projectId, fileName } });
}

/**
 * Os bytes das pranchas pedidas na montagem — SÓ se cada checksum tem ficha
 * neste projeto. Adivinhar o checksum de outro projeto não puxa nada; e se o
 * objeto sumiu do cofre, a resposta diz QUAIS pranchas pedir de novo.
 */
export async function bytesDasPranchas(args: {
  projectId: string;
  organizationId: string;
  pedidas: { checksum: string; nome: string }[];
}): Promise<{ ok: true; bytes: Map<string, Buffer> } | { ok: false; faltando: string[] }> {
  const unicos = [...new Set(args.pedidas.map((p) => p.checksum))];
  const comFicha = await getPrisma().pranchaDoProjeto.findMany({
    where: { projectId: args.projectId, checksumSha256: { in: unicos } },
    select: { checksumSha256: true },
  });
  const semFicha = faltantes(args.pedidas, comFicha.map((l) => l.checksumSha256));
  if (semFicha.length) return { ok: false, faltando: semFicha };

  const bytes = new Map<string, Buffer>();
  const sumiram: string[] = [];
  for (const checksum of unicos) {
    const lido = await lerDoCofre(checksum, args.organizationId).catch(() => null);
    if (lido) bytes.set(checksum, lido.bytes);
    else sumiram.push(checksum);
  }
  if (sumiram.length) {
    return { ok: false, faltando: faltantes(args.pedidas, unicos.filter((c) => !sumiram.includes(c))) };
  }
  return { ok: true, bytes };
}
