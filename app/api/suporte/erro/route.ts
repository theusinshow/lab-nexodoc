/**
 * O ERRO QUE O NAVEGADOR VIU — tela que caiu ou requisição que voltou 5xx.
 *
 * Aceita sem sessão (o erro pode ser justamente no login): quem é a pessoa
 * entra quando dá para saber. O abuso é contido pelo agrupamento e pelo teto
 * de chamados automáticos por hora ([[lib/suporte/regras.ts]]).
 *
 * NUNCA DEVOLVE 5xx. Esta rota é a que o reportador chama quando algo quebrou;
 * se ela quebrar também, responde vazio — um laço de erros sobre erros é o
 * pior desfecho possível aqui.
 */
import { NextResponse } from "next/server";

import { requireActor } from "@/lib/access-control";
import { isDatabaseConfigured } from "@/lib/db";
import { limparContexto } from "@/lib/suporte/comum";
import { registrarErro, type Quem } from "@/server/suporte/chamados";

export const runtime = "nodejs";

const txt = (v: unknown, teto: number) => (typeof v === "string" ? v.slice(0, teto) : "");

export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) return NextResponse.json({ chamado: null });
    const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const nome = txt(corpo?.nome, 200);
    const mensagem = txt(corpo?.mensagem, 1000);
    if (!nome || !mensagem) return NextResponse.json({ chamado: null }, { status: 400 });

    let quem: Quem = null;
    try {
      const a = await requireActor();
      quem = { email: a.email, nome: a.name, organizationId: a.organizationId };
    } catch {
      quem = null;
    }

    const chamado = await registrarErro({
      origem: "ERRO_CLIENTE",
      rota: txt(corpo?.rota, 500) || "/",
      nome,
      mensagem,
      digest: txt(corpo?.digest, 100) || null,
      http: corpo?.http === true,
      quem,
      contexto: { ...limparContexto(corpo?.contexto) },
    });
    return NextResponse.json({ chamado });
  } catch (err) {
    console.error("[suporte] registrar erro do cliente falhou:", err);
    return NextResponse.json({ chamado: null });
  }
}
