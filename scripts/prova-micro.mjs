// As micro-interações aplicadas: cada uma no lugar dela, capturada no meio do gesto.
import { chromium } from "playwright";

const S = process.argv[2];
const B = "http://localhost:3200/prototipo";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const erros = [];
p.on("pageerror", (e) => erros.push(e.message.slice(0, 150)));
const vai = async (h) => {
  await p.goto(`${B}#/${h}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3000);
};
const foto = async (nome, sel, folga = 16) => {
  const bx = await p.locator(sel).first().boundingBox();
  await p.screenshot({ path: `${S}/m-${nome}.png`, clip: { x: Math.max(0, bx.x - folga), y: Math.max(0, bx.y - folga), width: bx.width + folga * 2, height: bx.height + folga * 2 } });
};
const ok = (n, c) => console.log(c ? "ok  " : "FALHA", n);

// 1. segurar para excluir (peso 2 das confirmações)
await vai("confirmacoes/confirmacao");
const gatilho = p.locator('button:has-text("Excluir permanentemente")');
if (await gatilho.count()) await gatilho.first().click();
await p.waitForTimeout(500);
const seg = p.locator(".ds-segurar").first();
const bx = await seg.boundingBox();
await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2);
await p.mouse.down();
await p.waitForTimeout(500);
await foto("segurar-meio", ".pc-conf--perigo");
await p.mouse.up();
await p.waitForTimeout(400);
ok("soltar antes não exclui", (await seg.getAttribute("data-estado")) === "parado");
await p.mouse.down();
await p.waitForTimeout(1350);
await foto("segurar-feito", ".pc-conf--perigo");
ok("segurar até o fim exclui", (await seg.getAttribute("data-estado")) === "feito");
await p.mouse.up();

// 2 e 3. o chat: modo, treliça, linha do pensamento
await vai("nexo-auditoria/pronta");
await p.locator(".cx-modo").click();
await p.waitForTimeout(400);
await foto("modo", ".cx-modo-painel", 12);
ok("o seletor mostra as duas opções", (await p.locator(".cx-modo-opcao").count()) === 2);
await p.locator('.cx-modo-opcao:has-text("Direta")').click();
ok("escolher troca o rótulo", (await p.locator(".cx-modo").innerText()).includes("Direta"));
await p.locator(".nw-campo textarea").fill("o que trava a emissão?");
await p.keyboard.press("Enter");
await p.waitForTimeout(900);
await foto("pensando", ".nw-fio .cx-nexo >> nth=-1", 10);
ok("pensando mostra a treliça e o tempo", (await p.locator(".nw-fio .ds-trelica").count()) > 0 && (await p.locator(".nw-fio .ds-cronometro").count()) > 0);
await p.waitForTimeout(4500);
await p.locator(".cx-pensou").last().click();
await p.waitForTimeout(500);
await foto("pensou", ".nw-fio .cx-nexo >> nth=-1", 10);
ok("depois recolhe em Pensou por, e abre no clique", (await p.locator(".cx-pensamento-passos").count()) > 0);

// 4 e 5. trilho com dicas aquecidas e grupo de ações, no palco estreito
await p.locator('.na-cita:has-text("ACH-002")').first().click();
await p.waitForTimeout(1200);
await foto("grupo-palco", ".na-palco .ds-grupo", 10);
const icones = p.locator(".na-palco .re-nav button");
await icones.nth(0).hover();
await p.waitForTimeout(550);
const primeira = await p.locator(".ds-dica").count();
await icones.nth(2).hover();
await p.waitForTimeout(60);
await foto("dica", ".na-palco .re-nav", 120);
ok("a primeira dica espera; a seguinte abre na hora", primeira === 1 && (await p.locator(".ds-dica").innerText()).includes("Relatório"));

// 6. o Ver no memorial com a luz que segue o mouse
const vm = p.locator(".na-palco .rs-ver-memorial");
const vb = await vm.boundingBox();
await p.mouse.move(vb.x + vb.width * 0.25, vb.y + vb.height / 2);
await p.waitForTimeout(300);
await foto("ver-memorial-hover", ".na-palco .rs-ver-memorial", 14);

// 7. as abas do Resultado deslizam
await vai("resultado/nao-emitir");
await p.locator('.re-nav button:has-text("Relatório")').click();
await p.waitForTimeout(90);
await p.screenshot({ path: `${S}/m-aba-deslizando.png`, clip: { x: 0, y: 120, width: 1440, height: 420 } });
await p.waitForTimeout(600);
ok("a aba trocou", (await p.locator('.re-nav button[aria-current="page"]').innerText()).includes("Relatório"));

// 8. o sino da auditoria
await vai("auditoria/em-curso");
const sino = p.locator(".ds-sino");
await sino.scrollIntoViewIfNeeded();
if ((await sino.getAttribute("aria-checked")) === "true") await sino.click();
await p.waitForTimeout(300);
await sino.click();
await p.waitForTimeout(160);
await foto("sino", ".au-depois", 6);
ok("o sino liga", (await sino.getAttribute("aria-checked")) === "true");

// 9. o arquivo enviando no campo
await vai("conversa/anexando");
await p.waitForTimeout(700);
await foto("enviando", ".cx-campo-arquivos", 8);

console.log("erros:", erros.length ? erros : "nenhum");
await b.close();
