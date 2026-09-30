"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CloudDownload, FileSearch, ScanText } from "lucide-react";
import { useState } from "react";

import { Botao, Segmento } from "@/components/ds/basicos";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";

import { IMPACTOS, PAGINAS_DO_MEMORIAL, type Achado } from "./dados";
import { SeloDaDisciplina } from "./disciplina";
import { larguraDaLinha, linhaDoTrecho } from "./visor";

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];
/** As páginas só com desenho: a análise é do texto, então elas não foram lidas. */
const SO_DESENHO = [38, 39, 40, 41, 42];
const LINHAS = 20;

export type ModoDoDocumento = "normal" | "mudas" | "remoto";

/** A miniatura da página: linhas de texto falso e, no lugar de cada achado, a marca na cor do nível. */
function Miniatura({ pagina, achados, aceso, remoto, onAcender }: { pagina: number; achados: Achado[]; aceso: string | null; remoto: boolean; onAcender: (id: string | null) => void }) {
  if (remoto) return <div className="nd-folha nd-folha--remota" aria-label={`Página ${pagina}, arquivo fora desta máquina`} />;
  return (
    <div className="nd-folha" aria-label={`Página ${pagina}`}>
      {Array.from({ length: LINHAS }, (_, l) => {
        const a = achados.find((x, i) => Math.round((linhaDoTrecho(x, i) / 40) * LINHAS) === l);
        if (a)
          return (
            <i
              key={l}
              className={`nd-marca nd--${a.impacto}${aceso === a.id ? " nd-marca--acesa" : ""}${aceso && aceso !== a.id ? " nd--apagada" : ""}`}
              style={{ width: `${larguraDaLinha(pagina, l)}%` }}
              onMouseEnter={() => onAcender(a.id)}
              onMouseLeave={() => onAcender(null)}
            />
          );
        return <i key={l} className="nd-linha" style={{ width: `${larguraDaLinha(pagina, l)}%` }} />;
      })}
    </div>
  );
}

/**
 * NO DOCUMENTO: o memorial página a página, com os achados no lugar. Cada
 * página com achado é uma coluna — a miniatura em cima, os achados embaixo —,
 * e passar o mouse acende o par (a marca na página e o cartão), sem apagar o
 * resto da tela. Como hoje (modules/nexo/components/AuditCanvas.tsx), só que
 * em grade, sem o canvas de arrastar.
 */
export function NoDocumento({
  achados,
  modo,
  onVerNoMemorial,
  onAbrir,
}: {
  achados: Achado[];
  modo: ModoDoDocumento;
  onVerNoMemorial: (id: string) => void;
  onAbrir: (id: string) => void;
}) {
  const { dur, k } = useTempo();
  const [vista, setVista] = useState<"com" | "todas">(modo === "mudas" ? "todas" : "com");
  const [aceso, setAceso] = useState<string | null>(null);
  const remoto = modo === "remoto";
  const paginas = [...new Set(achados.map((a) => a.pagina))].sort((a, b) => a - b);
  const pior = (p: number) => IMPACTOS.find((i) => achados.some((a) => a.pagina === p && a.impacto === i.id))?.id;
  const ordem = (a: Achado) => IMPACTOS.findIndex((i) => i.id === a.impacto);

  return (
    <div className="nd">
      <div className="nd-barra">
        <Segmento
          rotulo="Páginas"
          valor={vista}
          onTroca={setVista}
          opcoes={[
            { valor: "com", rotulo: <>Com achados <em>{paginas.length}</em></> },
            { valor: "todas", rotulo: <>Todas <em>{PAGINAS_DO_MEMORIAL}</em></> },
          ]}
        />
        <span className="nd-legenda">
          {IMPACTOS.map((i) => (
            <span key={i.id}>
              <i className={`nd-leg nd--${i.id}`} /> {i.nome}
            </span>
          ))}
        </span>
      </div>

      {remoto && (
        <div className="nd-aviso">
          <CloudDownload size={16} />
          <span>
            <b>O PDF não está nesta máquina.</b> A auditoria foi feita em outro computador; os achados estão aqui, as páginas não.
          </span>
          <Botao variante="primary" tamanho="sm">
            Baixar do servidor, 3,1 MB
          </Botao>
        </div>
      )}
      {vista === "todas" && modo === "mudas" && (
        <div className="nd-aviso nd-aviso--neutro">
          <ScanText size={16} />
          <span>
            <b>5 páginas só com desenho não foram lidas</b> (38 a 42). A análise é do texto; transcrever lê o que está escrito nos desenhos e audita de novo.
          </span>
          <Botao variante="ghost" tamanho="sm">
            Transcrever e auditar
          </Botao>
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {vista === "com" ? (
          <motion.div key="com" className="nd-colunas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur("feedback") }}>
            {paginas.map((p, i) => {
              const daPagina = achados.filter((a) => a.pagina === p).sort((a, b) => ordem(a) - ordem(b));
              return (
                <motion.section
                  key={p}
                  className="nd-coluna"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: dur("enter"), delay: i * 0.04 * k, ease: ease(CURVA.out) }}
                >
                  <header className="nd-pagina">
                    <span className="ds-num">p. {p}</span>
                    <i className={`nd-leg nd--${pior(p)}`} />
                  </header>
                  <button type="button" className="nd-folha-botao" onClick={() => onVerNoMemorial(daPagina[0].id)} title="Ver no memorial">
                    <Miniatura pagina={p} achados={daPagina} aceso={aceso} remoto={remoto} onAcender={setAceso} />
                  </button>
                  <div className="nd-cartoes">
                    {daPagina.map((a) => (
                      <div
                        key={a.id}
                        className={`nd-cartao nd--${a.impacto}${aceso === a.id ? " nd-cartao--aceso" : ""}${a.desfecho ? " nd-cartao--tratado" : ""}`}
                        onMouseEnter={() => setAceso(a.id)}
                        onMouseLeave={() => setAceso(null)}
                      >
                        <span className="nd-cartao-topo">
                          <i className={`rs-ponto rs-ponto--${a.impacto}`} />
                          <span className="nd-id">{a.id}</span>
                          <SeloDaDisciplina disc={a.disc} neutro />
                        </span>
                        <b>{a.titulo}</b>
                        <span className="nd-acoes">
                          <button type="button" onClick={() => onVerNoMemorial(a.id)}>
                            <FileSearch size={13} /> Memorial
                          </button>
                          <button type="button" onClick={() => onAbrir(a.id)}>
                            Fila <ArrowRight size={13} />
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.section>
              );
            })}
          </motion.div>
        ) : (
          <motion.div key="todas" className="nd-todas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur("feedback") }}>
            {Array.from({ length: PAGINAS_DO_MEMORIAL }, (_, i) => {
              const p = i + 1;
              const daPagina = achados.filter((a) => a.pagina === p);
              const desenho = modo === "mudas" && SO_DESENHO.includes(p);
              return (
                <motion.button
                  key={p}
                  type="button"
                  className={`nd-mini${daPagina.length ? " nd-mini--com" : ""}${desenho ? " nd-mini--desenho" : ""}`}
                  disabled={!daPagina.length}
                  onClick={() => onVerNoMemorial(daPagina[0].id)}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: dur("enter"), delay: (Math.floor(i / 12) + (i % 12)) * 0.015 * k, ease: ease(CURVA.out) }}
                  title={desenho ? `Página ${p}: só desenho, não lida` : daPagina.length ? `Página ${p}: ${daPagina.length} ${daPagina.length === 1 ? "achado" : "achados"}` : `Página ${p}: nenhum achado`}
                >
                  {desenho ? <div className="nd-folha nd-folha--desenho" /> : <Miniatura pagina={p} achados={daPagina} aceso={null} remoto={remoto} onAcender={() => {}} />}
                  <span className="nd-mini-rodape">
                    <span className="ds-num">{p}</span>
                    {daPagina.length > 0 && <em className={`nd--${pior(p)}`}>{daPagina.length}</em>}
                    {desenho && <small>desenho</small>}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
