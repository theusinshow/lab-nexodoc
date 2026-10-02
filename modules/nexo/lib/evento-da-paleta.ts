/**
 * O evento que abre a paleta do Nexo de fora dela — o botão "Buscar ações" e
 * a busca do Topo. Mora fora do componente (que é "use client") porque a
 * página do servidor também o lê, e de um módulo de cliente ela receberia uma
 * referência, não o texto.
 */
export const EVENTO_ABRIR_PALETA = "nexo:abrir-paleta";
