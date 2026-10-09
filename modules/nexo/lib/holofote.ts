/**
 * O HOLOFOTE do tour: a janela inteira menos um recorte em chanfro no alvo.
 *
 * PURO (`scripts/test-nexo-tour.ts`). Sai um `clip-path: polygon(evenodd, …)`
 * com SEMPRE 13 pontos — a borda da janela (5), uma ponte até o recorte, o
 * recorte (7) e a volta. Com a contagem fixa, o navegador interpola o polígono
 * de um alvo ao outro sozinho, e o recorte DESLIZA em vez de saltar. Sem alvo,
 * os 7 pontos do recorte caem no mesmo ponto: a tela toda fica desfocada.
 *
 * A ponte (0,0)→recorte→(0,0) tem área zero, e com `evenodd` o recorte vira
 * buraco qualquer que seja o sentido em que foi traçado.
 */
import type { Retangulo } from "./posicao-do-balao.ts";

/** O respiro entre o alvo e a borda do recorte. */
export const RESPIRO = 6;
/** O corte do chanfro — o mesmo `--cut-8` das superfícies. */
export const CHANFRO = 8;

export interface Janela {
  largura: number;
  altura: number;
}

/** O retângulo do recorte: o alvo com respiro, preso dentro da janela. Sem alvo, um ponto no centro. */
export function recorteDoAlvo(alvo: Retangulo | null, janela: Janela): Retangulo {
  if (!alvo) return { x: janela.largura / 2, y: janela.altura / 2, largura: 0, altura: 0 };
  const x0 = Math.max(0, alvo.x - RESPIRO);
  const y0 = Math.max(0, alvo.y - RESPIRO);
  const x1 = Math.min(janela.largura, alvo.x + alvo.largura + RESPIRO);
  const y1 = Math.min(janela.altura, alvo.y + alvo.altura + RESPIRO);
  return { x: x0, y: y0, largura: Math.max(0, x1 - x0), altura: Math.max(0, y1 - y0) };
}

/** Os 13 pontos, em px da janela. */
export function pontosDoHolofote(alvo: Retangulo | null, janela: Janela): [number, number][] {
  const { largura: L, altura: A } = janela;
  const r = recorteDoAlvo(alvo, janela);
  // Recorte pequeno demais não comporta o chanfro inteiro.
  const c = Math.min(CHANFRO, r.largura / 2, r.altura / 2);
  const { x, y, largura: w, altura: h } = r;
  return [
    [0, 0],
    [L, 0],
    [L, A],
    [0, A],
    [0, 0],
    // O recorte: chanfro no canto superior esquerdo e no inferior direito.
    [x + c, y],
    [x + w, y],
    [x + w, y + h - c],
    [x + w - c, y + h],
    [x, y + h],
    [x, y + c],
    [x + c, y],
    [0, 0],
  ];
}

const px = (n: number) => `${Math.round(n * 10) / 10}px`;

export function recorteDoHolofote(alvo: Retangulo | null, janela: Janela): string {
  return `polygon(evenodd, ${pontosDoHolofote(alvo, janela)
    .map(([x, y]) => `${px(x)} ${px(y)}`)
    .join(", ")})`;
}
