/**
 * PROVA: o PDF do volume só sai depois que os editáveis foram salvos na pasta.
 *
 * Ver docs/superpowers/specs/2026-09-29-editaveis-na-pasta-design.md. Mede:
 *
 *   1. com o volume montado e nada salvo, o botão do PDF está TRAVADO e diz
 *      por quê;
 *   2. "Salvar editáveis no projeto" grava os 3 ODTs NA PASTA — os bytes são
 *      relidos da pasta, não conferidos pelo texto da tela;
 *   3. depois de salvar, o PDF do volume destrava;
 *   4. salvar de novo na mesma pasta PERGUNTA sobre o nome repetido, e
 *      "Manter os dois" cria o "(2)";
 *   5. F5 não desfaz a liberação.
 *
 * O SELETOR DE PASTA É TROCADO PELO OPFS: `navigator.storage.getDirectory()`
 * devolve um `FileSystemDirectoryHandle` de verdade, com a mesma API de
 * gravação. O que a prova não alcança é o disco `P:` — isso só na máquina do
 * escritório.
 *
 * NÃO GASTA TOKEN: a conversa é semeada no IndexedDB com o volume já montado,
 * e capa/LD/separatriz consolidadas são geração determinística (sem IA).
 *
 *   npm run dev                              (noutro terminal)
 *   node scripts/prova-editaveis-na-pasta.mjs
 */
import { chromium } from "playwright";
import { pularTourGuiado } from "./lib/sessao-de-teste.mjs";

const BASE = process.env.SHOT_BASE ?? "http://localhost:3000";
const CONV = "qa-editaveis-na-pasta";
const PASTA = "qa-pasta-do-projeto";

let falhas = 0;
function check(nome, ok, detalhe = "") {
  if (ok) console.log(`  OK      ${nome}`);
  else {
    falhas++;
    console.error(`  FALHOU  ${nome}${detalhe ? ` :: ${detalhe}` : ""}`);
  }
}

function selo(n) {
  const nome = `040_26_his_${String(n).padStart(3, "0")}_a.pdf`;
  return {
    fileName: nome,
    pageNumber: 1,
    pageCount: 1,
    extraction: {
      disciplina: "HIDROSSANITARIO",
      folha: n,
      total: 2,
      numeroFolha: null,
      arquivo: nome.replace(/\.pdf$/, ""),
      conteudo: "PLANTA BAIXA",
      cliente: "PREFEITURA MUNICIPAL DE CHAPECO",
      secretaria: null,
      obra: "QA — EDITAVEIS NA PASTA",
      fase: "PROJETO BASICO",
      tituloSecao: "HIDROSSANITÁRIO",
      data: "SETEMBRO/2026",
      logoOrgao: null,
      confianca: "alta",
    },
  };
}

/** Substitui o seletor de pasta pelo OPFS, numa subpasta limpa. */
async function trocarSeletorPeloOpfs(page) {
  await page.addInitScript((pasta) => {
    window.showDirectoryPicker = async () => {
      const raiz = await navigator.storage.getDirectory();
      return raiz.getDirectoryHandle(pasta, { create: true });
    };
  }, PASTA);
}

async function arquivosNaPasta(page) {
  return page.evaluate(async (pasta) => {
    const raiz = await navigator.storage.getDirectory();
    const dir = await raiz.getDirectoryHandle(pasta, { create: true });
    const out = [];
    for await (const h of dir.values()) {
      if (h.kind === "file") out.push({ nome: h.name, bytes: (await h.getFile()).size });
    }
    return out.sort((a, b) => a.nome.localeCompare(b.nome));
  }, PASTA);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });

try {
  await pularTourGuiado(page);
  await trocarSeletorPeloOpfs(page);
  await page.goto(`${BASE}/nexo`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) {
    await page.getByRole("button", { name: /Entrar como dev/i }).click();
    await page.waitForURL("**/nexo**", { timeout: 30000 });
  }

  // Pasta limpa e conversa semeada: capa, LD, separatriz e volume já gerados.
  await page.evaluate(
    async ({ conv, pasta, selos }) => {
      const raiz = await navigator.storage.getDirectory();
      await raiz.removeEntry(pasta, { recursive: true }).catch(() => {});

      const db = await new Promise((res, rej) => {
        const req = indexedDB.open("nexo");
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
      const ODT = "application/vnd.oasis.opendocument.text";
      const PDF = "application/pdf";
      const agora = Date.now();
      const arq = (id, label, name, mime, primary) => ({
        label,
        name,
        mime,
        blobKey: `${conv}:${id}:${label}`,
        ...(primary ? { primary: true } : {}),
        sizeBytes: 16,
      });
      const results = [
        {
          artifactId: "capa:040-26",
          kind: "capa",
          summary: "Capa",
          files: [arq("capa:040-26", "PDF", "capa.pdf", PDF, true), arq("capa:040-26", "ODT", "capa.odt", ODT)],
          payload: {
            templateId: "prefchap",
            tituloCapa: "QA — EDITAVEIS NA PASTA",
            volume: "01",
            numTomos: 1,
            tomoInicial: 1,
            mes: "Setembro",
            ano: "2026",
          },
          generatedAt: agora - 5000,
        },
        {
          artifactId: "ld:040-26:a",
          kind: "ld",
          summary: "LD",
          files: [arq("ld:040-26:a", "PDF", "ld.pdf", PDF, true), arq("ld:040-26:a", "ODT", "ld.odt", ODT)],
          payload: { tituloLd: "PROJETO HIDROSSANITÁRIO", numTomos: 1, tomoInicial: 1 },
          generatedAt: agora - 4000,
        },
        {
          artifactId: "separatriz:040-26",
          kind: "separatriz",
          summary: "Separatriz",
          files: [
            arq("separatriz:040-26", "PDF", "separatriz.pdf", PDF, true),
            arq("separatriz:040-26", "ODT", "separatriz.odt", ODT),
          ],
          payload: { titulo: "PROJETO HIDROSSANITÁRIO" },
          generatedAt: agora - 3000,
        },
        {
          artifactId: "volume:040-26",
          kind: "volume",
          summary: "Volume montado",
          files: [arq("volume:040-26", "PDF", "volume.pdf", PDF, true)],
          generatedAt: agora - 1000,
        },
      ];
      await new Promise((res, rej) => {
        const tx = db.transaction(["conversations", "result_blobs"], "readwrite");
        for (const r of results) {
          for (const f of r.files) {
            tx.objectStore("result_blobs").put({ key: f.blobKey, blob: new Blob(["0123456789abcdef"], { type: f.mime }) });
          }
        }
        tx.objectStore("conversations").put({
          id: conv,
          title: "QA — editáveis na pasta",
          createdAt: agora,
          updatedAt: agora,
          seloResults: selos,
          results,
          messages: [
            { id: "m1", role: "user", content: "Monta o volume." },
            {
              id: "m2",
              role: "assistant",
              content: "Montei o volume.",
              proposals: [{ kind: "volume", resumo: "Volume montado", params: {} }],
            },
          ],
        });
        tx.oncomplete = res;
        tx.onerror = () => rej(tx.error);
      });
    },
    { conv: CONV, pasta: PASTA, selos: [selo(1), selo(2)] },
  );

  // Pela URL, e não pelo nome na lista: gravada, a conversa passa a se chamar
  // pelas siglas das disciplinas, e o nome semeado some.
  const abrir = async () => {
    await page.goto(`${BASE}/nexo?conversa=${CONV}`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-prova="salvar-editaveis"]').first().waitFor({ timeout: 20000 });
  };
  await abrir();

  // 1. Travado antes de salvar.
  const travado = page.locator('[data-prova="baixar-artefato-travado"]').first();
  check("o PDF do volume nasce travado", await travado.isVisible().catch(() => false));
  check("e o botão está desabilitado", await travado.isDisabled().catch(() => false));
  const motivo = await page.locator('[data-prova="motivo-da-trava-do-volume"]').first().innerText().catch(() => "");
  check("a trava diz o que fazer", /salve os editáveis/i.test(motivo), motivo);

  // 2. Salvar na pasta.
  await page.getByRole("button", { name: /Salvar editáveis no projeto/i }).click();
  await page.locator('[data-prova="editaveis-salvos"]').first().waitFor({ timeout: 60000 });
  const naPasta = await arquivosNaPasta(page);
  check("3 ODTs gravados na pasta", naPasta.filter((a) => a.nome.endsWith(".odt")).length === 3, JSON.stringify(naPasta));
  check("nenhum arquivo vazio na pasta", naPasta.every((a) => a.bytes > 0), JSON.stringify(naPasta));
  check(
    "capa, LD e separatriz, um de cada",
    ["capa--", "ld--", "separatriz--"].every((p) => naPasta.some((a) => a.nome.startsWith(p))),
    naPasta.map((a) => a.nome).join(", "),
  );

  // 3. Destravou.
  check(
    "o PDF do volume destravou",
    (await page.locator('[data-prova="baixar-artefato-travado"]').count()) === 0 &&
      (await page.locator('a[data-prova="baixar-artefato"][download="volume.pdf"]').count()) > 0,
  );
  await page.screenshot({ path: "scratchpad/prova-editaveis-salvos.png", fullPage: false });

  // 4. De novo na mesma pasta: pergunta pelo nome repetido.
  await page.getByRole("button", { name: new RegExp(`Salvar em “${PASTA}”`) }).click();
  await page.locator('[data-prova="conflito-de-nome"]').waitFor({ timeout: 60000 });
  check("nome repetido faz PERGUNTAR", true);
  await page.getByRole("button", { name: "Manter os dois" }).click();
  await page.getByRole("button", { name: "Pular" }).click();
  await page.getByRole("button", { name: "Substituir" }).click();
  await page.locator('[data-prova="conflito-de-nome"]').waitFor({ state: "detached", timeout: 30000 });
  const depois = await arquivosNaPasta(page);
  check("'Manter os dois' criou o (2), e só um", depois.filter((a) => / \(2\)\.odt$/.test(a.nome)).length === 1, depois.map((a) => a.nome).join(", "));
  check("pular e substituir não criaram cópia", depois.length === 4, depois.map((a) => a.nome).join(", "));

  // 5. F5.
  await abrir();
  check(
    "depois do F5 continua destravado",
    (await page.locator('[data-prova="baixar-artefato-travado"]').count()) === 0,
  );
  check("e lembra a pasta", await page.getByRole("button", { name: new RegExp(`Salvar em “${PASTA}”`) }).isVisible());
} catch (err) {
  falhas++;
  console.error(`  FALHOU  execucao :: ${err.message}`);
  await page.screenshot({ path: "scratchpad/prova-editaveis-falha.png" }).catch(() => {});
} finally {
  // O banco local é o mesmo em que se trabalha.
  await page
    .evaluate(async (conv) => {
      const db = await new Promise((res) => {
        const req = indexedDB.open("nexo");
        req.onsuccess = () => res(req.result);
      });
      await new Promise((res) => {
        const tx = db.transaction("conversations", "readwrite");
        tx.objectStore("conversations").delete(conv);
        tx.oncomplete = res;
      });
    }, CONV)
    .catch(() => {});
  await browser.close();
}

console.log(falhas === 0 ? "\nTUDO OK\n" : `\n${falhas} FALHA(S)\n`);
process.exit(falhas === 0 ? 0 : 1);
