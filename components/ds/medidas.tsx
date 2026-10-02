"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState, type ReactNode } from "react";

import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";

import "./medidas.css";

/*
 * MEDIDAS: os gráficos de dinheiro e de volume, no mesmo idioma de
 * graficos.tsx (Matos UI): monocromáticos, trilho com textura, o dado se
 * revela ao entrar, o mouse lê no rodapé. Cor só para estado (âmbar, coral).
 */

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];

/**
 * MEDIDOR DE TETO (Risk Score Gauge). Meio círculo: o gasto preenche, o que
 * sobra do teto fica listrado. A cor é estado: neutra até 80%, âmbar até
 * 100%, coral quando estourou. O número grande é a porcentagem.
 */
export function MedidorDeTeto({ valor, teto, rotulo }: { valor: number; teto: number; rotulo: ReactNode }) {
  const { dur } = useTempo();
  const id = useId().replace(/:/g, "");
  const fracao = Math.min(1, valor / teto);
  const estado = valor >= teto ? "estourou" : fracao >= 0.8 ? "perto" : "ok";
  const r = 80;
  const arco = `M ${100 - r} 96 A ${r} ${r} 0 0 1 ${100 + r} 96`;
  const angulo = Math.PI * (1 - fracao);
  const ponta = { x: 100 + r * Math.cos(angulo), y: 96 - r * Math.sin(angulo) };
  return (
    <div className={`md-medidor md-medidor--${estado}`}>
      <svg viewBox="0 0 200 104" className="md-medidor-svg" aria-hidden>
        <defs>
          <pattern id={`listra-${id}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(135)">
            <rect width="2" height="6" className="md-medidor-listra" />
          </pattern>
        </defs>
        <path d={arco} className="md-medidor-trilho" />
        <path d={arco} className="md-medidor-resto" stroke={`url(#listra-${id})`} />
        <motion.path d={arco} className="md-medidor-gasto" initial={{ pathLength: 0 }} animate={{ pathLength: fracao }} transition={{ duration: dur("layout") * 2, ease: ease(CURVA.out) }} />
        <motion.circle className="md-medidor-ponta" r="5" cx={ponta.x} cy={ponta.y} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: dur("layout"), delay: dur("layout") * 1.6 }} />
      </svg>
      <b className="md-medidor-pct">{Math.round((valor / teto) * 100)}%</b>
      <span className="md-medidor-rotulo">{rotulo}</span>
    </div>
  );
}

export interface DiaDaOnda {
  eixo: string;
  valor: number;
  /** O que o rodapé diz quando o mouse está neste dia (o valor primeiro). */
  rotulo: ReactNode;
}

/**
 * ONDA DE GASTO (Activity Waveform). Uma coluna fina por dia, densa, ancorada
 * na base, hoje no tom claro. O mouse (ou o foco) lê o dia no rodapé.
 */
export function OndaDeGasto({ dias, altura = 150, padrao }: { dias: DiaDaOnda[]; altura?: number; padrao?: ReactNode }) {
  const { dur, k } = useTempo();
  const [sobre, setSobre] = useState<number | null>(null);
  const maximo = Math.max(1, ...dias.map((d) => d.valor));
  const marcas = dias.length > 10 ? [0, Math.floor(dias.length / 2), dias.length - 1] : dias.map((_, i) => i);
  return (
    <div className="md-onda">
      <div className={`md-onda-area${sobre !== null ? " md-onda--foco" : ""}`} style={{ height: altura }} onMouseLeave={() => setSobre(null)}>
        {dias.map((d, i) => (
          <span
            key={d.eixo}
            className={`md-onda-dia${i === dias.length - 1 ? " md-onda-dia--hoje" : ""}${sobre === i ? " md-onda-dia--sobre" : ""}`}
            onMouseEnter={() => setSobre(i)}
            onFocus={() => setSobre(i)}
            onBlur={() => setSobre(null)}
            tabIndex={0}
            aria-label={d.eixo}
          >
            <motion.i
              style={{ height: `${Math.max(2, (d.valor / maximo) * 100)}%` }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: dur("layout") * 1.4, delay: i * 0.008 * k, ease: ease(CURVA.out) }}
            />
          </span>
        ))}
      </div>
      <div className="md-onda-eixo" aria-hidden>
        {dias.map((d, i) => (
          <span key={d.eixo}>{marcas.includes(i) ? d.eixo : ""}</span>
        ))}
      </div>
      <div className="md-rodape">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={sobre ?? "padrao"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur("feedback") }}>
            {sobre === null ? padrao : dias[sobre]?.rotulo}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

export interface ParteDaBarra {
  id: string;
  rotulo: string;
  valor: number;
  /** O número já formatado, ao lado do rótulo. */
  texto: string;
}

/**
 * BARRA DIVIDIDA (split ratio bar). Parte-do-todo numa faixa só, 2 px de chão
 * entre as partes, até TRÊS passos de cinza (o maior primeiro); mais que isso
 * vira lista com barra embutida. A legenda vem sempre,
 * com valor e porcentagem: a cor nunca carrega a identidade sozinha.
 */
export function BarraDividida({ partes }: { partes: ParteDaBarra[] }) {
  const { dur, k } = useTempo();
  const [sobre, setSobre] = useState<string | null>(null);
  const total = Math.max(1, partes.reduce((a, p) => a + p.valor, 0));
  return (
    <div className="md-dividida">
      <div className="md-dividida-faixa" onMouseLeave={() => setSobre(null)}>
        {partes.map((p, i) => (
          <motion.span
            key={p.id}
            className={`md-dividida-parte md-tom-${Math.min(i, 2)}${sobre && sobre !== p.id ? " md--fora" : ""}`}
            style={{ flexGrow: p.valor }}
            onMouseEnter={() => setSobre(p.id)}
            title={`${p.rotulo}: ${p.texto}`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: dur("layout") * 1.4, delay: i * 0.05 * k, ease: ease(CURVA.out) }}
          />
        ))}
      </div>
      <ul className="md-dividida-legenda">
        {partes.map((p, i) => (
          <li key={p.id} className={sobre && sobre !== p.id ? "md--fora" : undefined} onMouseEnter={() => setSobre(p.id)} onMouseLeave={() => setSobre(null)}>
            <i className={`md-tom-${Math.min(i, 2)}`} aria-hidden />
            <span>{p.rotulo}</span>
            <b className="ds-num">{p.texto}</b>
            <em className="ds-num">{Math.round((p.valor / total) * 100)}%</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * LINHA DE TENDÊNCIA (Sparkline Card). Traço de 2 px, área a 10%, o ponto do
 * último valor com anel no tom do chão. Sem eixo: vai num cartão de número.
 * `alerta` pinta de coral (estado), nunca por enfeite.
 */
export function LinhaDeTendencia({ valores, altura = 32, alerta }: { valores: number[]; altura?: number; alerta?: boolean }) {
  const { dur } = useTempo();
  const id = useId().replace(/:/g, "");
  const w = 120;
  const max = Math.max(...valores);
  const min = Math.min(...valores);
  const faixa = Math.max(1e-9, max - min);
  const y = (v: number) => altura - 3 - ((v - min) / faixa) * (altura - 8);
  const x = (i: number) => (i / Math.max(1, valores.length - 1)) * (w - 6) + 1;
  const linha = valores.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${linha} L${x(valores.length - 1).toFixed(1)},${altura} L${x(0).toFixed(1)},${altura} Z`;
  const ux = x(valores.length - 1) / w;
  const uy = y(valores[valores.length - 1]) / altura;
  return (
    <span className={`md-tendencia${alerta ? " md-tendencia--alerta" : ""}`} style={{ height: altura }}>
      <svg viewBox={`0 0 ${w} ${altura}`} preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={`area-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" className="md-tendencia-topo" />
            <stop offset="1" className="md-tendencia-base" />
          </linearGradient>
          {/* A revelação é uma máscara que abre da esquerda: o traço tem espessura fixa
              (non-scaling-stroke) e um pathLength animado o cortaria antes do fim. */}
          <clipPath id={`abre-${id}`}>
            <motion.rect x="-4" y="-8" height={altura + 16} initial={{ width: 0 }} animate={{ width: w + 8 }} transition={{ duration: dur("layout") * 1.8, ease: ease(CURVA.out) }} />
          </clipPath>
        </defs>
        <g clipPath={`url(#abre-${id})`}>
          <path d={area} fill={`url(#area-${id})`} />
          <path d={linha} className="md-tendencia-linha" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
      {/* O ponto fica fora do SVG esticado, para continuar redondo. */}
      <motion.i className="md-tendencia-ponto" style={{ left: `${ux * 100}%`, top: `${uy * 100}%` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: dur("feedback"), delay: dur("layout") * 1.6 }} />
    </span>
  );
}

/**
 * BARRA EMBUTIDA (Allocation, deitada). Uma por linha de tabela: o trilho com
 * textura é o maior valor da tabela, a pílula é esta linha.
 */
export function BarraEmbutida({ valor, maximo }: { valor: number; maximo: number }) {
  const { dur } = useTempo();
  return (
    <span className="md-embutida" aria-hidden>
      <motion.i style={{ width: `${Math.max(2, (valor / Math.max(1, maximo)) * 100)}%` }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: dur("layout") * 1.4, ease: ease(CURVA.out) }} />
    </span>
  );
}
