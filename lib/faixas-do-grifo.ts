/**
 * AS FAIXAS DO GRIFO (08/10/2026): o marca-texto contínuo do visor de PDF.
 *
 * O grifo era o `<mark>` amarelo do navegador dentro da camada de texto, e o
 * pdf.js corta a frase em vários spans — "trecho de conferencia 3" saía em
 * quatro retalhos com buracos entre as palavras. Aqui as caixas dos `<mark>`
 * de uma mesma LINHA viram UMA faixa, com folga, que o visor desenha por baixo
 * do texto.
 *
 * Puro (caixas entram, faixas saem) para ser provado sem navegador:
 * `npm run test:faixas-do-grifo`.
 */

export type Caixa = { x: number; y: number; w: number; h: number };

/**
 * Duas caixas estão na mesma linha quando se sobrepõem na vertical em mais da
 * metade da menor altura. Fontes diferentes na mesma linha (negrito, índice)
 * mudam a altura, não a sobreposição.
 */
function mesmaLinha(a: Caixa, b: Caixa) {
  const sobrepoe = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return sobrepoe > Math.min(a.h, b.h) * 0.5;
}

/**
 * @param caixas as caixas dos `<mark>`, já na escala da folha (px da folha)
 * @param folga  quanto a faixa passa do texto, em fração da altura da linha
 */
export function faixasPorLinha(caixas: readonly Caixa[], folga = { x: 0.18, y: 0.12 }): Caixa[] {
  const validas = caixas.filter((c) => c.w > 0.5 && c.h > 0.5).sort((a, b) => a.y - b.y || a.x - b.x);
  const linhas: Caixa[] = [];
  for (const c of validas) {
    const linha = linhas.find((l) => mesmaLinha(l, c));
    if (!linha) {
      linhas.push({ ...c });
      continue;
    }
    const direita = Math.max(linha.x + linha.w, c.x + c.w);
    const baixo = Math.max(linha.y + linha.h, c.y + c.h);
    linha.x = Math.min(linha.x, c.x);
    linha.y = Math.min(linha.y, c.y);
    linha.w = direita - linha.x;
    linha.h = baixo - linha.y;
  }
  return linhas
    .sort((a, b) => a.y - b.y)
    .map((l) => {
      const fx = l.h * folga.x;
      const fy = l.h * folga.y;
      return { x: l.x - fx, y: l.y - fy, w: l.w + 2 * fx, h: l.h + 2 * fy };
    });
}
