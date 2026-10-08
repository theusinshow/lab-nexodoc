/**
 * BAIXAR UM ARQUIVO GERADO PELO NEXO (LD, capa, volume) — 08/10/2026.
 *
 * O artefato é do escritório dono do projeto; sem projeto, só de quem o gerou.
 * A regra entra na CONSULTA, como em `/api/arquivos`: ou a linha é sua, ou ela
 * não existe (404 nos dois casos — "existe, mas não é seu" já entrega demais).
 * Os bytes saem do cofre ([[lib/cofre.ts]]), decifrados aqui e só aqui.
 */
import { NextResponse } from "next/server";

import { accessDeniedResponse, requireActor } from "@/lib/access-control";
import { lerDoCofre } from "@/lib/cofre";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";

const ID = /^[A-Za-z0-9_-]{1,80}$/;

function naoEncontrado() {
  return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor();
    const { id } = await params;
    if (!isDatabaseConfigured() || !ID.test(id)) return naoEncontrado();

    const artefato = await getPrisma().documentArtifact.findFirst({
      where: {
        id,
        storageKey: { not: null },
        OR: [
          { project: { organizationId: actor.organizationId, deletedAt: null } },
          { projectId: null, userEmail: actor.email },
        ],
      },
      select: { fileName: true, mimeType: true, storageKey: true },
    });
    if (!artefato?.storageKey) return naoEncontrado();

    const arquivo = await lerDoCofre(artefato.storageKey, actor.organizationId);
    if (!arquivo) return naoEncontrado();

    // `?ver=1` abre no navegador (PDF); o padrão é baixar com o nome original.
    const ver = new URL(request.url).searchParams.get("ver") === "1";
    const nome = encodeURIComponent(artefato.fileName);
    return new NextResponse(new Uint8Array(arquivo.bytes), {
      headers: {
        "Content-Type": artefato.mimeType || arquivo.mimeType,
        "Content-Length": String(arquivo.bytes.byteLength),
        "Content-Disposition": `${ver ? "inline" : "attachment"}; filename*=UTF-8''${nome}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    const negado = accessDeniedResponse(err);
    if (negado) return negado;
    throw err;
  }
}
