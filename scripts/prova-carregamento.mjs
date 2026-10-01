// Captura o esqueleto de cada tela (rede travada) ao lado da tela pronta, para conferir a forma.
import { chromium } from "playwright";

const S = process.argv[2];
const BASE = "http://localhost:3200/prototipo";
const TELAS = ["Início", "Projetos", "Projeto (uma obra)", "Achados", "Resultado da auditoria", "Auditoria rodando", "Administração", "Ajuda", "Mapa do volume", "Montar o volume", "Conversa com o Nexo"];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const erros = [];
p.on("pageerror", (e) => erros.push(e.message.slice(0, 140)));

await p.goto(`${BASE}#/projetos/lista`, { waitUntil: "networkidle", timeout: 120000 });
await p.waitForTimeout(1200);
const painel = async () => {
  await p.waitForTimeout(250);
  if ((await p.locator(".pt-painel").count()) === 0) await p.locator(".pt-pilula").click();
  await p.waitForTimeout(350);
};
await painel();
await p.locator('.pt-chips button:has-text("Travada")').click();

for (const [i, nome] of TELAS.entries()) {
  await painel();
  // sair da tela atual primeiro: ir para a mesma tela não carrega
  await p.locator(`.pt-telas button:has-text("${i % 2 ? "Ajuda" : "Projetos"}")`).first().click();
  await painel();
  await p.locator(`.pt-telas button:has-text("${nome}")`).first().click();
  await p.keyboard.press("Escape");
  await p.waitForTimeout(700);
  const temEsqueleto = await p.locator(".sk[aria-busy]").count();
  await p.screenshot({ path: `${S}/sk-${String(i).padStart(2, "0")}-a.png` });
  // a tela pronta, para comparar
  await painel();
  await p.locator('.pt-chips button:has-text("Instantânea")').click();
  await p.keyboard.press("Escape");
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${S}/sk-${String(i).padStart(2, "0")}-b.png` });
  await painel();
  await p.locator('.pt-chips button:has-text("Travada")').click();
  console.log(temEsqueleto ? "ok" : "SEM ESQUELETO", nome);
}
console.log("erros:", erros.length ? erros : "nenhum");
await b.close();
