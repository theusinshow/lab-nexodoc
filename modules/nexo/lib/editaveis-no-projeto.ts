/**
 * A TRAVA DO VOLUME: o PDF só sai depois que os editáveis foram salvos.
 *
 * O Nexo gerava capa, LD e separatriz em ODT e ninguém os levava para a pasta
 * do projeto — o PDF do volume era entregue e o editável morria no IndexedDB de
 * um navegador. Quando alguém precisava mexer numa vírgula da separatriz, não
 * havia de onde partir. Ver docs/superpowers/specs/2026-09-29-editaveis-na-pasta-design.md.
 *
 * Só regra aqui, sem DOM e sem alias `@/`: `node scripts/*.ts` carrega direto.
 */

/** O registro de que os editáveis foram salvos, guardado na conversa. */
export interface EditaveisSalvos {
  /** Nome da pasta no antigo modo "pasta". "" no ZIP. */
  pasta: string;
  quando: number;
  /** "zip" = baixado, o usuário move à mão (único caminho). "pasta" só em registros antigos. */
  modo: "pasta" | "zip";
  /** Os nomes que foram gravados (ou entraram no ZIP). */
  arquivos: string[];
  /** `assinaturaDosDocumentos` no instante em que salvou. */
  assinatura: string;
}

/** O mínimo de um resultado que a regra precisa. */
export interface ResultadoAssinavel {
  artifactId: string;
  kind: string;
  generatedAt?: number;
}

/** Os documentos que viram editável na pasta. O volume NÃO: ele é o PDF. */
const DOCUMENTOS = new Set(["capa", "ld", "separatriz"]);

/**
 * Qual versão de capa, LD e separatriz existe agora. Regerar qualquer um muda
 * a assinatura — e os ODTs que estão na pasta passam a ser de outra versão.
 *
 * O volume fica fora de propósito: remontá-lo (uma prancha trocada) não mexe
 * no que está nos editáveis, e cobrar salvar de novo ensinaria a ignorar a trava.
 */
export function assinaturaDosDocumentos(results: readonly ResultadoAssinavel[]): string {
  return results
    .filter((r) => DOCUMENTOS.has(r.kind))
    .map((r) => `${r.artifactId}@${r.generatedAt ?? 0}`)
    .sort()
    .join("|");
}

export interface Liberacao {
  liberado: boolean;
  /** Por que está travado, pronto para a tela. `null` quando liberado. */
  motivo: string | null;
}

export const MOTIVO_NAO_SALVOU =
  "Baixe os editáveis (ZIP) antes de baixar o volume.";
export const MOTIVO_ENVELHECEU =
  "A capa, a LD ou a separatriz mudou depois do ZIP — baixe os editáveis de novo.";

export function liberacaoDoVolume(
  salvos: EditaveisSalvos | null | undefined,
  results: readonly ResultadoAssinavel[],
): Liberacao {
  if (!salvos) return { liberado: false, motivo: MOTIVO_NAO_SALVOU };
  if (salvos.assinatura !== assinaturaDosDocumentos(results)) {
    return { liberado: false, motivo: MOTIVO_ENVELHECEU };
  }
  return { liberado: true, motivo: null };
}
