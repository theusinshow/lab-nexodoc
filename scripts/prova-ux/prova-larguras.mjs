// T14 — páginas da navegação nas quatro larguras e no zoom de 200% (640×400,
// DPR 2): sem rolagem horizontal e com a navegação principal alcançável (na
// barra ou no menu da conta). Só leitura, banco de teste.
import { chromium } from "playwright";
import { BASE, login, checar, fim, EVID } from "./lib.mjs";
import { pularTourGuiado } from "../lib/sessao-de-teste.mjs";

const LARGURAS = [
  { nome: "1920", viewport: { width: 1920, height: 1080 }, dpr: 1 },
  { nome: "1440", viewport: { width: 1440, height: 1000 }, dpr: 1 },
  { nome: "1280", viewport: { width: 1280, height: 800 }, dpr: 1 },
  { nome: "390", viewport: { width: 390, height: 844 }, dpr: 3 },
  { nome: "zoom200", viewport: { width: 640, height: 400 }, dpr: 2 },
];
const ROTAS = ["/", "/projetos", "/achados", "/ajuda"];

for (const l of LARGURAS) {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: l.viewport, deviceScaleFactor: l.dpr })).newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  await pularTourGuiado(page);
  await login(page, "/");
  for (const rota of ROTAS) {
    await page.goto(`${BASE}${rota}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1800);
    const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    const navVisivel = await page.locator("[data-navegacao-principal]").evaluateAll((els) => els.some((e) => e.checkVisibility()));
    const conta = await page.getByRole("button", { name: "Conta" }).count();
    checar(sw <= iw + 1 && (navVisivel || conta > 0), `${l.nome} ${rota}: sem rolagem horizontal (${sw} ≤ ${iw}); navegação ${navVisivel ? "visível" : "no menu da conta"}`);
    if (rota === "/projetos" || rota === "/achados") await page.screenshot({ path: `${EVID}/t14-${rota.slice(1)}-${l.nome}.png` });
  }
  checar(erros.length === 0, `${l.nome}: sem erro de página`);
  await browser.close();
}
fim();
