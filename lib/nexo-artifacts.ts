import type { DocumentArtifactKind, Prisma } from "@prisma/client";

import { requireActor } from "@/lib/access-control";
import { ArquivoGrandeDemais, guardarNoCofre } from "@/lib/cofre";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import { createStoredDocumentArtifact } from "@/lib/project-files";
import { getUserActor } from "@/lib/project-store";

/**
 * Registro no servidor do que o Nexo GEROU (LD, capa, volume, separatriz).
 *
 * DESDE 08/10/2026 GUARDA OS BYTES E O PROJETO. Antes era só contabilidade:
 * nome, tamanho e checksum, sem projeto — e o colega que abria a obra via
 * "Lista de documentos: 2 arquivos" e não tinha como baixar nenhum, porque os
 * arquivos moravam no navegador de quem os gerou.
 *
 *  - Os bytes vão para o cofre ([[cofre.ts]]), cifrados e do escritório,
 *    ANTES da transação: subir um volume de 40 MB dentro dela estouraria o
 *    prazo da transação.
 *  - O projeto chega pelo cabeçalho que o Nexo manda com a conversa aberta
 *    ([[projeto-do-pedido.ts]]) e só vale se for do escritório de quem pede.
 *    Sem projeto, o artefato continua sendo histórico, só não aparece na obra.
 *  - Arquivo acima do teto do cofre fica registrado sem bytes, como antes.
 *
 * NUNCA lança: falhar em registrar não pode derrubar a geração. O engenheiro já
 * tem o documento em mãos, e perder o download por causa da contabilidade seria
 * trocar o produto pelo registro dele.
 */

export interface NexoArtifactFile {
  kind: DocumentArtifactKind;
  fileName: string;
  mimeType: string;
  data: Buffer | Uint8Array | string;
}

export interface RecordNexoArtifactsInput {
  user: { email?: string | null; name?: string | null };
  /** Módulo de origem, no vocabulário já usado pelas telas: "capas" | "volumes" | "separatrizes" | "ld". */
  module: string;
  files: NexoArtifactFile[];
  /** Fatos que identificam o documento (obra, código, disciplina, tomo...). */
  metadata?: Record<string, unknown>;
  /** O projeto da conversa que pediu. Conferido aqui contra o escritório. */
  projectId?: string | null;
}

export async function recordNexoArtifacts(
  input: RecordNexoArtifactsInput,
): Promise<number> {
  const files = input.files.filter((file) => Boolean(file));

  if (files.length === 0 || !isDatabaseConfigured()) {
    return 0;
  }

  const email = input.user.email?.trim().toLocaleLowerCase("pt-BR");

  if (!email) {
    return 0;
  }

  try {
    const actor = await getUserActor(email, input.user.name ?? null);
    const { organizationId } = await requireActor();
    // O projeto só vale se for do escritório de quem pede — query não é autorização.
    const projectId = input.projectId
      ? ((
          await getPrisma().project.findFirst({
            where: { id: input.projectId, organizationId, deletedAt: null },
            select: { id: true },
          })
        )?.id ?? null)
      : null;
    // `origem` distingue o que saiu do Nexo do que saiu das telas standalone —
    // é o que vai permitir medir a migração antes de remover as telas.
    const metadata = {
      origem: "nexo",
      ...(input.metadata ?? {}),
    } as Prisma.InputJsonValue;

    const guardados = await Promise.all(
      files.map(async (file) => {
        try {
          const bytes = typeof file.data === "string" ? Buffer.from(file.data, "utf8") : file.data;
          return await guardarNoCofre({ bytes, organizationId, mimeType: file.mimeType });
        } catch (err) {
          if (!(err instanceof ArquivoGrandeDemais)) {
            console.error(`[nexo/${input.module}] ${file.fileName} NAO foi para o cofre:`, err);
          }
          return null;
        }
      }),
    );

    await getPrisma().$transaction(async (tx) => {
      for (const [i, file] of files.entries()) {
        await createStoredDocumentArtifact(tx, {
          data: file.data,
          projectId,
          actor,
          module: input.module,
          kind: file.kind,
          fileName: file.fileName,
          mimeType: file.mimeType,
          metadata,
          guardado: guardados[i],
        });
      }
    });

    return files.length;
  } catch (err) {
    console.error(
      `[nexo/${input.module}] artefato gerado mas NAO registrado no historico: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return 0;
  }
}
