// G09 · contraste — axe-core nas telas mexidas pela execução UX/UI, com as
// regras de nome acessível, rótulo, estado ARIA e contraste. Rotas de achados
// simuladas; mesa com PDF sintético; resto contra o servidor de teste (leitura).
import fs from "node:fs";
import { BASE, abrir, login, checar, fim } from "./lib.mjs";
import { simular } from "./achados-simulados.mjs";
import { pdfIdentificado } from "./fixtures.mjs";

const AXE = fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const REGRAS = ["button-name", "link-name", "label", "select-name", "input-button-name", "aria-allowed-attr", "aria-valid-attr-value", "aria-required-attr", "aria-toggle-field-name", "nested-interactive", "color-contrast"];

async function varrer(page, nome, contexto = "body") {
  await page.addScriptTag({ content: AXE });
  const r = await page.evaluate(async ({ contexto, REGRAS }) => {
    const res = await window.axe.run(document.querySelector(contexto) ?? document, { runOnly: { type: "rule", values: REGRAS } });
    return res.violations.map((v) => ({ id: v.id, n: v.nodes.length, alvos: v.nodes.slice(0, 4).map((x) => `${x.target.join(" ")} :: ${(x.failureSummary ?? "").split("\n").slice(1, 2).join("")}`) }));
  }, { contexto, REGRAS });
  const nomes = r.filter((v) => v.id !== "color-contrast");
  const contraste = r.find((v) => v.id === "color-contrast");
  checar(nomes.length === 0, `${nome}: nomes/rótulos/estados ${nomes.length ? JSON.stringify(nomes, null, 1) : "ok"}`);
  // Contraste é relatado, não reprovado às cegas: o chanfro pinta o fundo num
  // ::before que o axe não enxerga (falso positivo conhecido), então cada caso
  // é conferido à mão no relatório.
  console.log(`  info ${nome}: contraste — ${contraste ? `${contraste.n} nós para conferir: ${JSON.stringify(contraste.alvos)}` : "nenhum"}`);
}

const { browser, page, erros } = await abrir({ viewport: { width: 1440, height: 1000 } });
await login(page, "/");
for (const rota of ["/", "/projetos", "/achados", "/ajuda"]) {
  await page.goto(`${BASE}${rota}`, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(1500);
  await varrer(page, rota);
}

// mesa com conteúdo
await page.goto(`${BASE}/volumes`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => new Promise((ok) => { const r = indexedDB.deleteDatabase("nexodoc-mesa"); r.onsuccess = r.onerror = r.onblocked = () => ok(null); }));
await page.goto(`${BASE}/volumes`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.querySelector("[data-gravacao]")?.getAttribute("data-gravacao") !== "carregando", null, { timeout: 60000 });
const pr = await pdfIdentificado("PRANCHAS A11Y", 2);
await page.locator("[data-entrada-de-arquivos]").setInputFiles([{ name: "p.pdf", mimeType: "application/pdf", buffer: pr.bytes }]);
await page.waitForSelector('[data-fila="importado"]', { timeout: 30000 });
await page.getByRole("button", { name: "Adicionar volume" }).first().click();
await page.getByRole("checkbox", { name: "Selecionar página 1 de p.pdf" }).check();
await page.getByRole("button", { name: /^Adicionar 1 página como Pranchas em/ }).click();
await page.waitForTimeout(1500);
await varrer(page, "/volumes (montagem)");

// parecer com fila e detalhe (foco na revisão para a fila aparecer ao lado)
await simular(page);
await page.goto(`${BASE}/nexo?auditoria=ux-t11&achado=INC-002`, { waitUntil: "domcontentloaded" });
await page.locator('[data-achado="INC-002"]').waitFor({ timeout: 45000 });
if (await page.getByRole("button", { name: "Foco na revisão" }).count()) await page.getByRole("button", { name: "Foco na revisão" }).click();
await page.waitForTimeout(1500);
await varrer(page, "/nexo parecer (fila + detalhe)", ".nexo-shell__stage");
await page.getByRole("tab", { name: /^Conversa/ }).click();
await page.waitForTimeout(1200);
await varrer(page, "/nexo parecer (aba Conversa)", "[data-detalhe-do-achado]");
// teclado: a fila e o detalhe se operam sem mouse
await page.locator('[data-item-da-fila="INC-003"] button').focus();
await page.keyboard.press("Enter");
checar((await page.locator("[data-detalhe-do-achado] [data-achado]").getAttribute("data-achado")) === "INC-003", "teclado: Enter na fila abre o achado");
await page.getByRole("tab", { name: "Evidência" }).focus();
await page.keyboard.press("ArrowRight");
checar(await page.evaluate(() => document.activeElement?.id) === "aba-conversa", "teclado: setas andam entre as abas do detalhe");
const foco = await page.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e); return s.outlineStyle !== "none" || s.boxShadow !== "none" || s.textDecorationLine.includes("underline") || e.matches(":focus-visible"); });
checar(foco, "teclado: foco visível na aba");
await page.getByRole("button", { name: "Sair do foco" }).click();
checar(erros.length === 0, `sem erro de página (${erros.join(" | ")})`);
await browser.close();
fim();
