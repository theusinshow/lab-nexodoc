// Prova do protótipo navegável: anda pelos fluxos como uma pessoa e anota onde caiu.
import { chromium } from "playwright";

const S = process.argv[2];
const BASE = "http://localhost:3200/prototipo";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const erros = [];
p.on("pageerror", (e) => erros.push(`[pageerror] ${e.message.slice(0, 160)}`));
p.on("console", (m) => m.type() === "error" && !/Download the React DevTools|favicon/.test(m.text()) && erros.push(`[console] ${m.text().slice(0, 160)}`));

const rota = () => p.evaluate(() => location.hash);
const passo = async (nome, fn) => {
  try {
    await fn();
    await p.waitForTimeout(700);
    console.log("ok  ", nome.padEnd(46), await rota());
  } catch (e) {
    console.log("FALHOU", nome.padEnd(44), await rota(), String(e.message).split("\n")[0].slice(0, 120));
  }
};
const clicar = (sel, opt) => p.locator(sel).first().click({ timeout: 6000, ...opt });

await p.goto(BASE, { waitUntil: "networkidle", timeout: 120000 });
await p.waitForTimeout(1500);
await p.screenshot({ path: `${S}/pt-01-entrada.png` });

await passo("Entrar com Google leva ao Início", async () => {
  await clicar("button.en-google");
  await p.waitForFunction(() => location.hash.startsWith("#/inicio"), null, { timeout: 6000 });
});
await p.screenshot({ path: `${S}/pt-02-inicio.png` });
await passo("Tarefa Auditar, soltar o arquivo", async () => {
  await clicar(".d2-tarefa");
  await clicar(".d2-soltar");
});
await passo("Ação principal leva à Auditoria (enviando)", async () => {
  await clicar(".d2-recebido .ds-btn--primary");
  await p.waitForFunction(() => location.hash.startsWith("#/auditoria/enviando"), null, { timeout: 4000 });
});
await passo("Enviando vira Em curso sozinho", async () => {
  await p.waitForFunction(() => location.hash === "#/auditoria/em-curso", null, { timeout: 6000 });
});
await p.screenshot({ path: `${S}/pt-03-auditoria.png` });
await passo("Painel do protótipo: situação Concluída", async () => {
  await clicar(".pt-pilula");
  await clicar('.pt-chips button:has-text("Concluída")');
  await p.keyboard.press("Escape");
});
await passo("Abrir o resultado", async () => {
  await clicar('button:has-text("Abrir o resultado")');
  await p.waitForFunction(() => location.hash.startsWith("#/resultado"), null, { timeout: 4000 });
});
await p.screenshot({ path: `${S}/pt-04-resultado.png` });
await passo("Voltar do navegador volta à auditoria", async () => {
  await p.goBack();
  await p.waitForFunction(() => location.hash.startsWith("#/auditoria"), null, { timeout: 4000 });
  await p.goForward();
});
await passo("Barra de cima: Projetos", async () => clicar('.pn-nav a:has-text("Projetos")'));
await passo("Projetos: escolher a primeira obra e Retomar", async () => {
  await clicar(".mp-g-linha");
  await clicar('.ds-btn:has-text("Retomar")');
  await p.waitForFunction(() => location.hash.startsWith("#/projeto/"), null, { timeout: 4000 });
});
await p.screenshot({ path: `${S}/pt-05-projeto.png` });
await passo("Projeto: tarefa Volume leva ao Nexo", async () => {
  await clicar('.pr-tarefa:has-text("Volume")');
  await p.waitForFunction(() => location.hash.startsWith("#/nexo"), null, { timeout: 4000 });
});
await p.screenshot({ path: `${S}/pt-06-nexo.png` });
await passo("Nexo: conversa de auditoria abre a Conversa", async () => {
  await clicar('.nw-conversas li:has-text("Auditar o memorial geral")');
  await p.waitForFunction(() => location.hash.startsWith("#/conversa/auditoria-pronta"), null, { timeout: 4000 });
});
await passo("Conversa: saída Abrir o resultado", async () => {
  await clicar('.cx-saida:has-text("Abrir o resultado")');
  await p.waitForFunction(() => location.hash.startsWith("#/resultado"), null, { timeout: 4000 });
});
await passo("Ctrl K abre a busca", async () => {
  await p.keyboard.press("Control+k");
  await p.locator(".pc-paleta").waitFor({ timeout: 3000 });
});
await passo("Busca: digitar 117 e Enter leva ao Projeto", async () => {
  await p.keyboard.type("117");
  await p.keyboard.press("Enter");
  await p.waitForFunction(() => location.hash.startsWith("#/projeto"), null, { timeout: 4000 });
});
await passo("? abre os atalhos e Esc fecha", async () => {
  await p.keyboard.press("?");
  await p.locator(".pc-atalhos").waitFor({ timeout: 3000 });
  await p.keyboard.press("Escape");
});
await passo("Sino: Abrir Achados", async () => {
  await clicar(".pn-sino");
  await clicar('[role=menuitem]:has-text("Abrir Achados")');
  await p.waitForFunction(() => location.hash.startsWith("#/achados"), null, { timeout: 4000 });
});
await passo("Achados: Abrir o parecer", async () => {
  await clicar(".mp-g-linha");
  await clicar('.ds-btn:has-text("Abrir o parecer")');
  await p.waitForFunction(() => location.hash.startsWith("#/resultado/fila"), null, { timeout: 4000 });
});
await passo("Barra: Administração", async () => clicar('.pn-nav a:has-text("Administração")'));
await p.screenshot({ path: `${S}/pt-07-admin.png` });
await passo("Barra: Ajuda", async () => clicar('.pn-nav a:has-text("Ajuda")'));
await passo("Barra: Montar volumes", async () => clicar('.pn-nav a:has-text("Montar volumes")'));
await passo("Marca do Nexo volta ao Início", async () => clicar("a.pn-marca"));
await passo("Início: Continuar (auditoria) abre o resultado", async () => {
  await clicar(".d2-tabela tbody tr");
  await p.waitForFunction(() => location.hash.startsWith("#/resultado"), null, { timeout: 4000 });
});
await passo("Painel: ir para a página 404", async () => {
  await clicar(".pt-pilula");
  await clicar('.pt-telas button:has-text("Página que não existe")');
});
await passo("404: Ir para Projetos", async () => {
  await clicar('.ds-btn:has-text("Ir para Projetos")');
  await p.waitForFunction(() => location.hash.startsWith("#/projetos"), null, { timeout: 4000 });
});
await passo("Menu da conta: Sair volta à Entrada", async () => {
  await clicar(".pn-quem");
  await clicar('[role=menuitem]:has-text("Sair")');
  await p.waitForFunction(() => location.hash.startsWith("#/entrada"), null, { timeout: 4000 });
});

// toda tela, toda situação: abre sem erro?
const todas = await p.evaluate(() => null);
void todas;
console.log("\nerros:", erros.length ? "\n  " + [...new Set(erros)].join("\n  ") : "nenhum");
await b.close();
