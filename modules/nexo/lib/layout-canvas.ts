/**
 * Geometria do canvas: onde cada folha cai na grade do seu tomo e quanto cada
 * fileira ocupa em altura.
 *
 * As folhas viram GRADE, não esteira: uma fileira horizontal de 200 folhas
 * empurraria o nó do volume para fora da tela justamente no projeto grande, e o
 * volume é o resultado que o tomo produz. A grade cresce para BAIXO, que é a
 * direção em que o canvas já cresce (uma fileira por tomo).
 *
 * PURO: nenhum import — roda em Node pelado no `scripts/test-nexo-layout.ts`.
 */

/** Folhas por linha num volume normal. */
export const COLUNAS_MINIMAS = 6;
/** Teto: mais que isto e a fileira fica larga demais para ler de relance. */
export const COLUNAS_MAXIMAS = 20;

/**
 * Quantas colunas a grade de um tomo usa.
 *
 * Fixar em 6 fazia um tomo de 200 folhas virar 34 linhas: quase 2.200px de altura
 * numa fileira, e o `fitView` não conseguia enquadrar o projeto inteiro porque o
 * `minZoom` do canvas trava o afastamento. A raiz da quantidade mantém a fileira
 * com proporção de fileira — 200 folhas viram 15 colunas por 14 linhas.
 */
export function colunasDaGrade(quantidade: number): number {
  if (quantidade <= 0) return COLUNAS_MINIMAS;
  return Math.min(
    COLUNAS_MAXIMAS,
    Math.max(COLUNAS_MINIMAS, Math.ceil(Math.sqrt(quantidade))),
  );
}
/**
 * Largura do nó da folha. Era 120: num volume real (017-26, estrutural, 30
 * folhas) os títulos saíam cortados no meio — "IMPLANTAÇÃO - CENTRAL DE GÁS:
 * DETALHAMENTO…" — e conferir a lista virava abrir folha por folha (Matheus,
 * 02/10/2026). Com 200 o título quase inteiro cabe em três linhas.
 */
export const LARGURA_FOLHA = 200;
/**
 * Altura do nó da folha. Era 56, para o cartão antigo (número + título); o
 * cartão Carimbo do sistema novo (02/10/2026) tem a fileira de células e o
 * título embaixo, e com 56 de passo a segunda linha da grade caía por cima da
 * primeira — achado no teste real com 7 pranchas.
 */
export const ALTURA_FOLHA = 96;
/** Largura do nó da folha + respiro. */
export const PASSO_X = 210;
/** Altura do nó da folha + respiro. */
export const PASSO_Y = 106;
/**
 * Altura de uma fileira sem folhas — o bastante para o nó de DOCUMENTO, que é o
 * mais alto do canvas: miniatura 200×267 (aspecto 3/4) + rótulo + título de até
 * três linhas + estado + ações. Com 330 as fileiras se sobrepunham e o título da
 * LD ficava cortado pela fileira de baixo.
 */
export const ALTURA_MINIMA_FILEIRA = 430;

/** Faixa acima de cada fileira para o cabeçalho do tomo (estado + Montar/Baixar). */
export const ALTURA_DA_CABECA = 64;
/** Respiro entre a grade e a fileira seguinte. */
const FOLGA_DA_FILEIRA = 40;

/** Posição da n-ésima folha dentro da grade do tomo (relativa à grade). */
export function posicaoNaGrade(
  indice: number,
  colunas: number,
): { x: number; y: number } {
  return {
    x: (indice % colunas) * PASSO_X,
    y: Math.floor(indice / colunas) * PASSO_Y,
  };
}

/** Largura ocupada pela grade — para saber onde o nó seguinte começa. */
export function larguraDaGrade(
  quantidade: number,
  colunas: number = colunasDaGrade(quantidade),
): number {
  return Math.min(quantidade, colunas) * PASSO_X;
}

/** Altura ocupada pela grade: linha começada é linha inteira. */
export function alturaDaGrade(
  quantidade: number,
  colunas: number = colunasDaGrade(quantidade),
): number {
  return Math.ceil(quantidade / colunas) * PASSO_Y;
}

/** Altura da fileira do tomo: o que for maior entre os documentos e a grade. */
export function alturaDaFileira(quantidadeDeFolhas: number): number {
  return Math.max(ALTURA_MINIMA_FILEIRA, alturaDaGrade(quantidadeDeFolhas) + FOLGA_DA_FILEIRA);
}

/**
 * O `y` de cada fileira, ACUMULADO. Era `linha * 330` fixo — com um tomo de 200
 * folhas, a fileira de baixo era desenhada por cima da grade de cima.
 */
export function topoDasFileiras(alturas: readonly number[]): number[] {
  const topos: number[] = [];
  let cursor = 0;
  for (const altura of alturas) {
    topos.push(cursor);
    cursor += altura;
  }
  return topos;
}
