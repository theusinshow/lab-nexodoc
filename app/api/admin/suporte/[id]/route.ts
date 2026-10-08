/** Um chamado: ler inteiro, responder e mudar o status. */
import { NextResponse } from "next/server";

import { checkAdminRequest } from "@/lib/admin-gate";
import { ehStatus } from "@/lib/suporte/comum";
import { detalheDoChamado, responderChamado } from "@/server/suporte/chamados";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const portao = await checkAdminRequest(request);
  if (!portao.ok) return NextResponse.json({ error: portao.message }, { status: portao.status });
  const chamado = await detalheDoChamado((await params).id);
  if (!chamado) return NextResponse.json({ error: "Chamado não encontrado." }, { status: 404 });
  return NextResponse.json({ chamado });
}

export async function PATCH(request: Request, { params }: Params) {
  const portao = await checkAdminRequest(request);
  if (!portao.ok) return NextResponse.json({ error: portao.message }, { status: portao.status });
  const corpo = (await request.json().catch(() => null)) as { texto?: unknown; status?: unknown } | null;
  const texto = typeof corpo?.texto === "string" && corpo.texto.trim() ? corpo.texto.trim().slice(0, 4000) : null;
  const status = ehStatus(corpo?.status) ? corpo.status : null;
  if (!texto && !status) return NextResponse.json({ error: "Escreva uma resposta ou escolha um status." }, { status: 400 });
  try {
    const chamado = await responderChamado((await params).id, { email: portao.email, nome: null }, { texto, status });
    return NextResponse.json({ chamado });
  } catch {
    return NextResponse.json({ error: "Chamado não encontrado." }, { status: 404 });
  }
}
