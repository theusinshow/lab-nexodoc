/**
 * A COR DO AVATAR — o grupo técnico da pessoa, e um anel para quem administra.
 *
 * Pedido de 08/10/2026: ver de relance de que equipe é quem está com um achado.
 * As cores são as MESMAS das disciplinas (`--ds-disc-*`), e não uma paleta
 * nova: a arquiteta e a disciplina de arquitetura falam a mesma cor em toda
 * tela. Complementares não tem disciplina própria; usa o verde do paisagismo.
 *
 * O ADMIN NÃO É VERMELHO. Vermelho já quer dizer "bloqueia" nos achados, e um
 * avatar vermelho ao lado de um achado seria lido como alarme. Admin é papel,
 * não grupo — a pessoa continua na cor da equipe dela e ganha um anel.
 *
 * Orçamento, externo, diretoria e quem não tem grupo ficam no cinza de sempre.
 *
 * PURO: roda em Node pelado no `scripts/test-cor-da-pessoa.ts`.
 */

export type TomDaPessoa = "arq" | "est" | "comp";

const TOM_DO_GRUPO: Record<string, TomDaPessoa> = {
  arquitetura: "arq",
  estrutural: "est",
  complementares: "comp",
};

const ROTULO_DO_TOM: Record<TomDaPessoa, string> = {
  arq: "Arquitetura",
  est: "Estrutural",
  comp: "Complementares",
};

export interface CorDaPessoa {
  tom: TomDaPessoa | null;
  admin: boolean;
  /** "Arquitetura · admin" — a dica do avatar, para a cor não ser o único sinal. */
  rotulo: string | null;
}

export function corDaPessoa(pessoa: { grupo?: string | null; role?: string | null } | null | undefined): CorDaPessoa {
  const tom = TOM_DO_GRUPO[(pessoa?.grupo ?? "").trim().toLowerCase()] ?? null;
  const admin = pessoa?.role === "ADMIN" || pessoa?.role === "OWNER";
  const partes = [tom ? ROTULO_DO_TOM[tom] : null, admin ? "admin" : null].filter(Boolean);
  return { tom, admin, rotulo: partes.length ? partes.join(" · ") : null };
}
