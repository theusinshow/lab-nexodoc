/**
 * O PAYLOAD com que um item do plano é (ou foi) gerado.
 *
 * Mora num módulo próprio, com imports relativos, por dois motivos que são o
 * mesmo motivo: os testes da casa rodam `node scripts/*.ts` direto, sem
 * resolver o alias `@/`, e uma função que decide se um documento envelheceu
 * PRECISA ter teste. Ela saiu de `editar-artefato.ts` (que usa `@/`) para poder
 * ser exercitada.
 *
 * `opcoesDoTomo` veio junto porque `payloadDoItem` depende dela e deixá-la para
 * trás obrigaria a importar o módulo aliasado de volta.
 */
import { buildBalancedQuantities, planoPorDisciplina, repartirPorBlocos } from "../../../lib/ld/ld-rules.ts";
import { codigoNoVolume, repartirDaLista, type ParFundido } from "./blocos.ts";
import { codigoDaFolha } from "./disciplina-da-folha.ts";
import { nomesDoBloco } from "../../../server/nexo/titulos-do-bloco.ts";
import type { SeloForLd } from "../../../server/nexo/build-ld-proposal.ts";
import { gruposDasFolhas, type Folha } from "./folhas.ts";
import {
  assinaturaDoTomo,
  folhasDoTomo,
  precisaRespeitarOrdem,
} from "./drop-folhas.ts";

/** Um documento a gerar: o tipo, o tomo a que pertence e os params. */
export interface ItemDoPlano {
  kind: "capa" | "ld" | "separatriz";
  /** 0 = documento único (sem divisão em tomos). */
  tomoAtual: number;
  tomoNumero: number;
  sufixo: string;
  params: Record<string, unknown>;
  /** Rótulo curto para a barra de progresso ("Capa · TOMO 02"). */
  rotulo: string;
  /**
   * O BLOCO (disciplina) deste documento, quando o volume mistura disciplinas.
   *
   * Ausente = o volume é de uma disciplina só, e o documento cobre tudo — o
   * comportamento de sempre. Presente, a LD sai com o título e as folhas
   * daquela disciplina, e a separatriz com o nome dela: é a regra do
   * escritório, que emite uma de cada por disciplina dentro do volume.
   */
  bloco?: { codigo: string; rotulo: string; ids: string[]; codigos?: string[] };
  /**
   * Os pares juntados pelo engenheiro (09/10/2026). Viajam no item para o corte
   * de tomos tratar o par como uma disciplina só. NÃO entram no payload.
   */
  fundidos?: readonly ParFundido[];
}

export function opcoesDoTomo(
  selos: SeloForLd[],
  numTomos: number,
  tomoAtual: number,
  fundidos: readonly ParFundido[] = [],
): {
  doTomo: Folha[];
  opts: { folhasDoTomo?: string[]; respeitarOrdem?: boolean };
} {
  if (tomoAtual <= 0) return { doTomo: [], opts: {} };
  const projecao = selos as Folha[];
  // O par juntado é UMA disciplina para o corte: o tomo não o parte ao meio.
  const noVolume = codigoNoVolume(fundidos);
  const codigoDe = (f: Folha) => noVolume(codigoDaFolha(f));
  // O corte de tomo cai ENTRE disciplinas -- ver `repartirPorBlocos`.
  const divisao = gruposDasFolhas(
    projecao,
    numTomos,
    repartirDaLista(projecao, codigoDe, repartirPorBlocos, buildBalancedQuantities),
    // As disciplinas pequenas juntas, a grande separada — ver `planoPorDisciplina`.
    (l) => planoPorDisciplina(l.map(codigoDe)),
  );
  const doTomo = folhasDoTomo(projecao, divisao, tomoAtual);
  if (doTomo.length === 0) return { doTomo, opts: {} };
  return {
    doTomo,
    opts: {
      folhasDoTomo: doTomo.map((f) => f.id),
      // O carimbo continua mandando na ordem, salvo se o usuário reordenou
      // alguma folha DESTE tomo.
      respeitarOrdem: precisaRespeitarOrdem(doTomo),
    },
  };
}

/** As folhas que ESTE item lista: as do bloco quando há um, senão as do tomo. */
export function folhasDoItem(item: ItemDoPlano, selos: SeloForLd[]): Folha[] {
  const numTomos =
    typeof item.params.numTomos === "number" ? item.params.numTomos : 1;
  const { doTomo } = opcoesDoTomo(selos, numTomos, item.tomoAtual, item.fundidos);
  if (!item.bloco) return doTomo;
  const fonte = doTomo.length > 0 ? doTomo : (selos as Folha[]);
  return fonte.filter((f) => item.bloco!.ids.includes(f.id));
}

/**
 * Uma função só, de propósito. Ela é a chave da comparação que descobre que um
 * documento envelheceu: `estadoDoArtefato` compara LITERALMENTE, por JSON, o
 * payload guardado no resultado com o payload de agora. Se quem grava e quem
 * compara montassem o objeto de formas diferentes — uma chave a mais, uma
 * ordem diferente — todo artefato nasceria "pendente" e o card pediria para
 * gerar de novo para sempre.
 *
 * É pura: nenhum campo do payload vem da resposta do servidor. Foi isso que
 * permitiu extraí-la de `gerarItem` sem mudar comportamento.
 *
 * `null` = este item não produz documento (separatriz sem título nenhum).
 */
export function payloadDoItem(args: {
  item: ItemDoPlano;
  selos: SeloForLd[];
  /** A separatriz herda o título da capa — nunca deriva o seu. */
  tituloDaSeparatriz: string;
}): Record<string, unknown> | null {
  const { item, selos } = args;
  const p = item.params;
  const txt = (k: string) => String(p[k] ?? "");

  if (item.kind === "capa") {
    return { ...p, tomo: item.tomoNumero };
  }

  if (item.kind === "ld") {
    const doBloco = folhasDoItem(item, selos);
    /*
     * O nome de DOCUMENTO, não o de tela: a LD de um volume misto ia para o
     * cliente escrita "HIDROSSANITARIO" quando o escritório imprime "PROJETO DE
     * INSTALAÇÕES HIDROSSANITÁRIAS".
     */
    const titulo =
      // O titulo da LD leva o nome da CAPA; o longo e da separatriz.
      (item.bloco ? nomesDoBloco(item.bloco).capa : "") ||
      item.bloco?.rotulo.toUpperCase() ||
      txt("tituloLd");
    return {
      ...p,
      ...(item.bloco ? { tituloLd: titulo, bloco: item.bloco.codigo } : {}),
      tomo: item.tomoNumero,
      /*
       * A assinatura das folhas entra no payload: é comparando-a com a projeção
       * atual que o nó descobre que envelheceu. Sem ela, arrastar uma folha (ou
       * corrigir um título) deixaria esta LD descrevendo um conjunto que não
       * existe mais, sem nada na tela avisando.
       */
      folhas: assinaturaDoTomo(doBloco),
    };
  }

  const listados = Array.isArray(p.titulos)
    ? (p.titulos as unknown[]).map((t) => String(t ?? "").trim()).filter(Boolean)
    : [];
  const tituloSep =
    (item.bloco ? nomesDoBloco(item.bloco).separatriz : "") ||
    item.bloco?.rotulo.toUpperCase() ||
    args.tituloDaSeparatriz.trim();
  const titulos = listados.length > 0 ? listados : tituloSep ? [tituloSep] : [];
  if (titulos.length === 0) return null; // sem título não há separatriz — a capa manda nela
  return {
    titulo: titulos[0],
    tomo: item.tomoNumero,
    // Só com mais de uma: a chave a mais faria toda separatriz já gerada
    // parecer desatualizada (o estado do card compara o payload literalmente).
    ...(titulos.length > 1 ? { titulos } : {}),
    ...(item.bloco ? { bloco: item.bloco.codigo } : {}),
  };
}
