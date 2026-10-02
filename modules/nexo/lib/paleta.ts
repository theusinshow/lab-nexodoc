/**
 * A PALETA — as ações que se alcançam pelo teclado, e só as ações.
 *
 * As CONVERSAS não moram aqui: quem as filtra é `groupConversations`, que já
 * cobre título e nome da pasta e já é usado pela barra lateral. Uma segunda
 * busca de conversas dentro da paleta acharia coisas diferentes da barra com o
 * mesmo texto digitado — e a pessoa não teria como saber qual das duas está
 * errada.
 *
 * NENHUMA AÇÃO DESTRUTIVA. É regra da proposta e vale repetir onde ela é
 * aplicada: a paleta é alcançada por acidente (um `Ctrl+K` que se queria
 * `Ctrl+C`), e uma lista onde "apagar a conversa" fica a duas teclas de
 * distância transforma o atalho num risco. Tudo aqui é navegar ou escrever.
 *
 * PURO: roda no node cru.
 */

// Extensão `.ts` para o módulo rodar em node cru — o mesmo arranjo de
// `lib/audit-report.ts` e `parse-filename.ts`.
import { INTENCOES_SO_DE_LINK, PARTIDAS } from "./partidas.ts";

export interface AcaoDaPaleta {
  id: string;
  rotulo: string;
  /** Cabeçalho da seção na lista. */
  grupo: "Começar" | "Ir para" | "Onde fica";
  /** Palavras que também encontram esta ação, além do rótulo. */
  sinonimos?: readonly string[];
  /** Navegar para cá. Ausente nas partidas, que escrevem no composer. */
  href?: string;
  /** Escrever esta frase no composer (as partidas). */
  frase?: string;
  /**
   * O QUE PRECISA EXISTIR ANTES (G02). Dito na própria linha da paleta: quem
   * procura "anexo" fica sabendo que é dentro de um grupo de volume, e não
   * descobre isso depois de clicar.
   */
  requisito?: string;
}

/** minúsculas, sem acento — "conferencia" tem de achar "Conferir as folhas". */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export const ACOES_DA_PALETA: readonly AcaoDaPaleta[] = [
  /*
   * AS PARTIDAS VÊM DA MESMA LISTA que os chips da entrada. Se a paleta
   * tivesse a sua cópia, o mesmo comando pediria coisas diferentes conforme o
   * caminho por onde a pessoa chegou.
   */
  ...PARTIDAS.map((p) => ({
    id: `partida:${p.id}`,
    rotulo: p.rotulo,
    grupo: "Começar" as const,
    frase: p.frase,
    sinonimos: [p.frase],
  })),
  // "Ir para": os destinos da navegação principal (G01), com os mesmos nomes.
  { id: "ir:painel", rotulo: "Painel", grupo: "Ir para", href: "/", sinonimos: ["inicio", "home", "onde parei"] },
  {
    id: "ir:projetos",
    rotulo: "Projetos",
    grupo: "Ir para",
    href: "/projetos",
    sinonimos: ["obras", "arquivados", "arquivar", "reativar"],
  },
  /*
   * A MONTAGEM MANUAL (/volumes) SAIU em 01/10/2026, por decisão do Matheus:
   * montar volume é no Nexo, a partir das pranchas. Os sinônimos antigos
   * ficam, para quem procura pelo nome de antes cair no lugar novo.
   */
  {
    id: "ir:volumes",
    rotulo: "Montar volume",
    grupo: "Ir para",
    href: "/nexo?intencao=montar",
    sinonimos: ["mesa de volumes", "montar volumes com pdfs existentes", "juntar pdf", "ferramentas"],
  },
  {
    id: "ir:achados",
    rotulo: "Achados com você e atribuídos por você",
    grupo: "Ir para",
    href: "/achados",
    sinonimos: ["pendencias", "tarefas", "meus achados"],
  },
  { id: "ir:ajuda", rotulo: "Ajuda e glossário", grupo: "Ir para", href: "/ajuda", sinonimos: ["como funciona", "glossario", "duvida"] },
  /*
   * "ONDE FICA" (G02): funções que só existem DENTRO de uma tela (uma prancha
   * lida, um parecer aberto, um grupo de volume). A paleta não as executa fora
   * de contexto — leva ao lugar e diz o que precisa existir antes. Todas
   * apontam para a seção da Ajuda que explica o caminho.
   */
  // LD e capa escrevem o pedido no chat, como as partidas — mas precisam das
  // pranchas já anexadas, e a linha diz isso antes do clique.
  ...INTENCOES_SO_DE_LINK.map((p) => ({
    id: `partida:${p.id}`,
    rotulo: p.rotulo,
    grupo: "Onde fica" as const,
    frase: p.frase,
    sinonimos: [p.frase, p.id === "ld" ? "lista de documentos" : "capa do volume"],
    requisito: "Precisa das pranchas anexadas na conversa do Nexo.",
  })),
  {
    id: "onde:separatriz",
    rotulo: "Separatriz",
    grupo: "Onde fica",
    href: "/ajuda#separatriz",
    sinonimos: ["separadora", "folha de rosto do grupo"],
    requisito: "Gerada no Nexo com as pranchas, uma por grupo.",
  },
  {
    id: "onde:exportar-volume",
    rotulo: "Exportar volume (PDF ou ZIP)",
    grupo: "Onde fica",
    href: "/nexo?intencao=montar",
    sinonimos: ["exportar", "baixar volume", "gerar pdf", "zip"],
    requisito: "No Nexo, com o volume montado: o ZIP dos editáveis sai antes do PDF do volume.",
  },
  {
    id: "onde:exportar-parecer",
    rotulo: "Parecer da auditoria em PDF",
    grupo: "Onde fica",
    href: "/ajuda#parecer",
    sinonimos: ["exportar", "parecer", "relatorio", "baixar auditoria"],
    requisito: "Com um parecer aberto no Nexo: botão Exportar, no topo.",
  },
  {
    id: "onde:reordenar",
    rotulo: "Reordenar pranchas, grupos e volumes",
    grupo: "Onde fica",
    href: "/nexo?intencao=montar",
    sinonimos: ["reordenar", "ordem", "mover", "subir", "descer"],
    requisito: "No Nexo, com as pranchas lidas: arraste a folha no Mapa do volume.",
  },
  {
    id: "onde:corrigir-carimbo",
    rotulo: "Corrigir o carimbo de uma prancha",
    grupo: "Onde fica",
    href: "/ajuda#carimbo",
    sinonimos: ["corrigir", "numero da prancha", "carimbo", "disciplina"],
    requisito: "No Nexo, com as pranchas lidas: Mapa do volume › folha › corrigir.",
  },
  {
    id: "onde:atribuir",
    rotulo: "Atribuir achados a alguém",
    grupo: "Onde fica",
    href: "/ajuda#atribuir",
    sinonimos: ["atribuir", "enviar achado", "delegar", "responsavel"],
    requisito: "Com um parecer aberto: fila de Achados › Selecionar para atribuir.",
  },
  {
    id: "onde:link-achado",
    rotulo: "Copiar link de um achado",
    grupo: "Onde fica",
    href: "/ajuda#link",
    sinonimos: ["copiar link", "compartilhar achado", "link"],
    requisito: "No detalhe do achado: Mais ações › Copiar link do achado.",
  },
];

/** As ações do admin só entram para quem é admin — atalho não cria permissão. */
export const ACOES_DE_ADMIN: readonly AcaoDaPaleta[] = [
  { id: "ir:admin", rotulo: "Administração", grupo: "Ir para", href: "/admin", sinonimos: ["painel admin"] },
  {
    id: "ir:admin-usage",
    rotulo: "Consumo",
    grupo: "Ir para",
    href: "/admin/usage",
    sinonimos: ["custo", "gasto", "quanto custou"],
  },
  {
    id: "ir:admin-quality",
    rotulo: "Qualidade do motor",
    grupo: "Ir para",
    href: "/admin/quality",
    sinonimos: ["falso positivo", "meta"],
  },
];

/**
 * As ações que casam com o texto — na ordem em que foram declaradas.
 *
 * SEM PONTUAÇÃO DE RELEVÂNCIA. A lista tem menos de dez itens e a ordem é
 * deliberada (começar antes de ir para); um ranking aqui embaralharia uma
 * ordem pensada para ganhar precisão que ninguém pediu num conjunto deste
 * tamanho.
 */
export function filtrarAcoes(
  query: string,
  acoes: readonly AcaoDaPaleta[] = ACOES_DA_PALETA,
): AcaoDaPaleta[] {
  const q = normalizar(query);
  if (!q) return [...acoes];
  return acoes.filter(
    (a) =>
      normalizar(a.rotulo).includes(q) ||
      (a.sinonimos ?? []).some((s) => normalizar(s).includes(q)) ||
      normalizar(a.requisito ?? "").includes(q),
  );
}
