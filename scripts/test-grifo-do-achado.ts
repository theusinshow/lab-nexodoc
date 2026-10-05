/**
 * O que o visor procura para grifar. Núcleo PURO → node cru.
 *
 *   node scripts/test-grifo-do-achado.ts   (== npm run test:grifo-do-achado)
 *
 * A medida contra os PDFs reais está em `npm run mede:grifo` (117-25 + 113-22):
 * 1ª página citada 105 → 120 de 125; páginas citadas com grifo 163 → 209 de 233.
 */
import assert from "node:assert/strict";

import { candidatosDoGrifo, porQueSemGrifo } from "../lib/grifo-do-achado.ts";

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

const CONFRONTO = {
  termo_busca: "responsabilidade da Prefeitura",
  evidencia: 'Pág. 10: "os serviços de terraplenagem são de responsabilidade da Prefeitura" | Pág. 22: "A contratada deverá executar todo movimento de terra"',
};

test("na p. 22 de um confronto, o primeiro candidato é o trecho DA p. 22", () => {
  assert.equal(candidatosDoGrifo(CONFRONTO, 22)[0], "A contratada deverá executar todo movimento de terra");
});

test("e o trecho da p. 10 NÃO entra na p. 22 — seria marca no lugar errado", () => {
  assert.ok(!candidatosDoGrifo(CONFRONTO, 22).some((c) => c.includes("de responsabilidade da Prefeitura") && c.startsWith("os serviços")));
});

test("a moldura 'Pág. N:' nunca vai para a agulha", () => {
  for (const c of candidatosDoGrifo(CONFRONTO, null)) assert.ok(!/^P[áa]g\./i.test(c), c);
});

test("o termo de busca vem antes da evidência", () => {
  const c = candidatosDoGrifo({ termo_busca: "NBR 9050", evidencia: "conforme a NBR 9050 de 2004 vigente" }, 3);
  assert.equal(c[0], "NBR 9050");
});

test("citações da IA juntas com '/' viram um candidato cada", () => {
  const c = candidatosDoGrifo({ evidencia: "“Não há instalação de água quente.” / “a sala de utilidades deverá dispor de instalação de água quente”" }, 87);
  assert.ok(c.includes("Não há instalação de água quente."));
  assert.ok(c.includes("a sala de utilidades deverá dispor de instalação de água quente"));
});

test("evidência costurada com '…' também se parte nos pedaços", () => {
  const c = candidatosDoGrifo({ evidencia: "o piso será cerâmico … rodapé em granito polido" }, 1);
  assert.ok(c.includes("rodapé em granito polido"));
});

test("pedaço de uma palavra curta não vira agulha (marcaria a folha toda)", () => {
  assert.ok(!candidatosDoGrifo({ evidencia: "“CEI” / “NR 18 de 04/07/95”" }, 1).includes("CEI"));
});

test("sem nada para procurar, a lista é vazia", () => {
  assert.deepEqual(candidatosDoGrifo({}, 1), []);
});

test("sem grifo numa folha de quadro em imagem, o visor diz que o trecho está na imagem", () => {
  const folhas = { paginas_por_visao: [3], quadros_por_visao: [12], imagens_nao_lidas: [40] };
  assert.match(porQueSemGrifo(12, folhas), /quadro em imagem/);
  assert.match(porQueSemGrifo(3, folhas), /lida por visão/);
  assert.match(porQueSemGrifo(40, folhas), /imagem que não foi lida/);
  assert.match(porQueSemGrifo(7, folhas), /não foi encontrado/);
  assert.match(porQueSemGrifo(12, undefined), /não foi encontrado/);
});

console.log(`${passed} teste(s) OK`);
