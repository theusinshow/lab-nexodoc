"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";

import { DESFECHO_NOME, IMPACTOS, PAGINAS_DO_MEMORIAL, type Achado } from "./dados";

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];
const ZOOMS = [0.75, 1, 1.25, 1.5];

/** A linha da página onde o trecho do achado está — fixa por achado, para o desenho não pular. */
export function linhaDoTrecho(a: Achado, i: number) {
  return 4 + ((a.pagina * 7 + i * 9) % 30);
}

/** Largura de cada linha de texto falso, determinística: a página parece texto sem ser. */
export function larguraDaLinha(pagina: number, linha: number) {
  const r = Math.sin(pagina * 12.9898 + linha * 78.233) * 43758.5453;
  const f = r - Math.floor(r);
  // arredondado: servidor e navegador podem divergir na última casa do seno, e isso quebra a hidratação
  return Math.round((linha % 7 === 6 ? 35 + f * 30 : 82 + f * 18) * 10) / 10;
}

/**
 * VER NO MEMORIAL — o visor do documento original, dentro da tela. Abre na
 * página do achado com o trecho grifado na cor do nível, e a margem marca os
 * outros achados da mesma página (lib/pins-do-parecer.ts: achado sem página
 * provável não vira marcador). Embaixo, as páginas que têm achado, para pular
 * entre elas sem folhear as 42.
 */
export function VisorDoMemorial({
  achados,
  inicial,
  aberto,
  onFechar,
  onIrParaAchado,
}: {
  achados: Achado[];
  inicial: string | null;
  aberto: boolean;
  onFechar: () => void;
  onIrParaAchado: (id: string) => void;
}) {
  const { dur, mola } = useTempo();
  const paginasComAchado = useMemo(() => [...new Set(achados.map((a) => a.pagina))].sort((a, b) => a - b), [achados]);
  const primeiro = achados.find((a) => a.id === inicial) ?? achados.find((a) => !a.desfecho) ?? achados[0];
  const [pagina, setPagina] = useState(primeiro.pagina);
  const [ativo, setAtivo] = useState(primeiro.id);
  const [zoom, setZoom] = useState(1);
  const [direcao, setDirecao] = useState(1);

  // só quando abre (ou troca o achado de entrada com ele aberto)
  const [aberturaVista, setAberturaVista] = useState({ aberto, inicial });
  if (aberto !== aberturaVista.aberto || inicial !== aberturaVista.inicial) {
    setAberturaVista({ aberto, inicial });
    if (aberto) {
      setPagina(primeiro.pagina);
      setAtivo(primeiro.id);
    }
  }

  const daPagina = achados.filter((a) => a.pagina === pagina);
  const ir = (p: number) => {
    const alvo = Math.min(PAGINAS_DO_MEMORIAL, Math.max(1, p));
    setDirecao(alvo > pagina ? 1 : -1);
    setPagina(alvo);
    const a = achados.find((x) => x.pagina === alvo);
    if (a) setAtivo(a.id);
  };
  const vizinha = (passo: number) => {
    const i = paginasComAchado.indexOf(pagina);
    const lista = paginasComAchado;
    if (i < 0) return ir(passo > 0 ? lista.find((p) => p > pagina) ?? lista[0] : [...lista].reverse().find((p) => p < pagina) ?? lista[lista.length - 1]);
    ir(lista[(i + passo + lista.length) % lista.length]);
  };

  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onFechar();
      } else if (e.key === "ArrowRight") ir(pagina + 1);
      else if (e.key === "ArrowLeft") ir(pagina - 1);
      else if (e.key.toLowerCase() === "j") vizinha(1);
      else if (e.key.toLowerCase() === "k") vizinha(-1);
    };
    document.addEventListener("keydown", tecla, true);
    return () => document.removeEventListener("keydown", tecla, true);
  });

  const tomDe = (a: Achado) => a.impacto;

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div className="vm-fundo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur("state") }} onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
          <motion.section
            className="vm"
            role="dialog"
            aria-label="Memorial com os achados"
            initial={{ x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 32, opacity: 0, transition: { duration: dur("state"), ease: ease(CURVA.exit) } }}
            transition={mola("smooth")}
          >
            <header className="vm-topo">
              <div className="vm-titulo">
                <b>117_25_md_geral_a.pdf</b>
                <span>Memorial geral, revisão A</span>
              </div>
              <div className="vm-navegar">
                <Botao variante="quiet" tamanho="sm" icone aria-label="Página anterior (←)" onClick={() => ir(pagina - 1)} disabled={pagina === 1}>
                  <ChevronLeft />
                </Botao>
                <span className="ds-num">
                  Página <b>{pagina}</b> de {PAGINAS_DO_MEMORIAL}
                </span>
                <Botao variante="quiet" tamanho="sm" icone aria-label="Próxima página (→)" onClick={() => ir(pagina + 1)} disabled={pagina === PAGINAS_DO_MEMORIAL}>
                  <ChevronRight />
                </Botao>
              </div>
              <div className="vm-zoom">
                <Botao variante="quiet" tamanho="sm" icone aria-label="Diminuir zoom" onClick={() => setZoom((z) => ZOOMS[Math.max(0, ZOOMS.indexOf(z) - 1)])} disabled={zoom === ZOOMS[0]}>
                  <Minus />
                </Botao>
                <span className="ds-num">{Math.round(zoom * 100)}%</span>
                <Botao variante="quiet" tamanho="sm" icone aria-label="Aumentar zoom" onClick={() => setZoom((z) => ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(z) + 1)])} disabled={zoom === ZOOMS[ZOOMS.length - 1]}>
                  <Plus />
                </Botao>
              </div>
              <Botao variante="quiet" tamanho="sm" icone aria-label="Fechar (Esc)" title="Fechar (Esc)" onClick={onFechar}>
                <X />
              </Botao>
            </header>

            <div className="vm-corpo">
              {/* ---------- a página ---------- */}
              <div className="vm-mesa">
                <AnimatePresence mode="wait" initial={false} custom={direcao}>
                  <motion.div
                    key={pagina}
                    className="vm-folha"
                    style={{ width: 520 * zoom }}
                    initial={{ opacity: 0, x: 16 * direcao }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 * direcao, transition: { duration: dur("feedback") } }}
                    transition={{ duration: dur("enter"), ease: ease(CURVA.out) }}
                  >
                    <div className="vm-folha-cabeca" style={{ fontSize: 9 * zoom }}>
                      <span>UBS da Rua São Francisco de Assis, memorial descritivo</span>
                      <span>Rev. A, p. {pagina}</span>
                    </div>
                    {Array.from({ length: 40 }, (_, l) => {
                      const aqui = daPagina.find((a, i) => linhaDoTrecho(a, i) === l);
                      if (aqui) {
                        const i = aqui.evidencia.trecho.indexOf(aqui.evidencia.marca);
                        return (
                          <p key={l} className={`vm-trecho${aqui.id === ativo ? " vm-trecho--ativo" : ""} vm--${tomDe(aqui)}`} style={{ fontSize: 10.5 * zoom }} onClick={() => setAtivo(aqui.id)}>
                            {i < 0 ? (
                              aqui.evidencia.trecho
                            ) : (
                              <>
                                {aqui.evidencia.trecho.slice(0, i)}
                                <motion.mark initial={{ backgroundSize: "0% 100%" }} animate={{ backgroundSize: "100% 100%" }} transition={{ duration: dur("layout") * 1.4, delay: 0.15, ease: ease(CURVA.out) }}>
                                  {aqui.evidencia.marca}
                                </motion.mark>
                                {aqui.evidencia.trecho.slice(i + aqui.evidencia.marca.length)}
                              </>
                            )}
                            <span className={`vm-pino vm--${tomDe(aqui)}`} style={{ width: 18 * zoom, height: 18 * zoom, fontSize: 9 * zoom }}>
                              {aqui.id.slice(-2)}
                            </span>
                          </p>
                        );
                      }
                      return <i key={l} className="vm-linha" style={{ width: `${larguraDaLinha(pagina, l)}%`, height: 5 * zoom, marginBottom: 7 * zoom }} />;
                    })}
                    {!daPagina.length && <span className="vm-sem">Nenhum achado nesta página.</span>}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* ---------- os achados da página ---------- */}
              <aside className="vm-lado">
                <h3>{daPagina.length ? `Nesta página, ${daPagina.length === 1 ? "1 achado" : `${daPagina.length} achados`}` : "Nesta página"}</h3>
                {daPagina.map((a) => (
                  <button key={a.id} type="button" className={`vm-achado vm--${tomDe(a)}${a.id === ativo ? " vm-achado--ativo" : ""}`} onClick={() => setAtivo(a.id)}>
                    <span className="vm-achado-id">
                      <i /> {a.id} <small>{IMPACTOS.find((x) => x.id === a.impacto)?.nome}</small>
                    </span>
                    <b>{a.titulo}</b>
                    {a.desfecho && <span className="vm-achado-feito">{DESFECHO_NOME[a.desfecho.tipo]}</span>}
                    {a.id === ativo && (
                      <span
                        className="vm-achado-abrir"
                        role="link"
                        onClick={(e) => {
                          e.stopPropagation();
                          onIrParaAchado(a.id);
                        }}
                      >
                        Abrir na fila <ArrowRight size={13} />
                      </span>
                    )}
                  </button>
                ))}
                {!daPagina.length && <p className="rs-nota">Use J e K para ir às páginas que têm achado.</p>}

                <div className="vm-paginas">
                  <h3>Páginas com achados</h3>
                  <div>
                    {paginasComAchado.map((p) => {
                      const doP = achados.filter((a) => a.pagina === p);
                      const pior = IMPACTOS.find((i) => doP.some((a) => a.impacto === i.id))?.id;
                      return (
                        <button key={p} type="button" className={`vm-pag vm--${pior}${p === pagina ? " vm-pag--aqui" : ""}`} onClick={() => ir(p)}>
                          {p}
                          {doP.length > 1 && <small>{doP.length}</small>}
                        </button>
                      );
                    })}
                  </div>
                  <p className="rs-nota">
                    <Tecla>J</Tecla> <Tecla>K</Tecla> entre elas, <Tecla>←</Tecla> <Tecla>→</Tecla> folheia
                  </p>
                </div>
              </aside>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
