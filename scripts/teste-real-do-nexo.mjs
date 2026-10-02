// TESTE REAL DO NEXO NO SISTEMA NOVO (migração, passo 5) — com a IA de verdade.
//
// Diferente da bateria (IA simulada), este roda contra o servidor de
// desenvolvimento com a chave do ambiente: lê carimbos, gera LD/capa/
// separatriz, monta o volume e audita um memorial real. Custa dinheiro
// (auditoria padrão ~US$ 0,25; leitura de carimbo, centavos) — rodar de
// propósito, não em laço.
//
// Uso: node scripts/teste-real-do-nexo.mjs [base] [volume|auditoria|tudo] [memorial.pdf]
// Capturas e registro em prova-real/ (fora do git: mostram a tela logada).
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const BASE = process.argv[2] ?? "http://localhost:3400";
const QUAL = process.argv[3] ?? "tudo";
const MEMORIAL = process.argv[4] ?? "tests/117_25_md_geral_a.pdf";
const OUT = "prova-real";
fs.mkdirSync(OUT, { recursive: true });
const registro = fs.createWriteStream(path.join(OUT, "registro.txt"), { flags: "w" });
const log = (...a) => {
  const linha = `[${new Date().toISOString().slice(11, 19)}] ${a.join(" ")}`;
  console.log(linha);
  registro.write(linha + "\n");
};
const falhas = [];
const ok = (cond, nome, extra = "") => {
  log(`${cond ? "ok   " : "FALHA"} ${nome}${extra ? `  (${extra})` : ""}`);
  if (!cond) falhas.push(nome);
};

/* ---------------- as pranchas: duas disciplinas, carimbo legível ---------------- */
const OBRA = { codigo: "777-26", cliente: "PREFEITURA MUNICIPAL DE CRICIÚMA", obra: "ESCOLA MUNICIPAL DO TESTE NOTURNO" };
const PRANCHAS = [
  ["arq", "PLANTA BAIXA DO TERREO"],
  ["arq", "PLANTA BAIXA DO PAVIMENTO SUPERIOR"],
  ["arq", "CORTES E FACHADAS"],
  ["arq", "PLANTA DE COBERTURA"],
  ["est", "PLANTA DE FORMAS DO BLOCO A"],
  ["est", "PLANTA DE FORMAS DO BLOCO B"],
  ["est", "DETALHAMENTO DAS VIGAS"],
];
async function prancha(disc, conteudo, folha, total) {
  const arquivo = `777_26_${disc}_${String(folha).padStart(3, "0")}_a`;
  const doc = await PDFDocument.create();
  const fonte = await doc.embedFont(StandardFonts.Helvetica);
  const pagina = doc.addPage([1684, 1191]);
  pagina.drawRectangle({ x: 20, y: 20, width: 1644, height: 1151, borderColor: rgb(0, 0, 0), borderWidth: 2 });
  for (let i = 0; i < 6; i++) pagina.drawLine({ start: { x: 120, y: 360 + i * 120 }, end: { x: 1100, y: 360 + i * 120 }, thickness: 1, color: rgb(0.3, 0.3, 0.3) });
  pagina.drawRectangle({ x: 1300, y: 30, width: 364, height: 260, borderColor: rgb(0, 0, 0), borderWidth: 1 });
  const campos = [
    ["CLIENTE:", OBRA.cliente],
    ["OBRA:", OBRA.obra],
    ["CONTEÚDO:", conteudo],
    ["ESCALA:", "INDICADA"],
    ["PRANCHA:", `${String(folha).padStart(2, "0")}/${String(total).padStart(2, "0")}`],
    ["ARQUIVO:", arquivo],
  ];
  let y = 260;
  for (const [rotulo, valor] of campos) {
    pagina.drawText(rotulo, { x: 1320, y, size: 9, font: fonte });
    pagina.drawText(valor, { x: 1320, y: y - 13, size: 9, font: fonte });
    y -= 38;
  }
  const destino = path.join(OUT, "pranchas", `${arquivo}.pdf`);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, await doc.save());
  return destino;
}

/* ---------------- o navegador ---------------- */
const b = await chromium.launch({ args: ["--use-angle=d3d11"] });
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
const erros = [];
p.on("pageerror", (e) => erros.push(`pageerror: ${e.message.slice(0, 240)}`));
p.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource/i.test(m.text()) && erros.push(`console: ${m.text().slice(0, 240)}`));
p.on("response", (r) => r.status() >= 500 && erros.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`));
let n = 0;
const foto = async (nome) => {
  n += 1;
  await p.screenshot({ path: path.join(OUT, `${String(n).padStart(2, "0")}-${nome}.png`) });
};
const esperar = async (fn, ms, passo = 1000) => {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    if (await fn().catch(() => false)) return true;
    await p.waitForTimeout(passo);
  }
  return false;
};
const textoVisivel = (re) => esperar(async () => (await p.getByText(re).count()) > 0, 1);
const escrever = async (frase) => {
  const campo = p.locator('[data-tour="composer"] textarea');
  await campo.fill(frase);
  await campo.press("Enter");
};
const novaConversa = async () => {
  await p.getByRole("button", { name: "Nova conversa", exact: true }).click();
  await p.waitForTimeout(1500);
};
const anexar = async (arquivos) => {
  await p.locator('input[type="file"][accept="application/pdf,image/*"]').first().setInputFiles(arquivos);
};

await p.goto(`${BASE}/login`);
await p.waitForTimeout(1500);
await p.getByRole("button", { name: /Entrar como dev/i }).click();
await p.waitForTimeout(3500);
await p.goto(`${BASE}/nexo`, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(5000);
if (await p.getByText("Pular", { exact: true }).count()) await p.getByText("Pular", { exact: true }).first().click();

/* ================= A. montar um volume ================= */
if (QUAL === "volume" || QUAL === "tudo") {
  log("=== A. montar um volume (7 pranchas, ARQ + EST) ===");
  await novaConversa();
  const arquivos = [];
  const totais = { arq: 4, est: 3 };
  const conta = { arq: 0, est: 0 };
  for (const [disc, conteudo] of PRANCHAS) {
    conta[disc] += 1;
    arquivos.push(await prancha(disc, conteudo, conta[disc], totais[disc]));
  }
  await anexar(arquivos);
  ok(await esperar(async () => (await p.getByText(/Anexei 7 folhas/).count()) > 0, 120_000), "o Nexo recebeu as 7 folhas");
  const leu = await esperar(async () => (await p.locator(".nx-folha").count()) >= 7 && (await p.getByText(/lendo|Lendo/).count()) === 0, 300_000, 2000);
  await foto("volume-folhas-lidas");
  ok(leu, "as 7 folhas lidas aparecem no mapa", `folhas no mapa=${await p.locator(".nx-folha").count()}`);
  const siglas = await p.locator(".nx-folha .ct-sigla").allInnerTexts();
  ok(siglas.some((s) => /ARQ/.test(s)) && siglas.some((s) => /EST/.test(s)), "o carimbo deu as duas disciplinas", siglas.join(","));

  await escrever("gera a LD, a capa e as separatrizes com o título TESTE NOTURNO");
  const gerar = p.getByRole("button", { name: /^Gerar os \d+$/ });
  ok(await esperar(async () => (await gerar.count()) > 0, 180_000), "o plano de geração oferece Gerar");
  await foto("volume-plano");
  // O plano pede as decisões que ninguém tomou (o número do volume da capa) antes de liberar Gerar.
  if ((await gerar.count()) && (await gerar.first().isDisabled())) {
    // a escolha mora no próprio plano (grupo "Número do volume")
    const volume1 = p.locator('[aria-label="Número do volume"] button', { hasText: "Volume 1" });
    if (await volume1.count()) {
      await volume1.last().click();
      log("  escolhi Volume 1 no plano (ele pedia o número do volume)");
    }
    ok(await esperar(async () => (await gerar.count()) > 0 && !(await gerar.last().isDisabled()), 120_000, 2000), "decidido o que faltava, Gerar libera");
  }
  if ((await gerar.count()) && !(await gerar.last().isDisabled())) {
    await gerar.last().click();
    ok(await esperar(async () => (await p.getByRole("button", { name: /^Gerar de novo$/ }).count()) > 0, 240_000, 2000), "LD, capa e separatrizes geradas");
    await p.waitForTimeout(2000);
    await foto("volume-gerados");
  }

  await escrever("monta o volume");
  const montar = p.getByRole("button", { name: /Montar volume|Montar o volume/ });
  ok(await esperar(async () => (await montar.count()) > 0, 180_000), "o Nexo oferece montar o volume");
  await foto("volume-proposta");
  if (await montar.count()) {
    const habilitado = await montar.first().isEnabled();
    log(`  botão Montar volume habilitado=${habilitado}`);
    if (habilitado) {
      // O volume montado fica no app (não baixa sozinho): olhar a tela e o download juntos.
      let baixa = null;
      p.once("download", (d) => (baixa = d));
      const t0 = Date.now();
      await montar.first().click();
      const feito = await esperar(async () => baixa != null || (await p.getByText(/Volume montado|volume montado/).count()) > 0, 240_000, 1000);
      ok(Boolean(feito), "o volume foi montado", `${Math.round((Date.now() - t0) / 1000)}s${baixa ? ` download ${baixa.suggestedFilename()}` : ""}`);
    }
  }
  await p.waitForTimeout(2000);
  await foto("volume-final");
  await p.locator('[data-tour="chip-mapa"]').first().click().catch(() => {});
  await p.waitForTimeout(1500);
  await foto("volume-mapa-final");
}

/* ================= B. auditar um memorial ================= */
if (QUAL === "auditoria" || QUAL === "tudo") {
  log(`=== B. auditar um memorial (${MEMORIAL}, padrão) ===`);
  await novaConversa();
  await anexar([MEMORIAL]);
  ok(await esperar(async () => (await p.getByText(/Li as primeiras páginas/).count()) > 0, 240_000, 2000), "o Nexo leu as primeiras páginas do memorial");
  await foto("auditoria-ficha");
  // A saída "Auditar o memorial" pede a auditoria; o cartão com o botão Auditar vem na resposta.
  const pedir = p.getByRole("button", { name: /Auditar o memorial$/ });
  if (await esperar(async () => (await pedir.count()) > 0, 30_000)) {
    await pedir.first().click();
    log("  pedi pela saída \"Auditar o memorial\"");
  }
  const auditar = p.getByRole("button", { name: /^(Auditar sem transcrever|Auditar)$/ });
  ok(await esperar(async () => (await auditar.count()) > 0 && (await auditar.first().isEnabled()), 180_000, 2000), "Auditar está disponível");
  const inicio = Date.now();
  await auditar.first().click();
  await p.waitForTimeout(6_000);
  await foto("auditoria-rodando");
  ok((await p.locator(".au-painel").count()) === 1, "o palco mostra a auditoria rodando no painel novo");
  await p.waitForTimeout(8_000);
  await foto("auditoria-rodando-2");
  const pronta = await esperar(async () => (await p.locator('[data-tour="veredito-parecer"]').count()) > 0, 1_200_000, 5000);
  ok(pronta, "a auditoria terminou e o veredito está no trilho", `${Math.round((Date.now() - inicio) / 1000)} s`);
  if (pronta) {
    await p.waitForTimeout(2000);
    await foto("auditoria-resumo");
    const selo = await p.locator(".re-estado .rs-selo").innerText();
    const tratados = await p.locator(".re-tratado b").innerText();
    log(`  veredito: ${selo}; tratados: ${tratados.replace(/\s+/g, " ")}`);
    await p.locator(".re-nav button", { hasText: "Achados" }).click();
    await p.waitForTimeout(2000);
    await foto("auditoria-achados");
    await p.keyboard.press("j");
    await p.waitForTimeout(1200);
    await foto("auditoria-achado-aberto");
    await p.locator(".re-nav button", { hasText: "Parecer" }).click();
    await p.waitForTimeout(2000);
    await foto("auditoria-parecer");
    const [aba] = await Promise.all([ctx.waitForEvent("page", { timeout: 60_000 }).catch(() => null), p.locator(".re-acao--principal").click()]);
    ok(Boolean(aba), "Parecer em PDF abre numa aba nova");
    if (aba) await aba.close();
    const antes = await p.locator(".cx-nexo .nx-texto").count();
    await escrever("por que o primeiro achado que bloqueia a emissão bloqueia?");
    // um turno NOVO do Nexo, e ele já parado de pensar
    const respondeu = await esperar(
      async () =>
        (await p.locator(".cx-nexo .nx-texto").count()) > antes &&
        (await p.locator(".cx-nexo .nx-texto").last().innerText()).replace("Nexo:", "").trim().length > 20 &&
        (await p.locator('[aria-label="Nexo está respondendo"], [aria-label="Nexo está pensando"]').count()) === 0,
      180_000,
      2000,
    );
    if (respondeu) log(`  resposta: ${(await p.locator(".cx-nexo .nx-texto").last().innerText()).replace(/\s+/g, " ").slice(0, 300)}`);
    await p.waitForTimeout(2000);
    await foto("auditoria-pergunta");
    ok(respondeu, "o chat responde sobre a auditoria ao lado do resultado");
  }
}

ok(erros.length === 0, "sem erro de página, de console nem HTTP 5xx", erros.slice(0, 6).join(" | "));
for (const e of erros) log(`  ${e}`);
await b.close();
log(falhas.length ? `${falhas.length} falha(s): ${falhas.join("; ")}` : "tudo ok");
registro.end();
process.exit(falhas.length ? 1 : 0);
