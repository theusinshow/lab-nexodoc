/**
 * SONDA DA GLOBAL DE CRUZAMENTO — uma chamada, sem gravar nada no banco.
 *
 * A pergunta (03/10/2026): se a leitura global do Profundo deixar os problemas
 * internos de cada disciplina para os blocos e procurar SÓ o que cruza
 * capítulos, ela escreve bem menos — e, como o tempo dela é quase todo saída
 * (27k tokens a ~62 tok/s no 117-25), termina bem antes?
 *
 * O prompt é o de `getCoherencePrompt` em `app/api/audit/route.ts`, que já
 * existe e só roda em documento gigante. Duas diferenças, as duas para a
 * comparação ser justa com a global de 24/09:
 *   - o texto vai INTEIRO (a coerência corta em 400k; o 027-24 tem 419k);
 *   - o teto de saída é o da global (32.000), não o da coerência (6.000).
 *
 * Mesmo modelo e esforço da corrida de controle `b87efd0a` (gpt-6-sol, medium).
 *
 * O banco é só LIDO (o PDF sai do `StoredFile`). O uso não vira `AiUsageEvent`
 * de propósito: o `.env` local pode apontar para o banco de produção.
 *
 *   node scripts/sonda-global-de-cruzamento.ts [arquivo.pdf] [modelo]
 *
 * Sem arquivo, usa `027_24_md_geral_a.pdf` do banco.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import nextEnv from "@next/env";
import OpenAI from "openai";
import pg from "pg";

import { getAuditorPrompt } from "../lib/auditor-prompt.ts";
import { estimateOpenAiCostUsd } from "../lib/ai-precos.ts";
import { extractPdfText, textoDoDocumentoParaIA } from "../lib/pdf-text.ts";

nextEnv.loadEnvConfig(process.cwd());

const NOME_PADRAO = "027_24_md_geral_a.pdf";
const [caminhoArg, modeloArg] = process.argv.slice(2);
const MODELO = modeloArg || "gpt-6-sol";
const ESFORCO = "medium";
const TETO_DE_SAIDA = 32_000;
const TETO_DE_TEMPO_MS = 900_000;

async function lerPdf(): Promise<{ nome: string; bytes: Buffer }> {
  if (caminhoArg) {
    return { nome: caminhoArg.split(/[\\/]/).pop()!, bytes: readFileSync(caminhoArg) };
  }
  const banco = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await banco.connect();
  try {
    const r = await banco.query(
      `select s.bytes from "AuditFile" f join "StoredFile" s on s."checksumSha256" = f."checksumSha256"
       where f."fileName" = $1 limit 1`,
      [NOME_PADRAO],
    );
    if (!r.rows[0]) throw new Error(`${NOME_PADRAO} não está no StoredFile.`);
    return { nome: NOME_PADRAO, bytes: r.rows[0].bytes as Buffer };
  } finally {
    await banco.end();
  }
}

function promptDeCruzamento(texto: string) {
  return `
Você é um auditor documental sênior. Leia o DOCUMENTO INTEIRO abaixo de uma vez e procure APENAS incoerências que exigem enxergar capítulos distantes ao mesmo tempo — o tipo de erro que passa despercebido numa leitura por blocos:

- Regras contratuais contraditórias entre capítulos (ex.: hierarquia/prevalência de documentos que muda de um capítulo para outro).
- Responsabilidades atribuídas a partes diferentes em trechos distintos (ex.: um serviço dado ora à Prefeitura, ora à contratada).
- Escopo incoerente (obra declarada como construção nova em um capítulo e como reforma/adequação em outro).
- Erros de unidade/tabela (ex.: valor com unidade impossível, como "15,0 m" onde deveria ser cm).
- Nome de obra/unidade, município ou endereço que muda entre capítulos.
- Normas, siglas ou referências municipais que parecem pertencer a outro projeto.

Regras rígidas:
- Só relate o que puder sustentar com um trecho EXATO copiado do texto (campos evidencia e termo_busca). NÃO invente. Sem trecho exato, não relate.
- "evidencia" é TRANSCRIÇÃO, nunca derivação. Quem abrir a página tem de encontrar aquilo lá, letra por letra. Se você somou, multiplicou, converteu unidade ou concluiu algo, isso vai em "conflito" — nunca dentro das aspas. Achado aritmético cita os números COMO ESTÃO no documento em "evidencia" e mostra a conta em "conflito".
- Cada achado deve citar as páginas/capítulos envolvidos.
- Ignore erros puramente editoriais de uma palavra (grafia isolada); foque em incoerências de conteúdo entre capítulos.

Modo: memorial
Projeto informado: não informado
Solicitação do usuário: Auditoria profunda do memorial.

Responda APENAS JSON válido no formato {"findings":[{ "prioridade": "...", "pagina": "...", "capitulo": "...", "local": "...", "tipo": "...", "descricao": "...", "evidencia": "...", "termo_busca": "...", "categoria": "...", "referencia_comparada": "...", "conflito": "...", "sugestao_correcao": "...", "confianca": "..." }]}. Se nada, {"findings":[]}.

TEXTO DO DOCUMENTO:
${texto}
`.trim();
}

const campo = { type: "string" } as const;
const formato = {
  type: "json_schema" as const,
  name: "audit_findings",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      findings: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: Object.fromEntries(
            ["prioridade", "pagina", "capitulo", "local", "tipo", "descricao", "evidencia", "termo_busca", "arquivo", "categoria", "referencia_comparada", "conflito", "sugestao_correcao", "confianca", "impacto"].map((k) => [k, campo]),
          ),
          required: ["prioridade", "pagina", "capitulo", "local", "tipo", "descricao", "evidencia", "termo_busca", "arquivo", "categoria", "referencia_comparada", "conflito", "sugestao_correcao", "confianca", "impacto"],
        },
      },
    },
    required: ["findings"],
  },
};

const { nome, bytes } = await lerPdf();
const extraido = await extractPdfText(bytes);
const texto = textoDoDocumentoParaIA(extraido);
console.log(`[sonda] ${nome}: ${extraido.pageCount} páginas, ${texto.length.toLocaleString("pt-BR")} caracteres`);
if (process.env.SONDA_SECO === "1") {
  // A seco: confere a extração sem gastar token.
  console.log(`[sonda] a seco — prompt de ${promptDeCruzamento(texto).length.toLocaleString("pt-BR")} caracteres; nada foi chamado`);
  process.exit(0);
}
console.log(`[sonda] ${MODELO} / esforço ${ESFORCO} / teto ${TETO_DE_SAIDA} — chamando…`);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const inicio = Date.now();
let resposta = await openai.responses.create({
  model: MODELO,
  instructions: getAuditorPrompt("memorial"),
  reasoning: { effort: ESFORCO },
  max_output_tokens: TETO_DE_SAIDA,
  text: { format: formato },
  input: promptDeCruzamento(texto),
  background: true,
  store: true,
});
while (resposta.status === "queued" || resposta.status === "in_progress") {
  if (Date.now() - inicio > TETO_DE_TEMPO_MS) {
    await openai.responses.cancel(resposta.id).catch(() => {});
    throw new Error(`passou de ${TETO_DE_TEMPO_MS / 1000}s; cancelada`);
  }
  await new Promise((r) => setTimeout(r, 5000));
  resposta = await openai.responses.retrieve(resposta.id);
}
const segundos = Math.round((Date.now() - inicio) / 1000);

const uso = resposta.usage;
const entrada = uso?.input_tokens ?? 0;
const cache = uso?.input_tokens_details?.cached_tokens ?? 0;
const saida = uso?.output_tokens ?? 0;
const raciocinio = uso?.output_tokens_details?.reasoning_tokens ?? 0;
const custo = estimateOpenAiCostUsd(MODELO, { inputTokens: entrada, outputTokens: saida, cachedTokens: cache });

let achados: Record<string, string>[] = [];
try {
  achados = JSON.parse(resposta.output_text || "{}").findings ?? [];
} catch {
  console.error("[sonda] JSON inválido na resposta");
}

const resultado = {
  quando: new Date().toISOString(),
  arquivo: nome,
  paginas: extraido.pageCount,
  caracteres: texto.length,
  modelo: MODELO,
  esforco: ESFORCO,
  status: resposta.status,
  motivoIncompleto: resposta.incomplete_details?.reason ?? null,
  segundos,
  tokens: { entrada, cache, saida, raciocinio, visivel: saida - raciocinio },
  custoUsd: custo,
  achados,
};

const pasta = join("docs", "benchmarks", "sondas");
mkdirSync(pasta, { recursive: true });
const destino = join(pasta, `cruzamento-${nome.replace(/\.pdf$/i, "")}-${resultado.quando.slice(0, 10)}.json`);
writeFileSync(destino, JSON.stringify(resultado, null, 2));

console.log(`[sonda] ${resposta.status} em ${segundos}s`);
console.log(`[sonda] tokens: entrada ${entrada} (cache ${cache}) · saída ${saida} (raciocínio ${raciocinio}, visível ${saida - raciocinio})`);
console.log(`[sonda] custo estimado US$ ${custo?.toFixed(3)} · ${achados.length} achado(s)`);
for (const a of achados) console.log(`  - p.${a.pagina} [${a.prioridade}] ${a.tipo}: ${String(a.descricao).slice(0, 140)}`);
console.log(`[sonda] gravado em ${destino}`);
