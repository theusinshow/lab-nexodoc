/*
 * Os dados do Painel "ofício". Os achados em destaque são os do filme aprovado
 * da Entrada (ACH-001 documental e ACH-003 de Arquitetura na 117-25) e outros
 * de Arquitetura e documentais: nenhum achado do estrutural em destaque.
 */

export type Gravidade = "block" | "decide" | "note";

export interface AchadoQueTrava {
  id: string;
  sigla: string;
  gravidade: Gravidade;
  disciplina: "ARQ" | "DOC";
  obra: string;
  documento: string;
  pagina: number;
  oque: string;
  com: string;
  dias: number;
  /** O trecho do documento, com a parte errada entre colchetes. */
  trecho: string;
  /** Contra o quê o trecho foi conferido. */
  contra: string;
}

export const TRAVANDO: AchadoQueTrava[] = [
  {
    id: "a1",
    sigla: "ACH-001",
    gravidade: "block",
    disciplina: "DOC",
    obra: "117-25",
    documento: "Memorial geral, rev. A",
    pagina: 1,
    oque: "Capa em revisão A, carimbo em revisão B",
    com: "VI",
    dias: 0,
    trecho: "REVISÃO: [A] — EMISSÃO INICIAL — 12/09/2026",
    contra: "carimbo das pranchas: REV. B, 26/09/2026",
  },
  {
    id: "a2",
    sigla: "ACH-003",
    gravidade: "decide",
    disciplina: "ARQ",
    obra: "117-25",
    documento: "Memorial geral, rev. A",
    pagina: 9,
    oque: "Área coberta: 1.240 m² no texto, 1.180,00 m² no quadro",
    com: "VI",
    dias: 0,
    trecho: "A edificação possui área coberta total de [1.240 m²], distribuída em pavimento único, com acesso principal pela Rua São Francisco de Assis.",
    contra: "quadro de áreas da p. 10: área coberta total 1.180,00 m²",
  },
  {
    id: "a3",
    sigla: "ACH-012",
    gravidade: "block",
    disciplina: "DOC",
    obra: "SIM077-26",
    documento: "Lista de documentos, vol. 2",
    pagina: 4,
    oque: "ARQ-07 está na LD e não está no volume 2",
    com: "RB",
    dias: 32,
    trecho: "[ARQ-07] · Planta de cobertura · rev. 0 · A1",
    contra: "pranchas anexadas ao volume 2: ARQ-01 a ARQ-06",
  },
  {
    id: "a4",
    sigla: "ACH-007",
    gravidade: "decide",
    disciplina: "ARQ",
    obra: "SIM047-26",
    documento: "Memorial descritivo, rev. B",
    pagina: 12,
    oque: "Memorial cita 4 vestiários, a planta mostra 3",
    com: "VI",
    dias: 43,
    trecho: "O bloco de apoio conta com [quatro vestiários] acessíveis, sanitários e depósito de materiais esportivos.",
    contra: "prancha ARQ-03, planta baixa do bloco de apoio: 3 vestiários",
  },
];

/** Notas de texto: contam, mas não entram na tabela do que trava. */
export const NOTAS_DE_TEXTO = 6;

export const RETOMAR = { obra: "117-25", documento: "Memorial geral", revisao: "A", pagina: 9, paginas: 42, quando: "há 4 h" };

export const EM_CURSO = { oque: "Auditoria do memorial", obra: "117-25", etapa: "Capítulo a capítulo", blocos: 12, lidos: 7, resta: "1:49" };
