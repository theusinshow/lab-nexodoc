/*
 * DINHEIRO, com o que o /api/admin/usage devolve hoje (app/admin/dinheiro,
 * lib/cambio.ts, lib/controles-da-plataforma.ts). Os números são amostra; as
 * frases, os rótulos e as variáveis de ambiente são os do app.
 */

export const COTACAO = { valor: 5.41, declaradaHa: 2 };

/** lib/cambio.ts → procedenciaDaCotacao */
export const procedencia = (cotacao: number | null, idade: number) =>
  cotacao === null
    ? "cotação não declarada — os valores ficam em dólar"
    : `cotação declarada ${idade <= 0 ? "hoje" : idade === 1 ? "ontem" : `há ${idade} dias`}: R$ ${cotacao.toFixed(2).replace(".", ",")} por US$ 1`;

export type Controle = { chave: string; rotulo: string; descricao: string; variavel: string; valor: number | null; origem: "banco" | "ambiente" | "padrao"; minimo: number; maximo: number };
export const TETOS: Controle[] = [
  {
    chave: "teto.mensal.usd",
    rotulo: "Teto de gasto por conta, no mês",
    descricao: "Barreira de entrada: mede o que já foi registrado, então não freia auditoria em voo. Sem valor, não há teto.",
    variavel: "NEXODOC_MONTHLY_BUDGET_USD",
    valor: 40,
    origem: "banco",
    minimo: 1,
    maximo: 100000,
  },
  {
    chave: "teto.global.usd",
    rotulo: "Teto de gasto do sistema, no mês",
    descricao: "Vale para o consumo sem dono identificado — que é justamente o caminho sem ninguém a cobrar.",
    variavel: "NEXODOC_GLOBAL_MONTHLY_BUDGET_USD",
    valor: 300,
    origem: "ambiente",
    minimo: 1,
    maximo: 1000000,
  },
];
export const ROTULO_DA_ORIGEM = { banco: "declarado aqui", ambiente: "vem do ambiente", padrao: "não declarado" } as const;
/** O gasto do mês que o veredito já mostra (lib/status-do-sistema → gastoDoMesUsd). */
export const GASTO_DO_MES_USD = 39.26;

export const PERIODOS = [7, 14, 30] as const;

/** Uso por dia (fatura do provedor): tokens e custo. */
export const DIAS = [
  { dia: "25/09", tokens: 1_412_880, usd: 5.12 },
  { dia: "26/09", tokens: 2_208_114, usd: 7.94 },
  { dia: "27/09", tokens: 640_220, usd: 2.31 },
  { dia: "28/09", tokens: 182_004, usd: 0.66 },
  { dia: "29/09", tokens: 2_904_551, usd: 10.48 },
  { dia: "30/09", tokens: 3_118_902, usd: 11.27 },
  { dia: "01/10", tokens: 2_643_017, usd: 9.04 },
];

export const TOTAIS_DO_PERIODO = { usd: 46.82, entrada: 10_402_116, saida: 2_707_572, chamadas: 1284, cache: 3_118_440 };

export const MODELOS = [
  { modelo: "gpt-5.5", chamadas: 612, tokens: 9_884_210 },
  { modelo: "gpt-5.5-mini", chamadas: 590, tokens: 2_904_118 },
  { modelo: "gpt-5.6-luna", chamadas: 82, tokens: 321_360 },
];

export const ITENS_DE_CUSTO = [
  { item: "gpt-5.5, entrada", usd: 26.01 },
  { item: "gpt-5.5, saída", usd: 14.66 },
  { item: "gpt-5.5-mini, entrada e saída", usd: 4.12 },
  { item: "gpt-5.6-luna, entrada e saída", usd: 2.03 },
];

export type Obra = { chave: string; obra: string; origem: "pasta" | "conversa" | "sem-vinculo" | "conversa-removida"; chamadas: number; conversas: number; tokens: number; usd: number };
export const OBRAS: Obra[] = [
  { chave: "o1", obra: "117-25 · UBS da Rua São Francisco de Assis", origem: "pasta", chamadas: 418, conversas: 6, tokens: 4_918_220, usd: 17.94 },
  { chave: "o2", obra: "SIM099-26 · Praça da Juventude", origem: "pasta", chamadas: 301, conversas: 4, tokens: 3_204_510, usd: 11.02 },
  { chave: "o3", obra: "SIM047-26 · Quadra poliesportiva", origem: "pasta", chamadas: 212, conversas: 3, tokens: 2_110_904, usd: 7.61 },
  { chave: "o4", obra: "Conversa “memorial do muro, rev B”", origem: "conversa", chamadas: 96, conversas: 1, tokens: 980_330, usd: 3.48 },
  { chave: "o5", obra: "Sem conversa", origem: "sem-vinculo", chamadas: 74, conversas: 0, tokens: 512_008, usd: 1.87 },
];
export const ORIGEM_DA_OBRA = {
  pasta: "pasta",
  conversa: "conversa avulsa",
  "conversa-removida": "a conversa não existe mais",
  "sem-vinculo": "consumo sem conversa (auditoria fora do Nexo, manutenção)",
} as const;

export const INTERNO = { eventos: 1101, usd: 41.92, semPreco: 82, tokensSemPreco: 321_360, modelosSemPreco: ["gpt-5.6-luna"], limite: 500 };

export const FLUXOS = [
  { fluxo: "audit", tokens: 6_104_220, chamadas: 288, usd: 24.4, semPreco: 0 },
  { fluxo: "audit-transcricao", tokens: 1_802_114, chamadas: 96, usd: 5.1, semPreco: 0 },
  { fluxo: "ld-extraction", tokens: 2_330_870, chamadas: 512, usd: 6.82, semPreco: 0 },
  { fluxo: "audit-chat", tokens: 904_118, chamadas: 141, usd: 3.06, semPreco: 41 },
  { fluxo: "conferente", tokens: 640_002, chamadas: 64, usd: 2.54, semPreco: 41 },
];

export const TAREFAS = [
  { tarefa: "Auditoria profunda do memorial", fluxo: "audit", tokens: 4_880_120, usd: 19.6 },
  { tarefa: "Leitura dos carimbos", fluxo: "ld-extraction", tokens: 2_330_870, usd: 6.82 },
  { tarefa: "Transcrição de páginas escaneadas", fluxo: "audit-transcricao", tokens: 1_802_114, usd: 5.1 },
  { tarefa: "Auditoria rápida do memorial", fluxo: "audit", tokens: 1_224_100, usd: 4.8 },
  { tarefa: "Conversa sobre o parecer", fluxo: "audit-chat", tokens: 904_118, usd: 3.06 },
  { tarefa: "Conferência das folhas", fluxo: "conferente", tokens: 640_002, usd: 2.54 },
];

export const num = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
export const usd = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" }).format(n);
export const brl = (n: number, cot: number | null) => (cot === null ? "" : `≈ ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n * cot)}`);
