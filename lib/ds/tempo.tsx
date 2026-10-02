"use client";

import { createContext, useContext } from "react";

import { DURACAO, MOLA, escalarMola, type NomeDaDuracao, type NomeDaMola } from "./movimento";

/**
 * ESCALA DE TEMPO dos componentes do sistema novo. No app vale sempre 1; o
 * /lab a sobe para 4 na câmera lenta. Existe para que o componente examinado
 * no lab seja O MESMO que vai para produção — e não uma cópia com tempos
 * esticados à mão, que divergiria no primeiro ajuste.
 */
const EscalaDeTempo = createContext(1);

export const ProvedorDeEscala = EscalaDeTempo.Provider;

export function useTempo() {
  const k = useContext(EscalaDeTempo);
  return {
    k,
    dur: (n: NomeDaDuracao) => DURACAO[n] * k,
    mola: (n: NomeDaMola) => escalarMola(MOLA[n], k),
  };
}
