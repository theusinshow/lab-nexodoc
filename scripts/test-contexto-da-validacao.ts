/**
 * O VALIDADOR PRECISA VER A PÁGINA DO ACHADO.
 *
 * Até 17/08/2026 ele recebia uma AMOSTRA do documento (o recorte de 90k do nível
 * Padrão, cortado em 45k por arquivo) — 8% de um memorial de 547.855 caracteres.
 * Os falsos positivos "Escola Geral" (p. 181) do 084_25 sobreviveram porque a
 * validação nunca viu a página 181. Quem não lê não refuta: carimba.
 *
 *   node scripts/test-contexto-da-validacao.ts   (== npm run test:contexto-validacao)
 */
import assert from "node:assert/strict";

import {
  ACHADOS_POR_LOTE,
  buildFindingCandidateList,
  buildValidationContext,
  lotesDaValidacao,
} from "../lib/audit-validation-prompt.ts";
import type { AuditFinding } from "../lib/audit-report.ts";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FALHOU  ${name}`);
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

/** 200 páginas; a 181 tem a marca que o teste procura. */
function memorial() {
  const pages = Array.from({ length: 200 }, (_, i) => ({
    page: i + 1,
    text:
      i + 1 === 181
        ? "Ocupacao predominante: Escola Geral - E-1 Grupo E MARCA_181"
        : `Conteudo de enchimento da pagina ${i + 1}. ${"x".repeat(2000)}`,
  }));

  return [
    {
      file: { name: "084_25_md.pdf" },
      fileType: "memorial",
      extracted: {
        pages,
        text: pages.map((p) => p.text).join("\n"),
        pageCount: pages.length,
        charCount: pages.reduce((n, p) => n + p.text.length, 0),
      },
    },
  ];
}

function achado(pagina: string, over: Partial<AuditFinding> = {}): AuditFinding {
  return {
    id: "INC-001",
    prioridade: "Alta",
    pagina,
    capitulo: "x",
    local: "x",
    tipo: "x",
    descricao: "x",
    evidencia: "x",
    conflito: "x",
    sugestao_correcao: "x",
    confianca: "alta",
    ...over,
  } as AuditFinding;
}

test("O CASO REAL: a página 181 entra no contexto", () => {
  const ctx = buildValidationContext(memorial(), [achado("181")]);
  assert.match(ctx, /MARCA_181/, "o validador precisa ver a página que julga");
});

test("sem os achados, a página 181 NÃO entra — era o comportamento antigo", () => {
  /*
   * Prova que o defeito era real: a amostragem de cabeça/meio/cauda de um
   * documento de 200 páginas não alcança a 181.
   */
  const ctx = buildValidationContext(memorial());
  assert.doesNotMatch(ctx, /MARCA_181/);
});

test("as vizinhas entram junto — o trecho atravessa a virada", () => {
  const ctx = buildValidationContext(memorial(), [achado("181")]);
  assert.match(ctx, /PÁGINA 180/);
  assert.match(ctx, /PÁGINA 182/);
});

test("página 1 não gera vizinha zero nem negativa", () => {
  const ctx = buildValidationContext(memorial(), [achado("1")]);
  assert.doesNotMatch(ctx, /PÁGINA 0/);
  assert.doesNotMatch(ctx, /PÁGINA -/);
});

test("achado multipágina traz todas as páginas", () => {
  const ctx = buildValidationContext(memorial(), [achado("25, 181")]);
  assert.match(ctx, /PÁGINA 25/);
  assert.match(ctx, /MARCA_181/);
});

test("achado sem página resolvível cai na amostragem — não devolve vazio", () => {
  // Contexto genérico é pior que o certo, e muito melhor que nenhum.
  const ctx = buildValidationContext(memorial(), [achado("não identificada")]);
  assert.ok(ctx.length > 1000);
  assert.match(ctx, /TEXTO DE CONTEXTO/);
});

test("o cabeçalho DIZ que o recorte é focalizado", () => {
  // Quem lê o prompt (e quem depura) precisa saber qual estratégia rodou.
  const ctx = buildValidationContext(memorial(), [achado("181")]);
  assert.match(ctx, /páginas citadas pelos achados/i);
});

test("respeita o orçamento mesmo com achado em toda página", () => {
  const muitos = Array.from({ length: 200 }, (_, i) => achado(String(i + 1)));
  const ctx = buildValidationContext(memorial(), muitos);
  assert.ok(ctx.length <= 92_000, `contexto de ${ctx.length} chars estourou o orçamento`);
});

// --- Os lotes: todo achado vai ao validador ---------------------------------
/** Um parecer profundo típico: 10 de regra na frente, 56 de IA pelo documento. */
function parecerProfundo() {
  const regras = Array.from({ length: 10 }, (_, i) =>
    achado(String(5 + i * 3), { id: `COER-${i + 1}`, origem: "regra" }),
  );
  const ia = Array.from({ length: 56 }, (_, i) =>
    achado(String(1 + i * 3), { id: `INC-${i + 1}` }),
  );
  return [...regras, ...ia];
}

test("O CASO REAL: com 66 candidatos, TODOS caem em algum lote", () => {
  /*
   * Até 26/09 a lista cortava em 40: os 26 últimos — o fim do documento e a
   * rede de arrasto — saíam sem revisão e sem aviso.
   */
  const todos = parecerProfundo();
  const lotes = lotesDaValidacao(memorial(), todos);
  const ids = lotes.flat().map((f) => f.id).sort();
  assert.deepEqual(ids, todos.map((f) => f.id).sort());
});

test("nenhum lote passa do tamanho nem do orçamento de páginas", () => {
  const arquivos = memorial();
  for (const lote of lotesDaValidacao(arquivos, parecerProfundo())) {
    assert.ok(lote.length <= ACHADOS_POR_LOTE, `lote de ${lote.length} achados`);
    const ctx = buildValidationContext(arquivos, lote);
    assert.ok(ctx.length <= 92_000, `contexto de ${ctx.length} chars estourou o orçamento`);
    // Cortado no orçamento = alguma página do lote ficou de fora do contexto.
    for (const f of lote) {
      assert.match(ctx, new RegExp(`PÁGINA ${f.pagina} ---`), `${f.id} sem a página ${f.pagina}`);
    }
  }
});

test("o achado do FIM do documento tem a página dele no contexto do seu lote", () => {
  /*
   * O outro lado do defeito: as páginas iam em ordem e eram cortadas em 90k,
   * então quem estava depois da página ~35 era julgado sem a página.
   */
  const arquivos = memorial();
  const todos = [...parecerProfundo(), achado("181", { id: "INC-181" })];
  const lote = lotesDaValidacao(arquivos, todos).find((l) => l.some((f) => f.id === "INC-181"));
  assert.ok(lote, "o achado da 181 precisa estar em algum lote");
  assert.match(buildValidationContext(arquivos, lote), /MARCA_181/);
});

test("achado sem página vai para um lote próprio, com a amostra", () => {
  const arquivos = memorial();
  const lotes = lotesDaValidacao(arquivos, [
    achado("10", { id: "A" }),
    achado("não identificada", { id: "B" }),
  ]);
  assert.deepEqual(lotes.map((l) => l.map((f) => f.id)), [["A"], ["B"]]);
  assert.match(buildValidationContext(arquivos, lotes[1]), /TEXTO DE CONTEXTO:/);
});

test("achado cujas páginas sozinhas estouram o orçamento é julgado mesmo assim", () => {
  const lotes = lotesDaValidacao(memorial(), [achado("1-200", { id: "GIGANTE" }), achado("5")]);
  assert.ok(lotes.flat().some((f) => f.id === "GIGANTE"));
});

test("a lista de candidatos não corta mais em 40", () => {
  const lista = buildFindingCandidateList(parecerProfundo());
  assert.match(lista, /ID: INC-56\n/);
});

console.log(`\n${passed} teste(s) de contexto da validação OK`);
