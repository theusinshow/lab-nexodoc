/**
 * O TEXTO CORRIGIDO DO ACHADO — a parte que não precisa de IA.
 *
 * O engenheiro abre o achado, clica em "texto corrigido" e recebe dois textos:
 * o que procurar no ODT (Ctrl+F) e o que colar por cima. A IA propõe; este
 * arquivo decide QUEM pode pedir e SE a proposta vale. Puro, sem imports, para
 * rodar no node dos testes sem empacotador.
 *
 * Três decisões, todas medidas ou combinadas em 29/09/2026:
 *
 * - QUEM SE QUALIFICA é o achado com 1 ou 2 citações na evidência. Nos 324
 *   achados das 8 auditorias mais recentes de produção: 46% têm uma, 30% têm
 *   duas, 21% três ou mais e 3% nenhuma. Duas citações costumam ser o trecho
 *   errado e o trecho que prova o certo ("60x40m" ao lado de "60x40mm") — o
 *   melhor caso, e a regra "exatamente uma" o deixava de fora. Três ou mais é
 *   conflito espalhado: aí o "O que fazer" já é a resposta.
 *
 * - O "PROCURE POR" TEM DE ESTAR DENTRO DE UMA CITAÇÃO. É ele que a pessoa
 *   cola no Ctrl+F. Se a IA o inventar, a busca não acha nada — ou pior, acha
 *   outro lugar parecido.
 *
 * - NENHUM NÚMERO NOVO SEM FONTE. Reescrever um trecho é a oportunidade de a IA
 *   trocar "1,58" por "1,50" em silêncio. Número que aparece no texto novo e
 *   não no antigo só passa se estiver escrito no "O que fazer" ou numa das
 *   citações; número que some do texto é recusado.
 */

/**
 * A VERSÃO DO QUE FOI GRAVADO. Subir quando mudar o prompt, o modelo ou a
 * trava: o texto fica gravado no achado, e sem versão a regra nova nunca
 * alcançaria quem já clicou — a mesma armadilha do cache de leitura de selo.
 * 1 = 29/09/2026, com a ampliação de contexto para o Ctrl+F.
 */
export const VERSAO_DO_TEXTO_CORRIGIDO = 1;

export type TextoCorrigido =
  | {
      tipo: "troca";
      procure_por: string;
      substitua_por: string;
      modelo: string;
      geradoEm: string;
      versao?: number;
    }
  | {
      /** A IA disse que não há troca simples, ou a trava recusou a proposta. */
      tipo: "sem-troca";
      motivo: string;
      modelo: string;
      geradoEm: string;
      versao?: number;
    };

/** O texto gravado ainda vale? Gravado por uma versão anterior, não. */
export function textoAindaVale(texto: TextoCorrigido | null | undefined): texto is TextoCorrigido {
  return Boolean(texto) && texto!.versao === VERSAO_DO_TEXTO_CORRIGIDO;
}

/** O mínimo do achado que esta decisão lê — serve ao parecer e à tela. */
export type AchadoParaCorrigir = {
  evidencia?: string | null;
};

export const MAXIMO_DE_CITACOES = 2;

/**
 * As citações entre aspas da evidência, na ordem em que aparecem.
 *
 * Aspas curvas (“ ”) e retas ("). Menos de 3 caracteres não é citação — é aspa
 * solta de polegada ou de apelido.
 */
export function extrairCitacoes(evidencia: string | null | undefined): string[] {
  if (!evidencia) return [];
  const citacoes: string[] = [];
  // `(?<!\d)`: em `tubo de 1" e 2"` a aspa reta é polegada, não abre citação.
  const padrao = /“([^”]{3,})”|(?<!\d)"([^"]{3,})"/g;
  for (const m of evidencia.matchAll(padrao)) {
    const texto = (m[1] ?? m[2] ?? "").trim();
    if (texto.length >= 3) citacoes.push(texto);
  }
  return citacoes;
}

export function podeGerarTextoCorrigido(achado: AchadoParaCorrigir): boolean {
  const n = extrairCitacoes(achado.evidencia).length;
  return n >= 1 && n <= MAXIMO_DE_CITACOES;
}

/** Espaço em branco colapsado: o PDF quebra linha onde o modelo põe espaço. */
function normalizarEspacos(texto: string) {
  return texto.replace(/\s+/g, " ").trim();
}

/** Números como aparecem no memorial: 1,58 · 60x40 vira 60 e 40 · 1.234,5. */
export function numerosDo(texto: string): string[] {
  return texto.match(/\d+(?:[.,]\d+)*/g) ?? [];
}

function contar(lista: string[]) {
  const mapa = new Map<string, number>();
  for (const item of lista) mapa.set(item, (mapa.get(item) ?? 0) + 1);
  return mapa;
}

export type PropostaDaIa = {
  pode_trocar: boolean;
  procure_por: string;
  substitua_por: string;
  motivo: string;
};

export type Julgamento =
  | { ok: true; procure_por: string; substitua_por: string }
  | { ok: false; motivo: string };

/**
 * A TRAVA. Recebe o que a IA devolveu e o achado, e diz se a troca é segura.
 *
 * Quando recusa, o motivo é escrito para a pessoa ler na caixa — não para log.
 */
export function julgarProposta(args: {
  proposta: PropostaDaIa;
  evidencia: string;
  oQueFazer: string;
}): Julgamento {
  const { proposta } = args;

  if (!proposta.pode_trocar) {
    return {
      ok: false,
      motivo:
        normalizarEspacos(proposta.motivo) ||
        "Este achado não tem um trecho simples para trocar; siga o que fazer acima.",
    };
  }

  const procure = normalizarEspacos(proposta.procure_por);
  const substitua = normalizarEspacos(proposta.substitua_por);
  const citacoes = extrairCitacoes(args.evidencia).map(normalizarEspacos);

  if (!procure || !substitua) {
    return { ok: false, motivo: "A IA não devolveu os dois textos da troca." };
  }

  if (!citacoes.some((c) => c.includes(procure))) {
    return {
      ok: false,
      motivo: "O trecho proposto não está na evidência do achado, então a busca no ODT não o acharia.",
    };
  }

  if (procure === substitua) {
    return { ok: false, motivo: "A IA não encontrou o que mudar no trecho." };
  }

  /*
   * TETO DE TAMANHO: a troca é do menor pedaço com o erro. Um texto novo muito
   * maior que o antigo é reescrita, e reescrita é onde o conteúdo técnico muda
   * sem ninguém pedir.
   */
  if (substitua.length > procure.length * 3 + 80) {
    return {
      ok: false,
      motivo: "A proposta reescrevia bem mais do que o trecho com o erro; confira à mão.",
    };
  }

  const antes = contar(numerosDo(procure));
  const depois = contar(numerosDo(substitua));
  const fontes = new Set([
    ...numerosDo(args.oQueFazer),
    ...citacoes.flatMap((c) => numerosDo(c)),
  ]);

  const novos = [...depois].filter(([numero, vezes]) => vezes > (antes.get(numero) ?? 0));

  for (const [numero] of novos) {
    if (!fontes.has(numero)) {
      return {
        ok: false,
        motivo: `A proposta trazia o número ${numero}, que não aparece no achado; confira o valor no projeto.`,
      };
    }
  }

  /*
   * TROCAR UM VALOR só quando o "O que fazer" escreve o valor novo. Um número
   * que some sem que o achado mande pôr outro no lugar é conteúdo apagado.
   */
  const ditosNaAcao = new Set(numerosDo(args.oQueFazer));
  const trocaPedida = novos.length > 0 && novos.every(([numero]) => ditosNaAcao.has(numero));
  for (const [numero, vezes] of antes) {
    if ((depois.get(numero) ?? 0) < vezes && !trocaPedida) {
      return {
        ok: false,
        motivo: `A proposta apagava o número ${numero} do trecho; confira à mão.`,
      };
    }
  }

  const citacao = citacoes.find((c) => c.includes(procure))!;
  return { ok: true, ...ampliarContexto(citacao, procure, substitua) };
}

/** Abaixo disto o Ctrl+F acha o trecho errado junto com o certo. */
export const MINIMO_PARA_BUSCA = 25;

/**
 * O TRECHO CURTO DEMAIS PARA O CTRL+F.
 *
 * Medido na primeira corrida real (29/09/2026, INC-003): a IA devolveu
 * "60x40m" → "60x40mm". Correto e mínimo — e inútil na busca, porque "60x40m"
 * também casa dentro de "60x40mm", que é justamente o trecho CERTO do mesmo
 * documento. Pedir contexto no prompt é torcer; aqui o contexto vem da própria
 * citação, palavra a palavra, alternando esquerda e direita, e a mesma moldura
 * é aplicada ao texto novo. Nada que a IA escreveu é tocado.
 */
export function ampliarContexto(
  citacao: string,
  procure: string,
  substitua: string,
  minimo = MINIMO_PARA_BUSCA,
): { procure_por: string; substitua_por: string } {
  const i = citacao.indexOf(procure);
  if (i < 0) return { procure_por: procure, substitua_por: substitua };

  let s = i;
  let e = i + procure.length;
  // Palavra cortada ao meio não se procura: primeiro, até as bordas da palavra.
  while (s > 0 && !/\s/.test(citacao[s - 1])) s--;
  while (e < citacao.length && !/\s/.test(citacao[e])) e++;

  const paraEsquerda = () => {
    while (s > 0 && /\s/.test(citacao[s - 1])) s--;
    while (s > 0 && !/\s/.test(citacao[s - 1])) s--;
  };
  const paraDireita = () => {
    while (e < citacao.length && /\s/.test(citacao[e])) e++;
    while (e < citacao.length && !/\s/.test(citacao[e])) e++;
  };

  while (e - s < minimo && (s > 0 || e < citacao.length)) {
    if (s > 0) paraEsquerda();
    if (e - s < minimo && e < citacao.length) paraDireita();
  }

  return {
    procure_por: citacao.slice(s, e),
    substitua_por: citacao.slice(s, i) + substitua + citacao.slice(i + procure.length, e),
  };
}

export type Trecho = { texto: string; mudou: boolean };

/**
 * O GRIFO: o que mudou, palavra a palavra, pelos dois lados.
 *
 * LCS sobre palavras — trechos são curtos (uma frase), então o quadrático não
 * pesa. Palavra, e não letra: "60x40m" → "60x40mm" grifa o token inteiro, que é
 * o que o olho precisa achar.
 */
export function diferencaPorPalavra(antes: string, depois: string): {
  antes: Trecho[];
  depois: Trecho[];
} {
  const a = antes.split(/(\s+)/).filter((p) => p.length > 0);
  const b = depois.split(/(\s+)/).filter((p) => p.length > 0);
  const tabela: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );

  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      tabela[i][j] =
        a[i] === b[j] ? tabela[i + 1][j + 1] + 1 : Math.max(tabela[i + 1][j], tabela[i][j + 1]);
    }
  }

  const ladoA: Trecho[] = [];
  const ladoB: Trecho[] = [];
  const empurrar = (lado: Trecho[], texto: string, mudou: boolean) => {
    const ultimo = lado.at(-1);
    // Espaço entre duas palavras mudadas fica dentro do mesmo grifo.
    const eEspaco = /^\s+$/.test(texto);
    if (ultimo && (ultimo.mudou === mudou || (eEspaco && ultimo.mudou))) {
      ultimo.texto += texto;
    } else {
      lado.push({ texto, mudou: eEspaco ? false : mudou });
    }
  };

  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      empurrar(ladoA, a[i], false);
      empurrar(ladoB, b[j], false);
      i++;
      j++;
    } else if (tabela[i + 1][j] >= tabela[i][j + 1]) {
      empurrar(ladoA, a[i], true);
      i++;
    } else {
      empurrar(ladoB, b[j], true);
      j++;
    }
  }
  while (i < a.length) empurrar(ladoA, a[i++], true);
  while (j < b.length) empurrar(ladoB, b[j++], true);

  return { antes: aparar(ladoA), depois: aparar(ladoB) };
}

/** Espaço grudado no fim de um grifo sai do grifo — senão o realce "vaza". */
function aparar(lado: Trecho[]): Trecho[] {
  const saida: Trecho[] = [];
  for (const t of lado) {
    if (t.mudou) {
      const m = t.texto.match(/^([\s\S]*?)(\s*)$/);
      const corpo = m?.[1] ?? t.texto;
      const cauda = m?.[2] ?? "";
      if (corpo) saida.push({ texto: corpo, mudou: true });
      if (cauda) saida.push({ texto: cauda, mudou: false });
    } else {
      saida.push(t);
    }
  }
  return saida;
}
