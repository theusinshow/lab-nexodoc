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

/** Um pedaço de item marcado, e de qual grifo ele é (0 = o achado ativo). */
export type Segmento = { inicio: number; fim: number; grifo: number };

/**
 * TODOS OS ACHADOS DA PÁGINA (08/10/2026): cada grifo traz as suas faixas de
 * caractere por item (`marcacaoDoTrecho`); aqui elas viram uma lista só por
 * item, sem sobreposição. Onde dois trechos disputam o mesmo caractere, ganha
 * o grifo de índice menor — o ativo é o 0, e é ele que a pessoa está lendo.
 */
export function segmentosPorItem(grifos: readonly (ReadonlyMap<number, readonly (readonly [number, number])[]> | null)[]): Map<number, Segmento[]> {
  const porItem = new Map<number, Segmento[]>();
  grifos.forEach((faixas, grifo) => {
    if (!faixas) return;
    for (const [item, trechos] of faixas) {
      const ja = porItem.get(item) ?? [];
      for (const [ini, fim] of trechos) {
        // O que sobra deste trecho depois de tirar o que um grifo anterior já tomou.
        let livres: [number, number][] = [[ini, fim]];
        for (const s of ja) {
          livres = livres.flatMap(([a, b]): [number, number][] => {
            if (s.fim <= a || s.inicio >= b) return [[a, b]];
            const resto: [number, number][] = [];
            if (s.inicio > a) resto.push([a, s.inicio]);
            if (s.fim < b) resto.push([s.fim, b]);
            return resto;
          });
        }
        for (const [a, b] of livres) if (b > a) ja.push({ inicio: a, fim: b, grifo });
      }
      porItem.set(item, ja);
    }
  });
  for (const lista of porItem.values()) lista.sort((x, y) => x.inicio - y.inicio);
  return porItem;
}

/**
 * Os pinos na margem: um por grifo, na altura da primeira faixa dele, sem um
 * cobrir o outro (dois achados na mesma linha descem o segundo).
 */
export function alturasDosPinos(primeiras: readonly { grifo: number; y: number }[], tamanho: number, vao = 4): Map<number, number> {
  const saida = new Map<number, number>();
  let livreDesde = -Infinity;
  for (const p of [...primeiras].sort((a, b) => a.y - b.y || a.grifo - b.grifo)) {
    const y = Math.max(p.y, livreDesde);
    saida.set(p.grifo, y);
    livreDesde = y + tamanho + vao;
  }
  return saida;
}
