"use client";

import { LoaderCircle } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";

/*
 * A PRANCHA DA ENTRADA. Uma folha A3 deitada (420 × 297 mm) com moldura,
 * referências de quadrícula, uma planta em traço e o carimbo no canto. O
 * carimbo é desta folha: é do próprio Nexo, e o campo SITUAÇÃO carrega o
 * estado da entrada. A planta é amostra (geometria, sem figura).
 *
 * O cursor vira retículo de desenho: as linhas cruzam a folha, a referência da
 * quadrícula acende na moldura e a posição sai em milímetros. No carimbo, cada
 * campo diz o que o Nexo tira dele. Nada anda sem a mão.
 */

const L = 420;
const A = 297;
/** A moldura: 25 mm à esquerda (encadernação), 10 nas outras. */
const M = { x0: 25, y0: 10, x1: 410, y1: 287 };
const COLUNAS = 8;
const LINHAS = ["A", "B", "C", "D", "E", "F"];
/** O carimbo, em mm: canto inferior direito, dentro da moldura interna. */
const C = { x: 268, y: 188, w: 137, h: 94 };

export type Situacao = { texto: string; tom?: "neutro" | "andando" | "erro" | "info" | "dev" };

type Campo = { id: string; rotulo: string; valor: string; le: string; mono?: boolean; area: string };

export function camposDoCarimbo(responsavel: string | null): Campo[] {
  return [
    { id: "empresa", rotulo: "Empresa", valor: "PROSUL", le: "o escritório dono da obra.", area: "emp" },
    { id: "obra", rotulo: "Obra", valor: "Nexo, documentação de projetos", le: "a que obra a folha pertence.", area: "obra" },
    { id: "titulo", rotulo: "Título", valor: "Entrada", le: "o nome da folha na LD.", area: "tit" },
    { id: "folha", rotulo: "Folha", valor: "01/01", le: "a posição da folha no volume.", mono: true, area: "fol" },
    { id: "rev", rotulo: "Rev.", valor: "b18a14d", le: "a revisão, conferida com a LD.", mono: true, area: "rev" },
    { id: "data", rotulo: "Data", valor: "01/10/2026", le: "a data de emissão da folha.", mono: true, area: "dat" },
    { id: "resp", rotulo: "Responsável", valor: responsavel ?? "—", le: "quem entrou.", mono: !!responsavel, area: "resp" },
  ];
}

export function Carimbo({
  situacao,
  responsavel,
  aceso,
  onAcender,
  compacto,
}: {
  situacao: Situacao;
  responsavel: string | null;
  aceso?: string | null;
  onAcender?: (id: string | null) => void;
  compacto?: boolean;
}) {
  const campos = camposDoCarimbo(responsavel);
  return (
    <div className={`pr-carimbo${compacto ? " pr-carimbo--compacto" : ""}`} onPointerLeave={() => onAcender?.(null)}>
      {campos.map((c) => (
        <div key={c.id} className={`pr-cel${aceso === c.id ? " pr-cel--aceso" : ""}`} style={{ gridArea: c.area }} onPointerEnter={() => onAcender?.(c.id)}>
          <span>{c.rotulo}</span>
          <b className={c.mono ? "pr-mono" : undefined}>{c.valor}</b>
        </div>
      ))}
      <div
        className={`pr-cel pr-cel--situacao pr-cel--${situacao.tom ?? "neutro"}${aceso === "situacao" ? " pr-cel--aceso" : ""}`}
        style={{ gridArea: "sit" }}
        onPointerEnter={() => onAcender?.("situacao")}
        aria-live="polite"
      >
        <span>Situação</span>
        <b>
          {situacao.tom === "andando" && <LoaderCircle className="pr-gira" aria-hidden />}
          {situacao.tom && situacao.tom !== "neutro" && situacao.tom !== "andando" && <i className="pr-sinal" aria-hidden />}
          {situacao.texto}
        </b>
      </div>
    </div>
  );
}

/** A planta de amostra: eixos, paredes, portas, cotas. Só geometria. */
function Planta() {
  const eixosX = [70, 150, 230, 290];
  const eixosY = [52, 118, 184];
  const cotas = eixosX.slice(1).map((x, i) => ({ de: eixosX[i], a: x, txt: ((x - eixosX[i]) / 10).toFixed(2).replace(".", ",") }));
  return (
    <g className="pr-planta">
      {/* eixos: traço-ponto, com o balão na ponta */}
      {eixosX.map((x, i) => (
        <g key={`x${x}`}>
          <line x1={x} y1={34} x2={x} y2={192} className="pr-eixo" />
          <circle cx={x} cy={29} r={4.2} className="pr-balao" />
          <text x={x} y={30.6} className="pr-balao-txt">
            {i + 1}
          </text>
        </g>
      ))}
      {eixosY.map((y, i) => (
        <g key={`y${y}`}>
          <line x1={52} y1={y} x2={306} y2={y} className="pr-eixo" />
          <circle cx={47} cy={y} r={4.2} className="pr-balao" />
          <text x={47} y={y + 1.6} className="pr-balao-txt">
            {"ABC"[i]}
          </text>
        </g>
      ))}
      {/* paredes externas (dupla) e internas */}
      <rect x={68.5} y={50.5} width={223} height={135} className="pr-parede" />
      <rect x={71.5} y={53.5} width={217} height={129} className="pr-parede" />
      <path d="M150 53.5 V96 M150 104 V182.5 M230 53.5 V140 M230 148 V182.5 M71.5 118 H132 M140 118 H230 M230 100 H288.5" className="pr-parede" />
      {/* portas: folha e arco */}
      <path d="M132 118 V108 A10 10 0 0 1 140 118" className="pr-porta" />
      <path d="M150 96 H158 A8 8 0 0 1 150 104" className="pr-porta" />
      <path d="M230 140 H222 A8 8 0 0 0 230 148" className="pr-porta" />
      <path d="M180 182.5 V192 M190 182.5 V192" className="pr-parede" />
      {/* janelas: três traços na parede externa */}
      {[95, 190, 255].map((x) => (
        <path key={x} d={`M${x} 50.5 H${x + 22} M${x} 52 H${x + 22} M${x} 53.5 H${x + 22}`} className="pr-janela" />
      ))}
      {/* nomes dos ambientes */}
      <text x={110} y={86} className="pr-amb">RECEPÇÃO</text>
      <text x={110} y={152} className="pr-amb">ESPERA</text>
      <text x={190} y={88} className="pr-amb">CONSULTÓRIO 01</text>
      <text x={190} y={152} className="pr-amb">CONSULTÓRIO 02</text>
      <text x={259} y={78} className="pr-amb">VACINA</text>
      <text x={259} y={144} className="pr-amb">WC</text>
      {/* cotas entre eixos, em cima (embaixo fica o carimbo) */}
      {cotas.map((c) => (
        <g key={c.de}>
          <line x1={c.de} y1={42} x2={c.a} y2={42} className="pr-cota" />
          <line x1={c.de - 1.5} y1={43.5} x2={c.de + 1.5} y2={40.5} className="pr-cota" />
          <line x1={c.a - 1.5} y1={43.5} x2={c.a + 1.5} y2={40.5} className="pr-cota" />
          <text x={(c.de + c.a) / 2} y={40} className="pr-cota-txt">
            {c.txt}
          </text>
        </g>
      ))}
      {/* notas gerais: o bloco de texto que toda prancha leva acima do carimbo */}
      <g className="pr-notas">
        <text x={320} y={34} className="pr-notas-tit">NOTAS</text>
        {["1. COTAS EM METROS, SALVO INDICAÇÃO.", "2. CONFERIR MEDIDAS NO LOCAL.", "3. VER MEMORIAL DESCRITIVO."].map((t, i) => (
          <text key={t} x={320} y={41 + i * 5}>
            {t}
          </text>
        ))}
      </g>
      <text x={180} y={206} className="pr-legenda">PLANTA BAIXA · ESC. 1:100</text>
      <text x={180} y={211.5} className="pr-legenda pr-legenda--sub">amostra</text>
    </g>
  );
}

export function Prancha({ situacao, responsavel }: { situacao: Situacao; responsavel: string | null }) {
  const folha = useRef<HTMLDivElement>(null);
  const [mira, setMira] = useState<{ x: number; y: number } | null>(null);
  const [aceso, setAceso] = useState<string | null>(null);

  const mover = (e: PointerEvent<HTMLDivElement>) => {
    const r = folha.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * L;
    const y = ((e.clientY - r.top) / r.height) * A;
    setMira(x > M.x0 && x < M.x1 && y > M.y0 && y < M.y1 ? { x, y } : null);
  };

  const passo = (M.x1 - M.x0) / COLUNAS;
  const altura = (M.y1 - M.y0) / LINHAS.length;
  const col = mira ? Math.floor((mira.x - M.x0) / passo) : -1;
  const lin = mira ? Math.floor((mira.y - M.y0) / altura) : -1;
  const noCarimbo = mira && mira.x >= C.x && mira.y >= C.y;
  const campo = aceso ? (aceso === "situacao" ? { rotulo: "Situação", le: "o estado desta entrada." } : camposDoCarimbo(responsavel).find((c) => c.id === aceso)) : null;

  return (
    <figure className="pr">
      <div ref={folha} className="pr-folha" onPointerMove={mover} onPointerLeave={() => setMira(null)}>
        <svg viewBox={`0 0 ${L} ${A}`} className="pr-svg" aria-hidden>
          <rect x={M.x0} y={M.y0} width={M.x1 - M.x0} height={M.y1 - M.y0} className="pr-moldura" />
          <rect x={M.x0 + 5} y={M.y0 + 5} width={M.x1 - M.x0 - 10} height={M.y1 - M.y0 - 10} className="pr-moldura pr-moldura--fina" />
          {/* quadrícula de referência: números em cima e embaixo, letras dos lados */}
          {Array.from({ length: COLUNAS }, (_, i) => {
            const x = M.x0 + passo * (i + 0.5);
            const on = i === col && !noCarimbo;
            return (
              <g key={i} className={on ? "pr-ref pr-ref--on" : "pr-ref"}>
                {i > 0 && <line x1={M.x0 + passo * i} y1={M.y0} x2={M.x0 + passo * i} y2={M.y0 + 5} />}
                {i > 0 && <line x1={M.x0 + passo * i} y1={M.y1 - 5} x2={M.x0 + passo * i} y2={M.y1} />}
                <text x={x} y={M.y0 + 3.6}>{i + 1}</text>
                <text x={x} y={M.y1 - 1.4}>{i + 1}</text>
              </g>
            );
          })}
          {LINHAS.map((l, i) => {
            const y = M.y0 + altura * (i + 0.5);
            const on = i === lin && !noCarimbo;
            return (
              <g key={l} className={on ? "pr-ref pr-ref--on" : "pr-ref"}>
                {i > 0 && <line x1={M.x0} y1={M.y0 + altura * i} x2={M.x0 + 5} y2={M.y0 + altura * i} />}
                {i > 0 && <line x1={M.x1 - 5} y1={M.y0 + altura * i} x2={M.x1} y2={M.y0 + altura * i} />}
                <text x={M.x0 + 2.5} y={y + 1.2}>{l}</text>
                <text x={M.x1 - 2.5} y={y + 1.2}>{l}</text>
              </g>
            );
          })}
          <Planta />
          {/* o retículo: segue a mão, não anda sozinho */}
          {mira && !noCarimbo && (
            <g className="pr-mira">
              <line x1={M.x0 + 5} y1={mira.y} x2={M.x1 - 5} y2={mira.y} />
              <line x1={mira.x} y1={M.y0 + 5} x2={mira.x} y2={M.y1 - 5} />
              <rect x={mira.x - 2} y={mira.y - 2} width={4} height={4} />
              <text x={mira.x + 4} y={mira.y - 3.5} className="pr-mira-txt">
                {`${LINHAS[lin]}${col + 1} · ${Math.round(mira.x)} × ${Math.round(mira.y)} mm`}
              </text>
            </g>
          )}
        </svg>
        <div className="pr-carimbo-lugar" style={{ left: `${(C.x / L) * 100}%`, top: `${(C.y / A) * 100}%`, width: `${(C.w / L) * 100}%`, height: `${(C.h / A) * 100}%` }}>
          <Carimbo situacao={situacao} responsavel={responsavel} aceso={aceso} onAcender={setAceso} />
        </div>
      </div>
      <figcaption className="pr-legenda-mesa">
        {campo ? (
          <>
            <b>{campo.rotulo}</b> diz ao Nexo {campo.le}
          </>
        ) : (
          "O Nexo lê o carimbo de cada folha e monta o volume a partir dele. Passe o cursor pelo carimbo."
        )}
      </figcaption>
    </figure>
  );
}
