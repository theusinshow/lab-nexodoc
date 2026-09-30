"use client";

import { createContext, useContext } from "react";

import { DISCIPLINA } from "../resultado-e/dados";
import type { Folha } from "./dados";
import { conferencia, dd } from "./lado";

/*
 * AS FORMAS DO CARTÃO DA FOLHA, para comparar. Todas cabem na mesma caixa
 * (140 × 108) e contam as mesmas coisas; muda só o jeito de ser prancha.
 * Nenhuma usa o fio de cor no topo: a disciplina é a sigla, com o quadradinho
 * da disciplina (a convenção do sistema) onde couber.
 */

export type EstiloDoCartao = "prancha" | "carimbo" | "arquivo" | "solto" | "numero";
export type Distancia = "longe" | "media" | "perto";

export const ESTILOS: { id: EstiloDoCartao; nome: string; ideia: string }[] = [
  { id: "prancha", nome: "A. Prancha (escolhida)", ideia: "O cartão é a folha em miniatura: margem, área de desenho vazia e o carimbo no pé, onde moram título, código e número." },
  { id: "carimbo", nome: "B. Carimbo", ideia: "Só o carimbo, como tabela de engenharia: células com fio, rótulo pequeno e valor. Lê-se igual ao selo da prancha." },
  { id: "arquivo", nome: "C. Arquivo", ideia: "Um arquivo com o canto dobrado: o código grande em mono, o título embaixo. Diz 'documento', não 'cartão'." },
  { id: "solto", nome: "D. Sem caixa", ideia: "Nenhum contorno: número, título e código soltos no canvas. A caixa só aparece ao passar o mouse e ao escolher." },
  { id: "numero", nome: "E. Número", ideia: "Tipográfico: o número da folha grande e fino manda; sigla no canto, título pequeno no pé. Sem fio, sem borda." },
];

export const CartaoAtual = createContext<EstiloDoCartao>("prancha");
export const useEstiloDoCartao = () => useContext(CartaoAtual);

function Marca({ f }: { f: Folha }) {
  const c = conferencia(f);
  return c ? <i className={`ct-marca mp-tom--${c.tom}`} title={c.texto} /> : null;
}

function Sigla({ f }: { f: Folha }) {
  return (
    <span className={`ct-sigla dc--${f.disc}`}>
      <i />
      {DISCIPLINA[f.disc].sigla}
    </span>
  );
}

const numero = (f: Folha) => (f.numero == null ? "—" : dd(f.numero));

/** O cartão, na forma escolhida. Sem React Flow: serve ao canvas e à comparação. */
export function CartaoDaFolha({ f, estilo, distancia, escolhida, apagada }: { f: Folha; estilo: EstiloDoCartao; distancia: Distancia; escolhida?: boolean; apagada?: boolean }) {
  const cls = `ct ct--${estilo} ct--${distancia}${escolhida ? " ct--sel" : ""}${apagada ? " ct--apagado" : ""}${f.numero == null ? " ct--sem-numero" : ""}`;
  const semNum = f.numero == null ? " ct-falta" : "";

  if (estilo === "prancha")
    return (
      <div className={cls} title={f.titulo}>
        <div className="ct-desenho">
          <Marca f={f} />
          {distancia === "longe" && <span className={`ct-grande${semNum}`}>{numero(f)}</span>}
        </div>
        {distancia !== "longe" && (
          <div className="ct-selo">
            <p className="ct-selo-titulo">{f.titulo}</p>
            <div className="ct-selo-celulas">
              <span className="ct-mono">{f.id}</span>
              <span className={`ct-mono${semNum}`}>
                {numero(f)}/{dd(f.total)}
              </span>
              {distancia === "perto" && <span className="ct-mono">rev {f.revisao}</span>}
            </div>
          </div>
        )}
      </div>
    );

  if (estilo === "carimbo")
    return (
      <div className={cls} title={f.titulo}>
        {distancia === "longe" ? (
          <div className="ct-carimbo-longe">
            <span className={`ct-grande${semNum}`}>{numero(f)}</span>
            <Marca f={f} />
          </div>
        ) : (
          <div className={`ct-tabela${distancia === "perto" ? " ct-tabela--perto" : ""}`}>
            <div className="ct-cel">
              <small>folha</small>
              <b className={`ct-mono${semNum}`}>
                {numero(f)}/{dd(f.total)}
              </b>
            </div>
            <div className="ct-cel">
              <small>disc.</small>
              <b>
                <Sigla f={f} />
              </b>
              {distancia !== "perto" && <Marca f={f} />}
            </div>
            {distancia === "perto" && (
              <div className="ct-cel">
                <small>rev.</small>
                <b className="ct-mono">{f.revisao}</b>
                <Marca f={f} />
              </div>
            )}
            <div className="ct-cel ct-cel--titulo">
              <small>título</small>
              <b>{f.titulo}</b>
            </div>
            {distancia === "perto" && (
              <div className="ct-cel ct-cel--titulo ct-cel--codigo">
                <b className="ct-mono">{f.id}</b>
              </div>
            )}
          </div>
        )}
      </div>
    );

  if (estilo === "arquivo")
    return (
      <div className={cls} title={f.titulo}>
        <i className="ct-dobra" aria-hidden />
        {distancia === "longe" ? (
          <span className={`ct-grande${semNum}`}>{numero(f)}</span>
        ) : (
          <>
            <p className="ct-codigo">{f.id}</p>
            <p className="ct-titulo">{f.titulo}</p>
            <p className="ct-pe">
              <span className={`ct-mono${semNum}`}>
                {numero(f)}/{dd(f.total)}
              </span>
              {distancia === "perto" && <span className="ct-mono">rev {f.revisao}</span>}
            </p>
          </>
        )}
        <Marca f={f} />
      </div>
    );

  if (estilo === "solto")
    return (
      <div className={cls} title={f.titulo}>
        <p className="ct-linha">
          <span className={`ct-num${semNum}`}>{numero(f)}</span>
          {distancia !== "longe" && <Sigla f={f} />}
          <Marca f={f} />
        </p>
        {distancia !== "longe" && <p className="ct-titulo">{f.titulo}</p>}
        {distancia === "perto" && (
          <p className="ct-pe ct-mono">
            {f.id}, rev {f.revisao}
          </p>
        )}
      </div>
    );

  // número
  return (
    <div className={cls} title={f.titulo}>
      <p className="ct-linha">
        <span className={`ct-num${semNum}`}>
          {numero(f)}
          {distancia !== "longe" && <small>/{dd(f.total)}</small>}
        </span>
        {distancia !== "longe" && <Sigla f={f} />}
      </p>
      <Marca f={f} />
      {distancia !== "longe" && <p className="ct-titulo">{f.titulo}</p>}
      {distancia === "perto" && <p className="ct-pe ct-mono">{f.id}</p>}
    </div>
  );
}
