/**
 * O formato de um achado corrigido e a regra "é desta pessoa" — PUROS, para o
 * navegador poder importar sem arrastar o banco junto (a consulta mora em
 * [[lib/achados-corrigidos.ts]]).
 */
import type { Nivel } from "@/lib/nivel-do-achado";

export type AchadoCorrigido = {
  /** id da linha de feedback. */
  chave: string;
  auditId: string;
  findingId: string;
  /** Como a tela lê: ACH-014. */
  rotulo: string;
  titulo: string;
  nivel: Nivel | null;
  pagina: string | null;
  codigo: string;
  cliente: string;
  obra: string;
  parecer: string;
  corrigidoEm: string;
  /** Quem marcou como corrigido (e-mail em minúsculas e nome). */
  porEmail: string | null;
  porNome: string | null;
  /** Com quem o achado estava. */
  comEmail: string | null;
  comNome: string | null;
};

/** O achado é DESTA pessoa: estava com ela, ou ela marcou. E-mail em minúsculas. */
export function corrigidoPor(a: Pick<AchadoCorrigido, "porEmail" | "comEmail">, email: string): boolean {
  const e = email.toLowerCase();
  return a.comEmail === e || a.porEmail === e;
}
