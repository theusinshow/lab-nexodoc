// A01 · G04 · A02 · A03 — abertura por link, achado específico, fonte comum e motor.
import { BASE, abrir, login, checar, fim, shot } from "./lib.mjs";
import { montarFixtures } from "./fixtures.mjs";

const fx = await montarFixtures();
const corpoOk = { status: "COMPLETED", report: fx.report, result: "", arquivos: fx.arquivos };
const { browser, page, erros } = await abrir();
await login(page);
let tentativas500 = 0;
await page.route(/\/api\/audits\/ux-[a-z0-9-]+$/, async (route) => {
  const id = route.request().url().split("/").pop();
  if (id === "ux-404") return route.fulfill({ status: 404, json: { error: "não encontrada" } });
  if (id === "ux-403") return route.fulfill({ status: 403, json: { error: "Você não faz parte do escritório desta auditoria." } });
  if (id === "ux-500") { tentativas500++; return tentativas500 === 1 ? route.fulfill({ status: 500, body: "x" }) : route.fulfill({ json: corpoOk }); }
  if (id === "ux-rede") return route.abort("internetdisconnected");
  return route.fulfill({ json: corpoOk });
});
await page.route(`**/api/arquivos/${fx.mem.sha}`, (r) => r.fulfill({ body: fx.mem.bytes, contentType: "application/pdf" }));
await page.route(`**/api/arquivos/${fx.orc.sha}`, (r) => r.fulfill({ body: fx.orc.bytes, contentType: "application/pdf" }));

async function textoDoVisor(esperado, nome) {
  const ok = await page.waitForFunction((e) => [...document.querySelectorAll(".react-pdf__Page__textContent")].some((x) => x.textContent.includes(e)), esperado, { timeout: 45000 }).then(() => true).catch(() => false);
  if (!ok) {
    await page.screenshot({ path: `scratchpad/ux-falha-${nome}.png` });
    console.log("DBG", nome, "visor:", (await page.locator("body").innerText()).match(/[^\n]*· página[^\n]*/)?.[0], "| canvases:", await page.locator(".react-pdf__Page__canvas").count(), "| camadas:", await page.locator(".react-pdf__Page__textContent").evaluateAll((els) => els.map((e) => e.textContent.slice(0, 30))));
  }
  return ok;
}
const estado = () => page.locator("[data-abertura-por-link]").first();
async function abrirLink(q) {
  await page.goto(`${BASE}/nexo?${q}`, { waitUntil: "domcontentloaded" });
}

// A01
for (const [id, esperado, botao] of [["ux-404", "nao-encontrada", "Voltar ao painel"], ["ux-403", "sem-acesso", "Voltar ao painel"], ["ux-rede", "rede", "Tentar de novo"]]) {
  await abrirLink(`auditoria=${id}`);
  await page.waitForFunction((e) => document.querySelector(`[data-abertura-por-link="${e}"]`), esperado, { timeout: 30000 }).catch(() => {});
  const v = await estado().getAttribute("data-abertura-por-link").catch(() => null);
  checar(v === esperado, `${id}: estado "${v}" (esperado ${esperado}), fora da saudação`);
  checar(await page.getByRole("button", { name: botao }).or(page.getByRole("link", { name: botao })).count() > 0, `${id}: saída "${botao}"`);
  if (id === "ux-404") await shot(page, "a01-404-1440");
}
await abrirLink("auditoria=ux-500");
await page.waitForFunction(() => document.querySelector('[data-abertura-por-link="temporaria"]'), null, { timeout: 30000 }).catch(() => {});
checar((await estado().getAttribute("data-abertura-por-link").catch(() => null)) === "temporaria", "500: falha temporária (não 'ainda rodando')");
await page.getByRole("button", { name: "Tentar de novo" }).click();
await page.locator('[data-tour="veredito-parecer"]').first().waitFor({ timeout: 30000 }).catch(() => {});
checar(await page.locator('[data-tour="veredito-parecer"]').count() > 0 && tentativas500 === 2, `tentar de novo depois do 500 abre o parecer (${tentativas500} consultas)`);

// G04: dois achados da mesma auditoria
for (const alvo of ["INC-002", "INC-005"]) {
  await page.evaluate(() => indexedDB.deleteDatabase("nexo"));
  await abrirLink(`auditoria=ux-ok&achado=${alvo}`);
  await page.locator(`[data-achado="${alvo}"]`).waitFor({ timeout: 30000 }).catch(() => {});
  const focados = await page.locator("[data-achado][data-em-foco]").evaluateAll((els) => els.map((e) => e.getAttribute("data-achado")));
  checar(focados.length === 1 && focados[0] === alvo, `link com achado=${alvo} destaca exatamente ele (${focados.join(",")})`);
  await page.waitForTimeout(1200);
  const visivel = await page.locator(`[data-achado="${alvo}"]`).evaluate((el) => { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; });
  checar(visivel, `${alvo} rolado até a vista`);
}
await shot(page, "g04-achado-especifico-1440");
await abrirLink("auditoria=ux-ok&achado=INC-999");
await page.locator("[data-achado-ausente]").waitFor({ timeout: 30000 }).catch(() => {});
checar(await page.locator("[data-achado-ausente]").count() === 1, "achado inexistente: aviso e a auditoria continua");

// A03: motor novo — revisão guardada abre, a outra fica indisponível
await abrirLink("auditoria=ux-ok&achado=INC-900");
const cartao = page.locator('[data-achado="INC-900"]');
await cartao.waitFor({ timeout: 30000 });
const abrirPag = cartao.getByRole("button", { name: /Abrir ux_memorial\.pdf, página 3/ });
checar(await abrirPag.count() === 1, "fonte do motor com revisão guardada: botão Abrir página 3");
checar((await cartao.innerText()).includes("Arquivo não disponível nesta tela: confira a página 1 de ux_orcamento.pdf"), "revisão NÃO guardada: indisponível, sem abrir outro arquivo");
await abrirPag.click();
const cab = await page.locator("text=/ux_memorial\.pdf · página 3/i").first().innerText({ timeout: 15000 }).catch(() => "");
checar(/revisão auditada/i.test(cab), `visor diz arquivo, página e critério: "${cab}"`);
checar(await textoDoVisor("MEMORIAL UX - pagina 3", "a03"), "visor mostra a página 3 DO MEMORIAL");
await shot(page, "a03-motor-abre-revisao-1440");
await page.getByRole("button", { name: "Fechar visor de PDF" }).click();

// Legado: achado do orçamento abre o ORÇAMENTO, não o memorial
await abrirLink("auditoria=ux-ok&achado=INC-007");
const c7 = page.locator('[data-achado="INC-007"]');
await c7.waitFor({ timeout: 30000 });
await c7.getByRole("button", { name: "Ver no documento" }).click();
checar(await textoDoVisor("ORCAMENTO UX - pagina 2", "orc"), "achado do orçamento abre o orçamento p.2");
await page.getByRole("button", { name: "Fechar visor de PDF" }).click();

// A02: sem blob local, o mapa "No documento" usa a MESMA fonte
await page.getByRole("button", { name: /No documento/ }).click();
await page.waitForTimeout(6000);
const miniaturas = await page.locator(".react-flow .react-pdf__Page__canvas").count();
checar(miniaturas >= 3, `mapa No documento renderiza miniaturas do PDF do servidor (${miniaturas})`);
await shot(page, "a02-mapa-pdf-servidor-1440");
checar(erros.length === 0, `sem erro de página (${erros.join(" | ").slice(0, 300)})`);
await browser.close();
fim();
