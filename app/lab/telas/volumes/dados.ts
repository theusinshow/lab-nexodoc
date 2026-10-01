/**
 * A MESA DE MONTAR VOLUMES com PDFs prontos (modules/volume-builder): arquivos
 * importados, a fila do que está entrando, e a montagem do Volume 01 da
 * 117-25. As pendências usam as frases de volume-rules/mesa.ts.
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
  /** As pranchas lidas deste arquivo, quando ele é de pranchas. */
  folhas?: Folha[];
}

export const ARQUIVOS: Arquivo[] = [
  { id: "f1", nome: "Capa_117-25_TOMO-01.pdf", tipo: "cover", paginas: 1 },
  { id: "f2", nome: "LD_117-25_TOMO-01.pdf", tipo: "ld", paginas: 3 },
  { id: "f3", nome: "117_25_ARQ_rev-B.pdf", tipo: "document", paginas: 12, folhas: FOLHAS.filter((f) => f.disc === "arquitetura") },
  { id: "f4", nome: "117_25_EST_rev-A.pdf", tipo: "document", paginas: 8, folhas: FOLHAS.filter((f) => f.disc === "estrutural") },
  { id: "f5", nome: "117_25_md_geral_a.pdf", tipo: "appendix", paginas: 42 },
];

export type EstadoNaFila = "lendo" | "duplicado" | "recusado" | "ilegivel";
export const FILA: { nome: string; estado: EstadoNaFila; mensagem: string }[] = [
  { nome: "117_25_HID_rev-A.pdf", estado: "lendo", mensagem: "Contando as páginas…" },
  { nome: "117_25_ARQ_rev-B (1).pdf", estado: "duplicado", mensagem: "O mesmo PDF já entrou como 117_25_ARQ_rev-B.pdf." },
  { nome: "117_25_orc_a.xlsx", estado: "recusado", mensagem: "Tipo não aceito: só PDF." },
];

export interface Grupo {
  id: string;
  nome: string;
  codigo: string;
  separatriz: string;
  ld?: { arquivo: string; de: number; ate: number };
  pranchas: { arquivo: string; folhas: Folha[] };
}

export const VOLUME = {
  nome: "Volume 01",
  arquivoFinal: "117-25_VOLUME-01.pdf",
  capa: { arquivo: "Capa_117-25_TOMO-01.pdf" },
  grupos: [
    {
      id: "g1",
      nome: "Arquitetura",
      codigo: "ARQ",
      separatriz: "PROJETO DE ARQUITETURA",
      ld: { arquivo: "LD_117-25_TOMO-01.pdf", de: 1, ate: 3 },
      pranchas: { arquivo: "117_25_ARQ_rev-B.pdf", folhas: FOLHAS.filter((f) => f.disc === "arquitetura") },
    },
    {
      id: "g2",
      nome: "Estrutural",
      codigo: "EST",
      separatriz: "PROJETO DE ESTRUTURAS",
      pranchas: { arquivo: "117_25_EST_rev-A.pdf", folhas: FOLHAS.filter((f) => f.disc === "estrutural") },
    },
  ] as Grupo[],
};

/** As pendências, com as frases do validador da mesa. */
export const PENDENCIAS: { id: string; gravidade: "bloqueio" | "aviso"; texto: string; alvo: string }[] = [{ id: "p1", gravidade: "aviso", texto: "Volume 01 › Estrutural: sem LD.", alvo: "g2" }];
