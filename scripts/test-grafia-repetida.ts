/**
 * A grafia errada que se repete: o achado de "CMB" ganha todas as páginas.
 *
 *   node scripts/test-grafia-repetida.ts   (== npm run test:grafia-repetida)
 */
import assert from "node:assert/strict";

import type { AuditFinding } from "../lib/audit-report.ts";
import { estenderGrafiaRepetida, trocaDoAchado } from "../lib/grafia-repetida.ts";

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

const base: AuditFinding = {
  id: "INC-004",
  arquivo: "memorial.pdf",
  prioridade: "Baixa",
  pagina: "3",
  capitulo: "PPCI",
  local: "item 4.2",
  tipo: "Sigla grafada errada",
  descricao: "A sigla do Corpo de Bombeiros aparece como CMB.",
  evidencia: "aprovado pelo CMB conforme IN 001",
  termo_busca: "aprovado pelo CMB",
  categoria: "Ortografia / Redação",
  conflito: "A sigla correta é \"CBM\".",
  sugestao_correcao: "Trocar \"CMB\" por \"CBM\".",
  confianca: "alta",
};

const paginas = [
  { page: 1, text: "Capa do memorial" },
  { page: 3, text: "Projeto aprovado pelo CMB conforme IN 001." },
  { page: 7, text: "Exigências do CMB: extintores. Vistoria do CMB." },
  { page: 9, text: "Corpo de Bombeiros Militar (CBM) e a palavra CMBX." },
  { page: 12, text: "Laudo do CMB." },
];

test("lê o par da sigla sem depender da frase", () => {
  assert.deepEqual(trocaDoAchado(base), { errado: "CMB", certo: "CBM", sigla: true });
  assert.deepEqual(trocaDoAchado({ ...base, sugestao_correcao: "Usar CBM em vez de CMB." }), { errado: "CMB", certo: "CBM", sigla: true });
});

test("estende o achado com todas as páginas da sigla errada", () => {
  const { achados } = estenderGrafiaRepetida([base], () => paginas);
  assert.equal(achados.length, 1);
  assert.equal(achados[0].pagina, "3, 7, 12");
  assert.match(achados[0].descricao, /páginas 7, 12 — 4 ocorrências/);
  assert.match(achados[0].evidencia, /^Pág\. 3: "aprovado pelo CMB conforme IN 001" \| Pág\. 7: ".*CMB.*" \| Pág\. 12: "Laudo do CMB\."/);
});

test("duas ocorrências que o modelo deu separadas viram um achado", () => {
  const outro = { ...base, id: "INC-009", pagina: "12", evidencia: "Laudo do CMB" };
  const { achados } = estenderGrafiaRepetida([base, outro], () => paginas);
  assert.equal(achados.length, 1);
  assert.equal(achados[0].id, "INC-004");
});

test("concordância e acento não varrem o documento", () => {
  const concordancia = { ...base, evidencia: "a obra foi realizada", termo_busca: "realizada", conflito: "", sugestao_correcao: "Trocar \"realizada\" por \"realizado\".", descricao: "" };
  assert.equal(trocaDoAchado(concordancia), null);
  const acento = { ...base, evidencia: "a laje esta pronta", termo_busca: "esta", conflito: "", sugestao_correcao: "Trocar \"esta\" por \"está\".", descricao: "" };
  assert.equal(trocaDoAchado(acento), null);
});

test("palavra com letra trocada também entra", () => {
  const p = { ...base, tipo: "Erro de grafia", evidencia: "projeto estrututal da laje", termo_busca: "estrututal", conflito: "", descricao: "", sugestao_correcao: "Corrigir \"estrututal\" para \"estrutural\"." };
  assert.deepEqual(trocaDoAchado(p), { errado: "estrututal", certo: "estrutural", sigla: false });
});

test("achado que não é de texto passa intacto", () => {
  const tecnico = { ...base, tipo: "Divergência de cota", categoria: "Técnico" };
  const { achados } = estenderGrafiaRepetida([tecnico], () => paginas);
  assert.equal(achados[0], tecnico);
});

console.log(`\n${passed} teste(s) da grafia repetida OK.`);
