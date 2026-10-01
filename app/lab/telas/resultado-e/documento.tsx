"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, CloudDownload, FileSearch, ScanText } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Botao, Segmento, Tecla } from "@/components/ds/basicos";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";

import { useIr } from "../_comum/prototipo";

import { DESFECHO_NOME, DISCIPLINA, IMPACTOS, PAGINAS_DO_MEMORIAL, type Achado, type Impacto } from "./dados";
import { larguraDaLinha, linhaDoTrecho } from "./visor";

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];
/** As páginas só com desenho: a análise é do texto, então elas não foram lidas. */
const SO_DESENHO = [38, 39, 40, 41, 42];
const LINHAS = 20;
const EU = "Victor";

export type ModoDoDocumento = "normal" | "mudas" | "remoto";

const curto = (a: Achado) => a.id.replace("ACH-", "");

/**
 * A ETIQUETA: retângulo reto na cor do nível, o código em branco no meio. Ela
 * carrega o estado — cheia é pendente, vazada (só o contorno, código riscado) é
 * tratada —, então dá para ver de longe o que falta numa página sem ler nada.
 */
function Etiqueta({ a, aceso, curta }: { a: Achado; aceso: boolean; curta?: boolean }) {
  return (
    <span className={`nd-etq${curta ? " nd-etq--margem" : ""} nd--${a.impacto}${a.desfecho ? " nd-etq--tratada" : ""}${aceso ? " nd-etq--acesa" : ""}`} aria-hidden={curta}>
      {curta ? curto(a) : a.id}
    </span>
  );
}

/** A miniatura da página: linhas de texto falso, o grifo no trecho e a etiqueta na margem. */
function Miniatura({
  pagina,
  achados,
  aceso,
  remoto,
  onAcender,
  margem,
}: {
  pagina: number;
  achados: Achado[];
  aceso: string | null;
  remoto: boolean;
  onAcender: (id: string | null) => void;
  /** Sem margem, a miniatura só grifa (é a grade das 42). */
  margem?: boolean;
}) {
  if (remoto) return <div className="nd-folha nd-folha--remota" aria-label={`Página ${pagina}, arquivo fora desta máquina`} />;
  return (
    <div className={`nd-folha${margem ? " nd-folha--margem" : ""}`} aria-label={`Página ${pagina}`}>
      {Array.from({ length: LINHAS }, (_, l) => {
        const a = achados.find((x, i) => Math.round((linhaDoTrecho(x, i) / 40) * LINHAS) === l);
        if (a)
          return (
            <span key={l} className="nd-marca-linha">
              <i
                className={`nd-marca nd--${a.impacto}${aceso === a.id ? " nd-marca--acesa" : ""}${a.desfecho ? " nd-marca--tratada" : ""}`}
                style={{ width: `${larguraDaLinha(pagina, l)}%` }}
                onMouseEnter={() => onAcender(a.id)}
                onMouseLeave={() => onAcender(null)}
              />
              {margem && <Etiqueta a={a} aceso={aceso === a.id} curta />}
            </span>
          );
        return <i key={l} className="nd-linha" style={{ width: `${larguraDaLinha(pagina, l)}%` }} />;
      })}
    </div>
  );
}

/**
 * NO DOCUMENTO: o memorial página a página, com os achados no lugar. Cada
 * página com achado é uma coluna — a miniatura com as etiquetas na margem, as
 * notas embaixo —, e o mouse ou o teclado acendem o par. Dá para percorrer o
 * documento inteiro sem sair dele: J e K andam na ordem de leitura, Enter abre
 * no memorial, C corrige ali mesmo, F leva à fila. A legenda é o filtro.
 */
export function NoDocumento({
  achados,
  modo,
  onVerNoMemorial,
  onAbrir,
  onMudar,
}: {
  achados: Achado[];
  modo: ModoDoDocumento;
  onVerNoMemorial: (id: string) => void;
  onAbrir: (id: string) => void;
  onMudar: (id: string, desfecho: Achado["desfecho"] | undefined) => void;
}) {
  const { dur, k } = useTempo();
  const ir = useIr();
  const [vista, setVista] = useState<"com" | "todas">(modo === "mudas" ? "todas" : "com");
  const [aceso, setAceso] = useState<string | null>(null);
  const [ativo, setAtivo] = useState<string | null>(null);
  const [ocultos, setOcultos] = useState<Impacto[]>([]);
  const raiz = useRef<HTMLDivElement>(null);
  const remoto = modo === "remoto";
  const ordem = (a: Achado) => IMPACTOS.findIndex((i) => i.id === a.impacto);
  const visiveis = achados.filter((a) => !ocultos.includes(a.impacto));
  const paginas = [...new Set(visiveis.map((a) => a.pagina))].sort((a, b) => a - b);
  const daPagina = (p: number) => visiveis.filter((a) => a.pagina === p).sort((a, b) => ordem(a) - ordem(b));
  // a ordem de leitura: página por página, e dentro da página por impacto
  const leitura = paginas.flatMap(daPagina);
  const lit = aceso ?? ativo;
  const pior = (p: number) => IMPACTOS.find((i) => achados.some((a) => a.pagina === p && a.impacto === i.id))?.id;

  const mover = (passo: number) => {
    if (!leitura.length) return;
    const i = leitura.findIndex((a) => a.id === ativo);
    const prox = leitura[i < 0 ? (passo > 0 ? 0 : leitura.length - 1) : (i + passo + leitura.length) % leitura.length];
    setAtivo(prox.id);
    raiz.current?.querySelector(`[data-achado="${prox.id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  useEffect(() => {
    if (vista !== "com") return;
    const tecla = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea") || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.key.toLowerCase();
      const atual = achados.find((a) => a.id === ativo);
      if (t === "j") mover(1);
      else if (t === "k") mover(-1);
      else if (atual && e.key === "Enter") {
        e.preventDefault();
        onVerNoMemorial(atual.id);
      } else if (atual && t === "c") onMudar(atual.id, atual.desfecho ? undefined : { tipo: "corrigido", por: EU, quando: "agora" });
      else if (atual && t === "f") onAbrir(atual.id);
    };
    document.addEventListener("keydown", tecla, true);
    return () => document.removeEventListener("keydown", tecla, true);
  });

  return (
    <div className="nd" ref={raiz}>
      <div className="nd-barra">
        <Segmento
          rotulo="Páginas"
          valor={vista}
          onTroca={setVista}
          opcoes={[
            { valor: "com", rotulo: <>Com achados <em>{new Set(achados.map((a) => a.pagina)).size}</em></> },
            { valor: "todas", rotulo: <>Todas <em>{PAGINAS_DO_MEMORIAL}</em></> },
          ]}
        />
        {/* a legenda é o filtro: clicar esconde ou mostra o nível */}
        <span className="nd-filtro" role="group" aria-label="Níveis à mostra">
          {IMPACTOS.map((i) => {
            const n = achados.filter((a) => a.impacto === i.id).length;
            if (!n) return null;
            const ligado = !ocultos.includes(i.id);
            return (
              <button
                key={i.id}
                type="button"
                aria-pressed={ligado}
                className={`nd-filtro-item nd--${i.id}`}
                onClick={() => setOcultos((o) => (ligado ? [...o, i.id] : o.filter((x) => x !== i.id)))}
              >
                <i />
                {i.nome}
                <em>{n}</em>
              </button>
            );
          })}
        </span>
        {vista === "com" && (
          <span className="nd-atalhos">
            <Tecla>J</Tecla>
            <Tecla>K</Tecla> percorrem, <Tecla>C</Tecla> corrige, <Tecla>↵</Tecla> abre
          </span>
        )}
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
          <Botao variante="ghost" tamanho="sm" onClick={() => ir("auditoria", "enviando")}>
            Transcrever e auditar
          </Botao>
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {vista === "com" ? (
          <motion.div key="com" className="nd-colunas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur("feedback") }}>
            {paginas.length === 0 && <p className="nd-vazio">Nenhum achado nos níveis escolhidos. Ligue um nível na legenda.</p>}
            {paginas.map((p, i) => {
              const dela = daPagina(p);
              const pendentes = dela.filter((a) => !a.desfecho).length;
              return (
                <motion.section
                  key={p}
                  layout="position"
                  className="nd-coluna"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: dur("enter"), delay: i * 0.04 * k, ease: ease(CURVA.out) }}
                >
                  <header className="nd-pagina">
                    <span className="ds-num">p. {p}</span>
                    {pendentes ? (
                      <span className="nd-pagina-falta">{pendentes === 1 ? "1 pendente" : `${pendentes} pendentes`}</span>
                    ) : (
                      <span className="nd-pagina-ok">
                        tratada <Check size={12} />
                      </span>
                    )}
                  </header>
                  <button type="button" className="nd-folha-botao" onClick={() => onVerNoMemorial(dela[0].id)} title="Ver no memorial">
                    <Miniatura pagina={p} achados={dela} aceso={lit} remoto={remoto} onAcender={setAceso} margem />
                  </button>
                  <ol className="nd-notas">
                    {dela.map((a) => (
                      <li
                        key={a.id}
                        data-achado={a.id}
                        className={`nd-nota${lit === a.id ? " nd-nota--acesa" : ""}${ativo === a.id ? " nd-nota--ativa" : ""}${a.desfecho ? " nd-nota--tratada" : ""}`}
                        onMouseEnter={() => setAceso(a.id)}
                        onMouseLeave={() => setAceso(null)}
                      >
                        <Etiqueta a={a} aceso={lit === a.id} />
                        <button type="button" className="nd-nota-memorial" aria-label={`Ver ${a.id} no memorial`} title="Ver no memorial (Enter)" onClick={() => onVerNoMemorial(a.id)}>
                          <FileSearch size={13} />
                        </button>
                        <button
                          type="button"
                          className="nd-nota-texto"
                          onClick={() => {
                            setAtivo(a.id);
                            onAbrir(a.id);
                          }}
                        >
                          <b>{a.titulo}</b>
                          <small>
                            {DISCIPLINA[a.disc].sigla}
                            {a.desfecho ? `, ${DESFECHO_NOME[a.desfecho.tipo].toLowerCase()}` : ""}
                          </small>
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
              const dela = visiveis.filter((a) => a.pagina === p);
              const desenho = modo === "mudas" && SO_DESENHO.includes(p);
              return (
                <motion.button
                  key={p}
                  type="button"
                  className={`nd-mini${dela.length ? " nd-mini--com" : ""}${desenho ? " nd-mini--desenho" : ""}`}
                  disabled={!dela.length}
                  onClick={() => onVerNoMemorial(dela[0].id)}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: dur("enter"), delay: (Math.floor(i / 12) + (i % 12)) * 0.015 * k, ease: ease(CURVA.out) }}
                  title={desenho ? `Página ${p}: só desenho, não lida` : dela.length ? `Página ${p}: ${dela.length} ${dela.length === 1 ? "achado" : "achados"}` : `Página ${p}: nenhum achado`}
                >
                  {desenho ? <div className="nd-folha nd-folha--desenho" /> : <Miniatura pagina={p} achados={dela} aceso={null} remoto={remoto} onAcender={() => {}} />}
                  <span className="nd-mini-rodape">
                    <span className="ds-num">{p}</span>
                    {dela.length > 0 && <em className={`nd--${pior(p)}`}>{dela.length}</em>}
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
