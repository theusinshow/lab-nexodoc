/**
 * A MESA DE MONTAGEM COMO DADO — auditoria UX/UI, etapas 2 e 3 (V01–V10).
 *
 * A página guardava metadados, arquivos, páginas e volumes em cinco `useState`
 * soltos, e cada atalho mexia neles por conta própria: "Capa", "LD" e "Docs"
 * iam sempre para o PRIMEIRO volume e o PRIMEIRO grupo; remover um arquivo
 * apagava as referências sem volta; um volume vazio nascia "OK". Nada disso
 * sobrevivia ao F5.
 *
 * Aqui mora o estado INTEIRO da montagem e toda operação sobre ele, como
 * funções puras: o que entra num lugar diz QUAL lugar (volume, grupo, posição),
 * toda operação devolve um estado novo (o histórico guarda o anterior) e uma
 * frase que a tela mostra e o "Desfazer" repete. A persistência
 * (`mesa-persistencia.ts`) grava exatamente este objeto; a prontidão e a
 * assinatura saem dele. A tela só desenha e despacha.
 *
 * PURO e sem imports de runtime → roda em node cru (`npm run test:mesa`).
 */

import type {
  AssemblyBlock,
  AssemblyRow,
  AssemblySlot,
  AssemblySlotType,
  ImportedPdfFile,
  PageAsset,
  PageAssetRole,
  PageSelection,
  VolumeMetadata,
} from "./volume-types.ts";

// --------------------------------------------------------------- o estado

/** O que o "Desfazer" restaura e o autosave grava. */
export type EstadoDaMontagem = {
  metadata: VolumeMetadata;
  importedFiles: ImportedPdfFile[];
  pageAssets: PageAsset[];
  rows: AssemblyRow[];
};

export const MONTAGEM_VAZIA: EstadoDaMontagem = {
  metadata: { projectCode: "", projectName: "" },
  importedFiles: [],
  pageAssets: [],
  rows: [],
};

export type GeradorDeId = (prefixo: string) => string;

let contador = 0;
/** Ids próprios, nunca reaproveitados: duplicar não pode acoplar cópias. */
export const idPadrao: GeradorDeId = (prefixo) => {
  contador += 1;
  const aleatorio =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefixo}-${Date.now().toString(36)}-${contador}-${aleatorio}`;
};

/** O resultado de uma operação: o estado novo e a frase do que aconteceu. */
export type Resultado = { estado: EstadoDaMontagem; frase: string; nada?: boolean };

const semMudanca = (estado: EstadoDaMontagem, frase: string): Resultado => ({
  estado,
  frase,
  nada: true,
});

// --------------------------------------------------------------- rótulos

/** "Volume 02" — o nome que a tela usa para a linha (G07: volume, não linha). */
export function rotuloDoVolume(estado: EstadoDaMontagem, rowId: string): string {
  const i = estado.rows.findIndex((r) => r.id === rowId);
  const row = estado.rows[i];
  if (!row) return "volume removido";
  const titulo = row.title?.trim();
  const numero = `Volume ${String(i + 1).padStart(2, "0")}`;
  return titulo && !/^(linha|volume) \d+$/i.test(titulo) ? `${numero} (${titulo})` : numero;
}

export function rotuloDoGrupo(row: AssemblyRow | undefined, blockId: string): string {
  const i = row?.blocks.findIndex((b) => b.id === blockId) ?? -1;
  const block = i >= 0 ? row!.blocks[i] : undefined;
  if (!block) return "grupo removido";
  const titulo = block.title?.trim();
  return titulo && !/^grupo \d+$/i.test(titulo) ? `Grupo ${i + 1} (${titulo})` : `Grupo ${i + 1}`;
}

export const ROTULO_DO_TIPO: Record<AssemblySlotType, string> = {
  cover: "Capa",
  ld: "Lista de documentos (LD)",
  separator: "Separatriz",
  document: "Pranchas",
  appendix: "Anexos",
};

// --------------------------------------------------------------- criação

export function novoVolume(ordem: number, novoId: GeradorDeId = idPadrao): AssemblyRow {
  return {
    id: novoId("vol"),
    order: ordem,
    title: `Volume ${String(ordem).padStart(2, "0")}`,
    blocks: [],
    outputFileName: "",
    /*
     * `status` continua no tipo porque o relatório e a rota de análise o leem,
     * mas a TELA não o usa mais: a prontidão é derivada (`prontidaoDoVolume`).
     * Nasce "ponto_de_atencao" — um volume vazio não é "sem problemas" (V01).
     */
    status: "ponto_de_atencao",
    warnings: [],
    requiresManualConfirmation: false,
  };
}

export function novoGrupo(indice: number, novoId: GeradorDeId = idPadrao): AssemblyBlock {
  return {
    id: novoId("grp"),
    title: `Grupo ${indice}`,
    disciplineCode: "",
    separatorTitle: `GRUPO ${indice}`,
    documents: [],
    appendices: [],
    status: "ponto_de_atencao",
    warnings: [],
  };
}

function renumerar(rows: AssemblyRow[]): AssemblyRow[] {
  return rows.map((r, i) => (r.order === i + 1 ? r : { ...r, order: i + 1 }));
}

export function adicionarVolume(estado: EstadoDaMontagem, novoId: GeradorDeId = idPadrao): Resultado {
  const row = novoVolume(estado.rows.length + 1, novoId);
  const rows = [...estado.rows, row];
  return {
    estado: { ...estado, rows },
    frase: `${rotuloDoVolume({ ...estado, rows }, row.id)} criado (rascunho, sem páginas).`,
  };
}

export function adicionarGrupo(
  estado: EstadoDaMontagem,
  rowId: string,
  novoId: GeradorDeId = idPadrao,
): Resultado {
  const row = estado.rows.find((r) => r.id === rowId);
  if (!row) return semMudanca(estado, "O volume não existe mais.");
  const grupo = novoGrupo(row.blocks.length + 1, novoId);
  const novo = { ...row, blocks: [...row.blocks, grupo] };
  const rows = estado.rows.map((r) => (r.id === rowId ? novo : r));
  return {
    estado: { ...estado, rows },
    frase: `${rotuloDoGrupo(novo, grupo.id)} criado em ${rotuloDoVolume(estado, rowId)}.`,
  };
}

// --------------------------------------------------------------- inserção com alvo

export type AlvoDeInsercao =
  | { tipo: "cover"; rowId: string }
  | { tipo: "ld" | "separator"; rowId: string; blockId: string }
  | {
      tipo: "document" | "appendix";
      rowId: string;
      blockId: string;
      /** Índice em que as páginas entram; ausente = no fim. */
      posicao?: number;
    };

export function selecaoDaPagina(asset: PageAsset): PageSelection {
  return {
    sourceFileId: asset.sourceFileId,
    sourceFileName: asset.sourceFileName,
    mode: "specific_pages",
    pages: [asset.pageNumber],
  };
}

function slotDe(asset: PageAsset, tipo: AssemblySlotType, rotulo: string, novoId: GeradorDeId): AssemblySlot {
  return { id: novoId("slot"), type: tipo, label: rotulo, selection: selecaoDaPagina(asset), warnings: [] };
}

function descreverSelecao(sel: PageSelection | undefined): string {
  if (!sel) return "vazio";
  const paginas =
    sel.mode === "specific_pages" && sel.pages?.length
      ? `p. ${sel.pages.join(", ")}`
      : sel.mode === "page_range"
        ? `p. ${sel.startPage}–${sel.endPage}`
        : "arquivo inteiro";
  return `${sel.sourceFileName} ${paginas}`;
}

function comGrupo(
  estado: EstadoDaMontagem,
  rowId: string,
  blockId: string,
  mudar: (b: AssemblyBlock) => AssemblyBlock,
): EstadoDaMontagem | null {
  const row = estado.rows.find((r) => r.id === rowId);
  const block = row?.blocks.find((b) => b.id === blockId);
  if (!row || !block) return null;
  const novo = mudar(block);
  return {
    ...estado,
    rows: estado.rows.map((r) =>
      r.id === rowId ? { ...r, blocks: r.blocks.map((b) => (b.id === blockId ? novo : b)) } : r,
    ),
  };
}

/** Onde as páginas vão cair, em palavras — mostrado ANTES de aplicar (V03). */
export function descreverAlvo(estado: EstadoDaMontagem, alvo: AlvoDeInsercao): string {
  const row = estado.rows.find((r) => r.id === alvo.rowId);
  const vol = rotuloDoVolume(estado, alvo.rowId);
  if (alvo.tipo === "cover") return `${vol} › Capa`;
  const grp = rotuloDoGrupo(row, alvo.blockId);
  const base = `${vol} › ${grp} › ${ROTULO_DO_TIPO[alvo.tipo]}`;
  if ((alvo.tipo === "document" || alvo.tipo === "appendix") && alvo.posicao !== undefined) {
    return `${base} (na posição ${alvo.posicao + 1})`;
  }
  return base;
}

/**
 * INSERIR PÁGINAS NUM ALVO EXPLÍCITO — o coração do V03.
 *
 * Capa, LD e separatriz têm um lugar só: entram SUBSTITUINDO, e a frase diz o
 * que saiu (o "Desfazer" devolve). Pranchas e anexos aceitam várias páginas,
 * na posição pedida, como UMA operação.
 */
export function inserirPaginas(
  estado: EstadoDaMontagem,
  alvo: AlvoDeInsercao,
  assets: PageAsset[],
  novoId: GeradorDeId = idPadrao,
): Resultado {
  if (assets.length === 0) return semMudanca(estado, "Nenhuma página selecionada.");
  const destino = descreverAlvo(estado, alvo);
  const n = assets.length;
  const plural = n === 1 ? "1 página" : `${n} páginas`;

  if (alvo.tipo === "cover") {
    const row = estado.rows.find((r) => r.id === alvo.rowId);
    if (!row) return semMudanca(estado, "O volume de destino não existe mais.");
    const anterior = row.cover?.selection;
    const slot = slotDe(assets[0], "cover", "Capa", novoId);
    const rows = estado.rows.map((r) => (r.id === alvo.rowId ? { ...r, cover: slot } : r));
    return {
      estado: { ...estado, rows },
      frase:
        (anterior
          ? `Capa substituída em ${destino}: saiu ${descreverSelecao(anterior)}, entrou ${descreverSelecao(slot.selection)}.`
          : `Capa definida em ${destino}: ${descreverSelecao(slot.selection)}.`) +
        (n > 1 ? " A capa usa só a primeira página selecionada." : ""),
    };
  }

  if (alvo.tipo === "ld" || alvo.tipo === "separator") {
    const tipo = alvo.tipo;
    const rotulo = tipo === "ld" ? "LD" : "Separatriz";
    let anterior: PageSelection | undefined;
    const slot = slotDe(assets[0], tipo, rotulo, novoId);
    const novo = comGrupo(estado, alvo.rowId, alvo.blockId, (b) => {
      anterior = b[tipo]?.selection;
      return { ...b, [tipo]: slot };
    });
    if (!novo) return semMudanca(estado, "O grupo de destino não existe mais.");
    return {
      estado: novo,
      frase:
        (anterior
          ? `${rotulo} substituída em ${destino}: saiu ${descreverSelecao(anterior)}, entrou ${descreverSelecao(slot.selection)}.`
          : `${rotulo} definida em ${destino}: ${descreverSelecao(slot.selection)}.`) +
        (n > 1 ? ` ${rotulo} usa só a primeira página selecionada.` : ""),
    };
  }

  if (alvo.tipo !== "document" && alvo.tipo !== "appendix") return semMudanca(estado, "Destino desconhecido.");
  const tipoDaLista = alvo.tipo;
  const posicaoPedida = alvo.posicao;
  const chave = tipoDaLista === "document" ? "documents" : "appendices";
  const rotulo = tipoDaLista === "document" ? "Doc" : "Anexo";
  const novo = comGrupo(estado, alvo.rowId, alvo.blockId, (b) => {
    const lista = [...(b[chave] ?? [])];
    const pos = posicaoPedida === undefined ? lista.length : Math.max(0, Math.min(posicaoPedida, lista.length));
    const slots = assets.map((a, i) => slotDe(a, tipoDaLista, `${rotulo} ${pos + i + 1}`, novoId));
    lista.splice(pos, 0, ...slots);
    return { ...b, [chave]: lista };
  });
  if (!novo) return semMudanca(estado, "O grupo de destino não existe mais.");
  return { estado: novo, frase: `${plural} adicionada${n === 1 ? "" : "s"} em ${destino}.` };
}

/** Tira UM item de um lugar (capa, LD, separatriz, prancha ou anexo). */
export function removerSlot(
  estado: EstadoDaMontagem,
  alvo:
    | { tipo: "cover"; rowId: string }
    | { tipo: "ld" | "separator"; rowId: string; blockId: string }
    | { tipo: "document" | "appendix"; rowId: string; blockId: string; indice: number },
): Resultado {
  if (alvo.tipo === "cover") {
    const row = estado.rows.find((r) => r.id === alvo.rowId);
    if (!row?.cover) return semMudanca(estado, "Não há capa para tirar.");
    return {
      estado: { ...estado, rows: estado.rows.map((r) => (r.id === alvo.rowId ? { ...r, cover: undefined } : r)) },
      frase: `Capa tirada de ${rotuloDoVolume(estado, alvo.rowId)} (${descreverSelecao(row.cover.selection)}).`,
    };
  }
  let tirado: AssemblySlot | undefined;
  const lugar = alvo;
  const novo = comGrupo(estado, lugar.rowId, lugar.blockId, (b) => {
    if (lugar.tipo === "ld" || lugar.tipo === "separator") {
      tirado = b[lugar.tipo];
      return { ...b, [lugar.tipo]: undefined };
    }
    if (lugar.tipo !== "document" && lugar.tipo !== "appendix") return b;
    const chave = lugar.tipo === "document" ? "documents" : "appendices";
    const lista = [...(b[chave] ?? [])];
    [tirado] = lista.splice(lugar.indice, 1);
    return { ...b, [chave]: lista };
  });
  if (!novo || !tirado) return semMudanca(estado, "Nada a tirar nesse lugar.");
  const row = estado.rows.find((r) => r.id === alvo.rowId);
  return {
    estado: novo,
    frase: `${ROTULO_DO_TIPO[alvo.tipo]}: tirado ${descreverSelecao(tirado.selection)} de ${rotuloDoVolume(estado, alvo.rowId)} › ${rotuloDoGrupo(row, alvo.blockId)}.`,
  };
}

// --------------------------------------------------------------- ordem

function mover<T>(lista: T[], de: number, para: number): T[] {
  if (de === para || de < 0 || de >= lista.length) return lista;
  const copia = [...lista];
  const [item] = copia.splice(de, 1);
  copia.splice(Math.max(0, Math.min(para, copia.length)), 0, item);
  return copia;
}

export function moverDocumento(
  estado: EstadoDaMontagem,
  rowId: string,
  blockId: string,
  tipo: "document" | "appendix",
  de: number,
  para: number,
): Resultado {
  const chave = tipo === "document" ? "documents" : "appendices";
  const row = estado.rows.find((r) => r.id === rowId);
  const block = row?.blocks.find((b) => b.id === blockId);
  const lista = block?.[chave] ?? [];
  if (!block || para < 0 || para >= lista.length || de === para) {
    return semMudanca(estado, "Já está nessa posição.");
  }
  const novo = comGrupo(estado, rowId, blockId, (b) => ({ ...b, [chave]: mover(b[chave] ?? [], de, para) }))!;
  return {
    estado: novo,
    frase: `${descreverSelecao(lista[de].selection)} movido da posição ${de + 1} para a ${para + 1} em ${rotuloDoGrupo(row, blockId)}.`,
  };
}

/** Leva uma prancha/anexo para OUTRO grupo (de qualquer volume), no fim. */
export function moverDocumentoParaGrupo(
  estado: EstadoDaMontagem,
  origem: { rowId: string; blockId: string; tipo: "document" | "appendix"; indice: number },
  destino: { rowId: string; blockId: string },
): Resultado {
  const chave = origem.tipo === "document" ? "documents" : "appendices";
  const row = estado.rows.find((r) => r.id === origem.rowId);
  const block = row?.blocks.find((b) => b.id === origem.blockId);
  const item = block?.[chave]?.[origem.indice];
  if (!item) return semMudanca(estado, "O item não existe mais.");
  if (origem.rowId === destino.rowId && origem.blockId === destino.blockId) {
    return semMudanca(estado, "Já está nesse grupo.");
  }
  const semItem = comGrupo(estado, origem.rowId, origem.blockId, (b) => ({
    ...b,
    [chave]: (b[chave] ?? []).filter((_, i) => i !== origem.indice),
  }))!;
  const novo = comGrupo(semItem, destino.rowId, destino.blockId, (b) => ({
    ...b,
    [chave]: [...(b[chave] ?? []), item],
  }));
  if (!novo) return semMudanca(estado, "O grupo de destino não existe mais.");
  const rowDestino = estado.rows.find((r) => r.id === destino.rowId);
  return {
    estado: novo,
    frase: `${descreverSelecao(item.selection)} levado para ${rotuloDoVolume(estado, destino.rowId)} › ${rotuloDoGrupo(rowDestino, destino.blockId)}.`,
  };
}

export function moverVolume(estado: EstadoDaMontagem, rowId: string, direcao: -1 | 1): Resultado {
  const i = estado.rows.findIndex((r) => r.id === rowId);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= estado.rows.length) return semMudanca(estado, "O volume já está nessa ponta.");
  const rows = renumerar(mover(estado.rows, i, j));
  return {
    estado: { ...estado, rows },
    frase: `${rotuloDoVolume(estado, rowId)} passou para a posição ${j + 1}.`,
  };
}

export function moverGrupo(
  estado: EstadoDaMontagem,
  rowId: string,
  blockId: string,
  direcao: -1 | 1,
): Resultado {
  const row = estado.rows.find((r) => r.id === rowId);
  const i = row?.blocks.findIndex((b) => b.id === blockId) ?? -1;
  const j = i + direcao;
  if (!row || i < 0 || j < 0 || j >= row.blocks.length) return semMudanca(estado, "O grupo já está nessa ponta.");
  const rows = estado.rows.map((r) => (r.id === rowId ? { ...r, blocks: mover(r.blocks, i, j) } : r));
  return {
    estado: { ...estado, rows },
    frase: `${rotuloDoGrupo(row, blockId)} de ${rotuloDoVolume(estado, rowId)} passou para a posição ${j + 1}.`,
  };
}

// --------------------------------------------------------------- duplicar (V08)

function clonarSlot(s: AssemblySlot, novoId: GeradorDeId): AssemblySlot {
  return {
    ...s,
    id: novoId("slot"),
    warnings: [...s.warnings],
    selection: s.selection
      ? { ...s.selection, pages: s.selection.pages ? [...s.selection.pages] : undefined }
      : undefined,
  };
}

function clonarGrupo(b: AssemblyBlock, novoId: GeradorDeId): AssemblyBlock {
  return {
    ...b,
    id: novoId("grp"),
    warnings: [...b.warnings],
    separator: b.separator ? clonarSlot(b.separator, novoId) : undefined,
    ld: b.ld ? clonarSlot(b.ld, novoId) : undefined,
    documents: b.documents.map((d) => clonarSlot(d, novoId)),
    appendices: (b.appendices ?? []).map((a) => clonarSlot(a, novoId)),
  };
}

export function duplicarGrupo(
  estado: EstadoDaMontagem,
  rowId: string,
  blockId: string,
  novoId: GeradorDeId = idPadrao,
): Resultado {
  const row = estado.rows.find((r) => r.id === rowId);
  const i = row?.blocks.findIndex((b) => b.id === blockId) ?? -1;
  if (!row || i < 0) return semMudanca(estado, "O grupo não existe mais.");
  const copia = clonarGrupo(row.blocks[i], novoId);
  copia.title = `${row.blocks[i].title} (cópia)`;
  const blocks = [...row.blocks];
  blocks.splice(i + 1, 0, copia);
  const rows = estado.rows.map((r) => (r.id === rowId ? { ...r, blocks } : r));
  return {
    estado: { ...estado, rows },
    frase: `${rotuloDoGrupo(row, blockId)} duplicado logo abaixo, com identidades próprias.`,
  };
}

export function duplicarVolume(
  estado: EstadoDaMontagem,
  rowId: string,
  novoId: GeradorDeId = idPadrao,
): Resultado {
  const i = estado.rows.findIndex((r) => r.id === rowId);
  if (i < 0) return semMudanca(estado, "O volume não existe mais.");
  const original = estado.rows[i];
  const copia: AssemblyRow = {
    ...original,
    id: novoId("vol"),
    title: `${original.title} (cópia)`,
    // Nome final repetido seria bloqueio de exportação; a cópia nasce sem ele.
    outputFileName: "",
    warnings: [...original.warnings],
    cover: original.cover ? clonarSlot(original.cover, novoId) : undefined,
    blocks: original.blocks.map((b) => clonarGrupo(b, novoId)),
  };
  const rows = [...estado.rows];
  rows.splice(i + 1, 0, copia);
  return {
    estado: { ...estado, rows: renumerar(rows) },
    frase: `${rotuloDoVolume(estado, rowId)} duplicado logo abaixo. A cópia nasce sem nome final — escolha um.`,
  };
}

// --------------------------------------------------------------- remover (V05)

export function removerVolume(estado: EstadoDaMontagem, rowId: string): Resultado {
  const row = estado.rows.find((r) => r.id === rowId);
  if (!row) return semMudanca(estado, "O volume não existe mais.");
  const n = contarItens(row);
  return {
    estado: { ...estado, rows: renumerar(estado.rows.filter((r) => r.id !== rowId)) },
    frase: `${rotuloDoVolume(estado, rowId)} removido${n ? ` (${n} ${n === 1 ? "item" : "itens"})` : ""}.`,
  };
}

export function removerGrupo(estado: EstadoDaMontagem, rowId: string, blockId: string): Resultado {
  const row = estado.rows.find((r) => r.id === rowId);
  const block = row?.blocks.find((b) => b.id === blockId);
  if (!row || !block) return semMudanca(estado, "O grupo não existe mais.");
  const rows = estado.rows.map((r) =>
    r.id === rowId ? { ...r, blocks: r.blocks.filter((b) => b.id !== blockId) } : r,
  );
  const n = block.documents.length + (block.appendices?.length ?? 0) + (block.ld ? 1 : 0) + (block.separator ? 1 : 0);
  return {
    estado: { ...estado, rows },
    frase: `${rotuloDoGrupo(row, blockId)} removido de ${rotuloDoVolume(estado, rowId)}${n ? ` (${n} ${n === 1 ? "item" : "itens"})` : ""}.`,
  };
}

function contarItens(row: AssemblyRow): number {
  return (
    (row.cover ? 1 : 0) +
    row.blocks.reduce(
      (s, b) => s + b.documents.length + (b.appendices?.length ?? 0) + (b.ld ? 1 : 0) + (b.separator ? 1 : 0),
      0,
    )
  );
}

export type Impacto = { itens: number; grupos: number; volumes: number };

/** "Usado em 3 grupos de 2 volumes" — dito ANTES de remover o arquivo. */
export function impactoDoArquivo(estado: EstadoDaMontagem, fileId: string): Impacto {
  let itens = 0;
  const grupos = new Set<string>();
  const volumes = new Set<string>();
  for (const row of estado.rows) {
    if (row.cover?.selection?.sourceFileId === fileId) {
      itens++;
      volumes.add(row.id);
    }
    for (const b of row.blocks) {
      const slots = [b.ld, b.separator, ...b.documents, ...(b.appendices ?? [])];
      for (const s of slots) {
        if (s?.selection?.sourceFileId === fileId) {
          itens++;
          grupos.add(b.id);
          volumes.add(row.id);
        }
      }
    }
  }
  return { itens, grupos: grupos.size, volumes: volumes.size };
}

export function fraseDoImpacto(i: Impacto): string {
  if (i.itens === 0) return "Não é usado em nenhum volume.";
  const itens = i.itens === 1 ? "1 lugar" : `${i.itens} lugares`;
  const grupos = i.grupos === 1 ? "1 grupo" : `${i.grupos} grupos`;
  const volumes = i.volumes === 1 ? "1 volume" : `${i.volumes} volumes`;
  return i.grupos > 0 ? `Usado em ${itens}: ${grupos} de ${volumes}.` : `Usado em ${itens} de ${volumes}.`;
}

export function removerArquivo(estado: EstadoDaMontagem, fileId: string): Resultado {
  const file = estado.importedFiles.find((f) => f.id === fileId);
  if (!file) return semMudanca(estado, "O arquivo não existe mais.");
  const impacto = impactoDoArquivo(estado, fileId);
  const fora = (s?: AssemblySlot) => (s?.selection?.sourceFileId === fileId ? undefined : s);
  const rows = estado.rows.map((row) => ({
    ...row,
    cover: fora(row.cover),
    blocks: row.blocks.map((b) => ({
      ...b,
      ld: fora(b.ld),
      separator: fora(b.separator),
      documents: b.documents.filter((s) => s.selection?.sourceFileId !== fileId),
      appendices: (b.appendices ?? []).filter((s) => s.selection?.sourceFileId !== fileId),
    })),
  }));
  return {
    estado: {
      ...estado,
      importedFiles: estado.importedFiles.filter((f) => f.id !== fileId),
      pageAssets: estado.pageAssets.filter((a) => a.sourceFileId !== fileId),
      rows,
    },
    frase: `${file.name} removido. ${impacto.itens ? fraseDoImpacto(impacto).replace("Usado em", "Saiu de") : "Não estava em nenhum volume."}`,
  };
}

// --------------------------------------------------------------- arquivos

export function importarArquivos(
  estado: EstadoDaMontagem,
  arquivos: ImportedPdfFile[],
  assets: PageAsset[],
): Resultado {
  if (arquivos.length === 0) return semMudanca(estado, "Nenhum arquivo novo.");
  const paginas = assets.length;
  return {
    estado: {
      ...estado,
      importedFiles: [...estado.importedFiles, ...arquivos],
      pageAssets: [...estado.pageAssets, ...assets],
    },
    frase: `${arquivos.length === 1 ? `${arquivos[0].name} importado` : `${arquivos.length} arquivos importados`} (${paginas} ${paginas === 1 ? "página" : "páginas"}).`,
  };
}

/**
 * RECLASSIFICAR DEPOIS DE IMPORTAR (V09). Muda o papel do ARQUIVO e das
 * páginas na biblioteca; o que já está montado continua onde está — um slot
 * aponta para arquivo + página, não para o papel.
 */
export function reclassificarArquivo(
  estado: EstadoDaMontagem,
  fileId: string,
  papel: PageAssetRole,
): Resultado {
  const file = estado.importedFiles.find((f) => f.id === fileId);
  if (!file) return semMudanca(estado, "O arquivo não existe mais.");
  if (file.role === papel) return semMudanca(estado, "O arquivo já tem esse tipo.");
  return {
    estado: {
      ...estado,
      importedFiles: estado.importedFiles.map((f) => (f.id === fileId ? { ...f, role: papel } : f)),
      pageAssets: estado.pageAssets.map((a) =>
        a.sourceFileId === fileId
          ? {
              ...a,
              role: papel,
              classification: a.classification
                ? { ...a.classification, role: papel, source: "manual" as const, confidence: 1 }
                : a.classification,
            }
          : a,
      ),
    },
    frase: `${file.name} passou a ${ROTULO_DO_PAPEL[papel]}. O que já estava montado não mudou de lugar.`,
  };
}

export const ROTULO_DO_PAPEL: Record<PageAssetRole, string> = {
  cover: "Capa",
  ld: "LD",
  separator: "Separatriz",
  document: "Prancha",
  appendix: "Anexo",
};

// --------------------------------------------------------------- edição de campos

export function editarVolume(
  estado: EstadoDaMontagem,
  rowId: string,
  campos: Partial<Pick<AssemblyRow, "title" | "outputFileName">>,
): Resultado {
  if (!estado.rows.some((r) => r.id === rowId)) return semMudanca(estado, "O volume não existe mais.");
  return {
    estado: { ...estado, rows: estado.rows.map((r) => (r.id === rowId ? { ...r, ...campos } : r)) },
    frase: `${rotuloDoVolume(estado, rowId)} editado.`,
  };
}

export function editarGrupo(
  estado: EstadoDaMontagem,
  rowId: string,
  blockId: string,
  campos: Partial<Pick<AssemblyBlock, "title" | "disciplineCode" | "separatorTitle">>,
): Resultado {
  const novo = comGrupo(estado, rowId, blockId, (b) => ({ ...b, ...campos }));
  if (!novo) return semMudanca(estado, "O grupo não existe mais.");
  return { estado: novo, frase: "Grupo editado." };
}

export function editarMetadados(estado: EstadoDaMontagem, metadata: VolumeMetadata): Resultado {
  return { estado: { ...estado, metadata }, frase: "Dados do volume editados." };
}

// --------------------------------------------------------------- prontidão (V01)

export type Pendencia = {
  id: string;
  gravidade: "bloqueio" | "aviso";
  texto: string;
  /** Aonde a tela leva quem clica na pendência. */
  alvo: { rowId: string; blockId?: string };
};

export type EstadoDoVolume = "rascunho" | "incompleto" | "pronto";

export type ProntidaoDoVolume = {
  rowId: string;
  estado: EstadoDoVolume;
  bloqueios: Pendencia[];
  avisos: Pendencia[];
  /** Páginas que o PDF terá, contando separatrizes automáticas. */
  paginas: number;
};

function paginasDaSelecao(sel: PageSelection | undefined, arquivo: ImportedPdfFile | undefined): number[] {
  if (!sel) return [];
  const total = arquivo?.pageCount ?? 0;
  if (sel.mode === "entire_file") return Array.from({ length: total }, (_, i) => i + 1);
  if (sel.mode === "page_range" && sel.startPage !== undefined && sel.endPage !== undefined) {
    const out: number[] = [];
    for (let p = sel.startPage; p <= sel.endPage; p++) out.push(p);
    return out;
  }
  return sel.pages ?? [];
}

/**
 * O VOLUME ESTÁ PRONTO? — regra ESTRUTURAL, local, sem IA (V01).
 *
 * Bloqueia: volume sem grupo, grupo sem pranchas, página de arquivo que não
 * está mais disponível (removido ou sem bytes recuperados), página fora do
 * arquivo, nome final vazio ou repetido. Avisa (sem bloquear): sem capa, sem
 * LD, nome com espaço ou sem `.pdf`. Capa e LD não são impostas: há volume que
 * não leva nenhuma das duas, e a regra não pode inventar convenção.
 */
export function prontidaoDoVolume(
  estado: EstadoDaMontagem,
  rowId: string,
  opcoes: { bytesDisponiveis?: ReadonlySet<string> } = {},
): ProntidaoDoVolume {
  const row = estado.rows.find((r) => r.id === rowId)!;
  const vol = rotuloDoVolume(estado, rowId);
  const bloqueios: Pendencia[] = [];
  const avisos: Pendencia[] = [];
  const arquivos = new Map(estado.importedFiles.map((f) => [f.id, f]));
  let paginas = 0;
  let conteudo = 0;

  const conferirSlot = (s: AssemblySlot | undefined, onde: string, blockId?: string) => {
    if (!s?.selection) return;
    const sel = s.selection;
    const arquivo = arquivos.get(sel.sourceFileId);
    if (!arquivo) {
      bloqueios.push({
        id: `${s.id}:sem-arquivo`,
        gravidade: "bloqueio",
        texto: `${onde}: ${sel.sourceFileName} não está mais entre os arquivos importados.`,
        alvo: { rowId, blockId },
      });
      return;
    }
    if (opcoes.bytesDisponiveis && !opcoes.bytesDisponiveis.has(arquivo.id)) {
      bloqueios.push({
        id: `${s.id}:sem-bytes`,
        gravidade: "bloqueio",
        texto: `${onde}: o conteúdo de ${arquivo.name} não está disponível neste dispositivo — importe o PDF de novo.`,
        alvo: { rowId, blockId },
      });
    }
    const pags = paginasDaSelecao(sel, arquivo);
    const fora = arquivo.pageCount > 0 ? pags.filter((p) => p < 1 || p > arquivo.pageCount) : [];
    if (pags.length === 0 || fora.length > 0) {
      bloqueios.push({
        id: `${s.id}:paginas`,
        gravidade: "bloqueio",
        texto: `${onde}: ${fora.length ? `página ${fora.join(", ")} não existe em ${arquivo.name} (${arquivo.pageCount} páginas)` : `nenhuma página válida de ${arquivo.name}`}.`,
        alvo: { rowId, blockId },
      });
    }
    paginas += pags.length - fora.length;
    conteudo++;
  };

  conferirSlot(row.cover, `${vol} › Capa`);
  if (!row.cover?.selection) {
    avisos.push({ id: `${rowId}:capa`, gravidade: "aviso", texto: `${vol}: sem capa.`, alvo: { rowId } });
  }

  if (row.blocks.length === 0) {
    bloqueios.push({
      id: `${rowId}:sem-grupo`,
      gravidade: "bloqueio",
      texto: `${vol}: sem grupo. Adicione um grupo e coloque as pranchas nele.`,
      alvo: { rowId },
    });
  }

  for (const b of row.blocks) {
    const onde = `${vol} › ${rotuloDoGrupo(row, b.id)}`;
    if (b.separator?.selection) conferirSlot(b.separator, `${onde} › Separatriz`, b.id);
    else paginas += 1; // separatriz automática, gerada no PDF
    conferirSlot(b.ld, `${onde} › LD`, b.id);
    if (!b.ld?.selection) {
      avisos.push({ id: `${b.id}:ld`, gravidade: "aviso", texto: `${onde}: sem LD.`, alvo: { rowId, blockId: b.id } });
    }
    const docs = b.documents.filter((d) => d.selection);
    if (docs.length === 0) {
      bloqueios.push({
        id: `${b.id}:sem-pranchas`,
        gravidade: "bloqueio",
        texto: `${onde}: sem pranchas. Selecione páginas na biblioteca e adicione a este grupo.`,
        alvo: { rowId, blockId: b.id },
      });
    }
    b.documents.forEach((d, i) => conferirSlot(d, `${onde} › Prancha ${i + 1}`, b.id));
    (b.appendices ?? []).forEach((a, i) => conferirSlot(a, `${onde} › Anexo ${i + 1}`, b.id));
    if (!b.separatorTitle?.trim() && !b.separator?.selection) {
      avisos.push({
        id: `${b.id}:titulo-separatriz`,
        gravidade: "aviso",
        texto: `${onde}: separatriz automática sem título.`,
        alvo: { rowId, blockId: b.id },
      });
    }
  }

  const nome = row.outputFileName?.trim() ?? "";
  if (!nome) {
    bloqueios.push({
      id: `${rowId}:nome`,
      gravidade: "bloqueio",
      texto: `${vol}: sem nome final do PDF.`,
      alvo: { rowId },
    });
  } else {
    const repetidos = estado.rows.filter((r) => r.outputFileName?.trim().toLowerCase() === nome.toLowerCase());
    if (repetidos.length > 1) {
      bloqueios.push({
        id: `${rowId}:nome-repetido`,
        gravidade: "bloqueio",
        texto: `${vol}: nome final "${nome}" repetido em outro volume.`,
        alvo: { rowId },
      });
    }
    if (!nome.toLowerCase().endsWith(".pdf")) {
      avisos.push({ id: `${rowId}:ext`, gravidade: "aviso", texto: `${vol}: o nome final não termina em .pdf.`, alvo: { rowId } });
    }
    if (/[<>:"/\\|?*]/.test(nome)) {
      bloqueios.push({ id: `${rowId}:chars`, gravidade: "bloqueio", texto: `${vol}: o nome final tem caracteres inválidos.`, alvo: { rowId } });
    }
  }

  const estadoDoVolume: EstadoDoVolume =
    conteudo === 0 && row.blocks.length === 0 ? "rascunho" : bloqueios.length > 0 ? "incompleto" : "pronto";
  return { rowId, estado: estadoDoVolume, bloqueios, avisos, paginas };
}

export function prontidaoDaMontagem(
  estado: EstadoDaMontagem,
  opcoes: { bytesDisponiveis?: ReadonlySet<string> } = {},
): { volumes: ProntidaoDoVolume[]; exportavel: boolean; bloqueios: number; avisos: number } {
  const volumes = estado.rows.map((r) => prontidaoDoVolume(estado, r.id, opcoes));
  const bloqueios = volumes.reduce((s, v) => s + v.bloqueios.length, 0);
  return {
    volumes,
    exportavel: volumes.length > 0 && bloqueios === 0,
    bloqueios,
    avisos: volumes.reduce((s, v) => s + v.avisos.length, 0),
  };
}

// --------------------------------------------------------------- assinatura (V06)

/**
 * A ASSINATURA DA MONTAGEM: muda com tudo o que muda o PDF (ordem, páginas,
 * arquivos, nomes, títulos de separatriz, metadados), e com nada mais.
 *
 * É ela que prende a conferência à versão: resultado de conferência guarda a
 * assinatura do pedido, e só vale enquanto a atual for a mesma. Resposta
 * atrasada de uma versão antiga não aprova a nova.
 */
export function assinaturaDaMontagem(estado: EstadoDaMontagem): string {
  const sel = (s?: AssemblySlot) =>
    s?.selection
      ? [s.selection.sourceFileId, s.selection.mode, s.selection.startPage ?? "", s.selection.endPage ?? "", (s.selection.pages ?? []).join(".")].join(",")
      : "";
  const corpo = JSON.stringify({
    m: estado.metadata,
    f: estado.importedFiles.map((f) => [f.id, f.size, f.pageCount]),
    r: estado.rows.map((r) => [
      r.outputFileName,
      r.title,
      sel(r.cover),
      r.blocks.map((b) => [
        b.title,
        b.disciplineCode,
        b.separatorTitle,
        sel(b.separator),
        sel(b.ld),
        b.documents.map(sel),
        (b.appendices ?? []).map(sel),
      ]),
    ]),
  });
  // FNV-1a 32 bits, duas voltas com sementes diferentes: basta para detectar
  // mudança (não é segurança) e não pede `crypto` assíncrono.
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ corpo.length;
  for (let i = 0; i < corpo.length; i++) {
    const c = corpo.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
  }
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

export type Conferencia<R> = { assinatura: string; resultado: R; em: number };

export type SituacaoDaConferencia = "nunca" | "valida" | "desatualizada";

export function situacaoDaConferencia<R>(
  conferencia: Conferencia<R> | null,
  assinaturaAtual: string,
): SituacaoDaConferencia {
  if (!conferencia) return "nunca";
  return conferencia.assinatura === assinaturaAtual ? "valida" : "desatualizada";
}

// --------------------------------------------------------------- histórico (V05)

export type EntradaDoHistorico = {
  estado: EstadoDaMontagem;
  rotulo: string;
  chave?: string;
  em: number;
};

export type Historico = { passado: EntradaDoHistorico[]; futuro: EntradaDoHistorico[] };

export const HISTORICO_VAZIO: Historico = { passado: [], futuro: [] };
const LIMITE = 100;
const JANELA_DE_AGRUPAR_MS = 1500;

/**
 * Registra uma operação. `chave` agrupa DIGITAÇÃO: editar o mesmo campo várias
 * vezes seguidas vira uma entrada só, senão desfazer um nome exigiria uma
 * volta por letra. Operação nova depois de desfazer descarta o "refazer".
 */
export function registrar(
  hist: Historico,
  anterior: EstadoDaMontagem,
  rotulo: string,
  opcoes: { chave?: string; agora?: number } = {},
): Historico {
  const agora = opcoes.agora ?? Date.now();
  const ultimo = hist.passado[hist.passado.length - 1];
  if (opcoes.chave && ultimo?.chave === opcoes.chave && agora - ultimo.em < JANELA_DE_AGRUPAR_MS) {
    return { passado: [...hist.passado.slice(0, -1), { ...ultimo, em: agora }], futuro: [] };
  }
  const passado = [...hist.passado, { estado: anterior, rotulo, chave: opcoes.chave, em: agora }];
  return { passado: passado.slice(-LIMITE), futuro: [] };
}

export function desfazer(
  hist: Historico,
  atual: EstadoDaMontagem,
): { hist: Historico; estado: EstadoDaMontagem; rotulo: string } | null {
  const ultimo = hist.passado[hist.passado.length - 1];
  if (!ultimo) return null;
  return {
    estado: ultimo.estado,
    rotulo: ultimo.rotulo,
    hist: {
      passado: hist.passado.slice(0, -1),
      futuro: [{ estado: atual, rotulo: ultimo.rotulo, em: Date.now() }, ...hist.futuro],
    },
  };
}

export function refazer(
  hist: Historico,
  atual: EstadoDaMontagem,
): { hist: Historico; estado: EstadoDaMontagem; rotulo: string } | null {
  const proximo = hist.futuro[0];
  if (!proximo) return null;
  return {
    estado: proximo.estado,
    rotulo: proximo.rotulo,
    hist: {
      passado: [...hist.passado, { estado: atual, rotulo: proximo.rotulo, em: Date.now() }],
      futuro: hist.futuro.slice(1),
    },
  };
}

/** Os arquivos que ALGUM estado (atual ou histórico) ainda referencia. */
export function arquivosReferenciados(atual: EstadoDaMontagem, hist: Historico): Set<string> {
  const ids = new Set<string>();
  for (const e of [atual, ...hist.passado.map((p) => p.estado), ...hist.futuro.map((f) => f.estado)]) {
    for (const f of e.importedFiles) ids.add(f.id);
  }
  return ids;
}

// --------------------------------------------------------------- sequência (V07)

export type PaginaDaSequencia = {
  /** Página no PDF final, a partir de 1. */
  pagina: number;
  papel: "Capa" | "Separatriz automática" | "Separatriz" | "LD" | "Prancha" | "Anexo";
  /** De onde vem: "capa.pdf p. 1", ou o título da separatriz automática. */
  origem: string;
  grupo: string | null;
};

/**
 * A ORDEM EXATA DAS PÁGINAS do PDF de um volume — a mesma de `buildRowPdf`
 * (capa; por grupo: separatriz própria ou automática, LD, pranchas, anexos).
 * É o que a prévia lista ao lado do PDF renderizado, e o que o teste T10
 * compara com o PDF gerado de verdade.
 */
export function sequenciaDoVolume(estado: EstadoDaMontagem, rowId: string): PaginaDaSequencia[] {
  const row = estado.rows.find((r) => r.id === rowId);
  if (!row) return [];
  const arquivos = new Map(estado.importedFiles.map((f) => [f.id, f]));
  const out: PaginaDaSequencia[] = [];
  const empurrar = (s: AssemblySlot | undefined, papel: PaginaDaSequencia["papel"], grupo: string | null) => {
    if (!s?.selection) return;
    const arq = arquivos.get(s.selection.sourceFileId);
    const total = arq?.pageCount ?? 0;
    for (const p of paginasDaSelecao(s.selection, arq)) {
      if (total && (p < 1 || p > total)) continue;
      out.push({ pagina: out.length + 1, papel, origem: `${s.selection.sourceFileName} p. ${p}`, grupo });
    }
  };
  empurrar(row.cover, "Capa", null);
  for (const b of row.blocks) {
    const grupo = rotuloDoGrupo(row, b.id);
    if (b.separator?.selection) empurrar(b.separator, "Separatriz", grupo);
    else out.push({ pagina: out.length + 1, papel: "Separatriz automática", origem: (b.separatorTitle || b.title || "").toUpperCase(), grupo });
    empurrar(b.ld, "LD", grupo);
    b.documents.forEach((d) => empurrar(d, "Prancha", grupo));
    (b.appendices ?? []).forEach((a) => empurrar(a, "Anexo", grupo));
  }
  return out;
}

// --------------------------------------------------------------- sugestão da IA

/**
 * A pré-montagem sugerida vira UM volume novo, numa operação só — e um só
 * "Desfazer" a retira inteira. As páginas sugeridas que não existem mais na
 * biblioteca são ignoradas e contadas na frase.
 */
export function aplicarSugestao(
  estado: EstadoDaMontagem,
  sugestao: {
    title?: string;
    outputFileName?: string;
    separatorTitle?: string;
    coverAssetId?: string | null;
    ldAssetId?: string | null;
    documentAssetIds: string[];
  },
  novoId: GeradorDeId = idPadrao,
): Resultado {
  const porId = new Map(estado.pageAssets.map((a) => [a.id, a]));
  const row = novoVolume(estado.rows.length + 1, novoId);
  const grupo = novoGrupo(1, novoId);
  const capa = sugestao.coverAssetId ? porId.get(sugestao.coverAssetId) : undefined;
  const ld = sugestao.ldAssetId ? porId.get(sugestao.ldAssetId) : undefined;
  const docs = sugestao.documentAssetIds.map((id) => porId.get(id)).filter((a): a is PageAsset => Boolean(a));
  const perdidas = sugestao.documentAssetIds.length - docs.length;
  const novo: AssemblyRow = {
    ...row,
    title: sugestao.title || row.title,
    outputFileName: sugestao.outputFileName || "",
    cover: capa ? slotDe(capa, "cover", "Capa", novoId) : undefined,
    blocks: [
      {
        ...grupo,
        title: sugestao.title || grupo.title,
        separatorTitle: sugestao.separatorTitle || grupo.separatorTitle,
        ld: ld ? slotDe(ld, "ld", "LD", novoId) : undefined,
        documents: docs.map((a, i) => slotDe(a, "document", `Doc ${i + 1}`, novoId)),
      },
    ],
  };
  const rows = [...estado.rows, novo];
  return {
    estado: { ...estado, rows },
    frase: `Sugestão aplicada como ${rotuloDoVolume({ ...estado, rows }, novo.id)} (${docs.length} prancha${docs.length === 1 ? "" : "s"}${perdidas ? `; ${perdidas} página(s) sugerida(s) não existem mais` : ""}).`,
  };
}

/** "Adicionar volume" da tela: o volume já nasce com o Grupo 1 — um só Desfazer. */
export function adicionarVolumeComGrupo(estado: EstadoDaMontagem, novoId: GeradorDeId = idPadrao): Resultado {
  const a = adicionarVolume(estado, novoId);
  const row = a.estado.rows[a.estado.rows.length - 1];
  const b = adicionarGrupo(a.estado, row.id, novoId);
  return {
    estado: b.estado,
    frase: `${rotuloDoVolume(b.estado, row.id)} criado com o Grupo 1 (rascunho, sem páginas). Ele é o destino das páginas agora.`,
  };
}
