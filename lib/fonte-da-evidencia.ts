/**
 * DE QUAL ARQUIVO É ESTA EVIDÊNCIA — um resolvedor só para cartão, mapa e visor
 * (auditoria UX/UI, A02/A03).
 *
 * Havia três caminhos para a mesma pergunta, e eles discordavam:
 * - o palco escolhia "o primeiro arquivo com checksum" e o dava ao visor, mas
 *   passava ao mapa só o PDF LOCAL — com a auditoria reaberta noutra máquina, o
 *   visor abria a página e o mapa mostrava uma grade de falhas;
 * - o cartão do motor novo recebia `hasRevision: () => false` e dizia "arquivo
 *   indisponível" mesmo com o arquivo guardado;
 * - o achado legado caía no ÚNICO PDF disponível mesmo quando citava OUTRO
 *   arquivo pelo nome — mostrava a fonte errada com cara de certa.
 *
 * REGRAS, em ordem:
 * 1. Referência com hash (a revisão É o conteúdo): só o arquivo com ESSE hash.
 *    Hash sem arquivo correspondente = ausente. Nunca cai para o nome.
 * 2. Referência sem hash: o nome do arquivo, se houver EXATAMENTE um candidato.
 *    É fallback explícito (`criterio: "nome"`), e dois arquivos com o mesmo nome
 *    são ambíguos, não "o primeiro".
 * 3. Sem nome nenhum na referência (parecer antigo): o único arquivo do
 *    catálogo, se houver um só — e o critério diz isso.
 *
 * PURO e sem imports → roda em node cru (`npm run test:fonte-da-evidencia`).
 */

export type FonteDoCatalogo = {
  /** Nome do arquivo como o parecer o conhece. */
  nome: string;
  url: string;
  /** sha256 dos bytes, quando se sabe. É a identidade da revisão. */
  checksum: string | null;
  origem: "local" | "servidor";
};

export type ReferenciaDaEvidencia = {
  /** `revisionId` do motor novo; ausente no achado legado. */
  revisao?: string | null;
  /** Nome do arquivo citado (`fileName` do motor, `arquivo` do legado). */
  arquivo?: string | null;
};

export type FonteResolvida =
  | {
      tipo: "arquivo";
      fonte: FonteDoCatalogo;
      criterio: "revisao" | "nome" | "unico";
    }
  | {
      tipo: "ausente";
      motivo: "revisao-nao-guardada" | "arquivo-nao-guardado" | "ambiguo" | "sem-fontes";
      frase: string;
    };

const HASH = /[a-f0-9]{64}/i;

export function hashDaRevisao(revisao: string | null | undefined): string | null {
  const m = (revisao ?? "").match(HASH);
  return m ? m[0].toLowerCase() : null;
}

export function normalizarNomeDeArquivo(nome: string | null | undefined): string {
  return (nome ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/^.*[\\/]/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Junta local e servidor numa lista sem repetição. Mesmo checksum = mesmo
 * arquivo: fica o LOCAL (instantâneo, sem rede), com o checksum preservado.
 */
export function catalogoDeFontes(fontes: readonly FonteDoCatalogo[]): FonteDoCatalogo[] {
  const saida: FonteDoCatalogo[] = [];
  for (const f of fontes) {
    const checksum = f.checksum ? f.checksum.toLowerCase() : null;
    const igual = checksum ? saida.findIndex((x) => x.checksum === checksum) : -1;
    if (igual >= 0) {
      if (f.origem === "local" && saida[igual].origem !== "local") {
        saida[igual] = { ...f, checksum };
      }
      continue;
    }
    // Sem checksum, o mesmo nome e a mesma origem é repetição de verdade.
    if (
      !checksum &&
      saida.some(
        (x) =>
          !x.checksum &&
          x.origem === f.origem &&
          normalizarNomeDeArquivo(x.nome) === normalizarNomeDeArquivo(f.nome),
      )
    ) {
      continue;
    }
    saida.push({ ...f, checksum });
  }
  return saida;
}

export function resolverFonte(
  ref: ReferenciaDaEvidencia,
  catalogo: readonly FonteDoCatalogo[],
): FonteResolvida {
  if (catalogo.length === 0) {
    return {
      tipo: "ausente",
      motivo: "sem-fontes",
      frase: "Nenhum arquivo desta auditoria está disponível nesta tela.",
    };
  }

  const hash = hashDaRevisao(ref.revisao);
  if (hash) {
    const fonte = catalogo.find((f) => f.checksum === hash);
    return fonte
      ? { tipo: "arquivo", fonte, criterio: "revisao" }
      : {
          tipo: "ausente",
          motivo: "revisao-nao-guardada",
          frase:
            "A revisão citada não está entre os arquivos guardados desta auditoria — nenhum outro arquivo foi aberto no lugar.",
        };
  }

  const nome = normalizarNomeDeArquivo(ref.arquivo);
  if (nome) {
    /*
     * Igual primeiro; se nenhum, o nome citado que CONTÉM o do arquivo (o
     * parecer às vezes escreve "117_25_md.pdf (p. 3)") — a regra antiga de
     * `findPdfSource`, mantida. Em ambos, candidato único ou nada.
     */
    const iguais = catalogo.filter((f) => normalizarNomeDeArquivo(f.nome) === nome);
    const candidatos = iguais.length
      ? iguais
      : catalogo.filter((f) => {
          const n = normalizarNomeDeArquivo(f.nome);
          return n.length > 0 && nome.includes(n);
        });
    const distintos = catalogoDeFontes(candidatos);
    if (distintos.length === 1) return { tipo: "arquivo", fonte: distintos[0], criterio: "nome" };
    if (distintos.length > 1) {
      return {
        tipo: "ausente",
        motivo: "ambiguo",
        frase: `Há mais de uma revisão de ${ref.arquivo} guardada, e a referência não diz qual.`,
      };
    }
    return {
      tipo: "ausente",
      motivo: "arquivo-nao-guardado",
      frase: `${ref.arquivo} não está entre os arquivos disponíveis desta auditoria.`,
    };
  }

  return catalogo.length === 1
    ? { tipo: "arquivo", fonte: catalogo[0], criterio: "unico" }
    : {
        tipo: "ausente",
        motivo: "ambiguo",
        frase: "O achado não diz de qual arquivo é, e esta auditoria tem mais de um.",
      };
}

const CHECKSUM = /^[a-f0-9]{64}$/i;

/**
 * O CATÁLOGO DE UM PARECER: as revisões que foram AUDITADAS.
 *
 * Quando o servidor diz quais arquivos a auditoria leu, só eles entram — o
 * memorial local substitui a URL de um deles apenas se tiver o MESMO hash. Um
 * memorial trocado depois da auditoria (mesmo nome, bytes novos) é outra
 * revisão, e abri-lo como evidência mostraria texto que o auditor nunca leu.
 *
 * Sem a lista do servidor (parecer anterior ao armazenamento de arquivos), o
 * local é o que há, e entra como está.
 */
export function catalogoDoParecer(args: {
  local: { nome: string; url: string; checksum: string | null } | null;
  auditados: readonly { fileName: string; checksumSha256: string | null }[];
}): FonteDoCatalogo[] {
  const auditados = args.auditados.filter((a) => CHECKSUM.test((a.checksumSha256 ?? "").trim()));
  const local = args.local;
  if (auditados.length === 0) {
    return local ? [{ ...local, checksum: local.checksum?.toLowerCase() ?? null, origem: "local" }] : [];
  }
  return catalogoDeFontes(
    auditados.map((a) => {
      const checksum = (a.checksumSha256 ?? "").trim().toLowerCase();
      return local && local.checksum?.toLowerCase() === checksum
        ? { nome: a.fileName || local.nome, url: local.url, checksum, origem: "local" as const }
        : { nome: a.fileName, url: `/api/arquivos/${checksum}`, checksum, origem: "servidor" as const };
    }),
  );
}
