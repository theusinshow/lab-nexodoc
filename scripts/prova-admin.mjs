// PROVA — o Centro de controle no sistema novo (migração, passo 3), no app de
// verdade e com o token do ambiente: cada destino carrega com dados reais, sem
// erro de página, e o que o desenho promete está lá.
// Uso: node scripts/prova-admin.mjs [base] [pasta] [destinos separados por vírgula]
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3400";
const OUT = process.argv[3] ?? "prova-admin";
const SO = (process.argv[4] ?? "").split(",").filter(Boolean);
fs.mkdirSync(OUT, { recursive: true });
const env = fs.readFileSync(".env.local", "utf8");
const TOKEN = (env.match(/^NEXODOC_ADMIN_TOKEN=(.*)$/m)?.[1] ?? "").trim().replace(/^["']|["']$/g, "");
const falhas = [];
const ok = (cond, nome, extra = "") => {
  console.log(`${cond ? "ok  " : "FALHA"} ${nome.padEnd(58)} ${extra}`);
  if (!cond) falhas.push(nome);
};

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const erros = [];
p.on("pageerror", (e) => erros.push(e.message.slice(0, 200)));
p.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource/i.test(m.text()) && erros.push(m.text().slice(0, 200)));
await p.goto(`${BASE}/login`);
await p.waitForTimeout(1500);
await p.locator('button:has-text("Entrar como dev")').click();
await p.waitForTimeout(3500);

// sem token: o painel diz que nada foi consultado e pede o token no trilho
await p.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(4000);
ok((await p.locator('[data-carga="sem-token"]').count()) === 1 && (await p.locator("#adm-token").count()) === 1, "sem token: aviso e campo no trilho");
await p.locator("#adm-token").fill(TOKEN);
await p.locator(".adm-token-form button[type=submit]").click();
await p.waitForTimeout(6000);
ok((await p.locator(".adm-token-form").count()) === 0 && /sessão admin/.test(await p.locator(".adm-token").innerText()), "token aceito: o campo recolhe para 'sessão admin'");
ok(/operacional|degradado|parado/.test(await p.locator(".adm-veredito").innerText()), "o veredito do trilho vem de /api/admin/status");

const destinos = [
  ["cockpit", "/admin", async () => {
    const nums = await p.$$eval(".adm-num b", (bs) => bs.map((x) => x.textContent));
    ok(nums.length === 5 && nums.every((n) => n !== "—"), "cockpit: cinco números reais", nums.join(" "));
    ok((await p.locator(".adm-num-linha svg").count()) >= 3, "cockpit: linhas de 14 dias");
  }],
  ["dinheiro", "/admin/dinheiro", async () => {
    ok((await p.locator(".din-controle").count()) === 2, "dinheiro: os dois tetos");
    ok((await p.locator(".din-cotacao-valor, .din-cotacao .din-nao").count()) >= 1, "dinheiro: a cotação");
    ok((await p.locator('[aria-label="Período"] [role=radio], [aria-label="Período"] button').count()) >= 3, "dinheiro: o período no cabeçalho");
  }],
  ["motor", "/admin/motor", async () => {
    ok((await p.locator(".mot-numeros .adm-num").count()) === 4, "motor: os quatro números da qualidade");
    ok((await p.locator(".mot-controle").count()) === 6, "motor: os seis limites");
    const fluxos = await p.locator(".mot-fluxo").count();
    ok(fluxos > 0, "motor: os fluxos numa tabela só", `${fluxos} fluxos`);
    await p.locator(".mot-trocar").first().click();
    await p.waitForTimeout(500);
    ok((await p.locator(".mot-fluxo-edicao input[list]").count()) === 1, "motor: Trocar modelo abre o campo com a lista de modelos");
    ok((await p.locator("#mot-metas-form input").count()) === 2 && (await p.locator("[aria-labelledby=mot-chaves] dt").count()) >= 3, "motor: metas e chaves");
  }],
  ["pessoas", "/admin/pessoas", async () => {
    ok((await p.locator("#pb-adicionar").count()) === 1 && (await p.locator('input[aria-label="E-mail da pessoa a adicionar"]').count()) === 1, "pessoas: Adicionar pessoa abre a tela");
    ok((await p.locator('[aria-label="Quem entra sem convite"] [aria-checked=true]').count()) === 1, "pessoas: a porta de entrada com o estado real");
    const linhas = await p.locator(".pb-pessoa").count();
    ok(linhas > 0, "pessoas: a tabela com as pessoas do banco", `${linhas} pessoas`);
    await p.locator(".pb-abrir").first().click();
    await p.waitForTimeout(600);
    ok((await p.locator(".pb-ficha .pb-chave").count()) === 3, "pessoas: a ficha mostra as três chaves");
    await p.locator('.pb-ficha-pe button:has-text("Fechar"), .pb-ficha-pe button:has-text("Descartar")').first().click();
    await p.waitForTimeout(500);
    await p.locator(".pb-busca input").fill("zzz-ninguem");
    await p.waitForTimeout(300);
    ok((await p.locator(".pb-pessoa").count()) === 0, "pessoas: a busca filtra a lista");
  }],
  ["dados", "/admin/dados", async () => {
    ok((await p.locator("#pb-conv").count()) === 1 && (await p.locator(".pb-obra").count()) > 0, "dados: as conversas por obra", `${await p.locator(".pb-obra").count()} obras`);
    ok((await p.locator(".pb-auditorias .adm-linha:not(.din-cab)").count()) > 0, "dados: o histórico de auditorias");
    ok((await p.locator(".pb-lds .adm-linha:not(.din-cab)").count()) > 0, "dados: a operação de LDs");
    // a prévia do expurgo conta de verdade e pede a palavra; cancelar não apaga nada
    await p.locator(".pb-acao-obra").first().click();
    await p.waitForTimeout(2500);
    ok((await p.locator(".pb-expurgo .pb-rotulo--vai").count()) === 1 && (await p.locator('input[aria-label="Palavra de confirmação"]').count()) === 1, "dados: a prévia do expurgo conta o que vai e o que fica");
    ok(await p.locator(".pb-expurgo .pb-perigo").isDisabled(), "dados: sem a palavra, expurgar fica travado");
    await p.locator('.pb-expurgo-acoes button:has-text("Cancelar")').click();
    await p.waitForTimeout(500);
    await p.goto(`${BASE}/admin/dados?status=FAILED`, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(5000);
    ok((await p.locator('.pb-auditorias').locator("xpath=preceding-sibling::form[1]").locator('select[name="status"]').inputValue()) === "FAILED", "dados: o ?status=FAILED do Cockpit chega ao filtro");
  }],
];
for (const [nome, rota, checar] of destinos) {
  if (SO.length && !SO.includes(nome)) continue;
  await p.goto(`${BASE}${rota}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(6000);
  ok((await p.locator(".adm-aviso--erro").count()) === 0, `${nome}: sem aviso de falha`);
  await checar();
  await p.screenshot({ path: `${OUT}/${nome}.png`, fullPage: true });
}
ok(erros.length === 0, "sem erro de página nem de console", erros.slice(0, 3).join(" / "));
await b.close();
console.log(falhas.length ? `\n${falhas.length} falha(s)` : "\ntudo ok");
process.exit(falhas.length ? 1 : 0);
