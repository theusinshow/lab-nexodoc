"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { AlertTriangle, ChevronRight, FilePlus2, FileSearch, Layers, ListChecks, ScanLine, X } from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType } from "react";

import { Botao, Orbe } from "@/components/ds/basicos";
import { FOLHAS, INTRUSAS, MESAS_ANTERIORES, empilhar, type Folha, type Pilha } from "@/lib/design-lab/mesa";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import "./inicio-e.css";

export type SituacaoE = "vazia" | "chegando" | "arrumada" | "escolhendo" | "pilha-aberta" | "so-memorial" | "misturadas";

type Fase = "vazia" | "chegando" | "lendo" | "arrumada";
type IdAcao = "auditar" | "ld" | "volume" | "conferir";

interface Acao {
  id: IdAcao;
  nome: string;
  Icone: ComponentType<{ size?: number }>;
  /** Quais pilhas a ação usa — é isso que acende quando o mouse passa. */
  usa: (p: Pilha) => boolean;
  falta: string;
}

const ACOES: Acao[] = [
  { id: "auditar", nome: "Auditar o memorial", Icone: FileSearch, usa: (p) => p.tipo === "memorial", falta: "precisa do memorial" },
  { id: "ld", nome: "Gerar LD e capa", Icone: ListChecks, usa: (p) => p.tipo === "prancha", falta: "precisa das pranchas" },
  { id: "volume", nome: "Montar o volume", Icone: Layers, usa: (p) => p.tipo !== "memorial", falta: "precisa das pranchas" },
  { id: "conferir", nome: "Conferir as folhas", Icone: ScanLine, usa: (p) => p.tipo === "prancha", falta: "precisa das pranchas" },
];

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];

/** Posição "jogada na mesa" de cada folha, estável por índice. */
function espalhada(i: number) {
  const x = ((i * 137) % 100) / 100;
  const y = ((i * 71) % 100) / 100;
  return { left: `${6 + x * 82}%`, top: `${8 + y * 68}%`, rotate: ((i * 53) % 24) - 12 };
}

/**
 * INÍCIO E — A MESA. Começa pelos documentos, não pela tarefa. As folhas
 * chegam soltas, o Nexo lê cada carimbo e as folhas DESLIZAM para a pilha certa
 * (a mesma folha, do lugar onde caiu até a pilha: a resposta a "para onde
 * foi"). Depois a tela oferece o que dá para fazer com o que está na mesa, e
 * passar o mouse numa ação acende as pilhas que ela usa.
 */
export function TelaInicioE({ situacao }: { situacao: SituacaoE }) {
  const { dur, mola, k } = useTempo();
  const inicial: Folha[] =
    situacao === "vazia" ? [] : situacao === "so-memorial" ? FOLHAS.filter((f) => f.tipo === "memorial") : situacao === "misturadas" ? [...FOLHAS, ...INTRUSAS] : FOLHAS;
  const [folhas, setFolhas] = useState<Folha[]>(inicial);
  const [fase, setFase] = useState<Fase>(situacao === "vazia" ? "vazia" : situacao === "chegando" ? "chegando" : "arrumada");
  const [lidas, setLidas] = useState(0);
  const [aberta, setAberta] = useState<string | null>(situacao === "pilha-aberta" ? "arq" : null);
  const [usando, setUsando] = useState<IdAcao | null>(situacao === "escolhendo" ? "ld" : null);
  const [comecou, setComecou] = useState<IdAcao | null>(null);

  // A chegada em três tempos: caem soltas, o Nexo lê os carimbos, e arruma.
  useEffect(() => {
    if (fase !== "chegando") return;
    const t = setTimeout(() => (setLidas(0), setFase("lendo")), 700 * k);
    return () => clearTimeout(t);
  }, [fase, k]);
  useEffect(() => {
    if (fase !== "lendo") return;
    const id = setInterval(() => setLidas((n) => Math.min(folhas.length, n + 2)), 90 * k);
    const t = setTimeout(() => setFase("arrumada"), 1900 * k);
    return () => {
      clearInterval(id);
      clearTimeout(t);
    };
  }, [fase, folhas.length, k]);

  function soltar() {
    setFolhas(FOLHAS);
    setAberta(null);
    setComecou(null);
    setFase("chegando");
  }

  const pilhas = useMemo(() => empilhar(folhas), [folhas]);
  const obras = [...new Set(folhas.map((f) => f.obra))];
  const misturadas = obras.length > 1;
  const acaoUsada = ACOES.find((a) => a.id === usando);
  // Com duas obras na mesa, só trava a ação que MISTURARIA as duas: auditar
  // um memorial que é todo de uma obra continua seguro.
  const mistura = (a: Acao) => misturadas && new Set(pilhas.filter(a.usa).map((p) => p.obra)).size > 1;
  const primeiraPossivel = ACOES.find((a) => pilhas.some(a.usa) && !mistura(a))?.id;
  const pilhaAberta = pilhas.find((p) => p.id === aberta);

  return (
    <div
      className="me"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        soltar();
      }}
    >
      <div className="me-brilho" aria-hidden />
      <Topo atual="Painel" />

      <div className="me-corpo">
        {/* ---------- cabeçalho: muda com o que está na mesa ---------- */}
        <div className="me-cabeca">
          <AnimatePresence mode="wait" initial={false}>
            {fase === "arrumada" && folhas.length > 0 && !misturadas ? (
              <motion.div key="obra" className="me-obra" {...aparece(dur)}>
                <MarcaDaPrefeitura prefeitura="Criciúma" forma="chapa" />
                <div>
                  <h1>Unidade Básica de Saúde da Rua São Francisco de Assis</h1>
                  <p>
                    <span className="ds-code">117-25</span> Criciúma. {folhas.length} {folhas.length === 1 ? "documento" : "documentos"} na mesa,
                    todos desta obra.
                  </p>
                </div>
              </motion.div>
            ) : fase === "arrumada" && misturadas ? (
              <motion.div key="mist" className="me-obra" {...aparece(dur)}>
                <h1>Duas obras na mesma mesa</h1>
              </motion.div>
            ) : (
              <motion.div key="vazia" {...aparece(dur)}>
                <h1>{fase === "vazia" ? "Solte os PDFs na mesa." : fase === "chegando" ? "Recebendo…" : "Lendo os carimbos…"}</h1>
                <p>
                  {fase === "vazia"
                    ? "Memorial, pranchas, capas ou LDs. O Nexo lê cada um, separa em pilhas e diz o que dá para fazer."
                    : fase === "lendo"
                      ? `${lidas} de ${folhas.length} documentos lidos`
                      : `${folhas.length} documentos`}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          {fase === "arrumada" && folhas.length > 0 && (
            <div className="me-cabeca-acoes">
              <Botao variante="quiet" tamanho="sm" onClick={soltar}>
                <FilePlus2 />
                Adicionar arquivos
              </Botao>
              <Botao
                variante="quiet"
                tamanho="sm"
                onClick={() => {
                  setFolhas([]);
                  setFase("vazia");
                  setAberta(null);
                }}
              >
                <X />
                Limpar a mesa
              </Botao>
            </div>
          )}
        </div>

        <AnimatePresence initial={false}>
          {misturadas && fase === "arrumada" && (
            <motion.div
              className="me-aviso"
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: dur("layout"), ease: ease(CURVA.out) }}
            >
              <div>
                <AlertTriangle size={16} />
                <span>
                  <b>Há folhas de duas obras.</b> 3 pranchas de estrutura são da <span className="ds-code">SIM099-26</span>, e o resto é da{" "}
                  <span className="ds-code">117-25</span>. Gerar LD ou volume assim misturaria as duas.
                </span>
                <Botao variante="ghost" tamanho="sm" onClick={() => setFolhas((f) => f.filter((x) => x.obra === "117-25"))}>
                  Tirar as da SIM099-26
                </Botao>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- a mesa ---------- */}
        <div
          className={`me-mesa${fase === "vazia" ? " me-mesa--vazia" : ""}`}
          onClick={fase === "vazia" ? soltar : undefined}
          role={fase === "vazia" ? "button" : undefined}
          tabIndex={fase === "vazia" ? 0 : undefined}
          onKeyDown={(e) => fase === "vazia" && (e.key === "Enter" || e.key === " ") && soltar()}
          aria-label={fase === "vazia" ? "Escolher PDFs no computador" : undefined}
        >
          {fase === "vazia" && (
            <div className="me-vazia">
              <span className="me-vazia-folhas" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <span>
                Arraste para cá, ou <u>escolha no computador</u>
              </span>
            </div>
          )}

          <LayoutGroup>
            {(fase === "chegando" || fase === "lendo") && (
              <div className="me-espalhadas">
                {folhas.map((f, i) => {
                  const pos = espalhada(i);
                  return (
                    <motion.div
                      key={f.id}
                      layoutId={`folha-${f.id}`}
                      className="me-solta"
                      style={{ left: pos.left, top: pos.top }}
                      initial={{ opacity: 0, y: -40, rotate: pos.rotate - 8, scale: 1.08 }}
                      animate={{ opacity: 1, y: 0, rotate: pos.rotate, scale: 1 }}
                      transition={{ ...mola("smooth"), delay: Math.min(i, 24) * 0.018 * k }}
                    >
                      <FolhaDesenhada f={f} lendo={fase === "lendo" && i >= lidas} />
                    </motion.div>
                  );
                })}
              </div>
            )}

            {fase === "arrumada" && folhas.length > 0 && (
              <div className="me-pilhas">
                <AnimatePresence initial={false}>
                  {pilhas.map((p) => {
                    const acesa = acaoUsada ? acaoUsada.usa(p) : null;
                    return (
                      <PilhaView
                        key={p.id}
                        p={p}
                        acesa={acesa}
                        aberta={aberta === p.id}
                        intrusa={misturadas && p.obra !== "117-25"}
                        onAbrir={() => setAberta((a) => (a === p.id ? null : p.id))}
                      />
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </LayoutGroup>

          {/* ---------- pilha aberta: as folhas uma a uma ---------- */}
          <AnimatePresence>
            {pilhaAberta && fase === "arrumada" && (
              <motion.div
                className="me-aberta"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8, transition: { duration: dur("feedback") } }}
                transition={{ duration: dur("enter"), ease: ease(CURVA.out) }}
              >
                <div className="me-aberta-cabeca">
                  <b>
                    {pilhaAberta.nome} <span className="me-nota">{pilhaAberta.folhas.length} folhas, lidas dos carimbos</span>
                  </b>
                  <Botao variante="quiet" tamanho="sm" icone aria-label="Fechar a pilha" onClick={() => setAberta(null)}>
                    <X />
                  </Botao>
                </div>
                <div className="me-aberta-grade">
                  {pilhaAberta.folhas.map((f, i) => (
                    <motion.div
                      key={f.id}
                      className={`me-aberta-folha${f.semCarimbo ? " me-aberta-folha--alerta" : ""}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: dur("enter"), delay: i * 0.02 * k, ease: ease(CURVA.out) }}
                    >
                      <FolhaDesenhada f={f} />
                      <span className="ds-code">{f.semCarimbo ? "sem carimbo" : f.codigo}</span>
                      <span className="me-nota">{f.titulo}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ---------- o que dá para fazer ---------- */}
        <AnimatePresence initial={false}>
          {fase === "arrumada" && folhas.length > 0 && (
            <motion.section
              className="me-acoes"
              aria-label="O que dá para fazer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: dur("enter"), ease: ease(CURVA.out), delay: 0.12 * k }}
            >
              <h2>Com o que está na mesa, posso:</h2>
              <div className="me-acoes-lista" onMouseLeave={() => situacao !== "escolhendo" && setUsando(null)}>
                {ACOES.map((a) => {
                  const pilhasUsadas = pilhas.filter(a.usa);
                  const pode = pilhasUsadas.length > 0 && !mistura(a);
                  const nFolhas = pilhasUsadas.reduce((n, p) => n + p.folhas.length, 0);
                  const principal = a.id === primeiraPossivel;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={`me-acao${principal ? " me-acao--principal" : ""}${usando === a.id ? " me-acao--sobre" : ""}`}
                      disabled={!pode || comecou !== null}
                      onMouseEnter={() => setUsando(a.id)}
                      onFocus={() => setUsando(a.id)}
                      onClick={() => setComecou(a.id)}
                    >
                      <span className="me-acao-icone">
                        {comecou === a.id ? <Orbe tamanho={16} estado="trabalhando" /> : <a.Icone size={17} />}
                      </span>
                      <span className="me-acao-texto">
                        <b>{comecou === a.id ? "Começando…" : a.nome}</b>
                        <span>
                          {mistura(a)
                            ? "separe as obras antes"
                            : pode
                              ? `usa ${nFolhas} ${nFolhas === 1 ? "documento" : "documentos"}`
                              : a.falta}
                        </span>
                      </span>
                      {pode && <ChevronRight size={15} className="me-acao-seta" />}
                    </button>
                  );
                })}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ---------- mesas anteriores ---------- */}
        {(fase === "vazia" || fase === "arrumada") && (
          <div className="me-anteriores">
            <span className="me-nota">Mesas anteriores</span>
            {MESAS_ANTERIORES.map((m) => (
              <button key={m.obra} type="button" className="me-anterior">
                <MarcaDaPrefeitura prefeitura={m.cidade} forma="sinal" />
                <span className="ds-code">{m.obra}</span>
                <span>{m.resumo}</span>
                <span className="me-nota">{m.quando}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function aparece(dur: (n: "state") => number) {
  return {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
    transition: { duration: dur("state"), ease: ease(CURVA.out) },
  };
}

/**
 * Uma pilha: até cinco folhas empilhadas com um giro leve. Ao passar o mouse a
 * pilha se ABRE EM LEQUE — mostra que há mais de uma folha antes do clique.
 */
function PilhaView({ p, acesa, aberta, intrusa, onAbrir }: { p: Pilha; acesa: boolean | null; aberta: boolean; intrusa: boolean; onAbrir: () => void }) {
  const { mola, dur } = useTempo();
  const [leque, setLeque] = useState(false);
  const visiveis = p.folhas.slice(0, 5);
  const semCarimbo = p.folhas.filter((f) => f.semCarimbo).length;
  const deitada = p.tipo === "prancha";

  return (
    <motion.button
      layout
      type="button"
      className={`me-pilha${aberta ? " me-pilha--aberta" : ""}${acesa ? " me-pilha--acesa" : ""}${intrusa ? " me-pilha--intrusa" : ""}`}
      onClick={onAbrir}
      onMouseEnter={() => setLeque(true)}
      onMouseLeave={() => setLeque(false)}
      aria-expanded={aberta}
      initial={{ opacity: 0 }}
      animate={{ opacity: acesa === false ? 0.3 : 1, scale: acesa === false ? 0.97 : 1 }}
      exit={{ opacity: 0, scale: 0.9, y: 20, transition: { duration: dur("enter") } }}
      transition={{ ...mola("smooth"), opacity: { duration: dur("state") } }}
    >
      <span className={`me-pilha-folhas${deitada ? " me-pilha-folhas--deitada" : ""}`}>
        {visiveis.map((f, i) => {
          const n = visiveis.length;
          const giro = leque ? (i - (n - 1) / 2) * 7 : ((i * 37) % 7) - 3;
          const x = leque ? (i - (n - 1) / 2) * 14 : i * 1.5;
          return (
            <motion.span
              key={f.id}
              layoutId={`folha-${f.id}`}
              className="me-pilha-folha"
              style={{ zIndex: i }}
              animate={{ rotate: giro, x, y: leque ? -Math.abs(i - (n - 1) / 2) * 2 : -i * 2 }}
              transition={mola("smooth")}
            >
              <FolhaDesenhada f={f} />
            </motion.span>
          );
        })}
      </span>
      <span className="me-pilha-rotulo">
        <b>{p.nome}</b>
        <span>
          {p.tipo === "memorial" ? "42 páginas" : `${p.folhas.length} ${p.folhas.length === 1 ? "folha" : "folhas"}`}
          {intrusa && <span className="me-pilha-alerta"> da {p.obra}</span>}
          {semCarimbo > 0 && <span className="me-pilha-alerta"> · {semCarimbo} sem carimbo</span>}
        </span>
      </span>
    </motion.button>
  );
}

/** A folha desenhada: prancha deitada com carimbo; memorial, capa e LD em pé. */
function FolhaDesenhada({ f, lendo }: { f: Folha; lendo?: boolean }) {
  return (
    <span className={`me-folha me-folha--${f.tipo}`} data-disc={f.disciplina} data-lendo={lendo || undefined}>
      {f.tipo === "prancha" && <i className="me-folha-desenho" />}
      {f.tipo === "capa" && <i className="me-folha-capa" />}
      <i className="me-folha-carimbo" />
    </span>
  );
}
