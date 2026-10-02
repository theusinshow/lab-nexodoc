// O cartão de navegação: abaixo de 1280 a marca abre os destinos; acima, a barra fica inteira.
import { chromium } from "playwright";
const S = process.argv[2];
const b = await chromium.launch();
const ok = (n, c) => console.log(c ? "ok  " : "FALHA", n);
const erros = [];
const abrir = async (w, h, rota = "projetos/lista") => {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  p.on("pageerror", (e) => erros.push(e.message.slice(0, 140)));
  await p.goto(`http://localhost:3200/prototipo#/${rota}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3200);
  return p;
};
const vis = (p, sel) => p.locator(sel).first().isVisible();

let p = await abrir(1440, 900);
ok("1440: barra inteira, marca leva ao Painel", (await vis(p, ".pn-nav")) && (await vis(p, ".pn-marca--link")) && !(await vis(p, ".pn-marca--botao")));
await p.close();

p = await abrir(1100, 800);
ok("1100: a barra sai e a marca vira o botão", !(await vis(p, ".pn-nav")) && (await vis(p, ".pn-marca--botao")));
await p.locator(".pn-marca--botao").click();
await p.waitForTimeout(450);
ok("o cartão abre com os seis destinos", (await p.locator(".pn-cartao-destino").count()) === 6);
ok("o destino atual vem marcado", (await p.locator('.pn-cartao-destino[aria-current="page"]').innerText()).includes("Projetos"));
const cx = await p.locator(".pn-cartao-nav").boundingBox();
await p.screenshot({ path: `${S}/cartao-1100.png`, clip: { x: 0, y: 0, width: Math.min(1100, cx.x + cx.width + 24), height: cx.y + cx.height + 24 } });
ok("o menu da conta não repete os destinos", (await p.locator(".pn-menu-destinos").count()) === 0);
await p.locator('.pn-cartao-destino:has-text("Achados")').click();
await p.waitForTimeout(1200);
ok("clicar num destino navega", (await p.evaluate(() => location.hash)).startsWith("#/achados"));
// teclado: seta para baixo no botão abre e foca o primeiro; Esc fecha e devolve o foco
await p.locator(".pn-marca--botao").focus();
await p.keyboard.press("ArrowDown");
await p.waitForTimeout(400);
ok("teclado abre e foca o primeiro destino", await p.evaluate(() => document.activeElement?.classList.contains("pn-cartao-destino")));
await p.keyboard.press("Escape");
await p.waitForTimeout(300);
ok("Esc fecha e devolve o foco à marca", (await p.locator(".pn-cartao-nav").count()) === 0 && (await p.evaluate(() => document.activeElement?.classList.contains("pn-marca--botao"))));
await p.close();

p = await abrir(390, 800);
await p.locator(".pn-marca--botao").click();
await p.waitForTimeout(450);
const cy = await p.locator(".pn-cartao-nav").boundingBox();
ok("390: o cartão cabe na tela", cy.x >= 0 && cy.x + cy.width <= 390);
await p.screenshot({ path: `${S}/cartao-390.png`, clip: { x: 0, y: 0, width: 390, height: Math.min(800, cy.y + cy.height + 16) } });
await p.close();

console.log("erros:", erros.length ? erros : "nenhum");
await b.close();
