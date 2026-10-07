"use client";

/**
 * O CABO QUE LEVA A FOLHA ATÉ O TOMO — segue o vídeo de referência do Matheus
 * (`seta.mp4`, 07/10/2026), um editor de nós com cabos. Estritamente:
 *
 * - NA MÃO: cabo BRANCO, grosso, em S com tangentes horizontais, da porta de
 *   origem (a vaga que a folha deixou) até a porta da folha na mão. Uma bolinha
 *   branca em cada ponta.
 * - PERTO DA FRESTA: a porta de destino ganha um ANEL colorido, e entre a ponta
 *   do cabo e a porta salta um ZIGUE-ZAGUE elétrico, colorido, que treme. O cabo
 *   continua branco: ainda não conectou.
 * - SOLTOU NA FRESTA: a ponta assenta na porta, o cabo inteiro e as portas
 *   ganham a cor, a borda acende numa barra luminosa na altura da porta e uma
 *   onda abre a partir dela. Depois tudo esmaece — a folha já entrou.
 * - SOLTOU FORA: a ponta volta à origem e o cabo some.
 *
 * SÓ VISUAL: quem decide para onde a folha vai continua sendo `alvoDoDrop` e
 * `ajusteDoDrop` no `NexoCanvas`. Vive em coordenadas do FLUXO (num
 * `ViewportPortal`); espessuras e raios são divididos pelo zoom para terem o
 * mesmo tamanho na tela em qualquer aproximação.
 */

import { forwardRef, useId, useImperativeHandle, useRef, useState } from "react";
import { useStore } from "@xyflow/react";
import {
  animate,
  motion,
  useAnimationFrame,
  useMotionValue,
  useTransform,
} from "motion/react";

export type Ponto = { x: number; y: number };

export interface ControleDaLinha {
  /** Começo do arrasto: de onde as folhas saíram e quantas são. */
  comecar(origem: Ponto, quantas: number): void;
  /** Cada passo: a porta da folha na mão e, quando perto, a porta da fresta. */
  mover(mao: Ponto, porta: Ponto | null): void;
  /** Fim do arrasto: a porta da fresta onde a folha entrou, ou `null` se voltou. */
  soltar(porta: Ponto | null): void;
}

const COR = "var(--ds-nexo)";
const BRANCO = "rgb(244 244 245)";
/** A ponta assenta na porta: curta, sem quique. */
const MOLA_DO_ENCAIXE = { type: "spring", stiffness: 520, damping: 38 } as const;
const MOLA_DA_VOLTA = { type: "spring", stiffness: 300, damping: 32 } as const;

type Fase = "mao" | "conectado" | "voltando";

export const LinhaDoArrasto = forwardRef<ControleDaLinha, { reduzido: boolean }>(function LinhaDoArrasto(
  { reduzido },
  ref,
) {
  const zoom = useStore((s) => s.transform[2]);
  const px = (n: number) => n / zoom;
  const brilho = useId().replace(/:/g, "");

  const [gesto, setGesto] = useState<{ id: number; quantas: number } | null>(null);
  const [fase, setFase] = useState<Fase>("mao");
  const [porta, setPorta] = useState<Ponto | null>(null);
  const [encaixe, setEncaixe] = useState<{ id: number; x: number; y: number } | null>(null);
  const geracao = useRef(0);
  const portaRef = useRef<Ponto | null>(null);

  const ox = useMotionValue(0);
  const oy = useMotionValue(0);
  const hx = useMotionValue(0);
  const hy = useMotionValue(0);
  const opacidade = useMotionValue(0);
  /** O zigue-zague é refeito a cada quadro: muda o desenho, e o raio "treme". */
  const zigue = useMotionValue("");

  const cabo = useTransform<number, string>([ox, oy, hx, hy], ([x0, y0, x1, y1]) => emS(x0, y0, x1, y1));

  useAnimationFrame((t) => {
    const p = portaRef.current;
    if (fase !== "mao" || !p) return;
    zigue.set(zigueZague(hx.get(), hy.get(), p.x, p.y, 3.2 / zoom, reduzido ? 0 : Math.floor(t / 45)));
  });

  function limpar(minha: number) {
    if (geracao.current !== minha) return;
    setGesto(null);
    setPorta(null);
    portaRef.current = null;
  }

  function sumir(minha: number, atraso: number, duracao: number) {
    /*
     * GARANTIA POR TEMPO: o esmaecimento anda por quadro de animação, e o
     * navegador segura os quadros (aba em segundo plano, janela ocupada). Sem
     * isto o cabo podia ficar pendurado na tela depois de a folha já ter
     * entrado — foi o que apareceu no teste de 07/10/2026.
     */
    window.setTimeout(() => limpar(minha), (atraso + duracao) * 1000 + 400);
    return animate(opacidade, 0, { duration: reduzido ? 0.12 : duracao, delay: reduzido ? 0 : atraso, ease: [0.4, 0, 1, 1] }).then(
      () => {
        if (geracao.current === minha) {
          setGesto(null);
          setPorta(null);
          portaRef.current = null;
        }
      },
    );
  }

  useImperativeHandle(
    ref,
    () => ({
      comecar(origem, quantas) {
        geracao.current += 1;
        for (const mv of [opacidade, hx, hy]) mv.stop();
        ox.set(origem.x);
        oy.set(origem.y);
        hx.set(origem.x);
        hy.set(origem.y);
        opacidade.set(1);
        portaRef.current = null;
        setPorta(null);
        setFase("mao");
        setGesto({ id: geracao.current, quantas });
      },
      mover(mao, alvo) {
        hx.set(mao.x);
        hy.set(mao.y);
        const antes = portaRef.current;
        portaRef.current = alvo;
        if (!alvo !== !antes || (alvo && antes && (alvo.x !== antes.x || alvo.y !== antes.y))) setPorta(alvo);
      },
      soltar(alvo) {
        const minha = geracao.current;
        if (alvo) {
          portaRef.current = alvo;
          setPorta(alvo);
          setFase("conectado");
          if (reduzido) {
            hx.set(alvo.x);
            hy.set(alvo.y);
          } else {
            animate(hx, alvo.x, MOLA_DO_ENCAIXE);
            animate(hy, alvo.y, MOLA_DO_ENCAIXE);
            setEncaixe({ id: minha, x: alvo.x, y: alvo.y });
          }
          void sumir(minha, 0.55, 0.35);
        } else {
          setFase("voltando");
          portaRef.current = null;
          setPorta(null);
          if (reduzido) {
            hx.set(ox.get());
            hy.set(oy.get());
          } else {
            animate(hx, ox.get(), MOLA_DA_VOLTA);
            animate(hy, oy.get(), MOLA_DA_VOLTA);
          }
          void sumir(minha, 0.08, 0.2);
        }
      },
    }),
    // As MotionValues são estáveis; o resto é lido na hora do gesto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reduzido],
  );

  const conectado = fase === "conectado";
  const corDoCabo = conectado ? COR : BRANCO;

  return (
    <>
    {/*
      DUAS CAMADAS. O CABO passa POR BAIXO dos cartões: reordenando dentro da
      fileira, ele ia da vaga à fresta por cima do cartão do meio. Portas, anel,
      zigue-zague e brilho ficam POR CIMA — são o sinal, e a folha na mão não
      pode escondê-los.
    */}
    {gesto && (
      <svg
        aria-hidden
        width={1}
        height={1}
        style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none", zIndex: 0 }}
      >
        <motion.path
          key={gesto.id}
          d={cabo}
          fill="none"
          stroke={corDoCabo}
          strokeWidth={px(2.75)}
          strokeLinecap="round"
          filter={conectado ? `url(#brilho-${brilho})` : undefined}
          style={{ opacity: opacidade, transition: "stroke 160ms ease-out" }}
        />
        {/* A porta de origem fica com o cabo: a vaga se fecha, e o cartão que a ocupa a cobre. */}
        <motion.circle
          cx={ox}
          cy={oy}
          r={px(4.5)}
          fill={corDoCabo}
          stroke="rgb(0 0 0 / 0.55)"
          strokeWidth={px(1.5)}
          style={{ opacity: opacidade }}
        />
      </svg>
    )}
    <svg
      aria-hidden
      width={1}
      height={1}
      style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none", zIndex: 1600 }}
    >
      <defs>
        <filter id={`brilho-${brilho}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={px(3)} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`halo-${brilho}`} x="-200%" y="-50%" width="500%" height="200%">
          <feGaussianBlur stdDeviation={px(7)} />
        </filter>
      </defs>

      {/* A BORDA QUE ACENDE no destino, na altura da porta, e a onda. */}
      {encaixe && (
        <g key={encaixe.id}>
          <motion.rect
            x={encaixe.x - px(5)}
            y={encaixe.y - px(46)}
            width={px(10)}
            height={px(92)}
            rx={px(5)}
            fill={COR}
            filter={`url(#halo-${brilho})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0] }}
            transition={{ duration: 1.1, times: [0, 0.15, 1], ease: "easeOut" }}
          />
          <motion.rect
            x={encaixe.x - px(1.5)}
            y={encaixe.y - px(30)}
            width={px(3)}
            height={px(60)}
            rx={px(1.5)}
            fill={COR}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.9, times: [0, 0.12, 1], ease: "easeOut" }}
          />
          <motion.circle
            cx={encaixe.x}
            cy={encaixe.y}
            fill="none"
            stroke={COR}
            strokeWidth={px(1)}
            initial={{ r: px(6), opacity: 0.55 }}
            animate={{ r: px(38), opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => setEncaixe((e) => (e?.id === encaixe.id ? null : e))}
          />
        </g>
      )}

      {gesto && (
        <motion.g key={gesto.id} style={{ opacity: opacidade }}>

          {/* O ZIGUE-ZAGUE: só perto, só antes de conectar. */}
          {porta && fase === "mao" && (
            <motion.path
              d={zigue}
              fill="none"
              stroke={COR}
              strokeWidth={px(1.5)}
              strokeLinejoin="round"
              strokeLinecap="round"
              filter={`url(#brilho-${brilho})`}
            />
          )}

          {/* A PORTA DE DESTINO: anel colorido em volta de um ponto branco. */}
          {porta && (
            <g>
              {fase === "mao" && (
                <motion.circle
                  cx={porta.x}
                  cy={porta.y}
                  fill="none"
                  stroke={COR}
                  strokeWidth={px(1.5)}
                  filter={`url(#brilho-${brilho})`}
                  initial={{ r: px(4), opacity: 0 }}
                  animate={{ r: px(10), opacity: 1 }}
                  transition={{ duration: reduzido ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
              <circle
                cx={porta.x}
                cy={porta.y}
                r={px(4.5)}
                fill={conectado ? COR : BRANCO}
                stroke="rgb(0 0 0 / 0.55)"
                strokeWidth={px(1.5)}
              />
            </g>
          )}

          {/* A ponta na mão. */}
          {!conectado && <motion.circle cx={hx} cy={hy} r={px(3)} fill={BRANCO} />}

          {gesto.quantas > 1 && (
            <motion.text
              x={hx}
              y={hy}
              dx={px(10)}
              dy={px(-10)}
              className="font-mono"
              style={{ fontSize: px(11), letterSpacing: "0.06em", fill: "var(--ds-text-secondary, #aaa)" }}
            >
              {gesto.quantas} folhas
            </motion.text>
          )}
        </motion.g>
      )}
    </svg>
    </>
  );
});

/**
 * O CABO EM S: tangentes horizontais nas duas pontas, como o do vídeo. O braço
 * dos controles cresce com o vão horizontal e tem um piso, para o cabo não virar
 * reta quando origem e ponta estão quase na mesma coluna.
 */
export function emS(x0: number, y0: number, x1: number, y1: number): string {
  const braco = Math.max(Math.abs(x1 - x0) * 0.5, Math.min(Math.abs(y1 - y0) * 0.35, 80), 24);
  const sentido = x1 >= x0 ? 1 : -1;
  return `M ${x0} ${y0} C ${x0 + braco * sentido} ${y0} ${x1 - braco * sentido} ${y1} ${x1} ${y1}`;
}

/**
 * O ZIGUE-ZAGUE ELÉTRICO entre a ponta e a porta: dentes alternados na
 * perpendicular, com amplitude que varia por dente e por quadro (`fase`), o
 * que faz o raio tremer. Pseudoaleatório determinístico — sem `Math.random`.
 */
export function zigueZague(x0: number, y0: number, x1: number, y1: number, amplitude: number, fase: number): string {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const vao = Math.hypot(dx, dy);
  if (vao < 0.5) return `M ${x0} ${y0} L ${x1} ${y1}`;
  const nx = -dy / vao;
  const ny = dx / vao;
  const dentes = Math.max(4, Math.min(9, Math.round(vao / (amplitude * 2.6))));
  let d = `M ${x0} ${y0}`;
  for (let i = 1; i < dentes; i++) {
    const t = i / dentes;
    const ruido = 0.55 + 0.45 * Math.abs(Math.sin((i + 1) * 12.9898 + fase * 78.233));
    const a = (i % 2 === 0 ? 1 : -1) * amplitude * ruido;
    d += ` L ${x0 + dx * t + nx * a} ${y0 + dy * t + ny * a}`;
  }
  return `${d} L ${x1} ${y1}`;
}
