/**
 * A ESCADA DE FONTES da identidade do memorial (09/10/2026).
 *
 * Memorial de disciplina chega sem capa — a capa mora no GERAL. Cada campo
 * vem do degrau mais alto que o tiver: capa do próprio memorial > identidade
 * guardada do projeto > corpo (rodapé/"Obra:"), que é só SUGESTÃO. O usuário
 * fica acima de todos, mas a correção dele entra pela ficha
 * ([[ficha-do-memorial.ts]]), não por aqui.
 *
 * O CÓDIGO é outra escada: o nome do arquivo manda (é a chave do projeto), a
 * capa só confere, e o do corpo nunca vale — no 040-26 o rodapé trazia 125-23,
 * herdado de outro projeto.
 *
 * PURO.
 */
import { CAMPOS_DA_IDENTIDADE, type CampoDaIdentidade, type IdentidadeDoProjeto } from "./identidade-do-projeto.ts";

export type OrigemNaFicha = "usuario" | "capa" | "projeto" | "corpo" | "arquivo";
export type ValorComOrigem = { valor: string; origem: OrigemNaFicha; fonte?: string };
export type Escada = Record<CampoDaIdentidade, ValorComOrigem | null>;

const limpo = (v: string | undefined | null) => (v ?? "").trim();

export function escadaDaIdentidade(args: {
  codigoDoArquivo?: string;
  capa?: Partial<Record<CampoDaIdentidade, string>> | null;
  projeto?: IdentidadeDoProjeto | null;
  corpo?: Partial<Record<CampoDaIdentidade, string>>;
}): Escada {
  const escada = {} as Escada;
  for (const campo of CAMPOS_DA_IDENTIDADE) {
    if (campo === "codigo") {
      const doArquivo = limpo(args.codigoDoArquivo);
      const daCapa = limpo(args.capa?.codigo);
      escada.codigo = doArquivo
        ? { valor: doArquivo, origem: "arquivo" }
        : daCapa
          ? { valor: daCapa, origem: "capa" }
          : null;
      continue;
    }
    const daCapa = limpo(args.capa?.[campo]);
    const guardado = args.projeto?.campos[campo];
    const doCorpo = limpo(args.corpo?.[campo]);
    escada[campo] = daCapa
      ? { valor: daCapa, origem: "capa" }
      : guardado
        ? { valor: guardado.valor, origem: "projeto", fonte: guardado.fonte }
        : doCorpo
          ? { valor: doCorpo, origem: "corpo" }
          : null;
  }
  return escada;
}

/** O código que o CORPO cita, quando difere do nome do arquivo: sinal, não fato. */
export function sinalDeCodigoDoCorpo(doArquivo: string, doCorpo: string): string | null {
  const a = doArquivo.trim().replace("_", "-");
  const c = doCorpo.trim().replace("_", "-");
  if (!a || !c || a === c) return null;
  return `código do corpo (${c}) diverge do nome do arquivo (${a})`;
}
