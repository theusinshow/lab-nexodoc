// AUDITORIA — axe (wcag2a/2aa/21aa) no produto ATUAL, para separar regressão de
// problema que já existia. Uso: node ... <base> <saida.json>
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
const [BASE, OUT] = process.argv.slice(2);
const AXE = path.resolve("node_modules/axe-core/axe.min.js");
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(`${BASE}/login`);
await p.waitForTimeout(2500);
await p.locator('button:has-text("Entrar como dev")').click();
await p.waitForTimeout(4000);
const res = {};
for (const r of ["/", "/nexo", "/projetos", "/achados", "/ajuda", "/volumes", "/admin"]) {
  await p.goto(BASE + r, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(r === "/nexo" ? 6000 : 3500);
  const pular = p.locator('button:has-text("Pular")');
  if (await pular.count()) await pular.first().click().catch(() => {});
  await p.waitForTimeout(500);
  await p.addScriptTag({ path: AXE });
  res[r] = await p.evaluate(async () => (await axe.run(document, { resultTypes: ["violations"], runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] })).violations.map((v) => ({ id: v.id, impacto: v.impact, n: v.nodes.length, ex: v.nodes[0]?.target.join(" ").slice(0, 90) })));
  console.log(r, res[r].map((v) => `${v.id}(${v.n},${v.impacto})`).join(" "));
}
fs.writeFileSync(OUT, JSON.stringify(res, null, 2));
await b.close();
