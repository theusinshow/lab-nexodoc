// Abre cada tela em cada situação do protótipo e anota erro, tela vazia e rolagem para o lado.
import { chromium } from "playwright";

const S = process.argv[2];
const BASE = "http://localhost:3200/prototipo";
const b = await chromium.launch({ args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
let erros = [];
p.on("pageerror", (e) => erros.push(e.message.slice(0, 140)));
p.on("console", (m) => m.type() === "error" && !/DevTools|favicon|WebGL|GPU stall/.test(m.text()) && erros.push(m.text().slice(0, 140)));

await p.goto(BASE, { waitUntil: "networkidle", timeout: 120000 });
await p.waitForTimeout(1000);
// a lista vem do próprio painel do protótipo
await p.locator(".pt-pilula").click();
const telas = await p.$$eval(".pt-telas button", (bs) => bs.map((b) => b.textContent.replace(/\d+$/, "").trim()));
await p.keyboard.press("Escape");

let total = 0, problemas = 0;
for (const nome of telas) {
  await p.locator(".pt-pilula").click();
  await p.locator(`.pt-telas button:has-text("${nome}")`).first().click();
  await p.waitForTimeout(500);
  await p.locator(".pt-pilula").click();
  const sits = await p.$$eval(".pt-chips[role=radiogroup] button", (bs) => bs.map((b) => b.textContent.replace(/^\d+/, "").trim()));
  await p.keyboard.press("Escape");
  for (let i = 0; i < sits.length; i++) {
    erros = [];
    await p.locator(".pt-pilula").click();
    await p.locator(".pt-chips[role=radiogroup] button").nth(i).click();
    await p.keyboard.press("Escape");
    await p.waitForTimeout(900);
    const med = await p.evaluate(() => {
      const t = document.querySelector(".pt-tela");
      return { h: t?.scrollHeight ?? 0, w: t ? t.scrollWidth - t.clientWidth : 0, texto: (t?.innerText ?? "").trim().length, hash: location.hash };
    });
    total++;
    const ruim = erros.length || med.texto < 20 || med.w > 2;
    if (ruim) problemas++;
    if (ruim || i === 0) await p.screenshot({ path: `${S}/v-${med.hash.replace(/[#/]/g, "_")}.png` });
    console.log(ruim ? "!!" : "ok", med.hash.padEnd(40), `texto ${med.texto}`, med.w > 2 ? `ROLA PARA O LADO ${med.w}px` : "", erros.length ? `ERRO ${[...new Set(erros)].join(" | ")}` : "");
  }
}
console.log(`\n${total} situações, ${problemas} com problema`);
await b.close();
