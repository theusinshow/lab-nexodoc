// AUDITORIA — teclado, foco e movimento no REDESENHO. Não confia no código:
// aperta as teclas e lê o que a página fez. Uso: node ... <saida.json>
import { chromium } from "playwright";
import fs from "node:fs";

const OUT = process.argv[2];
const BASE = "http://localhost:3200/prototipo";
const b = await chromium.launch({ args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"] });
const res = {};
let v = 0;
const abrir = async (p, h, espera = 1500) => {
  await p.goto(`${BASE}?k=${v++}${h}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(espera);
};
const ativo = (p) =>
  p.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { nome: "(body)" };
    const cs = getComputedStyle(el);
    const anel = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== "none");
    const r = el.getBoundingClientRect();
    return {
      nome: (el.getAttribute("aria-label") || el.innerText || el.getAttribute("placeholder") || el.tagName).replace(/\s+/g, " ").trim().slice(0, 45),
      anel,
      visivel: r.width > 0 && r.top < innerHeight && r.bottom > 0,
      dentroDoDialogo: !!el.closest("[role=dialog], [role=alertdialog], dialog, .pt-painel"),
      noPrototipo: !!el.closest(".pt-pilula, .pt-painel"),
    };
  });

// 1. ordem de Tab e anel de foco em 4 telas
for (const h of ["#/inicio/padrao", "#/projetos/lista", "#/resultado/fila", "#/nexo-auditoria/pronta"]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await abrir(p, h);
  await p.locator("body").click({ position: { x: 2, y: 450 } }).catch(() => {});
  const seq = [];
  for (let i = 0; i < 22; i++) {
    await p.keyboard.press("Tab");
    seq.push(await ativo(p));
  }
  res[`tab ${h}`] = { semAnel: seq.filter((s) => s.nome !== "(body)" && !s.anel).map((s) => s.nome), invisiveis: seq.filter((s) => s.visivel === false).map((s) => s.nome), ordem: seq.map((s) => s.nome) };
  await p.close();
}

// 2. Ctrl K, ? e Esc em 3 telas
for (const h of ["#/projetos/lista", "#/resultado/fila", "#/conversa/nova", "#/admin/cockpit"]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await abrir(p, h);
  const conta = () => p.evaluate(() => document.querySelectorAll("[role=dialog]:not([hidden]), [role=listbox], [aria-modal=true]").length);
  const antes = await conta();
  await p.keyboard.press("Control+k");
  await p.waitForTimeout(500);
  const comK = await conta();
  const focoK = await ativo(p);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(250);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(350);
  const depoisEsc = await conta();
  await p.keyboard.press("?");
  await p.waitForTimeout(500);
  const comInterrog = await conta();
  const textoAtalhos = await p.evaluate(() => [...document.querySelectorAll("[role=dialog]")].map((d) => d.innerText.slice(0, 200)).join(" / "));
  res[`teclas ${h}`] = { antes, comK, focoK, depoisEsc, comInterrog, textoAtalhos };
  await p.close();
}

// 3. armadilha de foco nos diálogos (novo projeto, confirmação)
for (const h of ["#/projetos/novo", "#/confirmacoes/confirmacao", "#/projeto/configuracoes"]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await abrir(p, h);
  const temDialogo = await p.evaluate(() => document.querySelectorAll("[role=dialog], [role=alertdialog], [aria-modal=true]").length);
  const seq = [];
  for (let i = 0; i < 30; i++) {
    await p.keyboard.press("Tab");
    seq.push(await ativo(p));
  }
  res[`dialogo ${h}`] = { temDialogo, foraDoDialogo: seq.filter((s) => !s.dentroDoDialogo).map((s) => s.nome).slice(0, 12) };
  await p.close();
}

// 4. movimento em repouso: animações que seguem rodando 4 s depois de abrir, sem gesto
for (const reduzir of [false, true]) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: reduzir ? "reduce" : "no-preference" });
  const p = await ctx.newPage();
  for (const h of ["#/inicio/padrao", "#/nexo-auditoria/pronta", "#/nexo-auditoria/rodando", "#/auditoria/em-curso", "#/resultado/nao-emitir", "#/conversa/respondendo", "#/conversa/gerando", "#/projetos/lista", "#/admin/cockpit", "#/entrada/padrao", "#/mapa/lendo-selos"]) {
    await abrir(p, h, 4000);
    res[`movimento ${reduzir ? "reduzido" : "normal"} ${h}`] = await p.evaluate(() => {
      const vivas = document.getAnimations().filter((a) => a.playState === "running");
      const infinitas = vivas.filter((a) => a.effect?.getTiming?.().iterations === Infinity);
      const quem = infinitas.map((a) => {
        const alvo = a.effect?.target;
        const nome = a.animationName || a.id || "?";
        return `${nome}@${(alvo?.className?.baseVal ?? alvo?.className ?? alvo?.tagName ?? "?").toString().split(" ")[0]}`;
      });
      const videos = [...document.querySelectorAll("video")].filter((x) => !x.paused).length;
      const canvas = document.querySelectorAll("canvas").length;
      return { rodando: vivas.length, infinitas: infinitas.length, quem: [...new Set(quem)].slice(0, 10), videos, canvas };
    });
  }
  await ctx.close();
}

fs.writeFileSync(OUT, JSON.stringify(res, null, 2));
for (const [k, r] of Object.entries(res)) console.log(k.padEnd(44), JSON.stringify(r).slice(0, 260));
await b.close();
