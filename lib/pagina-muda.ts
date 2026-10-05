/**
 * A PÁGINA MUDA: tem conteúdo na folha e não entrega caractere nenhum.
 *
 * O caso que originou este módulo (02/09/2026) é o memorial da Passarela do
 * Canal da Barra, `114_19_VOLUME ÚNICO.pdf`. Ele passou pela auditoria e quase
 * nada foi encontrado. A medição:
 *
 *   31 páginas, 7.470 caracteres extraídos — 241 por página.
 *   16 páginas (52%) com ZERO caractere. 25 de 31 (81%) com menos de 200.
 *
 * Um memorial dessas 31 páginas entrega ~60 mil caracteres. Chegaram ~10%, e a
 * auditoria opinou sobre o documento com um décimo dele na mão.
 *
 * E NÃO É PÁGINA ESCANEADA — foi a suposição errada que atrasou o diagnóstico.
 * Rasterizadas, as páginas mudas são texto nítido, perfeitamente legível. O
 * texto está DESENHADO, não escrito:
 *
 *   p5, p7   `constructPath=74`, ZERO `beginText` — o texto virou curva vetorial
 *   p9       `paintImageXObject=24` — cada linha virou tira de imagem (944x92)
 *
 * Não é limitação do pdf.js: o `pdftotext` (poppler) nas páginas 7-9 devolve
 * três caracteres de quebra de página. O texto NÃO EXISTE COMO TEXTO no arquivo,
 * e nenhum ajuste em [[pdf-text.ts]] o recupera. Só relendo a folha com o olho —
 * que aqui é a visão do modelo.
 *
 * PURO de propósito: sem IA, sem rede, sem I/O. Ele só CLASSIFICA. Quem paga a
 * transcrição é [[transcricao-por-visao.ts]], e quem decide se paga é o
 * engenheiro, no portão da entrada.
 */
/*
 * O IMPORT É DE MÃO ÚNICA desde 05/10/2026: este módulo importa de
 * [[pdf-text.ts]], e [[pdf-text.ts]] só importa TIPO daqui (`TintaDaPagina`),
 * que some na compilação. Até ali ele importava `LIMIAR_DE_CARACTERES` para
 * medir a tinta só na página suspeita — e o ciclo só resolvia porque os dois
 * lados tocavam o importado dentro de funções. Hoje a tinta é medida em toda
 * página e o limiar não é mais preciso lá.
 *
 * Não reabra o ciclo importando VALOR deste módulo em [[pdf-text.ts]]: se
 * precisar, mova o valor para lá (como `imagensNaoLidas`).
 */
import {
  imagensNaoLidas,
  montarDocumento,
  type ExtractedPdf,
  type ExtractedPdfPage,
} from "./pdf-text.ts";

/**
 * O limiar de caracteres abaixo do qual a página é suspeita.
 *
 * MEDIDO no 114-19, e não chutado. As 6 páginas de texto real da capa ao anexo
 * entregam 359, 383, 756, 1.030, 1.216 e 3.350 caracteres. As 25 mudas entregam
 * 0, 24, 33 e 59 — os 24 são a legenda "Passarela Canal da Barra" sob uma
 * prancha de cálculo cujos rótulos inteiros estão em vetor.
 *
 * O vão entre 59 e 359 é largo, e 120 fica no meio dele. Um limiar mais alto
 * começaria a mandar folha de rosto legítima para a transcrição; mais baixo
 * deixaria a prancha de cálculo passar por lida.
 */
export const LIMIAR_DE_CARACTERES = 120;

/**
 * A VERSÃO DO TRANSCRITOR — a mesma ideia de `VERSAO_DO_LEITOR` do selo.
 *
 * SUBA ESTE NÚMERO ao mexer em qualquer coisa que mude o que sai da transcrição:
 * o prompt, o modelo padrão, a escala com que o cliente rasteriza a folha. A
 * chave do cache a carrega, então subir invalida tudo sozinho. Esquecer faz o
 * cache servir, calado, a transcrição de um transcritor que já se sabe errado —
 * e o sintoma aparece semanas depois, num projeto antigo que "voltou a errar o
 * que já tinha sido corrigido".
 *
 * MORA NESTE MÓDULO, e não em [[transcricao-por-visao.ts]] com o resto do
 * transcritor, porque quem a consome é o cache — que é do navegador. Lá ela
 * arrastava o `ai-runner` e o Prisma para o bundle do browser, e o build
 * quebrava tentando resolver `pg`, `dns` e `net`. Este módulo é puro: é o que
 * os dois lados podem compartilhar.
 */
export const VERSAO_DO_TRANSCRITOR = 1;

/**
 * A TINTA NA FOLHA: quanto a página manda desenhar, fora o texto.
 *
 * É o sinal que separa "muda" de "vazia", e sem ele o detector é um contador de
 * caracteres que pagaria transcrição por toda folha de separação em branco de
 * todo volume. Sai da mesma passada de extração — ver `extractPdfText`.
 */
export interface TintaDaPagina {
  /** Ops de caminho vetorial (`constructPath`). Texto virado curva mora aqui. */
  desenho: number;
  /** Ops de imagem (`paintImage*`). Linha de texto virada tira mora aqui. */
  imagem: number;
  /**
   * Quantas dessas imagens são GRANDES — cobrem ao menos
   * `FRACAO_DA_IMAGEM_GRANDE` da folha. Ver `imagensNaoLidas` em [[pdf-text.ts]].
   *
   * É o sinal da página PARCIALMENTE muda: tem texto acima do limiar, e por
   * isso passa por lida, mas um quadro ou figura dela está desenhado como
   * imagem. No 141-26 (05/10/2026) o Quadro de Áreas inteiro da p12 era uma
   * imagem de 849x945 px sob um título e dois parágrafos — e a auditoria
   * afirmou que a tabela não existia.
   *
   * Opcional: parecer antigo e fixture montada à mão não a têm, e ausência
   * aqui vale "não medido", nunca "tem imagem".
   */
  imagensGrandes?: number;
}

export type ClasseDaPagina =
  /** Entregou texto. É o caso normal, e a auditoria já a lê. */
  | "texto"
  /** Tem tinta na folha e não entregou texto. Vale pagar para reler. */
  | "muda"
  /** Nem texto nem tinta. Separador, verso em branco — não vale nada. */
  | "vazia";

export interface PaginaClassificada {
  pagina: number;
  classe: ClasseDaPagina;
  caracteres: number;
}

/**
 * Quanta tinta basta para a folha valer uma transcrição.
 *
 * 1 é de propósito. A alternativa seria calibrar um piso, e não há número
 * honesto para calibrar: a página 20 do 114-19 tem UMA imagem (o logo da
 * PROSUL) e um caminho, e mesmo assim carrega texto vetorial no corpo. Errar
 * para o lado de transcrever custa centavos; errar para o outro devolve ao
 * engenheiro o mesmo parecer cego que originou este módulo.
 */
const TINTA_MINIMA = 1;

/** A página tem alguma coisa desenhada nela? */
function temTinta(tinta: TintaDaPagina | undefined): boolean {
  if (!tinta) {
    /*
     * SEM MEDIÇÃO NÃO SE AFIRMA VAZIO. Fixture montada à mão e parecer antigo
     * não trazem `tinta`, e chamá-los de "vazia" faria o detector declarar
     * silenciosamente que não há nada a recuperar — a mesma classe de silêncio
     * que este módulo existe para acabar. Sem o sinal, a folha é suspeita.
     */
    return true;
  }
  return tinta.desenho + tinta.imagem >= TINTA_MINIMA;
}

export function classificarPagina(page: ExtractedPdfPage): PaginaClassificada {
  const caracteres = page.text.trim().length;

  /*
   * A FOLHA JÁ RELIDA NÃO VOLTA À FILA, por curta que seja a transcrição.
   *
   * O limiar mede a EXTRAÇÃO — ele decide se vale pagar para reler. Uma folha
   * com `origem: "visao"` já foi relida: se voltou com 27 caracteres, é porque
   * é o que está escrito nela (a prancha de cálculo do 114-19 tem só a legenda),
   * e mandá-la de novo pagaria a mesma chamada para receber a mesma resposta.
   *
   * Sem esta saída o dano ia além do desperdício. `contarPaginasDoDocumento`
   * soma as mudas com as transcritas, então uma folha que continuasse muda
   * depois de transcrita seria contada duas vezes: 25 mudas + 25 transcritas =
   * 50, menos 25 recuperadas = 25 pendentes. O parecer declararia o documento
   * inteiro por ler DEPOIS de a transcrição ter sido paga — e a auditoria teria
   * lido tudo. Apanhado por `scripts/prova-pagina-muda.ts` contra o arquivo real.
   */
  if (page.origem === "visao") {
    return { pagina: page.page, classe: "texto", caracteres };
  }

  if (caracteres >= LIMIAR_DE_CARACTERES) {
    return { pagina: page.page, classe: "texto", caracteres };
  }

  return {
    pagina: page.page,
    classe: temTinta(page.tinta) ? "muda" : "vazia",
    caracteres,
  };
}

export interface DiagnosticoDoDocumento {
  paginas: PaginaClassificada[];
  /** As páginas que valem transcrição, em ordem. É o que o portão mostra. */
  mudas: number[];
  /**
   * As páginas de TEXTO com figura ou quadro desenhado como imagem — o que a
   * extração entregou é verdade, mas não é a folha inteira.
   *
   * Lista separada de `mudas`, e não uma terceira classe, de propósito: a folha
   * tem texto próprio e a extração continua mandando nela (`aplicarTranscricao`
   * nunca escreve no `text` dela). O que estas páginas ganham é a marca no
   * texto da IA — ver `textoDaPaginaParaIA` — e a trava que impede afirmar a
   * ausência de um quadro que pode estar na imagem — ver [[audit-verify.ts]].
   * As que anunciam quadro (`quadrosEmImagem`) podem, além disso, ser
   * transcritas.
   */
  comImagemNaoLida: number[];
  /**
   * O subconjunto de `comImagemNaoLida` que ANUNCIA um quadro — ver
   * `paginasComQuadroEmImagem`. É o que o portão oferece transcrever junto com
   * as mudas.
   */
  quadrosEmImagem: number[];
  totalDePaginas: number;
}

/**
 * A LEGENDA DE QUADRO: a linha que COMEÇA com "Tabela N"/"Quadro N" e é título,
 * não frase.
 *
 * Medido no 141-26. Casam: "1.2 Tabela 2: Quadro de Áreas", "TABELA 11 - LARGURA
 * DAS LINHAS…", "TABELA 10 DEMOSTRATIVO…", "TABELA 20 – COORDENADAS", "TABELA 23"
 * sozinha. Não casam, e é de propósito: "A Tabela 3, a seguir, apresenta…" (a
 * menção no meio da frase — o quadro pode estar em qualquer lugar) e "Tabela 7."
 * (fim de frase quebrada na linha). Depois do número só se aceita fim de linha,
 * separador (`:`/`-`/`–`/`—`) ou título em CAIXA ALTA.
 */
const CABECA_DA_LEGENDA =
  /^\s*(?:\d+(?:\.\d+)*\.?\s+)?(?:tabela|quadro)\s+(?:n[º°o]\.?\s*)?\d+(?:\.\d+)*/i;
const RESTO_DA_LEGENDA = /^(?:\s*$|\s*[:\-–—]|\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2})/;

export function ehLegendaDeQuadro(linha: string): boolean {
  const cabeca = linha.match(CABECA_DA_LEGENDA);
  return Boolean(cabeca && RESTO_DA_LEGENDA.test(linha.slice(cabeca[0].length)));
}

/**
 * Quantas linhas do fim da folha anterior contam como "pé". O rodapé do
 * escritório ocupa 3 (obra, caminho do arquivo, direitos autorais); sobram 3
 * linhas de corpo para a legenda que ficou na folha de cima.
 */
const LINHAS_DO_PE = 6;

/** A folha traz, em alguma linha, a legenda de um quadro? */
export function anunciaQuadro(texto: string): boolean {
  return texto.split("\n").some(ehLegendaDeQuadro);
}

/** A legenda está no PÉ da folha (o quadro pode ter ido para a seguinte)? */
export function peAnunciaQuadro(texto: string): boolean {
  return texto
    .split("\n")
    .filter((l) => l.trim())
    .slice(-LINHAS_DO_PE)
    .some(ehLegendaDeQuadro);
}

/**
 * AS FOLHAS CUJO QUADRO ESTÁ EM IMAGEM — as únicas, além das mudas, que vão à
 * transcrição por visão.
 *
 * O caso (05/10/2026): 141-26, p12. O Quadro de Áreas é uma imagem sob a
 * legenda "1.2 Tabela 2: Quadro de Áreas", e a IA afirmava que a tabela não
 * existia. A folha tem imagem grande E anuncia um quadro — ou na própria folha,
 * ou na legenda que ficou no pé da folha anterior (quando essa não tem imagem
 * própria a que a legenda pertença).
 *
 * POR QUE NÃO TODA FOLHA COM IMAGEM GRANDE: medido no 141-26, são 53 de 174, e
 * a maioria é foto, pictograma ou planta (estruturas, elétrica, luminotécnico).
 * Pagar a visão nelas compra a transcrição de uma legenda. Com a legenda são
 * 20 folhas, e 17 delas têm de fato um quadro em imagem (Quadro de Áreas,
 * demonstrativo de pavimentação, as tabelas 11–26 da sinalização); as 3 que
 * sobram (p72, p73, p167) anunciam um quadro que está em texto ao lado de uma
 * figura — custo de uma folha cada, aceito.
 *
 * PURA e compartilhada: o portão do navegador e o servidor (que valida o que o
 * cliente manda em `aplicarTranscricao`) chamam a mesma função sobre o mesmo
 * texto (`textoDaFolha`).
 */
export function paginasComQuadroEmImagem(
  pages: readonly Pick<ExtractedPdfPage, "page" | "text" | "tinta" | "origem" | "textoDaImagem">[],
): number[] {
  return pages
    .filter((page, i) => {
      if (classificarPagina(page as ExtractedPdfPage).classe !== "texto") return false;
      if (imagensNaoLidas(page as ExtractedPdfPage) === 0) return false;
      if (anunciaQuadro(page.text)) return true;

      const anterior = pages[i - 1];
      if (!anterior || anterior.page !== page.page - 1) return false;
      if (imagensNaoLidas(anterior as ExtractedPdfPage) > 0) return false;
      return peAnunciaQuadro(anterior.text);
    })
    .map((page) => page.page);
}

export function diagnosticarPaginasMudas(extracted: ExtractedPdf): DiagnosticoDoDocumento {
  const paginas = extracted.pages.map(classificarPagina);
  const textos = new Set(paginas.filter((p) => p.classe === "texto").map((p) => p.pagina));

  return {
    paginas,
    mudas: paginas.filter((p) => p.classe === "muda").map((p) => p.pagina),
    comImagemNaoLida: extracted.pages
      .filter((page) => textos.has(page.page) && imagensNaoLidas(page) > 0)
      .map((page) => page.page),
    quadrosEmImagem: paginasComQuadroEmImagem(extracted.pages),
    totalDePaginas: extracted.pageCount,
  };
}

/** O que o cliente devolve depois de reler uma folha muda com o modelo. */
export interface PaginaTranscrita {
  pagina: number;
  texto: string;
}

/**
 * FUNDE a transcrição no documento extraído.
 *
 * A folha transcrita passa a ter texto como qualquer outra — os ~30 consumidores
 * de `ExtractedPdf` não sabem a diferença e não precisam saber — mas fica
 * MARCADA com `origem: "visao"`. A marca é o que impede o visor de tentar
 * grifar um trecho cuja coordenada não existe, e o que deixa a cobertura contar
 * a folha como recuperada em vez de lida.
 *
 * PURA, e é o que a torna testável sem rede: recebe o documento e os textos,
 * devolve o documento novo. Quem paga o modelo é a rota.
 *
 * SÓ ESCREVE ONDE ESTAVA MUDO. Uma transcrição que chegue apontando para uma
 * página com texto próprio é IGNORADA — a entrada vem do cliente, e sobrescrever
 * a extração com o que o cliente mandou seria deixar a evidência de todo achado
 * daquela folha ser ditada de fora. Transcrição vazia também não entra: ela
 * apagaria a página sem que ninguém pedisse.
 *
 * A FOLHA COM QUADRO EM IMAGEM (`paginasComQuadroEmImagem`) é o outro caso
 * aceito, e com destino diferente: ela tem texto próprio, que continua mandando.
 * A transcrição vai para `textoDaImagem` — só o texto da IA a lê, no lugar da
 * marca de imagem não lida —, e `text` não muda. Página que não é nem muda nem
 * quadro em imagem continua ignorada.
 */
export function aplicarTranscricao(
  extracted: ExtractedPdf,
  transcricoes: readonly PaginaTranscrita[],
): ExtractedPdf {
  if (transcricoes.length === 0) return extracted;

  const diagnostico = diagnosticarPaginasMudas(extracted);
  const mudas = new Set(diagnostico.mudas);
  const quadros = new Set(diagnostico.quadrosEmImagem);
  const porPagina = new Map<number, string>();
  for (const t of transcricoes) {
    const texto = t.texto.trim();
    if (texto && (mudas.has(t.pagina) || quadros.has(t.pagina))) porPagina.set(t.pagina, texto);
  }

  if (porPagina.size === 0) return extracted;

  const pages = extracted.pages.map((page): ExtractedPdfPage => {
    const texto = porPagina.get(page.page);
    if (!texto) return page;
    if (quadros.has(page.page)) return { ...page, textoDaImagem: texto };
    return { ...page, text: texto, origem: "visao" };
  });

  return montarDocumento(pages, extracted.pageCount);
}

/**
 * A FRASE DO PORTÃO. Existe aqui, e não na tela, porque é a mesma frase que o
 * parecer precisa quando a transcrição é RECUSADA — e duas redações do mesmo
 * fato divergem no dia em que uma delas for corrigida.
 *
 * Devolve "" quando não há página muda: o portão que fala sempre é ruído, como
 * o "ATENÇÃO" que tocava em toda auditoria antes de 18/08 (ver
 * [[resumo-do-esforco.ts]]).
 */
export function fraseDoDiagnostico(d: DiagnosticoDoDocumento): string {
  if (d.mudas.length === 0) return "";

  return (
    `${d.mudas.length} de ${d.totalDePaginas} páginas deste documento não têm texto: ` +
    "o conteúdo está desenhado na folha, não escrito. Sem transcrever, a auditoria não as lê."
  );
}
