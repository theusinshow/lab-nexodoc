/**
 * A SIGLA QUE AS PESSOAS LEEM NO ACHADO: `ACH-014` — 29/09/2026.
 *
 * O id nasce `INC-014` (de "incongruência", o nome interno do motor), e "INC"
 * nas pranchas é a sigla da disciplina de INCÊNDIO: "INC-014" se lia como "item
 * 14 do projeto de incêndio". "ACH" é a palavra que a tela já usa em todo lugar
 * (a página Achados, a fila de achados, "53 achados").
 *
 * SÓ O RÓTULO MUDA. O id GRAVADO continua `INC-014` — nos pareceres, no
 * feedback (`finding:INC-014`), nas atribuições da fila e nos links já
 * enviados por e-mail. Trocá-lo exigiria migrar tudo isso, e um parecer antigo
 * passaria a discordar do feedback dele. Aqui é a fronteira: quem MOSTRA usa
 * `rotuloDoAchado`/`textoComRotulos`; quem RECEBE o que uma pessoa digitou
 * usa `idDoAchado`, que aceita as duas formas.
 *
 * Módulo puro: sem imports, testado em node cru.
 */

const INTERNO = /^INC-(\d{1,4})$/i;
const ROTULO = /^ACH-(\d{1,4})$/i;

/**
 * Referência a achado DENTRO de um texto do próprio Nexo ("consolidada no
 * INC-019"). Exige TRÊS dígitos ou mais — é assim que o id nasce
 * (`padStart(3, "0")`) — para não tocar uma prancha de incêndio citada, que
 * costuma ser `INC-01`. Ainda assim, NUNCA aplique a citações do memorial
 * (evidência, trecho): lá o texto é do documento, não nosso.
 */
const NO_TEXTO = /\bINC-(\d{3,4})\b/g;

/** `INC-014` → `ACH-014`. Qualquer outro id passa como veio. */
export function rotuloDoAchado(id: string): string;
export function rotuloDoAchado(id: string | null | undefined): string | undefined;
export function rotuloDoAchado(id: string | null | undefined): string | undefined {
  if (id == null) return undefined;
  const m = INTERNO.exec(id.trim());
  return m ? `ACH-${m[1]}` : id;
}

/** Troca, num texto gerado pelo Nexo, as referências internas pelo rótulo. */
export function textoComRotulos(texto: string): string;
export function textoComRotulos(texto: string | null | undefined): string | undefined;
export function textoComRotulos(texto: string | null | undefined): string | undefined {
  if (texto == null) return undefined;
  return texto.replace(NO_TEXTO, "ACH-$1");
}

/** O que uma pessoa digitou (`ACH-014`, `ach-14`, `INC-014`) → o id gravado. */
export function idDoAchado(entrada: string): string {
  const limpa = entrada.trim();
  const m = ROTULO.exec(limpa) ?? INTERNO.exec(limpa);
  return m ? `INC-${m[1].padStart(3, "0")}` : limpa;
}

type AchadoComTextos = {
  id: string;
  tipo?: string;
  descricao?: string;
  conflito?: string;
  sugestao_correcao?: string;
};

/**
 * Cópia do achado como uma pessoa (ou o modelo do chat) deve lê-lo: id e textos
 * do Nexo com a sigla ACH. Evidência e trechos ficam intactos. Não muta.
 */
export function achadoComRotulos<F extends AchadoComTextos>(achado: F): F {
  return {
    ...achado,
    id: rotuloDoAchado(achado.id),
    ...(achado.tipo !== undefined ? { tipo: textoComRotulos(achado.tipo) } : {}),
    ...(achado.descricao !== undefined ? { descricao: textoComRotulos(achado.descricao) } : {}),
    ...(achado.conflito !== undefined ? { conflito: textoComRotulos(achado.conflito) } : {}),
    ...(achado.sugestao_correcao !== undefined
      ? { sugestao_correcao: textoComRotulos(achado.sugestao_correcao) }
      : {}),
  };
}
