/**
 * O PROGRESSO DA MONTAGEM (06/10/2026). Montar um volume leva de segundos a
 * minutos — juntar dezenas de pranchas, depois reler os carimbos — e a tela só
 * trocava o texto do botão para "Montando…". Com seis tomos, o botão ficava lá
 * em cima e ninguém via que algo andava.
 *
 * Cada tomo passa por fases; cada fase tem um PESO no segmento dele, para a
 * barra andar dentro do tomo e não só de um tomo para o outro. Os pesos não
 * medem tempo exato (juntar e conferir variam com o volume), só a ordem e uma
 * proporção honesta: juntar e conferir são o grosso.
 *
 * PURO: `node scripts/test-nexo-progresso-da-montagem.ts`.
 */

export type FaseDaMontagem =
  | "aguardando"
  | "conferindo-versao"
  | "preparando"
  | "juntando"
  | "conferindo"
  | "pronto"
  | "falhou";

const PESO: Record<FaseDaMontagem, number> = {
  aguardando: 0,
  "conferindo-versao": 0.05,
  preparando: 0.15,
  juntando: 0.35,
  conferindo: 0.8,
  pronto: 1,
  falhou: 1,
};

export function pesoDaFase(fase: FaseDaMontagem | undefined): number {
  return fase ? PESO[fase] : 0;
}

export function faseEmCurso(fase: FaseDaMontagem | undefined): boolean {
  return fase === "conferindo-versao" || fase === "preparando" || fase === "juntando" || fase === "conferindo";
}

/** O que está acontecendo, em minúsculas, para entrar depois de "Tomo 02 · ". */
export function rotuloDaFase(fase: FaseDaMontagem | undefined, pranchas?: number): string {
  switch (fase) {
    case "conferindo-versao":
      return "conferindo se a conversa está atual";
    case "preparando":
      return "preparando capa, LD e separatriz";
    case "juntando":
      return pranchas ? `juntando ${pranchas} ${pranchas === 1 ? "prancha" : "pranchas"}` : "juntando as pranchas";
    case "conferindo":
      return "montado — conferindo os carimbos";
    case "pronto":
      return "pronto";
    case "falhou":
      return "não montou";
    default:
      return "na fila";
  }
}

export interface ProgressoDoLote {
  total: number;
  prontos: number;
  falhas: number;
  /** 0..1, com a fração da fase do tomo em curso. */
  fracao: number;
  emCurso: boolean;
  /** Índice do tomo em curso, ou -1. */
  atual: number;
}

export function progressoDoLote(fases: readonly (FaseDaMontagem | undefined)[]): ProgressoDoLote {
  const total = fases.length;
  const prontos = fases.filter((f) => f === "pronto").length;
  const falhas = fases.filter((f) => f === "falhou").length;
  const soma = fases.reduce((s, f) => s + pesoDaFase(f), 0);
  const atual = fases.findIndex(faseEmCurso);
  return {
    total,
    prontos,
    falhas,
    fracao: total > 0 ? soma / total : 0,
    emCurso: atual >= 0 || fases.some((f) => f === "aguardando"),
    atual,
  };
}
