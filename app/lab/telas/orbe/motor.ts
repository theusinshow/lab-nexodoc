"use client";

import { useEffect, useRef } from "react";

/*
 * O MOTOR DO ORBE NOVO: os estados do agente viram números, e cada direção
 * desenha os mesmos números do seu jeito. Os estados são os nove do app
 * (modules/nexo/components/agent-orb/agent-orb.types.ts), na mesma ordem de
 * prioridade; as quatro direções leem a mesma tabela, então comparar é justo.
 *
 * O orbe é o único elemento do sistema autorizado a ser vivo (DESIGN.md §6).
 * Mesmo assim, troca de estado nunca é corte: cada número caminha até o alvo
 * com uma mola amortecida, e com movimento reduzido o quadro fica parado no
 * estado (sem tempo correndo).
 */

export type EstadoDoOrbe = "idle" | "dragging" | "reading" | "analyzing" | "auditing" | "responding" | "complete" | "waiting" | "error";

export const ESTADOS: { id: EstadoDoOrbe; nome: string; quando: string }[] = [
  { id: "idle", nome: "Repouso", quando: "Esperando um pedido." },
  { id: "dragging", nome: "Recebendo", quando: "Um arquivo está sendo arrastado sobre ele." },
  { id: "reading", nome: "Lendo", quando: "Abrindo o PDF, lendo carimbos e páginas." },
  { id: "analyzing", nome: "Analisando", quando: "Entendendo o pedido, montando o plano." },
  { id: "auditing", nome: "Auditando", quando: "Conferindo o memorial: achados aparecem." },
  { id: "responding", nome: "Respondendo", quando: "Escrevendo a resposta na conversa." },
  { id: "complete", nome: "Concluído", quando: "Terminou o que foi pedido." },
  { id: "waiting", nome: "Aguardando você", quando: "Precisa de uma decisão para seguir." },
  { id: "error", nome: "Erro", quando: "Algo falhou e ele parou." },
];

/** Os números que todas as direções leem. */
export type Parametros = {
  /** quanto ele se mexe (0 parado, 1 máximo) */
  energia: number;
  /** abertura: 1 aberto para receber, 0 fechado em foco */
  abertura: number;
  /** varredura de leitura (0 a 1: presença do feixe) */
  varredura: number;
  /** marcas de achado (0 a 1) */
  marcas: number;
  /** pulso de fala (0 a 1) */
  fala: number;
  /** cor do sinal, misturada à íris: ok, atenção, erro (0 a 1 cada) */
  ok: number;
  atencao: number;
  erro: number;
  /** velocidade de giro */
  giro: number;
};

export const ALVOS: Record<EstadoDoOrbe, Parametros> = {
  idle: { energia: 0.16, abertura: 0.5, varredura: 0, marcas: 0, fala: 0, ok: 0, atencao: 0, erro: 0, giro: 0.12 },
  dragging: { energia: 0.55, abertura: 1, varredura: 0, marcas: 0, fala: 0, ok: 0, atencao: 0, erro: 0, giro: 0.35 },
  reading: { energia: 0.45, abertura: 0.72, varredura: 1, marcas: 0, fala: 0, ok: 0, atencao: 0, erro: 0, giro: 0.5 },
  analyzing: { energia: 0.6, abertura: 0.42, varredura: 0.35, marcas: 0, fala: 0, ok: 0, atencao: 0, erro: 0, giro: 0.95 },
  auditing: { energia: 0.82, abertura: 0.22, varredura: 0.8, marcas: 1, fala: 0, ok: 0, atencao: 0, erro: 0, giro: 0.7 },
  responding: { energia: 0.55, abertura: 0.6, varredura: 0, marcas: 0, fala: 1, ok: 0, atencao: 0, erro: 0, giro: 0.3 },
  complete: { energia: 0.18, abertura: 0.55, varredura: 0, marcas: 0, fala: 0, ok: 1, atencao: 0, erro: 0, giro: 0.08 },
  waiting: { energia: 0.12, abertura: 0.62, varredura: 0, marcas: 0, fala: 0, ok: 0, atencao: 1, erro: 0, giro: 0.05 },
  error: { energia: 0.28, abertura: 0.3, varredura: 0, marcas: 0, fala: 0, ok: 0, atencao: 0, erro: 1, giro: 0 },
};

export const COR = {
  fundo: "#08090b",
  iris: [163, 166, 255] as const,
  irisFundo: [124, 128, 245] as const,
  irisClaro: [212, 213, 255] as const,
  ok: [123, 216, 165] as const,
  atencao: [240, 180, 92] as const,
  erro: [255, 125, 110] as const,
  texto: [238, 239, 242] as const,
};

type Rgb = readonly [number, number, number];
export const mistura = (a: Rgb, b: Rgb, t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const rgba = (c: Rgb, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

/** A cor do sinal do momento: íris, puxada para ok/atenção/erro conforme o estado. */
export const corDoSinal = (p: Parametros, base: Rgb = COR.iris) => {
  let c = mistura(base, COR.ok, p.ok);
  c = mistura(c, COR.atencao, p.atencao);
  return mistura(c, COR.erro, p.erro);
};

/**
 * Roda o desenho: guarda os parâmetros correntes, aproxima-os do alvo do
 * estado com uma mola, e chama `desenhar(p, t, dt)` a cada quadro. Com
 * movimento reduzido, desenha uma vez, já no alvo, com t fixo.
 */
export function useOrbe(estado: EstadoDoOrbe, desenhar: (p: Parametros, t: number, dt: number) => void, reduzir: boolean) {
  const atual = useRef<Parametros>({ ...ALVOS[estado] });
  const vel = useRef<Record<keyof Parametros, number>>(Object.fromEntries(Object.keys(ALVOS.idle).map((k) => [k, 0])) as Record<keyof Parametros, number>);
  const alvo = useRef(ALVOS[estado]);
  const desenho = useRef(desenhar);
  useEffect(() => {
    desenho.current = desenhar;
  });
  useEffect(() => {
    alvo.current = ALVOS[estado];
    if (reduzir) {
      atual.current = { ...ALVOS[estado] };
      desenho.current(atual.current, 1.7, 0);
    }
  }, [estado, reduzir]);
  useEffect(() => {
    if (reduzir) {
      desenho.current(atual.current, 1.7, 0);
      return;
    }
    let raf = 0;
    let antes = performance.now();
    const t0 = antes;
    const passo = (agora: number) => {
      const dt = Math.min(0.05, (agora - antes) / 1000);
      antes = agora;
      // mola amortecida em cada número: chega em ~0,6 s, sem quicar muito
      for (const k of Object.keys(atual.current) as (keyof Parametros)[]) {
        const x = atual.current[k];
        const v = vel.current[k];
        const a = (alvo.current[k] - x) * 38 - v * 11;
        vel.current[k] = v + a * dt;
        atual.current[k] = x + vel.current[k] * dt;
      }
      desenho.current(atual.current, (agora - t0) / 1000, dt);
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [reduzir]);
}

/** Prepara um canvas nítido no tamanho pedido (densidade do aparelho). */
export function prepararCanvas(cv: HTMLCanvasElement | null, tam: number) {
  if (!cv) return null;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const px = Math.round(tam * dpr);
  // as duas dimensões: o canvas nasce 300x150, e só a largura podia já coincidir
  if (cv.width !== px || cv.height !== px) {
    cv.width = px;
    cv.height = px;
  }
  const ctx = cv.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, tam, tam);
  return ctx;
}

/** Pseudo-acaso determinístico (o mesmo i dá sempre o mesmo número). */
export const acaso = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
