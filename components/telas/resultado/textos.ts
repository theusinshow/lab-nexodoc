/** Os nomes do Resultado na língua da tela (os do lab). */
import type { Desfecho } from "@/lib/desfecho-do-achado";

export const NOME_DO_DESFECHO: Record<Desfecho, string> = {
  FIXED_IN_DOC: "Corrigido",
  ACCEPTED_RISK: "Decisão técnica",
  FALSE_POSITIVE: "Falso positivo",
};

export const conta = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
