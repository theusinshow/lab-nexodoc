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
  /**
   * A CONVERSA PREPARADA (02/10/2026): quem chega pelo Painel com uma tarefa
   * escolhida vê a tela dela — o convite na saudação, o que soltar e o que o
   * Nexo vai fazer —, e não a entrada genérica.
   */
  tela: { convite: string; pede: string; faz: string; botao: string };
}

export const PARTIDAS: readonly Partida[] = [
  {
    id: "montar",
    rotulo: "Montar um volume",
    frase: "cria a LD e a capa dessas pranchas",
    precisa: "pranchas",
    tela: {
      convite: "Vamos montar um volume. Me manda as pranchas em PDF.",
      pede: "Solte as pranchas em PDF",
      faz: "O Nexo lê os carimbos e gera a LD, a capa e as separatrizes; com elas prontas, monta o volume.",
      botao: "Escolher as pranchas",
    },
  },
  {
    id: "auditar",
    rotulo: "Auditar um memorial",
    frase: "audita o memorial",
    precisa: "memorial",
    tela: {
      convite: "Vamos auditar um memorial. Me manda o memorial em PDF.",
      pede: "Solte o memorial descritivo em PDF",
      faz: "O Nexo lê a capa, mostra a ficha da obra para você conferir e audita o documento contra ela.",
      botao: "Escolher o memorial",
    },
  },
  {
    id: "conferir",
    rotulo: "Conferir as folhas",
    frase: "confere as folhas",
    precisa: "pranchas",
    tela: {
      convite: "Vamos conferir as folhas. Me manda as pranchas em PDF.",
      pede: "Solte as pranchas em PDF",
      faz: "O Nexo lê o carimbo de cada folha e confere código, revisão e numeração entre elas.",
      botao: "Escolher as pranchas",
    },
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
    tela: {
      convite: "Vamos gerar a LD. Me manda as pranchas em PDF.",
      pede: "Solte as pranchas em PDF",
      faz: "O Nexo lê os carimbos e monta a LD com o título, o código e a revisão de cada folha.",
      botao: "Escolher as pranchas",
    },
  },
  {
    id: "capa",
    rotulo: "Gerar a capa",
    frase: "cria a capa dessas pranchas",
    precisa: "pranchas",
    tela: {
      convite: "Vamos gerar a capa. Me manda as pranchas em PDF.",
      pede: "Solte as pranchas em PDF",
      faz: "O Nexo lê os carimbos e preenche a capa da prefeitura com a obra, o código e a data.",
      botao: "Escolher as pranchas",
    },
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
