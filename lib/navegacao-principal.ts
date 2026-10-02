/**
 * A NAVEGAÇÃO PRINCIPAL — auditoria UX/UI, G01 (28/09/2026).
 *
 * Cinco destinos com nome de TAREFA, os mesmos na home, no Nexo e no cabeçalho
 * das páginas. Antes, Volumes e Projetos moravam no menu da conta e, no Nexo,
 * numa fileira de ícones no rodapé; a montagem manual aparecia como
 * "ferramenta antiga". Administração só entra para quem tem permissão.
 *
 * Puro de propósito: a ordem e os nomes são o contrato, e a prova os lê daqui.
 */
export type DestinoPrincipal = {
  rotulo: string;
  href: string;
  /** Uma linha: o que se faz lá. Vai no `title` e na página de Ajuda. */
  resumo: string;
  /** Prefixos de rota que contam como "estou aqui". */
  ativoEm: readonly string[];
};

export const DESTINOS_PRINCIPAIS: readonly DestinoPrincipal[] = [
  { rotulo: "Painel", href: "/", resumo: "Onde você parou e o que está com você.", ativoEm: ["/"] },
  { rotulo: "Projetos", href: "/projetos", resumo: "Todos os projetos do escritório, ativos e arquivados.", ativoEm: ["/projetos"] },
  // A montagem manual (/volumes) saiu em 01/10/2026: montar volume é no Nexo.
  {
    rotulo: "Montar volume",
    href: "/nexo?intencao=montar",
    resumo: "No Nexo, a partir das pranchas: capa, LD, separatrizes e o volume.",
    ativoEm: [],
  },
  { rotulo: "Achados", href: "/achados", resumo: "Achados de auditoria com você e os que você atribuiu.", ativoEm: ["/achados"] },
  { rotulo: "Ajuda", href: "/ajuda", resumo: "Glossário e onde fica cada função.", ativoEm: ["/ajuda"] },
];

export const DESTINO_ADMIN: DestinoPrincipal = {
  rotulo: "Administração",
  href: "/admin",
  resumo: "Pessoas, custos, qualidade e configuração — só para quem administra.",
  ativoEm: ["/admin"],
};

export function destinosPara(ehAdmin: boolean): readonly DestinoPrincipal[] {
  return ehAdmin ? [...DESTINOS_PRINCIPAIS, DESTINO_ADMIN] : DESTINOS_PRINCIPAIS;
}

export function destinoAtivo(destino: DestinoPrincipal, caminho: string): boolean {
  return destino.ativoEm.some((p) => (p === "/" ? caminho === "/" : caminho === p || caminho.startsWith(`${p}/`)));
}
