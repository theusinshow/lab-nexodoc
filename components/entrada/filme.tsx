"use client";

import { useReducedMotionConfig } from "motion/react";
import { useEffect, useState } from "react";

/**
 * O FILME DA ENTRADA: 20 s em loop, feito em HyperFrames (videos/nexo-entrada
 * no branch do laboratório). É decorativo e mudo; o login nunca espera por ele.
 * O primeiro quadro é o pôster, então o vídeo entra sem salto quando termina de
 * carregar. Com movimento reduzido fica um quadro parado (as duas funções, a
 * auditoria e o volume), e em tela estreita o painel some e nada é baixado.
 */
export function Filme() {
  const reduzir = !!useReducedMotionConfig();
  const [largo, setLargo] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(min-width: 900px)");
    const ver = () => setLargo(mq.matches);
    ver();
    mq.addEventListener("change", ver);
    return () => mq.removeEventListener("change", ver);
  }, []);
  if (!largo) return null;
  // eslint-disable-next-line @next/next/no-img-element -- quadro parado decorativo, sem ganho do next/image aqui
  if (reduzir) return <img className="en-filme-midia" src="/entrada/nexo-entrada-poster.webp" alt="" />;
  return (
    <video className="en-filme-midia" autoPlay muted loop playsInline preload="auto" poster="/entrada/nexo-entrada-inicio.webp" aria-hidden>
      <source src="/entrada/nexo-entrada.webm" type="video/webm" />
      <source src="/entrada/nexo-entrada.mp4" type="video/mp4" />
    </video>
  );
}
