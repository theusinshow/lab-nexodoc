/**
 * AS OBRAS DO ESCRITÓRIO, com os campos que a lista de Projetos tem hoje
 * (ProjectConsoleItem): código, nome, cliente, observações, situação,
 * contagens, atualização, achados abertos e quantos estão com quem lê. O que
 * aconteceu por último vem dos eventos da obra.
 */

export type Situacao = "ACTIVE" | "ARCHIVED";

export interface Obra {
  id: string;
  codigo: string;
  nome: string;
  cliente: string;
  cidade: string;
  observacoes: string;
  situacao: Situacao;
  atualizado: string;
  /** Há quantos dias a obra não muda: ordena "o que esfriou". */
  dias: number;
  contagens: { documentos: number; arquivos: number; artefatos: number; eventos: number };
  pendentes?: number;
  comVoce?: number;
  ultimos: { quando: string; oque: string }[];
}

export const OBRAS: Obra[] = [
  {
    id: "o1",
    codigo: "117-25",
    nome: "Unidade Básica de Saúde da Rua São Francisco de Assis",
    cliente: "Prefeitura Municipal de Criciúma",
    cidade: "Criciúma",
    observacoes: "Projeto executivo, 2 tomos",
    situacao: "ACTIVE",
    atualizado: "30/09, 17:42",
    dias: 1,
    contagens: { documentos: 5, arquivos: 9, artefatos: 7, eventos: 31 },
    pendentes: 14,
    comVoce: 3,
    ultimos: [
      { quando: "hoje, 17:42", oque: "Auditoria do memorial geral, rev. A: 14 achados" },
      { quando: "29/09", oque: "LD, capa e separatrizes dos 2 tomos gerados" },
      { quando: "27/09", oque: "33 pranchas lidas de 4 arquivos" },
    ],
  },
  {
    id: "o2",
    codigo: "SIM031-26",
    nome: "Muro de contenção da Rua Anita Garibaldi",
    cliente: "Prefeitura Municipal de Tubarão",
    cidade: "Tubarão",
    observacoes: "Contenção em gabião, trecho de 180 m",
    situacao: "ACTIVE",
    atualizado: "29/09, 10:05",
    dias: 2,
    contagens: { documentos: 2, arquivos: 4, artefatos: 3, eventos: 12 },
    pendentes: 1,
    ultimos: [
      { quando: "29/09", oque: "1 decisão técnica passada para Carla" },
      { quando: "22/09", oque: "Auditoria do memorial de cálculo: 6 achados" },
    ],
  },
  {
    id: "o3",
    codigo: "SIM047-26",
    nome: "Quadra poliesportiva coberta do CAIC",
    cliente: "Prefeitura Municipal de Criciúma",
    cidade: "Criciúma",
    observacoes: "",
    situacao: "ACTIVE",
    atualizado: "26/09, 16:20",
    dias: 5,
    contagens: { documentos: 3, arquivos: 6, artefatos: 4, eventos: 18 },
    pendentes: 2,
    comVoce: 2,
    ultimos: [
      { quando: "26/09", oque: "2 achados de estrutura atribuídos a você" },
      { quando: "18/09", oque: "Volume montado, 1 tomo, 196 páginas" },
    ],
  },
  {
    id: "o4",
    codigo: "SIM077-26",
    nome: "Reforma e ampliação do Pronto Atendimento Municipal",
    cliente: "Prefeitura Municipal de Florianópolis",
    cidade: "Florianópolis",
    observacoes: "Obra em 3 etapas; volume 2 ainda sem capa",
    situacao: "ACTIVE",
    atualizado: "24/09, 09:12",
    dias: 7,
    contagens: { documentos: 6, arquivos: 14, artefatos: 9, eventos: 40 },
    ultimos: [
      { quando: "24/09", oque: "Volume 1 montado e baixado" },
      { quando: "20/09", oque: "LD do volume 1 corrigida à mão" },
    ],
  },
  {
    id: "o5",
    codigo: "SIM118-25",
    nome: "Ginásio Municipal do Bairro Cristo Redentor",
    cliente: "Prefeitura Municipal de Criciúma",
    cidade: "Criciúma",
    observacoes: "",
    situacao: "ACTIVE",
    atualizado: "23/09, 14:50",
    dias: 8,
    contagens: { documentos: 1, arquivos: 3, artefatos: 0, eventos: 5 },
    ultimos: [{ quando: "23/09", oque: "Memorial enviado, sem auditoria" }],
  },
  {
    id: "o6",
    codigo: "SIM113-25",
    nome: "Ampliação da Escola Municipal Professora Idalina Vieira",
    cliente: "Prefeitura Municipal de Chapecó",
    cidade: "Chapecó",
    observacoes: "Ampliação de 4 salas e refeitório",
    situacao: "ACTIVE",
    atualizado: "19/09, 11:31",
    dias: 12,
    contagens: { documentos: 4, arquivos: 7, artefatos: 5, eventos: 22 },
    pendentes: 2,
    ultimos: [{ quando: "19/09", oque: "2 achados abertos com Rafael" }],
  },
  {
    id: "o7",
    codigo: "SIM099-26",
    nome: "Praça da Juventude",
    cliente: "Prefeitura Municipal de São José",
    cidade: "São José",
    observacoes: "Só montagem de volume",
    situacao: "ACTIVE",
    atualizado: "09/09, 15:02",
    dias: 22,
    contagens: { documentos: 0, arquivos: 11, artefatos: 4, eventos: 9 },
    ultimos: [{ quando: "09/09", oque: "Volume montado, falta conferir" }],
  },
  {
    id: "o8",
    codigo: "SIM104-26",
    nome: "Readequação viária do acesso ao distrito industrial, com drenagem pluvial e sinalização",
    cliente: "Prefeitura Municipal de Chapecó",
    cidade: "Chapecó",
    observacoes: "Esperando o memorial da drenagem",
    situacao: "ACTIVE",
    atualizado: "02/09, 08:40",
    dias: 29,
    contagens: { documentos: 0, arquivos: 0, artefatos: 0, eventos: 1 },
    ultimos: [{ quando: "02/09", oque: "Projeto criado" }],
  },
  {
    id: "o9",
    codigo: "031-26",
    nome: "Escola Municipal Valdirene Arruda da Cunha Borguezan",
    cliente: "Prefeitura Municipal de Urubici",
    cidade: "Urubici",
    observacoes: "Emitido em 17/09",
    situacao: "ARCHIVED",
    atualizado: "17/09, 18:10",
    dias: 14,
    contagens: { documentos: 5, arquivos: 12, artefatos: 8, eventos: 36 },
    ultimos: [{ quando: "17/09", oque: "Projeto arquivado depois da entrega" }],
  },
  {
    id: "o10",
    codigo: "SIM012-25",
    nome: "Centro de Referência de Assistência Social do Bairro Pinheirinho",
    cliente: "Prefeitura Municipal de Criciúma",
    cidade: "Criciúma",
    observacoes: "",
    situacao: "ARCHIVED",
    atualizado: "30/07, 12:00",
    dias: 63,
    contagens: { documentos: 3, arquivos: 8, artefatos: 6, eventos: 21 },
    ultimos: [{ quando: "30/07", oque: "Projeto arquivado" }],
  },
];

/** O que a obra já acumulou, numa linha. Zero não vira "0": some. */
export function resumo(c: Obra["contagens"]): string {
  const p = (n: number, um: string, v: string) => (n ? `${n} ${n === 1 ? um : v}` : "");
  return [p(c.documentos, "documento", "documentos"), p(c.arquivos, "arquivo", "arquivos"), p(c.artefatos, "artefato", "artefatos")].filter(Boolean).join(", ");
}
