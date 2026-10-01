/*
 * AS PEÇAS DE TODA TELA, com o que o app tem hoje:
 *  - atalhos: GLOBAL_SHORTCUTS de components/keyboard-shortcuts-help.tsx, e os
 *    J/K/C/F do parecer (components/audit-result.tsx, "calado enquanto se digita");
 *  - avisos: as frases do `setPop` do parecer (components/ui/pop.tsx: sucesso
 *    some em 6 s, falha espera alguém fechar);
 *  - tela estreita: o portão de components/ui/portao-de-tela-larga.tsx.
 */

export type Atalho = { teclas: string[]; texto: string };
export type GrupoDeAtalhos = { nome: string; onde?: string; atalhos: Atalho[] };

export const ATALHOS: GrupoDeAtalhos[] = [
  {
    nome: "Em qualquer tela",
    atalhos: [
      { teclas: ["Ctrl", "K"], texto: "Buscar obra, código ou ação" },
      { teclas: ["Ctrl", "G"], texto: "Ir para o painel" },
      { teclas: ["Ctrl", "A"], texto: "Ir para auditoria" },
      { teclas: ["Ctrl", "L"], texto: "Ir para montagem de LDs" },
      { teclas: ["Ctrl", "Shift", "A"], texto: "Ir para a administração" },
      { teclas: ["?"], texto: "Mostrar estes atalhos" },
      { teclas: ["Esc"], texto: "Fechar o que estiver aberto" },
    ],
  },
  {
    nome: "Nas listas",
    onde: "Projetos, Achados, Ajuda",
    atalhos: [
      { teclas: ["J"], texto: "Próximo item" },
      { teclas: ["K"], texto: "Item anterior" },
    ],
  },
  {
    nome: "No parecer",
    onde: "a fila de achados",
    atalhos: [
      { teclas: ["J"], texto: "Próximo achado" },
      { teclas: ["K"], texto: "Achado anterior" },
      { teclas: ["C"], texto: "Confirmar o achado aberto" },
      { teclas: ["F"], texto: "Marcar como falso positivo" },
    ],
  },
];

/** As frases do `setPop` do parecer e de lib/estado-da-carga.ts, separadas em
 *  o que aconteceu (título) e o que fazer com isso (texto). */
export type ModeloDeAviso = { tom: "ok" | "falha"; titulo: string; texto?: string; acao?: string; link?: boolean };
export const AVISOS: Record<"atribuidos" | "parcial" | "copiado" | "naoCopiou" | "rede", ModeloDeAviso> = {
  atribuidos: { tom: "ok", titulo: "3 achados atribuídos a Victor Alves.", texto: "Aparecem na home de quem recebeu; ninguém recebeu e-mail ainda." },
  parcial: { tom: "falha", titulo: "2 de 3 achados atribuídos a Victor Alves.", texto: "1 não entrou — confira a situação na fila.", acao: "Ver na fila" },
  copiado: { tom: "ok", titulo: "Link do achado ACH-014 copiado." },
  naoCopiou: { tom: "falha", titulo: "Não deu para copiar.", texto: "O link é:", link: true },
  rede: { tom: "falha", titulo: "Sem conexão com o servidor.", texto: "Nada foi alterado — tente de novo.", acao: "Tentar de novo" },
};

export const PORTAO = {
  titulo: "Esta tela pede mais largura",
  texto:
    "O painel administrativo lê tabelas densas — pessoas, auditorias, custo por obra — e uma coluna estreita esconderia as colunas que decidem. A partir de 1024px de largura. Abra num computador — nada se perde enquanto isso.",
};
