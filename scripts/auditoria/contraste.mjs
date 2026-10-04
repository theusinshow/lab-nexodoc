// AUDITORIA — contraste em todas as situações do protótipo, agrupado por par de
// cores (texto/fundo), para corrigir no token e não caso a caso. Uso: node ... [saida.json]
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
const BASE = "http://localhost:3200/prototipo";
const AXE = path.resolve("node_modules/axe-core/axe.min.js");
const inv = JSON.parse(fs.readFileSync("docs/redesign-audit/artifacts/screenshots/redesign/inventario.json"));
const b = await chromium.launch({ args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const pares = {};
let v = 0, total = 0;
for (const h of Object.keys(inv)) {
  await p.goto(`${BASE}?c=${v++}${h}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1100);
  await p.addScriptTag({ path: AXE });
  const nos = await p.evaluate(async () => {
    const r = await axe.run(document.querySelector(".pt-tela"), { runOnly: ["color-contrast"], resultTypes: ["violations"] });
    return (r.violations[0]?.nodes ?? []).map((n) => {
      const d = n.any[0]?.data ?? {};
      return { fg: d.fgColor, bg: d.bgColor, ratio: d.contrastRatio, size: d.fontSize, alvo: n.target.join(" ").slice(-70), texto: (document.querySelector(n.target[0])?.textContent ?? "").trim().slice(0, 30) };
    });
  });
  for (const n of nos) {
    total++;
    const k = `${n.fg} / ${n.bg}`;
    pares[k] ??= { ratio: n.ratio, n: 0, telas: new Set(), ex: [] };
    pares[k].n++;
    pares[k].telas.add(h.split("/")[1]);
    if (pares[k].ex.length < 3) pares[k].ex.push(`${n.alvo} «${n.texto}» ${n.size}`);
  }
}
const lista = Object.entries(pares).sort((a, b) => b[1].n - a[1].n).map(([k, x]) => ({ par: k, ratio: x.ratio, n: x.n, telas: [...x.telas].join(","), ex: x.ex }));
console.log("total", total);
for (const x of lista) console.log(`${x.par}  ${x.ratio}  ×${x.n}  [${x.telas}]\n   ${x.ex.join("\n   ")}`);
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(lista, null, 2));
await b.close();
