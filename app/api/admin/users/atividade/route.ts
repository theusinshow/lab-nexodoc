import { NextResponse } from "next/server";

import { checkAdminRequest } from "@/lib/admin-gate";
import { atividadeDaPessoa } from "@/lib/metricas-por-pessoa";

export const dynamic = "force-dynamic";

/**
 * A ATIVIDADE DE UMA PESSOA (03/10/2026), para a ficha em Administração →
 * Pessoas: o acesso dia a dia, o custo por dia e a linha do tempo do que ela
 * fez no período (auditorias, conversas, LDs, documentos, achados, obra,
 * recusas). Mesmo portão das outras rotas do centro de controle.
 *
 *   GET /api/admin/users/atividade?email=<e-mail>&dias=30   (dias de 1 a 365)
 */
export async function GET(request: Request) {
  const veredito = await checkAdminRequest(request);
  if (!veredito.ok) return NextResponse.json({ error: veredito.message }, { status: veredito.status });

  const url = new URL(request.url);
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) return NextResponse.json({ error: "Informe o e-mail da pessoa." }, { status: 400 });
  const dias = Math.min(365, Math.max(1, Math.floor(Number(url.searchParams.get("dias")) || 30)));

  return NextResponse.json({ ...(await atividadeDaPessoa(email, dias)), generatedAt: new Date().toISOString() });
}
