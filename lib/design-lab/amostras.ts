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

/* ---------------- Painel B: a fila ---------------- */

export type Faixa = "agora" | "semana" | "espera";
export interface ItemDaFila {
  id: string;
  faixa: Faixa;
  tipo: "achado" | "parado" | "pedido" | "pronto";
  titulo: string;
  obra: string;
  cidade: string;
  gravidade?: "block" | "decide" | "note";
  /** A linha de baixo: por que isto está aqui. */
  porque: string;
  /** A ação que resolve, no próprio item. */
  acao: string;
  evidencia?: { trecho: string; pagina: number };
}

export const FILA: ItemDaFila[] = [
  {
    id: "f1",
    faixa: "agora",
    tipo: "achado",
    gravidade: "block",
    titulo: "Volumes divergentes entre memorial e quadro",
    obra: "117-25",
    cidade: "Criciúma",
    porque: "Bloqueia a emissão, p. 14. Atribuído a você hoje.",
    acao: "Marcar corrigido",
    evidencia: { trecho: "…totalizando 48,60 m³ de concreto estrutural fck ≥ 25 MPa para blocos e vigas baldrame…", pagina: 14 },
  },
  {
    id: "f2",
    faixa: "agora",
    tipo: "achado",
    gravidade: "block",
    titulo: "Revisão B no carimbo, revisão A na capa",
    obra: "117-25",
    cidade: "Criciúma",
    porque: "Bloqueia a emissão, p. 1.",
    acao: "Marcar corrigido",
    evidencia: { trecho: "REVISÃO: A — EMISSÃO INICIAL — 12/09/2026", pagina: 1 },
  },
  {
    id: "f3",
    faixa: "agora",
    tipo: "pedido",
    titulo: "Carla pediu sua decisão técnica",
    obra: "SIM031-26",
    cidade: "Tubarão",
    porque: "“Memorial não cita a sondagem que embasa a contenção.” Espera há 2 dias.",
    acao: "Decidir",
  },
  {
    id: "f4",
    faixa: "semana",
    tipo: "parado",
    titulo: "Muro de contenção da Rua Anita Garibaldi",
    obra: "SIM031-26",
    cidade: "Tubarão",
    porque: "Parado há 61 dias. Falta: auditar de novo depois da correção.",
    acao: "Auditar de novo",
  },
  {
    id: "f5",
    faixa: "semana",
    tipo: "achado",
    gravidade: "decide",
    titulo: "Área coberta de 1.240 m² no texto, 1.180 m² no quadro",
    obra: "SIM047-26",
    cidade: "Criciúma",
    porque: "Exige decisão técnica, p. 9.",
    acao: "Decidir",
    evidencia: { trecho: "…área coberta total de 1.240,00 m², compreendendo quadra e arquibancadas…", pagina: 9 },
  },
  {
    id: "f6",
    faixa: "semana",
    tipo: "parado",
    titulo: "Reforma e ampliação do Pronto Atendimento Municipal",
    obra: "SIM077-26",
    cidade: "Florianópolis",
    porque: "Parado há 32 dias. Falta: capa e LD do volume 2.",
    acao: "Gerar capa e LD",
  },
  {
    id: "f7",
    faixa: "espera",
    tipo: "achado",
    gravidade: "note",
    titulo: "NBR 9050 citada sem ano de edição",
    obra: "SIM047-26",
    cidade: "Criciúma",
    porque: "Revisão de texto, p. 33.",
    acao: "Marcar corrigido",
  },
  {
    id: "f8",
    faixa: "espera",
    tipo: "achado",
    gravidade: "note",
    titulo: "NBR 6118 citada na edição de 2003",
    obra: "SIM118-25",
    cidade: "Criciúma",
    porque: "Revisão de texto, p. 22.",
    acao: "Marcar corrigido",
  },
];

export interface Trabalho {
  id: string;
  oque: string;
  obra: string;
  progresso: number;
  etapa: string;
}

export const EM_ANDAMENTO: Trabalho[] = [
  { id: "t1", oque: "Auditoria do memorial", obra: "117-25", progresso: 58, etapa: "Lendo capítulo a capítulo, bloco 7 de 12" },
  { id: "t2", oque: "LD e capa", obra: "SIM118-25", progresso: 82, etapa: "Lendo os selos, 20 de 24 folhas" },
];

export const DA_EQUIPE = [
  { quem: "Carla", iniciais: "CM", oque: "respondeu no achado", ref: "INC-002", obra: "117-25", quando: "há 12 min" },
  { quem: "Rafael", iniciais: "RB", oque: "montou o volume de", ref: "", obra: "SIM099-26", quando: "há 1 h" },
  { quem: "Gabriela", iniciais: "GL", oque: "encerrou 3 achados em", ref: "", obra: "SIM113-25", quando: "ontem" },
];

/* ---------------- Projetos C: a linha de produção ---------------- */

export const ETAPAS = ["Documentos", "Auditoria", "Correções", "LD e capa", "Volume", "Emitido"] as const;
export type Etapa = (typeof ETAPAS)[number];

export interface ObraNaLinha {
  id: string;
  codigo: string;
  nome: string;
  cidade: string;
  /** Índice da etapa em que a obra está (0..5). 6 = emitida. */
  etapa: number;
  /** O que a segura na etapa atual. */
  trava: string;
  tom: "nexo" | "block" | "decide" | "ok";
  diasNaEtapa: number;
  responsavel: string;
}

export const LINHA: ObraNaLinha[] = [
  { id: "l1", codigo: "117-25", nome: "Unidade Básica de Saúde da Rua São Francisco de Assis", cidade: "Criciúma", etapa: 2, trava: "2 bloqueios com você", tom: "block", diasNaEtapa: 1, responsavel: "VI" },
  { id: "l2", codigo: "SIM031-26", nome: "Muro de contenção da Rua Anita Garibaldi", cidade: "Tubarão", etapa: 2, trava: "1 decisão técnica", tom: "decide", diasNaEtapa: 61, responsavel: "CM" },
  { id: "l3", codigo: "SIM047-26", nome: "Quadra poliesportiva coberta do CAIC", cidade: "Criciúma", etapa: 2, trava: "2 achados abertos", tom: "decide", diasNaEtapa: 43, responsavel: "VI" },
  { id: "l4", codigo: "SIM077-26", nome: "Reforma e ampliação do Pronto Atendimento Municipal", cidade: "Florianópolis", etapa: 3, trava: "Falta capa e LD do volume 2", tom: "decide", diasNaEtapa: 32, responsavel: "RB" },
  { id: "l5", codigo: "SIM118-25", nome: "Ginásio Municipal do Bairro Cristo Redentor", cidade: "Criciúma", etapa: 3, trava: "Nexo gerando a LD", tom: "nexo", diasNaEtapa: 0, responsavel: "GL" },
  { id: "l6", codigo: "SIM113-25", nome: "Ampliação da Escola Municipal Professora Idalina Vieira", cidade: "Chapecó", etapa: 1, trava: "Auditoria em curso", tom: "nexo", diasNaEtapa: 0, responsavel: "GL" },
  { id: "l7", codigo: "SIM099-26", nome: "Praça da Juventude", cidade: "São José", etapa: 4, trava: "Volume montado, falta conferir", tom: "decide", diasNaEtapa: 3, responsavel: "RB" },
  { id: "l8", codigo: "031-26", nome: "Escola Municipal Valdirene Arruda da Cunha Borguezan", cidade: "Urubici", etapa: 6, trava: "Emitido em 17/09", tom: "ok", diasNaEtapa: 12, responsavel: "VI" },
  { id: "l9", codigo: "SIM104-26", nome: "Readequação viária do acesso ao distrito industrial", cidade: "Chapecó", etapa: 0, trava: "Esperando o memorial", tom: "decide", diasNaEtapa: 9, responsavel: "CM" },
  { id: "l10", codigo: "SIM063-26", nome: "Pavimentação da Avenida Centenário", cidade: "Florianópolis", etapa: 5, trava: "Pronto para emitir", tom: "ok", diasNaEtapa: 2, responsavel: "VI" },
];
