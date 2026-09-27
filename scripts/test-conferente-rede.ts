/**
 * QUAIS BLOCOS NINGUÉM LEU — puro, sem token e sem rede.
 *
 *   node scripts/test-conferente-rede.ts
 *
 * Esta é a conta que decide QUANTO a rede de arrasto vai varrer, e errá-la tem
 * dois estragos opostos:
 *
 *  - contar demais enche o parecer de achados de rede sobre páginas que o `sol`
 *    acabou de ler com atenção. No Profundo isso seria o documento inteiro,
 *    porque lá o plano de blocos é ZERO por desenho;
 *  - contar de menos devolve o silêncio de hoje.
 *
 * O `parValeAPergunta` do Encaixe 4 está aqui pelo mesmo motivo: ele é o filtro
 * determinístico que evita perguntar 1.540 pares num parecer de 56 achados.
 */
import assert from "node:assert/strict";

import type { AuditTextChunk, ExtractedPdf } from "../lib/pdf-text.ts";
import { blocosNaoLidos } from "../lib/conferente/encaixe-2-rede.ts";
import {
  paginasNoContextoComReuso,
  paginasNoContextoGlobal,
} from "../lib/audit-validation-prompt.ts";
import { parValeAPergunta } from "../lib/conferente/encaixe-4-dedupe.ts";
import type { AuditFinding } from "../lib/audit-report.ts";

let passed = 0;

function test(nome: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${nome}`);
  } catch (erro) {
    console.error(`FALHOU  ${nome}`);
    console.error(erro);
    process.exitCode = 1;
  }
}

function bloco(id: string, startPage: number, endPage: number): AuditTextChunk {
  return {
    id,
    title: `Capitulo ${id}`,
    startPage,
    endPage,
    text: "x".repeat(1000),
  };
}

const BLOCOS = [bloco("a", 1, 4), bloco("b", 5, 8), bloco("c", 9, 12)];

function paginas(de: number, ate: number) {
  return new Set(Array.from({ length: ate - de + 1 }, (_, i) => de + i));
}

test("a global que leu TUDO nao deixa buraco (o caso do Profundo)", () => {
  /*
   * O caso que mais importa. No Profundo `chunks` e vazio de proposito, porque
   * a leitura global manda o documento inteiro. Tratar "nao esta em chunks"
   * como "ninguem leu" varreria o documento inteiro em TODA corrida Profunda.
   */
  assert.deepEqual(blocosNaoLidos(BLOCOS, new Set(), paginas(1, 12)), []);
});

test("a global ABORTADA deixa o documento inteiro para a rede (o 117_25 de 14/09)", () => {
  /*
   * O defeito que motivou a troca para paginas. A rota passava o TETO de
   * caracteres da global, o mesmo com ela concluida ou abortada, e a rede dava
   * por lido o documento que ninguem leu. Global que nao terminou = nada lido.
   */
  const naoLidos = blocosNaoLidos(BLOCOS, new Set(), new Set());
  assert.deepEqual(naoLidos.map((b) => b.id), ["a", "b", "c"]);
});

test("bloco com UMA pagina fora do que a global leu conta como NAO lido", () => {
  /*
   * A global levou as paginas 1-6: o bloco "b" (5-8) foi visto pela metade.
   * Meia leitura nao e leitura — e e exatamente na parte que faltou que o
   * achado se perde.
   */
  const naoLidos = blocosNaoLidos(BLOCOS, new Set(), paginas(1, 6));
  assert.deepEqual(naoLidos.map((b) => b.id), ["b", "c"]);
});

test("a amostra do Padrao (cabeca e cauda) deixa so o MEIO para a rede", () => {
  const cabecaECauda = new Set([...paginas(1, 4), ...paginas(9, 12)]);
  const naoLidos = blocosNaoLidos(BLOCOS, new Set(), cabecaECauda);
  assert.deepEqual(naoLidos.map((b) => b.id), ["b"]);
});

test("bloco que foi ao modelo por bloco nao e varrido de novo", () => {
  const naoLidos = blocosNaoLidos(BLOCOS, new Set(["b"]), new Set());
  assert.deepEqual(naoLidos.map((b) => b.id), ["a", "c"]);
});

// --- O que a global recebeu, por pagina --------------------------------------
/** Monta o `extracted` do jeito que `extractPdfText` monta o `textoParaIA`. */
function documento(nPaginas: number, charsPorPagina: number): ExtractedPdf {
  const pages = Array.from({ length: nPaginas }, (_, i) => ({
    page: i + 1,
    text: `pagina ${i + 1} ${String(i + 1).repeat(charsPorPagina)}`,
  }));
  const text = pages.map((p) => p.text).join("\n");

  return {
    pages,
    text,
    textoParaIA: pages.map((p) => `--- PAGINA ${p.page} ---\n${p.text}`).join("\n\n"),
    pageCount: nPaginas,
    charCount: text.length,
  } as ExtractedPdf;
}

test("documento que cabe na janela: todas as paginas lidas", () => {
  const lidas = paginasNoContextoGlobal(documento(10, 1000), "deep");
  assert.deepEqual([...lidas].sort((a, b) => a - b), [...paginas(1, 10)]);
});

test("documento maior que a janela: cabeca e cauda lidas, o resto nao", () => {
  const anterior = process.env.NEXODOC_GLOBAL_CONTEXT_CHARS;
  process.env.NEXODOC_GLOBAL_CONTEXT_CHARS = "40000";
  try {
    // 40 paginas de ~5k = ~200k; a janela de 40k leva ~15k de cabeca, ~8k do
    // meio e ~17k de cauda.
    const lidas = paginasNoContextoGlobal(documento(40, 5000), "standard");
    assert.ok(lidas.has(1), "a primeira pagina esta na cabeca");
    assert.ok(lidas.has(40), "a ultima pagina esta na cauda");
    assert.ok(!lidas.has(5), "a pagina 5 fica entre a cabeca e o meio");
    assert.ok(!lidas.has(30), "a pagina 30 fica entre o meio e a cauda");
    assert.ok(lidas.size < 15, `leu ${lidas.size} de 40 paginas`);
  } finally {
    if (anterior === undefined) delete process.env.NEXODOC_GLOBAL_CONTEXT_CHARS;
    else process.env.NEXODOC_GLOBAL_CONTEXT_CHARS = anterior;
  }
});

test("folha muda nao impede o bloco de contar como lido", () => {
  const doc = documento(40, 5000);
  doc.pages[1] = { ...doc.pages[1], text: "" };
  const anterior = process.env.NEXODOC_GLOBAL_CONTEXT_CHARS;
  process.env.NEXODOC_GLOBAL_CONTEXT_CHARS = "40000";
  try {
    assert.ok(paginasNoContextoGlobal(doc, "standard").has(2));
  } finally {
    if (anterior === undefined) delete process.env.NEXODOC_GLOBAL_CONTEXT_CHARS;
    else process.env.NEXODOC_GLOBAL_CONTEXT_CHARS = anterior;
  }
});

test("reauditoria: capitulo cortado pelo teto nao conta como lido", () => {
  const capitulo = (hash: string, startPage: number, endPage: number) => ({
    hash,
    titulo: `Cap ${hash}`,
    texto: "y".repeat(1000),
    startPage,
    endPage,
  });
  const lidas = paginasNoContextoComReuso({
    capitulos: [capitulo("h1", 1, 3), capitulo("h2", 4, 6), capitulo("h3", 7, 9)],
    hashesHerdados: new Set(["h1"]),
    resumoPorHash: new Map([["h1", "resumo curto"]]),
    // ~70 do resumo + ~1.015 do h2 cabem; o h3 passaria de 1.500.
    maxChars: 1500,
  });
  assert.deepEqual([...lidas].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6]);
});

// --- Encaixe 4: o filtro deterministico de pares ----------------------------
function achado(id: string, arquivo: string, pagina: string): AuditFinding {
  return {
    id,
    arquivo,
    origem: "ia",
    confianca: "alta",
    prioridade: "Media",
    pagina,
    capitulo: "",
    local: "",
    tipo: "",
    descricao: "",
    evidencia: "",
    conflito: "",
    sugestao_correcao: "",
  } as AuditFinding;
}

test("par de arquivos diferentes nunca e perguntado", () => {
  assert.equal(
    parValeAPergunta(achado("1", "a.pdf", "10"), achado("2", "b.pdf", "10")),
    false,
  );
});

test("par a 40 paginas de distancia nunca e perguntado", () => {
  assert.equal(
    parValeAPergunta(achado("1", "a.pdf", "10"), achado("2", "a.pdf", "50")),
    false,
  );
});

test("par na mesma pagina, ou vizinha, vale a pergunta", () => {
  assert.equal(parValeAPergunta(achado("1", "a.pdf", "10"), achado("2", "a.pdf", "10")), true);
  assert.equal(parValeAPergunta(achado("1", "a.pdf", "10"), achado("2", "a.pdf", "11")), true);
});

test("intervalo de paginas casa com qualquer uma das pontas", () => {
  // "18-19" e "19" sao o mesmo lugar do documento.
  assert.equal(parValeAPergunta(achado("1", "a.pdf", "18-19"), achado("2", "a.pdf", "19")), true);
});

test("achado sem pagina nunca e pareado", () => {
  assert.equal(parValeAPergunta(achado("1", "a.pdf", ""), achado("2", "a.pdf", "10")), false);
});

console.log(`\n${passed} teste(s) OK`);
