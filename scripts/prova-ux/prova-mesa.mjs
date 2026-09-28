// Mesa de montagem manual — V01–V10 (T04–T10) contra o servidor isolado.
// PDFs sintéticos (pdf-lib) com texto identificável por página. A exportação
// usa o gerador REAL (/api/volume/build) em modo independente (sem projeto →
// nada é gravado em projeto). A conferência (/api/volume/analyze) é
// interceptada: não há chamada de IA.
import fs from "node:fs";
import JSZip from "jszip";
import { BASE, EVID, abrir, login, checar, fim, shot } from "./lib.mjs";
import { pdfIdentificado } from "./fixtures.mjs";

const capa = await pdfIdentificado("CAPA UX", 2);
const ld = await pdfIdentificado("LD UX", 1);
const pr = await pdfIdentificado("PRANCHAS UX", 6);
const arq = (nome, b) => ({ name: nome, mimeType: "application/pdf", buffer: b.bytes });

const { browser, context, page, erros } = await abrir({ viewport: { width: 1600, height: 1000 } });
await login(page, "/volumes");

async function abrirMesa(p = page) {
  await p.goto(`${BASE}/volumes`, { waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => {
    const g = document.querySelector("[data-gravacao]")?.getAttribute("data-gravacao");
    return g && g !== "carregando";
  }, null, { timeout: 60000 });
}
async function esperarSalvo(p = page) {
  await p.waitForFunction(() => document.querySelector("[data-gravacao]")?.getAttribute("data-gravacao") === "salvo", null, { timeout: 20000 }).catch(() => {});
  return p.locator("[data-gravacao]").getAttribute("data-gravacao");
}
const aviso = (p = page) => p.locator("[data-aviso-da-mesa]").innerText().catch(() => "");
const vol = (i) => page.locator("[data-volume]").nth(i);
const idDoVolume = (i) => vol(i).getAttribute("data-volume");

// Começa limpo: descarta rascunho que uma rodada anterior tenha deixado.
await abrirMesa();
await page.evaluate(() => new Promise((ok) => { const r = indexedDB.deleteDatabase("nexodoc-mesa"); r.onsuccess = r.onerror = r.onblocked = () => ok(null); }));
await abrirMesa();
checar((await page.locator("[data-gravacao]").getAttribute("data-gravacao")) === "vazia", "mesa nova: nada a salvar ainda");

// ---- importação por tipo (V09)
const entrada = page.locator("[data-entrada-de-arquivos]");
async function importar(tipo, arquivos) {
  await page.getByRole("radio", { name: new RegExp(`^${tipo}`) }).click();
  await entrada.setInputFiles(arquivos);
}
await importar("Capas", [arq("ux_capa.pdf", capa)]);
await importar("LDs", [arq("ux_ld.pdf", ld)]);
await importar("Pranchas", [arq("ux_pranchas.pdf", pr)]);
await page.waitForFunction(() => document.querySelectorAll('[data-fila="importado"]').length === 3, null, { timeout: 30000 }).catch(() => {});
checar((await page.locator('[data-fila="importado"]').count()) === 3, "três PDFs importados, cada um com estado na fila");

// ---- dois volumes, dois grupos cada (V01)
await page.getByRole("button", { name: "Adicionar volume" }).first().click();
checar((await vol(0).locator("[data-estado-do-volume]").getAttribute("data-estado-do-volume")) === "incompleto", "V01: volume recém-criado não é pronto (incompleto: grupo sem pranchas)");
checar(!(await page.getByRole("button", { name: /^Gerar (PDF|ZIP)/ }).isEnabled()), "V01: exportar desabilitado com volume vazio");
checar((await page.locator('[data-pendencia="bloqueio"]').allInnerTexts()).some((t) => /sem pranchas/.test(t)), "V01: pendência 'sem pranchas' listada com destino");
await page.getByRole("button", { name: "Adicionar volume" }).first().click();
await page.getByRole("button", { name: "Adicionar grupo a Volume 01" }).click();
await page.getByRole("button", { name: "Adicionar grupo a Volume 02" }).click();
const v1 = await idDoVolume(0);
const v2 = await idDoVolume(1);
const grupos = async (i) => vol(i).locator("[data-grupo]").evaluateAll((els) => els.map((e) => e.getAttribute("data-grupo")));
const [g11, g12] = await grupos(0);
const [g21, g22] = await grupos(1);
checar(Boolean(g11 && g12 && g21 && g22), "dois volumes com dois grupos cada");

// ---- T06: inserir no 2º grupo do 2º volume, sem arrastar, por teclado
await page.getByLabel("Volume de destino").selectOption(v2);
await page.getByLabel("Grupo de destino").selectOption(g22);
for (const p of [3, 4]) {
  const cx = page.getByRole("checkbox", { name: `Selecionar página ${p} de ux_pranchas.pdf` });
  await cx.focus();
  await page.keyboard.press("Space");
}
const botao = page.getByRole("button", { name: /^Adicionar 2 páginas como Pranchas em Volume 02 › Grupo 2/ });
checar((await botao.count()) === 1, "o botão diz o destino ANTES de aplicar: Volume 02 › Grupo 2");
await botao.focus();
await page.keyboard.press("Enter");
const docsDe = (vi, gid) => vol(vi).locator(`[data-grupo="${gid}"] [data-lugar^="document-item"]`).count();
checar((await docsDe(1, g22)) === 2 && (await docsDe(1, g21)) === 0 && (await docsDe(0, g11)) === 0 && (await docsDe(0, g12)) === 0, "T06: só Volume 02 › Grupo 2 recebeu as 2 páginas");
checar(/2 páginas adicionadas em Volume 02 › Grupo 2 › Pranchas/.test(await aviso()), "aviso diz o que aconteceu, com Desfazer");
await page.getByRole("button", { name: "Limpar seleção" }).click();

// ---- completar a montagem: pranchas nos outros grupos, capa no V1, nomes
async function colocar(vid, gid, paginas, tipo = "Pranchas", arquivo = "ux_pranchas.pdf") {
  await page.getByLabel("Volume de destino").selectOption(vid);
  if (gid) await page.getByLabel("Grupo de destino").selectOption(gid);
  for (const p of paginas) await page.getByRole("checkbox", { name: `Selecionar página ${p} de ${arquivo}` }).check();
  await page.getByRole("button", { name: new RegExp(`^Adicionar ${paginas.length === 1 ? "1 página" : `${paginas.length} páginas`} como ${tipo} em`) }).click();
  await page.getByRole("button", { name: "Limpar seleção" }).click();
}
await colocar(v1, g11, [1]);
await colocar(v1, g12, [2]);
await colocar(v2, g21, [5]);
await colocar(v1, g11, [1], "Capa", "ux_capa.pdf");
await colocar(v1, g11, [1], "LD", "ux_ld.pdf");
await vol(0).getByLabel("Nome final do PDF").fill("ux_vol1.pdf");
await vol(1).getByLabel("Nome final do PDF").fill("ux_vol2.pdf");
await vol(1).getByLabel(/^Título de Volume 02/).fill("Volume das estruturas");
checar((await page.locator("[data-exportavel]").getAttribute("data-exportavel")) === "true", "V01: com pranchas e nomes, a montagem fica exportável");
await shot(page, "v-mesa-montada-1600");

// ---- T04/V02: F5 preserva ordem, nomes, páginas e bytes
checar((await esperarSalvo()) === "salvo", "V02: 'salvo neste dispositivo' só depois da gravação");
const antes = await page.locator("[data-volume]").evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, " ")));
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-rascunho-recuperado]", { timeout: 30000 }).catch(() => {});
checar(await page.locator("[data-rascunho-recuperado]").count() === 1, "F5: 'Montagem recuperada deste dispositivo'");
checar(!/Sem conteúdo guardado/.test(await page.locator("[data-rascunho-recuperado]").innerText().catch(() => "")), "F5: os BYTES voltaram (nenhum arquivo sem conteúdo)");
const depois = await page.locator("[data-volume]").evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, " ")));
checar(JSON.stringify(depois) === JSON.stringify(antes), "F5: volumes, grupos, ordem, nomes e páginas idênticos");
checar((await vol(1).getByLabel(/^Título de Volume 02/).inputValue()) === "Volume das estruturas", "F5: título editado preservado");
checar((await page.locator("[data-exportavel]").getAttribute("data-exportavel")) === "true", "F5: continua exportável (bytes presentes)");
await page.getByRole("button", { name: "Continuar" }).click();
await shot(page, "v-mesa-recuperada-apos-f5-1600");


// ---- T07/V05: remover arquivo usado em dois volumes e desfazer
const contagem = async () => Promise.all([docsDe(0, g11), docsDe(0, g12), docsDe(1, g21), docsDe(1, g22)]);
const antesDaRemocao = await contagem();
const remover = page.getByRole("button", { name: /^Remover ux_pranchas\.pdf\. Usado em 5 lugares: 4 grupos de 2 volumes\./ });
checar((await remover.count()) === 1, "V05: o botão Remover informa o impacto ANTES (5 lugares, 4 grupos, 2 volumes)");
await remover.click();
checar(/ux_pranchas\.pdf removido\. Saiu de 5 lugares/.test(await aviso()), "V05: aviso diz de onde saiu");
checar(JSON.stringify(await contagem()) === "[0,0,0,0]", "V05: referências saíram dos dois volumes");
await page.locator("[data-aviso-da-mesa]").getByRole("button", { name: "Desfazer" }).click();
checar(JSON.stringify(await contagem()) === JSON.stringify(antesDaRemocao), "T07: desfazer restaura os dois volumes, na mesma ordem");
checar((await page.locator("[data-exportavel]").getAttribute("data-exportavel")) === "true", "T07: bytes voltaram junto (exportável de novo)");
await page.getByRole("button", { name: /^Refazer/ }).first().click();
checar(JSON.stringify(await contagem()) === "[0,0,0,0]", "refazer repete a remoção");
await page.getByRole("button", { name: /^Desfazer/ }).first().click();
checar(JSON.stringify(await contagem()) === JSON.stringify(antesDaRemocao), "e desfaz de novo");

// ---- trocar capa: substituição anunciada e reversível
await colocar(v1, g11, [2], "Capa", "ux_capa.pdf");
checar(/Capa substituída .* saiu ux_capa\.pdf p\. 1, entrou ux_capa\.pdf p\. 2/.test(await aviso()), "V03/V05: troca de capa diz o que saiu e o que entrou");
await page.locator("[data-aviso-da-mesa]").getByRole("button", { name: "Desfazer" }).click();
checar((await vol(0).locator(`[data-lugar="cover:${v1}"]`).innerText()).includes("Página 1"), "desfazer devolve a capa p. 1");

// ---- V08: duplicar grupo; editar a cópia não altera o original
await page.getByRole("button", { name: "Duplicar Grupo 1 de Volume 01" }).click();
const gruposV1 = await vol(0).locator("[data-grupo]").evaluateAll((els) => els.map((e) => e.getAttribute("data-grupo")));
checar(gruposV1.length === 3 && gruposV1[0] === g11 && gruposV1[1] !== g11, "V08: cópia logo abaixo, com id próprio");
await vol(0).locator(`#gt-${gruposV1[1]}`).fill("Cópia editada");
checar((await vol(0).locator(`#gt-${g11}`).inputValue()) === "Grupo 1", "V08: editar a cópia não altera o original");
await page.getByRole("button", { name: /^Remover Grupo 2 \(Cópia editada\) de Volume 01/ }).click();
// mover volume e grupo com botões nomeados
await page.getByRole("button", { name: /^Mover Volume 02 .* para cima$/ }).click();
checar((await idDoVolume(0)) === v2, "V08: mover volume para cima");
await page.getByRole("button", { name: /^Mover Volume 01 .* para baixo$/ }).click();
checar((await idDoVolume(0)) === v1, "e de volta");

// ---- T08/V06: resposta atrasada não aprova versão nova
let respostas = 0;
await page.route("**/api/volume/analyze", async (r) => {
  respostas++;
  await new Promise((ok) => setTimeout(ok, 2500));
  await r.fulfill({ json: { status: "sem_problemas", summary: "Nenhum problema (simulado).", batchWarnings: [], rowWarnings: [], requiresManualConfirmation: false } });
});
await page.getByRole("button", { name: /^Conferir esta versão/ }).click();
await vol(0).getByLabel(/^Título de Volume 01/).fill("Volume 01 alterado durante a conferência");
await page.waitForFunction(() => document.querySelector("[data-conferencia]")?.getAttribute("data-conferencia") !== "nunca", null, { timeout: 15000 });
checar((await page.locator("[data-conferencia]").getAttribute("data-conferencia")) === "desatualizada", "T08: resposta da versão 1 chegou depois da edição → desatualizada, não aprovada");
await page.getByRole("button", { name: /^Conferir (esta versão|de novo)/ }).click();
await page.waitForFunction(() => document.querySelector("[data-conferencia]")?.getAttribute("data-conferencia") === "valida", null, { timeout: 15000 }).catch(() => {});
checar((await page.locator("[data-conferencia]").getAttribute("data-conferencia")) === "valida", "V06: conferida → selo vale para esta versão");
await vol(0).getByLabel(/^Título de Volume 01/).fill("Volume 01");
checar((await page.locator("[data-conferencia]").getAttribute("data-conferencia")) === "desatualizada", "V06: qualquer edição invalida o selo");
checar((await page.locator("[data-situacao-da-conferencia]").getAttribute("data-situacao-da-conferencia")) === "desatualizada", "V06: exportação também mostra 'alterada após conferir'");
await page.unroute("**/api/volume/analyze");
checar(respostas === 2, "duas conferências pedidas, nenhuma IA real (rota interceptada)");

// ---- T09/V09: corrompido, duplicado, ODT; reclassificar preserva referências
await importar("Pranchas", [{ name: "ruim.pdf", mimeType: "application/pdf", buffer: Buffer.from("isto não é um pdf") }]);
await importar("Pranchas", [arq("ux_pranchas_copia.pdf", pr)]);
await entrada.setInputFiles([{ name: "memorial.odt", mimeType: "application/vnd.oasis.opendocument.text", buffer: Buffer.from("odt") }]);
await page.waitForTimeout(1500);
const fila = await page.locator("[data-fila]").evaluateAll((els) => els.map((e) => `${e.getAttribute("data-fila")}|${e.innerText.replace(/\s+/g, " ")}`));
checar(fila.some((f) => f.startsWith("ilegivel|") && f.includes("ruim.pdf") && /corrompido/.test(f)), "T09: PDF corrompido → não importado, com motivo junto do nome");
checar(fila.some((f) => f.startsWith("duplicado|") && f.includes("ux_pranchas_copia.pdf") && f.includes("ux_pranchas.pdf")), "T09: mesmo conteúdo → duplicado, diz de qual");
checar(fila.some((f) => f.startsWith("recusado|") && f.includes("memorial.odt") && /exporte o documento em PDF/.test(f)), "T09: ODT recusado com instrução");
checar((await page.locator("[data-arquivo]").count()) === 3, "nenhum dos três entrou na lista de arquivos");
const antesReclass = await contagem();
await page.getByLabel("Tipo de ux_pranchas.pdf").selectOption("appendix");
checar(/passou a Anexo\. O que já estava montado não mudou de lugar/.test(await aviso()), "V09: reclassificar diz o efeito");
checar(JSON.stringify(await contagem()) === JSON.stringify(antesReclass), "T09: reclassificar preservou as referências montadas");
await page.getByLabel("Tipo de ux_pranchas.pdf").selectOption("document");

// ---- T05/V02: falha de armazenamento não vira "salvo"
await esperarSalvo();
await page.evaluate(() => {
  const w = window;
  w.__putOriginal = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function () {
    throw new DOMException("cheio", "QuotaExceededError");
  };
});
await vol(1).getByLabel(/^Título de Volume 02/).fill("Título que não coube");
await page.waitForFunction(() => document.querySelector("[data-gravacao]")?.getAttribute("data-gravacao") === "falha", null, { timeout: 10000 }).catch(() => {});
checar((await page.locator("[data-gravacao]").getAttribute("data-gravacao")) === "falha", "T05: quota cheia → 'não salvo', nunca 'salvo'");
checar(/espaço de armazenamento/.test(await page.locator("[data-gravacao]").innerText()), "T05: diz o motivo");
checar((await vol(1).getByLabel(/^Título de Volume 02/).inputValue()) === "Título que não coube", "T05: a montagem continua na memória");
await shot(page, "v-mesa-falha-de-gravacao-1600");
await page.evaluate(() => {
  IDBObjectStore.prototype.put = window.__putOriginal;
});
await page.getByRole("button", { name: "Tentar salvar de novo" }).click();
checar((await esperarSalvo()) === "salvo", "T05: tentar de novo salva quando o armazenamento volta");

// ---- T04: duas abas — a velha não sobrescreve a nova
const outra = await context.newPage();
await abrirMesa(outra);
await outra.getByRole("button", { name: "Continuar" }).click().catch(() => {});
await vol(1).getByLabel(/^Título de Volume 02/).fill("Editado na aba A");
checar((await esperarSalvo()) === "salvo", "aba A salvou");
await outra.waitForFunction(() => document.querySelector("[data-gravacao]")?.getAttribute("data-gravacao") === "conflito", null, { timeout: 10000 }).catch(() => {});
checar((await outra.locator("[data-gravacao]").getAttribute("data-gravacao")) === "conflito", "T04: aba B sabe que a montagem mudou em outra aba");
await outra.locator("[data-volume]").nth(1).getByLabel(/^Título de Volume 02/).fill("Editado na aba B (velha)");
await outra.waitForTimeout(1500);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-rascunho-recuperado]", { timeout: 30000 });
checar((await vol(1).getByLabel(/^Título de Volume 02/).inputValue()) === "Editado na aba A", "T04: a aba velha NÃO sobrescreveu em silêncio");
await outra.getByRole("button", { name: "Carregar a versão mais nova" }).click();
await outra.waitForTimeout(1500);
checar((await outra.locator("[data-volume]").nth(1).getByLabel(/^Título de Volume 02/).inputValue()) === "Editado na aba A", "aba B carrega a versão mais nova quando pede");
await outra.close();
await page.getByRole("button", { name: "Continuar" }).click();

// ---- V07/T10: três volumes; prévia do volume 2 e ZIP real
await page.getByRole("button", { name: "Adicionar volume" }).first().click();
const v3 = await idDoVolume(2);
const [g31] = await vol(2).locator("[data-grupo]").evaluateAll((els) => els.map((e) => e.getAttribute("data-grupo")));
await colocar(v3, g31, [6]);
await vol(2).getByLabel("Nome final do PDF").fill("ux_vol3.pdf");
await page.getByLabel("Prévia de").selectOption(v2);
const gatilho = page.getByRole("button", { name: "Abrir prévia" });
await gatilho.click();
const dialogo = page.getByRole("dialog", { name: "Prévia do PDF" });
await dialogo.waitFor();
await page.waitForFunction(() => document.querySelector("[data-paginas-da-previa]")?.getAttribute("data-paginas-da-previa"), null, { timeout: 30000 }).catch(() => {});
const nPrevia = Number(await page.locator("[data-paginas-da-previa]").getAttribute("data-paginas-da-previa"));
const sequencias = {};
async function lerSequencia() {
  return dialogo.locator("[data-sequencia]").evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, " ")));
}
sequencias[v2] = await lerSequencia();
checar(nPrevia === sequencias[v2].length && nPrevia === 5, `V07: prévia do volume 2 de 3 sem baixar nada (${nPrevia} páginas, sequência com ${sequencias[v2].length})`);
await dialogo.getByRole("button", { name: "Próxima página da prévia" }).click();
await page.waitForFunction(() => [...document.querySelectorAll(".react-pdf__Page__textContent")].some((e) => e.textContent.includes("PRANCHAS UX - pagina 5")), null, { timeout: 30000 }).catch(() => {});
checar((await dialogo.locator(".react-pdf__Page__textContent").innerText().catch(() => "")).includes("PRANCHAS UX - pagina 5"), "V07: a página 2 renderizada é a prancha 5 (PDF real, não árvore)");
await shot(page, "v-previa-volume-2-de-3-1600");
for (const id of [v1, v3]) {
  await dialogo.getByLabel("Volume da prévia").selectOption(id);
  await page.waitForTimeout(1200);
  sequencias[id] = await lerSequencia();
}
await page.keyboard.press("Escape");
checar((await dialogo.count()) === 0, "Escape fecha a prévia");
checar(await page.evaluate(() => document.activeElement?.textContent?.includes("Abrir prévia")), "o foco volta para quem abriu");

const [download] = await Promise.all([
  page.waitForEvent("download", { timeout: 60000 }),
  page.getByRole("button", { name: /^Gerar ZIP \(3 PDFs\)/ }).click(),
]);
const caminho = `${EVID}/../../../../scratchpad/ux-export.zip`;
await download.saveAs(caminho);
const zip = await JSZip.loadAsync(fs.readFileSync(caminho));
const nomes = Object.keys(zip.files).sort();
checar(JSON.stringify(nomes.filter((n) => n.endsWith(".pdf"))) === JSON.stringify(["ux_vol1.pdf", "ux_vol2.pdf", "ux_vol3.pdf"]), `T10: ZIP real com os 3 PDFs nomeados (${nomes.join(", ")})`);
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
async function textos(bytes) {
  const doc = await pdfjs.getDocument({ data: bytes, useSystemFonts: true }).promise;
  const out = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const t = await (await doc.getPage(i)).getTextContent();
    out.push(t.items.map((x) => x.str).join(" "));
  }
  return out;
}
const esperado = (linha) => {
  const m = linha.match(/(ux_\w+)\.pdf p\. (\d+)/);
  if (m) return { ux_capa: "CAPA UX", ux_ld: "LD UX", ux_pranchas: "PRANCHAS UX" }[m[1]] + ` - pagina ${m[2]}`;
  return linha.replace(/^\d+ Separatriz automática /, "").trim();
};
for (const [id, nome] of [[v1, "ux_vol1.pdf"], [v2, "ux_vol2.pdf"], [v3, "ux_vol3.pdf"]]) {
  const t = await textos(new Uint8Array(await zip.file(nome).async("uint8array")));
  const seq = sequencias[id];
  const ok = t.length === seq.length && seq.every((linha, i) => t[i].includes(esperado(linha)));
  checar(ok, `T10: ${nome} tem a mesma sequência da prévia (${t.length} págs.)`);
}
checar(/Registrado no projeto/.test(await page.locator("[data-exportado]").innerText()) === false, "modo independente: exportar não registrou em projeto");

// ---- V10: vincular a projeto sem perder a montagem
// O destino ativo é estado da TELA (volta ao primeiro grupo no F5), não da montagem.
const semDestino = (t) => t.replace(/\s+/g, " ").replace(/(DESTINO ATUAL|USAR COMO DESTINO) /g, "");
const antesDoVinculo = await page.locator("[data-volume]").evaluateAll((els) => els.map((e) => e.innerText));
// FOCO, e não clique: o clique abre o menu nativo do <select>, e com ele aberto
// o Chromium segura os temporizadores da página (o autosave não disparava).
await page.getByLabel("Projeto").focus();
await page.waitForTimeout(1200);
const opcao = await page.locator("#mesa-projeto option").nth(1).getAttribute("value");
await page.getByLabel("Projeto").selectOption(opcao);
await page.waitForFunction(() => location.search.includes("project="), null, { timeout: 10000 }).catch(() => {});
checar(new URL(page.url()).searchParams.get("project") === opcao, "V10: URL passa a levar o projeto");
checar(/Montagem vinculada a/.test(await aviso()), "V10: aviso diz o vínculo e a garantia (continua só neste dispositivo)");
const faseV10 = await esperarSalvo();
if (faseV10 !== "salvo") console.log("DBG timers:", await page.evaluate(() => new Promise((ok) => { const t0 = performance.now(); setTimeout(() => ok({ disparou: Math.round(performance.now() - t0), vis: document.visibilityState, foco: document.hasFocus() }), 100); setTimeout(() => ok({ disparou: "nao em 3s", vis: document.visibilityState }), 3000); })));
checar(faseV10 === "salvo", "V10: salvo no escopo do projeto");
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-rascunho-recuperado]", { timeout: 30000 });
const aposVinculo = await page.locator("[data-volume]").evaluateAll((els) => els.map((e) => e.innerText));
checar(JSON.stringify(aposVinculo.map(semDestino)) === JSON.stringify(antesDoVinculo.map(semDestino)), "V10: depois do F5 no projeto, mesmos volumes, ordem e arquivos");
checar(!/Sem conteúdo guardado/.test(await page.locator("[data-rascunho-recuperado]").innerText()), "V10: bytes vieram junto");
await page.goto(`${BASE}/volumes`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.querySelector("[data-gravacao]")?.getAttribute("data-gravacao") !== "carregando", null, { timeout: 30000 });
checar((await page.locator("[data-volume]").count()) === 0, "V10: o escopo independente ficou vazio — a montagem foi MOVIDA, não copiada");

checar(erros.length === 0, `sem erro de página (${erros.join(" | ").slice(0, 300)})`);
await browser.close();
fim();
