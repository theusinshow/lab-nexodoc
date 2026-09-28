/**
 * EM QUE PÉ ESTÁ A CARGA DE UMA TELA — auditoria UX/UI, P02.
 *
 * O painel administrativo confundia "ainda não carreguei" com "não existe":
 * sem o token, Pessoas dizia "Nenhum usuário encontrado" e mostrava zeros,
 * Dinheiro afirmava "Sem DATABASE_URL" e as listas de Dados pareciam vazias.
 * Nenhuma dessas frases tinha resposta do servidor por trás.
 *
 * A regra é uma só, e vale para toda tela que busca dado: só se afirma VAZIO,
 * ZERO ou CONFIGURAÇÃO AUSENTE depois de uma resposta válida que diga isso.
 * Antes dela, a fase é `sem-token`, `carregando` ou `erro` — e cada uma tem a
 * sua frase e a sua saída.
 *
 * PURO e sem imports → roda em node cru (`npm run test:estado-da-carga`).
 */

export type FalhaDaCarga = "negado" | "rede" | "servidor" | "formato";

export type FaseDaCarga = "sem-token" | "carregando" | "ok" | "erro";

/** Classifica o desfecho de um `fetch` que não deu certo. */
export function classificarFalha(resposta: { status: number } | "rede"): FalhaDaCarga {
  if (resposta === "rede") return "rede";
  if (resposta.status === 401 || resposta.status === 403) return "negado";
  if (resposta.status >= 200 && resposta.status < 300) return "formato";
  return "servidor";
}

export function fraseDaFalha(tipo: FalhaDaCarga, detalhe?: string | null): string {
  const d = (detalhe ?? "").trim();
  switch (tipo) {
    case "negado":
      return `O servidor recusou o token de administração${d ? ` (${d})` : ""}. Confira o token no rodapé do trilho.`;
    case "rede":
      return "Sem conexão com o servidor. Nada foi alterado — tente de novo.";
    case "formato":
      return "O servidor respondeu num formato inesperado. Nada foi exibido para não mostrar dado errado.";
    default:
      return d ? `O servidor falhou: ${d}` : "O servidor falhou ao responder.";
  }
}

/**
 * A fase, derivada do que a tela sabe. `temDados` é "já houve UMA resposta
 * válida nesta tela" — com erro depois dela, a fase é `erro`, mas os dados
 * antigos continuam na tela, marcados com o horário.
 */
export function faseDaCarga(args: {
  restaurado: boolean;
  token: string;
  carregando: boolean;
  erro: FalhaDaCarga | null;
  temDados: boolean;
}): FaseDaCarga {
  if (args.carregando) return "carregando";
  if (args.erro) return "erro";
  if (args.temDados) return "ok";
  if (!args.restaurado || !args.token.trim()) return "sem-token";
  // Token presente, sem resposta ainda e sem pedido em voo: o pedido está por sair.
  return "carregando";
}

/**
 * O VALOR que uma métrica pode mostrar. Sem resposta válida, "—" — nunca 0.
 */
export function valorOuTraco<T>(dados: T | null | undefined, ler: (d: T) => string | number): string {
  if (dados === null || dados === undefined) return "—";
  const v = ler(dados);
  return typeof v === "number" ? v.toLocaleString("pt-BR") : v;
}
