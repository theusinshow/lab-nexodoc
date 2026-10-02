/**
 * O ARQUIVO SOLTO FORA DO NEXO, levado até ele.
 *
 * O Painel recebe o PDF (soltar ou escolher no computador), mas quem lê é o
 * Nexo (`readSelos` em NexoWorkspace). Um `File` não cabe numa URL; cabe num
 * módulo, porque a navegação de cliente (`router.push`) não recarrega a
 * página — a mesma runtime vai de uma tela à outra, e este módulo com ela.
 *
 * É uma caixa de UM uso: quem entrega deixa, o Nexo retira na montagem e a
 * caixa esvazia. Recarregar a página no caminho perde a entrega, e é o certo:
 * o arquivo não foi lido, e a pessoa vê o Nexo vazio, não um meio-estado.
 */
let pendente: File[] | null = null;

export function entregarAoNexo(arquivos: File[]) {
  pendente = arquivos.length ? arquivos : null;
}

export function retirarEntrega(): File[] | null {
  const arquivos = pendente;
  pendente = null;
  return arquivos;
}

/**
 * Há arquivo esperando o Nexo? Olha sem retirar. A intenção do link (`?intencao=`)
 * não escreve a frase no campo quando o arquivo veio junto: a leitura já
 * responde com a saída certa ("Auditar o memorial"), e a frase no campo ficava
 * sobrando ao lado dela (02/10/2026).
 */
export function haEntregaPendente(): boolean {
  return pendente !== null;
}
