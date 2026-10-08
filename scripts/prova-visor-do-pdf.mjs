// O visor do PDF ampliado (VisorDoMemorial): navegação, zoom e enquadramento.
//
//   node scripts/prova-visor-do-pdf.mjs   (== npm run prova:visor-do-pdf)
//
// HISTÓRICO
//
// 13/08/2026: o visor antigo só alcançava as folhas com pin — num memorial de
// 12 páginas com 3 achados, nove eram inalcançáveis. Ganhou "Página [n] de N",
// setas e zoom.
//
// 08/10/2026: reescrita para o visor de hoje (components/telas/resultado/
// visor.tsx), que abre por cima do resultado pelo "Ver no memorial". A versão
// de agosto procurava "VER NO DOCUMENTO" e os pins da margem, que não existem
// mais — não rodava fazia semanas.
//
// O memorial é gerado com pdf-lib, em memória: doze páginas de texto de
// verdade. Sem amostra confidencial e sem token.
import { chromium } from "playwright";
import { PDFDocument, StandardFonts } from "pdf-lib";
import fs from "node:fs";

import { pularTourGuiado } from "./lib/sessao-de-teste.mjs";

const BASE = process.env.SHOT_BASE ?? "http://localhost:3000";
const OUT = process.env.SHOT_OUT ?? "./scratchpad/qa";
fs.mkdirSync(OUT, { recursive: true });

const PAGINAS = 12;
// INC-001 está em DUAS páginas (3 e 7): é ele que exercita Shift+→.
const ACHADOS = [
  { id: "INC-001", paginas: [3, 7] },
  { id: "INC-002", paginas: [11] },
];
// Uma folha SEM achado nenhum.
const PAGINA_ORFA = 5;
const LARGURA = Number(process.env.SHOT_LARGURA ?? 1440);
const ALTURA = Number(process.env.SHOT_ALTURA ?? 900);

let falhas = 0;
function check(nome, ok, detalhe = "") {
  if (ok) console.log(`  OK      ${nome}${detalhe ? `  (${detalhe})` : ""}`);
  else {
    falhas++;
    console.error(`  FALHOU  ${nome}${detalhe ? ` :: ${detalhe}` : ""}`);
  }
}

// --- o memorial de mentira --------------------------------------------------
const doc = await PDFDocument.create();
const fonte = await doc.embedFont(StandardFonts.Helvetica);
for (let p = 1; p <= PAGINAS; p++) {
  const pagina = doc.addPage([595, 842]);
  pagina.drawText("12 - INSTALACOES ELETRICAS", { x: 60, y: 780, size: 14, font: fonte });
  pagina.drawText(`Pagina ${p} do memorial de teste`, { x: 60, y: 750, size: 11, font: fonte });
  for (let l = 0; l < 28; l++) {
    pagina.drawText(`linha ${l} da pagina ${p} com texto de corpo dez`, { x: 60, y: 710 - l * 20, size: 10, font: fonte });
  }
  pagina.drawText(`trecho de conferencia ${p}`, { x: 60, y: 90, size: 10, font: fonte });
}
const pdfB64 = Buffer.from(await doc.save()).toString("base64");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: LARGURA, height: ALTURA } });
const erros = [];
page.on("pageerror", (e) => erros.push(String(e)));

const visor = page.locator('[role="dialog"][aria-label="Memorial com os achados"]');
const campo = visor.getByLabel("Ir para a página");
const paginaAtual = async () => Number(await campo.inputValue());
const canvas = () =>
  page.evaluate(() => {
    const c = document.querySelector(".vm-pdf .react-pdf__Page canvas");
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
const mesa = () =>
  page.evaluate(() => {
    const m = document.querySelector(".vm-mesa");
    if (!m) return null;
    const r = m.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), top: m.scrollTop, alto: m.scrollHeight - m.clientHeight };
  });
/**
 * O marca-texto (08/10/2026): as faixas desenhadas, as caixas dos `<mark>` que
 * elas cobrem e a cor que se VÊ no `<mark>` (tem de ser transparente).
 */
const grifo = () =>
  page.evaluate(() => {
    const folha = document.querySelector(".vm-pdf .react-pdf__Page");
    if (!folha) return null;
    const faixas = [...folha.querySelectorAll(".grifo-faixa")].map((f) => {
      const r = f.getBoundingClientRect();
      return { x: r.left, y: r.top, d: r.right, b: r.bottom, pinta: f.classList.contains("grifo-faixa--pinta"), cor: getComputedStyle(f).backgroundColor };
    });
    const marcas = [...folha.querySelectorAll(".textLayer mark")].flatMap((m) => [...m.getClientRects()]);
    const fundoDaMarca = marcas.length ? getComputedStyle(folha.querySelector(".textLayer mark")).backgroundColor : null;
    const tom = folha.closest("[data-grifo-tom]")?.getAttribute("data-grifo-tom") ?? null;
    const cobre = marcas.every((m) => faixas.some((f) => m.left >= f.x - 1 && m.right <= f.d + 1 && m.top >= f.y - 1 && m.bottom <= f.b + 1));
    return { faixas, marcas: marcas.length, fundoDaMarca, tom, cobre };
  });
/** Espera a folha pedida estar desenhada (o canvas do react-pdf troca). */
const esperarFolha = async () => {
  await page.waitForFunction(() => document.querySelector(".vm-pdf .react-pdf__Page canvas"), null, { timeout: 15000 });
  await page.waitForTimeout(900);
};
const ir = async (n) => {
  await campo.fill(String(n));
  await campo.press("Enter");
  await esperarFolha();
};
const tecla = async (k) => {
  // As teclas do visor não valem dentro de campo: tira o foco antes.
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await page.keyboard.press(k);
  await esperarFolha();
};

try {
  await pularTourGuiado(page);
  await page.goto(`${BASE}/nexo`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) {
    await page.getByRole("button", { name: /Entrar como dev/i }).click();
    await page.waitForURL("**/nexo**", { timeout: 20000 });
  }
  await page.waitForTimeout(1500);

  await page.evaluate(
    async ({ pdfB64, achados }) => {
      const convId = "qa-visor-do-pdf";
      const bytes = Uint8Array.from(atob(pdfB64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const db = await new Promise((res, rej) => {
        const req = indexedDB.open("nexo");
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
      const put = (store, valor) =>
        new Promise((res, rej) => {
          const tx = db.transaction(store, "readwrite");
          tx.objectStore(store).put(valor);
          tx.oncomplete = () => res();
          tx.onerror = () => rej(tx.error);
        });
      await put("result_blobs", { key: `${convId}:memorial`, blob });
      const agora = Date.now();
      const incongruencias = achados.map((a) => ({
        id: a.id,
        prioridade: "Media",
        pagina: a.paginas.join(", "),
        capitulo: "",
        local: "",
        tipo: "Redação / editorial",
        descricao: "Achado semeado.",
        evidencia: a.paginas.map((p) => `Pág. ${p}: "trecho de conferencia ${p}"`).join(" | "),
        termo_busca: `trecho de conferencia ${a.paginas[0]}`,
        conflito: "Diverge.",
        sugestao_correcao: "Corrigir.",
        confianca: "alta",
        origem: "ia",
        impacto: "revisao_editorial",
      }));
      await put("conversations", {
        id: convId,
        title: "QA VISOR DO PDF",
        createdAt: agora,
        updatedAt: agora,
        messages: [{ id: "m1", role: "assistant", content: "Auditoria concluída." }],
        seloResults: [],
        results: [
          {
            artifactId: "auditoria:qa-visor-do-pdf",
            kind: "auditoria",
            summary: "Auditoria",
            files: [],
            payload: {
              auditId: "qa-visor-do-pdf",
              texto: "RESULTADO",
              report: {
                tipo_auditoria: "memorial",
                tipo_documento: "memorial descritivo",
                obra: "QA",
                codigo: "000-00",
                municipio: "",
                data_documento: "",
                status_analise: "concluida",
                status_geral: "com pontos de revisão",
                total_incongruencias: incongruencias.length,
                arquivos_analisados: [],
                comparacoes: [],
                conclusao: ".",
                incongruencias,
              },
            },
          },
        ],
        memorial: { name: "memorial-qa.pdf", blobKey: `${convId}:memorial` },
      });
    },
    { pdfB64, achados: ACHADOS },
  );

  await page.goto(`${BASE}/nexo?c=qa-visor-do-pdf`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const naLista = page.getByText("QA VISOR DO PDF", { exact: false }).first();
  if (!(await page.getByRole("button", { name: /Ver no memorial/i }).count())) {
    await naLista.click({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }
  const abaAchados = page.getByRole("button", { name: /^Achados/i }).first();
  if ((await abaAchados.count()) > 0) await abaAchados.click().catch(() => {});
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/visor-0-antes.png` });

  // O achado entre páginas troca o "Ver no memorial" pelos chips "p. 3", "p. 7";
  // M abre o visor nos dois casos.
  await page.getByText("Achado semeado.").first().waitFor({ timeout: 15000 });
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await page.keyboard.press("m");
  await visor.waitFor({ timeout: 15000 });
  await esperarFolha();
  await page.waitForTimeout(1500);

  // --- 1. abre no achado --------------------------------------------------
  check("abre na página do achado (p. 3)", (await paginaAtual()) === 3, String(await paginaAtual()));
  check("o trecho está grifado", (await page.locator(".vm-pdf .react-pdf__Page mark").count()) > 0);
  check("o visor sabe que são 12 páginas", (await visor.getByText(/de 12/).count()) > 0);
  const caixa = await visor.boundingBox();
  check(
    `o visor cabe na janela ${LARGURA}×${ALTURA}`,
    caixa && caixa.x >= 0 && caixa.y >= 0 && caixa.x + caixa.width <= LARGURA + 1 && caixa.y + caixa.height <= ALTURA + 1,
    caixa ? `${Math.round(caixa.x)},${Math.round(caixa.y)} ${Math.round(caixa.width)}×${Math.round(caixa.height)}` : "sem caixa",
  );
  const foco = await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')));
  check("o foco entra no visor ao abrir", foco);
  const c100 = await canvas();
  const m100 = await mesa();
  check(
    "a folha a 100% aproveita a largura da mesa (≥ 70%)",
    c100 && m100 && c100.w / m100.w >= 0.7,
    c100 && m100 ? `folha ${c100.w}px numa mesa de ${m100.w}px = ${Math.round((100 * c100.w) / m100.w)}%` : "",
  );
  await page.screenshot({ path: `${OUT}/visor-1-abre-no-achado.png` });

  // --- 1b. o marca-texto contínuo ------------------------------------------
  const g1 = await grifo();
  check("o trecho de uma linha vira UMA faixa", g1?.faixas.length === 1, `${g1?.faixas.length} faixa(s) para ${g1?.marcas} retalho(s)`);
  check("a faixa cobre todos os retalhos do <mark>", g1?.cobre === true);
  check("o <mark> do navegador fica transparente", g1?.fundoDaMarca === "rgba(0, 0, 0, 0)", g1?.fundoDaMarca ?? "");
  const nivelDoAtivo = await visor.locator(".vm-doachado").getAttribute("class").then((c) => /vm--(\w+)/.exec(c ?? "")?.[1] ?? null);
  check("a faixa leva a gravidade do achado", g1?.tom && g1.tom === nivelDoAtivo, `tom=${g1?.tom} nível=${nivelDoAtivo} cor=${g1?.faixas[0]?.cor}`);
  check("ao chegar, a faixa se pinta", g1?.faixas.every((f) => f.pinta) === true);
  if (g1?.faixas[0]) {
    const f = g1.faixas[0];
    await page.screenshot({ path: `${OUT}/visor-1b-grifo-de-perto.png`, clip: { x: f.x - 60, y: f.y - 60, width: f.d - f.x + 240, height: f.b - f.y + 120 } });
  }

  // --- 2. a folha órfã, pelo campo ----------------------------------------
  await ir(PAGINA_ORFA);
  check(`chega à p. ${PAGINA_ORFA}, que não tem achado`, (await paginaAtual()) === PAGINA_ORFA);

  // --- 3. setas: botões e teclado -----------------------------------------
  await visor.getByRole("button", { name: /^Página anterior \(←\)/ }).click();
  await esperarFolha();
  check("o botão ‹ recua uma folha", (await paginaAtual()) === PAGINA_ORFA - 1);
  await tecla("ArrowRight");
  check("→ avança uma folha", (await paginaAtual()) === PAGINA_ORFA);
  await tecla("ArrowLeft");
  check("← recua uma folha", (await paginaAtual()) === PAGINA_ORFA - 1);

  // --- 4. bordas ----------------------------------------------------------
  await ir(1);
  check("na p. 1 o ‹ fica desabilitado", await visor.getByRole("button", { name: /^Página anterior \(←\)/ }).isDisabled());
  await ir(999);
  check("p. 999 é presa na última", (await paginaAtual()) === PAGINAS, String(await paginaAtual()));
  check("na última o › fica desabilitado", await visor.getByRole("button", { name: /^Próxima página \(→\)/ }).isDisabled());

  // --- 5. J/K entre páginas com achado ------------------------------------
  await ir(1);
  await tecla("j");
  check("J vai à próxima página com achado (3)", (await paginaAtual()) === 3, String(await paginaAtual()));
  await tecla("j");
  check("J de novo vai à 7", (await paginaAtual()) === 7, String(await paginaAtual()));
  await tecla("k");
  check("K volta à 3", (await paginaAtual()) === 3, String(await paginaAtual()));

  // --- 6. o achado em duas páginas ----------------------------------------
  // A tela renumera os achados (INC-001 → ACH-001): procura pela fita, não pelo id.
  check("a fita do achado mostra as 2 páginas", (await visor.locator(".vm-doachado").getByText(/em 2 páginas/).count()) > 0);
  await tecla("Shift+ArrowRight");
  check("Shift+→ segue o achado até a p. 7", (await paginaAtual()) === 7, String(await paginaAtual()));
  check("na página nova, a faixa se pinta de novo", (await grifo())?.faixas.some((f) => f.pinta) === true);
  check("na p. 7 o grifo é o trecho da p. 7", (await page.locator(".vm-pdf .react-pdf__Page mark").count()) > 0);
  await tecla("Shift+ArrowLeft");
  check("Shift+← volta à p. 3", (await paginaAtual()) === 3, String(await paginaAtual()));

  // --- 7. zoom ------------------------------------------------------------
  const base = (await canvas())?.w ?? 0;
  await visor.getByRole("button", { name: /Aumentar zoom/ }).click();
  await esperarFolha();
  const maior = (await canvas())?.w ?? 0;
  check("+ aumenta a folha desenhada", maior > base, `${base} → ${maior}`);
  const gz = await grifo();
  check("com zoom, a faixa é remedida e continua cobrindo o trecho", gz?.faixas.length === 1 && gz.cobre === true);
  check("zoom não repinta a chegada (o grifo não chegou de novo)", gz?.faixas.every((f) => !f.pinta) === true);
  await visor.getByRole("button", { name: /Diminuir zoom/ }).click();
  await esperarFolha();
  check("− volta ao tamanho de antes", (await canvas())?.w === base);
  for (let i = 0; i < 4; i++) await visor.getByRole("button", { name: /Aumentar zoom/ }).click();
  await esperarFolha();
  const ampliada = (await canvas())?.w ?? 0;
  await ir(PAGINA_ORFA);
  check("trocar de página mantém o zoom", (await canvas())?.w === ampliada, `${ampliada}`);

  // --- 8. ampliada, a folha nova começa no topo ---------------------------
  /*
   * Lendo de cima a baixo com zoom, a pessoa chega ao pé da folha e avança.
   * A folha seguinte tem de abrir no TOPO — abrir no pé dela pula o texto.
   */
  await page.evaluate(() => {
    const m = document.querySelector(".vm-mesa");
    if (m) m.scrollTop = m.scrollHeight;
  });
  await page.waitForTimeout(300);
  const noPe = await mesa();
  await tecla("ArrowRight");
  const depois = await mesa();
  check(
    "com zoom, avançar do pé da folha abre a seguinte no topo",
    depois && depois.top <= 4,
    `rolagem ${noPe?.top} de ${noPe?.alto} → ${depois?.top} de ${depois?.alto}`,
  );
  await page.screenshot({ path: `${OUT}/visor-2-ampliado.png` });

  /*
   * A BORDA ESQUERDA DA FOLHA AMPLIADA. Folha mais larga que a mesa, centrada
   * por flex: o que transborda à esquerda não tem barra que o alcance.
   */
  const borda = await page.evaluate(() => {
    const m = document.querySelector(".vm-mesa");
    const c = document.querySelector(".vm-pdf .react-pdf__Page canvas");
    if (!m || !c) return null;
    m.scrollLeft = 0;
    const mr = m.getBoundingClientRect();
    const cr = c.getBoundingClientRect();
    return { folha: Math.round(cr.left), mesa: Math.round(mr.left), largura: Math.round(cr.width), visivel: m.clientWidth };
  });
  check(
    "com zoom, a borda esquerda da folha é alcançável",
    borda && borda.folha >= borda.mesa,
    borda ? `folha começa em x=${borda.folha}, mesa em x=${borda.mesa} (folha ${borda.largura}px, mesa ${borda.visivel}px)` : "",
  );
  await page.screenshot({ path: `${OUT}/visor-3-borda-esquerda.png` });

  // --- 9. sair ------------------------------------------------------------
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  check("Esc fecha o visor", (await visor.count()) === 0);

  check("nenhum erro de runtime", erros.length === 0, erros[0] ?? "");
} catch (e) {
  falhas++;
  console.error("EXPLODIU:", e.message);
  await page.screenshot({ path: `${OUT}/visor-erro.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  console.log(falhas === 0 ? "\nTudo OK" : `\n${falhas} falha(s)`);
  process.exit(falhas === 0 ? 0 : 1);
}
