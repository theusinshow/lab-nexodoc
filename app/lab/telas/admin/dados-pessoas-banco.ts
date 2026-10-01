/*
 * PESSOAS e DADOS, com o que /api/admin/users, /api/admin/audits,
 * /api/admin/lds e /api/admin/expurgo devolvem hoje (app/admin/pessoas,
 * components/admin/conteudo/{controles,auditorias,lds,expurgo}.tsx,
 * lib/expurgo.ts). Números e nomes são amostra; as frases são as do app.
 */

/* ---------------- PESSOAS ---------------- */

export type Porta = "prosul" | "convite" | "outra";
export const PORTAS: { id: Porta; rotulo: string }[] = [
  { id: "prosul", rotulo: "Entra na PROSUL como MEMBER" },
  { id: "convite", rotulo: "Exige convite" },
  { id: "outra", rotulo: "Entra em outro escritório" },
];
export const EXPLICACAO_DA_PORTA: Record<Porta, string> = {
  prosul:
    "O login é Google: qualquer pessoa com conta Google que abrir o site vira membro e passa a enxergar os projetos do escritório. Quem já foi desligado à mão não volta — essa trava é separada.",
  convite: "Conta nova sem convite leva 403 até alguém liberá-la em Pessoas.",
  outra: "Quem chega sem convite entra no escritório informado, como MEMBER.",
};

export type Vinculo = { papel: "OWNER" | "ADMIN" | "MEMBER"; situacao: "ACTIVE" | "INVITED" | "DISABLED" } | null;
export type Pessoa = { id: string; nome: string; email: string; papel: "ADMIN" | "USER"; ativo: boolean; vinculo: Vinculo; auditorias: number; lds: number; geradas: number; criada: string; atualizado: string };

export const PESSOAS: Pessoa[] = [
  { id: "p1", criada: "02/06", nome: "Matheus Mendes", email: "matheus@prosul.com.br", papel: "ADMIN", ativo: true, vinculo: { papel: "OWNER", situacao: "ACTIVE" }, auditorias: 41, lds: 12, geradas: 9, atualizado: "30/09 21:12" },
  { id: "p2", criada: "02/06", nome: "Fernanda Duarte", email: "fernanda@prosul.com.br", papel: "ADMIN", ativo: true, vinculo: { papel: "ADMIN", situacao: "ACTIVE" }, auditorias: 23, lds: 8, geradas: 6, atualizado: "30/09 16:40" },
  { id: "p3", criada: "14/06", nome: "Victor Alves", email: "victor@prosul.com.br", papel: "USER", ativo: true, vinculo: { papel: "MEMBER", situacao: "ACTIVE" }, auditorias: 29, lds: 11, geradas: 8, atualizado: "30/09 11:05" },
  { id: "p4", criada: "14/06", nome: "Rafael Souza", email: "rafael@prosul.com.br", papel: "USER", ativo: true, vinculo: { papel: "MEMBER", situacao: "ACTIVE" }, auditorias: 18, lds: 7, geradas: 5, atualizado: "29/09 18:22" },
  { id: "p5", criada: "03/07", nome: "Camila Rocha", email: "camila@prosul.com.br", papel: "USER", ativo: true, vinculo: { papel: "MEMBER", situacao: "ACTIVE" }, auditorias: 9, lds: 4, geradas: 2, atualizado: "29/09 09:47" },
  { id: "p6", criada: "21/07", nome: "Bruno Lima", email: "bruno@prosul.com.br", papel: "USER", ativo: true, vinculo: { papel: "MEMBER", situacao: "ACTIVE" }, auditorias: 6, lds: 2, geradas: 1, atualizado: "26/09 14:02" },
  { id: "p7", criada: "24/09", nome: "Juliana Prado", email: "juliana@prosul.com.br", papel: "USER", ativo: true, vinculo: { papel: "MEMBER", situacao: "INVITED" }, auditorias: 0, lds: 0, geradas: 0, atualizado: "24/09 14:08" },
  { id: "p8", criada: "21/09", nome: "Diego Ferraz", email: "diego.ferraz@gmail.com", papel: "USER", ativo: true, vinculo: null, auditorias: 2, lds: 1, geradas: 0, atualizado: "21/09 10:30" },
  { id: "p10", criada: "30/09", nome: "Lucas Teixeira", email: "lucas.teixeira@prosul.com.br", papel: "USER", ativo: true, vinculo: null, auditorias: 0, lds: 0, geradas: 0, atualizado: "30/09 08:12" },
  { id: "p9", criada: "14/06", nome: "Tiago Martins", email: "tiago@prosul.com.br", papel: "USER", ativo: false, vinculo: { papel: "MEMBER", situacao: "DISABLED" }, auditorias: 14, lds: 3, geradas: 3, atualizado: "02/09 17:44" },
];

/** escritorioLabel do app. */
export const rotuloDoVinculo = (v: Vinculo) => (!v ? "—" : v.situacao === "INVITED" ? "CONVIDADO" : v.situacao === "DISABLED" ? "DESLIGADO" : v.papel);

/** Frases de confirmação do app (setConfirmando). */
export const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
export const CONFIRMA = {
  admins: (n: number) => `Dar acesso de admin a ${plural(n, "pessoa", "pessoas")}? ${n === 1 ? "Ela passa" : "Elas passam"} a ver custo, configuração de provedores, e a poder promover outras.`,
  desativar: (n: number) => `Desativar ${plural(n, "pessoa", "pessoas")}? ${n === 1 ? "Ela perde" : "Elas perdem"} o acesso ao produto imediatamente.`,
  desativarUm: (quem: string) => `Desativar ${quem}? Perde o acesso ao produto imediatamente — o histórico fica.`,
  darAdmin: (quem: string) => `Dar admin a ${quem}?`,
  tirarAdmin: (quem: string) => `Tirar o admin de ${quem}?`,
};

/* ---------------- DADOS ---------------- */

export type Conversa = { id: string; titulo: string; tipo: string; dono: string; atualizada: string };
export type ObraGuardada = { chave: string; rotulo: string; bytes: number; conversas: Conversa[] };
export const OBRAS_GUARDADAS: ObraGuardada[] = [
  {
    chave: "117-25",
    rotulo: "117-25 · UBS da Rua São Francisco de Assis",
    bytes: 412_000_000,
    conversas: [
      { id: "c1", titulo: "Auditar o memorial geral", tipo: "auditoria", dono: "victor@prosul.com.br", atualizada: "30/09 21:12" },
      { id: "c2", titulo: "Montar o volume", tipo: "montagem", dono: "victor@prosul.com.br", atualizada: "30/09 20:58" },
      { id: "c3", titulo: "LD, capa e separatrizes", tipo: "montagem", dono: "fernanda@prosul.com.br", atualizada: "29/09 15:10" },
    ],
  },
  {
    chave: "SIM047-26",
    rotulo: "SIM047-26 · Quadra poliesportiva",
    bytes: 186_000_000,
    conversas: [
      { id: "c4", titulo: "Memorial de climatização", tipo: "auditoria", dono: "rafael@prosul.com.br", atualizada: "30/09 16:40" },
      { id: "c5", titulo: "Conferir as folhas", tipo: "conferência", dono: "rafael@prosul.com.br", atualizada: "28/09 10:31" },
    ],
  },
  {
    chave: "088-25",
    rotulo: "088-25 · Criciúma, escola do Pinheirinho (entregue)",
    bytes: 640_000_000,
    conversas: [
      { id: "c6", titulo: "Auditoria final do memorial", tipo: "auditoria", dono: "tiago@prosul.com.br", atualizada: "12/08 09:20" },
      { id: "c7", titulo: "Volumes 1 a 3", tipo: "montagem", dono: "tiago@prosul.com.br", atualizada: "11/08 18:02" },
      { id: "c8", titulo: "Revisão do memorial, rev C", tipo: "auditoria", dono: "matheus@prosul.com.br", atualizada: "05/08 14:40" },
    ],
  },
  {
    chave: "sem-obra",
    rotulo: "Sem obra",
    bytes: 22_000_000,
    conversas: [{ id: "c9", titulo: "Teste do Nexo", tipo: "conversa", dono: "diego.ferraz@gmail.com", atualizada: "21/09 10:30" }],
  },
];

/** A prévia que o servidor conta antes de apagar (Previa do app), para a obra 088-25. */
export const PREVIA_088 = { conversas: 3, auditorias: 4, achados: 61, mensagensDeAchado: 23, lds: 3, artefatos: 11, arquivos: 38, bytes: 640_000_000, donos: 2, preservado: { eventosDeConsumo: 212, custoUsd: 18.4 } };

export const megas = (b: number) => `${(b / 1_000_000).toFixed(1).replace(".", ",")} MB`;

export type AuditoriaGuardada = { id: string; titulo: string; projeto: string; status: "Concluída" | "Processando" | "Falha" | "Cancelada"; modo: "memorial" | "volume"; nivel: "Padrão" | "Profundo"; pdfs: number; achados: number; tempo: string; usuario: string; criada: string };
export const AUDITORIAS_GUARDADAS: AuditoriaGuardada[] = [
  { id: "g1", titulo: "Memorial geral, revisão A", projeto: "117-25", status: "Concluída", modo: "memorial", nivel: "Profundo", pdfs: 1, achados: 9, tempo: "6 min 02 s", usuario: "victor@prosul.com.br", criada: "30/09 21:06" },
  { id: "g2", titulo: "Memorial de climatização", projeto: "SIM047-26", status: "Concluída", modo: "memorial", nivel: "Padrão", pdfs: 1, achados: 4, tempo: "2 min 31 s", usuario: "rafael@prosul.com.br", criada: "30/09 16:37" },
  { id: "g3", titulo: "Memorial estrutural, revisão B", projeto: "SIM031-26", status: "Falha", modo: "memorial", nivel: "Profundo", pdfs: 1, achados: 0, tempo: "1 min 40 s", usuario: "camila@prosul.com.br", criada: "30/09 11:03" },
  { id: "g4", titulo: "Memorial de PCI", projeto: "117-25", status: "Concluída", modo: "memorial", nivel: "Padrão", pdfs: 1, achados: 2, tempo: "2 min 12 s", usuario: "victor@prosul.com.br", criada: "29/09 18:20" },
  { id: "g5", titulo: "Volume 1, conferência", projeto: "SIM099-26", status: "Processando", modo: "volume", nivel: "Padrão", pdfs: 7, achados: 0, tempo: "—", usuario: "bruno@prosul.com.br", criada: "29/09 09:44" },
  { id: "g6", titulo: "Memorial hidrossanitário", projeto: "SIM099-26", status: "Cancelada", modo: "memorial", nivel: "Padrão", pdfs: 1, achados: 0, tempo: "0 min 22 s", usuario: "bruno@prosul.com.br", criada: "28/09 15:01" },
];

export type LdGuardada = { id: string; codigo: string; obra: string; status: "Rascunho" | "Gerada" | "Arquivada"; usuario: string; pranchas: number; pdfs: number; tomos: number; eventos: number; atualizada: string };
export const LDS_GUARDADAS: LdGuardada[] = [
  { id: "d1", codigo: "117-25", obra: "UBS da Rua São Francisco de Assis", status: "Gerada", usuario: "victor@prosul.com.br", pranchas: 33, pdfs: 33, tomos: 2, eventos: 48, atualizada: "30/09 20:58" },
  { id: "d2", codigo: "SIM099-26", obra: "Praça da Juventude", status: "Gerada", usuario: "fernanda@prosul.com.br", pranchas: 24, pdfs: 24, tomos: 1, eventos: 31, atualizada: "29/09 15:10" },
  { id: "d3", codigo: "SIM047-26", obra: "Quadra poliesportiva", status: "Rascunho", usuario: "rafael@prosul.com.br", pranchas: 12, pdfs: 12, tomos: 1, eventos: 9, atualizada: "28/09 10:31" },
  { id: "d4", codigo: "088-25", obra: "Escola do Pinheirinho", status: "Arquivada", usuario: "tiago@prosul.com.br", pranchas: 61, pdfs: 61, tomos: 3, eventos: 102, atualizada: "11/08 18:02" },
];

export const CONFIRMA_EXCLUSAO = {
  auditorias: (n: number) => `Excluir permanentemente ${plural(n, "auditoria selecionada", "auditorias selecionadas")}? Esta ação remove todos os arquivos e feedbacks vinculados.`,
  lds: (n: number) => `Excluir permanentemente ${plural(n, "LD selecionada", "LDs selecionadas")}? Esta ação remove todos os eventos vinculados.`,
};
