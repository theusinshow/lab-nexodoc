// PROVA — a moldura do sistema novo no app de verdade (migração, passo 2):
// a 404 com o Topo, o sino e o menu da conta com os dados reais, Ctrl K com as
// obras do banco, ?, G + letra, a mensagem levada ao Nexo e o aviso de tela
// pequena. Uso: node scripts/prova-moldura.mjs [base] [pasta-de-capturas]
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3400";
const OUT = process.argv[3] ?? "prova-moldura";
fs.mkdirSync(OUT, { recursive: true });
const falhas = [];
const ok = (cond, nome, extra = "") => {
  console.log(`${cond ? "ok  " : "FALHA"} ${nome.padEnd(60)} ${extra}`);
  if (!cond) falhas.push(nome);
};

const b = await chromium.launch();
const erros = [];

// sem sessão: a 404 diz que não existe e oferece entrar
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(`${BASE}/projetos-que-nao-existem/117-26`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2500);
  ok((await p.locator("h1").innerText()) === "Esta página não existe.", "deslogado: 404 no sistema novo");
  ok((await p.locator(".pn-topo").count()) === 0 && (await p.locator('button:has-text("Entrar no Nexo")').count()) === 1, "deslogado: sem Topo, com Entrar");
  await p.screenshot({ path: `${OUT}/404-deslogado.png` });
  await p.close();
}

const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => erros.push(e.message.slice(0, 160)));
p.on("console", (m) => m.type() === "error" && !/favicon|404|Failed to load resource/i.test(m.text()) && erros.push(m.text().slice(0, 160)));
await p.goto(`${BASE}/login`);
await p.waitForTimeout(2000);
await p.locator('button:has-text("Entrar como dev")').click();
await p.waitForTimeout(4000);

await p.goto(`${BASE}/projetos/117-26-nao-existe-x`, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(3000);
const h1 = await p.locator("h1").first().innerText().catch(() => "");
// /projetos/[id] inexistente pode cair na 404 da rota; uma rota que não existe cai na raiz
await p.goto(`${BASE}/nada-aqui/117-26`, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(3000);
ok((await p.locator("h1").innerText()) === "Esta página não existe.", "logado: 404 no sistema novo", `(/projetos/x deu: ${h1.slice(0, 30)})`);
ok((await p.locator(".pn-topo").count()) === 1, "logado: com o Topo");
const nav = await p.$$eval(".pn-nav a", (as) => as.map((a) => `${a.textContent}→${a.getAttribute("href")}`));
ok(nav.length >= 5 && nav.includes("Projetos→/projetos"), "Topo: destinos com rotas reais", nav.join(" "));
await p.screenshot({ path: `${OUT}/404-logado.png` });

// menu da conta
await p.locator(".pn-quem").click();
await p.waitForTimeout(400);
const conta = await p.locator(".pn-menu").innerText();
ok(/@/.test(conta) && /Centro de controle/.test(conta) && /Sair/.test(conta), "menu da conta: e-mail, alçada e Sair", conta.replace(/\s+/g, " ").slice(0, 120));
await p.keyboard.press("Escape");
await p.waitForTimeout(300);

// sino
await p.locator(".pn-sino").click();
await p.waitForTimeout(400);
const sino = await p.locator(".pn-sino-painel").innerText();
ok(/Com você/.test(sino) && /Abrir Achados/.test(sino), "sino: Com você com a consulta real", sino.replace(/\s+/g, " ").slice(0, 120));
await p.keyboard.press("Escape");
await p.waitForTimeout(300);

// Ctrl K: obras do banco
await p.keyboard.press("Control+k");
await p.waitForTimeout(500);
ok((await p.locator(".pc-paleta").count()) === 1, "Ctrl K abre a busca");
const grupos = await p.$$eval(".pc-paleta .cf-grupo", (g) => g.map((x) => x.textContent));
const obras = await p.locator('.pc-paleta [role=option][id*="obra-"]').count();
ok(grupos.includes("Tarefas") && obras > 0, "busca: tarefas e obras reais", `${grupos.join(",")} · ${obras} obras`);
await p.screenshot({ path: `${OUT}/busca.png` });
// digitar o código de uma obra e abrir o projeto
const primeira = await p.locator('.pc-paleta [role=option][id*="obra-"] .ds-code').first().innerText();
await p.locator(".pc-paleta input").fill(primeira);
await p.waitForTimeout(300);
await p.keyboard.press("Enter");
await p.waitForURL(/\/projetos\/[^/]+$/, { timeout: 15000 }).catch(() => {});
ok(/\/projetos\/[^/]+$/.test(p.url()), "busca: Enter na obra abre o projeto", p.url().replace(BASE, ""));

// Perguntar ao Nexo leva a mensagem escrita
await p.goto(`${BASE}/nada-aqui`, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(2500);
await p.keyboard.press("Control+k");
await p.waitForTimeout(400);
await p.locator(".pc-paleta input").fill("refaz a LD da obra do ginasio");
await p.waitForTimeout(300);
await p.keyboard.press("Enter");
await p.waitForURL(/\/nexo\?/, { timeout: 15000 }).catch(() => {});
await p.waitForTimeout(6000);
const pular = p.locator('button:has-text("Pular")');
if (await pular.count()) await pular.first().click().catch(() => {});
const composer = await p.evaluate(() => [...document.querySelectorAll("textarea")].map((t) => t.value).join(" | "));
ok(p.url().includes("mensagem=") && composer.includes("refaz a LD da obra do ginasio"), "Perguntar ao Nexo: chega escrita no chat", composer.slice(0, 60));

// ? e G + letra
await p.goto(`${BASE}/nada-aqui`, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(2500);
await p.keyboard.press("?");
await p.waitForTimeout(400);
ok((await p.locator('[role=dialog][aria-label="Atalhos de teclado"]').count()) === 1, "? abre os atalhos");
await p.keyboard.press("Escape");
await p.waitForTimeout(300);
await p.keyboard.press("g");
await p.keyboard.press("o");
await p.waitForURL(/\/projetos$/, { timeout: 15000 }).catch(() => {});
ok(p.url().endsWith("/projetos"), "G O leva a Projetos", p.url().replace(BASE, ""));

// aviso de tela pequena
await p.setViewportSize({ width: 390, height: 844 });
await p.goto(`${BASE}/nada-aqui`, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(3000);
ok((await p.locator(".at h1").count()) === 1, "390: tela de aviso antes da página");
await p.screenshot({ path: `${OUT}/aviso-390.png` });
await p.locator('button:has-text("Continuar assim mesmo")').click();
await p.waitForTimeout(600);
ok((await p.locator(".at-faixa").count()) === 1 && (await p.locator("h1").innerText()) === "Esta página não existe.", "390: continuar mostra a página com a faixa");

ok(erros.length === 0, "sem erro de página nem de console", erros.slice(0, 3).join(" / "));
await b.close();
console.log(falhas.length ? `\n${falhas.length} falha(s)` : "\ntudo ok");
process.exit(falhas.length ? 1 : 0);
