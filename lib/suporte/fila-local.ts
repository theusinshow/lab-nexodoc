/**
 * O QUE NÃO SAIU FICA ESPERANDO. Se o envio de um chamado falha (rede caiu, o
 * servidor caiu junto), o corpo vai para o `localStorage` e é reenviado na
 * próxima carga. Só o texto: o print não entra (é grande, e a fila é rede de
 * segurança, não arquivo).
 *
 * O armazém vem de fora e pode ser null ou lançar (aba anônima, dados
 * bloqueados): nada aqui lança, nunca.
 */
export type Armazem = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };
export type Pendente = { rota: string; corpo: unknown; em: number };

export const CHAVE_DA_FILA = "nexo:suporte:pendentes";
export const TETO_DA_FILA = 5;

function ler(a: Armazem): Pendente[] {
  try {
    const v = JSON.parse(a.getItem(CHAVE_DA_FILA) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => x && typeof x.rota === "string") : [];
  } catch {
    return [];
  }
}

export function guardarPendente(a: Armazem | null, p: Pendente) {
  if (!a) return;
  try {
    a.setItem(CHAVE_DA_FILA, JSON.stringify([...ler(a), p].slice(-TETO_DA_FILA)));
  } catch {
    /* sem armazém, sem fila */
  }
}

export function tirarPendentes(a: Armazem | null): Pendente[] {
  if (!a) return [];
  const lista = ler(a);
  try {
    a.removeItem(CHAVE_DA_FILA);
  } catch {
    /* idem */
  }
  return lista;
}
