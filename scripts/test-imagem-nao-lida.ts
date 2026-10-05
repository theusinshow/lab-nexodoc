/**
 * A TABELA QUE É IMAGEM — a folha tem texto, e o quadro dela não tem.
 *
 * O caso real (05/10/2026): `141_26_md_geral_a.pdf`, Arena Belvedere. A página
 * 12 entrega 878 caracteres (o título "1.2 Tabela 2: Quadro de Áreas" e dois
 * parágrafos) e por isso passa por página de TEXTO — o detector de página muda
 * só olha a tinta abaixo de 120 caracteres. O Quadro de Áreas inteiro está
 * numa imagem de 849x945 px (15% da folha), que nada lia e nada anunciava. A
 * IA recebia o título seguido de nada e abria "não existe tabela".
 *
 *   node scripts/test-imagem-nao-lida.ts   (== npm run test:imagem-nao-lida)
 *
 * A última seção abre o PDF real quando ele existe na máquina e pula quando
 * não existe — não gasta IA.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import type { AuditFinding } from "../lib/audit-report.ts";
import { filterGroundedFindings } from "../lib/audit-verify.ts";
import { diagnosticarPaginasMudas } from "../lib/pagina-muda.ts";
import {
  extractPdfText,
  montarDocumento,
  textoDaPaginaParaIA,
  textoDoDocumentoParaIA,
  type ExtractedPdfPage,
} from "../lib/pdf-text.ts";

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

const MARCA = "[IMAGEM NÃO LIDA]";

/** A p12 do 141-26, reduzida: título do quadro, prosa, e a tabela em imagem. */
const TEXTO_P12 = [
  "1 – APRESENTAÇÃO",
  "1.2 Tabela 2: Quadro de Áreas",
  "1.3 Plantas e desenhos",
  "Os documentos integrantes do projeto executivo foram desenvolvidos com base na",
  "obra em execução (edificação da Arena Belvedere) e também com relação à implantação e",
  "urbanização da arena.",
].join("\n");

function p12(extra: Partial<ExtractedPdfPage> = {}): ExtractedPdfPage {
  return { page: 12, text: TEXTO_P12, tinta: { desenho: 7, imagem: 3, imagensGrandes: 1 }, ...extra };
}

/** Folha de texto comum: só o logo do cabeçalho, que não é imagem grande. */
function p13(): ExtractedPdfPage {
  return {
    page: 13,
    text: "2 – TERRAPLENAGEM\n" + "Texto corrido do capítulo de terraplenagem. ".repeat(10),
    tinta: { desenho: 7, imagem: 2, imagensGrandes: 0 },
  };
}

function achado(over: Partial<AuditFinding>): AuditFinding {
  return {
    id: "INC-001",
    prioridade: "Media",
    pagina: "12",
    capitulo: "1 – APRESENTAÇÃO",
    local: "Item 1.2",
    tipo: "Tabela ausente",
    descricao: "O item 1.2 anuncia o Quadro de Áreas, mas não existe tabela no documento.",
    evidencia: "1.2 Tabela 2: Quadro de Áreas",
    termo_busca: "1.2 Tabela 2: Quadro de Áreas",
    conflito: "Não existem linhas ou valores da tabela após esse título.",
    sugestao_correcao: "Inserir o Quadro de Áreas com as áreas de cada setor no item 1.2.",
    confianca: "alta",
    origem: "ia",
    ...over,
  } as AuditFinding;
}

// --------------------------------------------------------------- o insumo da IA

await test("a página com imagem grande avisa a IA de que há conteúdo não lido", () => {
  const texto = textoDaPaginaParaIA(p12());
  assert.ok(texto.includes(MARCA), `esperava a marca no texto da IA:\n${texto}`);
});

await test("a folha em si (page.text) não muda — a evidência ancora nela", () => {
  const page = p12();
  const doc = montarDocumento([page]);
  assert.equal(doc.pages[0].text, TEXTO_P12);
  assert.ok(!doc.text.includes(MARCA), "o texto da folha não pode carregar a moldura");
  assert.equal(doc.charCount, TEXTO_P12.length, "a contagem é da folha, não da moldura");
});

await test("prompt, trava e validação leem a mesma marca (textoDoDocumentoParaIA)", () => {
  const doc = montarDocumento([p12(), p13()]);
  assert.ok(textoDoDocumentoParaIA(doc).includes(MARCA));
});

await test("página só com o logo do cabeçalho não ganha marca", () => {
  assert.ok(!textoDaPaginaParaIA(p13()).includes(MARCA));
});

await test("página já relida por visão não ganha marca", () => {
  assert.ok(!textoDaPaginaParaIA(p12({ origem: "visao" })).includes(MARCA));
});

await test("parecer antigo sem a medida de imagem grande não ganha marca", () => {
  assert.ok(!textoDaPaginaParaIA(p12({ tinta: { desenho: 7, imagem: 3 } })).includes(MARCA));
});

await test("a marca não carrega número com unidade (os fatos de quantidade leem a prosa)", () => {
  const texto = textoDaPaginaParaIA(p12());
  const marca = texto.slice(texto.indexOf(MARCA));
  assert.ok(!/\d/.test(marca), `a marca não pode ter dígito: ${marca}`);
});

// --------------------------------------------------------------- o diagnóstico

await test("o diagnóstico lista a página parcialmente muda sem chamá-la de muda", () => {
  const d = diagnosticarPaginasMudas(montarDocumento([p12(), p13()]));
  assert.deepEqual(d.mudas, []);
  assert.deepEqual(d.comImagemNaoLida, [12]);
});

// --------------------------------------------------------------- a trava

await test("achado de 'tabela inexistente' em folha com imagem não lida é rebaixado", () => {
  const doc = montarDocumento([p12(), p13()]);
  const r = filterGroundedFindings([achado({})], doc);
  assert.equal(r.kept.length, 1, "não some: pode haver defeito real (pecar pelo excesso)");
  const f = r.kept[0];
  assert.equal(f.tier, "sugestao");
  assert.equal(f.confianca, "baixa");
  assert.match(f.conflito, /imagem/i, "o achado precisa dizer por que foi rebaixado");
  assert.equal(r.rebaixadosPorImagem, 1);
});

await test("o caso gêmeo do 117-25 ('Não existem linhas ou valores da tabela') também", () => {
  const doc = montarDocumento([p12(), p13()]);
  const r = filterGroundedFindings(
    [
      achado({
        tipo: "Ausência documental",
        descricao: "O texto extraído mostra o título da tabela, sem o conteúdo.",
        evidencia: '"1.2 Tabela 2: Quadro de Áreas" / Não existem linhas ou valores da tabela após esse título no documento.',
        conflito: "Quadro anunciado sem valores.",
      }),
    ],
    doc,
  );
  assert.equal(r.kept[0].tier, "sugestao");
});

await test("título no pé da folha N e quadro-imagem na N+1 também conta", () => {
  const doc = montarDocumento([{ ...p13(), page: 11 }, p12()]);
  const r = filterGroundedFindings([achado({ pagina: "11" })], doc);
  assert.equal(r.kept[0].tier, "sugestao");
});

await test("a mesma ausência em folha SEM imagem continua afirmada", () => {
  const doc = montarDocumento([p12(), p13()]);
  const r = filterGroundedFindings(
    [achado({ pagina: "13", evidencia: "Texto corrido do capítulo de terraplenagem.", termo_busca: "Texto corrido do capítulo" })],
    doc,
  );
  assert.equal(r.kept[0].tier, undefined);
  assert.equal(r.kept[0].confianca, "alta");
  assert.equal(r.rebaixadosPorImagem, 0);
});

await test("achado que não fala de ausência de quadro, na folha com imagem, fica intacto", () => {
  const doc = montarDocumento([p12(), p13()]);
  const r = filterGroundedFindings(
    [achado({ tipo: "Numeração", descricao: "O item 1.2 repete a numeração do sumário.", conflito: "Numeração divergente." })],
    doc,
  );
  assert.equal(r.kept[0].tier, undefined);
});

await test("achado de regra não passa pela trava", () => {
  const doc = montarDocumento([p12(), p13()]);
  const r = filterGroundedFindings([achado({ origem: "regra" })], doc);
  assert.equal(r.kept[0].tier, undefined);
});

// --------------------------------------------------------------- o arquivo real

const REAL = "C:/Users/matheus.mendes/Desktop/NexoDoc/NEXO - TESTES/Memoriais/141_26_md_geral_a TESTE.pdf";
if (existsSync(REAL)) {
  const doc = await extractPdfText(readFileSync(REAL));
  const pagina = (n: number) => doc.pages[n - 1];

  await test("141-26 real: a p12 (Quadro de Áreas em imagem) é parcialmente muda", () => {
    assert.ok((pagina(12).tinta?.imagensGrandes ?? 0) >= 1, JSON.stringify(pagina(12).tinta));
    assert.ok(textoDaPaginaParaIA(pagina(12)).includes(MARCA));
  });

  await test("141-26 real: a p2 (sumário, só logos) não é", () => {
    assert.equal(pagina(2).tinta?.imagensGrandes ?? 0, 0, JSON.stringify(pagina(2).tinta));
  });

  await test("141-26 real: as tabelas de sinalização em imagem (p49, p50) também aparecem", () => {
    const d = diagnosticarPaginasMudas(doc);
    assert.ok(d.comImagemNaoLida.includes(49) && d.comImagemNaoLida.includes(50), d.comImagemNaoLida.join(","));
    console.log(`        (${d.comImagemNaoLida.length} de ${doc.pageCount} páginas com imagem não lida)`);
  });

  await test("141-26 real: a medida não mexeu na classificação de página muda", () => {
    const d = diagnosticarPaginasMudas(doc);
    // A lista que o código de antes (medindo a tinta só abaixo do limiar)
    // devolvia para este arquivo — medida com o `HEAD` de f350419.
    assert.deepEqual(d.mudas, [10, 14, 26, 32, 40, 81, 102, 111, 131, 137, 143, 161, 173]);
  });
} else {
  console.log(`  --  141-26 real não encontrado (${REAL}); seção pulada`);
}

console.log(`\n${passed} teste(s) passaram`);
