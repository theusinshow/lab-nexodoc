/*
 * Os achados de exemplo do Resultado: memorial 117-25 (UBS, Criciúma),
 * revisão A. Vocabulário da tela real: impacto em três faixas
 * (components/audit-result.tsx, IMPACT_SECTIONS), desfechos Corrigido /
 * Falso positivo / Decisão técnica, e o veredito de lib/audit-report.ts
 * (avaliarEmissao). A sigla na tela é ACH (lib/rotulo-do-achado.ts).
 */

export type Impacto = "block" | "decide" | "note" | "texto";
export type Desfecho = "corrigido" | "falso-positivo" | "decisao";

export const IMPACTOS: { id: Impacto; nome: string; dica: string }[] = [
  { id: "block", nome: "Bloqueia a emissão", dica: "Corrigir antes de gerar o documento." },
  { id: "decide", nome: "Exige decisão técnica", dica: "Não impede gerar, mas precisa de aceite do responsável antes de executar." },
  { id: "note", nome: "Revisão de texto", dica: "Numeração, unidades, referências cruzadas." },
  // gramática separada da revisão de texto, com cor própria (pedido do Matheus, 30/09)
  { id: "texto", nome: "Gramática", dica: "Ortografia, acentuação, concordância. Não muda decisão técnica." },
];

/**
 * As disciplinas que o sistema reconhece (lib/audit-report.ts,
 * DISCIPLINE_LABELS), com a sigla que a prancha usa e a cor de cada uma. As
 * oito primeiras cores vêm de hoje (app/globals.css, --discipline-*); as quatro
 * últimas não tinham cor e ganharam uma aqui.
 */
export type Disciplina =
  | "arquitetura" | "estrutural" | "hidrossanitario" | "eletrico" | "ppci" | "climatizacao"
  | "terraplenagem" | "paisagismo" | "cabeamento" | "gases_medicinais" | "acessibilidade" | "geral";

export const DISCIPLINAS: { id: Disciplina; nome: string; sigla: string }[] = [
  { id: "arquitetura", nome: "Arquitetura", sigla: "ARQ" },
  { id: "estrutural", nome: "Estrutural", sigla: "EST" },
  { id: "hidrossanitario", nome: "Hidrossanitário", sigla: "HID" },
  { id: "eletrico", nome: "Elétrico", sigla: "ELE" },
  { id: "ppci", nome: "PPCI / Incêndio", sigla: "PCI" },
  { id: "climatizacao", nome: "Climatização", sigla: "CLI" },
  { id: "terraplenagem", nome: "Terraplenagem / Urbanização", sigla: "TER" },
  { id: "paisagismo", nome: "Paisagismo", sigla: "PAI" },
  { id: "cabeamento", nome: "Cabeamento / CFTV", sigla: "CAB" },
  { id: "gases_medicinais", nome: "Gases medicinais", sigla: "GAS" },
  { id: "acessibilidade", nome: "Acessibilidade", sigla: "ACE" },
  { id: "geral", nome: "Geral / Documental", sigla: "GER" },
];
export const DISCIPLINA = Object.fromEntries(DISCIPLINAS.map((d) => [d.id, d])) as Record<Disciplina, (typeof DISCIPLINAS)[number]>;

/** Os tipos de erro (lib/audit-report.ts, ERROR_TYPE_LABELS). */
export type TipoDeErro = "identidade" | "escopo" | "norma" | "quantitativo" | "especificacao" | "editorial" | "tecnico";
export const TIPOS_DE_ERRO: { id: TipoDeErro; nome: string }[] = [
  { id: "identidade", nome: "Identidade / documental" },
  { id: "escopo", nome: "Escopo / contratual" },
  { id: "norma", nome: "Norma" },
  { id: "quantitativo", nome: "Quantitativo" },
  { id: "especificacao", nome: "Especificação / material" },
  { id: "editorial", nome: "Redação / editorial" },
  { id: "tecnico", nome: "Técnico (geral)" },
];

export const DESFECHO_NOME: Record<Desfecho, string> = {
  corrigido: "Corrigido",
  "falso-positivo": "Falso positivo",
  decisao: "Decisão técnica",
};

export interface Achado {
  id: string;
  impacto: Impacto;
  disc: Disciplina;
  tipo: TipoDeErro;
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
    disc: "geral",
    tipo: "identidade",
    disciplina: "Geral / Documental",
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
    disc: "estrutural",
    tipo: "quantitativo",
    disciplina: "Estrutural",
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
    disc: "arquitetura",
    tipo: "quantitativo",
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
    disc: "hidrossanitario",
    tipo: "norma",
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
    disc: "eletrico",
    tipo: "tecnico",
    disciplina: "Elétrico",
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
    disc: "geral",
    tipo: "editorial",
    disciplina: "Geral / Documental",
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
    impacto: "texto",
    disc: "eletrico",
    tipo: "editorial",
    disciplina: "Elétrico",
    titulo: "Concordância: “os quadro de distribuição”",
    pagina: 27,
    origem: "ia",
    responsavel: "Victor",
    errado: "O cap. 8 escreve “os quadro de distribuição” duas vezes.",
    importa: "Só apresentação, mas é o tipo de erro que a prefeitura aponta primeiro.",
    fazer: "Trocar por “os quadros de distribuição”.",
    evidencia: { trecho: "…sendo que os quadro de distribuição deverão ficar em local ventilado…", marca: "os quadro" },
    desfecho: { tipo: "corrigido", por: "Victor", quando: "hoje, 21:42" },
  },
  {
    id: "ACH-008",
    impacto: "texto",
    disc: "geral",
    tipo: "editorial",
    disciplina: "Geral / Documental",
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
    disc: "arquitetura",
    tipo: "editorial",
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
