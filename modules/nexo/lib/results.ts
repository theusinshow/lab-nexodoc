/**
 * Operações PURAS sobre a lista de resultados gerados da conversa.
 *
 * SEM IMPORTS de runtime (nem alias `@/`): roda no node cru do
 * `test:nexo:session`. O store faz os efeitos (revogar object URL, persistir);
 * aqui só a transformação da lista, que é o que precisa ficar travado por teste.
 */

/** Mínimo que a remoção precisa enxergar de um resultado (o store passa o dele). */
interface ResultoRemovivel {
  artifactId: string;
  files: { url: string }[];
}

/**
 * Tira UM artefato da lista pelo id. Devolve os restantes NA ORDEM ORIGINAL e o
 * removido — este último para o chamador revogar os object URLs, que de outra
 * forma ficam presos na memória da aba a cada exclusão.
 *
 * Id inexistente é no-op silencioso: excluir algo que já saiu não é erro, e o
 * card volta ao estado de proposta de qualquer forma.
 */
export function removerResultado<T extends ResultoRemovivel>(
  results: T[],
  artifactId: string,
): { restantes: T[]; removido: T | null } {
  const removido = results.find((r) => r.artifactId === artifactId) ?? null;
  if (!removido) return { restantes: results, removido: null };
  return {
    restantes: results.filter((r) => r.artifactId !== artifactId),
    removido,
  };
}

/**
 * A que tomo um artefato pertence, lido do sufixo do id (`capa:016:t02` → 2).
 * `0` = artefato sem tomo (volume não dividido, ou gerado antes da divisão).
 *
 * O tomo vive no id porque é o id que define a IDENTIDADE do artefato: dois
 * tomos são dois documentos, não dois estados do mesmo.
 */
export function tomoDoArtefato(artifactId: string): number {
  const m = /:t(\d{2})$/.exec(artifactId);
  return m ? Number(m[1]) : 0;
}

/**
 * Agrupa artefatos por tomo, na ordem crescente, com os sem-tomo (`0`) por
 * último.
 *
 * O grupo `0` importa: quando o engenheiro divide um volume que JÁ tinha sido
 * gerado inteiro, os artefatos antigos continuam no estado com id sem sufixo.
 * Escondê-los faria o canvas mentir; mostrá-los à parte deixa claro que sobraram
 * da divisão anterior e podem ser excluídos.
 */
export function agruparPorTomo<T extends { id: string }>(
  artefatos: T[],
  /**
   * Tomos que EXISTEM mesmo sem documento gerado: os que o usuário declarou em
   * "Nº de tomos" e aqueles para onde ele já arrastou folha. Sem isto, um tomo
   * novo não teria fileira — e sem fileira não há para onde arrastar.
   */
  tomosDeclarados: readonly number[] = [],
): { tomo: number; itens: T[] }[] {
  const grupos = new Map<number, T[]>();
  for (const t of tomosDeclarados) {
    if (t > 0 && !grupos.has(t)) grupos.set(t, []);
  }
  for (const a of artefatos) {
    const t = tomoDoArtefato(a.id);
    const atual = grupos.get(t);
    if (atual) atual.push(a);
    else grupos.set(t, [a]);
  }
  return [...grupos.entries()]
    .map(([tomo, itens]) => ({ tomo, itens }))
    // Sem-tomo por último: é resto, não é o trabalho atual.
    .sort((a, b) => (a.tomo === 0 ? 1 : b.tomo === 0 ? -1 : a.tomo - b.tomo));
}

/**
 * OS TOMOS QUE VIRAM FILEIRA, depois de tirar o falso "Tomo 01".
 *
 * Um volume de documento único grava `numTomos: 1` no plano, e os documentos
 * dele saem SEM sufixo de tomo (`ld:…`, não `ld:…:t01`). Declarar o tomo 1
 * nesse caso criava uma fileira vazia "Tomo 01" e jogava a LD recém-gerada no
 * grupo do resto: o canvas dizia "Fora da divisão — gerado antes de dividir"
 * e marcava a LD como desatualizada (a assinatura era comparada com a fileira
 * vazia), sem divisão nenhuma ter acontecido. Medido no teste real de 02/10/2026.
 *
 * Um tomo só não é divisão: se o único declarado é o 1 e nenhum documento tem
 * sufixo de tomo, não há fileira de tomo — os documentos sem sufixo SÃO o
 * volume. Com dois tomos declarados (ou um documento já com sufixo), a regra
 * de antes vale: o sem-sufixo sobrou de antes da divisão.
 */
export function tomosDeFileira(declarados: readonly number[], idsDosArtefatos: readonly string[]): number[] {
  const unicos = [...new Set(declarados.filter((t) => t > 0))];
  const semDivisao = unicos.length === 1 && unicos[0] === 1 && idsDosArtefatos.length > 0 && idsDosArtefatos.every((id) => tomoDoArtefato(id) === 0);
  return semDivisao ? [] : unicos;
}
