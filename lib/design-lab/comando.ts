/**
 * DADOS DA BARRA DE COMANDO (Início F). Três tipos de coisa se buscam pela
 * mesma barra: tarefas, obras (com as ações de cada uma) e trabalhos recentes.
 * O que não casa com nada vira pergunta ao Nexo.
 */

export type Linha = [rotulo: string, valor: string];

export interface Detalhe {
  titulo: string;
  linhas: Linha[];
  nota?: string;
  /** O que o Enter faz, dito em verbo. */
  enter: string;
}

export interface TarefaCmd {
  id: "auditar" | "ld" | "volume" | "conferir";
  nome: string;
  atalho: string;
  sinonimos: string[];
  detalhe: Detalhe;
}

export const TAREFAS_CMD: TarefaCmd[] = [
  {
    id: "auditar",
    nome: "Auditar um memorial",
    atalho: "Ctrl 1",
    sinonimos: ["auditoria", "memorial", "parecer", "revisar"],
    detalhe: {
      titulo: "Auditar um memorial",
      linhas: [
        ["Precisa de", "memorial descritivo em PDF"],
        ["Confere", "identidade, volumes × quadro, normas, capítulos"],
        ["Tempo", "cerca de 6 min"],
        ["Custo", "R$ 1,80 estimado"],
      ],
      nota: "O Nexo lê a capa e o carimbo e acha a obra sozinho.",
      enter: "Escolher o memorial",
    },
  },
  {
    id: "ld",
    nome: "Gerar LD e capa",
    atalho: "Ctrl 2",
    sinonimos: ["ld", "lista", "documentos", "capa", "carimbo", "selo"],
    detalhe: {
      titulo: "Gerar LD e capa",
      linhas: [
        ["Precisa de", "pranchas em PDF"],
        ["Gera", "lista de documentos, capa da prefeitura, separatrizes"],
        ["Tempo", "cerca de 2 min para 24 folhas"],
        ["Custo", "R$ 0,40 estimado"],
      ],
      nota: "Folhas sem carimbo ficam para você conferir no mapa.",
      enter: "Escolher as pranchas",
    },
  },
  {
    id: "volume",
    nome: "Montar um volume",
    atalho: "Ctrl 3",
    sinonimos: ["volume", "montar", "tomo", "exportar", "zip"],
    detalhe: {
      titulo: "Montar um volume",
      linhas: [
        ["Precisa de", "capas, LDs, pranchas e anexos prontos"],
        ["Faz", "ordena em grupos, confere e exporta PDF ou ZIP"],
        ["Tempo", "segundos"],
        ["Custo", "sem IA, sem custo"],
      ],
      enter: "Abrir a montagem",
    },
  },
  {
    id: "conferir",
    nome: "Conferir as folhas",
    atalho: "Ctrl 4",
    sinonimos: ["conferir", "carimbo", "revisao", "folhas", "pranchas"],
    detalhe: {
      titulo: "Conferir as folhas",
      linhas: [
        ["Precisa de", "pranchas em PDF"],
        ["Confere", "código, disciplina, revisão e obra de cada carimbo"],
        ["Tempo", "cerca de 2 min"],
        ["Custo", "R$ 0,40 estimado"],
      ],
      enter: "Escolher as pranchas",
    },
  },
];

export interface ObraCmd {
  codigo: string;
  nome: string;
  cidade: string;
  documentos: string;
  ultimo: string;
  volume: string;
  acoes: { nome: string; detalhe: string }[];
}

export const OBRAS_CMD: ObraCmd[] = [
  {
    codigo: "117-25",
    nome: "UBS da Rua São Francisco de Assis",
    cidade: "Criciúma",
    documentos: "memorial rev. B (42 p.), 30 pranchas ARQ/EST/HID",
    ultimo: "29/09: não emitir, 2 bloqueios",
    volume: "não montado",
    acoes: [
      { nome: "Auditar o memorial (rev. B)", detalhe: "Usa o memorial guardado. Compara com o parecer de 29/09." },
      { nome: "Ver o parecer de 29/09", detalhe: "Não emitir: 2 bloqueios, 3 decisões técnicas, 4 de texto." },
      { nome: "Gerar LD e capa", detalhe: "Usa as 30 pranchas guardadas." },
      { nome: "Montar o volume", detalhe: "Capa, LD e pranchas já estão no projeto." },
    ],
  },
  {
    codigo: "SIM099-26",
    nome: "Praça da Juventude",
    cidade: "São José",
    documentos: "capa, LD, 24 pranchas",
    ultimo: "sem auditoria",
    volume: "montado ontem, falta exportar",
    acoes: [
      { nome: "Exportar o volume", detalhe: "Volume 1, 64 páginas, conferência sem pendência." },
      { nome: "Abrir a montagem", detalhe: "Continua de onde parou." },
    ],
  },
  {
    codigo: "SIM118-25",
    nome: "Ginásio Municipal do Bairro Cristo Redentor",
    cidade: "Criciúma",
    documentos: "18 pranchas, LD e capa gerados",
    ultimo: "sem auditoria",
    volume: "não montado",
    acoes: [
      { nome: "Montar o volume", detalhe: "LD e capa de 21/09 já estão no projeto." },
      { nome: "Baixar LD e capa", detalhe: "Editáveis em ZIP." },
    ],
  },
  {
    codigo: "063-26",
    nome: "Cancha de Bocha",
    cidade: "Tubarão",
    documentos: "memorial rev. A, 9 pranchas",
    ultimo: "18/09: 1 bloqueio",
    volume: "não montado",
    acoes: [
      { nome: "Gerar LD e capa", detalhe: "Usa as 9 pranchas guardadas." },
      { nome: "Ver o parecer de 18/09", detalhe: "1 bloqueio." },
    ],
  },
  {
    codigo: "SIM031-26",
    nome: "Muro de contenção da Rua Anita Garibaldi",
    cidade: "Tubarão",
    documentos: "memorial rev. C",
    ultimo: "30/07: 1 decisão técnica",
    volume: "—",
    acoes: [{ nome: "Auditar o memorial (rev. C)", detalhe: "Compara com o parecer de 30/07." }],
  },
];

export const RECENTES_CMD = [
  { titulo: "Memorial geral 117-25", tipo: "Auditoria", estado: "2 bloqueios", quando: "há 4 h", obra: "117-25" },
  { titulo: "Volume da Praça da Juventude", tipo: "Volume", estado: "falta exportar", quando: "ontem", obra: "SIM099-26" },
  { titulo: "LD do Ginásio Cristo Redentor", tipo: "LD e capa", estado: "gerados", quando: "21/09", obra: "SIM118-25" },
];

/** Minúsculas e sem acento: "Criciúma" casa com "criciuma". */
export function normal(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
