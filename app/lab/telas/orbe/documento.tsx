"use client";

import { useRef } from "react";

import { acaso, COR, corDoSinal, mistura, prepararCanvas, rgba, useOrbe, type EstadoDoOrbe } from "./motor";

/*
 * DIREÇÃO 4 · DOCUMENTO VIVO. Um globo feito do próprio material do produto:
 * linhas de texto nas latitudes, girando como um planeta. É o memorial virando
 * presença.
 *  - lendo: uma faixa de luz desce pelas latitudes; o que ela passou fica lido;
 *  - auditando: palavras acendem em âmbar e coral, os achados;
 *  - respondendo: palavras novas aparecem e somem, como quem escreve;
 *  - concluído/aguardando/erro: a tinta muda de cor.
 */
export function OrbeDocumento({ estado, tam, reduzir }: { estado: EstadoDoOrbe; tam: number; reduzir: boolean }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const giro = useRef(0);

  useOrbe(
    estado,
    (p, t, dt) => {
      const ctx = prepararCanvas(cv.current, tam);
      if (!ctx) return;
      const c = tam / 2;
      const R = tam * 0.44 * (0.94 + p.abertura * 0.1);
      const sinal = corDoSinal(p);
      giro.current += dt * (0.08 + p.giro * 0.5);

      // o núcleo: uma luz baixa dentro do globo
      const nucleo = ctx.createRadialGradient(c, c, 0, c, c, R * 1.15);
      nucleo.addColorStop(0, rgba(sinal, 0.28 + p.energia * 0.2));
      nucleo.addColorStop(0.7, rgba(sinal, 0.06));
      nucleo.addColorStop(1, rgba(sinal, 0));
      ctx.fillStyle = nucleo;
      ctx.fillRect(0, 0, tam, tam);

      const linhas = Math.max(5, Math.min(17, Math.round(tam / 18)));
      const espessura = Math.max(0.9, (R * 2) / linhas / 3.1);
      // a faixa de leitura desce, volta ao topo, desce
      const faixa = -1 + ((t * 0.45) % 1) * 2.2;
      ctx.lineCap = "round";
      for (let i = 0; i < linhas; i++) {
        // latitudes iguais em ângulo, então as linhas se juntam nos polos
        const phi = -Math.PI / 2 + ((i + 0.5) / linhas) * Math.PI;
        const y = c + Math.sin(phi) * R;
        const meia = Math.cos(phi) * R;
        const sy = Math.sin(phi);
        const lido = p.varredura > 0.01 ? Math.max(0, Math.min(1, (faixa - sy) * 3)) : 1;
        const naFaixa = p.varredura * Math.exp(-Math.pow((sy - faixa) * 5, 2));
        // as palavras: segmentos de comprimento fixo por linha, rolando com o giro
        const n = 7;
        for (let j = 0; j < n; j++) {
          const largura = 0.08 + acaso(i * 17 + j) * 0.16;
          let u = (j / n + giro.current * 0.16 + acaso(i * 3) * 0.5) % 1;
          if (u < 0) u += 1;
          // u em [0,1) vira ângulo de longitude; só a frente do globo aparece
          const lon0 = u * Math.PI * 2 - Math.PI;
          const lon1 = lon0 + largura * Math.PI;
          if (lon1 < -Math.PI / 2 || lon0 > Math.PI / 2) continue;
          const a0 = Math.max(-Math.PI / 2, lon0);
          const a1 = Math.min(Math.PI / 2, lon1);
          const x0 = c + Math.sin(a0) * meia;
          const x1 = c + Math.sin(a1) * meia;
          const profundidade = Math.cos((a0 + a1) / 2);
          let cor: readonly [number, number, number] = mistura(COR.texto, sinal, 0.55);
          let alfa = (0.18 + profundidade * 0.55) * (0.45 + lido * 0.55);
          // achados: algumas palavras acendem
          const ehAchado = acaso(i * 31 + j * 7) > 0.86;
          if (ehAchado && p.marcas > 0.01) {
            cor = mistura(cor, acaso(i + j) > 0.6 ? COR.erro : COR.atencao, p.marcas);
            alfa = Math.max(alfa, p.marcas * (0.5 + profundidade * 0.5));
          }
          // fala: palavras piscam como quem escreve
          if (p.fala > 0.01) alfa *= 1 - p.fala * 0.6 * (0.5 + 0.5 * Math.sin(t * 9 + i * 1.7 + j * 2.3));
          alfa += naFaixa * 0.6;
          ctx.strokeStyle = rgba(cor, Math.min(1, alfa));
          ctx.lineWidth = espessura;
          ctx.beginPath();
          ctx.moveTo(x0, y);
          ctx.lineTo(x1, y);
          ctx.stroke();
        }
      }

      // a borda do globo, fina
      ctx.strokeStyle = rgba(sinal, 0.28 + p.energia * 0.2);
      ctx.lineWidth = Math.max(0.8, tam * 0.006);
      ctx.beginPath();
      ctx.arc(c, c, R * 1.04, 0, Math.PI * 2);
      ctx.stroke();

      // a faixa de leitura, como uma linha de luz atravessando
      if (p.varredura > 0.01 && faixa > -1 && faixa < 1) {
        const y = c + faixa * R;
        const meia = Math.sqrt(Math.max(0, 1 - faixa * faixa)) * R * 1.04;
        const g = ctx.createLinearGradient(c - meia, y, c + meia, y);
        g.addColorStop(0, rgba(sinal, 0));
        g.addColorStop(0.5, rgba(mistura(sinal, COR.texto, 0.5), 0.9 * p.varredura));
        g.addColorStop(1, rgba(sinal, 0));
        ctx.strokeStyle = g;
        ctx.lineWidth = Math.max(1, tam * 0.008);
        ctx.beginPath();
        ctx.moveTo(c - meia, y);
        ctx.lineTo(c + meia, y);
        ctx.stroke();
      }
    },
    reduzir,
  );

  return <canvas ref={cv} style={{ width: tam, height: tam, display: "block" }} aria-hidden />;
}
