/**
 * Fixtures pequenas e inventadas para o núcleo do Audit. Não copiam trechos do
 * corpus real; nomes, números e páginas variam de propósito para que nenhuma
 * regra se acople a um documento específico. São teste de regressão, não prova
 * de generalização.
 */
import {
  sha256Hex, stableHash, type DocumentRevision, type EvidenceRef, type RevisionText,
} from "../../lib/audit-engine/contracts.ts";

export function revision(
  documentId: string,
  displayName: string,
  pages: string[],
  extra: Partial<DocumentRevision> = {},
): RevisionText {
  const bytesHash = sha256Hex(`${documentId}\u0000${displayName}\u0000${stableHash(pages)}`);
  return {
    revision: {
      documentId, revisionId: `rev-${bytesHash.slice(0, 12)}`, bytesHash,
      extractionHash: stableHash(pages), extractorVersion: "fixture-text-v1", displayName,
      declaredType: null, pageCount: pages.length, supersedes: null,
      authority: null, discipline: null, effectiveDate: null, ...extra,
    },
    pages,
  };
}

/** Referência exata; recusa citação repetida na página se `occurrence` não for dado. */
export function refFor(rt: RevisionText, page: number, quote: string, occurrence?: number): EvidenceRef {
  const text = rt.pages[page - 1];
  const hits: number[] = [];
  for (let at = text.indexOf(quote); at >= 0; at = text.indexOf(quote, at + 1)) hits.push(at);
  if (!hits.length) throw new Error(`fixture_quote_not_found:${page}`);
  if (hits.length > 1 && occurrence === undefined) throw new Error(`fixture_quote_ambiguous:${page}`);
  const start = hits[occurrence ?? 0];
  return {
    documentId: rt.revision.documentId, revisionId: rt.revision.revisionId, page,
    start, end: start + quote.length, quote, pageTextHash: sha256Hex(text),
    printedPageLabel: null, table: null,
  };
}

const HEADER = "PROJETO EXECUTIVO — EDIFÍCIO DE APOIO — FOLHA";

/** Duas revisões do mesmo documento lógico; a segunda declara substituir a primeira. */
export const specR0 = revision("spec-hidraulica", "especificacao.pdf", [
  `${HEADER} 1\nRevisão R0. Reservatório superior com volume útil de 12.000 L.`,
  `${HEADER} 2\nConsumo diário adotado: 150 L por pessoa.`,
]);
export const specR1 = revision("spec-hidraulica", "especificacao.pdf", [
  `${HEADER} 1\nRevisão R1, substitui a R0. Reservatório superior com volume útil de 15.000 L.`,
  `${HEADER} 2\nConsumo diário adotado: 150 L por pessoa.`,
], { supersedes: { revisionId: specR0.revision.revisionId, basis: "declared_in_document" } });

/** Mesmo nome de arquivo, documentos diferentes. */
export const memorialBloco1 = revision("memorial-bloco-1", "memorial.pdf", [
  "Memorial descritivo — Bloco 1. Área útil de 420,5 m².",
]);
export const memorialBloco2 = revision("memorial-bloco-2", "memorial.pdf", [
  "Memorial descritivo — Bloco 2. Área útil de 310,0 m².",
]);

/** Cabeçalho repetido em toda página e uma página duplicada inteira. */
export const repeatedPages = revision("caderno-encargos", "caderno.pdf", [
  `${HEADER} 1\nItem 3.2: o contratado fornecerá as-built ao final.`,
  `${HEADER} 2\nItem 3.2: o contratado fornecerá as-built ao final.`,
  `${HEADER} 3\nItem 4.1: medição mensal.`,
]);

/** Regra geral na página 1 e exceção na página 6, com páginas neutras entre elas. */
export const clauseAndException = revision("normas-internas", "diretrizes.pdf", [
  "Art. 2º Todas as tubulações de esgoto terão diâmetro mínimo de 100 mm.",
  "Seção de apresentação geral.",
  "Seção de materiais.",
  "Seção de montagem.",
  "Seção de ensaios.",
  "Art. 9º Excetuam-se do art. 2º os ramais de lavatório, que poderão ter 50 mm.",
]);

/** Tabela com cabeçalho e unidade, no formato de grade de `textoDaPaginaParaIA`. */
export const tableDoc = revision("quadro-cargas", "quadro.pdf", [
  "Quadro de cargas\n[TABELA]\nCircuito | Potência (W) | Tensão (V)\nC1 | 1.800 | 220\nC2 | 2.400 | 220\n[/TABELA]",
]);

/** Caso limpo: premissas coerentes entre si. */
export const cleanDoc = revision("memorial-limpo", "memorial-limpo.pdf", [
  "Área da sala técnica: 18,00 m². Densidade adotada: 10 W/m².",
  "Carga de iluminação da sala técnica: 180 W.",
]);

export const ALL_FIXTURES: RevisionText[] = [
  specR0, specR1, memorialBloco1, memorialBloco2, repeatedPages, clauseAndException, tableDoc, cleanDoc,
];
