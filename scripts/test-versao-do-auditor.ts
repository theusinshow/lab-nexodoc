/**
 * A VERSÃO DO AUDITOR é derivada, não digitada.
 *
 * Era `VERSAO_AUDITOR = 1`, uma constante que alguém precisava lembrar de subir
 * ao mexer no prompt ou no modelo. Em 17/08/2026 o modelo dos blocos mudou de
 * `sol` para `terra` e o agrupamento de 28k para 10k sem ninguém subir nada —
 * achado herdado seria de um auditor que não existe mais.
 *
 *   node scripts/test-versao-do-auditor.ts   (== npm run test:versao-auditor)
 */
import assert from "node:assert/strict";

import { versaoDoAuditor, type ConfiguracaoDoAuditor } from "../lib/versao-do-auditor.ts";
import {
  configuracaoDoAuditor,
  versaoDoAuditorDaCorrida,
} from "../lib/configuracao-do-auditor.ts";

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

const BASE: ConfiguracaoDoAuditor = {
  prompt: "Você audita memoriais descritivos. Peque pelo excesso.",
  promptsDaLeitura: "Faça uma leitura global. Teto de 60 achados. {{documento}}",
  modeloGlobal: "gpt-5.6-sol",
  modeloBloco: "gpt-5.6-terra",
  modeloValidacao: "gpt-5.6-sol",
  esforco: "medium",
  tamanhoDoBloco: 10000,
  blocosPorArquivo: null,
  tetoDeSaida: null,
};

test("mesma configuração, mesma versão", () => {
  assert.equal(versaoDoAuditor(BASE), versaoDoAuditor({ ...BASE }));
});

test("versão é curta e estável no formato", () => {
  const v = versaoDoAuditor(BASE);
  assert.match(v, /^[0-9a-f]{12}$/);
});

test("uma vírgula no prompt já invalida", () => {
  const outro = versaoDoAuditor({ ...BASE, prompt: `${BASE.prompt},` });
  assert.notEqual(outro, versaoDoAuditor(BASE));
});

test("trocar o modelo do BLOCO invalida — o caso de 17/08", () => {
  const outro = versaoDoAuditor({ ...BASE, modeloBloco: "gpt-5.6-sol" });
  assert.notEqual(outro, versaoDoAuditor(BASE));
});

test("cada campo, sozinho, invalida", () => {
  const mudancas: Partial<ConfiguracaoDoAuditor>[] = [
    { modeloGlobal: "x" },
    { modeloValidacao: "x" },
    { esforco: "high" },
    { tamanhoDoBloco: 28000 },
    // Os dois que entraram quando os limites viraram campo do painel. Sem eles
    // no hash, afunilar a cobertura numa tarde deixaria o reuso servindo
    // pareceres produzidos sob outro regime.
    { blocosPorArquivo: 8 },
    { tetoDeSaida: 16000 },
    // O pedido de verdade mora nos prompts da leitura, não no de sistema: até
    // 26/09 ele mudava sem invalidar o reuso.
    { promptsDaLeitura: "Faça uma leitura global. Teto de 80 achados. {{documento}}" },
  ];
  for (const m of mudancas) {
    assert.notEqual(
      versaoDoAuditor({ ...BASE, ...m }),
      versaoDoAuditor(BASE),
      `mudar ${Object.keys(m)[0]} deveria mudar a versão`,
    );
  }
});

test("a ordem dos campos não muda a versão", () => {
  /*
   * O hash sai de uma serialização com chaves ORDENADAS — senão a versão
   * dependeria da ordem em que o objeto foi montado, e um refactor inocente
   * invalidaria o reuso de todos os memoriais do escritório de uma vez.
   */
  const invertido: ConfiguracaoDoAuditor = {
    tetoDeSaida: BASE.tetoDeSaida,
    blocosPorArquivo: BASE.blocosPorArquivo,
    tamanhoDoBloco: BASE.tamanhoDoBloco,
    esforco: BASE.esforco,
    modeloValidacao: BASE.modeloValidacao,
    modeloBloco: BASE.modeloBloco,
    modeloGlobal: BASE.modeloGlobal,
    promptsDaLeitura: BASE.promptsDaLeitura,
    prompt: BASE.prompt,
  };
  assert.equal(versaoDoAuditor(invertido), versaoDoAuditor(BASE));
});

test("nunca colide por concatenação ambígua", () => {
  // "ab" + "c" e "a" + "bc" não podem produzir a mesma entrada de hash.
  const a = versaoDoAuditor({ ...BASE, modeloGlobal: "ab", modeloBloco: "c" });
  const b = versaoDoAuditor({ ...BASE, modeloGlobal: "a", modeloBloco: "bc" });
  assert.notEqual(a, b);
});

test("a configuração REAL carrega o pedido de verdade, e não o documento", () => {
  /*
   * Prova de ligação, não de aritmética: o hash só protege o reuso se os três
   * prompts que pedem e julgam os achados estiverem dentro dele.
   */
  const { promptsDaLeitura } = configuracaoDoAuditor("memorial", "deep");
  assert.match(promptsDaLeitura, /PEQUE PELO EXCESSO/, "leitura global");
  assert.match(promptsDaLeitura, /Leia o trecho abaixo/, "leitura por bloco");
  assert.match(promptsDaLeitura, /camada final de validação/, "validação");
  assert.match(promptsDaLeitura, /\{\{documento\}\}/, "dados entram como marcador");
});

test("a versão da corrida é estável entre chamadas", () => {
  assert.equal(
    versaoDoAuditorDaCorrida("memorial", "deep"),
    versaoDoAuditorDaCorrida("memorial", "deep"),
  );
});

console.log(`\n${passed} teste(s) de versão do auditor OK`);
