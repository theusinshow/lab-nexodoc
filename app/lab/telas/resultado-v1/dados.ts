/*
 * Os achados de exemplo do Resultado: memorial 117-25 (UBS, Criciúma),
 * revisão A. Vocabulário da tela real: impacto em três faixas
 * (components/audit-result.tsx, IMPACT_SECTIONS), desfechos Corrigido /
 * Falso positivo / Decisão técnica, e o veredito de lib/audit-report.ts
 * (avaliarEmissao). A sigla na tela é ACH (lib/rotulo-do-achado.ts).
 */

export type Impacto = "block" | "decide" | "note";
export type Desfecho = "corrigido" | "falso-positivo" | "decisao";

export const IMPACTOS: { id: Impacto; nome: string; dica: string }[] = [
  { id: "block", nome: "Bloqueia a emissão", dica: "Corrigir antes de gerar o documento." },
  { id: "decide", nome: "Exige decisão técnica", dica: "Não impede gerar, mas precisa de aceite do responsável antes de executar." },
  { id: "note", nome: "Revisão de texto", dica: "Não muda decisão técnica." },
];

export const DESFECHO_NOME: Record<Desfecho, string> = {
  corrigido: "Corrigido",
  "falso-positivo": "Falso positivo",
  decisao: "Decisão técnica",
};

export interface Achado {
  id: string;
  impacto: Impacto;
  disciplina: string;
  titulo: string;
  pagina: number;
  origem: "regra" | "ia";
  responsavel: string | null;
  errado: string;
  importa: string;
  fazer: string;
  evidencia: { trecho: string; marca: string };
  comparada?: { onde: string; trecho: string; marca: string };
  desfecho?: { tipo: Desfecho; por: string; quando: string; motivo?: string };
}

export const PESSOAS = [
  { valor: "Victor", rotulo: "Victor (você)" },
  { valor: "Rafael", rotulo: "Rafael" },
  { valor: "Carla", rotulo: "Carla" },
  { valor: "Jéssica", rotulo: "Jéssica" },
];

export const ACHADOS: Achado[] = [
  {
    id: "ACH-001",
    impacto: "block",
    disciplina: "Geral",
    titulo: "Revisão B no carimbo, revisão A na capa",
    pagina: 1,
    origem: "regra",
    responsavel: "Victor",
    errado: "O carimbo das páginas 2 a 42 diz revisão B; a capa diz revisão A.",
    importa: "A prefeitura recebe o documento com duas revisões declaradas e pode devolver sem ler.",
    fazer: "Alinhar a capa com o carimbo (revisão B) ou o carimbo com a capa, conforme a emissão.",
    evidencia: { trecho: "REVISÃO: A — EMISSÃO INICIAL — 12/09/2026", marca: "REVISÃO: A" },
    comparada: { onde: "Carimbo, p. 2", trecho: "REV. B — 24/09/2026 — AJUSTES PREFEITURA", marca: "REV. B" },
  },
  {
    id: "ACH-002",
    impacto: "block",
    disciplina: "Quantitativos",
    titulo: "Volume de concreto diverge entre memorial e quadro",
    pagina: 14,
    origem: "regra",
    responsavel: "Victor",
    errado: "O texto do cap. 3 soma 48,60 m³; o quadro de quantitativos, 46,20 m³.",
    importa: "A licitação sai com o quadro. Se o texto estiver certo, faltam 2,40 m³ no orçamento.",
    fazer: "Refazer a soma dos blocos e vigas baldrame e corrigir o valor que estiver errado.",
    evidencia: { trecho: "…totalizando 48,60 m³ de concreto estrutural fck ≥ 25 MPa para blocos e vigas baldrame…", marca: "48,60 m³" },
    comparada: { onde: "Quadro de quantitativos, p. 31", trecho: "3.2  Concreto fck 25 MPa (blocos e baldrames)  m³  46,20", marca: "46,20" },
  },
  {
    id: "ACH-003",
    impacto: "decide",
    disciplina: "Arquitetura",
    titulo: "Área coberta de 1.240 m² no texto, 1.180 m² no quadro",
    pagina: 9,
    origem: "ia",
    responsavel: "Rafael",
    errado: "O cap. 2 declara 1.240 m² de área coberta; o quadro de áreas, 1.180 m².",
    importa: "A diferença de 60 m² é a marquise da entrada, que pode ou não contar como área coberta.",
    fazer: "Decidir se a marquise entra e registrar o critério; ajustar o número que ficar de fora.",
    evidencia: { trecho: "A edificação possui área coberta total de 1.240 m², distribuída em pavimento único…", marca: "1.240 m²" },
    comparada: { onde: "Quadro de áreas, p. 10", trecho: "ÁREA COBERTA ........ 1.180,00 m²", marca: "1.180,00 m²" },
  },
  {
    id: "ACH-004",
    impacto: "decide",
    disciplina: "Hidrossanitário",
    titulo: "NBR 5626 citada na edição de 1998; a vigente é de 2020",
    pagina: 19,
    origem: "regra",
    responsavel: "Carla",
    errado: "O cap. 6 cita a NBR 5626:1998, substituída pela edição de 2020.",
    importa: "Projetar pela edição antiga pode divergir da vistoria da prefeitura.",
    fazer: "Atualizar a citação e conferir se o dimensionamento muda.",
    evidencia: { trecho: "…conforme prescrições da NBR 5626:1998 — Instalação predial de água fria…", marca: "NBR 5626:1998" },
    desfecho: { tipo: "decisao", por: "Carla", quando: "hoje, 21:31", motivo: "Dimensionamento conferido pela 2020, sem mudança. Só a citação será atualizada na revisão C." },
  },
  {
    id: "ACH-005",
    impacto: "decide",
    disciplina: "Elétrica",
    titulo: "Quadro de cargas sem a reserva de 20% pedida no cap. 8",
    pagina: 22,
    origem: "ia",
    responsavel: null,
    errado: "O cap. 8 pede reserva de 20% nos quadros; o QDG-01 tem 6%.",
    importa: "Sem reserva, a ampliação prevista para 2027 exige troca de quadro.",
    fazer: "Redimensionar o QDG-01 ou registrar a decisão de não reservar.",
    evidencia: { trecho: "Os quadros de distribuição deverão prever reserva mínima de 20% para ampliações futuras.", marca: "reserva mínima de 20%" },
  },
  {
    id: "ACH-006",
    impacto: "note",
    disciplina: "Geral",
    titulo: "Numeração de capítulos pula do 6 para o 8",
    pagina: 27,
    origem: "regra",
    responsavel: "Victor",
    errado: "Depois do cap. 6 vem o cap. 8; não há capítulo 7.",
    importa: "Referências cruzadas ao cap. 7 ficam sem destino.",
    fazer: "Renumerar a partir do cap. 8.",
    evidencia: { trecho: "8. INSTALAÇÕES ELÉTRICAS", marca: "8." },
    desfecho: { tipo: "corrigido", por: "Victor", quando: "hoje, 21:40" },
  },
  {
    id: "ACH-007",
    impacto: "note",
    disciplina: "Geral",
    titulo: "Unidade escrita “m2” em vez de m²",
    pagina: 27,
    origem: "regra",
    responsavel: "Victor",
    errado: "Quatro ocorrências de “m2” no cap. 8.",
    importa: "Só apresentação.",
    fazer: "Trocar por m².",
    evidencia: { trecho: "…área de 32 m2 destinada à central de gás…", marca: "32 m2" },
    desfecho: { tipo: "corrigido", por: "Victor", quando: "hoje, 21:42" },
  },
  {
    id: "ACH-008",
    impacto: "note",
    disciplina: "Geral",
    titulo: "Município grafado “Criciuma”, sem acento",
    pagina: 31,
    origem: "regra",
    responsavel: "Jéssica",
    errado: "O cabeçalho do quadro de quantitativos escreve “Criciuma”.",
    importa: "Só apresentação, mas aparece no documento que vai para a licitação.",
    fazer: "Corrigir para Criciúma.",
    evidencia: { trecho: "PREFEITURA MUNICIPAL DE CRICIUMA — SC", marca: "CRICIUMA" },
  },
  {
    id: "ACH-009",
    impacto: "note",
    disciplina: "Arquitetura",
    titulo: "Tabela de esquadrias sem título",
    pagina: 33,
    origem: "ia",
    responsavel: null,
    errado: "A tabela da p. 33 não tem título nem número.",
    importa: "O texto do cap. 9 remete a “Tabela 4”, que o leitor não acha.",
    fazer: "Numerar e titular a tabela.",
    evidencia: { trecho: "P1  0,90 x 2,10  madeira  12 un.", marca: "P1" },
  },
];

export const PAGINAS_DO_MEMORIAL = 42;

/** Pontos por página, para o mapa: sai dos próprios achados. */
export function pontosPorPagina(achados: Achado[]) {
  const p = Array.from({ length: PAGINAS_DO_MEMORIAL }, () => 0);
  achados.forEach((a) => (p[a.pagina - 1] += 1));
  return p;
}
