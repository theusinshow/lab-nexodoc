// A auditoria dentro da conversa: abre, pergunta de verdade e confere que o palco vai ao achado citado.
import { chromium } from "playwright";

const S = process.argv[2];
const BASE = "http://localhost:3200/prototipo";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const erros = [];
p.on("pageerror", (e) => erros.push(e.message.slice(0, 160)));
p.on("console", (m) => m.type() === "error" && !/DevTools|favicon/.test(m.text()) && erros.push(m.text().slice(0, 160)));
const vai = async (h) => {
  await p.goto(`${BASE}#/${h}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2200);
};
const confere = (nome, ok, extra = "") => console.log(ok ? "ok  " : "FALHA", nome, extra);

for (const s of ["pronta", "rodando", "achado", "obra"]) {
  await vai(`nexo-auditoria/${s}`);
  await p.screenshot({ path: `${S}/na-${s}.png` });
}

await vai("nexo-auditoria/pronta");
// pergunta escrita no campo: a resposta escreve e o palco abre o achado citado
await p.locator(".nw-campo textarea").fill("por que a ACH-001 bloqueia?");
await p.keyboard.press("Enter");
await p.waitForTimeout(600);
confere("a pergunta entrou no chat", (await p.locator(".cx-voce", { hasText: "ACH-001 bloqueia" }).count()) === 1);
await p.waitForTimeout(7000);
const resposta = await p.locator(".nw-fio .cx-nexo").last().innerText();
confere("a resposta fala da capa e do carimbo", /carimbo/i.test(resposta), resposta.slice(0, 90).replace(/\n/g, " "));
const noPalco = await p.locator(".na-palco").innerText();
confere("o palco abriu o ACH-001", /ACH-001/.test(noPalco) && /carimbo/i.test(noPalco));
await p.screenshot({ path: `${S}/na-pergunta.png` });

// citação clicada leva o palco ao achado
await p.locator('.na-cita:has-text("ACH-002")').first().click();
await p.waitForTimeout(900);
confere("a citação abre o ACH-002 no palco", /ARQ-07/.test(await p.locator(".na-palco").innerText()));

// a barra de cima leva ao Nexo; o resultado em tela cheia oferece Perguntar ao Nexo
await vai("inicio/padrao");
await p.locator('.pn-nav a:has-text("Nexo")').click();
await p.waitForTimeout(1500);
confere("Nexo na barra abre a auditoria na conversa", (await p.evaluate(() => location.hash)).startsWith("#/nexo-auditoria"));
await vai("resultado/nao-emitir");
await p.locator('button:has-text("Perguntar ao Nexo")').click();
await p.waitForTimeout(1500);
confere("Perguntar ao Nexo, no resultado, abre a conversa", (await p.evaluate(() => location.hash)).startsWith("#/nexo-auditoria"));

console.log("erros:", erros.length ? [...new Set(erros)] : "nenhum");
await b.close();
