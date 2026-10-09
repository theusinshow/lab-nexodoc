/**
 * O TOUR PEDE AO CANVAS PARA CHEGAR PERTO (09/10/2026). O mapa do volume abre
 * afastado (zoom ~0,4 com vários tomos): o cabeçalho do tomo vira um risco, e
 * o holofote iluminava um ponto. O passo com `aproximar` pede ao canvas que
 * enquadre o nó do alvo; o passo sem ele, e o fim do tour, devolvem o
 * enquadramento que a pessoa tinha.
 *
 * Por evento de janela, não por prop: o tour é genérico e mora num portal, e o
 * canvas é quem sabe do próprio viewport.
 */
export const EVENTO_APROXIMAR = "nexo:tour-aproximar";
export const EVENTO_DEVOLVER = "nexo:tour-devolver";
/** Quanto o canvas leva para chegar: o tour mede depois disso. */
export const DURACAO_DA_APROXIMACAO_MS = 350;

export function pedirAproximacao(seletor: string) {
  window.dispatchEvent(new CustomEvent<string>(EVENTO_APROXIMAR, { detail: seletor }));
}

export function pedirDevolucao() {
  window.dispatchEvent(new Event(EVENTO_DEVOLVER));
}
