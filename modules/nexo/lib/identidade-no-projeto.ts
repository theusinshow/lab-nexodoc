/**
 * A IDENTIDADE NO PROJETO, do lado do navegador (09/10/2026): grava a capa do
 * geral e as correções da ficha em `/api/projects/[id]/identidade`, e diz em
 * uma frase o que a conferência retroativa achou.
 *
 * Puro exceto `gravarIdentidadeNoProjeto` (fetch).
 */
import type { NexoDossieDraft } from "../types";

export type ConferidaDoServidor = {
  auditId: string;
  quando: string;
  estado: "confere" | "diverge";
  obraDaAuditoria: string;
  obraDaCapa: string;
};
export type RespostaDaIdentidade = { conferidas: ConferidaDoServidor[] };

const CAMPOS = ["obra", "orgao", "secretaria", "bairro", "municipio", "codigo", "mesAno"] as const;

/** Só o que a CAPA disse: o corpo nunca grava no projeto. */
export function camposDaCapaNoDossie(dossie: NexoDossieDraft): Record<string, string> {
  const campos: Record<string, string> = {};
  for (const c of CAMPOS) {
    const v = dossie[c]?.trim();
    if (v && dossie.origens?.[c]?.origem === "capa") campos[c] = v;
  }
  return campos;
}

/** A fala depois do geral. Só diz algo quando alguma auditoria diverge. */
export function fraseDaConferencia(r: RespostaDaIdentidade, formatarData: (iso: string) => string): string | null {
  const divergem = r.conferidas.filter((c) => c.estado === "diverge");
  if (divergem.length === 0) return null;
  const citadas = divergem
    .map((c) => `a auditoria de ${formatarData(c.quando)} foi feita com “${c.obraDaAuditoria}”`)
    .join("; ");
  const conferem = r.conferidas.length - divergem.length;
  return (
    `A capa do geral diz “${divergem[0].obraDaCapa}”. ` +
    `${citadas.charAt(0).toUpperCase()}${citadas.slice(1)} — vale conferir se o texto é desta obra.` +
    (conferem > 0 ? ` ${conferem} ${conferem === 1 ? "outra confere" : "outras conferem"}.` : "")
  );
}

export async function gravarIdentidadeNoProjeto(
  projectId: string,
  corpo: { origem: "capa" | "usuario"; fonte: string; campos: Record<string, string> },
): Promise<RespostaDaIdentidade | null> {
  if (Object.keys(corpo.campos).length === 0) return null;
  const r = await fetch(`/api/projects/${encodeURIComponent(projectId)}/identidade`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  return r.ok ? ((await r.json()) as RespostaDaIdentidade) : null;
}
