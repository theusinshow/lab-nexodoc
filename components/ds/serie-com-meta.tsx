"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";

import "./medidas.css";

/*
 * SÉRIE COM META (Animated Area + Threshold Band, da Matos UI). Uma medida
 * por gráfico (nunca dois eixos): traço de 2 px, área a 10%, a meta como fio
 * fino com o texto na ponta. Cada ponto diz se está DENTRO (verde) ou FORA
 * (âmbar) da meta; sem meta declarada, nenhum ponto ganha cor — a regra do
 * painel de qualidade do app. O mouse acha a semana mais perto (crosshair)
 * e o rodapé lê o valor primeiro.
 */

export interface PontoDaSerie {
  eixo: string;
  valor: number | null;
  rotulo: ReactNode;
}

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];

export function SerieComMeta({
  pontos,
  meta,
  sentido,
  teto = 100,
  altura = 132,
  padrao,
  sufixo = "%",
}: {
  pontos: PontoDaSerie[];
  /** null = meta não declarada. */
  meta: number | null;
  /** "max": dentro quando ≤ meta; "min": dentro quando ≥ meta. */
  sentido: "max" | "min";
  teto?: number;
  altura?: number;
  padrao?: ReactNode;
  sufixo?: string;
}) {
  const { dur } = useTempo();
  const id = useId().replace(/:/g, "");
  const caixa = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(480);
  const [sobre, setSobre] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const medir = () => setW(Math.max(160, el.clientWidth));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const esq = 30;
  const dir = 76;
  const topo = 10;
  const base = altura - 4;
  const x = (i: number) => esq + (i / Math.max(1, pontos.length - 1)) * (w - esq - dir);
  const y = (v: number) => base - (v / teto) * (base - topo);
  const validos = pontos.map((p, i) => ({ ...p, i })).filter((p) => p.valor !== null) as (PontoDaSerie & { i: number; valor: number })[];
  const linha = validos.map((p, k) => `${k ? "L" : "M"}${x(p.i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
  const area = validos.length ? `${linha} L${x(validos[validos.length - 1].i).toFixed(1)},${base} L${x(validos[0].i).toFixed(1)},${base} Z` : "";
  const situacao = (v: number) => (meta === null ? "sem-meta" : (sentido === "max" ? v <= meta : v >= meta) ? "dentro" : "fora");

  const mover = (e: React.PointerEvent) => {
    const r = caixa.current!.getBoundingClientRect();
    const px = e.clientX - r.left;
    let melhor = 0;
    pontos.forEach((_, i) => {
      if (Math.abs(x(i) - px) < Math.abs(x(melhor) - px)) melhor = i;
    });
    setSobre(melhor);
  };

  return (
    <div className="md-serie">
      <div ref={caixa} className="md-serie-caixa" style={{ height: altura }} onPointerMove={mover} onPointerLeave={() => setSobre(null)}>
        <svg width={w} height={altura} aria-hidden>
          <defs>
            <linearGradient id={`serie-${id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" className="md-tendencia-topo" />
              <stop offset="1" className="md-tendencia-base" />
            </linearGradient>
            <clipPath id={`abre-serie-${id}`}>
              <motion.rect x="0" y="0" height={altura} initial={{ width: 0 }} animate={{ width: w }} transition={{ duration: dur("layout") * 2, ease: ease(CURVA.out) }} />
            </clipPath>
          </defs>
          {/* grade: só a base e o teto, em fio */}
          <line x1={esq} x2={w - dir} y1={base} y2={base} className="md-serie-grade" />
          <text x={esq - 6} y={base} className="md-serie-tick" textAnchor="end" dominantBaseline="middle">
            0{sufixo}
          </text>
          <text x={esq - 6} y={topo} className="md-serie-tick" textAnchor="end" dominantBaseline="middle">
            {teto}
            {sufixo}
          </text>
          {meta !== null && (
            <g className="md-serie-meta">
              <line x1={esq} x2={w - dir} y1={y(meta)} y2={y(meta)} />
              <text x={w - dir + 6} y={y(meta)} dominantBaseline="middle">
                meta {sentido === "max" ? "≤" : "≥"} {meta}
                {sufixo}
              </text>
            </g>
          )}
          <g clipPath={`url(#abre-serie-${id})`}>
            <path d={area} fill={`url(#serie-${id})`} />
            <path d={linha} className="md-serie-linha" />
          </g>
          {sobre !== null && <line x1={x(sobre)} x2={x(sobre)} y1={topo} y2={base} className="md-serie-mira" />}
          {validos.map((p) => (
            <motion.circle
              key={p.eixo}
              cx={x(p.i)}
              cy={y(p.valor)}
              r={sobre === p.i ? 5 : 4}
              className={`md-serie-ponto md-serie-ponto--${situacao(p.valor)}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: dur("feedback"), delay: dur("layout") * 1.2 + p.i * 0.03 }}
            />
          ))}
        </svg>
      </div>
      <div className="md-serie-eixo" style={{ paddingLeft: esq, paddingRight: dir }} aria-hidden>
        {pontos.map((p, i) => (
          <span key={p.eixo}>{i === 0 || i === pontos.length - 1 || i === Math.floor(pontos.length / 2) ? p.eixo : ""}</span>
        ))}
      </div>
      <div className="md-rodape">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={sobre ?? "padrao"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur("feedback") }}>
            {sobre === null ? padrao : pontos[sobre]?.rotulo}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
