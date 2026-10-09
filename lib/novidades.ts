/**
 * O QUE HÁ DE NOVO (09/10/2026) — a lista que o sino mostra.
 *
 * Escrita à mão a cada entrega que muda o dia de quem usa: uma linha, na voz do
 * produto, sem jargão de código. Mais nova primeiro. O `id` é a data mais um
 * nome curto e nunca muda depois de publicado — é por ele que o navegador
 * lembra até onde a pessoa já viu.
 *
 * Puro: testado em `scripts/test-novidades.ts`.
 */

export interface Novidade {
  /**
   * "2026-10-09b-juntar-blocos": data + letra da ordem no dia + nome. Ordenável
   * como texto — e a letra é o que impede a novidade nova de nascer "vista"
   * por vir antes no alfabeto que outra do mesmo dia.
   */
  id: string;
  titulo: string;
  linha: string;
}

export const NOVIDADES: readonly Novidade[] = [
  {
    id: "2026-10-09c-teto-20mb",
    titulo: "Volume acima de 20 MB",
    linha: "O tomo pesado oferece comprimir as imagens (com a estimativa) ou dividir em mais tomos.",
  },
  {
    id: "2026-10-09b-juntar-blocos",
    titulo: "Juntar duas disciplinas",
    linha: "Selecione folhas de duas disciplinas no canvas e junte-as: uma separatriz e uma LD para as duas.",
  },
  {
    id: "2026-10-09a-pranchas-guardadas",
    titulo: "As pranchas ficam guardadas",
    linha: "Recarregar a página não perde mais as pranchas: elas ficam no projeto e o volume monta direto.",
  },
  {
    id: "2026-10-08a-suporte",
    titulo: "Reportar um problema",
    linha: "No menu da sua conta: o print e o caminho até o erro vão junto, e a resposta chega aqui.",
  },
];

/** Quem nunca abriu o sino vê só o que saiu nestes últimos dias, não o histórico inteiro. */
export const DIAS_PARA_QUEM_CHEGA = 14;

const dataDo = (id: string) => id.slice(0, 10);

/**
 * As novidades que a pessoa ainda não viu. `vistoAte` é o `id` da mais nova que
 * ela viu (ou `null`, nunca abriu). `hoje` em AAAA-MM-DD.
 */
export function naoVistas(
  novidades: readonly Novidade[],
  vistoAte: string | null,
  hoje: string,
): Novidade[] {
  if (vistoAte) return novidades.filter((n) => n.id > vistoAte);
  const corte = new Date(`${hoje}T12:00:00Z`);
  corte.setUTCDate(corte.getUTCDate() - DIAS_PARA_QUEM_CHEGA);
  const desde = corte.toISOString().slice(0, 10);
  return novidades.filter((n) => dataDo(n.id) > desde);
}

/** O `id` a gravar quando a pessoa abre o sino: o da mais nova. */
export function marcaDeVisto(novidades: readonly Novidade[]): string | null {
  return novidades.reduce<string | null>((maior, n) => (maior === null || n.id > maior ? n.id : maior), null);
}

/** "9 de out." — a data como a lista mostra. */
export function dataCurta(id: string): string {
  const [, mes, dia] = dataDo(id).split("-").map(Number);
  const MESES = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
  return `${dia} de ${MESES[(mes ?? 1) - 1]}`;
}
