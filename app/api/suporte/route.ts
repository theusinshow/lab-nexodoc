/**
 * O CHAMADO DE QUEM USA: abrir (ou complementar um automático) e listar os seus.
 * Ver [[server/suporte/chamados.ts]].
 */
import { NextResponse } from "next/server";

import { accessDeniedResponse, requireActor } from "@/lib/access-control";
import { isDatabaseConfigured } from "@/lib/db";
import { ehCategoria, limparContexto, TETO_DO_PRINT } from "@/lib/suporte/comum";
import { abrirManual, meusChamados } from "@/server/suporte/chamados";

export const runtime = "nodejs";

const PRINT = /^data:image\/(?:webp|png);base64,([A-Za-z0-9+/=]+)$/;

export async function POST(request: Request) {
  try {
    const actor = await requireActor();
    if (!isDatabaseConfigured()) return NextResponse.json({ error: "Banco não configurado." }, { status: 503 });

    const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const texto = typeof corpo?.texto === "string" ? corpo.texto.trim().slice(0, 4000) : "";
    if (!corpo || !ehCategoria(corpo.categoria) || texto.length < 3) {
      return NextResponse.json({ error: "Escolha a categoria e conte em uma frase o que aconteceu." }, { status: 400 });
    }

    let print: Uint8Array | null = null;
    if (typeof corpo.print === "string" && corpo.print) {
      const m = PRINT.exec(corpo.print);
      if (!m) return NextResponse.json({ error: "Print em formato inesperado." }, { status: 400 });
      print = new Uint8Array(Buffer.from(m[1], "base64"));
      if (print.byteLength > TETO_DO_PRINT) return NextResponse.json({ error: "O print passou de 1,5 MB." }, { status: 413 });
    }

    const r = await abrirManual({
      quem: { email: actor.email, nome: actor.name, organizationId: actor.organizationId },
      categoria: corpo.categoria,
      texto,
      rota: typeof corpo.rota === "string" ? corpo.rota : "/",
      contexto: limparContexto(corpo.contexto),
      print,
      chamadoId: typeof corpo.chamadoId === "string" ? corpo.chamadoId : null,
    });
    if (!r.ok) return NextResponse.json({ error: r.erro }, { status: r.status });
    return NextResponse.json({ chamado: r.chamado }, { status: 201 });
  } catch (err) {
    const negado = accessDeniedResponse(err);
    if (negado) return negado;
    throw err;
  }
}

export async function GET() {
  try {
    const actor = await requireActor();
    if (!isDatabaseConfigured()) return NextResponse.json({ chamados: [] });
    return NextResponse.json({ chamados: await meusChamados(actor.email) });
  } catch (err) {
    const negado = accessDeniedResponse(err);
    if (negado) return negado;
    throw err;
  }
}
