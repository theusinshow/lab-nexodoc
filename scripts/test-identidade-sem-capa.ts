/**
 * O MEMORIAL SEM CAPA (09/10/2026): a escada de fontes, a regra de gravação
 * da identidade do projeto e a conferência retroativa. Os valores são os do
 * 040-26 — a disciplina (`040_26_est_md_a.pdf`) traz no rodapé a obra e o
 * código do 125-23; a capa do geral traz a obra certa.
 *
 *   node scripts/test-identidade-sem-capa.ts   (== npm run test:identidade-sem-capa)
 */
import assert from "node:assert/strict";

import { escadaDaIdentidade, sinalDeCodigoDoCorpo } from "../lib/escada-da-identidade.ts";
import {
  aplicarGravacao,
  conferirAuditoria,
  gravarIdentidade,
  lerIdentidadeDoProjeto,
  type CampoGuardado,
} from "../lib/identidade-do-projeto.ts";
import { aplicarEscadaAoDossie } from "../modules/nexo/lib/dossie-com-projeto.ts";

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

const EM = "2026-10-09T12:00:00.000Z";
const CAPA_040 = "REVITALIZAÇÃO DA FEIRA MUNICIPAL DE CHAPECÓ";
const CORPO_040 = "Feira Comercial de Chapecó";
const g = (valor: string, origem: CampoGuardado["origem"], fonte = "x"): CampoGuardado => ({ valor, origem, fonte, em: EM });
const vazia = () => lerIdentidadeDoProjeto(null);

// --- gravação no projeto ---------------------------------------------------

test("JSON ausente ou torto vira identidade vazia", () => {
  assert.deepEqual(vazia(), { campos: {}, divergencias: [], conferencias: {} });
  assert.deepEqual(lerIdentidadeDoProjeto({ campos: { obra: { valor: 1 } } }).campos, {});
});

test("capa sobrescreve o que o usuário digitou e registra a divergência", () => {
  const antes = gravarIdentidade(vazia(), "obra", g(CORPO_040, "usuario")).identidade;
  const r = gravarIdentidade(antes, "obra", g(CAPA_040, "capa", "040_26_md_geral_a.pdf p.1"));
  assert.equal(r.identidade.campos.obra?.valor, CAPA_040);
  assert.equal(r.divergencia?.anterior.valor, CORPO_040);
  assert.equal(r.identidade.divergencias.length, 1);
});

test("capa igual por tokens (sigla × extenso) não é divergência", () => {
  const antes = gravarIdentidade(vazia(), "obra", g("UBS Vila Manaus", "usuario")).identidade;
  assert.equal(gravarIdentidade(antes, "obra", g("UNIDADE BÁSICA DE SAÚDE VILA MANAUS", "capa")).divergencia, undefined);
});

test("usuário não sobrescreve capa; selo não sobrescreve usuário", () => {
  const capa = gravarIdentidade(vazia(), "obra", g(CAPA_040, "capa")).identidade;
  assert.equal(gravarIdentidade(capa, "obra", g("Outra", "usuario")).mudou, false);
  const u = gravarIdentidade(vazia(), "municipio", g("Chapecó", "usuario")).identidade;
  assert.equal(gravarIdentidade(u, "municipio", g("Xanxerê", "selo")).mudou, false);
});

test("aplicarGravacao: vazio não grava; só capa devolve a obra da capa", () => {
  const r = aplicarGravacao(vazia(), { origem: "capa", fonte: "p.1", em: EM, campos: { obra: CAPA_040, municipio: " " } });
  assert.equal(r.obraDaCapa, CAPA_040);
  assert.equal(r.identidade.campos.municipio, undefined);
  assert.equal(aplicarGravacao(vazia(), { origem: "usuario", fonte: "ficha", em: EM, campos: { obra: "X" } }).obraDaCapa, null);
});

test("conferência retroativa do 040-26 diverge; mesma obra em outra caixa confere", () => {
  assert.equal(conferirAuditoria(CORPO_040, CAPA_040, EM).estado, "diverge");
  assert.equal(conferirAuditoria("Revitalização da Feira Municipal de Chapeco", CAPA_040, EM).estado, "confere");
});

// --- escada ----------------------------------------------------------------

const projeto040 = lerIdentidadeDoProjeto({
  campos: {
    obra: { valor: CAPA_040, origem: "capa", fonte: "040_26_md_geral_a.pdf p.1", em: EM },
    municipio: { valor: "Chapecó", origem: "capa", fonte: "040_26_md_geral_a.pdf p.1", em: EM },
  },
});

test("sem capa e projeto conhecido: o projeto vence o corpo; código do arquivo", () => {
  const e = escadaDaIdentidade({ codigoDoArquivo: "040-26", capa: null, projeto: projeto040, corpo: { obra: CORPO_040, codigo: "125-23" } });
  assert.deepEqual(e.obra, { valor: CAPA_040, origem: "projeto", fonte: "040_26_md_geral_a.pdf p.1" });
  assert.deepEqual(e.codigo, { valor: "040-26", origem: "arquivo" });
  assert.equal(e.orgao, null);
});

test("sem capa e sem projeto: corpo é sugestão; código do corpo nunca é código", () => {
  const e = escadaDaIdentidade({ capa: null, projeto: null, corpo: { obra: CORPO_040, codigo: "125-23" } });
  assert.equal(e.obra?.origem, "corpo");
  assert.equal(e.codigo, null);
});

test("sinal do código do corpo", () => {
  assert.equal(sinalDeCodigoDoCorpo("040-26", "125-23"), "código do corpo (125-23) diverge do nome do arquivo (040-26)");
  assert.equal(sinalDeCodigoDoCorpo("040-26", "040_26"), null);
});

// --- dossiê ----------------------------------------------------------------

const base = { disciplinas: [], volumes: [], semVolume: [], arquivos: [] };

test("dossiê sem capa herda do projeto e marca a origem", () => {
  const d = aplicarEscadaAoDossie({ ...base, obra: CORPO_040, codigo: "040-26" }, projeto040);
  assert.equal(d.obra, CAPA_040);
  assert.equal(d.origens?.obra?.origem, "projeto");
  assert.equal(d.origens?.codigo?.origem, "arquivo");
});

test("dossiê com capa mantém o valor dele (caixa de título) com origem capa", () => {
  const capa = { orgao: "PREFEITURA MUNICIPAL DE CHAPECÓ", secretaria: "", municipio: "CHAPECÓ", obra: CAPA_040, bairro: "", mesAno: "JUNHO/2024", codigo: "040-26" };
  const d = aplicarEscadaAoDossie({ ...base, capa, obra: CAPA_040, municipio: "Chapecó", codigo: "040-26" }, null);
  assert.equal(d.municipio, "Chapecó");
  assert.equal(d.origens?.municipio?.origem, "capa");
});

console.log(`\n${passed} ok`);
