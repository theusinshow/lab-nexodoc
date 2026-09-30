/**
 * AS PRANCHAS REANEXADAS numa conversa que já tem os documentos.
 *
 * Os bytes das pranchas não sobrevivem ao F5 nem à troca de conversa (só os
 * selos lidos e os artefatos voltam). No dia seguinte o card do volume pede
 * "reanexe-os para montar" — e reanexar caía no caminho do lote novo: "Anexei
 * N folhas", a ficha e de novo "Criar a LD e a capa", perguntando prefeitura e
 * centro de custo de um volume que já tinha capa, LD e separatriz prontas.
 * Relatado em 30/09/2026.
 *
 * Reanexar é devolver os arquivos, não pedir de novo. Quando TODAS as páginas
 * de TODOS os PDFs soltos já estão lidas nesta conversa, e ela já tem
 * documentos gerados, o Nexo só guarda os bytes de volta e avisa.
 *
 * Só regra aqui, sem DOM e sem alias `@/`: `node scripts/*.ts` carrega direto.
 */

/** O mínimo de um selo lido que a regra precisa. */
export interface FolhaLida {
  fileName: string;
  pageNumber: number;
  pageCount: number;
}

/** Os documentos que tornam o reanexo um "devolver os arquivos". */
const DOCUMENTOS = new Set(["capa", "ld", "separatriz", "volume"]);

/**
 * `true` quando cada arquivo solto já tem TODAS as páginas lidas nesta
 * conversa (casado pelo nome, que é como o volume acha a prancha do tomo).
 * Um arquivo desconhecido, ou com página faltando, manda o lote inteiro para
 * a leitura normal — que já pula o que foi lido.
 */
export function pranchasJaLidas(
  nomes: readonly string[],
  selos: readonly FolhaLida[],
): boolean {
  if (nomes.length === 0) return false;
  return nomes.every((nome) => {
    const doArquivo = selos.filter((s) => s.fileName === nome);
    if (doArquivo.length === 0) return false;
    const total = Math.max(...doArquivo.map((s) => s.pageCount));
    const paginas = new Set(doArquivo.map((s) => s.pageNumber));
    for (let p = 1; p <= total; p++) if (!paginas.has(p)) return false;
    return true;
  });
}

/** A conversa já gerou capa, LD, separatriz ou volume? */
export function temDocumentosGerados(results: readonly { kind: string }[]): boolean {
  return results.some((r) => DOCUMENTOS.has(r.kind));
}

/** A frase do Nexo quando só devolveu os arquivos. */
export function avisoDePranchasDevolvidas(quantas: number): string {
  const arquivos = quantas === 1 ? "o arquivo da prancha" : `os ${quantas} arquivos das pranchas`;
  return (
    `Recebi de volta ${arquivos}. As folhas já estavam lidas nesta conversa e a capa, ` +
    "a LD e a separatriz continuam valendo — não li de novo nem refiz nada. Já dá para montar o volume."
  );
}
