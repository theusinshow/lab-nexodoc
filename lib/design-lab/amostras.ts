/**
 * DADOS DE EXEMPLO do /lab — obras, achados e pessoas com a cara das de
 * verdade (códigos SIMxxx-aa, municípios mapeados, disciplinas reais), para que
 * cada tela seja julgada com o conteúdo que ela vai carregar. Texto de mentira
 * esconde problema de layout: nome de obra real tem 90 caracteres.
 */

export interface ProjetoDeExemplo {
  id: string;
  codigo: string;
  nome: string;
  cidade: string;
  achados: number;
  comVoce: number;
  diasParado: number;
  estado: "pendente" | "sem-pendencia" | "volume-montado" | "auditando";
  pessoas?: string[];
  /** O achado que aparece quando a linha se abre. */
  achadoAberto?: { titulo: string; gravidade: "block" | "decide" | "note"; de: string };
}

export const PROJETOS: ProjetoDeExemplo[] = [
  {
    id: "p1",
    codigo: "SIM031-26",
    nome: "Muro de contenção da Rua Anita Garibaldi",
    cidade: "Tubarão",
    achados: 1,
    comVoce: 1,
    diasParado: 61,
    estado: "pendente",
    achadoAberto: { titulo: "Memorial não cita a sondagem que embasa a contenção", gravidade: "decide", de: "Carla" },
  },
  {
    id: "p2",
    codigo: "SIM047-26",
    nome: "Quadra poliesportiva coberta do CAIC",
    cidade: "Criciúma",
    achados: 2,
    comVoce: 2,
    diasParado: 43,
    estado: "pendente",
    achadoAberto: { titulo: "Área coberta de 1.240 m² no texto, 1.180 m² no quadro", gravidade: "block", de: "Rafael" },
  },
  {
    id: "p3",
    codigo: "SIM077-26",
    nome: "Reforma e ampliação do Pronto Atendimento Municipal com anexo de imagem e laboratório de análises clínicas",
    cidade: "Florianópolis",
    achados: 7,
    comVoce: 7,
    diasParado: 32,
    estado: "pendente",
    achadoAberto: { titulo: "Revisão B no carimbo, revisão A na capa", gravidade: "block", de: "Victor" },
  },
  {
    id: "p4",
    codigo: "SIM118-25",
    nome: "Ginásio Municipal do Bairro Cristo Redentor",
    cidade: "Criciúma",
    achados: 1,
    comVoce: 0,
    diasParado: 20,
    estado: "pendente",
    achadoAberto: { titulo: "NBR 6118 citada na edição de 2003", gravidade: "note", de: "Gabriela" },
  },
  { id: "p5", codigo: "031-26", nome: "Escola Municipal Valdirene Arruda da Cunha Borguezan", cidade: "Urubici", achados: 0, comVoce: 0, diasParado: 12, estado: "sem-pendencia" },
  { id: "p6", codigo: "117-25", nome: "Unidade Básica de Saúde da Rua São Francisco de Assis", cidade: "Criciúma", achados: 0, comVoce: 0, diasParado: 15, estado: "sem-pendencia" },
  { id: "p7", codigo: "SIM113-25", nome: "Ampliação da Escola Municipal Professora Idalina Vieira", cidade: "Chapecó", achados: 2, comVoce: 0, diasParado: 8, estado: "pendente", pessoas: ["GL", "RB"] },
  { id: "p8", codigo: "SIM099-26", nome: "Praça da Juventude, só montagem", cidade: "São José", achados: 0, comVoce: 0, diasParado: 22, estado: "volume-montado" },
];

export const ATIVIDADE = [
  { quem: "Você", oque: "auditou", obra: "063-26", quando: "24/09" },
  { quem: "Carla", oque: "encerrou um achado em", obra: "SIM031-26", quando: "23/09" },
  { quem: "Você", oque: "enviou arquivo para", obra: "063-26", quando: "23/09" },
  { quem: "Rafael", oque: "montou o volume de", obra: "SIM099-26", quando: "22/09" },
  { quem: "Gabriela", oque: "gerou a LD de", obra: "SIM118-25", quando: "21/09" },
];

export const GERADOS = [
  { tipo: "Volume", obra: "SIM099-26", nome: "Praça da Juventude, volume 1", quando: "ontem" },
  { tipo: "LD", obra: "SIM118-25", nome: "Lista de documentos, 18 folhas", quando: "21/09" },
  { tipo: "Capa", obra: "031-26", nome: "Capa da prefeitura de Urubici", quando: "17/09" },
];

export const USUARIO = { nome: "Victor", iniciais: "VI", escritorio: "Prosul", papel: "admin" };
