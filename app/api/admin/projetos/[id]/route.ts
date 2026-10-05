/** O detalhe de um projeto na aba Projetos: conversas, auditorias, LDs e artefatos. */
import { NextResponse } from "next/server";

import { checkAdminRequest } from "@/lib/admin-gate";
import { detalheDoProjeto } from "@/server/admin/projetos";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const portao = await checkAdminRequest(request);

  if (!portao.ok) {
    return NextResponse.json({ error: portao.message }, { status: portao.status });
  }

  const { id } = await params;
  const detalhe = await detalheDoProjeto(id);

  if (!detalhe) {
    return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ detalhe });
}
