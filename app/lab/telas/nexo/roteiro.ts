import { FOLHAS, TOMOS, type Tomo } from "../mapa/dados";
import type { EstadoDoDoc } from "../mapa/documentos";

export type SituacaoNexo = "soltou" | "lido" | "dividido" | "tirou" | "gerando" | "montado" | "desatualizado";

/*
 * O ROTEIRO de cada situação: o palco e o chat andam no MESMO relógio. Cada
 * batida diz, a partir de quando (em segundos), como o mapa está e para onde a
 * câmera olha. O chat lê o mesmo número de batida para saber o que já disse.
 * Assim "dividi em 2 tomos" aparece no exato instante em que as folhas
 * começam a descer para a segunda fileira.
 */

export interface Quadro {
  tomos: Tomo[];
  /** Antes de soltar os PDFs: o palco espera vazio. */
  vazio?: boolean;
  /** Lendo os selos: as folhas acendem uma a uma, e a câmera acompanha a leitura. */
  lendo?: boolean;
  destaque?: Set<string>;
  removidas?: Set<string>;
  sem?: Set<string>;
  /** A divisão proposta: o traço entra antes desta folha. */
  corte?: string;
  /** As marcas de conferir pulsam uma vez. */
  pingar?: boolean;
  docs: (id: string) => EstadoDoDoc;
  vol: (n: number) => EstadoDoDoc;
  estado: string;
  /** O trecho que a câmera enquadra; sem foco, o volume inteiro. */
  foco?: string[];
}

export type Batida = { em: number } & Partial<Quadro>;

const UM_TOMO: Tomo[] = [{ n: 1, disciplinas: ["arquitetura", "estrutural", "hidrossanitario", "eletrico"], paginas: 412 }];
export const DO_TOMO_2 = new Set(FOLHAS.filter((f) => f.disc === "hidrossanitario" || f.disc === "eletrico").map((f) => f.id));
const ARQ_12 = new Set(["ARQ-12"]);

const aGerar = () => "a-gerar" as const;
const gerado = () => "gerado" as const;
const so = (prontos: string[]) => (id: string): EstadoDoDoc => (prontos.includes(id) ? "gerado" : "a-gerar");

const INICIO = ["rot-1", "capa-1", "sep-1", "ld-1", "ARQ-01", "ARQ-02", "ARQ-03", "ARQ-04"];
const DOIS = ["rot-1", "rot-2", "capa-1", "capa-2", "sep-2", "ld-2", "HID-01", "HID-02", "HID-03"];
const FRONTEIRA = ["EST-06", "EST-07", "EST-08", "corte", "HID-01", "HID-02", "HID-03"];
const RISCO = ["ARQ-10", "ARQ-11", "ARQ-12", "EST-01", "EST-02"];
const FIM_1 = ["EST-05", "EST-06", "EST-07", "EST-08", "vol-1"];
const FIM_2 = ["ELE-04", "ELE-05", "ELE-06", "ELE-07", "vol-2"];

export const ROTEIROS: Record<SituacaoNexo, { base: Quadro; batidas: Batida[] }> = {
  soltou: {
    base: { tomos: UM_TOMO, vazio: true, docs: aGerar, vol: aGerar, estado: "recebendo 4 PDFs", foco: INICIO },
    batidas: [{ em: 1.1, vazio: false, lendo: true }],
  },
  lido: {
    base: { tomos: UM_TOMO, docs: aGerar, vol: aGerar, estado: "33 folhas lidas" },
    batidas: [
      { em: 0.9, pingar: true, estado: "4 folhas para conferir" },
      { em: 2.8, corte: "HID-01", foco: FRONTEIRA, estado: "proposta: 2 tomos" },
    ],
  },
  dividido: {
    base: { tomos: UM_TOMO, corte: "HID-01", docs: aGerar, vol: aGerar, estado: "proposta: 2 tomos" },
    batidas: [
      { em: 1.2, tomos: TOMOS, corte: undefined, destaque: DO_TOMO_2, estado: "2 tomos" },
      { em: 3.2, foco: DOIS },
    ],
  },
  tirou: {
    base: { tomos: TOMOS, docs: aGerar, vol: aGerar, estado: "2 tomos, 33 folhas", foco: RISCO },
    batidas: [{ em: 1.1, removidas: ARQ_12, estado: "2 tomos, 32 folhas" }],
  },
  gerando: {
    base: { tomos: TOMOS, removidas: ARQ_12, docs: aGerar, vol: aGerar, estado: "2 tomos, 32 folhas", foco: RISCO },
    batidas: [
      { em: 0.8, removidas: undefined, sem: ARQ_12, estado: "a ARQ-12 saiu" },
      { em: 2.1, foco: DOIS, estado: "gerando" },
      { em: 3.0, docs: so(["ld-1", "ld-2"]), destaque: new Set(["ld-1", "ld-2"]) },
      { em: 4.8, docs: so(["ld-1", "ld-2", "capa-1", "capa-2"]), destaque: new Set(["ld-1", "ld-2", "capa-1", "capa-2"]) },
      { em: 6.6, docs: gerado, destaque: new Set(["ld-1", "ld-2", "capa-1", "capa-2", "sep-1", "sep-2"]), estado: "LD, capas e separatrizes gerados" },
    ],
  },
  montado: {
    base: { tomos: TOMOS, sem: ARQ_12, docs: gerado, vol: aGerar, estado: "pronto para montar", foco: FIM_1 },
    batidas: [
      { em: 1.0, vol: (n) => (n === 1 ? "gerado" : "a-gerar"), destaque: new Set(["vol-1"]), estado: "montando o tomo 01" },
      { em: 2.8, foco: FIM_2, estado: "montando o tomo 02" },
      { em: 3.7, vol: gerado, destaque: new Set(["vol-1", "vol-2"]), estado: "2 volumes montados" },
    ],
  },
  desatualizado: {
    base: { tomos: TOMOS, sem: ARQ_12, docs: gerado, vol: gerado, estado: "2 volumes montados", foco: INICIO },
    batidas: [
      { em: 1.1, docs: (id) => (id === "ld-1" ? "corrigido" : "gerado"), destaque: new Set(["ld-1"]), estado: "LD do tomo 01 corrigida" },
      { em: 3.0, foco: FIM_1 },
      { em: 3.9, vol: (n) => (n === 1 ? "desatualizado" : "gerado"), destaque: new Set(["ld-1", "vol-1"]), estado: "volume do tomo 01 velho" },
    ],
  },
};

/** O quadro da batida b: a base com as batidas até ela aplicadas por cima. */
export function quadroDa(s: SituacaoNexo, b: number): Quadro {
  const { base, batidas } = ROTEIROS[s];
  let q: Quadro = base;
  for (let i = 0; i < b; i++) {
    const { em: _em, ...mudou } = batidas[i];
    q = { ...q, ...mudou };
  }
  return q;
}

/** Quantas folhas por arquivo: para o chat saber qual PDF está sendo lido. */
export const FAIXAS = [
  { nome: "117_25_ARQ_rev-B.pdf", ate: 12 },
  { nome: "117_25_EST_rev-A.pdf", ate: 20 },
  { nome: "117_25_HID_rev-A.pdf", ate: 26 },
  { nome: "117_25_ELE_rev-A.pdf", ate: 33 },
];

/** Enquanto lê, a câmera fica na frente da leitura: as últimas lidas e a próxima. */
export function focoDaLeitura(lidas: number): string[] | undefined {
  if (lidas >= FOLHAS.length) return undefined;
  const ate = Math.min(FOLHAS.length, Math.max(6, Math.ceil((lidas + 2) / 4) * 4 + 1));
  return FOLHAS.slice(Math.max(0, ate - 6), ate).map((f) => f.id);
}
