/**
 * O BLOCO TEM DOIS TÍTULOS, E ELES NÃO SÃO O MESMO TEXTO.
 *
 * Medido em 20/08/2026 no volume 10 de 040-26: as separatrizes saíam com o
 * RÓTULO DE TELA, e o escritório imprime o nome de documento.
 *
 *   disciplina | Nexo                       | escritório
 *   -----------|----------------------------|-------------------------------------------
 *   his        | HIDROSSANITÁRIO            | PROJETO DE INSTALAÇÕES HIDROSSANITÁRIAS
 *   inc        | PREVENTIVO CONTRA INCÊNDIO | PROJETO PREVENTIVO CONTRA INCÊNDIO
 *   spd        | SPDA                       | PROJETO DE SISTEMA DE PROTEÇÃO CONTRA D.A.
 *
 * A causa era uma variável só (`titulo`, em `ConfirmationCard`) alimentando
 * `postSeparatriz` E `postLd`. Os dois documentos pedem nomes diferentes da
 * mesma disciplina — a LD leva o nome da capa, a separatriz leva o longo.
 *
 * E há uma restrição que o comentário do componente já registrava: no volume de
 * disciplina única o que o engenheiro decidiu não pode ser reescrito. Por isso a
 * regra não é "o léxico sempre vence": é o léxico vencendo o PADRÃO DERIVADO, e
 * perdendo para a DECISÃO. Distinguir uma coisa da outra é o miolo deste módulo.
 *
 *   node --import ./scripts/lib/resolver-de-imports.mjs scripts/test-titulos-do-bloco.ts
 *   (== npm run test:titulos-do-bloco)
 */
import assert from "node:assert/strict";

import { nomesDoBloco, titulosDoBloco } from "../server/nexo/titulos-do-bloco.ts";

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

test("cada disciplina sai com os dois nomes do escritório", () => {
  assert.deepEqual(titulosDoBloco({ codigo: "his", rotulo: "Hidrossanitário" }), {
    ld: "PROJETO HIDROSSANITÁRIO",
    separatriz: "PROJETO DE INSTALAÇÕES HIDROSSANITÁRIAS",
  });
  assert.deepEqual(titulosDoBloco({ codigo: "inc", rotulo: "Preventivo contra incêndio" }), {
    ld: "PROJETO PREVENTIVO",
    separatriz: "PROJETO PREVENTIVO CONTRA INCÊNDIO",
  });
  assert.deepEqual(titulosDoBloco({ codigo: "spd", rotulo: "SPDA" }), {
    ld: "PROJETO SPDA",
    separatriz: "PROJETO DE SISTEMA DE PROTEÇÃO CONTRA DESCARGAS ATMOSFÉRICAS",
  });
});

/*
 * A DECISÃO DO ENGENHEIRO VIAJA PARA OS DOIS. Se ele digitou um título, os dois
 * documentos daquele bloco falam a língua dele — é o que o componente já
 * prometia ("mudar isso reescreveria a capa de volumes que já saíram certos").
 */
test("título digitado vence o léxico nos dois documentos", () => {
  assert.deepEqual(
    titulosDoBloco({ codigo: "his", rotulo: "Hidrossanitário", escolhido: "PROJETO DE ÁGUAS PLUVIAIS" }),
    { ld: "PROJETO DE ÁGUAS PLUVIAIS", separatriz: "PROJETO DE ÁGUAS PLUVIAIS" },
  );
});

/*
 * O PADRÃO DERIVADO NÃO É DECISÃO. O caminho de disciplina única alimenta este
 * campo com o título da LD, que na maioria das vezes é o próprio nome de capa
 * vindo do léxico. Tratar isso como escolha faria a separatriz herdar o nome da
 * LD — que é exatamente o defeito, um andar acima.
 */
test("o nome de capa chegando como escolhido não conta como decisão", () => {
  assert.deepEqual(
    titulosDoBloco({ codigo: "his", rotulo: "Hidrossanitário", escolhido: "PROJETO HIDROSSANITÁRIO" }),
    { ld: "PROJETO HIDROSSANITÁRIO", separatriz: "PROJETO DE INSTALAÇÕES HIDROSSANITÁRIAS" },
  );
});

test("espaço e caixa não transformam o padrão em decisão", () => {
  assert.equal(
    titulosDoBloco({ codigo: "spd", rotulo: "SPDA", escolhido: "  projeto spda  " }).separatriz,
    "PROJETO DE SISTEMA DE PROTEÇÃO CONTRA DESCARGAS ATMOSFÉRICAS",
  );
});

/*
 * DISCIPLINA FORA DO LÉXICO cai no rótulo, em caixa alta — o comportamento de
 * antes. Um código desconhecido não pode zerar o título e deixar a separatriz
 * sem nada, que é o caso em que ela nem é gerada.
 */
test("disciplina fora do léxico usa o rótulo em caixa alta", () => {
  assert.deepEqual(titulosDoBloco({ codigo: "zzz", rotulo: "Coisa nova" }), {
    ld: "COISA NOVA",
    separatriz: "COISA NOVA",
  });
});

test("sem código e sem rótulo, o escolhido é o que sobra", () => {
  assert.deepEqual(titulosDoBloco({ codigo: "", rotulo: "", escolhido: "PROJETO X" }), {
    ld: "PROJETO X",
    separatriz: "PROJETO X",
  });
});

test("sem nada, devolve vazio em vez de inventar", () => {
  assert.deepEqual(titulosDoBloco({ codigo: "", rotulo: "" }), { ld: "", separatriz: "" });
});

/* ───────────────────── juntar blocos (09/10/2026) ───────────────────── */

test("par com nome próprio: o mesmo título na LD e na separatriz", () => {
  assert.deepEqual(nomesDoBloco({ codigo: "gmt", codigos: ["gmt", "ter"], rotulo: "Geométrico e Terraplenagem" }), {
    capa: "PROJETO DE GEOMETRIA E TERRAPLENAGEM",
    separatriz: "PROJETO DE GEOMETRIA E TERRAPLENAGEM",
  });
  // a ordem do par não importa
  assert.equal(
    nomesDoBloco({ codigo: "ter", codigos: ["ter", "gmt"], rotulo: "" }).separatriz,
    "PROJETO DE GEOMETRIA E TERRAPLENAGEM",
  );
});

test("par sem nome: o primeiro inteiro, o segundo sem o 'PROJETO DE' repetido", () => {
  const n = nomesDoBloco({ codigo: "his", codigos: ["his", "inc"], rotulo: "Hidrossanitário e Incêndio" });
  assert.equal(n.separatriz, "PROJETO DE INSTALAÇÕES HIDROSSANITÁRIAS E PREVENTIVO CONTRA INCÊNDIO");
  assert.equal(n.capa, "PROJETO HIDROSSANITÁRIO E PREVENTIVO");
});

test("bloco normal: igual a hoje, com ou sem codigos", () => {
  assert.deepEqual(
    titulosDoBloco({ codigo: "his", rotulo: "Hidrossanitário" }),
    titulosDoBloco({ codigo: "his", codigos: ["his"], rotulo: "Hidrossanitário" }),
  );
});

test("titulosDoBloco de um par usa o nome do par", () => {
  assert.deepEqual(titulosDoBloco({ codigo: "gmt", codigos: ["gmt", "ter"], rotulo: "Geométrico e Terraplenagem" }), {
    ld: "PROJETO DE GEOMETRIA E TERRAPLENAGEM",
    separatriz: "PROJETO DE GEOMETRIA E TERRAPLENAGEM",
  });
});

console.log(`\n${passed} teste(s) passaram.`);
