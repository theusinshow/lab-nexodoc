// Prova do TEXTO CORRIGIDO no navegador — o clique, a caixa, o copiar e o cache.
//
// Abre um achado pelo link do e-mail (`/nexo?auditoria=<id>&achado=<id>`),
// clica em "texto corrigido" e exige:
//   - a caixa aparece DENTRO da janela (medida, não só presente no DOM);
//   - "Copiar" põe na área de transferência exatamente o texto novo;
//   - depois do F5, a caixa reabre SEM nova chamada à rota (o texto está
//     gravado no achado).
//
// CUSTA CENTAVOS na primeira corrida contra um achado sem texto gravado — é uma
// chamada à IA. Nas seguintes o achado já tem o texto e não gasta nada.
//
//   TC_AUDITORIA=<auditId> TC_ACHADO=INC-003 node scripts/shot-texto-corrigido.mjs
import { chromium } from "playwright";
import { pularTourGuiado } from "./lib/sessao-de-teste.mjs";
import fs from "node:fs";

const BASE = process.env.SHOT_BASE ?? "http://localhost:3000";
const AUDITORIA = process.env.TC_AUDITORIA;
const ACHADO = process.env.TC_ACHADO ?? "INC-003";
const OUT = "./scratchpad/qa";
fs.mkdirSync(OUT, { recursive: true });

if (!AUDITORIA) {
  console.error("Informe TC_AUDITORIA=<id de uma auditoria concluída no banco de dev>.");
  process.exit(1);
}

let falhas = 0;
function check(nome, ok, detalhe = "") {
  if (ok) console.log(`  OK      ${nome}`);
  else {
    falhas++;
    console.error(`  FALHOU  ${nome}${detalhe ? ` :: ${detalhe}` : ""}`);
  }
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await context.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push(String(e)));
const chamadas = [];
page.on("response", async (r) => {
  if (r.url().includes("/api/audit/texto-corrigido")) {
    chamadas.push({ status: r.status(), corpo: await r.json().catch(() => null) });
  }
});

async function abrirAchado() {
  await page.goto(`${BASE}/nexo?auditoria=${AUDITORIA}&achado=${ACHADO}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: /Texto corrigido/i }).first().waitFor({ timeout: 60000 });
}

try {
  await pularTourGuiado(page);
  await page.goto(`${BASE}/nexo`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) {
    await page.getByRole("button", { name: /Entrar como dev/i }).click();
    await page.waitForURL("**/nexo**", { timeout: 60000 });
  }

  await abrirAchado();
  const botao = page.getByRole("button", { name: /Texto corrigido/i }).first();
  check("o botão começa fechado", (await botao.getAttribute("aria-expanded")) === "false");
  await botao.click();
  check("o botão diz que abriu", (await botao.getAttribute("aria-expanded")) === "true");

  const caixa = page.locator(`#${(await botao.getAttribute("aria-controls")).replace(/:/g, "\\:")}`);
  // O motivo do "sem troca" é escrito pela IA: espera-se o fim do "gerando", não uma frase.
  await caixa.waitFor({ timeout: 10000 });
  await caixa.getByText(/Gerando texto corrigido/i).waitFor({ state: "detached", timeout: 90000 });
  await page.screenshot({ path: `${OUT}/tc-2-caixa.png` });

  const texto = await caixa.innerText();
  console.log(`       caixa: ${texto.replace(/\s+/g, " ").slice(0, 220)}`);
  // Sem chamada nenhuma é o caso do texto já gravado no achado: vale também.
  const ultima = chamadas.at(-1)?.corpo?.texto ?? null;
  console.log(`       origem: ${chamadas.length ? "chamada à rota" : "texto já gravado no achado"}`);
  check(
    "a caixa mostra um resultado",
    texto.trim().length > 10 && (chamadas.length === 0 || Boolean(ultima)),
    JSON.stringify(chamadas.at(-1)),
  );

  // A caixa tem de estar NA JANELA — asserção de DOM passa com ela fora da tela.
  await caixa.scrollIntoViewIfNeeded();
  const r = await caixa.boundingBox();
  const vp = page.viewportSize();
  check(
    "a caixa aparece dentro da janela",
    Boolean(r) && r.width > 200 && r.height > 40 && r.x >= 0 && r.x + r.width <= vp.width,
    JSON.stringify(r),
  );

  const copiarNovo = caixa.getByRole("button", { name: /Copiar o texto corrigido/i });
  if (await copiarNovo.count()) {
    await copiarNovo.click();
    const colado = await page.evaluate(() => navigator.clipboard.readText());
    check(
      "Copiar leva só o texto novo",
      ultima ? colado === ultima.substitua_por : colado.length > 3 && texto.includes(colado),
      colado,
    );
    check("o botão confirma a cópia", /copiado/i.test(await caixa.innerText()));
  } else {
    console.log("       (sem troca — pulando o copiar)");
  }

  // O F5: o texto tem de estar gravado, e a caixa reabre sem chamar a rota.
  const antes = chamadas.length;
  await abrirAchado();
  await page.getByRole("button", { name: /Texto corrigido/i }).first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/tc-3-apos-f5.png` });
  const depois = chamadas.slice(antes);
  check(
    "depois do F5 não paga de novo",
    depois.length === 0 || depois.every((c) => c.corpo?.reaproveitado === true),
    JSON.stringify(depois),
  );

  check("nenhum erro de runtime", erros.length === 0, erros[0] ?? "");
} catch (e) {
  falhas++;
  console.error("EXPLODIU:", e.message);
  await page.screenshot({ path: `${OUT}/tc-erro.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  console.log(falhas === 0 ? "\nTudo OK" : `\n${falhas} falha(s)`);
  process.exit(falhas === 0 ? 0 : 1);
}
