// AUDITORIA — passe responsivo do REDESENHO: as telas principais em 6 larguras.
// Mede o que a captura sozinha esconde: rolagem lateral, texto cortado sem
// reticências, alvo de clique menor que 24 px, elemento que sai da tela e
// sobreposição de controles. Uso: node ... <pasta>
import { chromium } from "playwright";
import fs from "node:fs";

const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3200/prototipo";
const LARGURAS = [1920, 1440, 1280, 1024, 768, 390];
const TELAS = [
  "#/inicio/padrao", "#/nexo-auditoria/pronta", "#/conversa/nova", "#/nexo/lido", "#/mapa/lido",
  "#/auditoria/em-curso", "#/resultado/nao-emitir", "#/resultado/fila", "#/achados/com-voce",
  "#/projetos/lista", "#/projeto/com-registros", "#/admin/cockpit", "#/admin/pessoas", "#/ajuda/inicio", "#/entrada/padrao",
];

const medir = () =>
  document.fonts.ready.then(() => {
    const raiz = document.querySelector(".pt-tela") ?? document.body;
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && +cs.opacity > 0.05;
    };
    const nome = (el) => (el.getAttribute("aria-label") || el.innerText || el.getAttribute("title") || el.className || el.tagName).toString().replace(/\s+/g, " ").trim().slice(0, 40);
    const controles = [...raiz.querySelectorAll("button, a[href], input, select, textarea, [role=button], [role=tab]")].filter(vis);
    const pequenos = controles
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width < 24 || r.height < 24;
      })
      .map((el) => `${nome(el)} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
    const foraDaTela = controles
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.right > innerWidth + 1 || r.left < -1;
      })
      .map(nome);
    // texto cortado sem reticências: transbordo horizontal escondido num nó que tem texto próprio
    const cortados = [...raiz.querySelectorAll("*")]
      .filter((el) => vis(el) && el.children.length === 0 && el.textContent.trim().length > 2)
      .filter((el) => {
        const cs = getComputedStyle(el);
        return el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== "visible" && cs.textOverflow !== "ellipsis";
      })
      .map((el) => el.textContent.trim().slice(0, 40));
    const reticencias = [...raiz.querySelectorAll("*")].filter((el) => vis(el) && getComputedStyle(el).textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1).length;
    // controles que se sobrepõem (centro de um dentro do outro, nenhum contém o outro)
    const sobrepostos = [];
    for (let i = 0; i < controles.length; i++)
      for (let j = i + 1; j < controles.length; j++) {
        const a = controles[i], b = controles[j];
        if (a.contains(b) || b.contains(a)) continue;
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (ix > 6 && iy > 6) sobrepostos.push(`${nome(a)} × ${nome(b)}`);
      }
    const doc = document.scrollingElement;
    return {
      rolaLado: doc.scrollWidth > innerWidth + 1 || raiz.scrollWidth > raiz.clientWidth + 2,
      larguraConteudo: raiz.scrollWidth,
      pequenos: [...new Set(pequenos)].slice(0, 25),
      nPequenos: pequenos.length,
      foraDaTela: [...new Set(foraDaTela)].slice(0, 15),
      cortados: [...new Set(cortados)].slice(0, 15),
      reticencias,
      sobrepostos: [...new Set(sobrepostos)].slice(0, 10),
      fonteMinima: Math.min(...[...raiz.querySelectorAll("*")].filter((el) => vis(el) && el.children.length === 0 && el.textContent.trim()).map((el) => parseFloat(getComputedStyle(el).fontSize))),
    };
  });

const b = await chromium.launch({ args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"] });
const res = {};
let v = 0;
for (const w of LARGURAS) {
  const p = await b.newPage({ viewport: { width: w, height: w <= 390 ? 844 : w <= 768 ? 1024 : w >= 1920 ? 1080 : 900 } });
  for (const h of TELAS) {
    await p.goto(`${BASE}?r=${v++}${h}`, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1500);
    const arq = `${h.replace(/[#/]/g, "_").replace(/^_+/, "")}-${w}`;
    await p.screenshot({ path: `${OUT}/${arq}.png` });
    res[arq] = await p.evaluate(medir);
    const r = res[arq];
    console.log(arq.padEnd(36), r.rolaLado ? "ROLA" : "    ", `peq ${r.nPequenos}`, `fora ${r.foraDaTela.length}`, `cort ${r.cortados.length}`, `sobre ${r.sobrepostos.length}`, `min ${r.fonteMinima}px`);
  }
  await p.close();
}
fs.writeFileSync(`${OUT}/responsivo.json`, JSON.stringify(res, null, 2));
await b.close();
