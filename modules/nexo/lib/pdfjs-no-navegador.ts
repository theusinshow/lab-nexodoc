"use client";

/**
 * O pdf.js DO NAVEGADOR, carregado uma vez — e a medida que não depende de
 * desenhar nada.
 *
 * `loadPdfjs` morava privado em `pagina-muda-render.ts` e em `selo-render.ts`,
 * idêntico nos dois. Com o pré-voo do anexo precisando do mesmo carregamento e
 * da mesma medida de tinta, a terceira cópia seria a que um dia divergiria — e
 * a divergência apareceria como o worker configurado num caminho e não no
 * outro, que só falha depois do deploy.
 *
 * `selo-render.ts` NÃO foi rewirado, de propósito: é o caminho da leitura de
 * selo, e trocar o carregador dele não serve a nenhum objetivo em curso. Ficam
 * duas cópias em vez de três, e a próxima a chegar já tem endereço.
 */

import { contarTinta, type ContagemDeTinta } from "@/lib/tinta-da-folha";

export type PdfjsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let pdfjsPromise: Promise<PdfjsModule> | null = null;

export async function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjs) => {
      /*
       * O `workerSrc` SÓ NO NAVEGADOR, e isto foi aprendido tentando.
       *
       * `new URL("pdfjs-dist/...", import.meta.url)` é uma forma que o bundler
       * do Next REESCREVE em tempo de build. Fora dele — num script de prova
       * rodando em `node` — ela é resolvida ao pé da letra e devolve
       * `.../modules/nexo/lib/pdfjs-dist/legacy/build/pdf.worker.mjs`, que não
       * existe. Todo `getDocument` falhava, e como quem chama trata falha
       * caindo para o nome do arquivo, a prova passava VERDE medindo nada.
       *
       * Sem `workerSrc`, o pdf.js usa o worker falso (mesma thread), que é
       * exatamente o que um script quer. No navegador nada muda.
       */
      if (typeof window !== "undefined") {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/legacy/build/pdf.worker.mjs",
          import.meta.url,
        ).toString();
      }
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

/**
 * QUANTO A FOLHA MANDA DESENHAR, fora o texto.
 *
 * É o sinal que separa a folha em branco da folha cujo texto virou curva
 * vetorial ou tira de imagem — as duas chegam como `text: ""`. Custa um reparse
 * do content stream, então só vale a pena na folha que já é magra.
 *
 * Devolve `undefined` quando o reparse falha: ausência de medida é diferente de
 * medida zero, e quem chama precisa poder distinguir as duas.
 */
export async function medirTinta(
  page: {
    getOperatorList: () => Promise<{ fnArray: ArrayLike<number>; argsArray: ArrayLike<unknown> }>;
    view: ArrayLike<number>;
  },
  OPS: Record<string, number>,
): Promise<ContagemDeTinta | undefined> {
  try {
    // A MESMA conta do servidor — ver [[tinta-da-folha.ts]]: com o tamanho da
    // imagem decidindo o portão, duas cópias seriam dois portões.
    return contarTinta(await page.getOperatorList(), OPS, page.view);
  } catch {
    return undefined;
  }
}
