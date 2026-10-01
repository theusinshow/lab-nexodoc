/*
 * O CENTRO DE CONTROLE, com o que o /api/admin/overview e o /api/admin/status
 * devolvem hoje (app/admin/page.tsx, lib/status-do-sistema.ts,
 * lib/atencao-do-admin.ts). Os números são amostra; as frases são as do app.
 */

export type Veredito = "operacional" | "degradado" | "parado";

export const DESTINOS = [
  { id: "cockpit", nome: "Cockpit", pergunta: "está tudo de pé?" },
  { id: "dinheiro", nome: "Dinheiro", pergunta: "quanto custou?" },
  { id: "motor", nome: "Motor", pergunta: "está melhorando?" },
  { id: "pessoas", nome: "Pessoas", pergunta: "quem entra?" },
  { id: "dados", nome: "Dados", pergunta: "o que o banco guarda?" },
] as const;
export type Destino = (typeof DESTINOS)[number]["id"];

export const TUDO_EM_ORDEM = "nada exigindo ação: chaves presentes e sem incidentes nesta instância";

export const STATUS: Record<"ok" | "degradado", { veredito: Veredito; linha: string; motivo: string }> = {
  ok: { veredito: "operacional", linha: "operacional · 6 auditorias/24h · R$ 699,24 no mês", motivo: "" },
  degradado: { veredito: "degradado", linha: "degradado · 6 auditorias/24h · R$ 699,24 no mês", motivo: "1 auditoria falhou nas últimas 24h" },
};

export const ATENCAO_DEGRADADO = [
  { chave: "incidentes", texto: "2 incidente(s) de provedor nesta instância (timeout, rate-limit)", gravidade: "aviso" as const },
  { chave: "placeholder", texto: "1 fluxo(s) apontando para modelo de espaço reservado", gravidade: "aviso" as const },
];

export const TOTAIS = {
  ativos: 9,
  admins: 2,
  auditorias: 128,
  auditorias7d: 14,
  falhas: 1,
  lds: 46,
  ldsGeradas: 31,
  lds7d: 6,
  eventosLd: 412,
  eventosLd7d: 37,
};

/**
 * Séries de 14 dias (até 30/09) para as linhas de tendência do Cockpit. Os
 * últimos 7 dias somam o que os números dizem (14 auditorias, 6 LDs, 37 eventos).
 */
export const SERIES = {
  auditorias: [1, 2, 0, 0, 3, 2, 2, 1, 3, 0, 0, 2, 4, 4],
  falhas: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  lds: [0, 1, 0, 0, 1, 2, 0, 1, 1, 0, 0, 1, 2, 1],
  eventosLd: [3, 5, 0, 0, 6, 8, 4, 6, 7, 0, 0, 5, 11, 8],
};

export type Auditoria = { id: string; titulo: string; obra: string; codigo: string; modo: "Rápida" | "Profunda"; achados: number; quando: string; status: "concluída" | "falhou" | "rodando" };
export const AUDITORIAS: Auditoria[] = [
  { id: "a1", titulo: "Memorial geral, revisão A", obra: "UBS da Rua São Francisco de Assis", codigo: "117-25", modo: "Profunda", achados: 9, quando: "30/09 21:12", status: "concluída" },
  { id: "a2", titulo: "Memorial de climatização", obra: "Quadra poliesportiva", codigo: "SIM047-26", modo: "Rápida", achados: 4, quando: "30/09 16:40", status: "concluída" },
  { id: "a3", titulo: "Memorial estrutural, revisão B", obra: "Muro de contenção da Rua 7", codigo: "SIM031-26", modo: "Profunda", achados: 0, quando: "30/09 11:05", status: "falhou" },
  { id: "a4", titulo: "Memorial de PCI", obra: "UBS da Rua São Francisco de Assis", codigo: "117-25", modo: "Rápida", achados: 2, quando: "29/09 18:22", status: "concluída" },
  { id: "a5", titulo: "Memorial hidrossanitário", obra: "Praça da Juventude", codigo: "SIM099-26", modo: "Rápida", achados: 6, quando: "29/09 09:47", status: "concluída" },
];

export type Ld = { id: string; codigo: string; obra: string; pdfs: number; quando: string; status: "gerada" | "rascunho" };
export const LDS: Ld[] = [
  { id: "l1", codigo: "117-25", obra: "UBS da Rua São Francisco de Assis", pdfs: 33, quando: "30/09 20:58", status: "gerada" },
  { id: "l2", codigo: "SIM099-26", obra: "Praça da Juventude", pdfs: 24, quando: "29/09 15:10", status: "gerada" },
  { id: "l3", codigo: "SIM047-26", obra: "Quadra poliesportiva", pdfs: 12, quando: "28/09 10:31", status: "rascunho" },
  { id: "l4", codigo: "", obra: "", pdfs: 3, quando: "27/09 17:02", status: "rascunho" },
];

export const ACOES = [
  { id: "x1", acao: "promoveu a admin", alcance: "fernanda@prosul.com.br", quem: "matheus@prosul.com.br", quando: "29/09 18:02" },
  { id: "x2", acao: "declarou cotação", alcance: "US$ 1 = R$ 5,41", quem: "matheus@prosul.com.br", quando: "28/09 09:15" },
  { id: "x3", acao: "apagou auditorias", alcance: "12 anteriores a 01/08", quem: "matheus@prosul.com.br", quando: "25/09 19:40" },
  { id: "x4", acao: "convidou", alcance: "rafael@prosul.com.br", quem: "fernanda@prosul.com.br", quando: "23/09 14:08" },
];

/** As frases de falha do app (lib/estado-da-carga.ts). */
export const FALHAS = {
  negado: "O servidor recusou o token de administração (token inválido). Confira o token no rodapé do trilho.",
  rede: "Sem conexão com o servidor. Nada foi alterado — tente de novo.",
};
