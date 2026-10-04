/**
 * A MARCA COM O PONTO — o favicon de quando há trabalho em curso.
 *
 *   node scripts/gera-marca-trabalhando.mjs   (== npm run marca:trabalhando)
 *
 * Roda UMA vez e commita o resultado. O favicon vivo alterna a REFERÊNCIA entre
 * dois arquivos estáticos; compor a imagem no navegador a cada troca seria
 * gastar trabalho de pintura para um ícone de 32px.
 *
 * NÃO É UM SEGUNDO DESENHO. Ele parte do mesmo quadro capturado do orbe
 * (`public/marca/orbe-NN.png`, a marca segundo o §6 da DESIGN.md) e acrescenta
 * o ponto na cor do aro — "variação afinada", como a proposta pede. Desenhar um orbe
 * novo para o estado de trabalho quebraria a escada de reduções, que existe
 * justamente para o objeto ser o mesmo em todo tamanho.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const UPNG = require("@pdf-lib/upng").default;

/** A cor do aro do orbe (`CORES_DO_ORBE.aro`, violeta #c3a3ff), em RGB. */
const ARO = [195, 163, 255];

/**
 * O ponto ocupa um quarto da largura, no canto inferior direito, com uma borda
 * escura de 1px em volta.
 *
 * A borda não é enfeite: sobre a parte clara do orbe, um ponto claro sem
 * separação some dentro do brilho — e um indicador que só aparece em metade dos
 * fundos não é indicador.
 */
function comPonto(caminhoEntrada, caminhoSaida) {
  const png = UPNG.decode(readFileSync(caminhoEntrada));
  const { width, height } = png;
  const rgba = new Uint8Array(UPNG.toRGBA8(png)[0]);

  const raio = Math.max(2, Math.round(width / 8));
  const cx = width - raio - 1;
  const cy = height - raio - 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = Math.hypot(x - cx, y - cy);
      const i = (y * width + x) * 4;
      if (d <= raio) {
        rgba[i] = ARO[0];
        rgba[i + 1] = ARO[1];
        rgba[i + 2] = ARO[2];
        rgba[i + 3] = 255;
      } else if (d <= raio + 1.2) {
        // O anel escuro que separa o ponto do brilho do orbe.
        rgba[i] = 8;
        rgba[i + 1] = 10;
        rgba[i + 2] = 11;
        rgba[i + 3] = 255;
      }
    }
  }

  // `0` = sem perda: um ícone de 32px não tem o que economizar, e paleta
  // reduzida faria o violeta do aro virar um violeta parecido.
  const saida = UPNG.encode([rgba.buffer], width, height, 0);
  writeFileSync(caminhoSaida, Buffer.from(saida));
  console.log(`  ${caminhoSaida} — ${width}x${height}`);
}

console.log("Marca com o ponto de trabalho:");
comPonto("public/marca/orbe-32.png", "public/marca/orbe-trabalhando-32.png");
comPonto("public/marca/orbe-16.png", "public/marca/orbe-trabalhando-16.png");
