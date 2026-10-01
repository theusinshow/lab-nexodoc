/**
 * A MESA DE MONTAR VOLUMES com PDFs prontos (modules/volume-builder), com os
 * campos e as frases de hoje: tipo escolhido antes de importar, fila, dados do
 * volume, destino, grupos (separatriz automática ou PDF próprio, LD, pranchas,
 * anexos), pendências do validador e a pré-montagem com IA, que é opcional.
 */
import { FOLHAS, type Folha } from "../mapa/dados";

export type TipoDoArquivo = "cover" | "ld" | "separator" | "document" | "appendix";
export const TIPOS: { id: TipoDoArquivo; nome: string; um: string }[] = [
  { id: "cover", nome: "Capas", um: "Capa" },
  { id: "ld", nome: "LDs", um: "LD" },
  { id: "separator", nome: "Separatrizes", um: "Separatriz" },
  { id: "document", nome: "Pranchas", um: "Prancha" },
  { id: "appendix", nome: "Anexos", um: "Anexo" },
];

export interface Arquivo {
  id: string;
  nome: string;
  tipo: TipoDoArquivo;
  paginas: number;
  folhas?: Folha[];
  /** Em quantas páginas este arquivo já está na montagem. */
  usadas: number;
}

export const ARQUIVOS: Arquivo[] = [
  { id: "f1", nome: "Capa_117-25_TOMO-01.pdf", tipo: "cover", paginas: 1, usadas: 1 },
  { id: "f2", nome: "LD_117-25_TOMO-01.pdf", tipo: "ld", paginas: 3, usadas: 3 },
  { id: "f3", nome: "117_25_ARQ_rev-B.pdf", tipo: "document", paginas: 12, folhas: FOLHAS.filter((f) => f.disc === "arquitetura"), usadas: 12 },
  { id: "f4", nome: "117_25_EST_rev-A.pdf", tipo: "document", paginas: 8, folhas: FOLHAS.filter((f) => f.disc === "estrutural"), usadas: 8 },
  { id: "f5", nome: "LD_117-25_EST.pdf", tipo: "ld", paginas: 2, usadas: 0 },
];

export type EstadoNaFila = "lendo" | "duplicado" | "recusado" | "ilegivel";
export const FILA: { nome: string; estado: EstadoNaFila; mensagem: string }[] = [
  { nome: "117_25_HID_rev-A.pdf", estado: "lendo", mensagem: "lendo o PDF…" },
  { nome: "117_25_ARQ_rev-B (1).pdf", estado: "duplicado", mensagem: "Já importado (117_25_ARQ_rev-B.pdf). Não entrou de novo." },
  { nome: "117_25_orc_a.xlsx", estado: "recusado", mensagem: "Tipo não aceito: só PDF." },
];

export const DADOS = {
  projectCode: "117-25",
  projectName: "UBS da Rua São Francisco de Assis",
  client: "Prefeitura Municipal de Criciúma",
  city: "Criciúma",
  volume: "1",
  tomo: "01",
  revision: "A",
  date: "2026-09",
};

export interface Grupo {
  id: string;
  titulo: string;
  codigo: string;
  separatriz: { automatica: true; titulo: string } | { automatica: false; arquivo: string };
  ld?: { arquivo: string; paginas: string };
  pranchas: { arquivo: string; folhas: Folha[] };
  anexos: string[];
}

export const VOLUME = {
  titulo: "Arquitetura e estrutura",
  arquivoFinal: "117_25_vol_1_tomo_01.pdf",
  capa: "Capa_117-25_TOMO-01.pdf, p. 1",
  grupos: [
    {
      id: "g1",
      titulo: "Arquitetura",
      codigo: "ARQ",
      separatriz: { automatica: true, titulo: "PROJETO DE ARQUITETURA" },
      ld: { arquivo: "LD_117-25_TOMO-01.pdf", paginas: "p. 1–3" },
      pranchas: { arquivo: "117_25_ARQ_rev-B.pdf", folhas: FOLHAS.filter((f) => f.disc === "arquitetura") },
      anexos: [],
    },
    {
      id: "g2",
      titulo: "Estrutural",
      codigo: "EST",
      separatriz: { automatica: true, titulo: "PROJETO DE ESTRUTURAS" },
      pranchas: { arquivo: "117_25_EST_rev-A.pdf", folhas: FOLHAS.filter((f) => f.disc === "estrutural") },
      anexos: [],
    },
  ] as Grupo[],
};

/** As pendências, com as frases do validador da mesa (volume-rules/mesa.ts). */
export const PENDENCIAS: { id: string; gravidade: "bloqueio" | "aviso"; texto: string }[] = [{ id: "p1", gravidade: "aviso", texto: "Volume 01 › Grupo 2 (Estrutural): sem LD." }];
