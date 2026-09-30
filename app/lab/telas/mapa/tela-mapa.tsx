"use client";

import { ReactFlowProvider, useReactFlow, useStore } from "@xyflow/react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Maximize, Minus, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import { RITMO, SUAVE } from "../conversa/turnos";
import { DISCIPLINA } from "../resultado-e/dados";
import { CartaoAtual, ESTILOS, type EstiloDoCartao } from "./cartoes";
import { ALTURA_DO_NO, LARGURA_DA_FOLHA, montarCanvas, Tela } from "./canvas";
import { FOLHAS, RESTOS, TOMOS, type Folha } from "./dados";
import { AntesDeGerar, dd, DaFolha, Gerados, precisaConferir, Sobras } from "./lado";
import "./mapa.css";

export type SituacaoMapa = "lendo-selos" | "lido" | "folha-aberta" | "corrigindo" | "vou-gerar" | "desatualizado" | "fora-da-divisao";

type Recorte = "todas" | "conferir" | "mao";
const RECORTES: [Recorte, string][] = [
  ["todas", "Todas"],
  ["conferir", "Para conferir"],
  ["mao", "Corrigidas à mão"],
];
const passa = (r: Recorte, f: Folha) => r === "todas" || (r === "conferir" ? precisaConferir(f) : !!f.editado);
const ZOOM_DE_TRABALHO = 0.95;

/** O zoom, em número, e os botões dele. Fica no canto do canvas, como no app. */
function ControlesDoZoom({ onEnquadrar }: { onEnquadrar: () => void }) {
  const { zoomIn, zoomOut } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);
  return (
    <div className="mp-zoom" role="group" aria-label="Zoom">
      <button type="button" onClick={() => zoomOut({ duration: 250 })} aria-label="Diminuir o zoom (−)">
        <Minus size={14} />
      </button>
      <span className="ds-num">{Math.round(zoom * 100)}%</span>
      <button type="button" onClick={() => zoomIn({ duration: 250 })} aria-label="Aumentar o zoom (+)">
        <Plus size={14} />
      </button>
      <i aria-hidden />
      <button type="button" onClick={onEnquadrar} aria-label="Enquadrar tudo (F)">
        <Maximize size={13} />
      </button>
    </div>
  );
}

/**
 * O MAPA DO VOLUME. O canvas de hoje, com a pele nova: um painel só; em cima,
 * um tile por tomo (clicar leva a câmera até a fileira) e a divisão; no meio,
 * o canvas com as fileiras e, à direita, o checklist "Antes de gerar" ou a
 * folha escolhida. Escolher uma folha centraliza a câmera nela.
 */
function Mapa({ situacao }: { situacao: SituacaoMapa }) {
  const { k } = useTempo();
  const { setCenter, setViewport, fitView, zoomIn, zoomOut, getZoom } = useReactFlow();
  const inicial = situacao === "folha-aberta" ? "ARQ-03" : situacao === "corrigindo" ? "ELE-04" : null;
  const [sel, setSel] = useState<string | null>(inicial);
  const [corrigindo, setCorrigindo] = useState(situacao === "corrigindo");
  const [tomo, setTomo] = useState(situacao === "fora-da-divisao" ? 0 : inicial === "ELE-04" ? 2 : 1);
  const [recorte, setRecorte] = useState<Recorte>("todas");
  const [busca, setBusca] = useState("");
  const [lidas, setLidas] = useState(situacao === "lendo-selos" ? 5 : FOLHAS.length);
  const campoDeBusca = useRef<HTMLInputElement>(null);
  const gerado = situacao === "desatualizado" || situacao === "fora-da-divisao";
  const lendo = lidas < FOLHAS.length;
  const pronto = situacao === "vou-gerar";

  useEffect(() => {
    if (situacao !== "lendo-selos" || lidas >= FOLHAS.length) return;
    const t = setTimeout(() => setLidas((n) => n + 1), 380 * k);
    return () => clearTimeout(t);
  }, [situacao, lidas, k]);

  const q = busca.trim().toLowerCase();
  const { nodes, edges, posicao, inicioDaFileira } = useMemo(
    () =>
      montarCanvas({
        lidas,
        sel,
        filtro: (f) => passa(recorte, f) && (!q || f.id.toLowerCase().includes(q) || f.titulo.toLowerCase().includes(q)),
        estadoDoDoc: (d, t) => (!gerado ? "a-gerar" : situacao === "desatualizado" && t === 1 && d.tipo === "ld" ? "corrigido" : "gerado"),
        estadoDoVolume: (t) => (!gerado ? "a-gerar" : situacao === "desatualizado" && t === 1 ? "desatualizado" : "gerado"),
        comSobras: situacao === "fora-da-divisao",
      }),
    [lidas, sel, recorte, q, gerado, situacao],
  );

  const folha = FOLHAS.find((f) => f.id === sel) ?? null;

  /** A câmera vai até a folha, sem afastar se já estiver perto. */
  const irParaFolha = (id: string) => {
    const p = posicao.get(id);
    if (!p) return;
    setCenter(p.x + LARGURA_DA_FOLHA / 2, p.y + ALTURA_DO_NO / 2, { zoom: Math.max(getZoom(), ZOOM_DE_TRABALHO), duration: 550 });
  };
  const irParaTomo = (n: number) => {
    setTomo(n);
    const p = inicioDaFileira.get(n);
    if (p) setViewport({ x: -p.x * ZOOM_DE_TRABALHO + 28, y: -p.y * ZOOM_DE_TRABALHO + 96, zoom: ZOOM_DE_TRABALHO }, { duration: 600 });
  };
  const escolher = (id: string | null) => {
    setCorrigindo(false);
    setSel(id);
    if (!id) return;
    const f = FOLHAS.find((x) => x.id === id)!;
    setTomo(TOMOS.find((t) => t.disciplinas.includes(f.disc))!.n);
    irParaFolha(id);
  };
  const andar = (d: number) => {
    const lidasAgora = FOLHAS.slice(0, lidas);
    const i = folha ? lidasAgora.indexOf(folha) : -1;
    const prox = lidasAgora[Math.min(lidasAgora.length - 1, Math.max(0, i < 0 ? 0 : i + d))];
    if (prox) escolher(prox.id);
  };
  const enquadrar = () => fitView({ padding: 0.08, duration: 600 });

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (alvo.closest("input, textarea")) {
        if (e.key === "Escape") {
          e.preventDefault();
          if (corrigindo) setCorrigindo(false);
          else (alvo as HTMLInputElement).blur();
        }
        if (e.key === "Enter" && alvo === campoDeBusca.current && q) {
          const achada = FOLHAS.slice(0, lidas).find((f) => f.id.toLowerCase().includes(q) || f.titulo.toLowerCase().includes(q));
          if (achada) (e.preventDefault(), escolher(achada.id), alvo.blur());
        }
        return;
      }
      if (e.key === "ArrowRight") (e.preventDefault(), andar(1));
      else if (e.key === "ArrowLeft") (e.preventDefault(), andar(-1));
      else if ((e.key === "e" || e.key === "E") && folha) (e.preventDefault(), setCorrigindo(true));
      else if (e.key === "/") (e.preventDefault(), campoDeBusca.current?.focus());
      else if (e.key === "f" || e.key === "F") (e.preventDefault(), enquadrar());
      else if (e.key === "+" || e.key === "=") zoomIn({ duration: 250 });
      else if (e.key === "-") zoomOut({ duration: 250 });
      else if (e.key === "Escape" && (corrigindo || sel)) {
        e.preventDefault();
        if (corrigindo) setCorrigindo(false);
        else setSel(null);
      }
    };
    document.addEventListener("keydown", tecla, true);
    return () => document.removeEventListener("keydown", tecla, true);
  });

  // A câmera de partida: na folha escolhida, ou no começo da fileira do tomo.
  const partida = useMemo(() => {
    const p = inicial ? posicao.get(inicial) : null;
    const z = ZOOM_DE_TRABALHO;
    if (p) return { x: -(p.x + LARGURA_DA_FOLHA / 2) * z + 380, y: -(p.y + ALTURA_DO_NO / 2) * z + 250, zoom: z };
    const r = inicioDaFileira.get(situacao === "fora-da-divisao" ? 0 : 1)!;
    return { x: -r.x * z + 28, y: -r.y * z + (situacao === "fora-da-divisao" ? 60 : 96), zoom: z };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doTomo = (n: number) => FOLHAS.filter((f) => TOMOS.find((t) => t.n === n)!.disciplinas.includes(f.disc));
  const ordem = new Map(FOLHAS.map((f, i) => [f.id, i]));
  const contagem = (r: Recorte) => FOLHAS.filter((f) => passa(r, f)).length;

  return (
    <div className="mp">
      <Topo atual="Painel" />
      <header className="mp-cabeca">
        <div>
          <p className="mp-trilha">
            <MarcaDaPrefeitura prefeitura="Criciúma" forma="sinal" />
            <span className="mp-mono">117-25</span>
            <span>UBS da Rua São Francisco de Assis</span>
          </p>
          <h1>Mapa do volume</h1>
        </div>
        <Botao variante="ghost" tamanho="sm">
          Voltar à conversa
        </Botao>
      </header>

      <section className="mp-painel">
        <div className="mp-tiles" role="tablist" aria-label="Ir para o tomo">
          {TOMOS.map((t) => {
            const fs = doTomo(t.n);
            const pend = fs.filter(precisaConferir).length;
            const lidasAqui = fs.filter((f) => (ordem.get(f.id) ?? 0) < lidas).length;
            return (
              <button key={t.n} type="button" role="tab" aria-selected={tomo === t.n} className="mp-tile" onClick={() => irParaTomo(t.n)}>
                <span className="mp-tile-rotulo">Tomo {dd(t.n)}</span>
                <span className="mp-tile-valor ds-num">
                  {lendo ? `${lidasAqui} de ${fs.length}` : fs.length}
                  <small>{lendo ? "lidas" : "folhas"}</small>
                </span>
                <span className="mp-tile-sub">
                  {t.paginas} páginas, {t.disciplinas.map((d) => DISCIPLINA[d].sigla).join(" e ")}
                  {!lendo && !gerado && (pend > 0 && !pronto ? <em className="mp-tom--aviso-texto">{pend} para conferir</em> : <em>conferido</em>)}
                  {gerado && (situacao === "desatualizado" && t.n === 1 ? <em className="mp-tom--aviso-texto">volume velho</em> : <em>montado</em>)}
                </span>
                {lendo && (
                  <span className="mp-tile-leitura" aria-hidden>
                    <motion.i animate={{ scaleX: lidasAqui / fs.length }} transition={{ duration: 0.4 * k, ease: SUAVE }} />
                  </span>
                )}
                {tomo === t.n && <motion.i layoutId="mp-tile-marca" className="mp-tile-marca" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
              </button>
            );
          })}
          {situacao === "fora-da-divisao" && (
            <button type="button" role="tab" aria-selected={tomo === 0} className="mp-tile mp-tile--resto" onClick={() => irParaTomo(0)}>
              <span className="mp-tile-rotulo">Fora da divisão</span>
              <span className="mp-tile-valor ds-num">
                {RESTOS.length}
                <small>documentos</small>
              </span>
              <span className="mp-tile-sub">
                de antes dos tomos<em className="mp-tom--aviso-texto">sem volume</em>
              </span>
              {tomo === 0 && <motion.i layoutId="mp-tile-marca" className="mp-tile-marca" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
            </button>
          )}
          <div className="mp-divisao">
            <span className="mp-tile-rotulo">Divisão</span>
            <span className="mp-divisao-valor">
              <span className="ds-num">412</span> páginas em
              <button type="button" className="mp-divisao-tomos" aria-haspopup="listbox">
                2 tomos <ChevronDown size={13} />
              </button>
            </span>
            <span className="mp-tile-sub">automática, pelas disciplinas</span>
          </div>
        </div>

        <div className="mp-miolo">
          <div className="mp-principal">
            <div className="mp-ferramentas">
              <div className="mp-abas" role="tablist" aria-label="Destacar no canvas">
                {RECORTES.map(([id, nome]) => (
                  <button key={id} type="button" role="tab" aria-selected={recorte === id} onClick={() => setRecorte(id)}>
                    {nome} <span className="ds-num">{contagem(id)}</span>
                    {recorte === id && <motion.i layoutId="mp-aba-marca" className="mp-aba-marca" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
                  </button>
                ))}
              </div>
              <label className="mp-busca">
                <Search size={14} />
                <input ref={campoDeBusca} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ir para a folha: código ou título" aria-label="Ir para a folha" />
                <Tecla>/</Tecla>
              </label>
            </div>
            <div className="mp-canvas">
              <Tela nodes={nodes} edges={edges} onFolha={(id) => escolher(sel === id ? null : id)} onVazio={() => sel && !corrigindo && setSel(null)} viewportInicial={partida} />
              <ControlesDoZoom onEnquadrar={enquadrar} />
            </div>
          </div>

          <aside className="mp-lado" aria-label={folha ? `Folha ${folha.id}` : "Antes de gerar"}>
            <div className="mp-lado-troca">
              <AnimatePresence initial={false}>
                <motion.div
                  key={folha ? `${folha.id}-${corrigindo ? "c" : "v"}` : `lista-${tomo}`}
                  className="mp-lado-camada"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: RITMO.troca * k, ease: SUAVE }}
                >
                  {folha ? (
                    <DaFolha f={folha} corrigindo={corrigindo} onCorrigir={setCorrigindo} onAndar={andar} />
                  ) : tomo === 0 ? (
                    <Sobras />
                  ) : gerado ? (
                    <Gerados tomo={tomo} velho={situacao === "desatualizado" && tomo === 1} />
                  ) : lendo ? (
                    <div className="mp-lado-bloco">
                      <p className="mp-lado-titulo">Lendo os selos</p>
                      <p className="mp-lado-sub">
                        <span className="ds-num">
                          {lidas} de {FOLHAS.length}
                        </span>{" "}
                        folhas. As que já foram lidas podem ser abertas enquanto o resto termina.
                      </p>
                      <div className="mp-barra-progresso">
                        <motion.i animate={{ scaleX: lidas / FOLHAS.length }} transition={{ duration: 0.4 * k, ease: SUAVE }} />
                      </div>
                    </div>
                  ) : (
                    <AntesDeGerar pronto={pronto} onVer={(id) => escolher(id)} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </aside>
        </div>

        <footer className="mp-rodape">
          <span>
            <Tecla>←</Tecla>
            <Tecla>→</Tecla> folha
          </span>
          <span>
            <Tecla>E</Tecla> corrigir
          </span>
          <span>
            <Tecla>O</Tecla> abrir a página
          </span>
          <span>
            <Tecla>/</Tecla> ir para
          </span>
          <span>
            <Tecla>F</Tecla> enquadrar
          </span>
          <span>
            <Tecla>+</Tecla>
            <Tecla>−</Tecla> zoom
          </span>
          <span className="mp-rodape-fim">arraste para mover, role para o zoom</span>
        </footer>
      </section>
    </div>
  );
}

/** No lab, a forma do cartão vem da URL (?cartao=prancha), para comparar no canvas de verdade. */
function useCartaoDaUrl(): EstiloDoCartao {
  const [e, setE] = useState<EstiloDoCartao>("prancha");
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("cartao");
    if (c && ESTILOS.some((x) => x.id === c)) setE(c as EstiloDoCartao);
  }, []);
  return e;
}

export function TelaMapa({ situacao }: { situacao: SituacaoMapa }) {
  const estilo = useCartaoDaUrl();
  return (
    <CartaoAtual.Provider value={estilo}>
      <ReactFlowProvider>
        <Mapa situacao={situacao} />
      </ReactFlowProvider>
    </CartaoAtual.Provider>
  );
}
