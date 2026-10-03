/**
 * A FOTO DO QUE A AUDITORIA JÁ ACHOU, para a tela de auditoria em curso.
 *
 * O lab desenhou "Achados até agora" por nível (as faixas do parecer) e, em
 * cada nível, por tipo, ao lado do mapa das páginas com onde eles caem. O motor
 * só relatava a contagem de cada etapa; a tela do app, sem dado, mostrava
 * barras por etapa (Matheus, 02/10/2026: "o backend não acompanhava o front").
 *
 * A foto é ACUMULADA e vai inteira em cada marco: o store do cliente guarda o
 * último marco de cada (passada, estado), então uma foto parcial se perderia.
 * São os achados ANTES do segundo modelo — ele ainda pode derrubar alguns, e a
 * tela diz isso.
 *
 * PURO: recebe achados, devolve contagens.
 */
import { classifyFindingErrorType, getErrorTypeLabel, type AuditFinding } from "./audit-report.ts";
import { nivelDoAchado, type Nivel } from "./nivel-do-achado.ts";
import { paginasDoAchado } from "./paginas-do-achado.ts";

export interface ContaDosAchados {
  nivel: Nivel;
  /** O tipo na língua da tela ("Norma", "Identidade / documental"). */
  tipo: string;
  n: number;
}

export interface FotoDosAchados {
  achados: ContaDosAchados[];
  /** Achados por página (índice 0 = página 1). Vazio quando não se sabe o total. */
  porPagina: number[];
}

export function fotoDosAchados(achados: readonly AuditFinding[], totalDePaginas: number): FotoDosAchados {
  const contas = new Map<string, ContaDosAchados>();
  const porPagina = Array.from({ length: Math.max(0, totalDePaginas) }, () => 0);
  for (const a of achados) {
    const nivel = nivelDoAchado(a);
    // A gramática é leitura da faixa editorial (lib/nivel-do-achado.ts): o tipo
    // dela é um só, e o rótulo "Redação / editorial" a confundiria com a revisão.
    const tipo = nivel === "texto" ? "Redação e gramática" : getErrorTypeLabel(classifyFindingErrorType(a));
    const chave = `${nivel}|${tipo}`;
    const conta = contas.get(chave);
    if (conta) conta.n++;
    else contas.set(chave, { nivel, tipo, n: 1 });
    for (const p of paginasDoAchado({ pagina: a.pagina, referencia: a.referencia_comparada })) {
      if (p >= 1 && p <= porPagina.length) porPagina[p - 1]++;
    }
  }
  return { achados: [...contas.values()], porPagina };
}
