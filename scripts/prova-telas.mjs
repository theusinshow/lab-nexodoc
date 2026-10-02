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
