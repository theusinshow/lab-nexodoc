/**
 * AS FOLHAS DA 117-25, como o Nexo as leu dos carimbos. Os campos são os do
 * FolhaNode de hoje: título, número/total, arquivo, disciplina, de onde veio o
 * número, se foi corrigida à mão e o que a conferência achou.
 *
 * Os títulos estão como no carimbo (em caixa alta): esta tela existe para
 * conferir o que foi lido, e normalizar o texto esconderia justamente o erro.
 */
import type { Disciplina } from "../resultado-e/dados";

export type OrigemDoNumero = "carimbo" | "nome" | "mao" | "ordem";

export interface Folha {
  id: string;
  disc: Disciplina;
  numero: number | null;
  total: number;
  titulo: string;
  arquivo: string;
  revisao: string;
  paginaNoPdf: number;
  origem: OrigemDoNumero;
  editado?: { campo: string; antes: string };
  divergencia?: { severidade: "critico" | "aviso"; motivo: string };
}

function lote(disc: Disciplina, sigla: string, arquivo: string, titulos: string[], revisao = "B"): Folha[] {
  return titulos.map((titulo, i) => ({
    id: `${sigla}-${String(i + 1).padStart(2, "0")}`,
    disc,
    numero: i + 1,
    total: titulos.length,
    titulo,
    arquivo,
    revisao,
    paginaNoPdf: i + 1,
    origem: "carimbo" as OrigemDoNumero,
  }));
}

const ARQ = lote("arquitetura", "ARQ", "117_25_ARQ_rev-B.pdf", [
  "IMPLANTAÇÃO E SITUAÇÃO",
  "PLANTA BAIXA - LAYOUT",
  "PLANTA BAIXA - COTAS E NÍVEIS",
  "PLANTA DE FORRO",
  "CORTES AA E BB",
  "CORTES CC E DD",
  "FACHADAS NORTE E SUL",
  "FACHADAS LESTE E OESTE",
  "PLANTA DE PISOS E REVESTIMENTOS",
  "DETALHES DOS SANITÁRIOS ACESSÍVEIS - PLANTAS, CORTES, VISTAS AMPLIADAS E PAGINAÇÃO DE REVESTIMENTOS",
  "PLANTA DE COBERTURA",
  "DETALHES DE ESQUADRIAS",
]);
const EST = lote(
  "estrutural",
  "EST",
  "117_25_EST_rev-A.pdf",
  ["LOCAÇÃO E CARGAS", "FÔRMAS DA FUNDAÇÃO", "ARMAÇÃO DAS SAPATAS", "FÔRMAS DO TÉRREO", "ARMAÇÃO DAS VIGAS V1 A V12 - PAVIMENTO TÉRREO E COBERTURA, CORTES E DETALHES DE ANCORAGEM", "ARMAÇÃO DOS PILARES", "FÔRMAS DA COBERTURA", "ESCADA E RESERVATÓRIO SUPERIOR"],
  "A",
);
const HID = lote(
  "hidrossanitario",
  "HID",
  "117_25_HID_rev-A.pdf",
  ["ÁGUA FRIA - PLANTA", "ÁGUA FRIA - ISOMÉTRICOS", "ESGOTO SANITÁRIO - PLANTA", "ESGOTO - DETALHES DAS CAIXAS", "ÁGUAS PLUVIAIS", "RESERVATÓRIO E BARRILETE"],
  "A",
);
const ELE = lote(
  "eletrico",
  "ELE",
  "117_25_ELE_rev-A.pdf",
  ["ENTRADA DE ENERGIA", "ILUMINAÇÃO", "TOMADAS E PONTOS DE FORÇA", "QUADROS E DIAGRAMAS UNIFILARES", "SPDA", "LÓGICA E TELEFONIA", "DETALHES E LEGENDA"],
  "A",
);

// ARQ-03 e ARQ-07 ficaram na revisão A: as outras dez estão em B.
for (const n of [2, 6]) {
  ARQ[n].revisao = "A";
  ARQ[n].divergencia = { severidade: "aviso", motivo: "Revisão A no carimbo; as outras 10 folhas de ARQ estão em B." };
}
// EST-06: o carimbo não tinha número; ele saiu da ordem das páginas.
EST[5].origem = "ordem";
// HID-04: o corte do carimbo levou metade do título; alguém completou à mão.
HID[3].editado = { campo: "Título", antes: "ESGOTO - DETALHES DAS" };
HID[3].origem = "mao";
// ELE-04: o carimbo não pôde ser lido. O título veio do nome do arquivo; o número, de lugar nenhum.
ELE[3].numero = null;
ELE[3].origem = "nome";
ELE[3].divergencia = { severidade: "critico", motivo: "O carimbo não pôde ser lido nesta prancha. O título veio do nome do arquivo e o número está faltando." };

export const FOLHAS: Folha[] = [...ARQ, ...EST, ...HID, ...ELE];

export const ORIGEM_NOME: Record<OrigemDoNumero, string> = {
  carimbo: "lido do carimbo",
  nome: "lido do nome do arquivo",
  mao: "corrigido à mão",
  ordem: "deduzido pela ordem das páginas: ninguém o leu",
};

/** Os documentos que o Nexo gera, e o volume que junta tudo. */
export interface Documento {
  id: string;
  tipo: "capa" | "separatriz" | "ld" | "volume";
  nome: string;
  detalhe: string;
  arquivo?: string;
  estado?: "gerado" | "a-gerar" | "desatualizado";
}

export interface Tomo {
  n: number;
  disciplinas: Disciplina[];
  paginas: number;
}

export const TOMOS: Tomo[] = [
  { n: 1, disciplinas: ["arquitetura", "estrutural"], paginas: 238 },
  { n: 2, disciplinas: ["hidrossanitario", "eletrico"], paginas: 174 },
];

export function documentosDoTomo(t: Tomo): Documento[] {
  const tt = String(t.n).padStart(2, "0");
  return [
    { id: `capa-${t.n}`, tipo: "capa", nome: "Capa", detalhe: `tomo ${tt}, Criciúma`, arquivo: `Capa_117-25_TOMO-${tt}.pdf` },
    { id: `sep-${t.n}`, tipo: "separatriz", nome: "Separatrizes", detalhe: t.disciplinas.length === 2 ? "2 disciplinas" : "", arquivo: `Separatrizes_117-25_TOMO-${tt}.pdf` },
    { id: `ld-${t.n}`, tipo: "ld", nome: "Lista de documentos", detalhe: t.n === 1 ? "20 folhas, 3 p." : "13 folhas, 2 p.", arquivo: `LD_117-25_TOMO-${tt}.pdf` },
  ];
}

/** Gerados antes da divisão em tomos: sobraram, e não entram em volume nenhum. */
export const RESTOS: Documento[] = [
  { id: "capa-unica", tipo: "capa", nome: "Capa", detalhe: "volume único", arquivo: "Capa_117-25.pdf" },
  { id: "ld-unica", tipo: "ld", nome: "Lista de documentos", detalhe: "33 folhas, 4 p.", arquivo: "LD_117-25_rev-A.pdf" },
];
