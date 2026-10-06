/**
 * O que cada tomo mostra no canvas. Núcleo PURO → node cru:
 *
 *   node scripts/test-nexo-trilho-do-tomo.ts   (== npm run test:nexo:trilho-do-tomo)
 */
import assert from "node:assert/strict";

import { trilhoDoTomo } from "../modules/nexo/lib/trilho-do-tomo.ts";

let passed = 0;
function test(nome: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${nome}`);
  } catch (err) {
    console.error(`FALHOU  ${nome}`);
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

const MB = 1024 * 1024;
const base = { folhas: 12, temMontador: true, bloqueio: null, erro: null, trava: null, liberacao: { liberado: true, motivo: null } };
const montado = (bytes: number | null, url: string | null = "blob:1") => ({
  id: "volume:x:t02", tomo: 2, nome: "v.pdf", url, bytes, acimaDoTeto: bytes !== null && bytes > 20 * MB, veredito: "ok" as const, pontos: 0,
});

test("sem montador (sem capa/LD): incompleto e o porquê", () => {
  const t = trilhoDoTomo({ ...base, temMontador: false });
  assert.equal(t.estado, "incompleto");
  assert.equal(t.acao.habilitada, false);
  assert.equal(t.acao.motivo, "Gere a capa e a LD primeiro.");
});

test("sem capa/LD e com plano no chat: a ação é GERAR, ligada", () => {
  const t = trilhoDoTomo({ ...base, temMontador: false, gerador: { bloqueio: null, gerando: false } });
  assert.equal(t.estado, "incompleto");
  assert.deepEqual(t.acao, { tipo: "gerar", habilitada: true, motivo: null });
});

test("gerar travado pelo plano diz o porquê", () => {
  const t = trilhoDoTomo({ ...base, temMontador: false, gerador: { bloqueio: "Escolha a prefeitura no plano do chat.", gerando: false } });
  assert.deepEqual(t.acao, { tipo: "gerar", habilitada: false, motivo: "Escolha a prefeitura no plano do chat." });
});

test("gerar travado: a frase do cabeçalho diz a pendência, curta", () => {
  const t = trilhoDoTomo({
    ...base,
    temMontador: false,
    gerador: { bloqueio: "Diga o número do volume — sem ele a capa sai como Vol. I, sem ninguém ter decidido.", gerando: false },
  });
  assert.equal(t.frase, "12 folhas · diga o número do volume");
});

test("gerando a capa e a LD: frase e ação desligada", () => {
  const t = trilhoDoTomo({ ...base, temMontador: false, gerador: { bloqueio: null, gerando: true } });
  assert.equal(t.frase, "gerando capa, LD e separatriz…");
  assert.equal(t.acao.habilitada, false);
});

test("bloqueio do cartão vira o motivo do botão", () => {
  const t = trilhoDoTomo({ ...base, bloqueio: "faltam as pranchas deste tomo" });
  assert.equal(t.estado, "incompleto");
  assert.equal(t.acao.motivo, "Faltam as pranchas deste tomo.");
});

test("pronto para montar: botão Montar ligado", () => {
  const t = trilhoDoTomo(base);
  assert.equal(t.estado, "pronto-para-montar");
  assert.equal(t.frase, "12 folhas · pronto para montar");
  assert.deepEqual(t.acao, { tipo: "montar", habilitada: true, motivo: null });
  assert.equal(t.baixar, null);
});

test("aba travada desliga o botão com o motivo", () => {
  const t = trilhoDoTomo({ ...base, trava: "Esta conversa mudou em outra aba." });
  assert.equal(t.acao.habilitada, false);
  assert.equal(t.acao.motivo, "Esta conversa mudou em outra aba.");
});

test("montando: frase da fase real e preenchimento parcial", () => {
  const t = trilhoDoTomo({ ...base, fase: "juntando" });
  assert.equal(t.estado, "montando");
  assert.equal(t.frase, "juntando 12 pranchas…");
  assert.ok(t.preenchimento > 0 && t.preenchimento < 1);
  assert.equal(t.acao.habilitada, false);
});

test("montado: peso, baixar ligado, remontar disponível", () => {
  const t = trilhoDoTomo({ ...base, montado: montado(4.1 * MB) });
  assert.equal(t.estado, "montado");
  assert.equal(t.frase, "4,1 MB · conferido");
  assert.equal(t.preenchimento, 1);
  assert.equal(t.acao.tipo, "remontar");
  assert.deepEqual(t.baixar, { habilitado: true, motivo: null, url: "blob:1", nome: "v.pdf" });
});

test("montado sem os editáveis: baixar travado com o motivo", () => {
  const t = trilhoDoTomo({ ...base, montado: montado(MB), liberacao: { liberado: false, motivo: "Baixe os editáveis primeiro." } });
  assert.equal(t.baixar?.habilitado, false);
  assert.equal(t.baixar?.motivo, "Baixe os editáveis primeiro.");
});

test("acima do teto: âmbar e baixar travado", () => {
  const t = trilhoDoTomo({ ...base, montado: montado(27.6 * MB) });
  assert.equal(t.estado, "acima-do-teto");
  assert.equal(t.frase, "27,6 MB · passa do teto de 20 MB");
  assert.equal(t.baixar?.habilitado, false);
});

test("PDF fora deste navegador: remontar", () => {
  const t = trilhoDoTomo({ ...base, montado: montado(MB, null) });
  assert.equal(t.estado, "fora-da-maquina");
  assert.equal(t.frase, "montado em outra máquina");
  assert.equal(t.acao.tipo, "remontar");
  assert.equal(t.baixar?.habilitado, false);
});

test("falhou: motivo e tentar de novo", () => {
  const t = trilhoDoTomo({ ...base, fase: "falhou", erro: "Erro ao montar o volume." });
  assert.equal(t.estado, "falhou");
  assert.equal(t.frase, "Erro ao montar o volume.");
  assert.deepEqual(t.acao, { tipo: "tentar-de-novo", habilitada: true, motivo: null });
});

test("montado sem as pranchas nesta sessão: Remontar desligado com o motivo", () => {
  const t = trilhoDoTomo({ ...base, montado: montado(MB), bloqueio: "sem as pranchas — reanexe-os para montar" });
  assert.equal(t.acao.tipo, "remontar");
  assert.equal(t.acao.habilitada, false);
  assert.equal(t.acao.motivo, "Sem as pranchas — reanexe-os para montar.");
});

test("remontando um tomo já montado mostra a fase, não o peso velho", () => {
  const t = trilhoDoTomo({ ...base, fase: "preparando", montado: montado(MB) });
  assert.equal(t.estado, "montando");
});

console.log(`\n${passed} teste(s) do trilho do tomo OK`);
