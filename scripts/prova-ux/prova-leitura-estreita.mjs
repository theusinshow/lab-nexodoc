// G06 — link de achado aberto em tela estreita: ler a evidência, abrir o
// documento, julgar e tratar o achado, voltar à lista. 390×844 e o equivalente
// a zoom de 200% num notebook (640×400 com DPR 2). Rotas simuladas.
import { chromium } from "playwright";
import { BASE, login, checar, fim, shot } from "./lib.mjs";
import { simular, registro } from "./achados-simulados.mjs";
import { pularTourGuiado } from "../lib/sessao-de-teste.mjs";

for (const caso of [
  { nome: "390", viewport: { width: 390, height: 844 }, dpr: 3 },
  { nome: "1280-zoom200", viewport: { width: 640, height: 400 }, dpr: 2 },
]) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: caso.viewport, deviceScaleFactor: caso.dpr, hasTouch: caso.nome === "390" });
  const page = await ctx.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  await pularTourGuiado(page);
  await login(page);
  await simular(page);
  await page.goto(`${BASE}/nexo?auditoria=ux-t11&achado=INC-002`, { waitUntil: "domcontentloaded" });
  const detalhe = page.locator('[data-detalhe-do-achado] [data-achado="INC-002"]');
  const abriu = await detalhe.waitFor({ timeout: 45000 }).then(() => true).catch(() => false);
  checar(abriu && (await page.getByText("O Nexo pede uma tela maior").isVisible()) === false, `${caso.nome}: o link abre o achado, não o recado de tela maior`);
  checar(await page.locator(".nexo-shell__nota-estreita").isVisible(), `${caso.nome}: diz o que dá para fazer nesta tela`);
  const larg = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  checar(larg[0] <= larg[1] + 1, `${caso.nome}: sem rolagem horizontal (${larg.join(" ≤ ")})`);
  await detalhe.scrollIntoViewIfNeeded();
  await shot(page, `g06-achado-${caso.nome}`);

  // ler a evidência e abrir o documento
  await page.locator("[data-detalhe-do-achado]").getByRole("button", { name: "Ver no documento" }).click();
  const pdf = await page.waitForFunction(() => [...document.querySelectorAll(".react-pdf__Page__textContent")].some((x) => x.textContent.includes("MEMORIAL UX")), null, { timeout: 45000 }).then(() => true).catch(() => false);
  checar(pdf, `${caso.nome}: visor abre o memorial na página do achado`);
  await shot(page, `g06-visor-${caso.nome}`);
  await page.getByRole("button", { name: "Fechar visor de PDF" }).click();

  // julgar (Validade) e tratar (Tratamento)
  const antes = registro.feedbackPost.length;
  const confirmar = page.locator("[data-detalhe-do-achado]").getByRole("button", { name: "Confirmar achado" });
  await confirmar.scrollIntoViewIfNeeded();
  await confirmar.click();
  await page.waitForTimeout(800);
  checar(registro.feedbackPost.length === antes + 1 && registro.feedbackPost.at(-1).verdict === "CONFIRMED", `${caso.nome}: Confirmar achado alcançável e gravado`);
  const conversa = page.getByRole("tab", { name: /^Conversa/ });
  await conversa.scrollIntoViewIfNeeded();
  await conversa.click();
  checar(await page.getByLabel("Comentário sobre este achado").isVisible(), `${caso.nome}: conversa alcançável`);

  // voltar à lista e escolher outro
  await page.getByRole("button", { name: "Voltar à lista" }).click();
  await page.locator('[data-item-da-fila="INC-005"] button').click();
  checar((await page.locator("[data-detalhe-do-achado] [data-achado]").getAttribute("data-achado")) === "INC-005", `${caso.nome}: Voltar à lista e abrir outro achado`);
  checar(erros.length === 0, `${caso.nome}: sem erro de página (${erros.join(" | ")})`);
  await browser.close();
}

// Sem link de parecer, o Nexo estreito continua dizendo que pede tela maior.
{
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await pularTourGuiado(page);
  await login(page);
  await page.goto(`${BASE}/nexo`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  checar(await page.getByText("O Nexo pede uma tela maior").isVisible(), "390 sem parecer: recado de tela maior continua (montar/gerar)");
  await browser.close();
}
fim();
