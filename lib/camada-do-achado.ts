/**
 * A CAMADA DO ACHADO: confirmado ou sugestão da IA. Uma regra só.
 *
 * A auditoria entrega duas camadas. Achado confirmado: veio de regra, ou a IA
 * apontou e a validação manteve. Sugestão da IA: a validação rebaixou, ou a
 * própria IA marcou confiança baixa — fica numa lista recolhida e não acende o
 * semáforo.
 *
 * CONTAGEM É SÓ DE CONFIRMADOS (decisão do Matheus, 02/10/2026). O trilho e a
 * aba Achados já contavam assim; o cartão do chat, o aviso de análise parcial,
 * o texto do parecer e o `Audit.totalFindings` somavam as sugestões — o mesmo
 * memorial aparecia como "6 achados" e "8 achados" na mesma tela.
 *
 * Módulo puro e sem imports: `audit-report.ts` e `auditoria-incompleta.ts` o
 * usam, e um importar o outro fecharia um ciclo.
 */

export type FindingTier = "principal" | "sugestao";

/** O mínimo de um achado que a regra lê. */
export type AchadoComCamada = {
  origem?: string | null;
  tier?: FindingTier | null;
  confianca?: string | null;
};

// Regra de camada para a UI de duas camadas (itens 2 e 4):
// - achado de regra é sempre principal (verificado, não alucina);
// - achado de IA explicitamente rebaixado pela validação vai pra "sugestao";
// - achado de IA de baixa confiança também é sugestão.
export function classifyFindingTier(finding: AchadoComCamada): FindingTier {
  if (finding.origem === "regra") {
    return "principal";
  }

  if (finding.tier) {
    return finding.tier;
  }

  return finding.confianca === "baixa" ? "sugestao" : "principal";
}

/** Os achados confirmados, na ordem em que vieram. */
export function achadosConfirmados<T extends AchadoComCamada>(lista: readonly T[]): T[] {
  return lista.filter((a) => classifyFindingTier(a) === "principal");
}
