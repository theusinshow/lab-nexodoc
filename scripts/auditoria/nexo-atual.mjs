// AUDITORIA — o Nexo ATUAL por dentro: conversa de auditoria, canvas, busca de
// ações, menu de conta, "como funciona". Uso: node ... <base> <pasta>
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2];
const OUT = process.argv[3];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const log = [];
p.on("console", (m) => m.type() === "error" && log.push(`console: ${m.text().slice(0, 160)}`));
const foto = (n) => p.screenshot({ path: `${OUT}/nexo-${n}.png` });
const lista = () =>
  p.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight);
    const t = (el) => (el.getAttribute("aria-label") || el.innerText || el.getAttribute("title") || "").replace(/\s+/g, " ").trim().slice(0, 60);
    return [...new Set([...document.querySelectorAll("button, [role=tab], [role=menuitem], a[href]")].filter(vis).map(t).filter(Boolean))];
  });

await p.goto(`${BASE}/login`);
await p.waitForTimeout(2000);
await p.locator('button:has-text("Entrar como dev")').click();
await p.waitForTimeout(4000);
await p.goto(`${BASE}/nexo`);
await p.waitForTimeout(6000);
const pular = p.locator('button:has-text("Pular")');
if (await pular.count()) await pular.first().click();
await p.waitForTimeout(800);

// conversa de auditoria: clicar na obra com etiqueta AUDITORIA
const obra = p.locator('button:has-text("117-25")').first();
await obra.click().catch(() => {});
await p.waitForTimeout(2500);
await foto("obra-117");
const conversa = p.locator("text=AUDITORIA").first();
await conversa.click().catch(() => {});
await p.waitForTimeout(4000);
await foto("auditoria");
fs.writeFileSync(`${OUT}/nexo-auditoria-controles.json`, JSON.stringify(await lista(), null, 1));

// busca de ações (Ctrl K)
await p.keyboard.press("Control+k");
await p.waitForTimeout(1200);
await foto("busca-acoes");
fs.writeFileSync(`${OUT}/nexo-busca-acoes.json`, JSON.stringify(await p.evaluate(() => [...document.querySelectorAll("[role=option], [cmdk-item], [role=dialog] button, [role=dialog] li")].map((e) => e.innerText.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 80)), null, 1));
await p.keyboard.press("Escape");
await p.waitForTimeout(500);

// foco na revisão, ocultar projetos, ocultar chat
for (const t of ["Foco na revisão", "Ocultar projetos", "Ocultar chat"]) {
  const bt = p.locator(`button:has-text("${t}")`).first();
  if (await bt.count()) {
    await bt.click().catch(() => {});
    await p.waitForTimeout(900);
    await foto(t.toLowerCase().replace(/ /g, "-").normalize("NFD").replace(/[̀-ͯ]/g, ""));
    await bt.click().catch(() => {});
    await p.waitForTimeout(600);
  } else log.push(`sem botão: ${t}`);
}

// menu da conta (rodapé da barra lateral)
await p.locator("text=Usuario Dev").first().click().catch(() => log.push("sem menu da conta"));
await p.waitForTimeout(800);
await foto("menu-conta");
fs.writeFileSync(`${OUT}/nexo-menu-conta.json`, JSON.stringify(await lista(), null, 1));
await p.keyboard.press("Escape");

// como funciona o Nexo
await p.locator("text=Como funciona o Nexo").first().click().catch(() => log.push("sem como funciona"));
await p.waitForTimeout(1500);
await foto("como-funciona");
await p.keyboard.press("Escape");

// painel: abrir "Personalizar" e uma linha de projeto
await p.goto(`${BASE}/`);
await p.waitForTimeout(3500);
await p.locator('button:has-text("Personalizar")').first().click().catch(() => {});
await p.waitForTimeout(900);
await p.screenshot({ path: `${OUT}/painel-personalizar.png` });
console.log(log.join("\n") || "sem erros");
await b.close();
