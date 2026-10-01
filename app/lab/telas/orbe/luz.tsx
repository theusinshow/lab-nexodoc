"use client";

import { useRef } from "react";

import { COR, corDoSinal, mistura, prepararCanvas, rgba, useOrbe, type EstadoDoOrbe } from "./motor";

/*
 * DIREÇÃO 3 · LUZ E FOCO. Quase só luz: um núcleo íris atrás de um diafragma de
 * lâminas, a íris de uma lente (e a íris é a cor do sistema). O diafragma é a
 * expressão: abre para receber um arquivo, fecha em foco ao auditar, e a luz
 * pulsa quando ele fala.
 *  - lendo: um arco de luz percorre o anel da lente;
 *  - auditando: abertura mínima, e os achados acendem no anel;
 *  - concluído/aguardando/erro: a cor da luz muda.
 */
const LAMINAS = 7;

export function OrbeLuz({ estado, tam, reduzir }: { estado: EstadoDoOrbe; tam: number; reduzir: boolean }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const ang = useRef({ diafragma: 0, arco: 0 });

  useOrbe(
    estado,
    (p, t, dt) => {
      const ctx = prepararCanvas(cv.current, tam);
      if (!ctx) return;
      const c = tam / 2;
      const R = tam * 0.46;
      const minimo = tam < 24;
      const sinal = corDoSinal(p);
      ang.current.diafragma += dt * p.giro * 0.6;
      ang.current.arco += dt * (1.6 + p.energia * 2);
      const fala = p.fala * (0.5 + 0.5 * Math.sin(t * 6.1) * Math.sin(t * 1.7 + 0.6));
      const respira = 0.5 + 0.5 * Math.sin(t * (0.8 + p.energia * 1.6));

      // a luz que vaza da lente
      const halo = ctx.createRadialGradient(c, c, R * 0.15, c, c, R * 1.1);
      halo.addColorStop(0, rgba(sinal, 0.3 + fala * 0.25 + p.energia * 0.1));
      halo.addColorStop(1, rgba(sinal, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, tam, tam);

      // o corpo da lente
      ctx.fillStyle = "#0d0e12";
      ctx.beginPath();
      ctx.arc(c, c, R, 0, Math.PI * 2);
      ctx.fill();

      // a luz atrás do diafragma
      const rl = R * 0.86;
      const luz = ctx.createRadialGradient(c, c, 0, c, c, rl);
      luz.addColorStop(0, rgba(mistura(COR.texto, sinal, 0.25), 1));
      luz.addColorStop(0.35 + respira * 0.1, rgba(sinal, 0.95));
      luz.addColorStop(1, rgba(mistura(sinal, [8, 9, 11], 0.7), 1));
      ctx.fillStyle = luz;
      ctx.beginPath();
      ctx.arc(c, c, rl, 0, Math.PI * 2);
      ctx.fill();

      // o diafragma: lâminas que deixam uma abertura de 7 lados no centro
      // pequeno, a abertura cresce para o heptágono de luz continuar legível
      const aberta = R * (minimo ? 0.5 + p.abertura * 0.2 : 0.16 + p.abertura * 0.58) * (1 + fala * 0.1);
      const giro = ang.current.diafragma;
      ctx.save();
      ctx.beginPath();
      ctx.arc(c, c, rl, 0, Math.PI * 2);
      ctx.clip();
      for (let i = 0; i < LAMINAS; i++) {
        const a = giro + (i / LAMINAS) * Math.PI * 2;
        const a2 = a + (Math.PI * 2) / LAMINAS;
        // cada lâmina é a fatia entre um lado da abertura e a borda, torcida
        const v1 = [c + Math.cos(a) * aberta, c + Math.sin(a) * aberta];
        const v2 = [c + Math.cos(a2) * aberta, c + Math.sin(a2) * aberta];
        const torcao = 0.9;
        ctx.fillStyle = i % 2 ? "#14161b" : "#111317";
        ctx.beginPath();
        ctx.moveTo(v1[0], v1[1]);
        ctx.lineTo(v2[0], v2[1]);
        ctx.lineTo(c + Math.cos(a2 + torcao) * R * 1.2, c + Math.sin(a2 + torcao) * R * 1.2);
        ctx.lineTo(c + Math.cos(a + torcao) * R * 1.2, c + Math.sin(a + torcao) * R * 1.2);
        ctx.closePath();
        ctx.fill();
        if (!minimo) {
          ctx.strokeStyle = rgba(sinal, 0.22);
          ctx.lineWidth = Math.max(0.6, tam * 0.004);
          ctx.beginPath();
          ctx.moveTo(v2[0], v2[1]);
          ctx.lineTo(c + Math.cos(a2 + torcao) * R * 1.2, c + Math.sin(a2 + torcao) * R * 1.2);
          ctx.stroke();
        }
      }
      ctx.restore();

      // o anel da lente
      ctx.strokeStyle = rgba(minimo ? sinal : COR.texto, minimo ? 0.6 : 0.2);
      ctx.lineWidth = minimo ? Math.max(1, tam * 0.06) : Math.max(0.8, tam * 0.01);
      ctx.beginPath();
      ctx.arc(c, c, R * 0.93, 0, Math.PI * 2);
      ctx.stroke();

      // leitura: um arco de luz correndo no anel
      if (p.varredura > 0.01 && !minimo) {
        const a = ang.current.arco;
        ctx.strokeStyle = rgba(mistura(sinal, COR.texto, 0.4), p.varredura * 0.9);
        ctx.lineWidth = Math.max(1.2, tam * 0.014);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(c, c, R * 0.93, a, a + 0.7);
        ctx.stroke();
      }

      // auditoria: os achados acendem no anel
      if (p.marcas > 0.01 && !minimo) {
        [
          [0.6, COR.erro],
          [2.2, COR.atencao],
          [3.9, COR.atencao],
          [5.1, COR.irisClaro],
        ].forEach(([a, cor], i) => {
          const k = Math.max(0, Math.min(1, p.marcas * 4 - i));
          if (k <= 0) return;
          ctx.fillStyle = rgba(cor as readonly [number, number, number], k);
          ctx.beginPath();
          ctx.arc(c + Math.cos(a as number) * R * 0.93, c + Math.sin(a as number) * R * 0.93, Math.max(1.2, tam * 0.02) * k, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // o reflexo na lente: o que a faz parecer objeto, e não um disco
      if (!minimo) {
        const brilho = ctx.createLinearGradient(c - R, c - R, c + R * 0.2, c + R * 0.2);
        brilho.addColorStop(0, "rgba(255,255,255,0.10)");
        brilho.addColorStop(0.5, "rgba(255,255,255,0)");
        ctx.fillStyle = brilho;
        ctx.beginPath();
        ctx.arc(c, c, R * 0.92, Math.PI * 0.95, Math.PI * 1.75);
        ctx.arc(c, c, R * 0.62, Math.PI * 1.75, Math.PI * 0.95, true);
        ctx.fill();
      }
    },
    reduzir,
  );

  return <canvas ref={cv} style={{ width: tam, height: tam, display: "block" }} aria-hidden />;
}
