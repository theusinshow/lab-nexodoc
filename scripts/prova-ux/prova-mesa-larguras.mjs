// V04 — a mesa nas quatro larguras (e no equivalente a 200% de zoom): cada
// área alcançável, nenhuma com altura zero, sem rolagem horizontal da página.
import { BASE, abrir, login, checar, fim, shot } from "./lib.mjs";
import { pdfIdentificado } from "./fixtures.mjs";

const pr = await pdfIdentificado("PRANCHAS UX", 3);
const LARGURAS = [
  { nome: "1920", viewport: { width: 1920, height: 1080 } },
  { nome: "1440", viewport: { width: 1440, height: 1000 } },
  { nome: "1280", viewport: { width: 1280, height: 800 } },
  { nome: "390", viewport: { width: 390, height: 844 } },
  // Zoom real de 200% num notebook 1280×800 = viewport CSS 640×400 com DPR 2.
  { nome: "1280-zoom200", viewport: { width: 640, height: 400 }, dpr: 2 },
];

for (const l of LARGURAS) {
  const { browser, page, erros } = await abrir({ viewport: l.viewport });
  if (l.dpr) {
    await browser.close();
  }
  const ctx = l.dpr ? await (await import("playwright")).chromium.launch().then((b) => b.newContext({ viewport: l.viewport, deviceScaleFactor: l.dpr }).then((c) => ({ b, c }))) : null;
  const p = ctx ? await ctx.c.newPage() : page;
  if (ctx) await p.addInitScript(() => localStorage.setItem("nexo:tour-visto", "1"));
  await login(p, "/volumes");
  await p.goto(`${BASE}/volumes`, { waitUntil: "domcontentloaded" });
  await p.evaluate(() => new Promise((ok) => { const r = indexedDB.deleteDatabase("nexodoc-mesa"); r.onsuccess = r.onerror = r.onblocked = () => ok(null); }));
  await p.goto(`${BASE}/volumes`, { waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => document.querySelector("[data-gravacao]")?.getAttribute("data-gravacao") !== "carregando", null, { timeout: 60000 });

  const abaVisivel = async (nome) => {
    const aba = p.getByRole("tab", { name: new RegExp(`^${nome}`) });
    if ((await aba.count()) && (await aba.isVisible())) await aba.click();
  };
  // Arquivos → importar
  await abaVisivel("Arquivos");
  await p.locator("[data-entrada-de-arquivos]").setInputFiles([{ name: "p.pdf", mimeType: "application/pdf", buffer: pr.bytes }]);
  await p.waitForSelector('[data-fila="importado"]', { timeout: 30000 });
  const hArquivos = await p.locator("#area-arquivos").evaluate((e) => e.getBoundingClientRect().height);
  // Montagem → volume
  await abaVisivel("Montagem");
  await p.getByRole("button", { name: "Adicionar volume" }).first().click();
  const hMontagem = await p.locator("#area-montagem").evaluate((e) => e.getBoundingClientRect().height);
  await abaVisivel("Arquivos");
  await p.getByRole("checkbox", { name: "Selecionar página 1 de p.pdf" }).check();
  await p.getByRole("button", { name: /^Adicionar 1 página como Pranchas em/ }).click();
  await abaVisivel("Montagem");
  await p.getByLabel("Nome final do PDF").fill("x.pdf");
  // Conferência → exportar alcançável
  await abaVisivel("Conferência");
  const exportar = p.getByRole("button", { name: /^Gerar PDF/ });
  await exportar.scrollIntoViewIfNeeded();
  const hConf = await p.locator("#area-conferencia").evaluate((e) => e.getBoundingClientRect().height);
  const alcancavel = await exportar.isVisible() && (await exportar.isEnabled());
  const larguraDoc = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  checar(hArquivos > 100 && hMontagem > 100 && hConf > 100, `${l.nome}: nenhuma área com altura zero (arquivos ${Math.round(hArquivos)}, montagem ${Math.round(hMontagem)}, conferência ${Math.round(hConf)})`);
  checar(alcancavel, `${l.nome}: importar, montar, conferir e exportar alcançáveis`);
  checar(larguraDoc.sw <= larguraDoc.iw + 1, `${l.nome}: sem rolagem horizontal (${larguraDoc.sw} ≤ ${larguraDoc.iw})`);
  await p.screenshot({ path: `docs/auditoria/execucao-ux-ui-claude-code/evidencias/v04-mesa-${l.nome}.png`, fullPage: false });
  checar(erros.length === 0, `${l.nome}: sem erro de página`);
  if (ctx) await ctx.b.close();
  else await browser.close();
}
fim();
