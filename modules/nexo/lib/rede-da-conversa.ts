/**
 * A DECISÃO DO CAMINHO DA REDE como cada gerador de LD a recebe (08/10/2026).
 *
 * A decisão (`caminhoDaRede`) mora nas decisões da conversa, como JSON. Mês e
 * ano não são decisão do caminho — são da capa — mas a sugestão da emissão os
 * usa, então chegam juntos: do plano (`mesclado.valores`) antes de gerar, do
 * card da capa (`parametrosDaEntrega`) depois. Sem eles a sugestão sai sem data.
 *
 * Ver lib/ld/caminho-da-rede.ts e o spec 2026-10-08-caminho-da-rede-na-ld.
 */
import { lerRede, type RedeDaLd } from "@/lib/ld/caminho-da-rede";

import type { DecisoesDoProjeto } from "./decisoes";

/** O campo das decisões. Um nome só, para o plano, o canvas e a entrega. */
export const CAMPO_DA_REDE = "caminhoDaRede";

export function redeParaGerar(
  decisoes: DecisoesDoProjeto,
  capa: { mes?: string; ano?: string },
): RedeDaLd {
  const rede = lerRede(decisoes[CAMPO_DA_REDE]?.valor);
  if (capa.mes?.trim()) rede.mes = capa.mes.trim();
  if (capa.ano?.trim()) rede.ano = capa.ano.trim();
  return rede;
}
