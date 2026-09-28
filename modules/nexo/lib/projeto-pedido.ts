/**
 * O PROJETO PEDIDO PELO LINK, já conferido pelo servidor (`app/nexo/page.tsx`).
 *
 * Três desfechos, e a tela trata cada um de um jeito:
 * - `ok`: existe e a pessoa tem acesso — a conversa nova nasce endereçada a ele
 *   e a barra diz "Projeto X".
 * - `sem-acesso`: não existe OU não é acessível (mesma resposta de propósito).
 * - `indisponivel`: o servidor não conseguiu conferir (sem banco, falha
 *   transitória). Nada é vinculado — vincular sem conferir seria dar à query o
 *   poder de endereçar trabalho.
 *
 * PURO (só tipos) — importável pelo servidor e pelo cliente.
 */
export type ProjetoPedido =
  | {
      id: string;
      estado: "ok";
      codigo: string;
      nome: string;
      arquivado: boolean;
    }
  | { id: string; estado: "sem-acesso" | "indisponivel" };
