/**
 * ONDE O ACHADO APARECE — todas as páginas, e não só a primeira.
 *
 * O motor manda "uma ocorrência, um achado" e só junta quando UMA decisão
 * resolve todas (convenção de unidade, nomenclatura, regra de prevalência).
 * Nessa exceção as páginas SÃO capturadas — as regras determinísticas escrevem
 * em `referencia_comparada` frases como "7 ocorrências, páginas 8, 60, 71, 105".
 *
 * E a tela descartava. Ela renderizava `conflito || referencia`, e como
 * `conflito` quase sempre está preenchido, as outras páginas nunca chegavam ao
 * olho de ninguém. Quem lia corrigia a página 8, marcava resolvido, e o
 * documento continuava errado em três lugares.
 *
 * Este módulo é a leitura desse dado. PURO: nenhum IO, nenhum React, e por isso
 * testável sem navegador nem banco.
 */

/** Páginas plausíveis num documento de obra. Acima disto é ano, valor ou norma. */
const PAGINA_MAXIMA = 2000;

/**
 * Um intervalo "12-15" vira 12, 13, 14, 15 — mas só até aqui. "1-1200" quase
 * nunca é intervalo de páginas; é numeração de item, faixa de norma ou preço.
 */
const MAIOR_INTERVALO = 40;

export function paginasDoAchado(args: {
  /** O campo `pagina`: "8", "8, 60", "12-15", "pág. 8". */
  pagina?: string | null;
  /** `referencia_comparada`, onde as regras escrevem a frase com as páginas. */
  referencia?: string | null;
  /**
   * Prosa do achado — `conflito`, `descricao`, `evidencia` — onde a IA escreve
   * "(pág. 10) × (pág. 22)" sem repetir no campo `pagina`. Só entra o número
   * colado a "pág."/"página"/"p.": número solto em prosa é norma, valor ou item.
   */
  textos?: readonly (string | null | undefined)[];
}): number[] {
  const daPagina = extrair(args.pagina ?? "");

  /*
   * A REFERÊNCIA SÓ ENTRA quando ela FALA de página.
   *
   * O campo é prosa livre: "Identidade predominante: PROSUL (7 ocorrências)",
   * "Capítulo esperado: 4", "Itens identificados: 2.1, 3.4". Varrer número solto
   * dali encheria a fita de páginas que não existem — e uma fita errada é pior
   * que fita nenhuma, porque cada número dela é um link que leva ao lugar errado.
   */
  const daReferencia = mencionaPagina(args.referencia ?? "")
    ? extrair(recortarTrechoDePaginas(args.referencia ?? ""))
    : [];

  /*
   * O ACHADO ENTRE PÁGINAS QUE SÓ A PROSA CONTA (05/10/2026, 141-26): a IA
   * gravava `pagina: "10"` e escrevia no conflito "Prefeitura (pág. 10) ×
   * contratada (pág. 22)". O cartão mostrava só a p. 10, e quem abria não via a
   * outra metade do defeito.
   */
  const daProsa = (args.textos ?? []).flatMap((t) => paginasCitadas(t ?? ""));

  const todas = [...daPagina, ...daReferencia, ...daProsa].filter(
    (n) => Number.isInteger(n) && n >= 1 && n <= PAGINA_MAXIMA,
  );

  /*
   * A PRIMEIRA É A DO CAMPO `pagina`, e a ordem depois é crescente.
   *
   * A tela destaca a primeira como "a principal" — é onde o pin do PDF já
   * aponta hoje. Ordenar tudo faria a principal virar outra sempre que a
   * referência citasse uma página menor, e o destaque passaria a discordar do
   * que o resto da tela faz.
   */
  const principal = todas[0];
  const resto = [...new Set(todas.slice(1))].filter((n) => n !== principal).sort((a, b) => a - b);

  return principal === undefined ? [] : [principal, ...resto];
}

/** Um achado que aparece em mais de um lugar muda como a tela o apresenta. */
export function ehMultiPagina(paginas: number[]) {
  return paginas.length > 1;
}

/**
 * "4 páginas" em vez de "página 8" — a mudança mais barata da tela, e a que
 * mais muda comportamento: avisa, antes de qualquer texto, que corrigir um
 * lugar não encerra o assunto.
 */
export function rotuloDePaginas(paginas: number[], paginaCrua?: string | null) {
  if (paginas.length === 0) return paginaCrua?.trim() || "sem página";
  if (paginas.length === 1) return `página ${paginas[0]}`;

  return `${paginas.length} páginas`;
}

/** "pág. 10", "página 22", "páginas 10 e 22", "p. 12", "pp. 3-5" → os números. */
const PAGINA_CITADA = /(?<![\p{L}\d])(?:p[áa]g(?:ina)?s?\.?|pp?\.)\s*(\d{1,4}(?:\s*(?:,|e|a|-|–|\/)\s*\d{1,4})*)/giu;

export function paginasCitadas(texto: string): number[] {
  const saida: number[] = [];
  for (const m of texto.matchAll(PAGINA_CITADA)) saida.push(...extrair(m[1].replace(/\s+e\s+/g, ", ")));
  return saida;
}

function mencionaPagina(valor: string) {
  return /\bp[áa]g(?:s|inas?)?\b|\bp\.\s*\d/i.test(valor);
}

/**
 * Recorta do "páginas" até o fim da enumeração.
 *
 * "Identidade predominante: PROSUL (7 ocorrências, páginas 8, 60, 71)" tem um
 * 7 antes que NÃO é página. Cortar a partir da palavra é o que separa a
 * enumeração do resto da frase.
 */
function recortarTrechoDePaginas(valor: string) {
  const inicio = valor.search(/\bp[áa]g(?:s|inas?)?\b|\bp\.\s*\d/i);
  if (inicio < 0) return "";

  const daPalavra = valor.slice(inicio);
  // A enumeração termina no primeiro ponto final ou fecha-parênteses.
  const fim = daPalavra.search(/[).;]|\.\s/);

  return fim < 0 ? daPalavra : daPalavra.slice(0, fim);
}

function extrair(valor: string): number[] {
  const encontradas: number[] = [];

  // Intervalos primeiro: "12-15" tem que virar 12..15, e não os números 12 e 15.
  const semIntervalos = valor.replace(/(\d{1,4})\s*[-–—a]\s*(\d{1,4})/g, (todo, de, ate) => {
    const inicio = Number(de);
    const fim = Number(ate);

    if (fim <= inicio || fim - inicio > MAIOR_INTERVALO) return todo;

    for (let n = inicio; n <= fim; n += 1) encontradas.push(n);

    return " ";
  });

  for (const achado of semIntervalos.matchAll(/\d{1,4}/g)) {
    encontradas.push(Number(achado[0]));
  }

  return encontradas;
}
