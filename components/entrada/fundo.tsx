"use client";

import { useReducedMotionConfig } from "motion/react";
import { useEffect, useRef } from "react";

/**
 * O FUNDO DA PORTA (04/10/2026): luz violeta → coral parada no alto (a mesma
 * rampa do orbe), uma grade fina e grão. A grade só acende em volta do cursor:
 * é resposta ao gesto, não enfeite que corre sozinho (ver "sem animação que
 * segura"). Não há laço: o `pointermove` só escreve duas variáveis CSS, num
 * quadro por vez. Com movimento reduzido, ou no toque, a grade fica parada.
 */
export function FundoDaPorta() {
  const ref = useRef<HTMLDivElement>(null);
  const reduzir = !!useReducedMotionConfig();

  useEffect(() => {
    const fundo = ref.current;
    const porta = fundo?.parentElement;
    if (!fundo || !porta || reduzir || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let quadro = 0;
    let x = 0;
    let y = 0;
    const pintar = () => {
      quadro = 0;
      fundo.style.setProperty("--en-mx", `${x}px`);
      fundo.style.setProperty("--en-my", `${y}px`);
    };
    const mover = (e: PointerEvent) => {
      const caixa = porta.getBoundingClientRect();
      x = e.clientX - caixa.left;
      y = e.clientY - caixa.top;
      fundo.dataset.ativo = "";
      if (!quadro) quadro = requestAnimationFrame(pintar);
    };
    const sair = () => delete fundo.dataset.ativo;
    porta.addEventListener("pointermove", mover);
    porta.addEventListener("pointerleave", sair);
    return () => {
      cancelAnimationFrame(quadro);
      porta.removeEventListener("pointermove", mover);
      porta.removeEventListener("pointerleave", sair);
    };
  }, [reduzir]);

  return (
    <div ref={ref} className="en-fundo" aria-hidden>
      <div className="en-fundo-luz" />
      <div className="en-fundo-grade" />
      <div className="en-fundo-foco" />
      <div className="en-fundo-grao" />
    </div>
  );
}
