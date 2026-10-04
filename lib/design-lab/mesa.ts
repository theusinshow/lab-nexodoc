/**
 * DADOS DA MESA (Início E). Cada documento é uma folha com o que o Nexo leu
 * dela: tipo, disciplina, código do carimbo e a obra a que pertence. As pilhas
 * nascem do agrupamento — memorial, capa, LD e pranchas por disciplina — e é
 * delas que as ações dependem.
 */

export type TipoDeFolha = "memorial" | "capa" | "ld" | "prancha";
export type Disciplina = "arq" | "est" | "hid";

export interface Folha {
  id: string;
  tipo: TipoDeFolha;
  disciplina?: Disciplina;
  codigo: string;
  titulo: string;
  obra: string;
  semCarimbo?: boolean;
}

const ARQ = [
  "Planta de implantação",
  "Planta baixa, térreo",
  "Planta baixa, cobertura",
  "Cortes AA e BB",
  "Cortes CC e DD",
  "Fachadas norte e sul",
  "Fachadas leste e oeste",
  "Planta de layout",
  "Planta de forro",
  "Detalhe dos sanitários",
  "Detalhe da recepção",
  "Esquadrias",
  "Paginação de piso",
  "Detalhe de acessibilidade",
];
const EST = ["Locação de estacas", "Formas do baldrame", "Armação do baldrame", "Formas da cobertura", "Pilares", "Vigas do térreo", "Laje de cobertura", "Escada", "Reservatório", "Detalhes gerais"];
const HID = ["Água fria, térreo", "Esgoto, térreo", "Águas pluviais", "Isométricos", "Reservatório e barrilete", "Detalhes"];

const OBRA = "117-25";

export const FOLHAS: Folha[] = [
  { id: "m1", tipo: "memorial", codigo: "117-25-MD", titulo: "Memorial descritivo geral", obra: OBRA },
  { id: "c1", tipo: "capa", codigo: "117-25-CP", titulo: "Capa do volume", obra: OBRA },
  { id: "l1", tipo: "ld", codigo: "117-25-LD", titulo: "Lista de documentos", obra: OBRA },
  ...ARQ.map((t, i) => ({ id: `a${i + 1}`, tipo: "prancha" as const, disciplina: "arq" as const, codigo: `ARQ-${String(i + 1).padStart(2, "0")}`, titulo: t, obra: OBRA, semCarimbo: i === 11 })),
  ...EST.map((t, i) => ({ id: `e${i + 1}`, tipo: "prancha" as const, disciplina: "est" as const, codigo: `EST-${String(i + 1).padStart(2, "0")}`, titulo: t, obra: OBRA })),
  ...HID.map((t, i) => ({ id: `h${i + 1}`, tipo: "prancha" as const, disciplina: "hid" as const, codigo: `HID-${String(i + 1).padStart(2, "0")}`, titulo: t, obra: OBRA })),
];

/** Três folhas de OUTRA obra, para a situação "obras misturadas". */
export const INTRUSAS: Folha[] = [
  { id: "x1", tipo: "prancha", disciplina: "est", codigo: "EST-01", titulo: "Locação de estacas", obra: "SIM099-26" },
  { id: "x2", tipo: "prancha", disciplina: "est", codigo: "EST-02", titulo: "Formas do baldrame", obra: "SIM099-26" },
  { id: "x3", tipo: "prancha", disciplina: "est", codigo: "EST-03", titulo: "Pilares", obra: "SIM099-26" },
];

export interface Pilha {
  id: string;
  nome: string;
  tipo: TipoDeFolha;
  disciplina?: Disciplina;
  obra: string;
  folhas: Folha[];
}

const NOME_DA_DISCIPLINA: Record<Disciplina, string> = { arq: "Arquitetura", est: "Estrutura", hid: "Hidrossanitário" };

/** Agrupa as folhas em pilhas, na ordem em que um volume as leria. */
export function empilhar(folhas: Folha[]): Pilha[] {
  const pilhas: Pilha[] = [];
  const add = (id: string, nome: string, tipo: TipoDeFolha, obra: string, fs: Folha[], disciplina?: Disciplina) => {
    if (fs.length) pilhas.push({ id, nome, tipo, obra, folhas: fs, disciplina });
  };
  const obras = [...new Set(folhas.map((f) => f.obra))];
  for (const obra of obras) {
    const da = folhas.filter((f) => f.obra === obra);
    const sufixo = obras.length > 1 ? `-${obra}` : "";
    add(`memorial${sufixo}`, "Memorial", "memorial", obra, da.filter((f) => f.tipo === "memorial"));
    add(`capa${sufixo}`, "Capa", "capa", obra, da.filter((f) => f.tipo === "capa"));
    add(`ld${sufixo}`, "LD", "ld", obra, da.filter((f) => f.tipo === "ld"));
    for (const d of ["arq", "est", "hid"] as Disciplina[]) {
      add(`${d}${sufixo}`, NOME_DA_DISCIPLINA[d], "prancha", obra, da.filter((f) => f.tipo === "prancha" && f.disciplina === d), d);
    }
  }
  return pilhas;
}

export const MESAS_ANTERIORES = [
  { obra: "SIM099-26", cidade: "São José", resumo: "Volume montado, falta exportar", quando: "ontem" },
  { obra: "SIM118-25", cidade: "Criciúma", resumo: "LD e capa gerados", quando: "21/09" },
  { obra: "063-26", cidade: "Tubarão", resumo: "Auditoria com 1 bloqueio", quando: "18/09" },
];
