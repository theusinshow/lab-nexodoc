"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, ChevronLeft, ChevronRight, MessageSquare, PenLine, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import { RITMO, SUAVE } from "../conversa/turnos";
import { DISCIPLINA, type Disciplina } from "../resultado-e/dados";
import { SeloDaDisciplina } from "../resultado-e/disciplina";
import { documentosDoTomo, FOLHAS, ORIGEM_NOME, RESTOS, TOMOS, type Documento, type Folha } from "./dados";
import "./mapa.css";

export type SituacaoMapa = "lendo-selos" | "lido" | "folha-aberta" | "corrigindo" | "vou-gerar" | "desatualizado" | "fora-da-divisao";

type Densidade = 1 | 2 | 3;
const DENSIDADES: { n: Densidade; nome: string }[] = [
  { n: 1, nome: "Conjunto" },
  { n: 2, nome: "Títulos" },
  { n: 3, nome: "Carimbo" },
];

/** As marcas que pedem conferência. O normal é mudo: folha sem marca não diz nada. */
type Marca = "diverge" | "sem-numero" | "ordem" | "mao";
const MARCAS: { id: Marca; nome: string; explica: string; tem: (f: Folha) => boolean }[] = [
  { id: "diverge", nome: "Diverge", explica: "o carimbo contradiz o resto do conjunto", tem: (f) => !!f.divergencia },
  { id: "sem-numero", nome: "Sem número", explica: "entra no fim da disciplina até alguém numerar", tem: (f) => f.numero == null },
  { id: "ordem", nome: "Número deduzido", explica: "saiu da ordem das páginas: ninguém o leu", tem: (f) => f.origem === "ordem" },
  { id: "mao", nome: "Corrigida à mão", explica: "o valor veio de uma pessoa, não do carimbo", tem: (f) => !!f.editado },
];

const doisDigitos = (n: number) => String(n).padStart(2, "0");

/** As marcas da folha, na ordem de gravidade. Sobrevivem às três densidades. */
function MarcasDaFolha({ f }: { f: Folha }) {
  return (
    <span className="mp-marcas">
      {f.divergencia && <i className={`mp-m mp-m--${f.divergencia.severidade}`} title={f.divergencia.motivo} />}
      {f.origem === "ordem" && <i className="mp-m mp-m--ordem" title={ORIGEM_NOME.ordem} />}
      {f.editado && <i className="mp-m mp-m--mao" title="corrigida à mão" />}
    </span>
  );
}

/**
 * A FOLHA NA GRADE. Largura fixa e altura fixa por densidade: cartão de altura
 * variável vira escada e destrói a varredura, que é a razão desta tela.
 */
function CartaoDaFolha({
  f,
  densidade,
  lida,
  selecionada,
  apagada,
  onClick,
}: {
  f: Folha;
  densidade: Densidade;
  lida: boolean;
  selecionada: boolean;
  apagada: boolean;
  onClick: () => void;
}) {
  const numero = f.numero == null ? "—" : doisDigitos(f.numero);
  return (
    <motion.button
      layout="position"
      transition={{ layout: { duration: RITMO.entra, ease: SUAVE } }}
      type="button"
      data-folha={f.id}
      className={`mp-folha mp-folha--d${densidade} dc--${f.disc}${selecionada ? " mp-folha--sel" : ""}${apagada ? " mp-folha--apagada" : ""}${lida ? "" : " mp-folha--lendo"}`}
      onClick={onClick}
      aria-pressed={selecionada}
      aria-label={`${f.id}, ${f.titulo}`}
    >
      <i className="mp-folha-fio" aria-hidden />
      <span className="mp-folha-troca">
        <AnimatePresence initial={false}>
          {lida ? (
            <motion.span key="lida" className="mp-folha-corpo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: RITMO.troca, ease: SUAVE }}>
              <span className="mp-folha-linha">
                <span className={`mp-folha-num${f.numero == null ? " mp-folha-num--falta" : ""}`}>
                  {numero}
                  {densidade > 1 && <small>/{doisDigitos(f.total)}</small>}
                </span>
                <MarcasDaFolha f={f} />
              </span>
              {densidade > 1 && <span className="mp-folha-titulo">{f.titulo}</span>}
              {densidade === 3 && (
                <span className="mp-folha-carimbo">
                  <span>{f.id}</span>
                  <span>
                    rev. {f.revisao}, p. {f.paginaNoPdf}
                  </span>
                </span>
              )}
            </motion.span>
          ) : (
            <motion.span key="lendo" className="mp-folha-corpo" exit={{ opacity: 0 }} transition={{ duration: RITMO.troca, ease: SUAVE }}>
              <span className="mp-folha-linha">
                <span className="mp-folha-num">{doisDigitos(f.paginaNoPdf)}</span>
              </span>
              {densidade > 1 && <span className="mp-folha-vazio" aria-hidden />}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </motion.button>
  );
}

/** Um documento que o Nexo gera (ou gerou). "A gerar" é contorno tracejado: ainda não existe. */
function CartaoDoDocumento({ d, estado }: { d: Documento; estado: "gerado" | "a-gerar" | "desatualizado" }) {
  return (
    <div className={`mp-doc mp-doc--${estado} mp-doc--${d.tipo}`}>
      <span className="mp-doc-tipo">{d.nome}</span>
      <span className="mp-doc-detalhe">{d.detalhe}</span>
      <span className="mp-doc-pe">
        {estado === "a-gerar" ? (
          <span className="mp-doc-estado">a gerar</span>
        ) : estado === "desatualizado" ? (
          <span className="mp-doc-estado mp-doc-estado--velho">desatualizada</span>
        ) : (
          <span className="mp-doc-arquivo">{d.arquivo}</span>
        )}
        {estado !== "a-gerar" && (
          <button type="button" aria-label={`Abrir ${d.arquivo}`}>
            <ArrowUpRight size={13} />
          </button>
        )}
      </span>
    </div>
  );
}

function CartaoDoVolume({ tomo, paginas, estado }: { tomo: number; paginas: number; estado: "nao-montado" | "montado" | "desatualizado" }) {
  return (
    <div className={`mp-vol mp-vol--${estado}`}>
      <span className="mp-doc-tipo">Volume, tomo {doisDigitos(tomo)}</span>
      <span className="mp-doc-detalhe">{paginas} páginas</span>
      <span className="mp-doc-pe">
        <span className={`mp-doc-estado${estado === "desatualizado" ? " mp-doc-estado--velho" : estado === "montado" ? " mp-doc-estado--ok" : ""}`}>
          {estado === "nao-montado" ? "ainda não montado" : estado === "montado" ? "montado" : "montado antes da correção"}
        </span>
      </span>
    </div>
  );
}

/** O inspetor sem folha escolhida: o que foi lido, por disciplina, e as marcas como filtro. */
function Resumo({ marca, onMarca, lidas, situacao }: { marca: Marca | null; onMarca: (m: Marca | null) => void; lidas: number; situacao: SituacaoMapa }) {
  const jaLidas = FOLHAS.slice(0, lidas);
  const porDisc = useMemo(() => {
    const m = new Map<Disciplina, Folha[]>();
    FOLHAS.slice(0, lidas).forEach((f) => m.set(f.disc, [...(m.get(f.disc) ?? []), f]));
    return [...m.entries()];
  }, [lidas]);
  const lendo = situacao === "lendo-selos" && lidas < FOLHAS.length;
  return (
    <div className="mp-insp-bloco">
      <p className="mp-insp-titulo">{lendo ? `Lendo os selos: ${lidas} de ${FOLHAS.length}` : "O que foi lido"}</p>
      {lendo && <p className="mp-insp-nota">As folhas já lidas podem ser conferidas enquanto o resto termina.</p>}
      <dl className="mp-disc-lista">
        {porDisc.map(([disc, fs]) => {
          const revs = [...new Set(fs.map((f) => f.revisao))].sort();
          return (
            <div key={disc}>
              <dt>
                <SeloDaDisciplina disc={disc} nome />
              </dt>
              <dd>
                <span className="ds-num">{fs.length}</span> {fs.length === 1 ? "folha" : "folhas"}, rev. {revs.join(" e ")}
              </dd>
            </div>
          );
        })}
      </dl>

      <p className="mp-insp-titulo mp-insp-titulo--sep">Para conferir</p>
      <div className="mp-filtros" role="group" aria-label="Mostrar só as folhas com esta marca">
        {MARCAS.map((m) => {
          const n = jaLidas.filter(m.tem).length;
          return (
            <button key={m.id} type="button" aria-pressed={marca === m.id} className={`mp-filtro${marca === m.id ? " mp-filtro--ativo" : ""}`} onClick={() => onMarca(marca === m.id ? null : m.id)}>
              <span className="mp-filtro-marca">
                <i className={`mp-m mp-m--${m.id === "diverge" ? "aviso" : m.id}`} />
              </span>
              <span className="mp-filtro-texto">
                <b>{m.nome}</b>
                <span>{m.explica}</span>
              </span>
              <span className="ds-num mp-filtro-n">{n}</span>
            </button>
          );
        })}
      </div>

      <p className="mp-insp-titulo mp-insp-titulo--sep">Teclado</p>
      <dl className="mp-teclas">
        <div>
          <dt>
            <Tecla>←</Tecla>
            <Tecla>→</Tecla>
          </dt>
          <dd>folha anterior e próxima</dd>
        </div>
        <div>
          <dt>
            <Tecla>E</Tecla>
          </dt>
          <dd>corrigir a folha</dd>
        </div>
        <div>
          <dt>
            <Tecla>O</Tecla>
          </dt>
          <dd>abrir a página original</dd>
        </div>
        <div>
          <dt>
            <Tecla>1</Tecla>
            <Tecla>2</Tecla>
            <Tecla>3</Tecla>
          </dt>
          <dd>conjunto, títulos, carimbo</dd>
        </div>
      </dl>
    </div>
  );
}

/** Uma linha do carimbo no inspetor. */
function Campo({ rotulo, children, nota }: { rotulo: string; children: ReactNode; nota?: ReactNode }) {
  return (
    <div className="mp-campo">
      <dt>{rotulo}</dt>
      <dd>
        {children}
        {nota && <small>{nota}</small>}
      </dd>
    </div>
  );
}

/** O inspetor com a folha escolhida: o carimbo inteiro, a conferência e o que fazer. */
function Inspetor({ f, corrigindo, onCorrigir, onFechar, onAndar }: { f: Folha; corrigindo: boolean; onCorrigir: (v: boolean) => void; onFechar: () => void; onAndar: (d: number) => void }) {
  const i = FOLHAS.indexOf(f);
  const tomo = TOMOS.find((t) => t.disciplinas.includes(f.disc))!;
  return (
    <div className="mp-insp-bloco">
      <div className="mp-insp-cabeca">
        <SeloDaDisciplina disc={f.disc} nome />
        <span className="mp-insp-nav">
          <button type="button" onClick={() => onAndar(-1)} disabled={i === 0} aria-label="Folha anterior (←)">
            <ChevronLeft size={15} />
          </button>
          <span className="ds-num">
            {i + 1} de {FOLHAS.length}
          </span>
          <button type="button" onClick={() => onAndar(1)} disabled={i === FOLHAS.length - 1} aria-label="Próxima folha (→)">
            <ChevronRight size={15} />
          </button>
        </span>
      </div>
      <p className="mp-insp-id">{f.id}</p>

      {corrigindo ? (
        <form className="mp-form" onSubmit={(e) => (e.preventDefault(), onCorrigir(false))}>
          <label>
            <span>Título</span>
            <textarea rows={2} defaultValue={f.titulo} autoFocus />
          </label>
          <div className="mp-form-dupla">
            <label>
              <span>Número</span>
              <input defaultValue={f.numero == null ? "" : doisDigitos(f.numero)} placeholder="—" inputMode="numeric" />
            </label>
            <label>
              <span>De</span>
              <input defaultValue={doisDigitos(f.total)} inputMode="numeric" />
            </label>
          </div>
          <label>
            <span>Código da prancha</span>
            <input defaultValue={f.id} className="mp-mono" />
          </label>
          <label>
            <span>Disciplina</span>
            <input defaultValue={DISCIPLINA[f.disc].nome} list="mp-disciplinas" />
            <datalist id="mp-disciplinas">
              {Object.values(DISCIPLINA).map((d) => (
                <option key={d.id} value={d.nome} />
              ))}
            </datalist>
          </label>
          <p className="mp-insp-nota">O que você mudar fica marcado como seu, e não do carimbo. O PDF da prancha não muda.</p>
          <div className="mp-acoes">
            <Botao variante="primary" tamanho="sm" type="submit">
              Aplicar <Tecla>↵</Tecla>
            </Botao>
            <Botao variante="quiet" tamanho="sm" type="button" onClick={() => onCorrigir(false)}>
              Cancelar <Tecla>Esc</Tecla>
            </Botao>
          </div>
        </form>
      ) : (
        <>
          <p className="mp-insp-carimbo">{f.titulo}</p>
          {f.divergencia && (
            <p className={`mp-insp-diverge mp-insp-diverge--${f.divergencia.severidade}`}>
              <i className={`mp-m mp-m--${f.divergencia.severidade}`} />
              {f.divergencia.motivo}
            </p>
          )}
          <dl className="mp-campos">
            <Campo rotulo="Número" nota={ORIGEM_NOME[f.origem]}>
              {f.numero == null ? <span className="mp-falta">faltando</span> : `${doisDigitos(f.numero)} de ${doisDigitos(f.total)}`}
            </Campo>
            <Campo rotulo="Revisão">{f.revisao}</Campo>
            <Campo rotulo="Arquivo" nota={`página ${f.paginaNoPdf}`}>
              <span className="mp-mono">{f.arquivo}</span>
            </Campo>
            <Campo rotulo="Tomo">{doisDigitos(tomo.n)}</Campo>
            {f.editado && (
              <Campo rotulo="Corrigido" nota={`antes: ${f.editado.antes}`}>
                {f.editado.campo}, à mão
              </Campo>
            )}
          </dl>
          <div className="mp-acoes mp-acoes--coluna">
            <button type="button" className="mp-acao">
              <ArrowUpRight size={14} /> Abrir a página original <Tecla>O</Tecla>
            </button>
            <button type="button" className="mp-acao" onClick={() => onCorrigir(true)}>
              <PenLine size={14} /> Corrigir a folha <Tecla>E</Tecla>
            </button>
            <button type="button" className="mp-acao">
              <MessageSquare size={14} /> Alterar no chat
            </button>
            <button type="button" className="mp-acao mp-acao--perigo">
              <Trash2 size={14} /> Remover do volume
            </button>
          </div>
          <button type="button" className="mp-insp-fechar" onClick={onFechar}>
            Voltar ao resumo <Tecla>Esc</Tecla>
          </button>
        </>
      )}
    </div>
  );
}

/**
 * O MAPA DO VOLUME. Conferir o que o Nexo leu de cada folha antes de gerar.
 * Uma fileira por tomo, na ordem do volume: os documentos que o Nexo gera, as
 * folhas agrupadas por disciplina e, no fim, o volume. À direita, o inspetor:
 * sem folha escolhida, o resumo e as marcas; com folha, o carimbo inteiro.
 * Zoom vira densidade (1, 2, 3); o mapa anda pelo teclado.
 */
export function TelaMapa({ situacao }: { situacao: SituacaoMapa }) {
  const { k } = useTempo();
  const inicial = situacao === "folha-aberta" ? "ARQ-03" : situacao === "corrigindo" ? "ELE-04" : null;
  const [sel, setSel] = useState<string | null>(inicial);
  const [corrigindo, setCorrigindo] = useState(situacao === "corrigindo");
  const [densidade, setDensidade] = useState<Densidade>(2);
  const [marca, setMarca] = useState<Marca | null>(null);
  const [lidas, setLidas] = useState(situacao === "lendo-selos" ? 9 : FOLHAS.length);
  const [tomoAtivo, setTomoAtivo] = useState(1);
  const mapa = useRef<HTMLDivElement>(null);

  // A leitura dos selos, de verdade: uma folha a cada ~0,4 s, na ordem das páginas.
  useEffect(() => {
    if (situacao !== "lendo-selos" || lidas >= FOLHAS.length) return;
    const t = setTimeout(() => setLidas((n) => n + 1), 420 * k);
    return () => clearTimeout(t);
  }, [situacao, lidas, k]);

  const folha = FOLHAS.find((f) => f.id === sel) ?? null;

  const andar = (d: number) => {
    const i = folha ? FOLHAS.indexOf(folha) : d > 0 ? -1 : FOLHAS.length;
    const prox = FOLHAS[Math.min(FOLHAS.length - 1, Math.max(0, i + d))];
    setCorrigindo(false);
    setSel(prox.id);
  };

  // A folha escolhida sempre à vista, sem pular a tela. A de partida já está: não rola ao abrir.
  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    if (!sel) return;
    mapa.current?.querySelector(`[data-folha="${sel}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [sel]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (alvo.closest("input, textarea")) {
        if (e.key === "Escape" && corrigindo) {
          e.preventDefault();
          setCorrigindo(false);
        }
        return;
      }
      if (e.key === "ArrowRight") (e.preventDefault(), andar(1));
      else if (e.key === "ArrowLeft") (e.preventDefault(), andar(-1));
      else if ((e.key === "e" || e.key === "E") && folha) (e.preventDefault(), setCorrigindo(true));
      else if (e.key === "1" || e.key === "2" || e.key === "3") setDensidade(Number(e.key) as Densidade);
      else if (e.key === "Escape" && (corrigindo || sel || marca)) {
        e.preventDefault();
        if (corrigindo) setCorrigindo(false);
        else if (sel) setSel(null);
        else setMarca(null);
      }
    };
    document.addEventListener("keydown", tecla, true);
    return () => document.removeEventListener("keydown", tecla, true);
  });

  const estadoDoc = (d: Documento): "gerado" | "a-gerar" | "desatualizado" => {
    if (situacao === "desatualizado") return d.id === "ld-1" ? "desatualizado" : "gerado";
    if (situacao === "fora-da-divisao") return "gerado";
    return "a-gerar";
  };
  const estadoVol = (n: number) =>
    situacao === "desatualizado" ? (n === 1 ? "desatualizado" : "montado") : situacao === "fora-da-divisao" ? "montado" : "nao-montado";
  const filtro = MARCAS.find((m) => m.id === marca);
  const ordem = new Map(FOLHAS.map((f, i) => [f.id, i]));

  return (
    <div className="mp">
      <Topo atual="Painel" />
      <header className="mp-cabeca">
        <span className="mp-cabeca-obra">
          <MarcaDaPrefeitura prefeitura="Criciúma" forma="sinal" />
          <span className="mp-mono">117-25</span>
        </span>
        <h1>Mapa do volume</h1>
        <span className="mp-cabeca-estado">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span key={lidas < FOLHAS.length ? "lendo" : "lido"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
              {lidas < FOLHAS.length ? `lendo os selos, ${lidas} de ${FOLHAS.length}` : "33 folhas lidas dos carimbos de 4 arquivos"}
            </motion.span>
          </AnimatePresence>
        </span>
        <Botao variante="quiet" tamanho="sm" className="mp-voltar">
          Voltar à conversa
        </Botao>
      </header>

      <div className="mp-barra">
        <div className="mp-seg" role="tablist" aria-label="Ir para o tomo">
          {TOMOS.map((t) => (
            <button
              key={t.n}
              type="button"
              role="tab"
              aria-selected={tomoAtivo === t.n}
              onClick={() => {
                setTomoAtivo(t.n);
                mapa.current?.querySelector(`[data-tomo="${t.n}"]`)?.scrollIntoView({ block: "start", behavior: "smooth" });
              }}
            >
              Tomo {doisDigitos(t.n)}
              <span className="ds-num">{FOLHAS.filter((f) => t.disciplinas.includes(f.disc)).length}</span>
            </button>
          ))}
          {situacao === "fora-da-divisao" && (
            <button
              type="button"
              role="tab"
              aria-selected={tomoAtivo === 0}
              className="mp-seg--resto"
              onClick={() => {
                setTomoAtivo(0);
                mapa.current?.querySelector(`[data-tomo="0"]`)?.scrollIntoView({ block: "start", behavior: "smooth" });
              }}
            >
              Fora da divisão <span className="ds-num">{RESTOS.length}</span>
            </button>
          )}
        </div>
        <span className="mp-divisao">dividido em 2 tomos, pelas disciplinas</span>
        <div className="mp-seg mp-seg--densidade" role="radiogroup" aria-label="Densidade">
          {DENSIDADES.map((d) => (
            <button key={d.n} type="button" role="radio" aria-checked={densidade === d.n} onClick={() => setDensidade(d.n)}>
              {densidade === d.n && <motion.i layoutId="mp-seg-fundo" className="mp-seg-fundo" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
              <span>{d.nome}</span>
              <Tecla>{d.n}</Tecla>
            </button>
          ))}
        </div>
      </div>
      {situacao === "lendo-selos" && (
        <div className="mp-progresso" aria-hidden>
          <motion.i animate={{ scaleX: lidas / FOLHAS.length }} transition={{ duration: 0.4 * k, ease: SUAVE }} />
        </div>
      )}

      <div className="mp-corpo">
        <div className={`mp-mapa${situacao === "vou-gerar" ? " mp-mapa--plano" : ""}`} ref={mapa}>
          {situacao === "desatualizado" && (
            <div className="mp-aviso">
              <i className="mp-m mp-m--aviso" />
              <p>
                <b>O volume do tomo 01 ficou velho.</b> Ele foi montado antes da correção da lista de documentos: o PDF que você baixou ainda tem a LD antiga.
              </p>
              <Botao variante="primary" tamanho="sm">
                Remontar e baixar
              </Botao>
            </div>
          )}

          {situacao === "fora-da-divisao" && (
            <div className="mp-aviso">
              <i className="mp-m mp-m--aviso" />
              <p>
                <b>2 documentos ficaram fora da divisão.</b> São de antes de a obra ser dividida em tomos e não entram em volume nenhum.
              </p>
              <Botao
                variante="ghost"
                tamanho="sm"
                onClick={() => {
                  setTomoAtivo(0);
                  mapa.current?.querySelector(`[data-tomo="0"]`)?.scrollIntoView({ block: "start", behavior: "smooth" });
                }}
              >
                Ver os 2
              </Botao>
            </div>
          )}

          {TOMOS.map((t) => (
            <section key={t.n} className="mp-tomo" data-tomo={t.n}>
              <header className="mp-tomo-cabeca">
                <h2>Tomo {doisDigitos(t.n)}</h2>
                <span>
                  {FOLHAS.filter((f) => t.disciplinas.includes(f.disc)).length} folhas, {t.paginas} páginas
                </span>
              </header>
              <div className="mp-docs">
                {documentosDoTomo(t).map((d) => (
                  <CartaoDoDocumento key={d.id} d={d} estado={estadoDoc(d)} />
                ))}
                <span className="mp-docs-seta" aria-hidden />
                <CartaoDoVolume tomo={t.n} paginas={t.paginas} estado={estadoVol(t.n)} />
              </div>
              {t.disciplinas.map((disc) => {
                const fs = FOLHAS.filter((f) => f.disc === disc);
                return (
                  <div key={disc} className="mp-grupo">
                    <p className="mp-grupo-cabeca">
                      <SeloDaDisciplina disc={disc} nome />
                      <span className="ds-num">{fs.length}</span>
                    </p>
                    <div className={`mp-folhas mp-folhas--d${densidade}`}>
                      {fs.map((f) => (
                        <CartaoDaFolha
                          key={f.id}
                          f={f}
                          densidade={densidade}
                          lida={(ordem.get(f.id) ?? 0) < lidas}
                          selecionada={sel === f.id}
                          apagada={!!filtro && !filtro.tem(f)}
                          onClick={() => {
                            setCorrigindo(false);
                            setSel(sel === f.id ? null : f.id);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>
          ))}

          {situacao === "fora-da-divisao" && (
            <section className="mp-tomo mp-tomo--resto" data-tomo={0}>
              <header className="mp-tomo-cabeca">
                <h2>Fora da divisão</h2>
                <span>gerados antes da divisão em tomos; não entram em volume nenhum</span>
                <Botao variante="ghost" tamanho="sm" className="mp-tomo-acao">
                  <Trash2 size={14} /> Excluir os 2
                </Botao>
              </header>
              <div className="mp-docs">
                {RESTOS.map((d) => (
                  <CartaoDoDocumento key={d.id} d={d} estado="gerado" />
                ))}
              </div>
            </section>
          )}
          <AnimatePresence>
            {situacao === "vou-gerar" && (
              <motion.div className="mp-plano" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: RITMO.entra * k, delay: 0.3 * k, ease: SUAVE }}>
                <div className="mp-plano-texto">
                  <p>
                    <b>Vou gerar, para cada um dos 2 tomos, a capa, a lista de documentos e as separatrizes.</b> Não usa IA: sai em segundos.
                  </p>
                  <p className="mp-plano-alerta">
                    <i className="mp-m mp-m--critico" /> A ELE-04 está sem número e entra no fim do Elétrico. Corrija antes se ela tiver lugar certo.
                  </p>
                </div>
                <Botao variante="quiet" tamanho="sm">
                  <MessageSquare size={14} /> Alterar no chat
                </Botao>
                <Botao variante="primary">
                  Confirmar e gerar <Tecla>↵</Tecla>
                </Botao>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <aside className="mp-insp" aria-label={folha ? `Folha ${folha.id}` : "Resumo da leitura"}>
          <div className="mp-insp-troca">
            <AnimatePresence initial={false}>
              <motion.div
                key={folha ? `${folha.id}-${corrigindo ? "c" : "v"}` : "resumo"}
                className="mp-insp-camada"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: RITMO.troca * k, ease: SUAVE }}
              >
                {folha ? (
                  <Inspetor f={folha} corrigindo={corrigindo} onCorrigir={setCorrigindo} onFechar={() => setSel(null)} onAndar={andar} />
                ) : (
                  <Resumo marca={marca} onMarca={setMarca} lidas={lidas} situacao={situacao} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </aside>
      </div>

    </div>
  );
}
