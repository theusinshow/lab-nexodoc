/**
 * A MESA DE MONTAGEM — sem navegador (auditoria UX/UI, V01/V03/V05/V06/V08/V09;
 * casos T06, T07, T08 e a parte pura de T09).
 *
 *   node scripts/test-mesa.ts   (== npm run test:mesa)
 */
import assert from "node:assert/strict";

import {
  MONTAGEM_VAZIA,
  adicionarGrupo,
  adicionarVolume,
  adicionarVolumeComGrupo,
  aplicarSugestao,
  sequenciaDoVolume,
  arquivosReferenciados,
  assinaturaDaMontagem,
  desfazer,
  descreverAlvo,
  duplicarGrupo,
  duplicarVolume,
  editarGrupo,
  editarVolume,
  fraseDoImpacto,
  impactoDoArquivo,
  importarArquivos,
  inserirPaginas,
  moverDocumento,
  moverDocumentoParaGrupo,
  moverGrupo,
  moverVolume,
  prontidaoDaMontagem,
  prontidaoDoVolume,
  reclassificarArquivo,
  refazer,
  registrar,
  removerArquivo,
  situacaoDaConferencia,
  HISTORICO_VAZIO,
  type EstadoDaMontagem,
  type GeradorDeId,
  type Historico,
} from "../modules/volume-builder/lib/volume/mesa.ts";
import type { ImportedPdfFile, PageAsset } from "../modules/volume-builder/lib/volume/volume-types.ts";

let passed = 0;
function test(nome: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${nome}`);
}

let n = 0;
const id: GeradorDeId = (p) => `${p}-${++n}`;

function arquivo(fid: string, nome: string, paginas: number, role: ImportedPdfFile["role"] = "document"): ImportedPdfFile {
  return { id: fid, name: nome, originalName: nome, role, size: 1000, mimeType: "application/pdf", pageCount: paginas, thumbnailStatus: "ready", warnings: [] };
}
function paginas(f: ImportedPdfFile): PageAsset[] {
  return Array.from({ length: f.pageCount }, (_, i) => ({
    id: `${f.id}-page-${i + 1}`, sourceFileId: f.id, sourceFileName: f.name, pageNumber: i + 1, pageCount: f.pageCount, role: f.role,
  }));
}

/** Dois volumes, cada um com dois grupos; arquivos: capa, ld, pranchas. */
function cenario() {
  const capa = arquivo("fc", "capa.pdf", 2, "cover");
  const ld = arquivo("fl", "ld.pdf", 1, "ld");
  const pr = arquivo("fp", "pranchas.pdf", 6);
  let e: EstadoDaMontagem = importarArquivos(MONTAGEM_VAZIA, [capa, ld, pr], [...paginas(capa), ...paginas(ld), ...paginas(pr)]).estado;
  e = adicionarVolume(e, id).estado;
  e = adicionarVolume(e, id).estado;
  const [v1, v2] = e.rows.map((r) => r.id);
  e = adicionarGrupo(e, v1, id).estado;
  e = adicionarGrupo(e, v1, id).estado;
  e = adicionarGrupo(e, v2, id).estado;
  e = adicionarGrupo(e, v2, id).estado;
  const g = (vi: number, gi: number) => e.rows[vi].blocks[gi].id;
  return { e, v1, v2, g, a: (fid: string, p: number) => e.pageAssets.find((x) => x.id === `${fid}-page-${p}`)! };
}

test("V01: volume recém-criado é rascunho, não pronto; montagem vazia não exporta", () => {
  const e = adicionarVolume(MONTAGEM_VAZIA, id).estado;
  const p = prontidaoDoVolume(e, e.rows[0].id);
  assert.equal(p.estado, "rascunho");
  assert.ok(p.bloqueios.length > 0, "sem grupo/nome é bloqueio");
  assert.equal(prontidaoDaMontagem(e).exportavel, false);
  assert.equal(prontidaoDaMontagem(MONTAGEM_VAZIA).exportavel, false);
});

test("V01: grupo sem pranchas bloqueia com destino clicável; sem capa/LD só avisa", () => {
  const { e, v1, g } = cenario();
  const p = prontidaoDoVolume(e, v1);
  const semPranchas = p.bloqueios.find((b) => b.id.endsWith(":sem-pranchas"));
  assert.ok(semPranchas && semPranchas.alvo.blockId === g(0, 0));
  assert.ok(p.avisos.some((a) => a.texto.includes("sem capa")));
  assert.ok(!p.bloqueios.some((b) => /capa|LD/.test(b.texto)), "capa/LD não são impostas");
});

test("T06/V03: inserir no SEGUNDO grupo do SEGUNDO volume não toca o primeiro", () => {
  const { e, v1, v2, g, a } = cenario();
  const antesV1 = JSON.stringify(e.rows[0]);
  const alvo = { tipo: "document" as const, rowId: v2, blockId: g(1, 1) };
  assert.match(descreverAlvo(e, alvo), /^Volume 02 › Grupo 2 › Pranchas$/);
  const r = inserirPaginas(e, alvo, [a("fp", 3), a("fp", 4), a("fp", 5)], id);
  assert.equal(JSON.stringify(r.estado.rows[0]), antesV1, "volume 1 intacto");
  assert.equal(r.estado.rows[1].blocks[0].documents.length, 0, "grupo 1 do volume 2 intacto");
  assert.deepEqual(r.estado.rows[1].blocks[1].documents.map((d) => d.selection!.pages![0]), [3, 4, 5]);
  assert.match(r.frase, /3 páginas adicionadas em Volume 02 › Grupo 2 › Pranchas/);
  assert.ok(v1);
});

test("V03: posição explícita insere no meio, como operação única", () => {
  const { e, v2, g, a } = cenario();
  let x = inserirPaginas(e, { tipo: "document", rowId: v2, blockId: g(1, 0) }, [a("fp", 1), a("fp", 2)], id).estado;
  x = inserirPaginas(x, { tipo: "document", rowId: v2, blockId: g(1, 0), posicao: 1 }, [a("fp", 6)], id).estado;
  assert.deepEqual(x.rows[1].blocks[0].documents.map((d) => d.selection!.pages![0]), [1, 6, 2]);
});

test("V03/V05: capa entra substituindo, e a frase diz o que saiu", () => {
  const { e, v1, a } = cenario();
  const x = inserirPaginas(e, { tipo: "cover", rowId: v1 }, [a("fc", 1)], id).estado;
  const r = inserirPaginas(x, { tipo: "cover", rowId: v1 }, [a("fc", 2)], id);
  assert.match(r.frase, /Capa substituída .* saiu capa\.pdf p\. 1, entrou capa\.pdf p\. 2/);
});

test("T07/V05: remover arquivo usado em dois volumes informa impacto; desfazer restaura ambos com ordem", () => {
  const { e, v1, v2, g, a } = cenario();
  let x = inserirPaginas(e, { tipo: "document", rowId: v1, blockId: g(0, 0) }, [a("fp", 1), a("fp", 2)], id).estado;
  x = inserirPaginas(x, { tipo: "document", rowId: v2, blockId: g(1, 1) }, [a("fp", 4)], id).estado;
  x = inserirPaginas(x, { tipo: "cover", rowId: v2 }, [a("fc", 1)], id).estado;
  const impacto = impactoDoArquivo(x, "fp");
  assert.deepEqual(impacto, { itens: 3, grupos: 2, volumes: 2 });
  assert.equal(fraseDoImpacto(impacto), "Usado em 3 lugares: 2 grupos de 2 volumes.");

  let hist: Historico = HISTORICO_VAZIO;
  const r = removerArquivo(x, "fp");
  hist = registrar(hist, x, r.frase);
  assert.equal(r.estado.rows[0].blocks[0].documents.length, 0);
  assert.ok(r.estado.rows[1].cover, "capa de outro arquivo fica");
  const d = desfazer(hist, r.estado)!;
  assert.equal(JSON.stringify(d.estado), JSON.stringify(x), "desfazer devolve exatamente o anterior");
  assert.ok(arquivosReferenciados(r.estado, hist).has("fp"), "removido, mas o desfazer ainda precisa dos bytes");
  assert.ok(!arquivosReferenciados(r.estado, HISTORICO_VAZIO).has("fp"), "sem histórico, pode liberar");
  const rf = refazer(d.hist, d.estado)!;
  assert.equal(JSON.stringify(rf.estado), JSON.stringify(r.estado));
  // Nova operação depois de desfazer descarta o refazer.
  const d2 = desfazer(rf.hist, rf.estado)!;
  const h3 = registrar(d2.hist, d2.estado, "outra coisa");
  assert.equal(h3.futuro.length, 0);
});

test("T07/V08: duplicar grupo e volume gera identidades próprias; editar a cópia não altera o original", () => {
  const { e, v1, g, a } = cenario();
  let x = inserirPaginas(e, { tipo: "document", rowId: v1, blockId: g(0, 0) }, [a("fp", 1)], id).estado;
  x = duplicarGrupo(x, v1, g(0, 0), id).estado;
  const [orig, copia] = x.rows[0].blocks;
  assert.notEqual(orig.id, copia.id);
  assert.notEqual(orig.documents[0].id, copia.documents[0].id);
  assert.notEqual(orig.documents[0].selection, copia.documents[0].selection, "seleção clonada");
  x = editarGrupo(x, v1, copia.id, { title: "Mudado" }).estado;
  x = inserirPaginas(x, { tipo: "document", rowId: v1, blockId: copia.id }, [a("fp", 5)], id).estado;
  assert.equal(x.rows[0].blocks[0].title, orig.title);
  assert.equal(x.rows[0].blocks[0].documents.length, 1);

  const y = duplicarVolume(x, v1, id).estado;
  assert.equal(y.rows.length, 3);
  assert.notEqual(y.rows[1].id, v1);
  assert.equal(y.rows[1].outputFileName, "", "cópia sem nome final (evita nome repetido)");
  assert.deepEqual(y.rows.map((r) => r.order), [1, 2, 3]);
});

test("V08: mover grupo e volume antes/depois; mover prancha para outro grupo", () => {
  const { e, v1, v2, g, a } = cenario();
  const g1 = g(0, 0);
  let x = moverGrupo(e, v1, g1, 1).estado;
  assert.equal(x.rows[0].blocks[1].id, g1);
  x = moverVolume(x, v2, -1).estado;
  assert.equal(x.rows[0].id, v2);
  assert.deepEqual(x.rows.map((r) => r.order), [1, 2]);
  x = inserirPaginas(x, { tipo: "document", rowId: v1, blockId: g1 }, [a("fp", 1), a("fp", 2)], id).estado;
  x = moverDocumento(x, v1, g1, "document", 0, 1).estado;
  assert.deepEqual(x.rows[1].blocks[1].documents.map((d) => d.selection!.pages![0]), [2, 1]);
  x = moverDocumentoParaGrupo(x, { rowId: v1, blockId: g1, tipo: "document", indice: 0 }, { rowId: v2, blockId: g(1, 0) }).estado;
  assert.equal(x.rows[0].blocks[0].documents[0].selection!.pages![0], 2);
});

test("V08: anexo tem destino próprio (não é prancha)", () => {
  const { e, v1, g, a } = cenario();
  const x = inserirPaginas(e, { tipo: "appendix", rowId: v1, blockId: g(0, 0) }, [a("fp", 6)], id);
  assert.equal(x.estado.rows[0].blocks[0].appendices!.length, 1);
  assert.equal(x.estado.rows[0].blocks[0].documents.length, 0);
  assert.match(x.frase, /› Anexos/);
});

test("T08/V06: assinatura muda com a montagem; resultado antigo não aprova versão nova", () => {
  const { e, v1, g, a } = cenario();
  const s1 = assinaturaDaMontagem(e);
  assert.equal(assinaturaDaMontagem(e), s1, "determinística");
  const conferida = { assinatura: s1, resultado: { ok: true }, em: 1 };
  assert.equal(situacaoDaConferencia(conferida, s1), "valida");
  const e2 = inserirPaginas(e, { tipo: "document", rowId: v1, blockId: g(0, 0) }, [a("fp", 1)], id).estado;
  const s2 = assinaturaDaMontagem(e2);
  assert.notEqual(s2, s1);
  assert.equal(situacaoDaConferencia(conferida, s2), "desatualizada", "resposta da revisão 1 não vale para a 2");
  const e3 = moverGrupo(e2, v1, g(0, 0), 1).estado;
  assert.notEqual(assinaturaDaMontagem(e3), s2, "reordenar também muda");
  assert.equal(situacaoDaConferencia(null, s2), "nunca");
});

test("T09/V09: reclassificar arquivo preserva referências já montadas", () => {
  const { e, v1, g, a } = cenario();
  const x = inserirPaginas(e, { tipo: "document", rowId: v1, blockId: g(0, 0) }, [a("fp", 2)], id).estado;
  const r = reclassificarArquivo(x, "fp", "appendix");
  assert.equal(r.estado.importedFiles.find((f) => f.id === "fp")!.role, "appendix");
  assert.ok(r.estado.pageAssets.filter((p) => p.sourceFileId === "fp").every((p) => p.role === "appendix"));
  assert.deepEqual(r.estado.rows, x.rows, "slots intactos");
});

test("V01: página inexistente, bytes ausentes e nome repetido bloqueiam; volume completo fica pronto", () => {
  const { e, v1, v2, g, a } = cenario();
  let x = inserirPaginas(e, { tipo: "document", rowId: v1, blockId: g(0, 0) }, [a("fp", 1)], id).estado;
  x = inserirPaginas(x, { tipo: "document", rowId: v1, blockId: g(0, 1) }, [a("fp", 2)], id).estado;
  x = editarVolume(x, v1, { outputFileName: "vol1.pdf" }).estado;
  assert.equal(prontidaoDoVolume(x, v1).estado, "pronto");
  assert.equal(prontidaoDoVolume(x, v1, { bytesDisponiveis: new Set(["fc", "fl"]) }).estado, "incompleto");
  x = editarVolume(x, v2, { outputFileName: "VOL1.pdf" }).estado;
  assert.ok(prontidaoDoVolume(x, v1).bloqueios.some((b) => b.id.endsWith(":nome-repetido")));
  const quebrado = {
    ...x,
    rows: x.rows.map((r) =>
      r.id === v1
        ? { ...r, blocks: r.blocks.map((b, i) => (i === 0 ? { ...b, documents: [{ ...b.documents[0], selection: { ...b.documents[0].selection!, pages: [9] } }] } : b)) }
        : r,
    ),
  };
  assert.ok(prontidaoDoVolume(quebrado, v1).bloqueios.some((b) => /página 9 não existe/.test(b.texto)));
});

test("sugestão da IA vira UM volume numa operação; páginas sumidas são contadas", () => {
  const { e, a } = cenario();
  const r = aplicarSugestao(e, {
    title: "Estrutural",
    outputFileName: "est.pdf",
    coverAssetId: a("fc", 1).id,
    ldAssetId: a("fl", 1).id,
    documentAssetIds: [a("fp", 1).id, "fantasma-page-9"],
  }, id);
  const novo = r.estado.rows.at(-1)!;
  assert.equal(r.estado.rows.length, e.rows.length + 1);
  assert.equal(novo.blocks[0].documents.length, 1);
  assert.ok(novo.cover && novo.blocks[0].ld);
  assert.match(r.frase, /1 página\(s\) sugerida\(s\) não existem mais/);
});

test("adicionar volume da tela já cria o Grupo 1 (um Desfazer só)", () => {
  const r = adicionarVolumeComGrupo(MONTAGEM_VAZIA, id);
  assert.equal(r.estado.rows.length, 1);
  assert.equal(r.estado.rows[0].blocks.length, 1);
});

test("T10: sequência do volume segue buildRowPdf (capa, separatriz, LD, pranchas, anexos)", () => {
  const { e, v1, g, a } = cenario();
  let x = inserirPaginas(e, { tipo: "cover", rowId: v1 }, [a("fc", 1)], id).estado;
  x = inserirPaginas(x, { tipo: "ld", rowId: v1, blockId: g(0, 0) }, [a("fl", 1)], id).estado;
  x = inserirPaginas(x, { tipo: "document", rowId: v1, blockId: g(0, 0) }, [a("fp", 2), a("fp", 3)], id).estado;
  x = inserirPaginas(x, { tipo: "appendix", rowId: v1, blockId: g(0, 0) }, [a("fp", 6)], id).estado;
  const seq = sequenciaDoVolume(x, v1);
  assert.deepEqual(
    seq.map((s) => `${s.papel}:${s.origem}`),
    [
      "Capa:capa.pdf p. 1",
      "Separatriz automática:GRUPO 1",
      "LD:ld.pdf p. 1",
      "Prancha:pranchas.pdf p. 2",
      "Prancha:pranchas.pdf p. 3",
      "Anexo:pranchas.pdf p. 6",
      "Separatriz automática:GRUPO 2",
    ],
  );
  assert.equal(prontidaoDoVolume(x, v1).paginas, seq.length, "contagem da prontidão = páginas da sequência");
});

test("histórico agrupa digitação do mesmo campo e limita a 100", () => {
  let h: Historico = HISTORICO_VAZIO;
  const e = MONTAGEM_VAZIA;
  h = registrar(h, e, "nome", { chave: "nome:v1", agora: 1000 });
  h = registrar(h, e, "nome", { chave: "nome:v1", agora: 1500 });
  h = registrar(h, e, "nome", { chave: "nome:v1", agora: 2500 });
  assert.equal(h.passado.length, 1);
  h = registrar(h, e, "nome", { chave: "nome:v1", agora: 9000 });
  assert.equal(h.passado.length, 2);
  for (let i = 0; i < 150; i++) h = registrar(h, e, `op ${i}`);
  assert.equal(h.passado.length, 100);
});

console.log(`\n${passed} testes ok`);
