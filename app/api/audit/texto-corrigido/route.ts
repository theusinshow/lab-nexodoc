/**
 * O TEXTO CORRIGIDO DE UM ACHADO — uma chamada pequena, sob demanda.
 *
 * O engenheiro clicou em "texto corrigido" no "O que fazer". Esta rota devolve
 * o menor trecho com o erro (para o Ctrl+F no ODT) e o mesmo trecho corrigido.
 *
 * Por que sob demanda, e não durante a auditoria: quem manda no custo da
 * auditoria é a SAÍDA, e o teto de saída já censurou blocos no passado.
 * Escrever um texto corrigido para cada um dos ~50 achados pagaria por todos
 * os que ninguém abre. Aqui paga só quem clica — e só uma vez, porque o
 * resultado fica gravado no achado.
 *
 * A IA propõe; `julgarProposta` (`lib/texto-corrigido.ts`) decide se a troca é
 * segura. O documento inteiro não vai: só o achado.
 */
import { NextResponse } from "next/server";

import { accessDeniedResponse, requireActor } from "@/lib/access-control";
import { auditByIdWhereForActor } from "@/lib/audit-access";
import { refreshAiModelOverrideCache } from "@/lib/ai-model-config";
import { classifyProviderFailure, getAiConfiguration } from "@/lib/ai-providers";
import { executeOpenAiResponse } from "@/lib/ai-runner";
import type { AuditFinding, AuditReport } from "@/lib/audit-report";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import {
  extrairCitacoes,
  julgarProposta,
  podeGerarTextoCorrigido,
  textoAindaVale,
  VERSAO_DO_TEXTO_CORRIGIDO,
  type PropostaDaIa,
  type TextoCorrigido,
} from "@/lib/texto-corrigido";

export const runtime = "nodejs";

type Corpo = {
  auditId?: string;
  findingId?: string;
  /**
   * O achado como a tela o tem. Só é usado quando não há banco (dev sem
   * Postgres): com banco, o achado é lido do parecer gravado, e o cliente não
   * escolhe o que a IA lê.
   */
  achado?: Pick<AuditFinding, "evidencia" | "descricao" | "conflito" | "sugestao_correcao">;
};

const INSTRUCOES = `Você corrige um trecho de memorial descritivo de engenharia, a partir de um achado de auditoria.

Devolva:
- "procure_por": o MENOR trecho contíguo que contém o erro, copiado LETRA POR LETRA de uma das citações recebidas. É o que o engenheiro vai buscar com Ctrl+F no documento; se você mudar uma vírgula, a busca não acha. Prefira poucas palavras em volta do erro, o bastante para o trecho ser único.
- "substitua_por": o mesmo trecho, com SÓ o erro corrigido. Não melhore estilo, não reescreva a frase, não acrescente informação.
- "pode_trocar": true quando há uma troca assim.

Devolva "pode_trocar": false, com "motivo" em uma frase curta para o engenheiro, quando:
- a correção depende de uma decisão dele (qual de duas versões vale, qual cláusula prevalece);
- o valor certo precisa ser confirmado em outro documento e não está escrito no achado;
- o problema é algo que falta no documento, e não um trecho errado.

Nunca invente número. Só troque um número se o valor novo estiver escrito no "O que fazer" ou nas citações.
Quando "pode_trocar" for false, devolva "procure_por" e "substitua_por" vazios. Quando for true, devolva "motivo" vazio.`;

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["pode_trocar", "procure_por", "substitua_por", "motivo"],
  properties: {
    pode_trocar: { type: "boolean" },
    procure_por: { type: "string" },
    substitua_por: { type: "string" },
    motivo: { type: "string" },
  },
} as const;

/**
 * Grava o texto no achado, relendo o parecer AGORA — e não o que foi lido no
 * começo da chamada. Entre um e outro passam segundos de IA, e o chat pode ter
 * gravado um achado novo nesse meio tempo; regravar a cópia velha o apagaria.
 */
async function gravarNoParecer(auditId: string, findingId: string, texto: TextoCorrigido, actor: Awaited<ReturnType<typeof requireActor>>) {
  try {
    const prisma = getPrisma();
    const atual = await prisma.audit.findFirst({
      where: auditByIdWhereForActor(auditId, actor),
      select: { report: true },
    });
    const report = atual?.report as AuditReport | null | undefined;
    if (!report?.incongruencias) return;
    const incongruencias = report.incongruencias.map((f) =>
      f.id === findingId ? { ...f, texto_corrigido: texto } : f,
    );
    await prisma.audit.updateMany({
      where: auditByIdWhereForActor(auditId, actor),
      data: { report: { ...report, incongruencias } as never },
    });
  } catch (error) {
    // Best-effort, como o achado do chat: a tela já recebeu o texto e o funde
    // no IndexedDB. Sem banco, o próximo clique de outra pessoa paga de novo.
    console.error("[texto-corrigido] falha ao gravar no parecer", error);
  }
}

export async function POST(request: Request) {
  let actor: Awaited<ReturnType<typeof requireActor>>;
  try {
    actor = await requireActor();
  } catch (err) {
    const negado = accessDeniedResponse(err);
    if (negado) return negado;
    throw err;
  }

  let corpo: Corpo;
  try {
    corpo = (await request.json()) as Corpo;
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const findingId = corpo.findingId?.trim();
  if (!findingId) {
    return NextResponse.json({ error: "Informe o achado." }, { status: 400 });
  }

  const auditId = corpo.auditId?.trim() || null;
  const comBanco = Boolean(auditId) && isDatabaseConfigured();
  let achado: Corpo["achado"] | AuditFinding | undefined = corpo.achado;

  if (comBanco) {
    const auditoria = await getPrisma().audit.findFirst({
      where: auditByIdWhereForActor(auditId!, actor),
      select: { report: true },
    });
    const report = auditoria?.report as AuditReport | null | undefined;
    const doParecer = report?.incongruencias?.find((f) => f.id === findingId);
    if (!doParecer) {
      return NextResponse.json({ error: "Achado não encontrado nesta auditoria." }, { status: 404 });
    }
    if (textoAindaVale(doParecer.texto_corrigido)) {
      return NextResponse.json({ texto: doParecer.texto_corrigido, reaproveitado: true });
    }
    achado = doParecer;
  }

  if (!achado || !podeGerarTextoCorrigido(achado)) {
    return NextResponse.json(
      { error: "Este achado não tem um trecho simples para trocar." },
      { status: 422 },
    );
  }

  const evidencia = achado.evidencia ?? "";
  const oQueFazer = achado.sugestao_correcao ?? "";
  const citacoes = extrairCitacoes(evidencia);

  await refreshAiModelOverrideCache();
  const perfil = getAiConfiguration().auditChat;
  const model = process.env.NEXODOC_TEXTO_CORRIGIDO_MODEL?.trim() || perfil.model;

  let proposta: PropostaDaIa;
  try {
    const resultado = await executeOpenAiResponse({
      // O fluxo do chat da auditoria: é a mesma conversa sobre um parecer já
      // emitido, e aparece no mapa de gasto pela `operation`.
      flow: "audit-chat",
      providerOverride: perfil.provider,
      model,
      operation: "audit-texto-corrigido",
      taskId: auditId,
      userEmail: actor.email,
      metadata: { citacoes: citacoes.length },
      request: {
        model,
        instructions: INSTRUCOES,
        reasoning: { effort: "low" },
        max_output_tokens: 1500,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text" as const,
                text: [
                  `O que está errado: ${achado.descricao || achado.conflito || "(não descrito)"}`,
                  `O que fazer: ${oQueFazer || "(não descrito)"}`,
                  "Citações do documento:",
                  ...citacoes.map((c, i) => `${i + 1}) “${c}”`),
                ].join("\n"),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema" as const,
            name: "texto_corrigido",
            strict: true,
            schema,
          },
        },
      },
    });
    proposta = JSON.parse(resultado.text) as PropostaDaIa;
  } catch (error) {
    const falha = classifyProviderFailure(perfil.provider, "audit-chat", model, error);
    console.error(`[texto-corrigido] falha (${falha.category})`);
    return NextResponse.json(
      {
        error:
          falha.category !== "unknown"
            ? falha.message
            : "Não foi possível gerar o texto corrigido agora.",
      },
      { status: 502 },
    );
  }

  const julgamento = julgarProposta({ proposta, evidencia, oQueFazer });
  const geradoEm = new Date().toISOString();
  const texto: TextoCorrigido = julgamento.ok
    ? {
        tipo: "troca",
        procure_por: julgamento.procure_por,
        substitua_por: julgamento.substitua_por,
        modelo: model,
        geradoEm,
        versao: VERSAO_DO_TEXTO_CORRIGIDO,
      }
    : { tipo: "sem-troca", motivo: julgamento.motivo, modelo: model, geradoEm, versao: VERSAO_DO_TEXTO_CORRIGIDO };

  if (comBanco) await gravarNoParecer(auditId!, findingId, texto, actor);

  return NextResponse.json({ texto, reaproveitado: false });
}
