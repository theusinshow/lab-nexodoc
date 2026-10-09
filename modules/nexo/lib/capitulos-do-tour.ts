/**
 * OS CAPÍTULOS de um roteiro. O primeiro passo de cada parte traz `capitulo`;
 * os seguintes herdam. Puro (`scripts/test-nexo-tour.ts`).
 *
 * Servem para a pessoa saber onde está ("Achados · 3 de 13") e pular a parte
 * que já conhece, em vez de atravessar 28 balões para chegar à que quer.
 */
import type { PassoDoTour } from "./passos-do-tour.ts";

export interface Capitulo {
  nome: string;
  /** Índice do primeiro passo do capítulo. */
  inicio: number;
  /** Quantos passos ele tem. */
  total: number;
}

export function capitulosDoRoteiro(passos: PassoDoTour[]): Capitulo[] {
  const capitulos: Capitulo[] = [];
  passos.forEach((p, i) => {
    if (p.capitulo || capitulos.length === 0) capitulos.push({ nome: p.capitulo ?? "", inicio: i, total: 0 });
    capitulos[capitulos.length - 1].total++;
  });
  return capitulos;
}

export interface OndeEsta {
  capitulo: Capitulo;
  /** Posição do capítulo no roteiro, a partir de 0. */
  ordem: number;
  /** Posição do passo dentro do capítulo, a partir de 1. */
  passo: number;
  /** O primeiro passo do capítulo seguinte; `null` no último. */
  proximoCapitulo: number | null;
}

export function ondeEsta(capitulos: Capitulo[], indice: number): OndeEsta {
  let ordem = 0;
  for (let k = 0; k < capitulos.length; k++) if (capitulos[k].inicio <= indice) ordem = k;
  const capitulo = capitulos[ordem];
  const seguinte = capitulos[ordem + 1];
  return { capitulo, ordem, passo: indice - capitulo.inicio + 1, proximoCapitulo: seguinte ? seguinte.inicio : null };
}

/**
 * O clique de vista que um passo pressupõe: o dele, ou o do último passo antes
 * dele que trocou de vista. Quem chega por SALTO (retomada, pular capítulo,
 * voltar) não passou pelo clique do caminho.
 */
export function cliqueQueOPassoPressupoe(passos: PassoDoTour[], indice: number): string | undefined {
  for (let i = indice; i >= 0; i--) if (passos[i].clicarAntes) return passos[i].clicarAntes;
  return undefined;
}
