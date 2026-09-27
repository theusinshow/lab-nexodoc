/**
 * Localização e prova de citações sobre o texto canônico de uma revisão.
 *
 * Três versões do texto, cada uma com um papel:
 * - apresentação e prova literal: o texto canônico da página (`RevisionText`),
 *   que é o que o engenheiro encontra ao abrir o PDF e o que `EvidenceRef.quote`
 *   guarda byte a byte;
 * - busca: o mesmo texto com espaço colapsado e caixa baixa, com mapa de volta
 *   para os offsets UTF-16 do original.
 *
 * A busca é propositalmente MENOS tolerante que `lib/ancoragem-de-evidencia.ts`
 * (que tira acento e pontuação para julgar se um achado legado "existe"): aqui o
 * resultado vira prova, então sinal, número, unidade, acento e negação ficam.
 *
 * Nunca desloca a citação para outra página ou revisão. Achar o texto em outro
 * lugar gera uma SUGESTÃO sem referência; usá-la exige nova localização.
 */
import { sha256Hex, type EvidenceRef, type RevisionText } from "./contracts.ts";

/** Colapsa espaço e baixa a caixa. Não remove sinais, números, unidades ou acentos. */
export function canonicalWithMap(text: string): { text: string; offsets: number[] } {
  let normalized = "";
  const offsets: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = /\s/.test(text[i]) ? " " : text[i].toLowerCase();
    if (c === " " && (!normalized || normalized.endsWith(" "))) continue;
    for (const character of c) { normalized += character; offsets.push(i); }
  }
  if (normalized.endsWith(" ")) { normalized = normalized.slice(0, -1); offsets.pop(); }
  return { text: normalized, offsets };
}

export type IndexedPage = {
  page: number;
  text: string;
  textHash: string;
  search: { text: string; offsets: number[] };
};
export type RevisionIndex = { rt: RevisionText; pages: IndexedPage[] };

export function indexRevision(rt: RevisionText): RevisionIndex {
  if (rt.pages.length !== rt.revision.pageCount) throw new Error("page_count_mismatch");
  return {
    rt,
    pages: rt.pages.map((text, i) => ({
      page: i + 1, text, textHash: sha256Hex(text), search: canonicalWithMap(text),
    })),
  };
}

export const MIN_QUOTE_CHARS = 12;

export type LocateRequest = {
  documentId: string;
  revisionId: string;
  page: number;
  quote: string;
  /**
   * Desambiguação para texto repetido na página. `offset` precisa ser o início
   * exato de uma ocorrência; `context` é um trecho maior, único na página, que
   * contém a citação uma única vez.
   */
  disambiguation?: { offset: number } | { context: string };
};

export type LocateFailure =
  | "revision_unknown"
  | "document_mismatch"
  | "page_out_of_range"
  | "quote_too_short"
  | "not_found"
  | "ambiguous"
  | "disambiguation_not_matched"
  /** A citação começa ou termina no meio de um número, ou deixa o sinal de fora. */
  | "cuts_number_or_sign"
  /** A palavra imediatamente anterior é negação que a citação omite. */
  | "drops_negation";

export type LocateResult =
  | { status: "anchored"; ref: EvidenceRef }
  | { status: LocateFailure; occurrences: number; elsewhere: Array<{ page: number }> };

function occurrences(hay: string, needle: string): number[] {
  const hits: number[] = [];
  for (let at = hay.indexOf(needle); at >= 0; at = hay.indexOf(needle, at + 1)) hits.push(at);
  return hits;
}

function toOriginal(p: IndexedPage, at: number, length: number) {
  const start = p.search.offsets[at];
  const end = p.search.offsets[at + length - 1] + 1;
  return { start, end };
}

/** Páginas da MESMA revisão onde a citação aparece. Só sugestão, nunca prova. */
function elsewhere(index: RevisionIndex, needle: string, except: number) {
  return index.pages.filter(p => p.page !== except && p.search.text.includes(needle)).map(p => ({ page: p.page }));
}

const DIGIT = /[0-9]/;
const SIGN = /[-−+±]/;
const NEGATION = /(?:^|[^\p{L}])(?:não|nao|nem|nunca|jamais)\s*$/iu;

/**
 * Substring literal pode ser prova errada: "30° de inclinação" existe dentro de
 * "−30° de inclinação", "5,0 m" dentro de "15,0 m", "deverá ser instalado"
 * dentro de "não deverá ser instalado". Recusa, em vez de ancorar.
 */
export function boundaryProblem(text: string, start: number, end: number): "cuts_number_or_sign" | "drops_negation" | null {
  const first = text[start] ?? "";
  const before = text[start - 1] ?? "";
  const before2 = text[start - 2] ?? "";
  if (DIGIT.test(first)) {
    if (DIGIT.test(before) || SIGN.test(before)) return "cuts_number_or_sign";
    if (/[.,]/.test(before) && DIGIT.test(before2)) return "cuts_number_or_sign";
  }
  const last = text[end - 1] ?? "";
  const after = text[end] ?? "";
  const after2 = text[end + 1] ?? "";
  const last2 = text[end - 2] ?? "";
  if (DIGIT.test(last) && (DIGIT.test(after) || (/[.,]/.test(after) && DIGIT.test(after2)))) return "cuts_number_or_sign";
  // Termina no separador decimal: "15," de "15,0".
  if (/[.,]/.test(last) && DIGIT.test(last2) && DIGIT.test(after)) return "cuts_number_or_sign";
  // Começa no separador decimal: ",0 m" de "15,0 m".
  if (/[.,]/.test(first) && DIGIT.test(before) && DIGIT.test(text[start + 1] ?? "")) return "cuts_number_or_sign";
  const sentence = text.slice(Math.max(0, start - 40), start).split(/[.;:!?\n]/).at(-1) ?? "";
  if (NEGATION.test(sentence)) return "drops_negation";
  return null;
}

export function locateQuote(corpus: RevisionIndex[], req: LocateRequest): LocateResult {
  const fail = (status: LocateFailure, occ = 0, alt: Array<{ page: number }> = []): LocateResult =>
    ({ status, occurrences: occ, elsewhere: alt });
  const index = corpus.find(c => c.rt.revision.revisionId === req.revisionId);
  if (!index) return fail("revision_unknown");
  if (index.rt.revision.documentId !== req.documentId) return fail("document_mismatch");
  const page = index.pages[req.page - 1];
  if (!Number.isSafeInteger(req.page) || !page) return fail("page_out_of_range");
  const needle = canonicalWithMap(req.quote).text;
  if (needle.length < MIN_QUOTE_CHARS) return fail("quote_too_short");

  const hits = occurrences(page.search.text, needle);
  if (!hits.length) return fail("not_found", 0, elsewhere(index, needle, page.page));

  let chosen: number | null = hits.length === 1 ? hits[0] : null;
  const d = req.disambiguation;
  // A dica (offset/contexto) só DESEMPATA. Com ocorrência única o trecho já é inequívoco,
  // e recusar por dica errada jogava fora citação correta (modelos chutam offset: no
  // 117-25 real, todas as citações recusadas eram únicas na página). Com várias
  // ocorrências, dica que não confere continua sendo recusa.
  if (d && "offset" in d && hits.length > 1) {
    chosen = hits.find(at => toOriginal(page, at, needle.length).start === d.offset) ?? null;
    if (chosen === null) return fail("disambiguation_not_matched", hits.length);
  } else if (d && "context" in d && hits.length > 1) {
    const ctx = canonicalWithMap(d.context).text;
    const ctxHits = ctx.includes(needle) ? occurrences(page.search.text, ctx) : [];
    const inner = occurrences(ctx, needle);
    if (ctxHits.length !== 1 || inner.length !== 1) return fail("disambiguation_not_matched", hits.length);
    chosen = ctxHits[0] + inner[0];
  }
  if (chosen === null) return fail("ambiguous", hits.length);

  const { start, end } = toOriginal(page, chosen, needle.length);
  const problem = boundaryProblem(page.text, start, end);
  if (problem) return fail(problem, hits.length);
  return {
    status: "anchored",
    ref: {
      documentId: req.documentId, revisionId: req.revisionId, page: page.page, start, end,
      quote: page.text.slice(start, end), pageTextHash: page.textHash, printedPageLabel: null, table: null,
    },
  };
}

/**
 * Referência a um trecho cujos offsets o próprio núcleo calculou (extração
 * determinística). Não passa por busca: os offsets já são a verdade, e o
 * trecho guardado é o recorte exato.
 */
export function refAt(rt: RevisionText, page: number, start: number, end: number): EvidenceRef {
  const text = rt.pages[page - 1];
  if (text === undefined || start < 0 || end > text.length || end <= start) throw new Error("ref_out_of_range");
  return {
    documentId: rt.revision.documentId, revisionId: rt.revision.revisionId, page, start, end,
    quote: text.slice(start, end), pageTextHash: sha256Hex(text), printedPageLabel: null, table: null,
  };
}
