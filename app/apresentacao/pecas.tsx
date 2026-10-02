"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/**
 * AS PEÇAS COMPARTILHADAS DAS APRESENTAÇÕES.
 *
 * `/apresentacao` e `/apresentacao/valores` são dois decks que precisam parecer
 * o MESMO documento — a página de valores entra na projeção logo depois do
 * deck. Uma segunda redação das mesmas peças divergiria na primeira correção.
 *
 * O QUE MORA AQUI (segunda versão, 02/10/2026): o movimento (entrada, máscara
 * de linha, número que corre), o vocabulário do app na escala do palco (selo,
 * mostrador, papel com grifo, checklist) e o DIAGRAMA — uma caixa de pixels
 * fixos onde fios em SVG e nós em HTML se encontram por conta.
 */

/** A família de código do sistema novo (Geist Mono), para página, obra e arquivo. */
export const MONO = "var(--ds-font-mono)";

/* ───────────────────────────────────────────────────────────── movimento */

/**
 * Entrada. O atraso é a ORDEM DE LEITURA tornada visível: o olho chega em cada
 * peça no instante em que a anterior terminou de ser lida.
 */
export function Entra({
  atraso = 0,
  children,
  style,
  className = "ap-entra",
}: {
  atraso?: number;
  children: ReactNode;
  style?: CSSProperties;
  /** `ap-entra` (sobe), `ap-assenta` (cresce um passo) ou `ap-surge` (só aparece). */
  className?: string;
}) {
  return (
    <div className={className} style={{ animationDelay: `${atraso}ms`, ...style }}>
      {children}
    </div>
  );
}

/**
 * O número corre até o valor. O valor É o argumento, e vê-lo chegar prende o
 * olho nele por um segundo a mais. Movimento reduzido recebe o número final na
 * hora — um zero no lugar de um número é pior do que a animação indesejada.
 */
export function Contador({
  ate,
  duracao = 900,
  atraso = 0,
  formato = (n) => String(n),
}: {
  ate: number;
  duracao?: number;
  atraso?: number;
  formato?: (n: number) => string;
}) {
  const [valor, setValor] = useState(0);

  useEffect(() => {
    let quadro = 0;
    let inicio = 0;
    /* A decisão mora DENTRO do temporizador: setState síncrono no efeito o lint recusa. */
    const reduzido = !!window.matchMedia?.("(prefers-reduced-motion: reduce)")
      .matches;
    const relogio = setTimeout(
      () => {
        if (reduzido) {
          setValor(ate);
          return;
        }
        const passo = (agora: number) => {
          if (!inicio) inicio = agora;
          const t = Math.min(1, (agora - inicio) / duracao);
          // Desaceleração cúbica: chega devagar, como um ponteiro assentando.
          setValor(Math.round(ate * (1 - Math.pow(1 - t, 3))));
          if (t < 1) quadro = requestAnimationFrame(passo);
        };
        quadro = requestAnimationFrame(passo);
      },
      reduzido ? 0 : atraso,
    );
    return () => {
      clearTimeout(relogio);
      cancelAnimationFrame(quadro);
    };
  }, [ate, atraso, duracao]);

  return <>{formato(valor)}</>;
}

/**
 * LINHAS REVELADAS POR MÁSCARA, uma de cada vez: o texto nasce na própria linha
 * de base. Cada item é uma linha deliberada — o palco tem largura fixa.
 */
export function Linhas({
  linhas,
  atraso = 0,
  passo = 110,
}: {
  linhas: readonly string[];
  atraso?: number;
  passo?: number;
}) {
  return (
    <>
      {linhas.map((linha, i) => (
        <span key={linha} className="ap-mascara">
          <span
            className="ap-linha"
            style={{ animationDelay: `${atraso + i * passo}ms` }}
          >
            {linha}
          </span>
        </span>
      ))}
    </>
  );
}

/* ─────────────────────────────────────────────────── vocabulário do app */

export type TomDoSelo = "neutro" | "linha" | "ok" | "block" | "decide" | "nexo";

/** O SELO do app: diz ESTADO — medido, em aberto, impede emitir. */
export function Selo({
  tom = "neutro",
  ponto = true,
  children,
}: {
  tom?: TomDoSelo;
  ponto?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={tom === "neutro" ? "ap-selo" : `ap-selo ap-selo--${tom}`}>
      {ponto ? <i aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

/** O MOSTRADOR — o número grande do app sobre o rótulo. Vários vão numa `.ap-regua-num`. */
export function Mostrador({
  valor,
  rotulo,
  atraso,
}: {
  valor: ReactNode;
  rotulo: string;
  atraso: number;
}) {
  return (
    <div>
      <span className="ap-mascara">
        <span
          className="ap-linha ap-mostrador__valor"
          style={{ animationDelay: `${atraso}ms` }}
        >
          {valor}
        </span>
      </span>
      <span
        className="ap-mostrador__rotulo ap-entra"
        style={{ animationDelay: `${atraso + 120}ms` }}
      >
        {rotulo}
      </span>
    </div>
  );
}

/**
 * O PAPEL — uma página do memorial, como o "Ver no memorial" a abre. O nome do
 * arquivo e a página no cabeçalho; o conteúdo é o que foi conferido.
 */
export function Papel({
  arquivo,
  pagina,
  atraso = 0,
  children,
  style,
}: {
  arquivo: string;
  pagina?: string;
  atraso?: number;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      className="ap-papel ap-entra"
      style={{ animationDelay: `${atraso}ms`, ...style }}
    >
      <div className="ap-papel__cabeca">
        <span>{arquivo}</span>
        {pagina ? <span>{pagina}</span> : null}
      </div>
      {children}
    </div>
  );
}

/**
 * Uma linha da página que NÃO é transcrição: o deck só escreve o que conferiu,
 * e o resto da página aparece como traço cinza.
 */
export function LinhaDePapel({ largura }: { largura: string }) {
  return (
    <span
      aria-hidden="true"
      className="ap-papel__linha"
      style={{ width: largura }}
    />
  );
}

/** O GRIFO: a cor do nível sob o trecho, acendendo depois que o texto chegou. */
export function Grifo({
  tom = "block",
  atraso,
  children,
}: {
  tom?: "block" | "decide" | "note";
  atraso: number;
  children: ReactNode;
}) {
  return (
    <mark
      className={tom === "block" ? "ap-grifo" : `ap-grifo ap-grifo--${tom}`}
      style={{ animationDelay: `${atraso}ms` }}
    >
      {children}
    </mark>
  );
}

/* ──────────────────────────────────────────────────────────── diagrama */

/**
 * A CAIXA DO DIAGRAMA: largura e altura em pixels do palco. `fios` é o SVG
 * (no mesmo sistema de coordenadas), `children` são os nós e as partículas.
 */
export function Diagrama({
  largura,
  altura,
  fios,
  children,
  style,
}: {
  largura: number;
  altura: number;
  fios?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      className="ap-diagrama"
      style={{ width: largura, height: altura, ...style }}
    >
      <svg
        width={largura}
        height={altura}
        viewBox={`0 0 ${largura} ${altura}`}
        aria-hidden="true"
      >
        {fios}
      </svg>
      {children}
    </div>
  );
}

export type TomDoFio = "neutro" | "nexo" | "block" | "ok";

/**
 * UM FIO, que se desenha do começo ao fim. `seta` põe a ponta aberta no fim,
 * apontando para `dir` — a mesma seta aprovada no Mapa do volume.
 */
export function Fio({
  d,
  atraso,
  tom = "neutro",
  seta,
}: {
  d: string;
  atraso: number;
  tom?: TomDoFio;
  seta?: { x: number; y: number; dir: "direita" | "baixo" | "cima" | "esquerda" };
}) {
  const classe = `ap-fio ap-traco${tom === "neutro" ? "" : ` ap-fio--${tom}`}`;
  const giro = { direita: 0, baixo: 90, esquerda: 180, cima: 270 } as const;
  return (
    <>
      <path
        d={d}
        pathLength={1}
        className={classe}
        style={{ animationDelay: `${atraso}ms` }}
      />
      {seta ? (
        /* O giro mora no <g>: no movimento reduzido o CSS zera `transform` da
           classe animada, e a ponta caía no canto do diagrama. */
        <g transform={`translate(${seta.x} ${seta.y}) rotate(${giro[seta.dir]})`}>
          <path
            d="M -9 -7 L 0 0 L -9 7"
            className={`ap-fio ap-surge${tom === "neutro" ? "" : ` ap-fio--${tom}`}`}
            style={{ animationDelay: `${atraso + 560}ms` }}
          />
        </g>
      ) : null}
    </>
  );
}

/** O que atravessa um fio: um ponto que segue o mesmo caminho, uma vez. */
export function Particula({
  d,
  atraso,
  tom = "nexo",
  duracao = 1500,
}: {
  d: string;
  atraso: number;
  tom?: "nexo" | "block" | "ok";
  duracao?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={tom === "nexo" ? "ap-particula" : `ap-particula ap-particula--${tom}`}
      style={{
        offsetPath: `path("${d}")`,
        animationDelay: `${atraso}ms`,
        animationDuration: `${duracao}ms`,
      }}
    />
  );
}

/** UM NÓ do diagrama, posicionado em pixels. */
export function No({
  x,
  y,
  largura,
  altura,
  titulo,
  texto,
  icone,
  variante,
  atraso,
  children,
}: {
  x: number;
  y: number;
  largura: number;
  altura?: number;
  titulo?: ReactNode;
  texto?: ReactNode;
  icone?: ReactNode;
  variante?: "vazio" | "nexo" | "claro";
  atraso: number;
  children?: ReactNode;
}) {
  return (
    <div
      className={`ap-no ap-assenta${variante ? ` ap-no--${variante}` : ""}`}
      style={{
        left: x,
        top: y,
        width: largura,
        height: altura,
        animationDelay: `${atraso}ms`,
      }}
    >
      {titulo ? (
        <p className="ap-no__titulo">
          {icone}
          {titulo}
        </p>
      ) : null}
      {texto ? <p className="ap-no__texto">{texto}</p> : null}
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── checklist */

export type ItemDoChecklist = {
  titulo: string;
  texto: string;
  /** Campos a preencher na sala (dono, prazo): ficam tracejados, vazios. */
  campos?: readonly string[];
};

/**
 * O CHECKLIST do app — o "Antes de gerar" do Mapa —, na escala do palco: o que
 * precisa estar feito para a ação final valer. Começa vazio de propósito: quem
 * marca é a sala.
 */
export function Checklist({
  titulo,
  itens,
  acao,
  atraso,
}: {
  titulo: string;
  itens: readonly ItemDoChecklist[];
  acao?: string;
  atraso: number;
}) {
  return (
    <div
      className="ap-painel ap-check ap-entra"
      style={{ animationDelay: `${atraso}ms` }}
    >
      <div className="ap-check__topo">
        <span
          style={{ fontSize: 24, fontWeight: 500, color: "var(--ds-text-primary)" }}
        >
          {titulo}
        </span>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 17,
            color: "var(--ds-text-tertiary)",
          }}
        >
          0 de {itens.length}
        </span>
      </div>
      <div className="ap-check__barra" aria-hidden="true" />
      {itens.map((item, i) => (
        <div
          key={item.titulo}
          className="ap-check__item ap-entra"
          style={{ animationDelay: `${atraso + 200 + i * 160}ms` }}
        >
          <span className="ap-check__caixa" aria-hidden="true" />
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 500,
                letterSpacing: "-0.012em",
                color: "var(--ds-text-primary)",
              }}
            >
              {item.titulo}
            </p>
            <p className="ap-texto" style={{ marginTop: 4, fontSize: 21 }}>
              {item.texto}
            </p>
          </div>
          {item.campos ? (
            <div className="ap-check__campos">
              {item.campos.map((c) => (
                <span key={c} className="ap-check__campo">
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <span />
          )}
        </div>
      ))}
      {acao ? (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            paddingTop: 22,
            boxShadow: "inset 0 1px 0 var(--ds-line-subtle)",
          }}
        >
          <span
            aria-disabled="true"
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 54,
              padding: "0 28px",
              borderRadius: 999,
              background: "var(--ds-action-bg)",
              color: "var(--ds-action-fg)",
              opacity: 0.4,
              fontSize: 21,
              fontWeight: 500,
            }}
          >
            {acao}
          </span>
        </div>
      ) : null}
    </div>
  );
}
