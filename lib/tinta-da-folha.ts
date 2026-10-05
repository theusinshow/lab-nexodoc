/**
 * A TINTA DA FOLHA, contada da lista de operadores do pdf.js — UMA conta para
 * os dois lados.
 *
 * O servidor ([[pdf-text.ts]]) e o navegador
 * (`modules/nexo/lib/pdfjs-no-navegador.ts`) mediam a tinta cada um com a sua
 * cópia do laço. Enquanto a medida era só "quantos ops de desenho e de imagem",
 * duas cópias eram tolerável. Com o TAMANHO de cada imagem entrando na conta
 * (é ele que separa o logo do cabeçalho do quadro em imagem), duas cópias
 * seriam dois portões: o navegador oferecendo transcrever uma folha que o
 * servidor depois recusa, ou o contrário.
 *
 * PURO e sem import de valor: recebe a lista já pronta e o `OPS` do pdf.js de
 * quem chama. Pode ir para o bundle do navegador sem arrastar nada.
 */

/**
 * A FRAÇÃO DA FOLHA a partir da qual uma imagem é conteúdo, e não enfeite.
 *
 * MEDIDA no 141-26 (174 páginas): os logos do cabeçalho, em toda folha, cobrem
 * 0,35% e 0,47%. A menor imagem de conteúdo (um pictograma da sinalização,
 * 154x166 pt) cobre 5,1%; a tabela de sinalização mais baixa (446x76 pt), 6,8%;
 * o Quadro de Áreas, 14,6%. 4% fica no vão, com folga para os dois lados.
 */
export const FRACAO_DA_IMAGEM_GRANDE = 0.04;

export interface ContagemDeTinta {
  desenho: number;
  imagem: number;
  imagensGrandes: number;
}

function multiplicar(m: number[], n: number[]): number[] {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

/**
 * Conta caminhos, imagens e imagens GRANDES da folha.
 *
 * A imagem é pintada no quadrado unitário, então a área que ela ocupa é o
 * determinante da matriz corrente — acompanhada pelos ops de `save`/`restore`/
 * `transform` e pela matriz de cada form XObject. `?? -1` em cada op: a lista
 * de `OPS` do pdf.js já mudou entre versões, e um nome que suma não pode
 * derrubar a medida.
 */
export function contarTinta(
  ops: { fnArray: ArrayLike<number>; argsArray: ArrayLike<unknown> },
  OPS: Record<string, number>,
  /** `page.view` — `[x0, y0, x1, y1]` em pontos. */
  view: ArrayLike<number>,
): ContagemDeTinta {
  const desenhoOps = new Set([OPS.constructPath ?? -1]);
  const imagemOps = new Set([
    OPS.paintImageXObject ?? -1,
    OPS.paintJpegXObject ?? -1,
    OPS.paintImageMaskXObject ?? -1,
    OPS.paintInlineImageXObject ?? -1,
  ]);
  const areaDaFolha = Math.abs((view[2] - view[0]) * (view[3] - view[1])) || 1;

  let ctm = [1, 0, 0, 1, 0, 0];
  const pilha: number[][] = [];
  let desenho = 0;
  let imagem = 0;
  let imagensGrandes = 0;

  for (let i = 0; i < ops.fnArray.length; i += 1) {
    const op = ops.fnArray[i];
    const args = ops.argsArray[i] as unknown[] | null | undefined;

    if (op === OPS.save || op === OPS.paintFormXObjectBegin) {
      pilha.push(ctm);
      const matriz = op === OPS.paintFormXObjectBegin ? args?.[0] : null;
      if (Array.isArray(matriz) && matriz.length === 6) ctm = multiplicar(ctm, matriz);
    } else if (op === OPS.restore || op === OPS.paintFormXObjectEnd) {
      ctm = pilha.pop() ?? ctm;
    } else if (op === OPS.transform) {
      if (Array.isArray(args) && args.length === 6) ctm = multiplicar(ctm, args as number[]);
    } else if (desenhoOps.has(op)) {
      desenho += 1;
    } else if (imagemOps.has(op)) {
      imagem += 1;
      const area = Math.abs(ctm[0] * ctm[3] - ctm[1] * ctm[2]);
      if (area / areaDaFolha >= FRACAO_DA_IMAGEM_GRANDE) imagensGrandes += 1;
    }
  }

  return { desenho, imagem, imagensGrandes };
}
