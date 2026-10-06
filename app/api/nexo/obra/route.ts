import { NextResponse, type NextRequest } from "next/server";

import { isNexoEnabled } from "@/lib/feature-flags";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import { accessDeniedResponse, requireActor } from "@/lib/access-control";
import { ordenarVolumes, resumoDoVolume } from "@/modules/nexo/lib/entrega-do-volume";
import type { SavedResult } from "@/modules/nexo/state/conversation-store";

export const runtime = "nodejs";

/**
 * A OBRA (06/10/2026, etapa 3 do desenho do canvas da montagem): os volumes de
 * um projeto, um por conversa, com tomos, peso e teto — para quem monta vários
 * volumes da mesma obra ver o conjunto de relance.
 *
 * SÓ LEITURA, e só as conversas do usuário da sessão (como toda rota de
 * conversa): `?pasta=<folderKey>` (a chave da barra lateral — conversa de
 * volume quase nunca tem projeto) e/ou `?projeto=<projectId>`.
 */
export async function GET(req: NextRequest) {
  if (!isNexoEnabled()) {
    return NextResponse.json({ error: "Modulo Nexo desativado." }, { status: 404 });
  }
  let userEmail: string;
  try {
    userEmail = (await requireActor()).email;
  } catch (err) {
    const negado = accessDeniedResponse(err);
    if (negado) return negado;
    throw err;
  }
  const projeto = req.nextUrl.searchParams.get("projeto")?.trim();
  const pasta = req.nextUrl.searchParams.get("pasta")?.trim();
  if (!projeto && !pasta) return NextResponse.json({ error: "pasta ou projeto ausente" }, { status: 400 });
  if (!isDatabaseConfigured()) return NextResponse.json({ volumes: [] });

  try {
    const linhas = await getPrisma().nexoConversation.findMany({
      where: {
        userEmail,
        OR: [...(pasta ? [{ folderKey: pasta }] : []), ...(projeto ? [{ projectId: projeto }] : [])],
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, data: true, tipo: true },
    });
    const volumes = linhas
      // Auditoria de memorial não é volume.
      .filter((l) => l.tipo !== "auditoria")
      .map((l) => resumoDoVolume(l.id, l.title, resultadosGravados(l.data)));
    return NextResponse.json({ volumes: ordenarVolumes(volumes) });
  } catch (error) {
    console.error("[nexo-obra] falha ao ler os volumes", error);
    return NextResponse.json({ error: "falha ao ler os volumes" }, { status: 500 });
  }
}

/**
 * Os resultados como o servidor os guarda: o arquivo tem `blobKey`, não `url`
 * (os bytes vivem no navegador de quem gerou). Para o resumo basta saber que
 * ele EXISTE e quanto pesa — a url vira um marcador.
 */
function resultadosGravados(data: unknown): SavedResult[] {
  const results = (data as { results?: unknown } | null)?.results;
  if (!Array.isArray(results)) return [];
  return results.map((r) => {
    const files = Array.isArray((r as { files?: unknown }).files) ? ((r as { files: Record<string, unknown>[] }).files) : [];
    return {
      ...(r as SavedResult),
      files: files.map((f) => ({ ...(f as object), url: typeof f.blobKey === "string" ? `gravado:${f.blobKey}` : "" })),
    } as SavedResult;
  });
}
