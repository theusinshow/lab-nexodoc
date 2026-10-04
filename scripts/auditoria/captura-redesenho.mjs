// AUDITORIA — o REDESENHO (/prototipo): toda tela em toda situação, com captura,
// inventário, erros de console e acessibilidade (axe-core). Uso: node ... <pasta>
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT = process.argv[2];
const BASE = "http://localhost:3200/prototipo";
fs.mkdirSync(OUT, { recursive: true });
const AXE = path.resolve("node_modules/axe-core/axe.min.js");

const b = await chromium.launch({ args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
let erros = [];
p.on("console", (m) => m.type() === "error" && !/DevTools|favicon|WebGL|GPU stall|swiftshader/i.test(m.text()) && erros.push(m.text().slice(0, 200)));
p.on("pageerror", (e) => erros.push(`[pageerror] ${e.message.slice(0, 200)}`));

// a lista de telas e situações vem do próprio painel do protótipo (Alt P)
await p.goto(`${BASE}#/inicio/padrao`, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(3000);
await p.locator(".pt-pilula").click();
await p.waitForTimeout(400);
const telas = await p.$$eval(".pt-telas button", (bs) => bs.map((x) => x.textContent.replace(/\d+$/, "").trim()));
await p.keyboard.press("Escape");

// a rede do protótipo fica instantânea: a auditoria é das telas, não do esqueleto
await p.locator(".pt-pilula").click();
await p.waitForTimeout(300);
await p.locator('.pt-chips button:has-text("Instantânea")').click();
await p.keyboard.press("Escape");

const inventario = () =>
  p.evaluate(() => {
    const raiz = document.querySelector(".pt-tela") ?? document.body;
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const txt = (el) => (el.getAttribute("aria-label") || el.innerText || el.getAttribute("title") || el.getAttribute("placeholder") || "").replace(/\s+/g, " ").trim().slice(0, 70);
    const lista = (sel) => [...new Set([...raiz.querySelectorAll(sel)].filter(vis).map(txt).filter(Boolean))];
    const semNome = [...raiz.querySelectorAll("button, a[href], input, textarea, select, [role=button]")].filter(vis).filter((el) => !txt(el) && !el.getAttribute("aria-labelledby")).length;
    return {
      h: lista("h1, h2, h3"),
      botoes: lista("button, [role=button]"),
      campos: lista("input, textarea, select"),
      abas: lista("[role=tab]"),
      tabelas: [...raiz.querySelectorAll("table, [role=grid], [role=table]")].filter(vis).length,
      semNome,
      rolaLado: document.querySelector(".pt-tela")?.scrollWidth > document.querySelector(".pt-tela")?.clientWidth + 2,
    };
  });

// 1º: o endereço de cada situação (lido logo depois do clique, antes de qualquer avanço sozinho)
const enderecos = [];
for (const nome of telas) {
  await p.locator(".pt-pilula").click();
  await p.waitForTimeout(300);
  await p.locator(`.pt-telas button:has-text("${nome}")`).first().click();
  await p.waitForTimeout(400);
  await p.locator(".pt-pilula").click();
  await p.waitForTimeout(300);
  const n = await p.locator(".pt-chips[aria-label='Situação desta tela'] button").count();
  const sits = await p.$$eval(".pt-chips[aria-label='Situação desta tela'] button", (bs) => bs.map((x) => x.textContent.replace(/^\d+/, "").trim()));
  for (let i = 0; i < n; i++) {
    await p.locator(".pt-chips[aria-label='Situação desta tela'] button").nth(i).click();
    enderecos.push({ tela: nome, situacao: sits[i], hash: await p.evaluate(() => location.hash) });
    await p.waitForTimeout(150);
    if (!(await p.locator(".pt-painel").count())) {
      await p.locator(".pt-pilula").click();
      await p.waitForTimeout(250);
    }
  }
  await p.keyboard.press("Escape");
}
console.log("situações:", enderecos.length);

// 2º: cada uma aberta direto, com recarga
const resultado = {};
let k = 0;
for (const { tela, situacao, hash } of enderecos) {
  erros = [];
  await p.goto(`${BASE}?v=${k++}${hash}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1200);
  const arq = hash.replace(/[#/]/g, "_").replace(/^_+/, "");
  await p.screenshot({ path: `${OUT}/${arq}.png` });
  let axe = null;
  try {
    await p.addScriptTag({ path: AXE });
    axe = await p.evaluate(async () => {
      const r = await window.axe.run(document.querySelector(".pt-tela"), { resultTypes: ["violations"], runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] });
      return r.violations.map((v) => ({ id: v.id, impacto: v.impact, n: v.nodes.length, exemplo: v.nodes[0]?.target?.join(" ").slice(0, 120) }));
    });
  } catch (e) {
    axe = [{ id: "axe-falhou", impacto: "?", n: 0, exemplo: e.message.slice(0, 80) }];
  }
  resultado[hash] = { tela, situacao, ...(await inventario()), erros: [...new Set(erros)], axe };
  console.log(hash.padEnd(40), `erros ${erros.length}`, `axe ${axe.map((a) => a.id).join(",")}`);
}
fs.writeFileSync(`${OUT}/inventario.json`, JSON.stringify(resultado, null, 2));
await b.close();
