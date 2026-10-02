/*
 * O RITMO das telas (o mesmo de app/lab/telas/conversa/turnos.tsx). Uma curva
 * só — sai rápido, pousa devagar — e poucas durações, em segundos. Multiplique
 * pelo `k` de `useTempo()` para o movimento reduzido.
 */
export const SUAVE = [0.22, 1, 0.36, 1] as [number, number, number, number];
export const RITMO = { entra: 0.5, troca: 0.38, toque: 0.2, escada: 0.12 };
