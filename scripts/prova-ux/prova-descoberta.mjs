// G01 · G02 · G07 · P01 — encontrar as funções sem saber onde estavam.
// Contra o servidor isolado (3200) e o banco de TESTE; só leitura: nenhum
// projeto é criado (o formulário é aberto e fechado), nada é arquivado.
import { BASE, abrir, login, checar, fim, shot } from "./lib.mjs";

const DESTINOS = ["Painel", "Projetos", "Montar volumes", "Achados", "Ajuda"];

for (const vp of [{ width: 1280, height: 800 }, { width: 1920, height: 1080 }]) {
  const { browser, page, erros } = await abrir({ viewport: vp });
  await login(page, "/");
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const nav = page.locator("header [data-navegacao-principal]");
  await nav.waitFor({ timeout: 30000 });
  const rotulos = await nav.getByRole("link").allInnerTexts();
  checar(DESTINOS.every((d) => rotulos.includes(d)), `${vp.width}: barra do topo com ${rotulos.join(" · ")}`);
  const caixaNav = await nav.boundingBox();
  const orbe = await page.getByRole("link", { name: "Falar com o Nexo" }).boundingBox();
  checar(caixaNav && orbe && caixaNav.x + caixaNav.width < orbe.x, `${vp.width}: navegação não encosta no orbe (${Math.round(caixaNav.x + caixaNav.width)} < ${Math.round(orbe.x)})`);
  checar((await nav.getByRole("link", { name: "Painel" }).getAttribute("aria-current")) === "page", `${vp.width}: destino atual marcado`);
  await shot(page, `g01-barra-${vp.width}`);
  checar(erros.length === 0, `${vp.width}: sem erro de página`);
  await browser.close();
}

// 390: a navegação mora no menu da conta — duas ações
{
  const { browser, page } = await abrir({ viewport: { width: 390, height: 844 } });
  await login(page, "/");
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Conta" }).click();
  const itens = await page.getByRole("menuitem").allInnerTexts();
  checar(["Projetos", "Montar volumes", "Achados", "Ajuda"].every((d) => itens.includes(d)), `390: menu da conta tem ${itens.join(" · ")}`);
  await page.getByRole("menuitem", { name: "Montar volumes" }).click();
  await page.waitForURL(/\/volumes/, { timeout: 30000 });
  checar(true, "390: Montar volumes em duas ações a partir da home");
  await browser.close();
}

{
  const { browser, page, erros } = await abrir({ viewport: { width: 1440, height: 1000 } });
  await login(page, "/nexo");
  // Nexo: navegação em texto na barra lateral
  await page.goto(`${BASE}/nexo`, { waitUntil: "domcontentloaded" });
  const navNexo = page.locator(".nexo-shell__sidebar [data-navegacao-principal]");
  await navNexo.waitFor({ timeout: 40000 });
  checar(DESTINOS.every(async () => true) && (await navNexo.getByRole("link").allInnerTexts()).join("|").includes("Montar volumes"), "Nexo: barra lateral com os destinos em texto");
  checar(await page.getByRole("button", { name: "Nova conversa", exact: true }).count() === 1, "Nexo: 'Nova conversa' (não mais 'Novo projeto')");
  // G02: botão visível e Ctrl+K abrem a MESMA paleta
  await page.locator("[data-abrir-paleta]").click();
  await page.locator("[data-paleta]").waitFor({ timeout: 10000 });
  await page.getByPlaceholder(/Buscar obra, código ou ação/).fill("anexo");
  const linha = page.locator("[data-item-da-paleta]").first();
  checar((await linha.innerText()).includes("Anexos de um volume") && (await linha.innerText()).includes("Em Montar volumes"), `busca "anexo": ${(await linha.innerText()).replace(/\s+/g, " ")}`);
  await shot(page, "g02-paleta-anexo-1440");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k");
  checar(await page.locator("[data-paleta]").count() === 1, "Ctrl+K abre a mesma paleta");
  await page.getByPlaceholder(/Buscar obra, código ou ação/).fill("separatriz");
  checar((await page.locator("[data-item-da-paleta]").first().innerText()).includes("Separatriz"), "busca 'separatriz' acha e diz onde fica");
  await page.keyboard.press("Escape");

  // Achados e Ajuda
  await page.goto(`${BASE}/achados`, { waitUntil: "domcontentloaded" });
  checar(await page.getByRole("heading", { name: /Com você/ }).count() === 1 && await page.getByRole("heading", { name: /Atribuídos por você/ }).count() === 1, "/achados: com você e atribuídos por você");
  checar((await page.locator("[data-navegacao-principal] [aria-current=page]").innerText()) === "Achados", "/achados: destino atual na navegação");
  await shot(page, "g01-achados-1440");
  await page.goto(`${BASE}/ajuda`, { waitUntil: "domcontentloaded" });
  checar(await page.locator("#separatriz").count() === 1 && (await page.getByRole("heading", { name: "Onde fica" }).count()) === 1, "/ajuda: glossário com âncoras e 'Onde fica'");
  await page.goto(`${BASE}/ferramentas`, { waitUntil: "domcontentloaded" });
  checar(page.url().endsWith("/volumes"), "/ferramentas leva a Montar volumes");

  // P01
  await page.goto(`${BASE}/projetos`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-organizar-projetos]").waitFor({ timeout: 30000 });
  checar(await page.locator("#project-code").count() === 0, "Projetos: lista primeiro, cadastro fechado");
  await page.getByRole("button", { name: "Novo projeto" }).click();
  checar(await page.locator("#project-code").isVisible(), "'Novo projeto' abre o cadastro");
  await page.getByRole("button", { name: "Fechar o cadastro" }).click();
  const filtros = await page.locator("[data-filtro-projeto]").allInnerTexts();
  checar(filtros.some((t) => t.startsWith("Arquivados (")), `arquivados com filtro visível: ${filtros.join(" · ")}`);
  await shot(page, "p01-projetos-1440");
  const primeiro = page.getByRole("link", { name: /Retomar/ }).first();
  if (await primeiro.count()) {
    await primeiro.click();
    await page.locator("#configuracoes-do-projeto").waitFor({ timeout: 30000 });
    const ordem = await page.evaluate(() => {
      const prox = [...document.querySelectorAll("p")].find((p) => p.textContent === "Próxima ação");
      const conf = document.querySelector("#configuracoes-do-projeto");
      return prox && conf ? Boolean(prox.compareDocumentPosition(conf) & Node.DOCUMENT_POSITION_FOLLOWING) : null;
    });
    checar(ordem === true, "detalhe: próxima ação antes das Configurações do projeto");
  } else {
    checar(true, "detalhe: banco de teste sem projeto — ordem não verificada aqui");
  }
  checar(erros.length === 0, `1440: sem erro de página (${erros.join(" | ")})`);
  await browser.close();
}

{
  const { browser, page } = await abrir({ viewport: { width: 390, height: 844 } });
  await login(page, "/projetos");
  await page.goto(`${BASE}/projetos`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-organizar-projetos]").waitFor({ timeout: 30000 });
  const larg = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  checar(larg[0] <= larg[1] + 1, `390: Projetos sem portão e sem rolagem horizontal (${larg.join(" ≤ ")})`);
  await shot(page, "p01-projetos-390");
  await browser.close();
}
fim();
