/**
 * AS PARTIDAS — as três coisas que o Nexo faz, ditas antes de a pessoa saber
 * pedi-las.
 *
 * A saudação já nomeia as duas portas ("montar ou auditar?"), mas nomear não é
 * o mesmo que oferecer: quem chega pela primeira vez sabe o que quer fazer e
 * não sabe COMO se pede. As partidas escrevem o pedido no lugar dela.
 *
 * ELAS SÃO A INTENÇÃO INICIAL, e é por isso que vivem num módulo próprio e não
 * dentro do componente: a mesma lista atende os chips da entrada e o parâmetro
 * `?intencao=` da rota — que é como outra tela (ou um atalho) manda alguém para
 * cá já sabendo o que veio fazer. Duas listas divergiriam, e aí o chip e o link
 * pediriam coisas diferentes com o mesmo nome.
 *
 * PURO: roda no node cru.
 */

/** O que a partida precisa ter em mãos para poder ser respondida. */
export type InsumoDaPartida = "pranchas" | "memorial";

export interface Partida {
  /** Vai na URL (`/nexo?intencao=montar`). Curto e estável. */
  id: string;
  rotulo: string;
  /**
   * A frase EM PRIMEIRA PESSOA, como o engenheiro pediria.
   *
   * É a mesma linguagem que o agente já entende nos chips de pré-resposta —
   * inventar um dialeto só para as partidas ensinaria a pessoa a falar de um
   * jeito que só funciona na tela de entrada.
   */
  frase: string;
  precisa: InsumoDaPartida;
}

export const PARTIDAS: readonly Partida[] = [
  {
    id: "montar",
    rotulo: "Montar um volume",
    frase: "cria a LD e a capa dessas pranchas",
    precisa: "pranchas",
  },
  {
    id: "auditar",
    rotulo: "Auditar um memorial",
    frase: "audita o memorial",
    precisa: "memorial",
  },
  {
    id: "conferir",
    rotulo: "Conferir as folhas",
    frase: "confere as folhas",
    precisa: "pranchas",
  },
];

/**
 * INTENÇÕES SÓ DE LINK — pedidos que chegam de outra tela (o detalhe do projeto,
 * os endereços antigos `/ld` e `/capas`), mas que não viram chip na entrada.
 *
 * Três chips bastam para quem chega sem saber pedir; "só a LD" e "só a capa"
 * são recortes do "Montar um volume". Mas o projeto oferece os dois como
 * ações próprias, e o link precisa entregar exatamente o que prometeu — por
 * isso a frase é a do recorte, na mesma língua que o agente já entende ("a LD"
 * -> só ld; "a capa" -> só capa, em `run-turn.ts`).
 */
export const INTENCOES_SO_DE_LINK: readonly Partida[] = [
  {
    id: "ld",
    rotulo: "Gerar a lista de documentos (LD)",
    frase: "cria a LD dessas pranchas",
    precisa: "pranchas",
  },
  {
    id: "capa",
    rotulo: "Gerar a capa",
    frase: "cria a capa dessas pranchas",
    precisa: "pranchas",
  },
];

export function partidaPorId(id: string | null | undefined): Partida | null {
  if (!id) return null;
  const alvo = id.trim().toLowerCase();
  return (
    PARTIDAS.find((p) => p.id === alvo) ??
    INTENCOES_SO_DE_LINK.find((p) => p.id === alvo) ??
    null
  );
}

/**
 * FALTA O QUE ELA PRECISA?
 *
 * Quem chama usa isto para decidir se, além de escrever o pedido, abre o
 * seletor de arquivos. Escrever "audita o memorial" numa conversa sem memorial
 * seria um beco: a frase certa, sem nada a que ela se aplique — e a resposta
 * custaria uma volta de modelo para dizer "anexe o memorial", que é o pior
 * primeiro contato possível com um produto que cobra por volta.
 */
export function faltaInsumo(
  partida: Partida,
  emMaos: { pranchas: boolean; memorial: boolean },
): boolean {
  return partida.precisa === "pranchas" ? !emMaos.pranchas : !emMaos.memorial;
}
