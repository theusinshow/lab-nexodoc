// AUDITORIA DO REDESENHO — captura do produto ATUAL (branch main), rota por rota.
// Para cada rota: captura de tela inteira, inventário do que a tela oferece
// (títulos, botões, links, campos, abas, tabelas, diálogos) e os erros de
// console e de rede. Uso: node scripts/auditoria/captura-atual.mjs <base> <pasta>
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3300";
const OUT = process.argv[3];
fs.mkdirSync(OUT, { recursive: true });

const ROTAS = ["/", "/nexo", "/projetos", "/achados", "/ajuda", "/audit", "/capas", "/ld", "/volumes", "/ferramentas", "/admin", "/admin/pessoas", "/admin/dados", "/admin/dinheiro", "/admin/motor", "/admin/audits", "/admin/lds", "/admin/usage", "/admin/quality", "/admin/users", "/admin/config", "/sem-acesso", "/nao-existe-404"];

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
let erros = [], rede = [];
p.on("console", (m) => m.type() === "error" && erros.push(m.text().slice(0, 200)));
p.on("pageerror", (e) => erros.push(`[pageerror] ${e.message.slice(0, 200)}`));
p.on("response", (r) => r.status() >= 400 && !r.url().includes("favicon") && rede.push(`${r.status()} ${r.request().method()} ${r.url().replace(BASE, "")}`));

// entrar como dev
await p.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(2500);
await p.screenshot({ path: `${OUT}/login.png`, fullPage: true });
const dev = p.locator('button:has-text("Entrar como dev")');
if (await dev.count()) {
  await dev.first().click();
  await p.waitForTimeout(4000);
}

const inventario = async () =>
  p.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const txt = (el) => (el.getAttribute("aria-label") || el.innerText || el.getAttribute("title") || el.getAttribute("placeholder") || "").replace(/\s+/g, " ").trim().slice(0, 70);
    const lista = (sel) => [...new Set([...document.querySelectorAll(sel)].filter(vis).map(txt).filter(Boolean))];
    return {
      titulo: document.title,
      h: lista("h1, h2, h3"),
      botoes: lista("button, [role=button]"),
      links: lista("a[href]"),
      campos: lista("input, textarea, select"),
      abas: lista("[role=tab]"),
      tabelas: [...document.querySelectorAll("table")].filter(vis).map((t) => [...t.querySelectorAll("th")].map((th) => th.innerText.trim()).join(" | ")),
      dialogos: document.querySelectorAll("[role=dialog], [role=alertdialog]").length,
      larguraRola: document.documentElement.scrollWidth > innerWidth,
    };
  });

const resultado = {};
for (const r of ROTAS) {
  erros = [];
  rede = [];
  try {
    await p.goto(`${BASE}${r}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await p.waitForTimeout(r === "/nexo" ? 6000 : 3500);
    // o tour do Nexo cobre a tela: pular
    const pular = p.locator('button:has-text("Pular")');
    if (await pular.count()) {
      await pular.first().click().catch(() => {});
      await p.waitForTimeout(800);
    }
    const nome = r === "/" ? "raiz" : r.slice(1).replace(/\//g, "-");
    await p.screenshot({ path: `${OUT}/${nome}.png`, fullPage: true });
    resultado[r] = { url: p.url().replace(BASE, ""), ...(await inventario()), erros: [...new Set(erros)], rede: [...new Set(rede)] };
    console.log(r, "->", resultado[r].url, `erros ${resultado[r].erros.length}`, `rede ${resultado[r].rede.length}`);
  } catch (e) {
    resultado[r] = { falhou: e.message.slice(0, 200) };
    console.log(r, "FALHOU", e.message.slice(0, 120));
  }
}

// um projeto por dentro
await p.goto(`${BASE}/projetos`, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(3500);
const href = await p.locator('a[href^="/projetos/"]').first().getAttribute("href").catch(() => null);
if (href) {
  erros = [];
  rede = [];
  await p.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(4000);
  await p.screenshot({ path: `${OUT}/projeto.png`, fullPage: true });
  resultado["/projetos/[id]"] = { url: href, ...(await inventario()), erros: [...new Set(erros)], rede: [...new Set(rede)] };
  console.log("/projetos/[id]", href);
}
fs.writeFileSync(`${OUT}/inventario.json`, JSON.stringify(resultado, null, 2));
await b.close();
