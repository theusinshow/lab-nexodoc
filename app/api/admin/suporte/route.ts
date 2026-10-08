/** A caixa de chamados do admin. Ver [[server/suporte/chamados.ts]]. */
import { NextResponse } from "next/server";

import { checkAdminRequest } from "@/lib/admin-gate";
import { suporteConfigurado } from "@/server/suporte/avisos";
import { listarChamados } from "@/server/suporte/chamados";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const portao = await checkAdminRequest(request);
  if (!portao.ok) return NextResponse.json({ error: portao.message }, { status: portao.status });
  return NextResponse.json({ chamados: await listarChamados(), emailConfigurado: suporteConfigurado(), generatedAt: new Date().toISOString() });
}
