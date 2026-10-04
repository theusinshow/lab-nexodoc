/**
 * A OBRA 117-25 POR DENTRO, com o que a página do projeto tem hoje: as quatro
 * tarefas (auditoria, LD, capas, volume), os documentos, os arquivos enviados,
 * os artefatos gerados e os eventos.
 */

export type Aba = "documentos" | "arquivos" | "gerados" | "eventos";

export interface Tarefa {
  id: "auditoria" | "ld" | "capas" | "volume";
  nome: string;
  estado: string;
  detalhe: string;
  acao: string;
  tom?: "aviso" | "ok";
}

export const TAREFAS: Tarefa[] = [
  { id: "auditoria", nome: "Auditoria", estado: "6 abertos", detalhe: "9 achados no memorial geral, rev. A, hoje", acao: "Abrir o resultado", tom: "aviso" },
  { id: "ld", nome: "Lista de documentos", estado: "2 tomos", detalhe: "33 folhas, gerada em 29/09", acao: "Ver no mapa" },
  { id: "capas", nome: "Capas", estado: "2 capas", detalhe: "Criciúma, gerada em 29/09", acao: "Ver no mapa" },
  { id: "volume", nome: "Volume", estado: "não montado", detalhe: "412 páginas prontas para juntar", acao: "Montar volume" },
];

export interface Item {
  id: string;
  nome: string;
  tipo: string;
  situacao?: string;
  tom?: "aviso" | "critico";
  tamanho?: string;
  origem?: string;
  quando: string;
  quem?: string;
}

export const DOCUMENTOS: Item[] = [
  { id: "d1", nome: "117_25_md_geral_a.pdf", tipo: "Memorial geral", situacao: "auditado, 9 achados", tom: "aviso", quando: "hoje, 21:08", quem: "Victor" },
  { id: "d2", nome: "117_25_md_hid_a.pdf", tipo: "Memorial hidrossanitário", situacao: "auditado, 4 achados", quando: "22/09", quem: "Carla" },
  { id: "d3", nome: "117_25_md_ele_a.pdf", tipo: "Memorial elétrico", situacao: "não auditado", tom: "critico", quando: "22/09", quem: "Carla" },
  { id: "d4", nome: "117_25_md_est_a.pdf", tipo: "Memorial estrutural", situacao: "auditado, sem achados", quando: "20/09", quem: "Victor" },
  { id: "d5", nome: "117_25_orc_a.xlsx", tipo: "Orçamento", situacao: "só guardado", quando: "18/09", quem: "Rafael" },
];

export const ARQUIVOS: Item[] = [
  { id: "a1", nome: "117_25_md_geral_a.pdf", tipo: "PDF", tamanho: "4,2 MB", origem: "conversa", quando: "hoje, 21:07", quem: "Victor" },
  { id: "a2", nome: "117_25_ARQ_rev-B.pdf", tipo: "PDF", tamanho: "38 MB", origem: "conversa", quando: "27/09", quem: "Victor" },
  { id: "a3", nome: "117_25_EST_rev-A.pdf", tipo: "PDF", tamanho: "21 MB", origem: "conversa", quando: "27/09", quem: "Victor" },
  { id: "a4", nome: "117_25_HID_rev-A.pdf", tipo: "PDF", tamanho: "12 MB", origem: "conversa", quando: "27/09", quem: "Victor" },
  { id: "a5", nome: "117_25_ELE_rev-A.pdf", tipo: "PDF", tamanho: "14 MB", origem: "conversa", quando: "27/09", quem: "Victor" },
  { id: "a6", nome: "117_25_md_hid_a.pdf", tipo: "PDF", tamanho: "1,8 MB", origem: "conversa", quando: "22/09", quem: "Carla" },
  { id: "a7", nome: "117_25_md_ele_a.pdf", tipo: "PDF", tamanho: "2,1 MB", origem: "conversa", quando: "22/09", quem: "Carla" },
  { id: "a8", nome: "117_25_md_est_a.pdf", tipo: "PDF", tamanho: "2,6 MB", origem: "conversa", quando: "20/09", quem: "Victor" },
  { id: "a9", nome: "117_25_orc_a.xlsx", tipo: "Planilha", tamanho: "640 KB", origem: "montar volumes", quando: "18/09", quem: "Rafael" },
];

export const GERADOS: Item[] = [
  { id: "g1", nome: "Parecer_117-25_md-geral_rev-A.pdf", tipo: "Parecer", situacao: "9 achados", quando: "hoje, 21:13", quem: "Nexo" },
  { id: "g2", nome: "LD_117-25_TOMO-01.pdf", tipo: "Lista de documentos", situacao: "20 folhas", quando: "29/09", quem: "Nexo" },
  { id: "g3", nome: "LD_117-25_TOMO-02.pdf", tipo: "Lista de documentos", situacao: "13 folhas", quando: "29/09", quem: "Nexo" },
  { id: "g4", nome: "Capa_117-25_TOMO-01.pdf", tipo: "Capa", situacao: "Criciúma", quando: "29/09", quem: "Nexo" },
  { id: "g5", nome: "Capa_117-25_TOMO-02.pdf", tipo: "Capa", situacao: "Criciúma", quando: "29/09", quem: "Nexo" },
  { id: "g6", nome: "Separatrizes_117-25_TOMO-01.pdf", tipo: "Separatrizes", situacao: "ARQ e EST", quando: "29/09", quem: "Nexo" },
  { id: "g7", nome: "Separatrizes_117-25_TOMO-02.pdf", tipo: "Separatrizes", situacao: "HID e ELE", quando: "29/09", quem: "Nexo" },
];

export const EVENTOS: Item[] = [
  { id: "e1", nome: "Auditou o memorial geral, rev. A", tipo: "auditoria", situacao: "9 achados, 2 com você", tom: "aviso", quando: "hoje, 21:13", quem: "Victor" },
  { id: "e2", nome: "Passou a área coberta para Rafael e a grafia para Jéssica", tipo: "achado", quando: "hoje, 21:21", quem: "Victor" },
  { id: "e3", nome: "Gerou LD, capa e separatrizes dos 2 tomos", tipo: "geração", quando: "29/09, 11:20", quem: "Victor" },
  { id: "e4", nome: "Corrigiu o título da HID-04 à mão", tipo: "folha", quando: "29/09, 11:02", quem: "Victor" },
  { id: "e5", nome: "Leu os selos de 33 pranchas", tipo: "leitura", quando: "27/09, 16:30", quem: "Nexo" },
  { id: "e6", nome: "Auditou o memorial hidrossanitário, rev. A", tipo: "auditoria", situacao: "4 achados", quando: "22/09, 10:15", quem: "Carla" },
  { id: "e7", nome: "Auditou o memorial estrutural, rev. A", tipo: "auditoria", situacao: "sem achados", quando: "20/09, 15:40", quem: "Victor" },
  { id: "e8", nome: "Criou o projeto", tipo: "projeto", quando: "18/09, 09:02", quem: "Rafael" },
];
