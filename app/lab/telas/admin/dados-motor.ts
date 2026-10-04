/*
 * MOTOR, com o que o /api/admin/quality e o /api/admin/config devolvem hoje
 * (components/admin/conteudo/qualidade.tsx e configuracao.tsx,
 * lib/controles-da-plataforma.ts, lib/fluxos-de-ia.ts, lib/meta-de-qualidade.ts).
 * Números são amostra; rótulos, variáveis e frases são os do app.
 */

export const METAS = { falsoPositivoMax: 15, coberturaMin: 40, declaradaEm: "22/09", declaradaPor: "matheus@exemplo.com.br" };

/** Visão geral das auditorias concluídas (o que o painel de qualidade soma). */
export const VISAO = { concluidas: 128, revisadas: 52, confirmados: 311, taxaConfirmacao: 81, falsoPositivo: 13, perdidos: 7, cobertura: 41 };
export const VISAO_AMOSTRA = { concluidas: 9, revisadas: 4, confirmados: 22, taxaConfirmacao: 76, falsoPositivo: 18, perdidos: 1, cobertura: 44 };

/** Semana a semana: a taxa divide pelos achados JULGADOS, não pelos gerados. */
export const SEMANAS = [
  { semana: "28/07", auditorias: 9, achados: 84, fp: 23, cobertura: 22 },
  { semana: "04/08", auditorias: 11, achados: 97, fp: 21, cobertura: 27 },
  { semana: "11/08", auditorias: 12, achados: 104, fp: 19, cobertura: 30 },
  { semana: "18/08", auditorias: 10, achados: 88, fp: 20, cobertura: 33 },
  { semana: "25/08", auditorias: 14, achados: 121, fp: 17, cobertura: 35 },
  { semana: "01/09", auditorias: 13, achados: 110, fp: 16, cobertura: 38 },
  { semana: "08/09", auditorias: 15, achados: 129, fp: 14, cobertura: 41 },
  { semana: "15/09", auditorias: 16, achados: 140, fp: 15, cobertura: 43 },
  { semana: "22/09", auditorias: 14, achados: 118, fp: 12, cobertura: 46 },
  { semana: "29/09", auditorias: 14, achados: 121, fp: 13, cobertura: 44 },
];

export type Grupo = { grupo: string; analises: number; rotuladas: number; achados: number; confirmacao: number; fp: number; gravidade: number; perdidos: number; tempo: string };
export const POR_NIVEL: Grupo[] = [
  { grupo: "Padrão", analises: 96, rotuladas: 38, achados: 702, confirmacao: 83, fp: 11, gravidade: 6, perdidos: 5, tempo: "2 min 48 s" },
  { grupo: "Profundo", analises: 32, rotuladas: 14, achados: 413, confirmacao: 78, fp: 16, gravidade: 7, perdidos: 2, tempo: "6 min 12 s" },
];
export const POR_MODELO: Grupo[] = [
  { grupo: "gpt-5.5", analises: 81, rotuladas: 35, achados: 760, confirmacao: 84, fp: 10, gravidade: 5, perdidos: 3, tempo: "4 min 05 s" },
  { grupo: "gpt-5.5-mini", analises: 41, rotuladas: 15, achados: 317, confirmacao: 76, fp: 19, gravidade: 9, perdidos: 4, tempo: "2 min 10 s" },
  { grupo: "gpt-5.6-luna", analises: 6, rotuladas: 2, achados: 38, confirmacao: 71, fp: 21, gravidade: 8, perdidos: 0, tempo: "3 min 31 s" },
];

export type ControleMotor = { chave: string; rotulo: string; descricao: string; variavel: string; valor: number | null; origem: "banco" | "ambiente" | "padrao"; unidade: string; minimo: number; maximo: number; versao?: boolean };
export const LIMITES: ControleMotor[] = [
  { chave: "vazao.usuario", rotulo: "Auditorias simultâneas por pessoa", descricao: "Contra quem dispara cinco de uma vez. Ninguém acompanha três auditorias ao mesmo tempo de verdade.", variavel: "NEXODOC_MAX_AUDITORIAS_SIMULTANEAS", valor: 2, origem: "banco", unidade: "auditorias", minimo: 1, maximo: 20 },
  { chave: "vazao.global", rotulo: "Auditorias simultâneas no sistema", descricao: "É ESTE que protege a memória: cada auditoria segura um PDF de até 40 MB. A conta vive no processo — com mais de uma instância, cada uma conta a sua.", variavel: "NEXODOC_MAX_AUDITORIAS_SIMULTANEAS_GLOBAL", valor: 6, origem: "ambiente", unidade: "auditorias", minimo: 1, maximo: 50 },
  { chave: "limites.blocosPorArquivo", rotulo: "Blocos lidos por arquivo", descricao: "É COBERTURA: menos blocos, menos documento lido. Entra na versão do auditor, então mexer aqui invalida o reuso das auditorias anteriores.", variavel: "NEXODOC_MAX_CHUNKS_PER_FILE", valor: 60, origem: "ambiente", unidade: "blocos", minimo: 1, maximo: 200, versao: true },
  { chave: "limites.saidaProfundo", rotulo: "Teto de saída do bloco (Profundo)", descricao: "Quanto o modelo pode escrever por bloco. Baixo demais CENSURA achado no meio da frase, e a auditoria fica parcial sem dizer. Entra na versão do auditor.", variavel: "NEXODOC_DEEP_CHUNK_MAX_OUTPUT_TOKENS", valor: 16000, origem: "banco", unidade: "tokens", minimo: 2000, maximo: 100000, versao: true },
  { chave: "limites.concorrencia", rotulo: "Blocos em paralelo", descricao: "Quantos blocos vão ao modelo ao mesmo tempo. Mexe na velocidade e na memória, não no que se acha.", variavel: "NEXODOC_CHUNK_CONCURRENCY", valor: 4, origem: "ambiente", unidade: "blocos", minimo: 1, maximo: 20 },
  { chave: "limites.timeoutMs", rotulo: "Tempo máximo por bloco", descricao: "Quando desistir de um bloco. Baixo demais transforma bloco lento em bloco perdido.", variavel: "NEXODOC_CHUNK_TIMEOUT_MS", valor: null, origem: "padrao", unidade: "ms", minimo: 10000, maximo: 600000 },
];

export type Fluxo = { id: string; rotulo: string; grupo: string; efetivo: string; override?: string; salvoEm?: string; chave: boolean; reservado?: boolean; falha?: { quando: string; categoria: string; mensagem: string } };
const F = (id: string, rotulo: string, grupo: string, efetivo: string, extra: Partial<Fluxo> = {}): Fluxo => ({ id, rotulo, grupo, efetivo, chave: true, ...extra });
export const FLUXOS_DE_IA: Fluxo[] = [
  F("audit", "Auditoria normal de memorial", "Auditoria", "gpt-5.5"),
  F("audit-deep", "Auditoria profunda de memorial", "Auditoria", "gpt-5.5", { override: "gpt-5.5", salvoEm: "18/09 10:22" }),
  F("audit-deep-global", "Auditoria profunda de memorial - leitura global", "Auditoria", "gpt-5.5"),
  F("audit-deep-validacao", "Auditoria profunda de memorial - validação", "Auditoria", "gpt-5.5-mini"),
  F("padrao", "Auditoria padrão", "Auditoria padrão", "gpt-5.5"),
  F("padrao-identidade", "Auditoria padrão - identidade", "Auditoria padrão", "gpt-5.5-mini"),
  F("padrao-global", "Auditoria padrão - leitura global", "Auditoria padrão", "gpt-5.5"),
  F("padrao-blocos", "Auditoria padrão - blocos", "Auditoria padrão", "gpt-5.5", { falha: { quando: "30/09 11:05", categoria: "timeout", mensagem: "Bloco 14 de 22 passou de 90 s" } }),
  F("padrao-comparacao", "Auditoria padrão - comparação entre arquivos", "Auditoria padrão", "gpt-5.5"),
  F("padrao-validacao", "Auditoria padrão - validação", "Auditoria padrão", "gpt-5.5-mini"),
  F("profunda", "Auditoria profunda", "Auditoria profunda", "gpt-5.5"),
  F("profunda-identidade", "Auditoria profunda - identidade", "Auditoria profunda", "gpt-5.5-mini"),
  F("profunda-global", "Auditoria profunda - leitura global", "Auditoria profunda", "gpt-5.5"),
  F("profunda-blocos", "Auditoria profunda - blocos", "Auditoria profunda", "gpt-5.5", { falha: { quando: "29/09 16:41", categoria: "rate-limit", mensagem: "429 do provedor em 3 blocos" } }),
  F("profunda-comparacao", "Auditoria profunda - comparação entre arquivos", "Auditoria profunda", "gpt-5.5"),
  F("profunda-validacao", "Auditoria profunda - validação", "Auditoria profunda", "gpt-5.5-mini"),
  F("audit-chat", "Chat pós-auditoria", "Conversa e volumes", "gpt-5.6-luna", { override: "gpt-5.6-luna", salvoEm: "25/09 08:10", reservado: true }),
  F("volume-conferencia", "Volumes - validação da montagem", "Conversa e volumes", "gpt-5.5-mini"),
  F("volume-suggestion", "Volumes - sugestão de montagem", "Conversa e volumes", "gpt-5.5-mini"),
  F("ld-extraction", "LD - leitura principal", "Conversa e volumes", "gpt-5.5-mini"),
];
export const MODELOS_DISPONIVEIS = ["gpt-5.5", "gpt-5.5-mini", "gpt-5.6-luna"];

export const SAUDE = {
  nota: "Validação somente de configuração; nenhuma chamada externa ou consumo de tokens foi executado.",
  guarda: "Memória da instância atual; reiniciar o servidor limpa os incidentes.",
};

export const RUNTIME = [
  ["Ambiente", "production"],
  ["Provider principal", "openai"],
  ["Mock mode", "inativo"],
  ["Demo pelo cliente", "bloqueada"],
  ["Modelo do chat", "gpt-5.6-luna"],
  ["Origins", "https://nexodoc.prosul.com.br"],
] as const;

export const CHAVES = [
  { nome: "OPENAI_API_KEY", presente: true, digital: "sk-…7f3a" },
  { nome: "OPENAI_ADMIN_KEY", presente: true, digital: "sk-admin-…91c0" },
  { nome: "DATABASE_URL", presente: true },
  { nome: "NEXODOC_ADMIN_TOKEN", presente: true },
  { nome: "RESEND_API_KEY", presente: true },
];

export const TESTE_OK = { ok: true, mensagem: "Provider respondeu em 412 ms", digital: "sk-…7f3a", status: "200", code: "-", tipo: "-", raw: "-" };
export const TESTE_FALHA = { ok: false, mensagem: "Falha no teste", digital: "sk-…7f3a", status: "429", code: "rate_limit_exceeded", tipo: "requests", raw: "Rate limit reached for gpt-5.5 in organization on requests per min" };
