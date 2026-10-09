import { excedeOLimite, motivoDeArquivoGrande } from "@/lib/limite-do-anexo";
import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/auth";
import { isNexoEnabled } from "@/lib/feature-flags";
import {
  classifyDocuments,
  type ClassifyDocumentsInput,
} from "@/server/nexo/classify-documents";
import { accessDeniedResponse, requireActor } from "@/lib/access-control";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import { lerIdentidadeDoProjeto, type IdentidadeDoProjeto } from "@/lib/identidade-do-projeto";
import { normalizarCentroDeCusto } from "@/lib/resolucao-de-projeto";
import { aplicarEscadaAoDossie } from "@/modules/nexo/lib/dossie-com-projeto";

export const runtime = "nodejs";

const MAX_FILES = 10;

export async function POST(req: NextRequest) {
  // Kill-switch: rota inerte com o modulo desligado.
  if (!isNexoEnabled()) {
    return NextResponse.json({ error: "Modulo Nexo desativado." }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  /*
   * O PORTAO, DEPOIS da sessao.
   *
   * A checagem acima continua porque ela ESTREITA o tipo: o codigo abaixo le
   * `session.user` direto, e remove-la faria o TypeScript recusar cada leitura.
   * Mas ela nunca bastou -- responde "tem sessao?", e sessao sem escritorio
   * passava, deixando a rota util para quem nao pertence a lugar nenhum.
   *
   * As duas recusas independentes estao em [[lib/actor.ts]].
   */
  let actor: Awaited<ReturnType<typeof requireActor>>;
  try {
    actor = await requireActor();
  } catch (err) {
    const negado = accessDeniedResponse(err);
    if (negado) return negado;
    throw err;
  }

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Maximo de ${MAX_FILES} arquivos por vez.` },
      { status: 400 },
    );
  }
  const tooBig = files.find((f) => excedeOLimite(f.size));
  if (tooBig) {
    return NextResponse.json(
      { error: motivoDeArquivoGrande(tooBig.name, tooBig.size) },
      { status: 400 },
    );
  }

  // Caminhos relativos (opcional, de upload de diretorio) enriquecem volume/blocos.
  let relPaths: string[] = [];
  const relRaw = form.get("relPaths");
  if (typeof relRaw === "string") {
    try {
      const parsed = JSON.parse(relRaw);
      if (Array.isArray(parsed)) relPaths = parsed.map((p) => String(p));
    } catch {
      // opcional; ignora se malformada
    }
  }

  // O chamador pode declarar que o arquivo E o memorial, corrigindo o palpite
  // do nome. Sem isso, arquivo fora da convencao volta sem identidade nenhuma.
  const forcarMemorial = form.get("forcarMemorial") === "1";

  const inputs: ClassifyDocumentsInput[] = await Promise.all(
    files.map(async (file, index) => ({
      fileName: file.name,
      buffer: Buffer.from(await file.arrayBuffer()),
      relPath: relPaths[index] || undefined,
      forcarMemorial,
    })),
  );

  try {
    const lido = await classifyDocuments(inputs);
    /*
     * O DEGRAU "PROJETO" (09/10/2026): memorial de disciplina sem capa herda o
     * que o projeto já sabe pelo código do nome do arquivo — a capa do geral,
     * gravada antes. Falhar aqui não derruba a leitura: o dossiê segue só com
     * capa e corpo. Ver [[lib/escada-da-identidade.ts]].
     */
    const temMemorial = lido.arquivos.some((a) => a.tipo === "memorial");
    let projeto: IdentidadeDoProjeto | null = null;
    const code = normalizarCentroDeCusto(lido.codigo ?? "");
    if (temMemorial && code && isDatabaseConfigured()) {
      try {
        const p = await getPrisma().project.findUnique({
          where: { organizationId_code: { organizationId: actor.organizationId, code } },
          select: { identidade: true, deletedAt: true },
        });
        if (p && !p.deletedAt) projeto = lerIdentidadeDoProjeto(p.identidade);
      } catch (err) {
        console.error("[nexo-classify] identidade do projeto indisponível", err);
      }
    }
    const dossie = temMemorial ? aplicarEscadaAoDossie(lido, projeto) : lido;
    return NextResponse.json({ dossie });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao classificar." },
      { status: 500 },
    );
  }
}
