// AUDITORIA — "a existência de um botão não prova que ele funciona": em cada
// tela, cada botão visível é clicado numa página recém-carregada, e se nada muda
// (DOM, endereço, diálogo, foco num elemento novo) ele entra como MORTO.
// Uso: node ... <saida.json>
import { chromium } from "playwright";
import fs from "node:fs";

const OUT = process.argv[2];
const BASE = "http://localhost:3200/prototipo";
const ALVOS = [
  "#/inicio/padrao", "#/nexo-auditoria/pronta", "#/conversa/nova", "#/nexo/lido", "#/mapa/lido", "#/auditoria/em-curso",
  "#/resultado/nao-emitir", "#/resultado/fila", "#/achados/com-voce", "#/projetos/lista", "#/projeto/com-registros",
  "#/admin/cockpit", "#/admin/pessoas", "#/admin/dados", "#/ajuda/inicio", "#/entrada/padrao",
];
const b = await chromium.launch({ args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const resultado = {};
let v = 0;
for (const alvo of ALVOS) {
  await p.goto(`${BASE}?m=${v++}${alvo}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1400);
  const nomes = await p.$$eval(".pt-tela button", (bs) =>
    bs
      .filter((x) => x.offsetWidth && x.offsetHeight && !x.disabled)
      .map((x) => (x.getAttribute("aria-label") || x.innerText || x.title || "?").replace(/\s+/g, " ").trim().slice(0, 50)),
  );
  const mortos = [];
  const total = Math.min(nomes.length, 45);
  for (let i = 0; i < total; i++) {
    await p.goto(`${BASE}?m=${v++}${alvo}`, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1100);
    const bt = p.locator(".pt-tela button:visible:not([disabled])").nth(i);
    if (!(await bt.count())) continue;
    await p.evaluate(() => {
      window.__mut = 0;
      window.__obs = new MutationObserver((ms) => (window.__mut += ms.length));
      window.__obs.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
      window.__hash = location.hash;
      window.__foco = document.activeElement;
    });
    try {
      await bt.click({ timeout: 2500 });
    } catch {
      continue;
    }
    await p.waitForTimeout(600);
    const efeito = await p.evaluate(() => ({ mut: window.__mut, hash: location.hash !== window.__hash }));
    // a página do protótipo pode ter navegado: aí o efeito existe
    if (!efeito.hash && efeito.mut === 0) mortos.push(nomes[i]);
  }
  resultado[alvo] = { botoes: nomes.length, testados: total, mortos };
  console.log(alvo.padEnd(28), `${total} testados`, `${mortos.length} sem efeito`);
}
fs.writeFileSync(OUT, JSON.stringify(resultado, null, 2));
await b.close();
