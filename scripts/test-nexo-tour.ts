/**
 * Geometria do balão do tour: nunca fora da janela, nunca em cima do alvo.
 * Puro, node cru.
 *
 *   node scripts/test-nexo-tour.ts   (== npm run test:nexo:tour)
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  posicaoDoBalao,
  FOLGA,
  MARGEM,
  type Retangulo,
} from "../modules/nexo/lib/posicao-do-balao.ts";
import { PASSOS_DO_TOUR } from "../modules/nexo/lib/passos-do-tour.ts";
import { PASSOS_DO_TOUR_DO_RESULTADO } from "../modules/nexo/lib/passos-do-tour-do-resultado.ts";

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

const JANELA = { largura: 1440, altura: 900 };
const BALAO = { largura: 320, altura: 160 };

function sobrepoe(a: Retangulo, b: Retangulo): boolean {
  return (
    a.x < b.x + b.largura && a.x + a.largura > b.x && a.y < b.y + b.altura && a.y + a.altura > b.y
  );
}

test("abaixo do alvo, centrado nele", () => {
  const alvo = { x: 600, y: 300, largura: 200, altura: 40 };
  const pos = posicaoDoBalao(alvo, BALAO, JANELA, "abaixo");
  assert.equal(pos.lado, "abaixo");
  assert.equal(pos.y, alvo.y + alvo.altura + FOLGA);
  assert.equal(pos.x, 600 + 100 - 160);
});

test("sem espaço embaixo, vira para cima sozinho", () => {
  const alvo = { x: 600, y: 800, largura: 200, altura: 40 };
  const pos = posicaoDoBalao(alvo, BALAO, JANELA, "abaixo");
  assert.equal(pos.lado, "acima");
  assert.equal(pos.y, 800 - FOLGA - BALAO.altura);
});

test("alvo colado na borda esquerda não empurra o balão para fora", () => {
  const alvo = { x: 4, y: 300, largura: 40, altura: 40 };
  const pos = posicaoDoBalao(alvo, BALAO, JANELA, "abaixo");
  assert.ok(pos.x >= MARGEM, `x=${pos.x}`);
});

test("alvo colado na borda direita idem", () => {
  const alvo = { x: 1400, y: 300, largura: 40, altura: 40 };
  const pos = posicaoDoBalao(alvo, BALAO, JANELA, "abaixo");
  assert.ok(pos.x + BALAO.largura <= JANELA.largura - MARGEM, `x=${pos.x}`);
});

test("o balão nunca cobre o alvo", () => {
  const alvos: Retangulo[] = [
    { x: 600, y: 300, largura: 200, altura: 40 },
    { x: 4, y: 10, largura: 40, altura: 40 },
    { x: 1200, y: 820, largura: 200, altura: 60 },
    { x: 20, y: 400, largura: 300, altura: 300 },
  ];
  for (const alvo of alvos) {
    const pos = posicaoDoBalao(alvo, BALAO, JANELA, "abaixo");
    if (pos.lado === "centro") continue;
    assert.ok(
      !sobrepoe({ x: pos.x, y: pos.y, largura: BALAO.largura, altura: BALAO.altura }, alvo),
      `balão sobre o alvo em ${JSON.stringify(alvo)} (lado ${pos.lado})`,
    );
  }
});

test("alvo que ocupa a janela inteira manda o balão para o centro", () => {
  const alvo = { x: 0, y: 0, largura: 1440, altura: 900 };
  const pos = posicaoDoBalao(alvo, BALAO, JANELA, "abaixo");
  assert.equal(pos.lado, "centro");
  assert.equal(pos.x, (1440 - 320) / 2);
});

test("janela estreita (celular) ainda devolve posição dentro da tela", () => {
  const janela = { largura: 390, altura: 780 };
  const balao = { largura: 300, altura: 150 };
  const pos = posicaoDoBalao({ x: 20, y: 60, largura: 350, altura: 44 }, balao, janela, "abaixo");
  assert.ok(pos.x >= 0 && pos.x + balao.largura <= janela.largura, `x=${pos.x}`);
  assert.ok(pos.y >= 0 && pos.y + balao.altura <= janela.altura, `y=${pos.y}`);
});

// --- O roteiro -------------------------------------------------------------

const ROTEIROS = { nexo: PASSOS_DO_TOUR, resultado: PASSOS_DO_TOUR_DO_RESULTADO };
const TODOS_OS_PASSOS = [...PASSOS_DO_TOUR, ...PASSOS_DO_TOUR_DO_RESULTADO];

test("todo passo tem título e corpo", () => {
  for (const passo of TODOS_OS_PASSOS) {
    assert.ok(passo.titulo.length > 0, `${passo.id} sem título`);
    assert.ok(passo.corpo.length > 0, `${passo.id} sem corpo`);
  }
});

test("os ids não se repetem dentro de um roteiro", () => {
  for (const [nome, passos] of Object.entries(ROTEIROS)) {
    const ids = passos.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length, nome);
  }
});

// O tour é o primeiro contato de quem nunca abriu o produto: o texto não pode
// falar a língua de quem já conhece a casa.
test("nenhum passo usa emoji (DESIGN.md §11)", () => {
  for (const passo of TODOS_OS_PASSOS) {
    const texto = `${passo.titulo} ${passo.corpo}`;
    assert.ok(!/\p{Extended_Pictographic}/u.test(texto), `${passo.id} tem emoji`);
  }
});

test("cobre os dois carros-chefe: montagem e auditoria", () => {
  const ids = PASSOS_DO_TOUR.map((p) => p.id).join(" ");
  assert.ok(/volume|selo|mapa/.test(ids), "faltou a montagem");
  assert.ok(/auditoria|veredito|documento/.test(ids), "faltou a auditoria");
});

// Um passo que aponta para um elemento que não existe mais é um balão no
// centro falando de algo invisível (07/10/2026: `abrir-parecer` só vivia no
// AuditCanvas, que nenhuma tela monta). Todo alvo tem de estar no código vivo.
test("todo alvo existe numa tela viva", () => {
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const fontes: string[] = [];
  const andar = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) andar(f);
      else if (f.endsWith(".tsx") && !f.endsWith("AuditCanvas.tsx")) fontes.push(fs.readFileSync(f, "utf8"));
    }
  };
  andar(path.join(raiz, "modules/nexo/components"));
  andar(path.join(raiz, "components/telas"));
  andar(path.join(raiz, "components/achado"));
  const todo = fontes.join("\n");
  // As leituras do trilho nascem de um molde (`vista-${n.id}`): vale o molde E o id na lista.
  const daLeitura = (nome: string) => nome.startsWith("vista-") && todo.includes("`vista-${n.id}`") && todo.includes(`id: "${nome.slice(6)}"`);
  for (const passo of TODOS_OS_PASSOS) {
    for (const seletor of [passo.alvo, passo.clicarAntes, passo.soSeExistir, passo.revelar]) {
      const nome = seletor && /data-tour="([^"]+)"/.exec(seletor)?.[1];
      if (nome) assert.ok(todo.includes(`data-tour="${nome}"`) || todo.includes(`"${nome}"`) || daLeitura(nome), `${passo.id}: alvo ${nome} não existe`);
    }
  }
});

// O tutorial do resultado roda sobre um parecer DE VERDADE: ele só troca de
// leitura. Um clique de passo num botão que grava (encerrar, atribuir, votar)
// mexeria no trabalho da pessoa sem ela pedir.
test("o tutorial do resultado só clica para trocar de leitura", () => {
  for (const passo of PASSOS_DO_TOUR_DO_RESULTADO) {
    if (!passo.clicarAntes) continue;
    assert.match(passo.clicarAntes, /data-tour="(vista-[a-z]+|chip-no-documento)"/, `${passo.id} clica em ${passo.clicarAntes}`);
  }
});

test("o tutorial do resultado passa por cada botão de encerrar", () => {
  const encerrar = PASSOS_DO_TOUR_DO_RESULTADO.find((p) => p.id === "encerrar");
  assert.ok(encerrar, "faltou o passo de encerrar");
  for (const rotulo of ["Marcar corrigido", "Decisão técnica", "Falso positivo"]) assert.ok(encerrar.corpo.includes(rotulo), rotulo);
});

console.log(`\n${passed} testes ok`);
