// AUDITORIA — o produto ATUAL em 768 e 390: o que ele faz em tela estreita
// (portão, rolagem lateral), para comparar com o redesenho. Uso: node ... <base> <pasta>
import { chromium } from "playwright";
const [BASE, OUT] = process.argv.slice(2);
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await c.newPage();
await p.goto(`${BASE}/login`);
await p.waitForTimeout(2500);
await p.locator('button:has-text("Entrar como dev")').click();
await p.waitForTimeout(4000);
for (const w of [768, 390]) {
  await p.setViewportSize({ width: w, height: w === 390 ? 844 : 1024 });
  for (const r of ["/", "/nexo", "/projetos", "/achados", "/admin"]) {
    await p.goto(BASE + r, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(r === "/nexo" ? 5000 : 3000);
    const pular = p.locator('button:has-text("Pular")');
    if (await pular.count()) await pular.first().click().catch(() => {});
    const nome = `estreito${r === "/" ? "-raiz" : r.replace(/\//g, "-")}-${w}`;
    await p.screenshot({ path: `${OUT}/${nome}.png` });
    const m = await p.evaluate(() => ({ rola: document.scrollingElement.scrollWidth - innerWidth, portao: /tela (mais )?larga|computador|1024/i.test(document.body.innerText.slice(0, 3000)) }));
    console.log(nome, JSON.stringify(m));
  }
}
await b.close();
