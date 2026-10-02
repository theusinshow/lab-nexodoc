/**
 * Teste da AUDITORIA INCOMPLETA — o parecer que não pode parecer inteiro.
 *
 * Em 14/09/2026 o 117_25 (218 páginas) saiu em produção com 10 achados: a
 * leitura do documento pela IA abortou e só as regras rodaram. A tela mostrava a
 * contagem como a de qualquer auditoria, e a pessoa leu "este memorial tem 10
 * problemas". A corrida completa do mesmo documento achou 56.
 *
 *   node scripts/test-auditoria-incompleta.ts
 */
import assert from "node:assert/strict";

import {
  detalheDoParecer,
  incompletudeDoParecer,
  rotuloDaContagem,
} from "../lib/auditoria-incompleta.ts";
import { getEmissionVerdict } from "../lib/audit-report.ts";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FALHOU  ${name}`);
    console.error(err instanceof Error ? err.stack : err);
    process.exitCode = 1;
  }
}

const GLOBAL_ABORTADA = [{ passada: "Leitura global do documento", motivo: "Request was aborted." }];

/** N achados confirmados (de regra, que nunca viram sugestão). */
function achados(n: number, extra: Record<string, unknown> = {}) {
  return Array.from({ length: n }, (_, i) => ({ id: `INC-${String(i + 1).padStart(3, "0")}`, origem: "regra", ...extra }));
}

function parecer(over: Record<string, unknown> = {}) {
  return {
    status_analise: "concluida" as const,
    status_geral: "revisão obrigatória antes de emissão",
    total_incongruencias: 10,
    incongruencias: achados(10),
    runtime: { passadas_incompletas: [] as { passada: string; motivo?: string }[] },
    ...over,
  };
}

test("parecer completo não carrega aviso nenhum", () => {
  const i = incompletudeDoParecer(parecer());
  assert.equal(i.incompleta, false);
  assert.equal(i.iaNaoLeu, false);
  assert.equal(rotuloDaContagem(parecer()), "10 achados");
});

test("leitura global abortada: incompleta E a IA não leu o documento", () => {
  const p = parecer({ runtime: { passadas_incompletas: GLOBAL_ABORTADA } });
  const i = incompletudeDoParecer(p);
  assert.equal(i.incompleta, true);
  assert.equal(i.iaNaoLeu, true);
  assert.match(i.titulo, /AUDITORIA INCOMPLETA/);
  assert.match(i.titulo, /IA NÃO LEU/);
  // A frase tem que desmentir a contagem com todas as letras.
  assert.match(i.explicacao, /só das regras automáticas/);
  assert.match(i.explicacao, /não é o total/i);
  assert.match(i.explicacao, /Request was aborted/);
});

test("a contagem de uma auditoria incompleta nunca aparece sozinha", () => {
  const p = parecer({ runtime: { passadas_incompletas: GLOBAL_ABORTADA } });
  assert.equal(rotuloDaContagem(p), "10 achados — contagem INCOMPLETA");
});

test("o detalhe do nó diz incompleta antes do número", () => {
  const p = parecer({ runtime: { passadas_incompletas: GLOBAL_ABORTADA } });
  assert.match(detalheDoParecer(p), /^AUDITORIA INCOMPLETA/);
  assert.equal(
    detalheDoParecer(parecer()),
    "revisão obrigatória antes de emissão · 10 achados",
  );
});

test("outra passada falhou: incompleta, mas sem dizer que a IA não leu", () => {
  const p = parecer({
    runtime: { passadas_incompletas: [{ passada: "Revisão dos achados pela IA", motivo: "x" }] },
  });
  const i = incompletudeDoParecer(p);
  assert.equal(i.incompleta, true);
  assert.equal(i.iaNaoLeu, false);
  assert.match(i.explicacao, /Revisão dos achados pela IA/);
});

test("status parcial sem passada falha (folha muda) também é incompleta", () => {
  const i = incompletudeDoParecer(parecer({ status_analise: "parcial" }));
  assert.equal(i.incompleta, true);
  assert.equal(i.iaNaoLeu, false);
});

test("folhas mudas não transcritas: diz QUANTAS páginas a IA não leu e como resolver", () => {
  // O caso real de 14/09 17:49: a IA leu todo o texto, mas 14 das 218 páginas
  // têm o conteúdo desenhado e não foram transcritas. "Parte do documento não
  // foi lida" não dizia o que faltou nem o que fazer.
  const p = parecer({
    status_analise: "parcial",
    total_incongruencias: 52,
    incongruencias: achados(52),
    arquivos_analisados: [
      {
        arquivo: "117_25_md_geral_a.pdf",
        paginas: 218,
        cobertura: {
          caracteres_lidos: 469053, caracteres_totais: 469053,
          blocos_lidos: 0, blocos_totais: 98, blocos_planejados: 0,
          paginas_mudas: 14, paginas_transcritas: 0,
        },
      },
    ],
  });
  const i = incompletudeDoParecer(p);
  assert.equal(i.incompleta, true);
  assert.equal(i.iaNaoLeu, false);
  assert.equal(i.paginasNaoLidas, 14);
  assert.match(i.titulo, /14 PÁGINAS NÃO FORAM LIDAS/);
  assert.match(i.explicacao, /14 de 218 páginas/);
  assert.match(i.explicacao, /52 achados/);
  assert.match(i.explicacao, /Transcrever e auditar/);
  assert.doesNotMatch(i.explicacao, /Parte do documento não foi lida/);
});

test("folhas mudas transcritas não acendem aviso", () => {
  const p = parecer({
    arquivos_analisados: [
      { arquivo: "x.pdf", paginas: 218, cobertura: { caracteres_lidos: 1, caracteres_totais: 1, blocos_lidos: 0, blocos_totais: 98, blocos_planejados: 0, paginas_mudas: 14, paginas_transcritas: 14 } },
    ],
  });
  assert.equal(incompletudeDoParecer(p).incompleta, false);
});

test("a contagem é só de confirmados: sugestões da IA ficam fora do número", () => {
  // O 991-26 de 02/10/2026: 6 confirmados e 2 sugestões. O trilho dizia 6, o
  // cartão do chat e o aviso diziam 8 — o total cru da corrida.
  const p = parecer({
    total_incongruencias: 8,
    incongruencias: [
      ...achados(6),
      { id: "INC-007", origem: "ia", tier: "sugestao" },
      { id: "INC-008", origem: "ia", confianca: "baixa" },
    ],
  });
  assert.equal(rotuloDaContagem(p), "6 achados");
});

test("sem a lista, vale o total gravado", () => {
  assert.equal(rotuloDaContagem({ total_incongruencias: 4 }), "4 achados");
});

test("parecer antigo sem runtime não quebra e não inventa aviso", () => {
  const i = incompletudeDoParecer({ total_incongruencias: 3, incongruencias: [] });
  assert.equal(i.incompleta, false);
});

test("o veredito da leitura global abortada é o de auditoria incompleta, em vermelho", () => {
  const v = getEmissionVerdict([], GLOBAL_ABORTADA);
  assert.match(v.label, /AUDITORIA INCOMPLETA/);
  assert.match(v.label, /NÃO USE PARA EMITIR/);
  assert.equal(v.emoji, "🔴");
});

console.log(`\n${passed} teste(s) passaram`);
