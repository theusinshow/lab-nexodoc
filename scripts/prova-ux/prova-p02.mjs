// P02 / T13 — estados do admin: sem token, carregando, negado, servidor, rede, vazio, sucesso.
import { BASE, abrir, login, checar, fim, shot } from "./lib.mjs";

const TELAS = ["/admin", "/admin/dinheiro", "/admin/motor", "/admin/pessoas", "/admin/dados"];
const PROIBIDO = /Sem DATABASE_URL|sem DATABASE_URL|Nenhum usuário encontrado|Nenhuma conversa no servidor|Nenhuma auditoria encontrada|cotação não declarada|meta não declarada|Nenhum custo retornado|Nenhum modelo retornado/;

const { browser, context, page, erros } = await abrir();
await login(page, "/admin");

async function comToken(valor) {
  await page.evaluate((v) => (v ? sessionStorage.setItem("nexodoc-admin-token", v) : sessionStorage.removeItem("nexodoc-admin-token")), valor);
}
async function ir(rota) {
  await page.goto(`${BASE}${rota}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
}

// 1) sem token
await comToken(null);
for (const rota of TELAS) {
  await ir(rota);
  const corpo = await page.locator("main").innerText();
  checar(await page.locator('[data-carga="sem-token"]').count() > 0, `${rota}: diz que nada foi consultado`);
  checar(!PROIBIDO.test(corpo), `${rota}: não afirma vazio/configuração sem resposta (${(corpo.match(PROIBIDO) ?? [""])[0]})`);
  const numeros = await page.locator("p.font-mono.tabular-nums").allInnerTexts();
  checar(!numeros.includes("0"), `${rota}: nenhuma métrica em zero antes da carga (${numeros.join(",")})`);
  if (rota === "/admin/dinheiro") await shot(page, "p02-dinheiro-sem-token-1440");
}

// 2) token errado → negado
await comToken("token-errado");
await ir("/admin/pessoas");
checar(await page.locator('[data-falha="negado"]').count() > 0, "token errado: recusa explícita (negado)");
checar(!/Nenhum usuário encontrado/.test(await page.locator("main").innerText()), "token errado: não diz 'nenhum usuário'");

// 3) token certo → sucesso
await comToken("ux-token-teste");
await ir("/admin/pessoas");
await page.locator("tbody tr td").filter({ hasText: "@" }).first().waitFor({ timeout: 20000 }).catch(() => {});
checar(await page.locator("[data-carga]").count() === 0, "token certo: sem aviso de carga");
checar((await page.locator("main").innerText()).includes("ux@nexodoc.local"), "token certo: lista as pessoas do banco de teste");
await shot(page, "p02-pessoas-ok-1440");

// 4) servidor 500 com dados anteriores? primeiro sem dados: 500 direto
await page.route("**/api/admin/users?*", (r) => r.fulfill({ status: 500, json: { error: "falha simulada" } }));
await ir("/admin/pessoas");
checar(await page.locator('[data-falha="servidor"]').count() > 0, "500: falha de servidor explícita");
checar((await page.locator('[data-carga="erro"]').innerText()).includes("falha simulada"), "500: mostra o motivo do servidor");
await page.unroute("**/api/admin/users?*");
await page.getByRole("button", { name: "Tentar de novo" }).first().click();
await page.waitForTimeout(2500);
checar(await page.locator('[data-carga="erro"]').count() === 0 && (await page.locator("main").innerText()).includes("ux@nexodoc.local"), "tentar de novo recupera");

// 5) rede caída com dados já na tela: dados ficam + horário
await page.route("**/api/admin/users?*", (r) => r.abort("internetdisconnected"));
await page.getByRole("button", { name: "Filtrar" }).click();
await page.waitForTimeout(1500);
checar(await page.locator('[data-falha="rede"]').count() > 0, "rede: falha de rede explícita");
checar((await page.locator('[data-carga="erro"]').innerText()).includes("anteriores à falha"), "rede: dados antigos ficam, com horário");
checar((await page.locator("main").innerText()).includes("ux@nexodoc.local"), "rede: lista anterior continua visível");
await shot(page, "p02-pessoas-rede-com-dados-antigos-1440");
await page.unroute("**/api/admin/users?*");

// 6) carregando
await page.route("**/api/admin/quality*", async (r) => { await new Promise((ok) => setTimeout(ok, 4000)); await r.continue().catch(() => {}); });
await page.goto(`${BASE}/admin/motor`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
checar(await page.locator('[data-carga="carregando"]').count() > 0, "lento: estado carregando visível");
await page.unroute("**/api/admin/quality*");

// 7) vazio confirmado
await page.route("**/api/admin/lds?*", (r) => r.fulfill({ json: { lds: [] } }));
await ir("/admin/dados");
checar(/nenhuma ld/i.test(await page.locator("main").innerText()), "resposta vazia válida: agora sim 'Nenhuma LD'");
await page.unroute("**/api/admin/lds?*");

checar(erros.length === 0, `sem erro de página (${erros.join(" | ").slice(0, 200)})`);
await browser.close();
fim();
