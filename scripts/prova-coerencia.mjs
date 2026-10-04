// A 117-25 conta a mesma história em toda tela? Lê o que cada tela mostra e confere.
import { chromium } from "playwright";

const BASE = "http://localhost:3200/prototipo";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const vai = async (h) => {
  await p.goto(`${BASE}${h}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1800);
};
const texto = () => p.evaluate(() => document.querySelector(".pt-tela")?.innerText ?? "");
const falhas = [];
const confere = (onde, cond, msg) => {
  console.log(cond ? "ok  " : "FALHA", onde.padEnd(26), msg);
  if (!cond) falhas.push(`${onde}: ${msg}`);
};
const EST = /concreto|estrutural|EST-0|NBR 6123|baldrame/i;

await vai("#/inicio/padrao");
let t = await texto();
confere("Painel", /117-25[\s\S]*2 bloqueios para corrigir/.test(t), "Continuar: 117-25 com 2 bloqueios");
confere("Painel", /Com você\s*4/.test(t), "Com você: 4");
confere("Painel", !EST.test(t), "nenhum achado estrutural");
await p.locator(".pn-sino").click();
await p.waitForTimeout(300);
t = await p.evaluate(() => document.querySelector(".pn-sino-painel")?.innerText ?? "");
confere("Sino", /4 achados/.test(t), "4 achados com você");
confere("Sino", !EST.test(t), "nenhum estrutural");

await vai("#/achados/com-voce");
t = await texto();
confere("Achados", /4 achados/.test(t) && /3 impedem/.test(t), "4 achados, 3 impedem a entrega");
confere("Achados", !/cálculo estrutural/i.test(t), "SIM047-26 não é mais cálculo estrutural");

await vai("#/resultado/nao-emitir");
t = await texto();
confere("Resultado", /Falta tratar\s*6/.test(t), "falta tratar 6");
confere("Resultado", /3 tratados/.test(t), "3 tratados");
confere("Resultado", !/concreto/i.test(t), "sem o achado de concreto");

await vai("#/auditoria/concluida");
t = await texto();
confere("Auditoria", /2 bloqueios, 3 decisões técnicas, 4 de revisão de texto/.test(t), "2 + 3 + 4 = 9");

await vai("#/projetos/lista");
t = await texto();
confere("Projetos", /117-25[\s\S]{0,200}2 com você/.test(t), "117-25: 2 com você");

await vai("#/projeto/com-registros");
t = await texto();
confere("Projeto", /9 achados/.test(t) && !/14 achados/.test(t), "9 achados (e não 14)");
confere("Projeto", /2 achados esperam por você/.test(t), "2 esperam por você");

await vai("#/conversa/auditoria-pronta");
t = await texto();
confere("Conversa", /9 achados/.test(t) && /4 min 21 s/.test(t), "9 achados, 4 min 21 s");

console.log(falhas.length ? `\n${falhas.length} incoerências` : "\ntudo coerente");
await b.close();
