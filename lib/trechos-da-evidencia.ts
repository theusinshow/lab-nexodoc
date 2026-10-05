/**
 * OS TRECHOS DE UMA EVIDÊNCIA, um por página.
 *
 * O achado de coerência confronta páginas: "a p. 10 diz que a terraplenagem é
 * da Prefeitura; a p. 22 diz que é da contratada". As regras gravam isso numa
 * string só — `Pág. 10: "…" | Pág. 22: "…"` (ver `lib/audit-coherence.ts`) — e
 * o cartão mostrava a string num bloco, sem dizer que eram DUAS páginas em
 * conflito (05/10/2026). Este módulo separa os trechos para a tela poder
 * mostrar um ao lado do outro.
 *
 * Puro, sem IO. Evidência que não segue o formato volta como um trecho só, sem
 * página: a tela cai no bloco de sempre.
 */

export interface TrechoDaEvidencia {
  pagina: number | null;
  texto: string;
}

const TRECHO = /P[áa]g\.?\s*(\d{1,4})\s*:\s*/gi;

export function trechosDaEvidencia(evidencia: string | null | undefined): TrechoDaEvidencia[] {
  const texto = (evidencia ?? "").trim();
  if (!texto) return [];

  const marcas = [...texto.matchAll(TRECHO)];
  // Só conta como confronto quando o texto ABRE numa marca: "conforme a Pág. 3:"
  // no meio de uma frase é citação, não a moldura das regras.
  if (marcas.length === 0 || marcas[0].index !== 0) return [{ pagina: null, texto }];

  return marcas.map((m, i) => {
    const inicio = m.index! + m[0].length;
    const fim = i + 1 < marcas.length ? marcas[i + 1].index! : texto.length;
    const corpo = texto
      .slice(inicio, fim)
      .trim()
      .replace(/\s*\|\s*$/, "")
      .replace(/^"([\s\S]*)"$/, "$1")
      .trim();
    return { pagina: Number(m[1]), texto: corpo };
  });
}

/** As páginas DISTINTAS que a evidência confronta, na ordem em que aparecem. */
export function paginasEmConflito(evidencia: string | null | undefined): number[] {
  const vistas: number[] = [];
  for (const t of trechosDaEvidencia(evidencia)) {
    if (t.pagina !== null && !vistas.includes(t.pagina)) vistas.push(t.pagina);
  }
  return vistas;
}
