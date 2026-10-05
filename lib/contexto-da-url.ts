/**
 * O CONTEXTO QUE CHEGA PELA URL — projeto, conversa, auditoria, achado e
 * intenção, lidos num lugar só.
 *
 * Havia três dialetos para a mesma coisa: o detalhe do projeto mandava
 * `/audit?project=`, a home mandava `?projeto=` e o Nexo não lia nenhum dos
 * dois. O resultado era o pior possível: o link prometia "auditar o projeto B"
 * e entregava a saudação genérica — ou, pior, a última conversa, que podia ser
 * do projeto A (auditoria UX/UI, G03).
 *
 * FORMA CANÔNICA: `/nexo?projeto=<id>&intencao=<id>`. `project` continua aceito
 * como sinônimo de LEITURA, porque favoritos e e-mails antigos o usam; nenhum
 * emissor novo deve escrevê-lo.
 *
 * QUERY NÃO É AUTORIZAÇÃO. Isto só normaliza o PEDIDO; quem decide se o projeto
 * existe e é acessível é o servidor (`app/nexo/page.tsx`), antes de a tela
 * mostrar "Trabalhando no projeto X".
 *
 * PURO e sem imports → roda em node cru (`npm run test:contexto-da-url`).
 */

/** Mesmo formato estreito de `link-do-achado.ts`: uuid, cuid ou `INC-014`. */
const ID = /^[A-Za-z0-9_-]{1,80}$/;

/** As intenções que um link pode pedir. As três primeiras são as partidas. */
export const INTENCOES_DE_LINK = ["montar", "auditar", "conferir", "ld", "capa"] as const;
export type IntencaoDeLink = (typeof INTENCOES_DE_LINK)[number];

export interface ContextoDaUrl {
  projeto: string | null;
  conversa: string | null;
  auditoria: string | null;
  /** Só existe com `auditoria` — achado solto não diz de qual parecer é. */
  achado: string | null;
  /**
   * A FILA abre filtrada em "Meus" (05/10/2026): o link do e-mail e os atalhos
   * "com você" levam ao que é da pessoa, e não ao Resumo do parecer inteiro.
   * Só existe com `auditoria`.
   */
  fila: "meus" | null;
  intencao: IntencaoDeLink | null;
  /** Uma mensagem em texto livre (a busca do topo, "Perguntar ao Nexo"): chega
   *  ESCRITO no composer, sem enviar — a pessoa ainda confirma com Enter. */
  mensagem: string | null;
}

/** Teto da mensagem: é uma frase, não um documento colado na URL. */
const MENSAGEM_MAX = 500;

type Leitor = { get(nome: string): string | null };

function id(valor: string | null | undefined): string | null {
  const v = (valor ?? "").trim();
  return ID.test(v) ? v : null;
}

export function lerContextoDaUrl(query: string | Leitor): ContextoDaUrl {
  const p: Leitor = typeof query === "string" ? new URLSearchParams(query) : query;
  // `projeto` ganha de `project` quando os dois vêm: é o canônico.
  const projeto = id(p.get("projeto")) ?? id(p.get("project"));
  const auditoria = id(p.get("auditoria"));
  const intencaoCrua = (p.get("intencao") ?? "").trim().toLowerCase();
  const intencao = (INTENCOES_DE_LINK as readonly string[]).includes(intencaoCrua)
    ? (intencaoCrua as IntencaoDeLink)
    : null;
  return {
    projeto,
    conversa: id(p.get("conversa")),
    auditoria,
    achado: auditoria ? id(p.get("achado")) : null,
    fila: auditoria && (p.get("fila") ?? "").trim().toLowerCase() === "meus" ? "meus" : null,
    intencao,
    mensagem: (p.get("mensagem") ?? "").trim().slice(0, MENSAGEM_MAX) || null,
  };
}

/**
 * O link canônico do Nexo. Emissores (detalhe do projeto, redirecionamentos
 * legados, home) montam por aqui, para que o formato escrito e o lido não
 * divirjam.
 */
export function linkDoNexo(ctx: Partial<ContextoDaUrl>): string {
  const q = new URLSearchParams();
  if (ctx.projeto) q.set("projeto", ctx.projeto);
  if (ctx.conversa) q.set("conversa", ctx.conversa);
  if (ctx.auditoria) q.set("auditoria", ctx.auditoria);
  if (ctx.auditoria && ctx.achado) q.set("achado", ctx.achado);
  if (ctx.auditoria && ctx.fila) q.set("fila", ctx.fila);
  if (ctx.intencao) q.set("intencao", ctx.intencao);
  if (ctx.mensagem) q.set("mensagem", ctx.mensagem.trim().slice(0, MENSAGEM_MAX));
  const s = q.toString();
  return s ? `/nexo?${s}` : "/nexo";
}

/**
 * A restauração da ÚLTIMA conversa deve acontecer nesta abertura?
 *
 * Não quando a URL manda em algo: conversa, auditoria, projeto ou intenção.
 * Quem clicou num destino explícito disse onde quer ir; reabrir "onde eu parei"
 * por cima trocaria silenciosamente o projeto B pelo A.
 */
export function urlMandaNoDestino(ctx: ContextoDaUrl): boolean {
  return Boolean(ctx.conversa || ctx.auditoria || ctx.projeto || ctx.intencao || ctx.mensagem);
}

export type DecisaoDeProjeto =
  | { tipo: "nenhum" }
  /** A conversa aberta não tem projeto: pode receber o pedido. */
  | { tipo: "vincular"; projeto: string }
  /** Já está no projeto pedido: nada a fazer. */
  | { tipo: "mesmo" }
  /** Já pertence a OUTRO projeto: nunca trocar em silêncio — avisar. */
  | { tipo: "conflito"; pedido: string; atual: string };

/**
 * O que fazer com o projeto pedido diante da conversa que ficou aberta.
 *
 * Regra da auditoria UX (4.1): parâmetros conflitantes não podem associar em
 * silêncio um registro a outro projeto. Conversa já endereçada mantém o seu;
 * a tela avisa a divergência.
 */
export function decidirProjeto(args: {
  pedido: string | null;
  atual: string | null | undefined;
}): DecisaoDeProjeto {
  if (!args.pedido) return { tipo: "nenhum" };
  const atual = (args.atual ?? "").trim();
  if (!atual) return { tipo: "vincular", projeto: args.pedido };
  if (atual === args.pedido) return { tipo: "mesmo" };
  return { tipo: "conflito", pedido: args.pedido, atual };
}
