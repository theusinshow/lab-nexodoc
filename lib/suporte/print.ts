/**
 * O PRINT, tirado ANTES da gaveta abrir — a tela como a pessoa a via.
 *
 * `modern-screenshot` monta a imagem a partir do DOM (não é captura de tela do
 * sistema). Canvas do pdf.js costuma sair; quando algo não sai, o chamado vai
 * sem print e nada trava. Import dinâmico: a biblioteca só carrega no clique.
 *
 * Largura limitada a 1600 px e WebP 0,8 — uma tela inteira fica em centenas de KB.
 */
import { TETO_DO_PRINT } from "./comum";

export async function tirarPrint(): Promise<string | null> {
  try {
    const { domToWebp } = await import("modern-screenshot");
    const escala = Math.min(1, 1600 / window.innerWidth);
    const url = await domToWebp(document.body, {
      width: window.innerWidth,
      height: window.innerHeight,
      scale: escala,
      quality: 0.8,
      backgroundColor: getComputedStyle(document.body).backgroundColor || "#0a0b0d",
      filter: (n) => !(n instanceof HTMLElement && n.dataset.suporteFora === "1"),
    });
    return url.length * 0.75 > TETO_DO_PRINT ? null : url;
  } catch {
    return null;
  }
}
