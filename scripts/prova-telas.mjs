// PROVA — as telas de trabalho no sistema novo (migração, passo 4), no app de
// verdade: Ajuda, Achados, Projetos, Projeto e Painel carregam com dados
// reais, sem erro de página, e o teclado faz o que o rodapé promete.
// Uso: node scripts/prova-telas.mjs [base] [pasta] [telas separadas por vírgula] [largura]
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3400";
const OUT = process.argv[3] ?? "prova-telas";
const SO = (process.argv[4] ?? "").split(",").filter(Boolean);
const LARGURA = Number(process.argv[5] ?? 1440);
fs.mkdirSync(OUT, { recursive: true });
const falhas = [];
const ok = (cond, nome, extra = "") => {
  console.log(`${cond ? "ok  " : "FALHA"} ${nome.padEnd(60)} ${extra}`);
  if (!cond) falhas.push(nome);
};

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: LARGURA, height: Math.round(LARGURA * 0.5625) } });
const erros = [];
p.on("pageerror", (e) => erros.push(e.message.slice(0, 200)));
p.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource/i.test(m.text()) && erros.push(m.text().slice(0, 200)));
await p.goto(`${BASE}/login`);
await p.waitForTimeout(1500);
await p.locator('button:has-text("Entrar como dev")').click();
await p.waitForTimeout(3500);

const abrir = async (rota) => {
  await p.goto(`${BASE}${rota}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3500);
};
const tecla = async (k) => {
  await p.keyboard.press(k);
  await p.waitForTimeout(450);
};

const telas = [
  ["ajuda", async () => {
    await abrir("/ajuda");
    ok((await p.locator(".md-raiz .mp.aj").count()) === 1, "ajuda: a tela nova dentro da moldura");
    ok((await p.locator(".aj-linha").count()) >= 5, "ajuda: as tarefas na tabela", String(await p.locator(".aj-linha").count()));
    await p.mouse.click(5, LARGURA * 0.5);
    await tecla("j");
    ok((await p.locator(".aj-linha[aria-selected=true]").count()) === 1 && (await p.locator(".aj-passos li").count()) >= 2, "ajuda: J escolhe a primeira tarefa e mostra os passos");
    await tecla("2");
    ok(/Onde fica/.test(await p.locator('.mp-abas [aria-selected=true]').innerText()), "ajuda: 2 troca para Onde fica");
    await tecla("/");
    await p.keyboard.type("separatriz");
    await p.waitForTimeout(400);
    ok((await p.locator(".aj-linha").count()) >= 1, "ajuda: a busca acha 'separatriz'");
    await p.locator(".aj-busca input").fill("boleto da prefeitura");
    await p.waitForTimeout(400);
    ok((await p.locator(".aj-sem").count()) === 1, "ajuda: busca sem resultado tem a saída");
    await p.locator(".aj-busca input").fill("");
    await p.keyboard.press("Escape");
    await tecla("j");
    await p.screenshot({ path: `${OUT}/ajuda-escolhida-${LARGURA}.png` });
    await tecla("Escape");
    await tecla("1");
    await tecla("j");
    await tecla("Enter");
    await p.waitForTimeout(2500);
    ok(new URL(p.url()).pathname === "/", "ajuda: Enter na tarefa 'Auditar' abre o Painel", new URL(p.url()).pathname);
  }],
  ["achados", async () => {
    await abrir("/achados");
    ok((await p.locator(".md-raiz .mp.ac").count()) === 1, "achados: a tela nova dentro da moldura");
    const vazio = (await p.locator(".pj-vazio").count()) === 1;
    if (vazio) {
      ok(true, "achados: nada em aberto para este usuário (estado vazio)");
      return;
    }
    ok((await p.locator('[data-secao-achados]').count()) === 2, "achados: os dois lados nos tiles");
    const linhas = await p.locator(".ac-grade .mp-g-linha").count();
    ok(linhas >= 1, "achados: os pareceres na tabela", String(linhas));
    await p.mouse.click(5, LARGURA * 0.5);
    await tecla("j");
    ok((await p.locator(".ac-lista li").count()) >= 1, "achados: J escolhe o parecer e lista os achados dele", String(await p.locator(".ac-lista li").count()));
    const rotulo = await p.locator(".ac-lista .ac-meta .mp-mono").first().innerText();
    ok(!/^INC-/i.test(rotulo), "achados: o id interno não aparece (INC- vira ACH-)", rotulo);
    await p.screenshot({ path: `${OUT}/achados-escolhido-${LARGURA}.png` });
    await tecla("Control+k");
    ok((await p.locator(".pc-paleta").count()) === 1, "achados: Ctrl K abre a busca e não anda na lista");
    await tecla("Escape");
    await tecla("Enter");
    await p.waitForTimeout(2500);
    ok(/\/nexo\?auditoria=/.test(p.url()), "achados: Enter abre o parecer no Nexo", p.url().replace(BASE, ""));
  }],
  ["projetos", async () => {
    await abrir("/projetos");
    ok((await p.locator(".md-raiz .mp.pj").count()) === 1, "projetos: a tela nova dentro da moldura");
    const linhas = await p.locator(".pj-grade .mp-g-linha").count();
    ok(linhas >= 1, "projetos: as obras em andamento na tabela", String(linhas));
    ok((await p.locator(".mp-lado-titulo", { hasText: "Por onde começar" }).count()) === 1, "projetos: sem obra escolhida, 'por onde começar'");
    await p.mouse.click(5, LARGURA * 0.5);
    await tecla("j");
    ok((await p.locator(".pj-obra-nome").count()) === 1, "projetos: J escolhe a obra e mostra o lado dela");
    await p.screenshot({ path: `${OUT}/projetos-escolhida-${LARGURA}.png` });
    // arquivar e voltar: a mesma obra, de ida e volta, pela API de verdade
    const codigo = await p.locator(".pj-obra-cabeca .mp-mono").innerText();
    await p.locator(".mp-acao", { hasText: "Arquivar" }).click();
    await p.waitForTimeout(3000);
    ok((await p.locator(".pc-aviso", { hasText: "arquivado" }).count()) >= 1, "projetos: arquivar avisa", codigo);
    await p.locator('.mp-abas [role=tab]', { hasText: "Arquivados" }).click();
    await p.waitForTimeout(500);
    await p.locator(".pj-grade .mp-g-linha", { hasText: codigo }).first().click();
    await p.waitForTimeout(500);
    await p.locator(".mp-acao", { hasText: "Voltar para em andamento" }).click();
    await p.waitForTimeout(3000);
    ok((await p.locator(".pc-aviso", { hasText: "voltou para em andamento" }).count()) >= 1, "projetos: voltar para em andamento avisa", codigo);
    await p.locator('.mp-abas [role=tab]', { hasText: "Em andamento" }).click();
    await p.waitForTimeout(500);
    await tecla("/");
    await p.keyboard.type("zzzz obra que nao existe");
    await p.waitForTimeout(400);
    ok((await p.locator(".pj-sem").count()) === 1, "projetos: busca sem resultado tem a saída");
    await p.keyboard.press("Escape");
    await p.locator(".pj-busca input").fill("");
    if ((await p.locator("button", { hasText: "Novo projeto" }).count()) > 0) {
      await p.mouse.click(5, LARGURA * 0.5);
      await tecla("n");
      ok((await p.locator(".mp-form", { hasText: "Novo projeto" }).count()) === 1, "projetos: N abre o cadastro no lado");
      await p.locator(".mp-form button[type=submit]").click();
      await p.waitForTimeout(400);
      ok(/Informe código e nome/.test(await p.locator(".mp-form").innerText()), "projetos: cadastro vazio diz o que falta");
      await tecla("Escape");
    }
    await p.mouse.click(5, LARGURA * 0.5);
    await tecla("j");
    await tecla("Enter");
    await p.waitForTimeout(3000);
    ok(/\/projetos\/[^/]+$/.test(new URL(p.url()).pathname), "projetos: Enter entra na obra", new URL(p.url()).pathname);
  }],
  ["projeto", async () => {
    await abrir("/projetos");
    await p.locator(".pj-busca input").fill("117-25");
    await p.waitForTimeout(400);
    await p.locator(".pj-grade .mp-g-linha").first().dblclick();
    await p.waitForTimeout(4000);
    ok((await p.locator(".md-raiz .mp.pr").count()) === 1, "projeto: a tela nova dentro da moldura", new URL(p.url()).pathname);
    ok((await p.locator(".pr-tarefa").count()) === 4, "projeto: as quatro tarefas no topo");
    ok((await p.locator(".mp-lado-titulo").first().innerText()).length > 0, "projeto: o lado abre com o que fazer agora", await p.locator(".mp-lado-titulo").first().innerText());
    await p.mouse.click(5, LARGURA * 0.5);
    for (const [n, nome] of [["1", "Documentos"], ["2", "Arquivos"], ["3", "Gerados"], ["4", "Eventos"]]) {
      await tecla(n);
      ok(new RegExp(nome).test(await p.locator(".mp-abas [aria-selected=true]").innerText()), `projeto: ${n} abre ${nome}`, String(await p.locator(".pr-grade .mp-g-linha").count()));
    }
    await tecla("j");
    ok((await p.locator(".pj-obra-nome").count()) === 1, "projeto: J escolhe o evento e mostra o lado dele");
    await p.screenshot({ path: `${OUT}/projeto-evento-${LARGURA}.png` });
    await p.locator("button", { hasText: "Configurações" }).click();
    await p.waitForTimeout(600);
    ok((await p.locator(".mp-form input.mp-mono").inputValue()) === "117-25", "projeto: Configurações abre com os dados da obra");
    await p.screenshot({ path: `${OUT}/projeto-config-${LARGURA}.png` });
    await p.locator(".mp-form button", { hasText: "Cancelar" }).click();
    await p.waitForTimeout(500);
    await p.locator(".pr-tarefa[data-tarefa=auditoria]").click();
    await p.waitForTimeout(3000);
    ok(new URL(p.url()).pathname === "/nexo", "projeto: a tarefa Auditoria leva ao Nexo", p.url().replace(BASE, ""));
  }],
  ["painel", async () => {
    await abrir("/");
    ok((await p.locator(".md-raiz .d2").count()) === 1, "painel: a tela nova dentro da moldura");
    ok(/^(Bom dia|Boa tarde|Boa noite), /.test(await p.locator(".d2-cabeca h1").innerText()), "painel: a saudação pela hora de Brasília", await p.locator(".d2-cabeca h1").innerText());
    ok((await p.locator(".d2-tarefa").count()) === 4, "painel: as quatro tarefas");
    ok((await p.locator(".d2-tabela tbody tr").count()) >= 1, "painel: Continuar com as conversas", String(await p.locator(".d2-tabela tbody tr").count()));
    ok((await p.locator(".d2-achados li").count()) >= 1, "painel: Com você com os achados", String(await p.locator(".d2-achados li").count()));
    await p.waitForTimeout(2000);
    ok((await p.locator(".d2-resumo .d2-menor").count()) === 4, "painel: o Nexo no escritório, com números reais", (await p.locator(".d2-menor-num").allInnerTexts()).join(" "));
    await p.screenshot({ path: `${OUT}/painel-inicio-${LARGURA}.png`, fullPage: true });
    await p.keyboard.press("Control+k");
    await p.waitForTimeout(400);
    ok(await p.evaluate(() => document.activeElement?.closest(".bc, [class*=barra]") !== null || document.activeElement?.tagName === "INPUT"), "painel: Ctrl K vai à barra da própria tela");
    await p.keyboard.press("Escape");
    await abrir("/?tarefa=auditar");
    ok((await p.locator(".d2-tarefa[data-tarefa=auditar][aria-pressed=true]").count()) === 1 && (await p.locator(".d2-soltar").count()) === 1, "painel: ?tarefa=auditar abre a tarefa (Nova auditoria de Achados)");
    await p.locator("input[type=file]").first().setInputFiles("tests/117_25_md_geral_a.pdf");
    await p.waitForTimeout(6000);
    ok(new URL(p.url()).pathname === "/nexo", "painel: o arquivo escolhido leva ao Nexo", p.url().replace(BASE, ""));
    const corpo = await p.locator("body").innerText();
    ok(/117_25_md_geral_a/.test(corpo), "painel: o Nexo recebeu o arquivo do Painel");
    await p.screenshot({ path: `${OUT}/painel-entregou-${LARGURA}.png` });
  }],
];

for (const [nome, rodar] of telas) {
  if (SO.length && !SO.includes(nome)) continue;
  try {
    await rodar();
  } catch (e) {
    ok(false, `${nome}: ${e.message.split("\n")[0].slice(0, 120)}`);
  }
  await p.screenshot({ path: `${OUT}/${nome}-${LARGURA}.png` });
}

ok(erros.length === 0, "sem erro de página nem de console", erros.slice(0, 3).join(" | "));
await b.close();
console.log(falhas.length ? `\n${falhas.length} falha(s)` : "\ntudo ok");
process.exit(falhas.length ? 1 : 0);
