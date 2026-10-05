"use client";

import { Bell, BellRing, Check } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useTempo } from "@/lib/ds/tempo";
import "./micro.css";

/*
 * MICRO-INTERAÇÕES DO SISTEMA (01/10/2026). Vieram de referências que o
 * Matheus trouxe (React Bits, SpaceUI, Skecher, MUI), reescritas na direção do
 * Nexo: técnico e seco, violeta só onde é o Nexo, vermelho só onde se perde
 * algo, e movimento só em resposta a um gesto ou enquanto algo de fato espera.
 */

/* ------------------------------------------------------------------------ */
/* SEGURAR PARA CONFIRMAR (ref.: Hold Button)                               */
/* ------------------------------------------------------------------------ */

/**
 * Para o que apaga de verdade (o 2º peso das confirmações): o botão só age
 * se for SEGURADO até encher. Soltar antes devolve tudo, sem nada acontecer.
 * Teclado: segurar Espaço ou Enter. O tempo (1,2 s) é curto o bastante para
 * não irritar e longo o bastante para não sair por acidente.
 */
export function BotaoDeSegurar({
  children,
  feito = "Excluído",
  duracao = 1200,
  onConfirmar,
  className = "",
  ...resto
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & { children: ReactNode; feito?: string; duracao?: number; onConfirmar?: () => void }) {
  const [estado, setEstado] = useState<"parado" | "segurando" | "feito">("parado");
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);

  const comecar = () => {
    if (estado !== "parado") return;
    setEstado("segurando");
    relogio.current = setTimeout(() => {
      setEstado("feito");
      onConfirmar?.();
    }, duracao);
  };
  const soltar = () => {
    if (estado !== "segurando") return;
    if (relogio.current) clearTimeout(relogio.current);
    setEstado("parado");
  };
  useEffect(() => () => void (relogio.current && clearTimeout(relogio.current)), []);

  return (
    <button
      type="button"
      {...resto}
      className={`ds-btn ds-btn--sm ds-segurar ${className}`}
      data-estado={estado}
      style={{ ["--segurar" as string]: `${duracao}ms` }}
      aria-live="polite"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        comecar();
      }}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      onPointerLeave={soltar}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          comecar();
        }
      }}
      onKeyUp={(e) => (e.key === " " || e.key === "Enter") && soltar()}
      disabled={estado === "feito" || resto.disabled}
    >
      <span className="ds-segurar-enche" aria-hidden />
      <span className="ds-segurar-texto">
        {estado === "feito" ? (
          <>
            <Check size={14} /> {feito}
          </>
        ) : (
          children
        )}
      </span>
      <span className="ds-segurar-dica" aria-hidden>
        {estado === "segurando" ? "segure…" : "segure"}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------------ */
/* TRELIÇA (ref.: Lattice Loader)                                           */
/* ------------------------------------------------------------------------ */

/**
 * O Nexo pensando, antes da primeira palavra: uma grade 3 × 3 que se varre
 * como quem lê páginas, um ponto violeta correndo pela borda. Só existe
 * enquanto ele de fato espera a resposta; sai quando a primeira palavra chega.
 */
export function Trelica() {
  // a ordem da volta pela borda (o centro fica apagado: é a página em leitura)
  const ordem = [0, 1, 2, 5, 8, 7, 6, 3];
  return (
    <span className="ds-trelica" aria-hidden>
      {Array.from({ length: 9 }, (_, i) => {
        const n = ordem.indexOf(i);
        return <i key={i} style={n >= 0 ? { animationDelay: `${n * 0.1}s` } : undefined} data-centro={i === 4 || undefined} />;
      })}
    </span>
  );
}

/** Segundos desde que começou, com uma casa: "3,1 s". Só conta enquanto existe. */
export function Cronometro({ desde }: { desde: number }) {
  const [agora, setAgora] = useState(desde);
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
  return <span className="ds-num ds-cronometro">{Math.max(0, (agora - desde) / 1000).toFixed(1).replace(".", ",")} s</span>;
}

/* ------------------------------------------------------------------------ */
/* DICA COM AQUECIMENTO (ref.: Warm Tooltip)                                */
/* ------------------------------------------------------------------------ */

// Quando uma dica acabou de fechar, a próxima abre na hora: quem anda pela
// fileira de ícones lê uma atrás da outra sem esperar de novo.
let ultimaFechou = 0;
/** O relógio fora do componente: chamado só em evento (abrir/fechar), nunca no render. */
const agora = () => Date.now();

/**
 * A raiz `.ds` mais de fora: é onde a dica é desenhada. Dentro do palco do Nexo
 * algum ancestral cria bloco de contenção (transform/contain) — o `fixed` da
 * dica passava a contar dali, ela nascia ~280px à direita, atrás do chat, e o
 * z-index preso naquele contexto não a tirava de lá (04/10/2026). Na raiz, o
 * `fixed` volta a ser a janela. Precisa ser uma `.ds`: o CSS é `.ds .ds-dica`.
 */
function raizDoSistema(el: HTMLElement | null) {
  let raiz: HTMLElement | null = null;
  for (let no = el; no; no = no.parentElement) if (no.classList.contains("ds")) raiz = no;
  return raiz;
}

/**
 * Onde a dica nasce, medida no botão e convertida para dentro da raiz.
 *
 * O ZOOM DA RAIZ: em tela de 2300px ou mais a `.ds` tem `zoom: 1,125`, e a
 * posição medida na janela, usada como `left`/`top` lá dentro, saía
 * multiplicada por ele — a dica nascia longe do botão (05/10/2026).
 */
function posicaoDaDica(el: HTMLElement | null, lado: "cima" | "baixo" | "esquerda") {
  const r = el?.getBoundingClientRect();
  if (!r) return null;
  const raiz = raizDoSistema(el);
  const z = raiz ? parseFloat(getComputedStyle(raiz).zoom || "1") || 1 : 1;
  const p = lado === "esquerda" ? { x: r.left - 8, y: r.top + r.height / 2 } : lado === "baixo" ? { x: r.left + r.width / 2, y: r.bottom + 7 } : { x: r.left + r.width / 2, y: r.top - 7 };
  return { x: p.x / z, y: p.y / z };
}

/**
 * A dica de um botão só de ícone: o nome e a tecla. A primeira espera 400 ms
 * (passar o mouse por cima não acende nada); as seguintes, se vierem logo,
 * abrem na hora. Abre também com o foco do teclado.
 */
export function Dica({ texto, tecla, lado = "cima", children }: { texto: string; tecla?: string; lado?: "cima" | "baixo" | "esquerda"; children: ReactNode }) {
  const [aberta, setAberta] = useState(false);
  // presa à janela, calculada do botão: nenhuma caixa com overflow escondido a corta
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const ancora = useRef<HTMLSpanElement>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mostrar = () => {
    const p = posicaoDaDica(ancora.current, lado);
    if (p) setPos(p);
    setAberta(true);
  };
  const abrir = () => {
    const quente = agora() - ultimaFechou < 300;
    if (espera.current) clearTimeout(espera.current);
    if (quente) mostrar();
    else espera.current = setTimeout(mostrar, 400);
  };
  const fechar = () => {
    if (espera.current) clearTimeout(espera.current);
    setAberta((a) => {
      if (a) ultimaFechou = agora();
      return false;
    });
  };
  useEffect(() => () => void (espera.current && clearTimeout(espera.current)), []);
  return (
    <span ref={ancora} className="ds-dica-ancora" onPointerEnter={abrir} onPointerLeave={fechar} onFocus={abrir} onBlur={fechar}>
      {children}
      {aberta &&
        (() => {
          const dica = (
            <span className="ds-dica" data-lado={lado} role="tooltip" style={{ left: pos.x, top: pos.y }}>
              {texto}
              {tecla && <kbd className="ds-kbd">{tecla}</kbd>}
            </span>
          );
          const raiz = raizDoSistema(ancora.current);
          return raiz ? createPortal(dica, raiz) : dica;
        })()}
    </span>
  );
}

/* ------------------------------------------------------------------------ */
/* GRUPO DE BOTÕES (ref.: MUI Button Group)                                 */
/* ------------------------------------------------------------------------ */

/**
 * Ações irmãs coladas num bloco só, com um fio entre elas: lê como UMA
 * decisão com saídas, não como três botões soltos. Num espaço estreito, cada
 * botão troca o rótulo longo pelo curto (data-curto) e esconde a tecla.
 */
export function GrupoDeBotoes({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="ds-grupo" role="group" aria-label={rotulo}>
      {children}
    </div>
  );
}

export function BotaoDoGrupo({
  principal,
  curto,
  tecla,
  children,
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { principal?: boolean; curto?: string; tecla?: string; children: ReactNode }) {
  return (
    <button type="button" {...resto} className={`ds-grupo-botao${principal ? " ds-grupo-botao--principal" : ""}`}>
      <span className="ds-grupo-longo">{children}</span>
      {curto && <span className="ds-grupo-curto">{curto}</span>}
      {tecla && <kbd className="ds-kbd">{tecla}</kbd>}
    </button>
  );
}

/* ------------------------------------------------------------------------ */
/* SINO DE AVISO (ref.: Bell Toggle)                                        */
/* ------------------------------------------------------------------------ */

/**
 * "Me avise quando terminar": um interruptor com cara do que faz. Ligar dá
 * UMA balançada no sino (resposta ao clique) e o texto confirma o combinado.
 */
export function SinoDeAviso({ ligado, onTroca, rotulo = "Me avise quando terminar", ligadoRotulo = "Vou avisar por e-mail" }: { ligado: boolean; onTroca: (v: boolean) => void; rotulo?: string; ligadoRotulo?: string }) {
  const [balancou, setBalancou] = useState(0);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      className="ds-sino"
      onClick={() => {
        if (!ligado) setBalancou((n) => n + 1);
        onTroca(!ligado);
      }}
    >
      <span key={balancou} className="ds-sino-icone" data-balanca={balancou > 0 || undefined}>
        {ligado ? <BellRing size={14} /> : <Bell size={14} />}
      </span>
      {ligado ? ligadoRotulo : rotulo}
    </button>
  );
}

/* ------------------------------------------------------------------------ */
/* MARCA DE ESTADO (ref.: Status Mark)                                      */
/* ------------------------------------------------------------------------ */

export type EstadoDaMarca = "pendente" | "rodando" | "feito" | "atencao" | "falhou";

/**
 * Como uma tarefa terminou, num sinal só: o anel tracejado espera, o arco gira
 * enquanto há trabalho, o visto fecha, o ponto de exclamação pede decisão, a
 * cruz barra. A cor vem do sinal (`--marca`), e o desenho do traço acontece
 * QUANDO O ESTADO MUDA — nunca ao montar a lista, que viraria uma coluna inteira
 * se desenhando sozinha.
 */
export function MarcaDeEstado({ estado, tamanho = 14, rotulo }: { estado: EstadoDaMarca; tamanho?: number; rotulo?: string }) {
  const { dur } = useTempo();
  // Na montagem o traço já está desenhado; ele só se desenha quando o estado muda.
  const [inicial] = useState(estado);
  const desenho = {
    initial: estado !== inicial ? { pathLength: 0, opacity: 0 } : (false as const),
    animate: { pathLength: 1, opacity: 1 },
    transition: { duration: dur("state") },
  };
  return (
    <svg className={`ds-marca ds-marca--${estado}`} width={tamanho} height={tamanho} viewBox="0 0 24 24" role={rotulo ? "img" : undefined} aria-label={rotulo} aria-hidden={rotulo ? undefined : true}>
      {estado === "pendente" ? (
        <circle cx="12" cy="12" r="9" className="ds-marca-anel" pathLength={1} strokeDasharray="0.0625 0.0625" />
      ) : estado === "rodando" ? (
        <>
          <circle cx="12" cy="12" r="9" className="ds-marca-trilho" />
          <circle cx="12" cy="12" r="9" className="ds-marca-arco" pathLength={1} strokeDasharray="0.3 0.7" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9" className="ds-marca-anel ds-marca-cheio" />
          {estado === "feito" && <motion.path key="v" d="M8 12.4l2.7 2.6L16 9.6" className="ds-marca-traco" {...desenho} />}
          {estado === "falhou" && <motion.path key="x" d="M9 9l6 6M15 9l-6 6" className="ds-marca-traco" {...desenho} />}
          {estado === "atencao" && (
            <>
              <motion.path key="!" d="M12 7.5v5.5" className="ds-marca-traco" {...desenho} />
              <circle cx="12" cy="16.4" r="1.1" className="ds-marca-ponto" />
            </>
          )}
        </>
      )}
    </svg>
  );
}
