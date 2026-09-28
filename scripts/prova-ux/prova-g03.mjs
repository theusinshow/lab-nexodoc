// G03 / T01 — ações do projeto, rotas legadas, contexto após login/F5, conflito.
import { BASE, abrir, login, sql, checar, fim, shot } from "./lib.mjs";

const projetos = await sql(`select id, code, name from "Project" where "organizationId"='org-prosul' and code in ('063-26','099-25') order by code`);
const [A, B] = [projetos.find((p) => p.code === "063-26"), projetos.find((p) => p.code === "099-25")];
checar(A && B, "dois projetos de teste existem");

async function gravarConversa(page, reg) {
  await page.evaluate(async (reg) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open("nexo"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    await new Promise((res, rej) => { const tx = db.transaction("conversations", "readwrite"); tx.objectStore("conversations").put(reg); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    db.close();
  }, reg);
}
const barra = (page) => page.locator("[data-projeto-da-conversa]").first();

// 1) Sem sessão: /ld?project=B -> login -> Nexo com projeto B e intenção LD
{
  const { browser, page, erros } = await abrir();
  await page.goto(`${BASE}/ld?project=${B.id}`, { waitUntil: "domcontentloaded" });
  checar(page.url().includes("/login"), `sem sessão, /ld cai no login (${page.url().slice(BASE.length, BASE.length + 60)})`);
  await page.getByRole("button", { name: /Entrar como dev/i }).click();
  await page.waitForURL("**/nexo**", { timeout: 60000 });
  await barra(page).waitFor({ timeout: 30000 }).catch(() => {});
  await page.waitForFunction(() => !location.search.includes("intencao"), null, { timeout: 15000 }).catch(() => {});
  const u = new URL(page.url());
  checar(u.searchParams.get("projeto") === B.id, `depois do login a URL mantém projeto B (${u.search})`);
  checar(await barra(page).count() === 1 && (await barra(page).getAttribute("data-projeto-da-conversa")) === B.id, "barra mostra o projeto B antes de qualquer processamento");
  checar((await barra(page).innerText()).includes(B.name), `barra cita o nome: ${(await barra(page).innerText()).replace(/\s+/g, " ")}`);
  const composer = page.getByRole("textbox").first();
  checar((await composer.inputValue().catch(() => "")).includes("cria a LD"), `composer com a intenção LD: "${await composer.inputValue().catch(() => "?")}"`);
  checar(!u.searchParams.has("intencao"), "intenção saiu da URL depois de aplicada (F5 não reescreve o composer)");
  await shot(page, "g03-ld-legado-1440");
  await browser.close();
  checar(erros.length === 0, `sem erro de página (${erros.join(" | ").slice(0, 200)})`);
}

// 2) Com sessão: 4 ações do detalhe do projeto B; nenhum 404
{
  const { browser, page } = await abrir();
  await login(page, `/projetos/${B.id}`);
  await page.goto(`${BASE}/projetos/${B.id}`, { waitUntil: "domcontentloaded" });
  const hrefs = await page.locator("a:not([data-navegacao-principal] a)").evaluateAll((as) => as.map((a) => [a.textContent.trim(), a.getAttribute("href")]).filter(([t]) => /Auditar documentos|Montar LD|Gerar capas|Montar volume/.test(t)));
  checar(hrefs.length >= 4, `quatro ações encontradas: ${hrefs.map(([t, h]) => `${t}→${h}`).join(" ; ")}`);
  const esperado = { "Auditar documentos": "auditar", "Montar LD": "ld", "Gerar capas": "capa" };
  for (const [t, h] of hrefs) {
    const r = await page.request.get(`${BASE}${h}`, { maxRedirects: 0 }).catch(() => null);
    checar(r && r.status() !== 404, `${t} não é 404 (${r?.status()})`);
    const chave = Object.keys(esperado).find((k) => t.startsWith(k));
    if (chave) checar(h.includes(`projeto=${B.id}`) && h.includes(`intencao=${esperado[chave]}`), `${t} leva projeto+intenção (${h})`);
    if (t.startsWith("Montar volume")) checar(h.includes(B.id), `Montar volume leva o projeto (${h})`);
  }
  // legados
  for (const [rota, int] of [["/ld", "ld"], ["/capas", "capa"], ["/audit", "auditar"]]) {
    const r = await page.request.get(`${BASE}${rota}?project=${B.id}`, { maxRedirects: 0 });
    const loc = r.headers()["location"] ?? "";
    checar(r.status() >= 300 && r.status() < 400 && loc.includes(`projeto=${B.id}`) && loc.includes(`intencao=${int}`), `${rota}?project= redireciona (${r.status()} → ${loc})`);
  }
  await browser.close();
}

// 3) T01: última conversa é do projeto A; link do projeto B não restaura A; F5 mantém B
{
  const { browser, page } = await abrir();
  await login(page);
  const idA = "ux-conv-a-" + Date.now();
  const agora = Date.now();
  await gravarConversa(page, { id: idA, title: "UX CONVERSA DO PROJETO A", createdAt: agora - 1000, updatedAt: agora, projectId: A.id, seloResults: [], results: [], messages: [{ id: "m1", role: "user", content: "trabalho no projeto A" }] });
  await page.evaluate((id) => localStorage.setItem("nexo:ultima-conversa", id), idA);
  await page.goto(`${BASE}/nexo`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);
  checar((await page.locator("body").innerText()).includes("trabalho no projeto A"), "controle: sem link, a última conversa (A) é restaurada");

  await page.goto(`${BASE}/nexo?projeto=${B.id}&intencao=capa`, { waitUntil: "domcontentloaded" });
  await barra(page).waitFor({ timeout: 30000 }).catch(() => {});
  await page.waitForFunction(() => location.search.includes("conversa="), null, { timeout: 15000 }).catch(() => {});
  checar(!(await page.locator("body").innerText()).includes("trabalho no projeto A"), "link do projeto B NÃO restaura a conversa do A");
  checar((await barra(page).getAttribute("data-projeto-da-conversa").catch(() => null)) === B.id, "barra: projeto B");
  const url1 = new URL(page.url());
  checar(url1.searchParams.get("conversa") && url1.searchParams.get("projeto") === B.id, `URL canônica após entrar: ${url1.search}`);
  await page.reload({ waitUntil: "domcontentloaded" });
  await barra(page).waitFor({ timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  checar((await barra(page).getAttribute("data-projeto-da-conversa").catch(() => null)) === B.id, "F5 mantém o projeto B");
  checar(!(await page.locator("body").innerText()).includes("trabalho no projeto A"), "F5 não volta ao A");
  await shot(page, "g03-projeto-b-apos-f5-1440");

  // 4) Conflito: conversa A pedida junto com projeto B
  await page.goto(`${BASE}/nexo?conversa=${idA}&projeto=${B.id}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  const corpo = await page.locator("body").innerText();
  checar(corpo.includes("Esta conversa é de outro projeto".toUpperCase()) || corpo.includes("Esta conversa é de outro projeto"), "conflito vira aviso");
  checar(corpo.includes("trabalho no projeto A"), "a conversa pedida abriu");
  const pid = await page.evaluate(async (id) => {
    const db = await new Promise((res) => { const r = indexedDB.open("nexo"); r.onsuccess = () => res(r.result); });
    return new Promise((res) => { const g = db.transaction("conversations").objectStore("conversations").get(id); g.onsuccess = () => res(g.result?.projectId); });
  }, idA);
  checar(pid === A.id, `vínculo da conversa A intacto no disco (${pid === A.id ? "A" : pid})`);
  await shot(page, "g03-conflito-1440");

  // 5) Projeto inexistente / sem acesso
  await page.goto(`${BASE}/nexo?projeto=nao-existe-123`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  checar((await page.locator("body").innerText()).toLowerCase().includes("projeto não encontrado"), "projeto inexistente: aviso, nada vinculado");
  checar(await barra(page).count() === 0, "sem barra de projeto para id não autorizado");
  await browser.close();
}
fim();
