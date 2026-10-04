// Roda UMA auditoria pelo servidor de desenvolvimento, como a tela faria, e
// imprime as etapas com o tempo de cada uma.
//
//   node scripts/roda-auditoria.mjs <arquivo.pdf> <codigo-do-projeto> [deep|standard]
//
// Exige `NEXODOC_DEV_AUTH=true` no servidor. O desenho e a IA (real ou
// simulada) são os do servidor: `NEXODOC_AUDIT_DESENHO` e `NEXODOC_IA_SIMULADA`
// no `.env.local` dele.
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { chromium } from "playwright";
import nextEnv from "@next/env";

import { entrarComo } from "./lib/atores-de-teste.mjs";

nextEnv.loadEnvConfig(process.cwd());
const { getPrisma } = await import("../lib/db.ts");

const [caminho, codigo, nivel = "deep"] = process.argv.slice(2);
if (!caminho || !codigo) {
  console.error("Uso: node scripts/roda-auditoria.mjs <arquivo.pdf> <codigo-do-projeto> [deep|standard]");
  process.exit(1);
}
const BASE = process.env.SHOT_BASE ?? "http://localhost:3400";

const prisma = getPrisma();
const projeto = await prisma.project.findFirst({ where: { code: codigo }, select: { id: true, name: true } });
if (!projeto) {
  console.error(`Projeto ${codigo} não existe no banco.`);
  process.exit(1);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ baseURL: BASE });
const page = await ctx.newPage();
page.setDefaultTimeout(30000);
await entrarComo(page, process.env.NEXODOC_DEV_AUTH_EMAIL);

const inicio = Date.now();
const seg = () => `${String(Math.round((Date.now() - inicio) / 1000)).padStart(4)}s`;
console.log(`${seg()}  ${basename(caminho)} → ${codigo} (${projeto.name}), ${nivel}`);

// O fluxo é lido em Node, e não pelo `page.request` — este só entrega o corpo
// no fim, e o que interessa aqui é QUANDO cada etapa terminou.
const cookie = (await ctx.cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
const form = new FormData();
form.set("message", "Auditoria profunda do memorial.");
form.set("auditMode", "memorial");
form.set("analysisLevel", nivel);
form.set("fileTypes", "memorial");
form.set("projectId", projeto.id);
form.set("stream", "1");
form.set("files", new Blob([readFileSync(caminho)], { type: "application/pdf" }), basename(caminho));

const resposta = await fetch(`${BASE}/api/audit`, { method: "POST", body: form, headers: { cookie } });
console.log(`${seg()}  HTTP ${resposta.status}`);

let final = null;
let resto = "";
const blocosVistos = new Set();
const decoder = new TextDecoder();
for await (const pedaco of resposta.body) {
  resto += decoder.decode(pedaco, { stream: true });
  const partes = resto.split("\n\n");
  resto = partes.pop();
  for (const bloco of partes) {
    const evento = bloco.match(/^event: (.+)$/m)?.[1];
    const dados = bloco.match(/^data: (.+)$/m)?.[1];
    if (!evento || !dados) continue;
    const d = JSON.parse(dados);
    if (evento !== "marco") {
      final = { evento, d };
    } else if (d.passada === "blocos") {
      for (const b of d.blocos ?? []) {
        if (b.estado === "feito" && !blocosVistos.has(b.n)) {
          blocosVistos.add(b.n);
          console.log(`${seg()}  bloco ${b.n}/${d.total} (p.${b.de}-${b.ate}) feito`);
        }
      }
      if (d.estado === "fim") console.log(`${seg()}  blocos fim — ${d.detalhe ?? ""}`);
    } else {
      console.log(`${seg()}  ${d.passada} ${d.estado}${d.detalhe ? ` — ${d.detalhe}` : ""}`);
    }
  }
}
if (final?.evento === "done") {
  const r = final.d.report ?? final.d;
  console.log(`        auditoria ${final.d.auditId ?? r.auditId ?? "?"}: ${r.total_incongruencias ?? r.incongruencias?.length ?? "?"} achado(s), status ${r.status_geral ?? "?"} / ${r.status_analise ?? "?"}`);
} else {
  console.log(`        ${final?.evento ?? "sem evento final"}: ${JSON.stringify(final?.d ?? corpo.slice(0, 300)).slice(0, 400)}`);
}

await browser.close();
await prisma.$disconnect?.();
process.exit(final?.evento === "done" ? 0 : 1);
