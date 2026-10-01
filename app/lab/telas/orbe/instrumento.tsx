"use client";

import { useRef } from "react";

import { COR, corDoSinal, mistura, prepararCanvas, rgba, useOrbe, type EstadoDoOrbe } from "./motor";

/*
 * DIREÇÃO 1 · INSTRUMENTO TÉCNICO. Um objeto de precisão: um núcleo que mede,
 * dentro de dois anéis com escala, como um teodolito ou o limbo de uma bússola.
 * Conversa com o que o produto lê (carimbo, régua, prancha).
 *  - lendo: um feixe varre a escala e acende os traços que passa;
 *  - auditando: o feixe fecha e os achados viram marcas na escala;
 *  - respondendo: o núcleo pulsa no ritmo da fala;
 *  - concluído/aguardando/erro: a cor do sinal e um entalhe no topo.
 */
export function OrbeInstrumento({ estado, tam, reduzir }: { estado: EstadoDoOrbe; tam: number; reduzir: boolean }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const ang = useRef({ fora: 0, dentro: 0, feixe: -Math.PI / 2 });

  useOrbe(
    estado,
    (p, t, dt) => {
      const ctx = prepararCanvas(cv.current, tam);
      if (!ctx) return;
      const c = tam / 2;
      const R = tam * 0.46;
      const pequeno = tam < 48;
      const minimo = tam < 24;
      const sinal = corDoSinal(p);
      ang.current.fora += dt * p.giro * 0.35;
      ang.current.dentro -= dt * p.giro * 0.9;
      ang.current.feixe += dt * (1.2 + p.energia * 2.4);
      const feixe = ang.current.feixe;

      // o halo: luz do núcleo vazando no escuro
      const halo = ctx.createRadialGradient(c, c, R * 0.1, c, c, R * 1.08);
      halo.addColorStop(0, rgba(sinal, 0.22 + p.energia * 0.18));
      halo.addColorStop(1, rgba(sinal, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, tam, tam);

      // o limbo: anel externo com escala
      ctx.lineCap = "round";
      // pequeno, o limbo é o que identifica: mais forte e mais grosso
      ctx.strokeStyle = rgba(minimo ? sinal : COR.texto, minimo ? 0.85 : 0.22);
      ctx.lineWidth = minimo ? Math.max(1.1, tam * 0.075) : Math.max(0.8, tam * 0.006);
      ctx.beginPath();
      ctx.arc(c, c, R, 0, Math.PI * 2);
      ctx.stroke();
      const traços = minimo ? 0 : pequeno ? 12 : 72;
      for (let i = 0; i < traços; i++) {
        const a = (i / traços) * Math.PI * 2 + ang.current.fora;
        const maior = pequeno || i % 6 === 0;
        // o feixe acende os traços que acabou de passar
        let atras = (feixe - a) % (Math.PI * 2);
        if (atras < 0) atras += Math.PI * 2;
        const aceso = p.varredura * Math.exp(-atras * 2.2);
        const l0 = R * (maior ? 0.86 : 0.91);
        ctx.strokeStyle = rgba(mistura(COR.texto, sinal, aceso), 0.18 + aceso * 0.8 + (maior ? 0.12 : 0));
        ctx.lineWidth = Math.max(0.7, tam * (maior ? 0.007 : 0.004));
        ctx.beginPath();
        ctx.moveTo(c + Math.cos(a) * l0, c + Math.sin(a) * l0);
        ctx.lineTo(c + Math.cos(a) * R * 0.97, c + Math.sin(a) * R * 0.97);
        ctx.stroke();
      }

      // os achados: marcas coloridas que nascem na escala
      if (p.marcas > 0.01 && !minimo) {
        [
          [0.9, COR.erro],
          [2.6, COR.atencao],
          [4.1, COR.atencao],
          [5.3, mistura(COR.iris, COR.texto, 0.4)],
        ].forEach(([a0, cor], i) => {
          const a = (a0 as number) + ang.current.fora;
          const k = Math.max(0, Math.min(1, p.marcas * 4 - i));
          if (k <= 0) return;
          ctx.fillStyle = rgba(cor as readonly [number, number, number], k);
          ctx.beginPath();
          ctx.arc(c + Math.cos(a) * R * 0.8, c + Math.sin(a) * R * 0.8, Math.max(1.2, tam * 0.018) * k, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // o anel interno tracejado, que gira ao contrário e fecha ao concluir
      if (!minimo) {
        const r2 = R * 0.66;
        const n = 24;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + ang.current.dentro;
          const vao = (1 - p.ok) * 0.09 + 0.012;
          ctx.strokeStyle = rgba(sinal, 0.25 + p.energia * 0.45);
          ctx.lineWidth = Math.max(0.8, tam * 0.008);
          ctx.beginPath();
          ctx.arc(c, c, r2, a, a + (Math.PI * 2) / n - vao);
          ctx.stroke();
        }
      }

      // o feixe de leitura: uma cunha de luz varrendo
      if (p.varredura > 0.01) {
        const g = ctx.createConicGradient ? ctx.createConicGradient(feixe - 0.9, c, c) : null;
        if (g) {
          g.addColorStop(0, rgba(sinal, 0));
          g.addColorStop(0.14, rgba(sinal, 0.28 * p.varredura));
          g.addColorStop(0.145, rgba(sinal, 0));
          g.addColorStop(1, rgba(sinal, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(c, c, R * 0.95, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // o núcleo: um disco que mede (abre para receber, fecha para focar)
      const fala = p.fala * (0.5 + 0.5 * Math.sin(t * 7.3) * Math.sin(t * 2.1 + 1));
      const rn = R * (minimo ? 0.46 : 0.2 + p.abertura * 0.16) * (1 + fala * 0.14);
      const nucleo = ctx.createRadialGradient(c - rn * 0.3, c - rn * 0.35, rn * 0.1, c, c, rn);
      nucleo.addColorStop(0, rgba(mistura(sinal, COR.texto, 0.65), 1));
      nucleo.addColorStop(0.55, rgba(sinal, 0.95));
      nucleo.addColorStop(1, rgba(mistura(sinal, [8, 9, 11], 0.55), 1));
      ctx.fillStyle = nucleo;
      ctx.beginPath();
      ctx.arc(c, c, rn, 0, Math.PI * 2);
      ctx.fill();

      // o retículo: quatro traços no eixo, que dão a leitura de instrumento
      if (!minimo) {
        ctx.strokeStyle = rgba(COR.texto, 0.35);
        ctx.lineWidth = Math.max(0.7, tam * 0.005);
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2;
          ctx.beginPath();
          ctx.moveTo(c + Math.cos(a) * (rn + R * 0.06), c + Math.sin(a) * (rn + R * 0.06));
          ctx.lineTo(c + Math.cos(a) * (rn + R * 0.16), c + Math.sin(a) * (rn + R * 0.16));
          ctx.stroke();
        }
      }

      // o entalhe do topo: atenção pisca devagar, erro fica aceso
      const entalhe = Math.max(p.erro, p.atencao * (0.55 + 0.45 * Math.sin(t * 2.4)));
      if (entalhe > 0.02 && !minimo) {
        ctx.fillStyle = rgba(sinal, entalhe);
        ctx.beginPath();
        ctx.moveTo(c, c - R * 1.0);
        ctx.lineTo(c - R * 0.07, c - R * 0.86);
        ctx.lineTo(c + R * 0.07, c - R * 0.86);
        ctx.closePath();
        ctx.fill();
      }
    },
    reduzir,
  );

  return <canvas ref={cv} style={{ width: tam, height: tam, display: "block" }} aria-hidden />;
}
