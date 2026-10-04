// PROVA — as correções pedidas depois da auditoria do redesenho (01/10):
// Ctrl K em toda tela, G + letra, botões que eram mudos, e o aviso de tela
// pequena (tela com fundo líquido, faixa, sessão, movimento reduzido).
// Uso: node scripts/prova-correcoes-auditoria.mjs <pasta-de-capturas>
import { chromium } from "playwright";
import fs from "node:fs";

const OUT = process.argv[2] ?? "prova-correcoes";
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3200/prototipo";
const GL = ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"];
const b = await chromium.launch({ args: GL });
let v = 0;
const falhas = [];
const ok = (cond, nome, extra = "") => {
  console.log(`${cond ? "ok  " : "FALHA"} ${nome.padEnd(58)} ${extra}`);
  if (!cond) falhas.push(nome);
};
const abrir = async (p, h, espera = 1400) => {
  await p.goto(`${BASE}?p=${v++}${h}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(espera);
};
const hash = (p) => p.evaluate(() => location.hash);

// 1. Ctrl K abre a busca em toda tela; no Painel, foca a barra da própria tela
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  for (const h of ["#/projetos/lista", "#/projeto/com-registros", "#/achados/com-voce", "#/resultado/fila", "#/admin/cockpit"]) {
    await abrir(p, h);
    await p.keyboard.press("Control+k");
    await p.waitForTimeout(500);
    const r = await p.evaluate(() => ({ d: document.querySelectorAll("[role=dialog]").length, foco: document.activeElement?.getAttribute("aria-label") }));
    ok(r.d > 0 && r.foco === "Obra, tarefa ou pedido", `Ctrl K abre a busca em ${h}`, JSON.stringify(r));
  }
  await abrir(p, "#/inicio/padrao");
  await p.keyboard.press("Control+k");
  await p.waitForTimeout(400);
  const foco = await p.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  ok(foco === "Obra, tarefa ou pedido", "Ctrl K no Painel foca a barra do Painel", foco);

  // 2. G e depois a letra
  for (const [letra, destino] of [["o", "#/projetos"], ["a", "#/achados"], ["d", "#/admin"], ["p", "#/inicio"]]) {
    await abrir(p, "#/achados/com-voce");
    await p.keyboard.press("g");
    await p.keyboard.press(letra);
    await p.waitForTimeout(700);
    const h = await hash(p);
    ok(h.startsWith(destino), `G ${letra.toUpperCase()} leva a ${destino}`, h);
  }
  // J/K continuam nas listas
  await abrir(p, "#/projetos/lista");
  await p.keyboard.press("j");
  await p.waitForTimeout(300);
  ok((await p.locator(".pj-linha[aria-selected=true]").count()) === 1, "J ainda anda na lista de Projetos");

  // 3. botões que eram mudos
  await abrir(p, "#/mapa/lido");
  await p.locator(".mp-divisao-tomos").click();
  await p.waitForTimeout(250);
  await p.locator('.mp-divisao-lista [role=option]:has-text("3 tomos")').click();
  await p.waitForTimeout(250);
  ok((await p.locator(".mp-divisao-tomos").innerText()).includes("3 tomos"), "Mapa: seletor de tomos troca o número");
  await p.locator(".mp-gerar").click();
  await p.waitForTimeout(900);
  ok((await hash(p)).startsWith("#/nexo/gerando"), "Mapa: Gerar leva à conversa gerando", await hash(p));

  await abrir(p, "#/nexo/lido");
  const larg = () => p.evaluate(() => document.querySelector(".nw-palco").getBoundingClientRect().width);
  const antes = await larg();
  await p.locator('button[aria-label="Recolher as conversas"]').click();
  await p.locator('button[aria-label="Recolher o chat"]').click();
  await p.waitForTimeout(700);
  const depois = await larg();
  ok(depois > antes + 500, "Montar volume: recolher conversas e chat alarga o palco", `${Math.round(antes)} → ${Math.round(depois)}`);
  await abrir(p, "#/nexo/lido");
  await p.locator('.cx-saida:has-text("Dividir assim")').click();
  await p.waitForTimeout(900);
  ok((await hash(p)).startsWith("#/nexo/dividido"), "Montar volume: Dividir assim leva a dividido", await hash(p));
  await abrir(p, "#/nexo/lido");
  await p.locator('.cx-saida:has-text("Um tomo só")').click();
  await p.waitForTimeout(500);
  ok((await p.getByText("Um tomo só, com as 412 páginas.").count()) > 0, "Montar volume: Um tomo só mostra aviso");

  await abrir(p, "#/admin/cockpit");
  await p.locator('.adm-num:has-text("Usuários ativos")').click();
  await p.waitForTimeout(500);
  ok((await p.locator("h1").innerText()) === "Pessoas", "Admin: número Usuários ativos abre Pessoas");
  await p.locator('.adm-token-acoes button:has-text("atualizar")').click();
  await p.waitForTimeout(150);
  const girando = await p.locator(".adm-atualizado .ds-gira").count();
  await p.waitForTimeout(900);
  ok(girando > 0, "Admin: atualizar gira e relê", `giro ${girando}`);
  await p.locator('.adm-token-acoes button:has-text("sair")').click();
  await p.waitForTimeout(800);
  ok((await hash(p)).startsWith("#/admin/sem-token"), "Admin: sair volta à porta do token", await hash(p));

  await abrir(p, "#/admin/dados");
  const linhas = () => p.locator(".pb-auditorias .adm-linha:not(.din-cab)").count();
  const todas = await linhas();
  await p.locator('.pb-auditorias').locator("xpath=preceding-sibling::form[1]").locator('select[name="status"]').selectOption("FAILED");
  await p.locator('.pb-auditorias').locator("xpath=preceding-sibling::form[1]").locator('button[type="submit"]').click();
  await p.waitForTimeout(300);
  const falhas = await linhas();
  ok(todas > 1 && falhas === 1, "Admin Dados: Filtrar por status filtra a lista", `${todas} → ${falhas}`);
  await p.close();
}

// 4. aviso de tela pequena
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await abrir(p, "#/achados/com-voce", 2500);
  await p.screenshot({ path: `${OUT}/aviso-390.png` });
  ok((await p.locator(".at h1").count()) === 1, "390: a tela de aviso aparece no lugar de Achados");
  ok((await p.locator(".ds-fundo-liquido canvas").count()) === 1, "390: o fundo líquido monta (WebGL)");
  await p.mouse.move(80, 200);
  await p.mouse.move(300, 420, { steps: 12 });
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/aviso-390-gesto.png` });
  await p.locator('button:has-text("Continuar assim mesmo")').click();
  await p.waitForTimeout(800);
  ok((await p.locator(".at-faixa").count()) === 1 && (await p.locator(".ac, .mp").count()) > 0, "390: continuar mostra a tela com a faixa em cima");
  await p.screenshot({ path: `${OUT}/faixa-390.png` });
  await abrir(p, "#/projetos/lista", 1500);
  ok((await p.locator(".at h1").count()) === 0 && (await p.locator(".at-faixa").count()) === 1, "390: a decisão vale na sessão (outra tela: só a faixa)");
  await p.locator('button[aria-label="Fechar o aviso"]').click();
  await p.waitForTimeout(300);
  await abrir(p, "#/achados/com-voce", 1500);
  ok((await p.locator(".at-faixa").count()) === 0, "390: faixa fechada não volta na sessão");
  await ctx.close();

  const ent = await b.newPage({ viewport: { width: 390, height: 844 } });
  await abrir(ent, "#/entrada/padrao", 1800);
  ok((await ent.locator(".at h1").count()) === 0, "390: a Entrada não avisa (cabe no celular)");
  await ent.close();

  const red = await b.newContext({ viewport: { width: 768, height: 1024 }, reducedMotion: "reduce" });
  const pr = await red.newPage();
  await abrir(pr, "#/resultado/fila", 2000);
  ok((await pr.locator(".at-fundo-parado").count()) === 1 && (await pr.locator(".ds-fundo-liquido").count()) === 0, "768 com movimento reduzido: fundo parado, sem WebGL");
  await pr.screenshot({ path: `${OUT}/aviso-768-reduzido.png` });
  await red.close();

  const larga = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await abrir(larga, "#/projetos/lista");
  ok((await larga.locator(".at, .at-faixa").count()) === 0, "1440: nenhum aviso");
  await larga.goto(`${BASE}?aviso=tela&p=${v++}#/projetos/lista`, { waitUntil: "domcontentloaded" });
  await larga.waitForTimeout(2500);
  ok((await larga.locator(".at h1").count()) === 1, "?aviso=tela força o aviso em 1440 (para revisar)");
  await larga.screenshot({ path: `${OUT}/aviso-1440-forcado.png` });
  await larga.close();
}

await b.close();
console.log(falhas.length ? `\n${falhas.length} falha(s)` : "\ntudo ok");
process.exit(falhas.length ? 1 : 0);
