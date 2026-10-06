// A MONTAGEM DE VOLUME, vista de ponta a ponta — para a revisão de UX/UI.
//
// Encenado: o OCR do carimbo e o turno do agente (sem gastar IA). REAL: a
// geração da capa/LD/separatriz. O plano vem SEM número do volume, para o
// campo âmbar aparecer, e com 2 tomos, para o canvas dividir.
//
//   npm run dev                          (noutro terminal)
//   node scripts/shot-montagem-ux.mjs
import { chromium } from "playwright";
import { pularTourGuiado } from "./lib/sessao-de-teste.mjs";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.SHOT_BASE ?? "http://localhost:3000";
const OUT = process.env.SHOT_OUT ?? "./scratchpad/qa-montagem-ux";
fs.mkdirSync(OUT, { recursive: true });

const PASTA = path.resolve("docs/samples/040-26/10_his_inc_spd/arquivos separados/1_his");
const PRANCHAS = [1, 2, 3, 4].map((i) => path.join(PASTA, `040_26_his_${String(i).padStart(3, "0")}_a.pdf`));
const OBRA = "REFORMA E AMPLIACAO - EMEB QA MONTAGEM UX";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });

await context.addInitScript(({ obra }) => {
  const original = window.fetch.bind(window);
  window.__TEMPLATE = "";
  window.fetch = async (entrada, init = {}) => {
    const url = typeof entrada === "string" ? entrada : entrada.url;
    if (url.includes("/api/ld/extract-stamp")) {
      const corpo = JSON.parse(init.body ?? "{}");
      const arquivo = corpo?.metadata?.fileName ?? "";
      const n = Number(/_(\d{3})_/.exec(arquivo)?.[1] ?? 1);
      return new Response(
        JSON.stringify({
          disciplina: "Hidrossanitario",
          folha: n,
          total: 4,
          numeroFolha: `${n}/4`,
          arquivo: `999_26_his_${String(n).padStart(3, "0")}_a`,
          conteudo: `PLANTA HIDROSSANITARIA ${n}`,
          cliente: "PREFEITURA MUNICIPAL DE CRICIUMA",
          secretaria: "SECRETARIA DE OBRAS",
          obra,
          fase: "PROJETO BASICO",
          tituloSecao: "PROJETO HIDROSSANITARIO",
          confianca: "alta",
          usage: { totalTokens: 0 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (url.includes("/api/nexo/agent")) {
      const enc = new TextEncoder();
      const corpo = new ReadableStream({
        start(controller) {
          const manda = (o) => controller.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`));
          manda({ type: "delta", text: "São 4 folhas de hidrossanitário. Proponho 2 tomos." });
          manda({
            type: "done",
            proposals: [
              { kind: "ld", resumo: "LD", params: { tituloLd: "PROJETO HIDROSSANITARIO", numTomos: 2, tomoInicial: 1 } },
              {
                kind: "capa",
                resumo: "Capa",
                params: { templateId: window.__TEMPLATE, tituloCapa: "PROJETO HIDROSSANITARIO", volume: "", numTomos: 2, tomoInicial: 1 },
              },
            ],
          });
          controller.close();
        },
      });
      return new Response(corpo, { status: 200, headers: { "Content-Type": "text/event-stream; charset=utf-8" } });
    }
    return original(entrada, init);
  };
}, { obra: OBRA });

const page = await context.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push(String(e)));

try {
  await pularTourGuiado(page);
  await page.goto(`${BASE}/nexo?nova=1`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) {
    await page.getByRole("button", { name: /Entrar como dev/i }).click();
    await page.waitForURL("**/nexo**", { timeout: 30000 });
  }
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(async () => {
    const r = await fetch("/api/capas/templates").then((x) => x.json());
    window.__TEMPLATE = (r.templates ?? []).find((t) => t.id === "pmcriciuma")?.id ?? "";
  });

  const [seletor] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: /Anexar PDFs/i }).first().click(),
  ]);
  await seletor.setFiles(PRANCHAS);
  await page.waitForTimeout(6000);
  const composer = page.locator("textarea").first();
  await composer.fill("Cria a LD e a capa");
  await composer.press("Enter");
  await page.getByText(/Vou gerar · \d+ documentos?/i).first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(2500);

  await page.screenshot({ path: `${OUT}/1-tela-antes-de-gerar.png` });
  const papel = page.locator('[data-prova="papel-da-capa"]').last();
  await papel.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/2-chat-papel.png` });
  await papel.screenshot({ path: `${OUT}/3-papel-zoom.png` });
  console.log("alturas das linhas da folha:", JSON.stringify(await papel.evaluate((el) => [...el.children].map((c) => {
    const r = c.getBoundingClientRect();
    const campo = c.querySelector("input,textarea");
    return [Math.round(r.height), campo ? `${campo.tagName}:${Math.round(campo.getBoundingClientRect().height)}:${getComputedStyle(campo).minHeight}` : ""];
  }))));
  const plano = papel.locator("xpath=ancestor::div[contains(@class,'rounded-md')][1]");
  await plano.screenshot({ path: `${OUT}/4-plano-inteiro.png` }).catch(() => {});

  const canvas = page.locator(".react-flow").first();
  await canvas.screenshot({ path: `${OUT}/5-canvas-antes.png` });

  // Decide o volume pelo botão abaixo da folha.
  const perguntas = page.locator('[data-prova="perguntas-antes-de-gerar"]').last();
  await perguntas.screenshot({ path: `${OUT}/5b-perguntas.png` }).catch(() => {});
  const campoVolume = perguntas.getByLabel(/qual volume/i);
  if (await campoVolume.count()) {
    await campoVolume.fill("3");
    await campoVolume.press("Enter");
  }
  await page.waitForTimeout(800);
  const semBairro = perguntas.getByRole("button", { name: /Não tem bairro/i });
  if (await semBairro.count()) await semBairro.click();
  await page.waitForTimeout(500);
  await perguntas.screenshot({ path: `${OUT}/5c-perguntas-respondidas.png` }).catch(() => {});
  await papel.screenshot({ path: `${OUT}/6-papel-com-volume.png` });

  if (process.env.SO_PAPEL) { await browser.close(); process.exit(0); }
  await page.getByRole("button", { name: /Gerar os? \d+|Gerar o \d+/i }).first().click();
  await page.getByText(/Gerado · \d+ documentos?/i).first().waitFor({ timeout: 240000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${OUT}/7-tela-depois-de-gerar.png` });
  await canvas.screenshot({ path: `${OUT}/8-canvas-depois.png` });
  const cabeca = page.locator('[data-prova="cabeca-do-tomo"]').first();
  if (await cabeca.count()) await cabeca.screenshot({ path: `${OUT}/9-cabeca-zoom.png` });
  const doca = page.locator('[data-prova="doca-da-entrega"]').first();
  if (await doca.count()) await doca.screenshot({ path: `${OUT}/10-doca.png` });

  const abaObra = page.getByRole("button", { name: "Obra", exact: true });
  if (await abaObra.count()) {
    await abaObra.click();
    await page.locator('[data-prova="vista-da-obra"]').waitFor({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await canvas.screenshot({ path: `${OUT}/11-obra.png` }).catch(() => page.screenshot({ path: `${OUT}/11-obra.png` }));
    await page.screenshot({ path: `${OUT}/12-tela-obra.png` });
  }
  console.log("prints em", OUT);
} catch (err) {
  console.error("FALHOU:", err);
  await page.screenshot({ path: `${OUT}/erro.png` }).catch(() => {});
  process.exitCode = 1;
} finally {
  if (erros.length) console.error("erros de página:", erros.slice(0, 5));
  await browser.close();
}
