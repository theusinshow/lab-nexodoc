/**
 * A lista da aba Projetos: cada projeto com o que ele guarda, contado.
 * Apagar não é aqui — é o expurgo (`/api/admin/dados/expurgo`, alcances
 * `projeto` e `itens`). Ver [[server/admin/projetos.ts]].
 */
import { NextResponse } from "next/server";

import { checkAdminRequest } from "@/lib/admin-gate";
import { listarProjetos } from "@/server/admin/projetos";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const portao = await checkAdminRequest(request);

  if (!portao.ok) {
    return NextResponse.json({ error: portao.message }, { status: portao.status });
  }

  return NextResponse.json({ projetos: await listarProjetos(), generatedAt: new Date().toISOString() });
}
