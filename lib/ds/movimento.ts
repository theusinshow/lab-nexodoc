/**
 * MOVIMENTO do sistema novo — os mesmos tempos do `app/ds.css`, em forma que o
 * `motion` entende. Os dois precisam andar juntos: transição de CSS (hover,
 * cor) lê o arquivo de lá; transição de layout e mola leem daqui.
 *
 * A REGRA que decide se algo se mexe (ver /lab/fundamentos): toda animação
 * responde a uma de três perguntas — o que mudou, para onde foi, o sistema está
 * trabalhando. Movimento que não responde a nenhuma não entra, por mais bonito.
 *
 * Só `transform` e `opacity` animam. Cor e sombra transicionam por CSS, curto.
 */

/** Durações em segundos (o `motion` fala em segundos; o CSS, em ms). */
export const DURACAO = {
  /** Resposta ao aperto: o botão afunda. Abaixo disto o olho não registra. */
  press: 0.08,
  /** Hover, troca de cor, ícone que acende. */
  feedback: 0.12,
  /** Mudança de estado pequena: selo que troca, check que marca. */
  state: 0.18,
  /** Algo entra na tela: menu, toast, linha nova. */
  enter: 0.24,
  /** Algo muda de lugar: lista vira detalhe, painel abre. */
  layout: 0.32,
} as const;

/** Curvas. Nomes pelo que fazem, não pela fórmula. */
export const CURVA = {
  /** Entrada: chega rápido e assenta. A curva padrão de quem aparece. */
  out: [0.22, 1, 0.36, 1],
  /** Resposta a gesto: acompanha o dedo sem arrasto. */
  feedback: [0.25, 1, 0.5, 1],
  /** Deslocamento de A para B com os dois pontos visíveis. */
  move: [0.65, 0, 0.35, 1],
  /** Saída: vai embora sem pedir atenção. */
  exit: [0.4, 0, 1, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

/**
 * Molas, para o que é arrastado ou precisa de peso físico (indicador de aba,
 * elemento compartilhado entre lista e detalhe). Sem quique: `damping` alto o
 * bastante para parar no alvo. Quique é brinquedo; aqui é instrumento.
 */
export const MOLA = {
  /** Indicador de aba, pílula de segmento. */
  snappy: { type: "spring", stiffness: 520, damping: 40, mass: 1 },
  /** Elemento que troca de lugar (lista -> detalhe). */
  smooth: { type: "spring", stiffness: 320, damping: 34, mass: 1 },
  /** Painel grande entrando. */
  gentle: { type: "spring", stiffness: 200, damping: 30, mass: 1 },
} as const;

/**
 * A mesma mola, `k` vezes mais lenta, com o mesmo formato de curva. Rigidez cai
 * com o quadrado e amortecimento com a razão — assim a câmera lenta do /lab
 * mostra o movimento de verdade esticado, e não outro movimento.
 */
export function escalarMola<M extends { stiffness: number; damping: number }>(mola: M, k: number): M {
  return { ...mola, stiffness: mola.stiffness / (k * k), damping: mola.damping / k };
}

export type NomeDaDuracao = keyof typeof DURACAO;
export type NomeDaCurva = keyof typeof CURVA;
export type NomeDaMola = keyof typeof MOLA;
