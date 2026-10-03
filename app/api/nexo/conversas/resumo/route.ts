import { NextResponse } from "next/server";

import { isNexoEnabled } from "@/lib/feature-flags";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import { accessDeniedResponse, requireActor } from "@/lib/access-control";
import type { ConversaResumida } from "@/modules/nexo/lib/cartoes-de-projeto";
import { codigoDoSelo } from "@/modules/nexo/lib/disciplina-da-folha";

export const runtime = "nodejs";

/**
 * O RESUMO DE CADA CONVERSA — folhas lidas e tipos de artefato, sem trazer o
 * `data` inteiro.
 *
 * A barra lateral virou uma lista de PROJETOS, e cada cartão precisa dizer o que
 * o projeto tem: "LD CAPA SEP VOL · 203 fl". Esses dois fatos vivem dentro do
 * `data` JSON de cada conversa, junto com as mensagens, os selos e os bytes dos
 * artefatos — e a rota da lista lê só as sete colunas de fora justamente porque
 * puxar o `data` de cem conversas para desenhar a barra seria arrastar megabytes.
 *
 * A SAÍDA É O POSTGRES QUEM MONTA. `jsonb_array_length` e
 * `jsonb_array_elements` derivam a contagem e os tipos DENTRO do banco; o Node
 * recebe uma linha de meia dúzia de campos por conversa. É a diferença entre
 * transportar o documento e transportar a resposta.
 *
 * `resumo` é segmento ESTÁTICO e por isso vence o `[id]` irmão no roteamento.
 */

async function guarda() {
  if (!isNexoEnabled()) {
    return { erro: NextResponse.json({ error: "Modulo Nexo desativado." }, { status: 404 }) };
  }
  try {
    const actor = await requireActor();
    return { userEmail: actor.email };
  } catch (err) {
    const negado = accessDeniedResponse(err);
    if (negado) return { erro: negado };
    throw err;
  }
}

/** O que o Postgres devolve — `folhas` vem como `bigint` em algumas versões. */
type LinhaCrua = {
  id: string;
  title: string;
  folderKey: string | null;
  projectId: string | null;
  projectCode: string;
  projectClient: string;
  tipo: string | null;
  updatedAt: Date;
  auditoriaPendente: boolean;
  folhas: number | bigint;
  kinds: string[] | null;
  projectName: string;
  auditoriaResumo: string | null;
  auditId: string | null;
  capas: number | bigint;
  lds: number | bigint;
  separatrizes: number | bigint;
  volumes: number | bigint;
  /** `arquivo|disciplina do carimbo`, distintos — viram siglas pela regra do volume. */
  selosDisc: string[] | null;
};

export async function GET() {
  const g = await guarda();
  if (g.erro) return g.erro;
  if (!isDatabaseConfigured()) return NextResponse.json({ conversas: [] });

  try {
    /*
     * `jsonb_typeof` antes de `jsonb_array_length`: o `data` é declaradamente
     * schemaless, e uma conversa gravada antes de o campo existir traz `null`
     * ali — sem a guarda, UMA linha velha derruba a consulta inteira e a barra
     * fica sem projeto nenhum.
     */
    const linhas = await getPrisma().$queryRaw<LinhaCrua[]>`
      SELECT c.id, c.title, c."folderKey", c."projectId", c.tipo, c."updatedAt",
        c."auditoriaPendente",
        /*
         * O código e o cliente vêm do PROJETO, não de uma string derivada no
         * navegador. É por isso que renomear o cliente em /projetos passa a
         * refletir na barra sem migração e sem reprocessar nada.
         */
        COALESCE(p.code, '') AS "projectCode",
        COALESCE(p.name, '') AS "projectName",
        COALESCE(p.client, '') AS "projectClient",
        CASE WHEN jsonb_typeof(c.data->'seloResults') = 'array'
             THEN jsonb_array_length(c.data->'seloResults') ELSE 0 END AS folhas,
        COALESCE((
          SELECT array_agg(DISTINCT r->>'kind')
          FROM jsonb_array_elements(
                 CASE WHEN jsonb_typeof(c.data->'results') = 'array'
                      THEN c.data->'results' ELSE '[]'::jsonb END) r
          WHERE r->>'kind' IS NOT NULL
        ), ARRAY[]::text[]) AS kinds,
        /*
         * O HISTÓRICO (02/10/2026): como cada conversa terminou. A auditoria mais
         * recente traz só o RESUMO CURTO e o id — o parecer inteiro fica no banco.
         * Os documentos, contados por tipo; as disciplinas, dos carimbos.
         */
        (SELECT r->>'summary' FROM jsonb_array_elements(
           CASE WHEN jsonb_typeof(c.data->'results') = 'array' THEN c.data->'results' ELSE '[]'::jsonb END) r
         WHERE r->>'kind' = 'auditoria'
         ORDER BY CASE WHEN r->>'generatedAt' ~ '^[0-9]+$' THEN (r->>'generatedAt')::bigint ELSE 0 END DESC LIMIT 1) AS "auditoriaResumo",
        (SELECT r->'payload'->>'auditId' FROM jsonb_array_elements(
           CASE WHEN jsonb_typeof(c.data->'results') = 'array' THEN c.data->'results' ELSE '[]'::jsonb END) r
         WHERE r->>'kind' = 'auditoria'
         ORDER BY CASE WHEN r->>'generatedAt' ~ '^[0-9]+$' THEN (r->>'generatedAt')::bigint ELSE 0 END DESC LIMIT 1) AS "auditId",
        (SELECT count(*) FROM jsonb_array_elements(
           CASE WHEN jsonb_typeof(c.data->'results') = 'array' THEN c.data->'results' ELSE '[]'::jsonb END) r
         WHERE r->>'kind' = 'capa') AS capas,
        (SELECT count(*) FROM jsonb_array_elements(
           CASE WHEN jsonb_typeof(c.data->'results') = 'array' THEN c.data->'results' ELSE '[]'::jsonb END) r
         WHERE r->>'kind' = 'ld') AS lds,
        (SELECT count(*) FROM jsonb_array_elements(
           CASE WHEN jsonb_typeof(c.data->'results') = 'array' THEN c.data->'results' ELSE '[]'::jsonb END) r
         WHERE r->>'kind' = 'separatriz') AS separatrizes,
        (SELECT count(*) FROM jsonb_array_elements(
           CASE WHEN jsonb_typeof(c.data->'results') = 'array' THEN c.data->'results' ELSE '[]'::jsonb END) r
         WHERE r->>'kind' = 'volume') AS volumes,
        (SELECT array_agg(DISTINCT COALESCE(s->>'fileName', '') || '|' || COALESCE(s->'extraction'->>'disciplina', ''))
         FROM jsonb_array_elements(
           CASE WHEN jsonb_typeof(c.data->'seloResults') = 'array' THEN c.data->'seloResults' ELSE '[]'::jsonb END) s) AS "selosDisc"
      FROM "NexoConversation" c
      LEFT JOIN "Project" p ON p.id = c."projectId"
      WHERE c."userEmail" = ${g.userEmail}
      ORDER BY c."updatedAt" DESC
      LIMIT 300`;

    /*
     * QUANTO FALTA TRATAR, da auditoria mais recente de cada conversa: o total de
     * achados confirmados (`Audit.totalFindings`) menos os já encerrados
     * (`AuditFeedback.resolvedAt`). Duas consultas pequenas para a lista inteira.
     */
    const ids = [...new Set(linhas.map((l) => l.auditId).filter((x): x is string => Boolean(x)))];
    const [totais, tratados] = ids.length
      ? await Promise.all([
          getPrisma().audit.findMany({ where: { id: { in: ids } }, select: { id: true, totalFindings: true } }),
          getPrisma().auditFeedback.groupBy({
            by: ["auditId"],
            where: { auditId: { in: ids }, resolvedAt: { not: null }, findingId: { not: null } },
            _count: { _all: true },
          }),
        ])
      : [[], []];
    const totalDa = new Map(totais.map((a) => [a.id, a.totalFindings]));
    const tratadosDa = new Map(tratados.map((t) => [t.auditId, t._count._all]));
    const siglasDe = (pares: string[] | null) => {
      const vistas = new Set<string>();
      for (const par of pares ?? []) {
        const [arquivo, disciplina] = par.split("|");
        const codigo = codigoDoSelo(arquivo ?? "", disciplina || null);
        if (codigo) vistas.add(codigo.toUpperCase());
      }
      return [...vistas];
    };

    const conversas: ConversaResumida[] = linhas.map((l) => ({
      id: l.id,
      title: l.title,
      folderKey: l.folderKey,
      projectId: l.projectId,
      projectCode: l.projectCode ?? "",
      projectClient: l.projectClient ?? "",
      tipo: l.tipo,
      updatedAt: l.updatedAt.getTime(),
      auditoriaPendente: l.auditoriaPendente,
      folhas: Number(l.folhas ?? 0),
      kinds: l.kinds ?? [],
      projectName: l.projectName ?? "",
      auditoriaResumo: l.auditoriaResumo,
      auditoriaTotal: l.auditId ? (totalDa.get(l.auditId) ?? null) : null,
      auditoriaTratados: l.auditId ? (tratadosDa.get(l.auditId) ?? 0) : null,
      capas: Number(l.capas ?? 0),
      lds: Number(l.lds ?? 0),
      separatrizes: Number(l.separatrizes ?? 0),
      volumes: Number(l.volumes ?? 0),
      disciplinas: siglasDe(l.selosDisc),
    }));

    return NextResponse.json({ conversas });
  } catch (error) {
    console.error("[nexo-resumo] falha ao resumir as conversas", error);
    /*
     * Lista VAZIA e não erro: sem o resumo a barra ainda tem a lista das sete
     * colunas, e uma seção que grita é pior que uma seção que degrada. O
     * `console.error` é onde a falha fica visível para quem investiga.
     */
    return NextResponse.json({ conversas: [] });
  }
}
