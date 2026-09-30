"use client";

import { AnimatePresence, motion } from "motion/react";
import { CloudDownload, FileSearch, ScanText } from "lucide-react";
import { useState } from "react";

import { Botao, Segmento } from "@/components/ds/basicos";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";

import { DESFECHO_NOME, DISCIPLINA, IMPACTOS, PAGINAS_DO_MEMORIAL, type Achado } from "./dados";
import { larguraDaLinha, linhaDoTrecho } from "./visor";

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];
/** As páginas só com desenho: a análise é do texto, então elas não foram lidas. */
const SO_DESENHO = [38, 39, 40, 41, 42];
const LINHAS = 20;

export type ModoDoDocumento = "normal" | "mudas" | "remoto";

/**
 * Três maneiras de ligar o achado à página, para comparar:
 * - etiqueta: retângulo reto na cor do nível, o código em branco no meio;
 * - numero: só o número, em mono, na cor do nível — nenhuma forma;
 * - regua: a barra de revisão na margem, como a prancha marca o que mudou.
 */
export type EstiloDaMarca = "etiqueta" | "numero" | "regua";

const curto = (a: Achado) => a.id.replace("ACH-", "");

/** O marcador na margem da página, na altura do trecho. */
function MarcaNaMargem({ estilo, a, aceso }: { estilo: EstiloDaMarca; a: Achado; aceso: boolean }) {
  if (estilo === "regua") return <span className={`nd-m-regua nd--${a.impacto}${aceso ? " nd-m--aceso" : ""}`} aria-hidden />;
  return (
    <span className={`nd-m-${estilo} nd--${a.impacto}${aceso ? " nd-m--aceso" : ""}`} aria-hidden>
      {curto(a)}
    </span>
  );
}

/** O marcador da nota, embaixo da página: o mesmo gesto da margem, em tamanho de leitura. */
function MarcaNaNota({ estilo, a, aceso }: { estilo: EstiloDaMarca; a: Achado; aceso: boolean }) {
  if (estilo === "etiqueta") return <span className={`nd-n-etiqueta nd--${a.impacto}${aceso ? " nd-m--aceso" : ""}`}>{a.id}</span>;
  if (estilo === "numero") return <span className={`nd-n-numero nd--${a.impacto}`}>{curto(a)}</span>;
  return <span className={`nd-n-regua nd--${a.impacto}`} aria-hidden />;
}

/** A miniatura da página: linhas de texto falso e, no lugar de cada achado, a marca na cor do nível. */
function Miniatura({
  pagina,
  achados,
  aceso,
  remoto,
  onAcender,
  estilo,
}: {
  pagina: number;
  achados: Achado[];
  aceso: string | null;
  remoto: boolean;
  onAcender: (id: string | null) => void;
  /** Sem estilo, a miniatura não marca a margem (é a grade das 42). */
  estilo?: EstiloDaMarca;
}) {
  if (remoto) return <div className="nd-folha nd-folha--remota" aria-label={`Página ${pagina}, arquivo fora desta máquina`} />;
  return (
    <div className={`nd-folha${estilo ? ` nd-folha--${estilo}` : ""}`} aria-label={`Página ${pagina}`}>
      {Array.from({ length: LINHAS }, (_, l) => {
        const a = achados.find((x, i) => Math.round((linhaDoTrecho(x, i) / 40) * LINHAS) === l);
        if (a)
          return (
            <span key={l} className="nd-marca-linha">
              <i
                className={`nd-marca${estilo === "numero" ? " nd-marca--sublinhado" : ""} nd--${a.impacto}${aceso === a.id ? " nd-marca--acesa" : ""}${aceso && aceso !== a.id ? " nd--apagada" : ""}`}
                style={{ width: `${larguraDaLinha(pagina, l)}%` }}
                onMouseEnter={() => onAcender(a.id)}
                onMouseLeave={() => onAcender(null)}
              />
              {estilo && <MarcaNaMargem estilo={estilo} a={a} aceso={aceso === a.id} />}
            </span>
          );
        return <i key={l} className="nd-linha" style={{ width: `${larguraDaLinha(pagina, l)}%` }} />;
      })}
    </div>
  );
}

/**
 * NO DOCUMENTO: o memorial página a página, com os achados no lugar. Cada
 * página com achado é uma coluna — a miniatura em cima, as notas embaixo —, e
 * passar o mouse acende o par (o delta na página e o da nota), sem apagar o
 * resto da tela. Como hoje (modules/nexo/components/AuditCanvas.tsx), só que
 * em grade, sem o canvas de arrastar.
 */
export function NoDocumento({
  achados,
  modo,
  estilo = "etiqueta",
  onVerNoMemorial,
  onAbrir,
}: {
  achados: Achado[];
  modo: ModoDoDocumento;
  estilo?: EstiloDaMarca;
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
                    <Miniatura pagina={p} achados={daPagina} aceso={aceso} remoto={remoto} onAcender={setAceso} estilo={estilo} />
                  </button>
                  <ol className="nd-notas">
                    {daPagina.map((a) => (
                      <li
                        key={a.id}
                        className={`nd-nota nd-nota--${estilo}${aceso === a.id ? " nd-nota--acesa" : ""}${a.desfecho ? " nd-nota--tratada" : ""}`}
                        onMouseEnter={() => setAceso(a.id)}
                        onMouseLeave={() => setAceso(null)}
                      >
                        <MarcaNaNota estilo={estilo} a={a} aceso={aceso === a.id} />
                        <button type="button" className="nd-nota-texto" onClick={() => onAbrir(a.id)}>
                          <b>{a.titulo}</b>
                          <small>
                            {estilo === "etiqueta" ? "" : `${a.id} `}
                            {DISCIPLINA[a.disc].sigla}
                            {a.desfecho ? `, ${DESFECHO_NOME[a.desfecho.tipo].toLowerCase()}` : ""}
                          </small>
                        </button>
                        <button type="button" className="nd-nota-memorial" aria-label={`Ver ${a.id} no memorial`} title="Ver no memorial" onClick={() => onVerNoMemorial(a.id)}>
                          <FileSearch size={13} />
                        </button>
                      </li>
                    ))}
                  </ol>
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
