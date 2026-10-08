/**
 * A AJUDA SÓ CITA O QUE EXISTE (auditoria UX do memorial, 07/10/2026).
 *
 * A Ajuda mandava procurar "Exportar", "Copiar achados", "Baixar .md" e a aba
 * "Tratamento" — todos de `components/audit-result.tsx`, que nenhuma tela
 * monta mais — e dizia que "C confirma" quando C marca o achado como
 * corrigido. Ajuda que descreve um botão que não existe é pior que nenhuma:
 * quem procura ajuda é quem já está perdido.
 *
 * Cada passo de cada caminho tem de aparecer, escrito, no código de uma tela
 * viva. Os LUGARES (Painel, Resultado, Achado…) são nomes de região, não
 * rótulos, e ficam numa lista própria.
 *
 * Roda no node cru: `node scripts/test-ajuda-rotulos.ts`.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LUGARES, TAREFAS } from "../components/telas/ajuda/dados.ts";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** Telas que nenhuma rota monta: um rótulo que só existe nelas não existe. */
const ORFAOS = new Set(["audit-result.tsx", "AuditCanvas.tsx"]);
const fontes: string[] = [];
function andar(dir: string) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "ajuda") andar(f);
    } else if (/\.(tsx|ts)$/.test(f) && !ORFAOS.has(e.name)) fontes.push(fs.readFileSync(f, "utf8"));
  }
}
for (const d of ["components/telas", "components/moldura", "modules/nexo", "app/nexo"]) andar(path.join(raiz, d));
const codigo = fontes.join("\n");

/** Regiões da tela e gestos — não são rótulos escritos. */
const REGIOES = new Set([
  "Painel",
  "Nexo",
  "Conversa",
  "conversa",
  "Resultado",
  "Achado",
  "folha",
  "arrastar a folha",
  "“divide em 2 tomos”",
]);

let passed = 0;
const falhas: string[] = [];
for (const t of TAREFAS) {
  for (const passo of t.passos) {
    for (const rotulo of passo.caminho ?? []) {
      if (!REGIOES.has(rotulo) && !codigo.includes(rotulo)) falhas.push(`tarefa ${t.id}: "${rotulo}"`);
    }
  }
}
for (const l of LUGARES) {
  for (const rotulo of l.caminho) {
    if (!REGIOES.has(rotulo) && !codigo.includes(rotulo)) falhas.push(`lugar ${l.id}: "${rotulo}"`);
  }
}
assert.deepEqual(falhas, [], `a Ajuda cita rótulos que nenhuma tela tem:\n${falhas.join("\n")}`);
passed++;

// Os botões do parecer antigo não podem voltar ao texto por outro caminho.
const texto = JSON.stringify({ TAREFAS, LUGARES });
for (const morto of ["Copiar achados", "Copiar ações", "Baixar .md", "Exportar", "C confirma"]) {
  assert.ok(!texto.includes(morto), `a Ajuda ainda cita "${morto}"`);
}
passed++;

console.log(`${passed} testes ok`);
