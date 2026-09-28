// T11 · T12 · G05 — fila de achados (busca, situação, responsável, ordem,
// seleção, anterior/próximo, visor em sequência), eixos Validade × Tratamento,
// conversa sob demanda com falhas visíveis e rascunho preservado, notificação
// por e-mail só depois de confirmar, e "Foco na revisão".
//
// Tudo contra rotas SIMULADAS no navegador (page.route): nenhuma linha do banco
// é escrita e nenhum e-mail sai. A auditoria "ux-t11" não existe no servidor.
import { BASE, abrir, login, checar, fim, shot } from "./lib.mjs";

import { simular, registro, controle, conversa, linha, MILTON } from "./achados-simulados.mjs";

const fila = (page) => page.locator("[data-item-da-fila]");
const refsDaFila = (page) => fila(page).evaluateAll((els) => els.map((e) => e.getAttribute("data-item-da-fila")));
const noDetalhe = (page) => page.locator("[data-detalhe-do-achado] [data-achado]").getAttribute("data-achado");
const ate = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 20000 }).then(() => true).catch(() => false);

// ---------------------------------------------------------------- G05 + T11
{
  const { browser, page, erros } = await abrir({ viewport: { width: 1280, height: 800 } });
  await login(page);
  await simular(page);
  await page.goto(`${BASE}/nexo?auditoria=ux-t11&achado=INC-002`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-achado="INC-002"]').waitFor({ timeout: 40000 });
  await ate(page, () => document.querySelector('[data-item-da-fila="INC-001"] [data-situacao-do-item]')?.textContent.includes("com você"));

  // G05 — foco na revisão
  const larguraDoPalco = () => page.locator(".nexo-shell__stage").evaluate((e) => Math.round(e.getBoundingClientRect().width));
  const antes = await larguraDoPalco();
  const composer = page.getByPlaceholder(/Escreva para o Nexo/);
  await composer.fill("rascunho do chat que não pode sumir");
  checar(!(await page.locator("[data-fila-de-achados]").isVisible()), `1280 sem foco: palco de ${antes}px mostra detalhe em sequência (fila atrás de "Voltar à lista")`);
  await shot(page, "a07-achados-1280-sequencia");
  await page.getByRole("button", { name: "Foco na revisão" }).click();
  const depois = await larguraDoPalco();
  checar(depois > antes + 600, `Foco na revisão: palco ${antes}px → ${depois}px`);
  checar(!(await page.locator(".nexo-shell__sidebar").isVisible()) && !(await page.locator(".nexo-shell__copilot").isVisible()), "projetos e chat recolhidos por botão nomeado");
  checar(await page.locator("[data-fila-de-achados]").isVisible(), "com foco, fila e detalhe lado a lado em 1280");
  await shot(page, "g05-foco-na-revisao-1280");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('[data-achado="INC-002"]').waitFor({ timeout: 40000 });
  checar(await page.locator(".nexo-shell[data-chat-recolhido][data-projetos-recolhidos]").count() === 1, "preferência de foco restaurada depois de recarregar");
  await page.getByRole("button", { name: "Mostrar chat" }).click();
  checar(await page.locator(".nexo-shell__copilot").isVisible(), "Mostrar chat devolve o chat");
  await page.getByRole("button", { name: "Ocultar chat" }).click();
  // rascunho do chat: sem recarregar, recolher e mostrar mantém o texto
  await page.getByRole("button", { name: "Mostrar chat" }).click();
  await composer.fill("rascunho do chat que não pode sumir");
  await page.getByRole("button", { name: "Ocultar chat" }).click();
  await page.getByRole("button", { name: "Mostrar chat" }).click();
  checar((await composer.inputValue()) === "rascunho do chat que não pode sumir", "chat recolhido e mostrado de novo mantém o rascunho");
  await page.getByRole("button", { name: "Ocultar chat" }).click();
  await ate(page, () => document.querySelector("[data-fila-de-achados]")?.checkVisibility());

  // T11 — contagens e busca
  checar((await fila(page).count()) === 9, `fila com os 9 achados (${await fila(page).count()})`);
  const rotulo = async (v) => (await page.locator(`[data-filtro-situacao="${v}"]`).innerText()).trim();
  checar((await rotulo("meus")) === "Meus pendentes (1)" && (await rotulo("sem-responsavel")) === "Sem responsável (5)" && (await rotulo("encerrados")) === "Encerrados (2)", `contagens por situação: ${await rotulo("meus")} · ${await rotulo("sem-responsavel")} · ${await rotulo("encerrados")}`);
  await page.getByLabel("Buscar achado").fill("inc-005");
  checar(JSON.stringify(await refsDaFila(page)) === '["INC-005"]', "busca por referência (sem caixa exata) acha só INC-005");
  checar((await page.locator("[data-mostrando]").innerText()).includes("Mostrando 1 de 9"), "contagem 'Mostrando 1 de 9'");
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  checar((await fila(page).count()) === 9 && (await page.getByLabel("Buscar achado").inputValue()) === "", "Limpar filtros em uma ação");
  await page.locator('[data-filtro-situacao="meus"]').click();
  checar(JSON.stringify(await refsDaFila(page)) === '["INC-001"]', "Meus pendentes = INC-001");
  checar((await page.locator('[data-filtro-situacao="meus"]').getAttribute("aria-pressed")) === "true", "filtro ativo anuncia aria-pressed");
  await page.locator('[data-filtro-situacao="encerrados"]').click();
  checar(JSON.stringify((await refsDaFila(page)).sort()) === '["INC-003","INC-004"]', "Encerrados = INC-003 e INC-004 (resolvidos continuam acessíveis)");
  await page.locator('[data-filtro-situacao="todos"]').click();
  await page.getByLabel("Responsável").selectOption("Milton Teste");
  checar(JSON.stringify(await refsDaFila(page)) === '["INC-002"]', "fila de uma pessoa: Milton = INC-002");
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await page.getByLabel("Ordem").selectOption("pagina");
  const paginas = await fila(page).evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-pagina"))));
  checar(paginas.every((p, i) => i === 0 || p >= paginas[i - 1]), `ordem por página: ${paginas.join(",")}`);
  await page.getByLabel("Ordem").selectOption("referencia");
  checar((await refsDaFila(page)).join(",") === "INC-001,INC-002,INC-003,INC-004,INC-005,INC-006,INC-007,INC-008,INC-900", "ordem por referência");

  // seleção em lote: escopo = filtrados; atribuir não manda e-mail
  await page.locator('[data-filtro-situacao="sem-responsavel"]').click();
  await page.getByRole("button", { name: "Selecionar os 5 filtrados para atribuir" }).click();
  checar(await page.getByText("5 achados selecionados").count() === 1, "barra diz quantos estão selecionados");
  await page.locator("#destinatario-do-envio").selectOption(MILTON);
  const atribuir = page.getByRole("button", { name: "Atribuir 5 achados a Milton Teste" });
  checar(await atribuir.count() === 1, "botão diz o efeito e o destinatário antes do clique");
  await shot(page, "a06-lote-1280");
  await atribuir.click();
  await page.getByText(/ninguém recebeu e-mail ainda/).waitFor({ timeout: 15000 }).catch(() => {});
  const ids = registro.atribuir[0]?.findingIds?.slice().sort().join(",");
  checar(ids === "INC-005,INC-006,INC-007,INC-008,INC-900", `lote enviado = exatamente os filtrados (${ids})`);
  checar(registro.avisarPost === 0 && (await page.getByText(/ninguém recebeu e-mail ainda/).count()) === 1, "atribuir não dispara e-mail e diz isso");
  await page.getByRole("button", { name: "Limpar filtros" }).click();

  // detalhe: anterior/próximo na ordem da fila
  await page.locator('[data-item-da-fila="INC-003"] button').click();
  checar((await noDetalhe(page)) === "INC-003", "clique na fila abre INC-003 no detalhe");
  await page.locator("[data-detalhe-do-achado]").getByRole("button", { name: "Próximo" }).click();
  checar((await noDetalhe(page)) === "INC-004" && (await page.locator("[data-posicao-do-achado]").innerText()) === "Achado 4 de 9", "Próximo → INC-004, 'Achado 4 de 9'");
  checar((await page.locator("[data-detalhe-do-achado] [data-tratamento-atual]").innerText()).includes("Decisão técnica"), "Tratamento mostra a decisão técnica");
  await page.getByRole("tab", { name: "Histórico" }).click();
  checar((await page.locator("[data-historico-do-achado]").innerText()).includes("Decisão técnica registrada por Carla Teste. Motivo: aprovado pelo CBM"), "Histórico: autor e motivo da decisão");
  await page.getByRole("tab", { name: "Evidência" }).click();

  // Validade × Tratamento
  await page.locator('[data-item-da-fila="INC-006"] button').click();
  await page.getByRole("button", { name: "Confirmar achado" }).click();
  await ate(page, () => document.querySelector("[data-detalhe-do-achado] [data-veredito-do-achado]")?.getAttribute("data-veredito-do-achado") === "CONFIRMED");
  const post = registro.feedbackPost.at(-1) ?? {};
  checar(post.verdict === "CONFIRMED" && !("resolved" in post) && !("resolutionKind" in post), `confirmar grava só a validade (${JSON.stringify(post)})`);
  checar((await page.locator("[data-detalhe-do-achado] [data-tratamento-atual]").innerText()).startsWith("Pendente"), "confirmar NÃO marca a obra como corrigida");

  // A09
  await page.getByRole("button", { name: "Mais ações" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 15000 }).catch(() => null),
    page.getByText("Exportar cartão do achado (PNG)").click(),
  ]);
  checar(download && download.suggestedFilename() === "nexodoc-achado-INC-006.png", `"Exportar cartão do achado (PNG)" baixa ${download?.suggestedFilename()}`);

  // A10 — visor em sequência
  await page.getByLabel("Situação").locator('[data-filtro-situacao="todos"]').click();
  await page.locator('[data-item-da-fila="INC-001"] button').click();
  await page.locator("[data-detalhe-do-achado]").getByRole("button", { name: "Ver no documento" }).click();
  await page.locator("[data-sequencia-do-visor]").waitFor({ timeout: 20000 });
  checar((await page.locator("[data-sequencia-do-visor]").innerText()).includes("Achado 1 de"), "visor diz 'Achado 1 de N'");
  await page.getByRole("button", { name: "Aumentar zoom" }).click();
  const mostrandoAntes = await page.locator("[data-mostrando]").getAttribute("data-mostrando");
  await page.getByRole("button", { name: "Próximo achado" }).click();
  await ate(page, () => document.querySelector("[data-sequencia-do-visor]")?.textContent.includes("Achado 2 de"));
  checar((await page.locator("[data-sequencia-do-visor]").innerText()).includes("INC-002"), "Próximo achado troca a evidência sem fechar o visor");
  checar((await noDetalhe(page)) === "INC-002", "o detalhe acompanha o visor");
  checar((await page.getByRole("button", { name: "Zoom de 100%" }).innerText()).trim() === "125%", "zoom preservado entre achados");
  checar((await page.locator("[data-mostrando]").getAttribute("data-mostrando")) === mostrandoAntes, "filtro preservado");
  await shot(page, "a10-visor-em-sequencia-1280");
  await page.getByRole("button", { name: "Fechar visor de PDF" }).click();

  // --------------------------------------------------------------- T12
  checar(registro.conversaGet === 0, `nenhuma conversa carregada só por abrir a fila (${registro.conversaGet} GET)`);
  await page.locator('[data-item-da-fila="INC-002"] button').click();
  const abaConversa = page.getByRole("tab", { name: /^Conversa/ });
  checar((await abaConversa.innerText()).trim() === "Conversa (3)", `aba mostra a contagem sem carregar: ${await abaConversa.innerText()}`);
  await abaConversa.click();
  await page.getByText("é a página 14").waitFor({ timeout: 15000 });
  // Em dev o React monta o efeito duas vezes (StrictMode); a primeira é descartada.
  checar(registro.conversaGet >= 1 && registro.conversaGet <= 2, `abrir a aba carrega só a conversa deste achado (${registro.conversaGet} GET)`);
  conversa.push(linha("Milton Teste", "resposta da outra sessão", 5));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  checar(await page.getByText("resposta da outra sessão").waitFor({ timeout: 15000 }).then(() => true).catch(() => false), "voltar à janela relê: comentário de outra sessão aparece");
  const campo = page.getByLabel("Comentário sobre este achado");
  await campo.fill("texto que não pode se perder");
  await page.getByRole("button", { name: "Publicar comentário" }).click();
  await page.locator("[data-erro-da-acao]").waitFor({ timeout: 15000 });
  checar((await page.locator("[data-erro-da-acao]").innerText()).includes("HTTP 500") && (await campo.inputValue()) === "texto que não pode se perder", "500 ao publicar: erro visível e rascunho no campo");
  await page.locator('[data-item-da-fila="INC-003"] button').click();
  await page.locator('[data-item-da-fila="INC-002"] button').click();
  checar((await page.getByLabel("Comentário sobre este achado").inputValue()) === "texto que não pode se perder", "rascunho sobrevive à troca de achado");
  controle.falharComentario = false;
  await page.getByRole("button", { name: "Publicar comentário" }).click();
  await page.getByText(/Comentário publicado/).waitFor({ timeout: 15000 });
  checar((await page.getByLabel("Comentário sobre este achado").inputValue()) === "" && (await abaConversa.innerText()).trim() === "Conversa (4)", "publicado: campo limpo e contagem 4");
  await page.getByLabel("Incluir alguém para acompanhar este achado").selectOption(MILTON);
  await page.locator("[data-erro-da-acao]").waitFor({ timeout: 15000 });
  checar((await page.locator("[data-erro-da-acao]").innerText()).includes("HTTP 403") && (await page.getByText(/passa a acompanhar/).count()) === 0, "403 ao incluir envolvido não parece sucesso");
  await shot(page, "a08-conversa-com-falha-1280");

  // notificação por e-mail: só depois de confirmar, e o resultado diz o transporte
  await page.getByRole("button", { name: "Notificar por e-mail (1)" }).click();
  checar(registro.avisarPost === 0, "abrir a notificação não envia nada");
  await page.getByRole("button", { name: "Notificar 1 pessoa por e-mail" }).click();
  await page.getByText(/Modo de desenvolvimento/).waitFor({ timeout: 15000 }).catch(() => {});
  checar(registro.avisarPost === 1 && (await page.getByText(/Nenhum e-mail saiu/).count()) === 1, "confirmar chama o aviso uma vez; transporte simulado dito na tela");

  checar(erros.length === 0, `sem erro de página (${erros.join(" | ")})`);
  await page.getByRole("button", { name: "Sair do foco" }).click();
  await browser.close();
}

// --------------------------------------------------- coluna estreita (1440)
{
  const { browser, page, erros } = await abrir({ viewport: { width: 1440, height: 1000 } });
  await login(page);
  await simular(page);
  await page.goto(`${BASE}/nexo?auditoria=ux-t11&achado=INC-005`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-achado="INC-005"]').waitFor({ timeout: 40000 });
  checar(!(await page.locator("[data-fila-de-achados]").isVisible()), "palco estreito: link abre direto no detalhe");
  await page.getByRole("button", { name: "Voltar à lista" }).click();
  checar(await page.locator("[data-fila-de-achados]").isVisible() && !(await page.locator("[data-detalhe-do-achado]").isVisible()), "Voltar à lista mostra a fila");
  await page.locator('[data-item-da-fila="INC-007"] button').click();
  checar((await noDetalhe(page)) === "INC-007" && (await page.locator("[data-detalhe-do-achado]").isVisible()), "escolher na fila volta ao detalhe");
  checar(erros.length === 0, "1440: sem erro de página");
  await browser.close();
}
fim();
