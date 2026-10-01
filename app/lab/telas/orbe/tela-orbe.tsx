"use client";

import { useEffect, useState, type ComponentType } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";

import { OrbeDocumento } from "./documento";
import { OrbeInstrumento } from "./instrumento";
import { OrbeLuz } from "./luz";
import { OrbeMateria } from "./materia";
import { ESTADOS, type EstadoDoOrbe } from "./motor";
import "./orbe.css";

/*
 * O ORBE NOVO, quatro direções lado a lado (recomeçar do zero: o Matheus achou o
 * de hoje fora do sistema novo, sem expressão e genérico de IA). Todas leem os
 * mesmos nove estados do agente do app e se desenham em todos os degraus de
 * tamanho, do herói ao favicon, para comparar também se sobrevivem pequenas.
 */

type Direcao = { id: string; nome: string; ideia: string; Orbe: ComponentType<{ estado: EstadoDoOrbe; tam: number; reduzir: boolean }> };

const DIRECOES: Direcao[] = [
  { id: "instrumento", nome: "Instrumento técnico", ideia: "Um núcleo que mede, dentro de anéis com escala. Lê como teodolito, bússola, régua.", Orbe: OrbeInstrumento },
  { id: "materia", nome: "Matéria viva", ideia: "Uma esfera de plasma íris que se agita com o trabalho, como um organismo.", Orbe: OrbeMateria },
  { id: "luz", nome: "Luz e foco", ideia: "Luz atrás de um diafragma de lâminas: abre para receber, fecha em foco para auditar.", Orbe: OrbeLuz },
  { id: "documento", nome: "Documento vivo", ideia: "Um globo de linhas de texto girando; a leitura desce por ele e os achados acendem.", Orbe: OrbeDocumento },
];

const DEGRAUS = [
  { tam: 128, nome: "porta do Nexo" },
  { tam: 64, nome: "avatar" },
  { tam: 34, nome: "HUD" },
  { tam: 18, nome: "marca" },
  { tam: 16, nome: "favicon" },
];

export function TelaOrbe() {
  const [estado, setEstado] = useState<EstadoDoOrbe>("idle");
  const [reduzir, setReduzir] = useState(false);
  const i = ESTADOS.findIndex((e) => e.id === estado);

  // ← → trocam o estado: o orbe nunca passa de estado sozinho
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight") setEstado(ESTADOS[(i + 1) % ESTADOS.length].id);
      if (e.key === "ArrowLeft") setEstado(ESTADOS[(i - 1 + ESTADOS.length) % ESTADOS.length].id);
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [i]);

  return (
    <div className="ob">
      <div className="ob-controles" role="toolbar" aria-label="Estado do agente">
        <div className="ob-estados" role="radiogroup" aria-label="Estado">
          {ESTADOS.map((e) => (
            <button key={e.id} type="button" role="radio" aria-checked={e.id === estado} className="ob-estado" onClick={() => setEstado(e.id)}>
              {e.nome}
            </button>
          ))}
        </div>
        <span className="ob-quando">{ESTADOS[i].quando}</span>
        <span className="ob-dica">
          <Tecla>←</Tecla>
          <Tecla>→</Tecla> troca o estado
        </span>
        <Botao variante="quiet" tamanho="sm" aria-pressed={reduzir} onClick={() => setReduzir((r) => !r)}>
          {reduzir ? "Movimento reduzido: ligado" : "Movimento reduzido: desligado"}
        </Botao>
      </div>

      <div className="ob-grade">
        {DIRECOES.map((d, n) => (
          <section key={d.id} className="ob-dir" aria-labelledby={`ob-${d.id}`}>
            <header>
              <span className="ob-n ds-num">{n + 1}</span>
              <div>
                <h2 id={`ob-${d.id}`}>{d.nome}</h2>
                <p>{d.ideia}</p>
              </div>
            </header>
            <div className="ob-palco">
              <d.Orbe estado={estado} tam={300} reduzir={reduzir} />
            </div>
            <div className="ob-escada">
              {DEGRAUS.map((g) => (
                <figure key={g.tam}>
                  <div className="ob-degrau" style={{ height: 128 }}>
                    <d.Orbe estado={estado} tam={g.tam} reduzir={reduzir} />
                  </div>
                  <figcaption>
                    <b className="ds-num">{g.tam}</b> {g.nome}
                  </figcaption>
                </figure>
              ))}
            </div>
            <div className="ob-uso">
              <div className="ob-topo">
                <d.Orbe estado={estado} tam={18} reduzir={reduzir} />
                <b>Nexo</b>
                <span>Painel</span>
                <span>Projetos</span>
                <span>Achados</span>
              </div>
              <div className="ob-fala">
                <d.Orbe estado={estado} tam={28} reduzir={reduzir} />
                <p>
                  <b>Nexo</b> {ESTADOS[i].nome.toLowerCase()} · memorial geral da 117-25, p. 9 de 42
                </p>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
