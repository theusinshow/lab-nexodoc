"use client";

/**
 * O ACESSO DO PAINEL — um contexto só para as telas de `/admin`.
 *
 * Era o TOKEN de administração: digitado no pé do trilho, guardado no
 * `sessionStorage` e mandado como `Bearer` em toda chamada. Saiu em 05/10/2026,
 * a pedido: quem é administrador no cadastro (`role: ADMIN`, ou e-mail da lista
 * do ambiente) passa direto — ver [[lib/admin-gate.ts]].
 *
 * O FORMATO FICOU, de propósito. As telas leem `token`, `restaurado`, `recarga`
 * e chamam `registrarResposta` (onze delas); reescrever cada uma para tirar um
 * campo que agora é constante seria mexer em onze cargas para mudar nada no
 * que elas fazem. `token` virou uma marca não vazia — o servidor não a lê — e
 * o que sobrou de estado de verdade é o `recusado` (sessão que deixou de ser
 * admin) e a `recarga`.
 */

import { createContext, useCallback, useContext, useMemo, useState } from "react";

/** Não é segredo: o servidor ignora o `Authorization`. Só mantém as telas andando. */
const SESSAO = "sessao";

interface EstadoDoAcesso {
  token: string;
  /** Alguma tela carregou: a sessão é de admin. */
  aceito: boolean;
  /** O servidor recusou (401/403) — a sessão não é de admin, ou expirou. */
  recusado: boolean;
  restaurado: boolean;
  /** Sobe a cada pedido de recarga; as telas escutam para refazer o pedido. */
  recarga: number;
  registrarResposta: (ok: boolean) => void;
  recarregar: () => void;
}

const Contexto = createContext<EstadoDoAcesso | null>(null);

export function AdminTokenProvider({ children }: { children: React.ReactNode }) {
  const [recusado, setRecusado] = useState(false);
  const [recarga, setRecarga] = useState(0);

  const registrarResposta = useCallback((ok: boolean) => setRecusado(!ok), []);
  const recarregar = useCallback(() => setRecarga((n) => n + 1), []);

  const valor = useMemo(
    () => ({ token: SESSAO, aceito: !recusado, recusado, restaurado: true, recarga, registrarResposta, recarregar }),
    [recusado, recarga, registrarResposta, recarregar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAdminToken() {
  const contexto = useContext(Contexto);

  if (!contexto) {
    throw new Error("useAdminToken precisa do AdminTokenProvider (app/admin/layout.tsx).");
  }

  return contexto;
}
