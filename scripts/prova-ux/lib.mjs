// Utilidades das provas UX/UI (servidor isolado na 3200, banco da bateria).
import { chromium } from "playwright";
import pg from "pg";
import fs from "node:fs";
import { urlDaBateria } from "../bateria/lib/ambiente.mjs";
import { pularTourGuiado } from "../lib/sessao-de-teste.mjs";

export const BASE = process.env.UX_BASE ?? "http://127.0.0.1:3200";
export const EVID = "docs/auditoria/execucao-ux-ui-claude-code/evidencias";
fs.mkdirSync(EVID, { recursive: true });

export async function sql(q, params = []) {
  const url = new URL(urlDaBateria());
  url.searchParams.delete("channel_binding");
  const c = new pg.Client({ connectionString: url.toString() });
  await c.connect();
  try { return (await c.query(q, params)).rows; } finally { await c.end(); }
}

export async function abrir({ viewport = { width: 1440, height: 1000 }, tour = false } = {}) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  if (!tour) await pularTourGuiado(page);
  return { browser, context, page, erros };
}

export async function login(page, destino = "/nexo") {
  await page.goto(`${BASE}${destino}`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) {
    await page.getByRole("button", { name: /Entrar como dev/i }).click();
    await page.waitForTimeout(3000);
    await page.waitForLoadState("domcontentloaded");
  }
}

let falhas = 0;
export function checar(cond, msg) {
  console.log(`${cond ? "  ok " : "FALHA"}  ${msg}`);
  if (!cond) falhas++;
}
export function fim() {
  console.log(falhas ? `\n${falhas} FALHA(S)` : "\nTUDO OK");
  process.exitCode = falhas ? 1 : 0;
}
export const shot = (page, nome) => page.screenshot({ path: `${EVID}/${nome}.png` });
