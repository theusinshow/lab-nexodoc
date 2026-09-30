/**
 * QUAL CONVERSA JÁ GUARDA ESTA AUDITORIA — 29/09/2026.
 *
 * `/nexo?auditoria=<id>` salvava o parecer numa conversa nova a CADA clique,
 * mesmo quando outra já o tinha: abrir três vezes o mesmo achado pela fila
 * deixava três "Nova conversa" idênticas no balde "A endereçar". Antes de ir
 * ao servidor, o link procura aqui a conversa que já tem aquele parecer, e
 * abre ela.
 *
 * O parecer mora com dois ids: `auditoria:<auditId>` quando veio por link, e
 * `auditoria:<código>:<mensagem>` quando nasceu da proposta na própria
 * conversa — aí o `auditId` está no payload. Os dois contam.
 *
 * Módulo puro: sem React nem IndexedDB, testado em node cru.
 */

type Resultado = { artifactId?: unknown; kind?: unknown; payload?: unknown };
type Conversa = { id: string; updatedAt: number; results?: readonly Resultado[] };

function guarda(r: Resultado, auditId: string): boolean {
  if (r.kind !== "auditoria") return false;
  if (r.artifactId === `auditoria:${auditId}`) return true;
  const doPayload = (r.payload as { auditId?: unknown } | null | undefined)?.auditId;
  return doPayload === auditId;
}

/** A mais recente das conversas que guardam o parecer, ou nulo. */
export function conversaQueGuarda<C extends Conversa>(
  conversas: readonly C[],
  auditId: string,
): C | null {
  let melhor: C | null = null;
  for (const c of conversas) {
    if (!(c.results ?? []).some((r) => guarda(r, auditId))) continue;
    if (!melhor || c.updatedAt > melhor.updatedAt) melhor = c;
  }
  return melhor;
}
