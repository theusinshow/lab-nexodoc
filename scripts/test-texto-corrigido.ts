/**
 * O TEXTO CORRIGIDO DO ACHADO — puro, sem token e sem rede.
 *
 *   npm run test:texto-corrigido
 *
 * Trava três coisas: quem ganha o botão (1 ou 2 citações), o que a trava
 * recusa (trecho fora da evidência, número novo sem fonte, número apagado,
 * reescrita larga) e o grifo da diferença. As evidências são as de produção,
 * no formato em que o parecer as grava.
 */
import assert from "node:assert/strict";

import {
  ampliarContexto,
  diferencaPorPalavra,
  extrairCitacoes,
  julgarProposta,
  podeGerarTextoCorrigido,
  textoAindaVale,
  VERSAO_DO_TEXTO_CORRIGIDO,
  type PropostaDaIa,
} from "../lib/texto-corrigido.ts";

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

const GRADIL =
  "“GR01 - Gradil composto por postes de aço de 60x40m altura 1,58m”; “requadro em aço galvanizado de 60x40mm”";
const PREVALENCIA =
  'Pág. 17: "Em caso de divergência entre as especificações e os projetos, sempre prevalecerão os projetos." | Pág. 21: "As especificações técnicas e normas de execução citadas neste memorial prevalecerão sobre todos os projetos."';

function proposta(parcial: Partial<PropostaDaIa>): PropostaDaIa {
  return { pode_trocar: true, procure_por: "", substitua_por: "", motivo: "", ...parcial };
}

// ── quem se qualifica ──────────────────────────────────────────────────────

test("extrai citacoes com aspas curvas e retas, na ordem", () => {
  assert.deepEqual(extrairCitacoes(GRADIL), [
    "GR01 - Gradil composto por postes de aço de 60x40m altura 1,58m",
    "requadro em aço galvanizado de 60x40mm",
  ]);
  assert.equal(extrairCitacoes(PREVALENCIA).length, 2);
});

test("aspa solta de polegada nao vira citacao", () => {
  assert.deepEqual(extrairCitacoes('tubo de 1" e 2" de diametro'), []);
});

test("1 e 2 citacoes ganham o botao; 0 e 3+ nao", () => {
  assert.equal(podeGerarTextoCorrigido({ evidencia: "“área de 250,00 m”" }), true);
  assert.equal(podeGerarTextoCorrigido({ evidencia: GRADIL }), true);
  assert.equal(podeGerarTextoCorrigido({ evidencia: "6.3.7.2.3 Slalon (p. 65) | 6.3.7.2.4 Slalon (p. 65)" }), false);
  assert.equal(podeGerarTextoCorrigido({ evidencia: "“aaa” “bbb” “ccc”" }), false);
  assert.equal(podeGerarTextoCorrigido({ evidencia: "" }), false);
  assert.equal(podeGerarTextoCorrigido({}), false);
});

// ── a trava ────────────────────────────────────────────────────────────────

test("aceita a troca de unidade do gradil (o caso que motivou 2 citacoes)", () => {
  const j = julgarProposta({
    evidencia: GRADIL,
    oQueFazer: "Corrigir “60x40m” para a unidade confirmada no detalhamento.",
    proposta: proposta({ procure_por: "postes de aço de 60x40m", substitua_por: "postes de aço de 60x40mm" }),
  });
  assert.deepEqual(j, {
    ok: true,
    procure_por: "por postes de aço de 60x40m",
    substitua_por: "por postes de aço de 60x40mm",
  });
});

test("espaco a mais vindo do PDF nao derruba a busca", () => {
  const j = julgarProposta({
    evidencia: "“a área total  construída\né de 250,00 m”",
    oQueFazer: "Corrigir a unidade para m².",
    proposta: proposta({ procure_por: "é de 250,00 m", substitua_por: "é de 250,00 m²" }),
  });
  assert.equal(j.ok, true);
});

test("recusa trecho que nao esta em nenhuma citacao", () => {
  const j = julgarProposta({
    evidencia: GRADIL,
    oQueFazer: "",
    proposta: proposta({ procure_por: "postes de aço de 60x40 m", substitua_por: "postes de aço de 60x40 mm" }),
  });
  assert.equal(j.ok, false);
});

test("recusa numero novo que nao vem do achado", () => {
  const j = julgarProposta({
    evidencia: GRADIL,
    oQueFazer: "Corrigir a seção.",
    proposta: proposta({ procure_por: "altura 1,58m", substitua_por: "altura 1,50m" }),
  });
  assert.equal(j.ok, false);
  assert.match((j as { motivo: string }).motivo, /1,50/);
});

test("aceita numero novo quando o O que fazer o escreve", () => {
  const j = julgarProposta({
    evidencia: GRADIL,
    oQueFazer: "A altura correta é 1,50m, conforme a prancha.",
    proposta: proposta({ procure_por: "altura 1,58m", substitua_por: "altura 1,50m" }),
  });
  assert.deepEqual(j, { ok: true, procure_por: "aço de 60x40m altura 1,58m", substitua_por: "aço de 60x40m altura 1,50m" });
});

test("valor provado so pela outra citacao nao basta para trocar numero", () => {
  const j = julgarProposta({
    evidencia: "“laje de 12 cm”; “todas as lajes do bloco têm 15 cm”",
    oQueFazer: "Uniformizar a espessura.",
    proposta: proposta({ procure_por: "laje de 12 cm", substitua_por: "laje de 15 cm" }),
  });
  assert.equal(j.ok, false, "uniformizar pode ser para 12 ou para 15: quem decide é o engenheiro");
});

test("recusa quando um numero some do trecho", () => {
  const j = julgarProposta({
    evidencia: "“porte de 0,20 a 0,40 cm”",
    oQueFazer: "",
    proposta: proposta({ procure_por: "0,20 a 0,40 cm", substitua_por: "até 0,40 m" }),
  });
  assert.equal(j.ok, false);
});

test("aceita numero novo que a outra citacao prova", () => {
  const j = julgarProposta({
    evidencia: "“laje de 12 cm”; “todas as lajes do bloco têm 15 cm”",
    oQueFazer: "Uniformizar a espessura.",
    proposta: proposta({ procure_por: "laje de 12 cm", substitua_por: "laje de 12 cm (15 cm)" }),
  });
  assert.equal(j.ok, true);
});

test("recusa texto igual e texto vazio", () => {
  assert.equal(
    julgarProposta({ evidencia: GRADIL, oQueFazer: "", proposta: proposta({ procure_por: "60x40mm", substitua_por: "60x40mm" }) }).ok,
    false,
  );
  assert.equal(
    julgarProposta({ evidencia: GRADIL, oQueFazer: "", proposta: proposta({ procure_por: "60x40mm", substitua_por: " " }) }).ok,
    false,
  );
});

test("recusa reescrita muito maior que o trecho", () => {
  const j = julgarProposta({
    evidencia: GRADIL,
    oQueFazer: "",
    proposta: proposta({ procure_por: "60x40m", substitua_por: "x".repeat(200) + " 60x40m" }),
  });
  assert.equal(j.ok, false);
});

test("sem troca devolve o motivo da IA, ou um padrao legivel", () => {
  const comMotivo = julgarProposta({
    evidencia: PREVALENCIA,
    oQueFazer: "Definir uma única ordem de prevalência.",
    proposta: proposta({ pode_trocar: false, motivo: "Depende de decidir qual cláusula vale." }),
  });
  assert.deepEqual(comMotivo, { ok: false, motivo: "Depende de decidir qual cláusula vale." });
  const semMotivo = julgarProposta({ evidencia: PREVALENCIA, oQueFazer: "", proposta: proposta({ pode_trocar: false }) });
  assert.equal(semMotivo.ok, false);
  assert.ok((semMotivo as { motivo: string }).motivo.length > 10);
});

// ── o contexto para o Ctrl+F ──────────────────────────────────────────────

test("o 60x40m sozinho ganha vizinhas ate nao casar mais dentro do 60x40mm (INC-003 real)", () => {
  const j = julgarProposta({
    evidencia: GRADIL,
    oQueFazer: "Substituir «60x40m» por «60x40mm» no GR01.",
    proposta: proposta({ procure_por: "60x40m", substitua_por: "60x40mm" }),
  });
  assert.equal(j.ok, true);
  const { procure_por, substitua_por } = j as { procure_por: string; substitua_por: string };
  assert.ok(procure_por.length >= 25, procure_por);
  assert.ok(!"requadro em aço galvanizado de 60x40mm".includes(procure_por));
  assert.equal(procure_por.replace("60x40m", "60x40mm"), substitua_por);
  assert.ok(GRADIL.includes(procure_por));
});

test("palavra cortada ao meio vira palavra inteira, e citacao curta fica inteira", () => {
  assert.deepEqual(ampliarContexto("área de 250,00 m", "0 m", "0 m²"), {
    procure_por: "área de 250,00 m",
    substitua_por: "área de 250,00 m²",
  });
});

test("trecho ja longo nao cresce", () => {
  const longo = "a área total construída é de 250,00 m";
  assert.deepEqual(ampliarContexto(`Resumo: ${longo} conforme quadro`, longo, `${longo}²`), {
    procure_por: longo,
    substitua_por: `${longo}²`,
  });
});

// ── a versao ───────────────────────────────────────────────────────────────

test("texto gravado sem versao ou com versao velha nao vale; o atual vale", () => {
  const base = { tipo: "sem-troca" as const, motivo: "x", modelo: "m", geradoEm: "2026-09-29" };
  assert.equal(textoAindaVale(undefined), false);
  assert.equal(textoAindaVale(base), false);
  assert.equal(textoAindaVale({ ...base, versao: VERSAO_DO_TEXTO_CORRIGIDO - 1 }), false);
  assert.equal(textoAindaVale({ ...base, versao: VERSAO_DO_TEXTO_CORRIGIDO }), true);
});

// ── o grifo ────────────────────────────────────────────────────────────────

test("grifa so a palavra que mudou, dos dois lados", () => {
  const d = diferencaPorPalavra("postes de aço de 60x40m altura", "postes de aço de 60x40mm altura");
  assert.deepEqual(d.antes.filter((t) => t.mudou).map((t) => t.texto), ["60x40m"]);
  assert.deepEqual(d.depois.filter((t) => t.mudou).map((t) => t.texto), ["60x40mm"]);
  assert.equal(d.depois.map((t) => t.texto).join(""), "postes de aço de 60x40mm altura");
  assert.equal(d.antes.map((t) => t.texto).join(""), "postes de aço de 60x40m altura");
});

test("palavras vizinhas mudadas viram um grifo so, sem engolir o espaco do fim", () => {
  const d = diferencaPorPalavra("a obra do ginasio fica", "a obra do Ginásio Municipal fica");
  assert.deepEqual(d.depois.filter((t) => t.mudou).map((t) => t.texto), ["Ginásio Municipal"]);
  assert.equal(d.depois.map((t) => t.texto).join(""), "a obra do Ginásio Municipal fica");
});

console.log(`\n${passed} teste(s) OK`);
