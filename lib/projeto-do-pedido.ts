/**
 * O PROJETO DA CONVERSA, viajando no pedido de geração (08/10/2026).
 *
 * LD, capa, separatriz e volume nascem de oito chamadas espalhadas pelo Nexo.
 * Em vez de cada uma carregar o projeto, o Nexo registra o projeto da conversa
 * aberta UMA vez (`definirProjetoDaConversa`) e as chamadas de geração o mandam
 * no cabeçalho. O servidor confere contra o escritório antes de usar
 * ([[nexo-artifacts.ts]]): o cabeçalho é um pedido, não uma autorização.
 *
 * Puro, sem `@/`.
 */
export const CABECALHO_DO_PROJETO = "x-nexo-projeto";

const ID = /^[A-Za-z0-9_-]{1,80}$/;

let projetoDaConversa: string | null = null;

/** Chamado pelo Nexo quando a conversa aberta (ou o projeto dela) muda. */
export function definirProjetoDaConversa(projeto: string | null | undefined) {
  projetoDaConversa = projeto && ID.test(projeto) ? projeto : null;
}

/** Os cabeçalhos de um pedido de geração. */
export function cabecalhosDeGeracao(): Record<string, string> {
  return projetoDaConversa
    ? { "Content-Type": "application/json", [CABECALHO_DO_PROJETO]: projetoDaConversa }
    : { "Content-Type": "application/json" };
}

/** No servidor: o projeto pedido, ou `null`. Ainda precisa ser conferido. */
export function projetoDoPedido(headers: { get(nome: string): string | null }): string | null {
  const v = headers.get(CABECALHO_DO_PROJETO)?.trim() ?? "";
  return ID.test(v) ? v : null;
}
