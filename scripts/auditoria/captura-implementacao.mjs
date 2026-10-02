// AUDITORIA — a IMPLEMENTAÇÃO nova (PR #9): /login e /sem-acesso, deslogado,
// nas larguras de prova, com axe e erros de console. Uso: node ... <base> <pasta>
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
const BASE = process.argv[2], OUT = process.argv[3];
fs.mkdirSync(OUT, { recursive: true });
const AXE = path.resolve("node_modules/axe-core/axe.min.js");
const b = await chromium.launch();
const res = {};
for (const w of [1920, 1440, 1280, 1024, 768, 390]) {
  const p = await b.newPage({ viewport: { width: w, height: w < 500 ? 844 : 900 } });
  const erros = [];
  p.on("console", (m) => m.type() === "error" && erros.push(m.text().slice(0, 160)));
  for (const r of ["/login", "/sem-acesso"]) {
    await p.goto(BASE + r, { waitUntil: "domcontentloaded", timeout: 60000 });
    await p.waitForTimeout(3500);
    const nome = `${r.slice(1)}-${w}`;
    await p.screenshot({ path: `${OUT}/${nome}.png`, fullPage: true });
    await p.addScriptTag({ path: AXE });
    const axe = await p.evaluate(async () => (await axe.run(document, { resultTypes: ["violations"], runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] })).violations.map((v) => ({ id: v.id, n: v.nodes.length, impacto: v.impact, ex: v.nodes[0]?.target.join(" ").slice(0, 100), msg: v.nodes[0]?.failureSummary?.slice(0, 160) })));
    const inv = await p.evaluate(() => ({
      url: location.pathname,
      h: [...document.querySelectorAll("h1,h2")].map((h) => h.innerText.trim()),
      botoes: [...document.querySelectorAll("button,a[href]")].filter((x) => x.offsetWidth).map((x) => (x.getAttribute("aria-label") || x.innerText).replace(/\s+/g, " ").trim().slice(0, 50)),
      rolaLado: document.documentElement.scrollWidth > innerWidth + 1,
      alvosPequenos: [...document.querySelectorAll("button,a[href],input")].filter((x) => x.offsetWidth && (x.getBoundingClientRect().height < 24 || x.getBoundingClientRect().width < 24)).map((x) => (x.innerText || x.getAttribute("aria-label") || x.tagName).trim().slice(0, 30) + ` ${Math.round(x.getBoundingClientRect().width)}x${Math.round(x.getBoundingClientRect().height)}`),
    }));
    res[nome] = { ...inv, axe, erros: [...new Set(erros)] };
    erros.length = 0;
    console.log(nome, inv.url, "axe", axe.map((a) => `${a.id}(${a.n})`).join(","), "rola", inv.rolaLado);
  }
  await p.close();
}
fs.writeFileSync(`${OUT}/inventario.json`, JSON.stringify(res, null, 2));
await b.close();
