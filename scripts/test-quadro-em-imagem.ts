/**
 * O QUADRO EM IMAGEM, TRANSCRITO — a folha tem texto, a tabela dela é imagem.
 *
 * O caso real (05/10/2026): `141_26_md_geral_a.pdf`, p12. A legenda "1.2 Tabela
 * 2: Quadro de Áreas" está em texto; o quadro, numa imagem de 849x945 px. Desde
 * f616636 a IA é avisada (`[IMAGEM NÃO LIDA]`) e não pode afirmar que a tabela
 * não existe — mas também não confere os números dela. Aqui a folha que
 * ANUNCIA quadro e tem imagem grande vai à mesma transcrição por visão das
 * folhas mudas, e o texto lido entra só no que a IA lê.
 *
 *   node --import ./scripts/lib/resolver-de-imports.mjs scripts/test-quadro-em-imagem.ts
 *   (== npm run test:quadro-em-imagem)
 *
 * A última seção abre o PDF real quando ele existe na máquina — não gasta IA.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import type { AuditFinding } from "../lib/audit-report.ts";
import { filterGroundedFindings } from "../lib/audit-verify.ts";
import {
  aplicarTranscricao,
  diagnosticarPaginasMudas,
  ehLegendaDeQuadro,
  paginasComQuadroEmImagem,
} from "../lib/pagina-muda.ts";
import {
  extractPdfText,
  imagensNaoLidas,
  MARCA_DE_IMAGEM,
  montarDocumento,
  textoDaPaginaParaIA,
  type ExtractedPdfPage,
} from "../lib/pdf-text.ts";
import { contarTinta, FRACAO_DA_IMAGEM_GRANDE } from "../lib/tinta-da-folha.ts";

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FALHOU  ${name}`);
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

const PROSA = "Os documentos integrantes do projeto executivo foram desenvolvidos com base na obra. ".repeat(3);
const RODAPE = [
  "PMC/SEDES – 141-26 – ARENA BELVEDERE – PROJETO EXECUTIVO – Memorial Descritivo",
  "- P:\\cad\\prefchap\\141_26\\relator\\1_projeto executivo\\141_26_md_geral_a.odm Cap.1 – Pág.12",
  "Direitos Autorais – Lei 9.610/98 – art. 7º, itens X e XI (art. 1), § Único.",
].join("\n");

function folha(page: number, corpo: string, imagensGrandes: number, extra: Partial<ExtractedPdfPage> = {}) {
  return {
    page,
    text: `${corpo}\n${PROSA}\n${RODAPE}`,
    tinta: { desenho: 7, imagem: 2 + imagensGrandes, imagensGrandes },
    ...extra,
  } satisfies ExtractedPdfPage;
}

const P12 = folha(12, "1 – APRESENTAÇÃO\n1.2 Tabela 2: Quadro de Áreas\n1.3 Plantas e desenhos", 1);
const QUADRO_LIDO = [
  "TABELA DE ÁREAS",
  "NOME | ÁREA",
  "ÁREA LOTE | 57718,65 m²",
  "ÁREA LICENCIADA ( EDIFICAÇÃO PRINCIPAL) | 19572,23 m²",
].join("\n");

// --------------------------------------------------------------- a legenda

await test("legendas reais do 141-26 casam", () => {
  for (const l of [
    "1.2 Tabela 2: Quadro de Áreas",
    "TABELA 11 - LARGURA DAS LINHAS LONGITUDINAIS EM",
    "TABELA 10 DEMOSTRATIVO DAS QUANTIDADES DOS SERVIÇOS DE PAVIMENTAÇÃO",
    "TABELA 20 – COORDENADAS",
    "TABELA 23",
    "TABELA 36: DIÂMETRO DO EMISSÁRIO DA ESTAÇÃO DE RECALQUE",
    "TABELA 1.1: QUADRO DE ÁREAS",
  ]) {
    assert.ok(ehLegendaDeQuadro(l), l);
  }
});

await test("menção no meio da frase e fim de frase não casam", () => {
  for (const l of [
    "A Tabela 3, a seguir, apresenta as dimensões recomendadas, tendo em vista a",
    "Tabela 7.",
    "na Tabela 10.3) e podem vir acompanhadas por tachas monodirecionais",
    "Conforme a tabela número 33 da NBR5410/2004, o método de instalação adotado",
    "Quadros de Proteção B.T",
    "Tabela 4 apresenta os valores",
  ]) {
    assert.ok(!ehLegendaDeQuadro(l), l);
  }
});

// --------------------------------------------------------------- o critério

await test("folha com legenda e imagem grande é quadro em imagem", () => {
  assert.deepEqual(paginasComQuadroEmImagem([P12]), [12]);
});

await test("imagem grande sem legenda (foto, pictograma) não é", () => {
  assert.deepEqual(paginasComQuadroEmImagem([folha(30, "3 – ESTRUTURAS\nFoto do local", 2)]), []);
});

await test("legenda sem imagem grande (tabela de texto) não é", () => {
  assert.deepEqual(paginasComQuadroEmImagem([folha(41, "TABELA 3 - ESTIMATIVA DO NÚMERO N", 0)]), []);
});

await test("legenda no pé da folha anterior sem imagem própria conta", () => {
  const anterior: ExtractedPdfPage = {
    page: 13,
    text: `${PROSA}\nTABELA 5 - QUADRO DE ESQUADRIAS\n${RODAPE}`,
    tinta: { desenho: 7, imagem: 2, imagensGrandes: 0 },
  };
  const seguinte = folha(14, "4 – ARQUITETURA", 1);
  assert.deepEqual(paginasComQuadroEmImagem([anterior, seguinte]), [14]);
});

await test("legenda no pé de folha que tem a própria imagem não puxa a seguinte", () => {
  const anterior = folha(47, "TABELA 12 - DIMENSÕES RECOMENDADAS PARA LFO-2", 2);
  const seguinte = folha(48, "6 – PROJETO DE SINALIZAÇÃO", 1);
  assert.deepEqual(paginasComQuadroEmImagem([anterior, seguinte]), [47]);
});

await test("folha muda não entra como quadro (ela já vai como muda)", () => {
  const muda: ExtractedPdfPage = { page: 9, text: "TABELA 1", tinta: { desenho: 0, imagem: 1, imagensGrandes: 1 } };
  assert.deepEqual(paginasComQuadroEmImagem([muda]), []);
  assert.deepEqual(diagnosticarPaginasMudas(montarDocumento([muda])).mudas, [9]);
});

// --------------------------------------------------------------- a fusão

await test("a transcrição do quadro vai para textoDaImagem, e page.text não muda", () => {
  const doc = aplicarTranscricao(montarDocumento([P12]), [{ pagina: 12, texto: QUADRO_LIDO }]);
  const p = doc.pages[0];
  assert.equal(p.text, P12.text, "a folha é a evidência: não pode mudar");
  assert.equal(p.origem, undefined, "não é folha relida inteira — o grifo continua valendo");
  assert.equal(p.textoDaImagem, QUADRO_LIDO);
  assert.ok(!doc.text.includes("57718,65"), "o texto da folha não leva a transcrição");
});

await test("a IA lê o quadro no lugar da marca, e imagensNaoLidas vira 0", () => {
  const doc = aplicarTranscricao(montarDocumento([P12]), [{ pagina: 12, texto: QUADRO_LIDO }]);
  const ia = textoDaPaginaParaIA(doc.pages[0]);
  assert.ok(ia.includes("ÁREA LOTE | 57718,65 m²"), ia);
  assert.ok(ia.includes("[FOLHA LIDA POR VISÃO]"));
  assert.ok(!ia.includes(MARCA_DE_IMAGEM), "a marca de imagem não lida sai");
  assert.equal(imagensNaoLidas(doc.pages[0]), 0);
  assert.ok(doc.textoParaIA?.includes("57718,65"), "o documento da IA leva o quadro");
});

await test("a trava enxerga o quadro: achado tirado dele não é descartado", () => {
  const achado = {
    id: "INC-002",
    prioridade: "Media",
    pagina: "12",
    capitulo: "1 – APRESENTAÇÃO",
    local: "Quadro de Áreas",
    tipo: "Conferência aritmética",
    descricao: "A soma das áreas do quadro não confere com o total declarado.",
    evidencia: "ÁREA LOTE | 57718,65 m²",
    termo_busca: "ÁREA LOTE | 57718,65",
    conflito: "declarado X, confere Y",
    sugestao_correcao: "Corrigir o total do Quadro de Áreas para o valor somado.",
    confianca: "alta",
    origem: "ia",
  } as AuditFinding;

  const antes = filterGroundedFindings([achado], montarDocumento([P12]));
  assert.equal(antes.dropped.length, 1, "sem transcrição, o número não existe para a trava");

  const doc = aplicarTranscricao(montarDocumento([P12]), [{ pagina: 12, texto: QUADRO_LIDO }]);
  const depois = filterGroundedFindings([achado], doc);
  assert.equal(depois.kept.length, 1, "com transcrição, a trava lê o mesmo texto que a IA");
  assert.equal(depois.kept[0].tier, undefined, "e não rebaixa: a imagem foi lida");
});

await test("transcrição para folha que não é muda nem quadro em imagem é ignorada", () => {
  const comum = folha(20, "5 – PAVIMENTAÇÃO", 0);
  const doc = aplicarTranscricao(montarDocumento([comum]), [{ pagina: 20, texto: "texto de fora" }]);
  assert.equal(doc.pages[0].text, comum.text);
  assert.equal(doc.pages[0].textoDaImagem, undefined);
});

await test("a folha muda continua indo para page.text, com origem visão", () => {
  const muda: ExtractedPdfPage = { page: 9, text: "", tinta: { desenho: 30, imagem: 0, imagensGrandes: 0 } };
  const doc = aplicarTranscricao(montarDocumento([muda, P12]), [
    { pagina: 9, texto: "texto da folha muda" },
    { pagina: 12, texto: QUADRO_LIDO },
  ]);
  assert.equal(doc.pages[0].text, "texto da folha muda");
  assert.equal(doc.pages[0].origem, "visao");
  assert.equal(doc.pages[1].textoDaImagem, QUADRO_LIDO);
});

// --------------------------------------------------------------- a tinta

await test("contarTinta separa logo de quadro pela área, com save/restore e form", () => {
  const OPS = { save: 10, restore: 11, transform: 12, constructPath: 91, paintImageXObject: 85, paintFormXObjectBegin: 74, paintFormXObjectEnd: 75 };
  const view = [0, 0, 595, 842];
  const ops = {
    fnArray: [10, 12, 85, 11, 10, 12, 85, 11, 91, 74, 12, 85, 75],
    argsArray: [
      null, [83, 0, 0, 21, 86, 748], [], null, // logo: 0,35%
      null, [242, 0, 0, 302, 195, 373], [], null, // quadro: 14,6%
      [],
      [[2, 0, 0, 2, 0, 0], [0, 0, 1, 1]], [100, 0, 0, 100, 0, 0], [], null, // form 2x: 200x200 = 8%
    ],
  };
  const t = contarTinta(ops, OPS, view);
  assert.deepEqual(t, { desenho: 1, imagem: 3, imagensGrandes: 2 });
  assert.ok(FRACAO_DA_IMAGEM_GRANDE > (83 * 21) / (595 * 842));
});

// --------------------------------------------------------------- o arquivo real

const REAL = "C:/Users/matheus.mendes/Desktop/NexoDoc/NEXO - TESTES/Memoriais/141_26_md_geral_a TESTE.pdf";
const ESPERADO = [12, 44, 46, 47, 49, 50, 52, 54, 55, 59, 61, 62, 64, 67, 68, 69, 71, 72, 73, 167];
if (existsSync(REAL)) {
  const doc = await extractPdfText(readFileSync(REAL));

  await test("141-26 real: o servidor escolhe as 20 folhas com quadro em imagem", () => {
    assert.deepEqual(diagnosticarPaginasMudas(doc).quadrosEmImagem, ESPERADO);
  });

  await test("141-26 real: o portão do navegador escolhe as MESMAS folhas", async () => {
    const { diagnosticarArquivo } = await import("../modules/nexo/lib/pagina-muda-render.ts");
    const bytes = readFileSync(REAL);
    const d = await diagnosticarArquivo(new File([bytes], "141_26.pdf", { type: "application/pdf" }));
    assert.deepEqual(d.quadrosEmImagem, ESPERADO);
    assert.deepEqual(d.mudas, diagnosticarPaginasMudas(doc).mudas, "e as mesmas mudas");
  });
} else {
  console.log(`  --  141-26 real não encontrado (${REAL}); seção pulada`);
}

console.log(`\n${passed} teste(s) passaram`);
