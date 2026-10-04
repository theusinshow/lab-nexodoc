/**
 * O HISTÓRICO DE EXEMPLO. Cada campo diz de onde viria no app — a regra de
 * 02/10/2026: o lab não desenha dado que o backend não tem sem dizer isso.
 *
 *   JÁ VEM do resumo das conversas (`/api/nexo/conversas/resumo`):
 *     código e município da obra, título, tipo, quando, auditoria rodando,
 *     número de folhas, os documentos gerados (que tipos; contar cada um e
 *     dizer de que disciplinas são sai dos mesmos resultados e dos carimbos).
 *   PRECISA VIR (barato, do mesmo SELECT):
 *     nome da obra (`Project.name`), o veredito e quantos achados faltam tratar
 *     (o parecer da conversa + `AuditFeedback`), quantos tomos e se o volume
 *     ficou velho (os resultados da conversa).
 */

export type Veredito = "nao-emitir" | "revisar" | "liberado" | "parcial";

export type Estado =
  | { tipo: "auditando"; etapa: string; desde: string }
  | { tipo: "auditoria"; veredito: Veredito; aTratar: number; total: number; revisao: string }
  | { tipo: "volume"; tomos: number; folhas: number; disciplinas: string[]; velho?: string }
  /**
   * O que foi gerado, CONTADO: uma capa por tomo e, por disciplina, uma LD e uma
   * separatriz (o volume de várias disciplinas tem um bloco de cada). Sondagem
   * não tem LD, então os números não precisam bater.
   */
  | { tipo: "documentos"; capas: number; lds: number; separatrizes: number; disciplinas: string[]; folhas: number }
  | { tipo: "conversa" };

export interface Conversa {
  id: string;
  titulo: string;
  quando: string;
  /** Para agrupar por recência. */
  dia: "hoje" | "semana" | "antes";
  estado: Estado;
}

export interface Obra {
  codigo: string;
  nome: string;
  municipio: string;
  /** Projeto de exemplo ou de teste: vai para o grupo recolhido do fim. */
  exemplo?: boolean;
  conversas: Conversa[];
}

export const OBRAS: Obra[] = [
  {
    codigo: "063-26",
    nome: "Centro Comunitário Primeira Linha",
    municipio: "Criciúma",
    conversas: [
      { id: "c1", titulo: "Auditar o memorial geral", quando: "agora", dia: "hoje", estado: { tipo: "auditando", etapa: "Lendo o documento", desde: "2:14" } },
    ],
  },
  {
    codigo: "017-26",
    nome: "Escola Municipal Vila Nova",
    municipio: "Criciúma",
    conversas: [
      { id: "c2", titulo: "Montar o volume 6, estrutural", quando: "14:02", dia: "hoje", estado: { tipo: "volume", tomos: 3, folhas: 30, disciplinas: ["FND", "EST"] } },
      { id: "c3", titulo: "Auditar o memorial geral", quando: "11:40", dia: "hoje", estado: { tipo: "auditoria", veredito: "nao-emitir", aTratar: 8, total: 53, revisao: "C" } },
    ],
  },
  {
    codigo: "117-25",
    nome: "UBS da Rua São Francisco de Assis",
    municipio: "Criciúma",
    conversas: [
      { id: "c4", titulo: "Auditar o memorial geral", quando: "11:16", dia: "hoje", estado: { tipo: "auditoria", veredito: "revisar", aTratar: 3, total: 9, revisao: "B" } },
      { id: "c5", titulo: "LD, capa e separatrizes", quando: "29/09", dia: "semana", estado: { tipo: "volume", tomos: 2, folhas: 33, disciplinas: ["ARQ", "EST", "HID", "ELE"], velho: "a LD do tomo 01 mudou" } },
    ],
  },
  {
    codigo: "040-26",
    nome: "Ginásio do Bairro Efapi",
    municipio: "Chapecó",
    conversas: [
      { id: "c6", titulo: "Auditar o memorial de incêndio", quando: "ter", dia: "semana", estado: { tipo: "auditoria", veredito: "liberado", aTratar: 0, total: 2, revisao: "A" } },
      { id: "c7", titulo: "Capa e LD do volume 10", quando: "ter", dia: "semana", estado: { tipo: "documentos", capas: 1, lds: 3, separatrizes: 3, disciplinas: ["HID", "PCI", "SPD"], folhas: 20 } },
    ],
  },
  {
    codigo: "031-26",
    nome: "Praça da Matriz",
    municipio: "Urubici",
    conversas: [{ id: "c8", titulo: "Dúvida sobre o carimbo", quando: "ter", dia: "semana", estado: { tipo: "conversa" } }],
  },
  {
    codigo: "084-25",
    nome: "EMEB Reforma e Adequação",
    municipio: "Criciúma",
    conversas: [
      { id: "c9", titulo: "Auditar o memorial geral", quando: "18/09", dia: "antes", estado: { tipo: "auditoria", veredito: "parcial", aTratar: 12, total: 12, revisao: "A" } },
    ],
  },
  {
    codigo: "999-26",
    nome: "Escola de exemplo",
    municipio: "Cidade Fictícia",
    exemplo: true,
    conversas: [
      { id: "e1", titulo: "Projeto de exemplo", quando: "13:48", dia: "hoje", estado: { tipo: "auditoria", veredito: "nao-emitir", aTratar: 5, total: 5, revisao: "A" } },
      { id: "e2", titulo: "LD de exemplo", quando: "ter", dia: "semana", estado: { tipo: "documentos", capas: 0, lds: 1, separatrizes: 0, disciplinas: ["ARQ"], folhas: 3 } },
    ],
  },
  {
    codigo: "SIM077-26",
    nome: "Simulação da bateria",
    municipio: "Tubarão",
    exemplo: true,
    conversas: [{ id: "e3", titulo: "Auditar o memorial (simulado)", quando: "04/09", dia: "antes", estado: { tipo: "auditoria", veredito: "revisar", aTratar: 2, total: 4, revisao: "A" } }],
  },
  {
    codigo: "SIM088-25",
    nome: "Simulação da bateria",
    municipio: "Chapecó",
    exemplo: true,
    conversas: [{ id: "e4", titulo: "Auditar o memorial (simulado)", quando: "03/09", dia: "antes", estado: { tipo: "auditoria", veredito: "liberado", aTratar: 0, total: 1, revisao: "A" } }],
  },
];
