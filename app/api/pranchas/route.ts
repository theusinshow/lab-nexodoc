/**
 * AS PRANCHAS GUARDADAS DE UM PROJETO (09/10/2026).
 *
 *   GET    ?projeto=ID              → as fichas (sem bytes)
 *   POST   ?projeto=ID&nome=NOME    → corpo = o PDF cru; guarda e devolve a ficha
 *   DELETE ?projeto=ID&nome=NOME    → tira a ficha
 *
 * Os bytes de uma prancha guardada saem por /api/arquivos/<checksum>, que já
 * confere o escritório. Projeto de outro escritório é 404, como lá.
 */
import { NextResponse, type NextRequest } from "next/server";

import { accessDeniedResponse, requireActor } from "@/lib/access-control";
import { ArquivoGrandeDemais } from "@/lib/cofre";
import { isDatabaseConfigured } from "@/lib/db";
import { lerComTeto, nomeDePrancha, TETO_DA_PRANCHA_BYTES } from "@/lib/pranchas/regras";
import {
  guardarPrancha,
  listarPranchas,
  PranchaRecusada,
  projetoDoEscritorio,
  removerPrancha,
} from "@/server/pranchas";

export const runtime = "nodejs";

const ID = /^[A-Za-z0-9_-]{1,80}$/;

function erro(status: number, mensagem: string) {
  return NextResponse.json({ error: mensagem }, { status });
}

/** O projeto pedido, já conferido. `null` vira 404 em quem chama. */
async function projetoConferido(req: NextRequest, organizationId: string): Promise<string | null> {
  const projeto = req.nextUrl.searchParams.get("projeto")?.trim() ?? "";
  if (!ID.test(projeto)) return null;
  return (await projetoDoEscritorio(projeto, organizationId)) ? projeto : null;
}

async function comPortao(fn: () => Promise<Response>): Promise<Response> {
  try {
    if (!isDatabaseConfigured()) return erro(503, "Banco não configurado.");
    return await fn();
  } catch (err) {
    const negado = accessDeniedResponse(err);
    if (negado) return negado;
    throw err;
  }
}

export async function GET(req: NextRequest) {
  return comPortao(async () => {
    const actor = await requireActor();
    const projeto = await projetoConferido(req, actor.organizationId);
    if (!projeto) return erro(404, "Projeto não encontrado.");
    return NextResponse.json({ pranchas: await listarPranchas(projeto) });
  });
}

export async function POST(req: NextRequest) {
  return comPortao(async () => {
    const actor = await requireActor();
    const projeto = await projetoConferido(req, actor.organizationId);
    if (!projeto) return erro(404, "Projeto não encontrado.");
    const nome = nomeDePrancha(req.nextUrl.searchParams.get("nome"));
    if (!nome) return erro(400, "Nome de prancha inválido: precisa terminar em .pdf e não ter barras.");

    /*
     * PELO CABEÇALHO PRIMEIRO. Cortar a leitura no meio derruba a conexão, e o
     * navegador vê "Failed to fetch" em vez do 413 — o envio tentaria de novo,
     * três vezes, um arquivo que nunca vai caber (visto em 09/10/2026 com 41 MB).
     * O corte na leitura fica como segunda defesa, para quem mente no cabeçalho.
     */
    const declarado = Number(req.headers.get("content-length") ?? "");
    if (Number.isFinite(declarado) && declarado > TETO_DA_PRANCHA_BYTES) {
      return erro(413, `A prancha passa de ${TETO_DA_PRANCHA_BYTES / 1024 / 1024} MB.`);
    }

    const lido = await lerComTeto(req.body, TETO_DA_PRANCHA_BYTES);
    if (!lido.ok) {
      return lido.motivo === "vazio"
        ? erro(400, "O arquivo chegou vazio.")
        : erro(413, `A prancha passa de ${TETO_DA_PRANCHA_BYTES / 1024 / 1024} MB.`);
    }

    try {
      const prancha = await guardarPrancha({
        organizationId: actor.organizationId,
        projectId: projeto,
        fileName: nome,
        bytes: lido.bytes,
        email: actor.email,
      });
      return NextResponse.json({ prancha });
    } catch (err) {
      if (err instanceof PranchaRecusada) return erro(err.codigo === "cota" ? 413 : 415, err.message);
      if (err instanceof ArquivoGrandeDemais) return erro(413, err.message);
      /*
       * O cofre não respondeu (bucket fora, rede). 503 diz ao navegador "tente
       * depois" — é o que a fila de envio faz.
       */
      console.error("[pranchas] falha ao guardar", err);
      return erro(503, "Não consegui guardar agora.");
    }
  });
}

export async function DELETE(req: NextRequest) {
  return comPortao(async () => {
    const actor = await requireActor();
    const projeto = await projetoConferido(req, actor.organizationId);
    if (!projeto) return erro(404, "Projeto não encontrado.");
    const nome = nomeDePrancha(req.nextUrl.searchParams.get("nome"));
    if (!nome) return erro(400, "Nome de prancha inválido.");
    await removerPrancha(projeto, nome);
    return NextResponse.json({ ok: true });
  });
}
