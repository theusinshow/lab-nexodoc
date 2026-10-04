"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronLeft, ChevronRight, Copy, Eye, FileText, Maximize2, Plus, Redo2, Search, Sparkles, Trash2, Undo2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import { RITMO, SUAVE } from "../conversa/turnos";
import { CartaoDaFolha } from "../mapa/cartoes";
import { PapelDoDocumento } from "../mapa/documentos";
import { ARQUIVOS, DADOS, FILA, PENDENCIAS, TIPOS, VOLUME, type TipoDoArquivo } from "./dados";
import "../mapa/mapa.css";
import "../mapa/cartoes.css";
import "../projetos/projetos.css";
import "./volumes.css";
import "./mesa.css";

export type SituacaoVolumes = "vazio" | "montando" | "selecao" | "conferencia" | "previa" | "exportando" | "falha-gravacao" | "recuperado";

const plural = (n: number, um: string, v: string) => `${n} ${n === 1 ? um : v}`;

/*
 * MONTAR VOLUMES — a mesa de hoje, organizada. Mesmas funções e mesmas
 * frases do modules/volume-builder: o tipo é escolhido ANTES de importar, a
 * montagem é manual (páginas → destino → "adicionar como"), a pré-montagem com
 * IA é um atalho opcional, os dados do volume ficam recolhidos num resumo.
 * Em 1440 px, como no app: Arquivos fixo à esquerda; Montagem ou Conferência
 * por aba à direita. O que mudou é a organização: cada área tem um título e
 * uma ação principal, o destino fica sempre visível no pé dos Arquivos, e os
 * campos de cada grupo só abrem quando se pede.
 */

/* ------------------------------ Arquivos ------------------------------ */

function Importar({ fila, aberta, onAlternar }: { fila: boolean; aberta: boolean; onAlternar: () => void }) {
  const { k } = useTempo();
  const [tipo, setTipo] = useState<TipoDoArquivo>("document");
  return (
    <section className="vx-bloco">
      <header className="vx-bloco-cabeca">
        <p>Importar</p>
        <button type="button" className="vx-link" onClick={onAlternar}>
          {aberta ? "Ocultar importação" : "Importar mais"}
        </button>
      </header>
      <AnimatePresence initial={false}>
        {aberta && (
          <motion.div className="vx-recolhe" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
            <p className="vx-ajuda">O tipo escolhido vale para os próximos PDFs; dá para trocar depois, arquivo por arquivo.</p>
            <div className="vx-tipos" role="radiogroup" aria-label="Tipo dos próximos PDFs importados">
              {TIPOS.map((t) => (
                <button key={t.id} type="button" role="radio" aria-checked={tipo === t.id} onClick={() => setTipo(t.id)}>
                  {t.nome}
                  <span className="ds-num">{ARQUIVOS.filter((a) => a.tipo === t.id).length}</span>
                </button>
              ))}
            </div>
            <label className="vl-importar vx-solta">
              <Upload size={16} />
              <span>
                <b>Solte os PDFs de {TIPOS.find((t) => t.id === tipo)!.nome.toLowerCase()} aqui</b>
                <small>ou clique para escolher</small>
              </span>
              <input type="file" accept="application/pdf" multiple hidden />
            </label>
            {fila && (
              <ul className="vx-fila" aria-label="Fila de importação">
                {FILA.map((f) => (
                  <li key={f.nome}>
                    <span className="mp-mono">{f.nome}</span>
                    {f.estado === "lendo" ? (
                      <span className="vm-lendo">{f.mensagem}</span>
                    ) : (
                      <span className="mp-conf mp-tom--aviso">
                        <i />
                        {f.mensagem}
                      </span>
                    )}
                    {f.estado !== "lendo" && (
                      <button type="button" aria-label={`Dispensar aviso de ${f.nome}`}>
                        <X size={12} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Biblioteca({ selecao, onSelecao, onAmpliar }: { selecao: string[]; onSelecao: (s: string[]) => void; onAmpliar: () => void }) {
  const { k } = useTempo();
  const [aberto, setAberto] = useState<string | null>(selecao.length ? "f5" : null);
  const alternar = (id: string) => onSelecao(selecao.includes(id) ? selecao.filter((x) => x !== id) : [...selecao, id]);
  return (
    <section className="vx-bloco vx-biblioteca">
      <header className="vx-bloco-cabeca">
        <p>Biblioteca</p>
        <span className="mp-g-fraco ds-num">{ARQUIVOS.reduce((s, a) => s + a.paginas, 0)} páginas</span>
      </header>
      <label className="mp-busca vx-busca">
        <Search size={14} />
        <input placeholder="Buscar arquivo, página, código ou texto" aria-label="Buscar páginas por arquivo, número, código ou texto" />
      </label>
      <div className="vx-filtros">
        <button type="button" className="vm-tipo">
          Disciplina: todas <ChevronDown size={12} />
        </button>
        <button type="button" className="vm-tipo">
          Bloco: todos <ChevronDown size={12} />
        </button>
      </div>
      <ul className="vx-arquivos">
        {ARQUIVOS.map((a) => {
          const ab = aberto === a.id;
          const ids = Array.from({ length: a.paginas }, (_, i) => `${a.id}:${i + 1}`);
          const todas = ids.every((id) => selecao.includes(id));
          return (
            <li key={a.id}>
              <div className="vx-arquivo">
                <button type="button" className="vx-arquivo-abre" onClick={() => setAberto(ab ? null : a.id)} aria-expanded={ab}>
                  <motion.span animate={{ rotate: ab ? 0 : -90 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }} className="vl-seta">
                    <ChevronDown size={13} />
                  </motion.span>
                  <span className="vx-arquivo-nome mp-mono">{a.nome}</span>
                </button>
                <button type="button" className="vm-tipo vx-tipo-do-arquivo" title="Trocar o tipo deste arquivo">
                  {TIPOS.find((t) => t.id === a.tipo)!.um} <ChevronDown size={11} />
                </button>
                <span className={`vx-uso ds-num${a.usadas === 0 ? " vx-uso--nada" : ""}`} title={a.usadas ? "páginas já na montagem" : "nenhuma página na montagem"}>
                  {a.usadas}/{a.paginas}
                </span>
              </div>
              <AnimatePresence initial={false}>
                {ab && (
                  <motion.div className="vx-paginas" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
                    <button type="button" className="vx-link vx-todas" onClick={() => onSelecao(todas ? selecao.filter((x) => !ids.includes(x)) : [...new Set([...selecao, ...ids])])}>
                      {todas ? "Desmarcar" : "Selecionar"} {a.paginas} pág.
                    </button>
                    <div className="vx-grade">
                      {ids.map((id, i) => {
                        const marcada = selecao.includes(id);
                        const f = a.folhas?.[i];
                        return (
                          <div key={id} className={`vl-pagina vx-pagina${marcada ? " vl-pagina--sel" : ""}`}>
                            <button type="button" className="vx-pagina-marcar" onClick={() => alternar(id)} aria-pressed={marcada} aria-label={`Selecionar página ${i + 1} de ${a.nome}`}>
                              <span className="vl-pagina-n ds-num">{i + 1}</span>
                              <span className="vl-pagina-titulo">{f ? f.id : TIPOS.find((t) => t.id === a.tipo)!.um}</span>
                            </button>
                            <button type="button" className="vx-ampliar" onClick={onAmpliar} aria-label={`Visualizar página ${i + 1} de ${a.nome}`}>
                              <Maximize2 size={10} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** O pé dos Arquivos: o destino escolhido e "adicionar como", sempre à vista. */
function Destino({ n }: { n: number }) {
  const { k } = useTempo();
  return (
    <section className={`vx-destino${n ? " vx-destino--ativo" : ""}`} aria-label="Destino das páginas">
      <p className="vx-destino-titulo">Destino</p>
      <div className="vx-destino-seletores">
        <button type="button" className="vm-tipo">
          Volume 01 <ChevronDown size={11} />
        </button>
        <button type="button" className="vm-tipo">
          Grupo 2 (Estrutural) <ChevronDown size={11} />
        </button>
        <button type="button" className="vm-tipo">
          Pranchas: no fim <ChevronDown size={11} />
        </button>
      </div>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.p key={n ? "com" : "sem"} className="vx-ajuda" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: RITMO.troca * k }}>
          {n ? `${plural(n, "página selecionada", "páginas selecionadas")} → adicionar como:` : "Selecione páginas na biblioteca (clique, ou Shift+clique para intervalo)."}
        </motion.p>
      </AnimatePresence>
      <div className="vx-como">
        {TIPOS.map((t) => (
          <button key={t.id} type="button" disabled={!n} className={n && t.id === "ld" ? "vx-como--sugerido" : undefined} title={n ? `Vai para Volume 01 › Grupo 2 (Estrutural)` : "Indisponível: selecione páginas"}>
            {t.um === "Prancha" ? "Pranchas" : t.um === "Anexo" ? "Anexos" : t.um}
          </button>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------ Montagem ------------------------------ */

function Lugar({ rotulo, children, vazio, acao }: { rotulo: string; children: ReactNode; vazio?: boolean; acao?: ReactNode }) {
  return (
    <div className={`vx-lugar${vazio ? " vx-lugar--vazio" : ""}`}>
      <span className="vx-lugar-rotulo">{rotulo}</span>
      <span className="vx-lugar-conteudo">{children}</span>
      <span className="vx-lugar-acao">{acao}</span>
    </div>
  );
}

function Icone({ rotulo, children, perigo }: { rotulo: string; children: ReactNode; perigo?: boolean }) {
  return (
    <button type="button" className={`vx-icone${perigo ? " vx-icone--perigo" : ""}`} aria-label={rotulo} title={rotulo}>
      {children}
    </button>
  );
}

function Grupo({ g, i, destino, selecao }: { g: (typeof VOLUME.grupos)[number]; i: number; destino: boolean; selecao: number }) {
  const { k } = useTempo();
  const [editando, setEditando] = useState(false);
  const [pranchas, setPranchas] = useState(false);
  return (
    <div className={`vx-grupo${destino ? " vx-grupo--destino" : ""}`}>
      <header className="vx-grupo-cabeca">
        <button type="button" className="vl-grupo-destino" aria-pressed={destino} title="Usar como destino das páginas">
          <i />
        </button>
        <span className="vx-grupo-nome">
          Grupo {i + 1} <b>{g.titulo}</b> <span className="mp-mono mp-g-fraco">{g.codigo}</span>
        </span>
        {destino && <span className="vx-destino-marca">destino</span>}
        <span className="vx-icones">
          <button type="button" className="vx-link" onClick={() => setEditando((e) => !e)}>
            {editando ? "Fechar campos" : "Campos"}
          </button>
          <Icone rotulo={`Mover Grupo ${i + 1} para cima`}>
            <ArrowUp size={13} />
          </Icone>
          <Icone rotulo={`Mover Grupo ${i + 1} para baixo`}>
            <ArrowDown size={13} />
          </Icone>
          <Icone rotulo={`Duplicar Grupo ${i + 1}`}>
            <Copy size={13} />
          </Icone>
          <Icone rotulo={`Remover Grupo ${i + 1}`} perigo>
            <Trash2 size={13} />
          </Icone>
        </span>
      </header>
      <AnimatePresence initial={false}>
        {editando && (
          <motion.div className="vx-recolhe" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
            <div className="vx-campos mp-form">
              <label>
                <span>Nome do grupo</span>
                <input defaultValue={g.titulo} />
              </label>
              <label>
                <span>Código</span>
                <input defaultValue={g.codigo} className="mp-mono" />
              </label>
              <label className="vx-campo-largo">
                <span>Título da separatriz automática</span>
                <input defaultValue={g.separatriz.automatica ? g.separatriz.titulo : ""} placeholder="PROJETO DE ESTRUTURAS" />
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Lugar
        rotulo="Separatriz"
        acao={
          <button type="button" className="vx-link" disabled={!selecao}>
            {selecao ? "Usar página selecionada" : "Usar PDF próprio"}
          </button>
        }
      >
        <span className="vm-auto">automática</span> {g.separatriz.automatica ? g.separatriz.titulo : ""}
      </Lugar>
      {g.ld ? (
        <Lugar rotulo="LD" acao={<button type="button" className="vx-link">Trocar</button>}>
          <span className="mp-mono vx-peca">
            {g.ld.arquivo}, {g.ld.paginas}
          </span>
        </Lugar>
      ) : (
        <Lugar
          rotulo="LD"
          vazio
          acao={
            selecao ? (
              <Botao variante="ghost" tamanho="sm">
                Colocar {plural(selecao, "página", "páginas")} aqui
              </Botao>
            ) : (
              <span className="mp-g-fraco">Selecione páginas</span>
            )
          }
        >
          <span className="vm-falta">sem LD</span>
        </Lugar>
      )}
      <Lugar
        rotulo="Pranchas"
        acao={
          <button type="button" className="vx-link" onClick={() => setPranchas((p) => !p)}>
            {pranchas ? "Recolher" : "Ordenar"}
          </button>
        }
      >
        <span className="vl-pranchas">
          {g.pranchas.folhas.map((f) => (
            <span key={f.id} className="vl-prancha mp-mono" title={`${f.id}: ${f.titulo}`}>
              {f.id.slice(-2)}
            </span>
          ))}
          <span className="mp-g-fraco vl-pranchas-de mp-mono">{g.pranchas.arquivo}</span>
        </span>
      </Lugar>
      <AnimatePresence initial={false}>
        {pranchas && (
          <motion.ol className="vx-ordem" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
            {g.pranchas.folhas.slice(0, 4).map((f, j) => (
              <li key={f.id}>
                <span className="ds-num mp-g-fraco">P{j + 1}</span>
                <span className="mp-mono">{f.id}</span>
                <span className="vx-ordem-titulo">{f.titulo}</span>
                <Icone rotulo={`Mover prancha ${j + 1} para antes`}>
                  <ArrowUp size={12} />
                </Icone>
                <Icone rotulo={`Mover prancha ${j + 1} para depois`}>
                  <ArrowDown size={12} />
                </Icone>
                <button type="button" className="vm-tipo">
                  Levar para outro grupo… <ChevronDown size={11} />
                </button>
              </li>
            ))}
            <li className="mp-g-fraco vx-ordem-mais">e mais {g.pranchas.folhas.length - 4}</li>
          </motion.ol>
        )}
      </AnimatePresence>
      <Lugar rotulo="Anexos" acao={selecao ? <span className="mp-g-fraco">—</span> : <span className="mp-g-fraco">Selecione páginas</span>}>
        <span className="mp-g-fraco">nenhum</span>
      </Lugar>
    </div>
  );
}

function PreMontagem({ aberta }: { aberta: boolean }) {
  const { k } = useTempo();
  const [ab, setAb] = useState(aberta);
  return (
    <section className="vx-ia">
      <button type="button" className="vx-ia-cabeca" onClick={() => setAb((a) => !a)} aria-expanded={ab}>
        <Sparkles size={14} />
        <span>Pré-montagem com IA</span>
        <span className="mp-g-fraco">opcional: sugere capa, LD, pranchas e separatrizes a partir das páginas</span>
        <motion.span animate={{ rotate: ab ? 180 : 0 }} transition={{ duration: RITMO.troca * k }} className="vx-ia-seta">
          <ChevronDown size={14} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {ab && (
          <motion.div className="vx-recolhe" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
            <div className="vx-ia-corpo">
              <dl className="vx-ia-metricas">
                {[
                  ["Capa", "1"],
                  ["LD", "1"],
                  ["Pranchas", "20"],
                  ["Separatriz", "Auto"],
                ].map(([r, v]) => (
                  <div key={r}>
                    <dt>{r}</dt>
                    <dd className="ds-num">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="vx-ajuda"><span className="vx-confianca">Média</span> confiança, pela leitura local das páginas.</p>
              <Botao variante="ghost" tamanho="sm">
                Aplicar esta sugestão
              </Botao>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Montagem({ vazio, selecao, onPrevia }: { vazio: boolean; selecao: number; onPrevia: () => void }) {
  if (vazio)
    return (
      <div className="vx-area">
        <div className="pj-sem vl-vazio">
          <p>Nenhum volume ainda.</p>
          <p className="mp-g-fraco">Use &quot;Adicionar volume&quot;. O volume nasce com um grupo e vira o destino das páginas selecionadas.</p>
          <div className="pj-vazio-acoes">
            <Botao variante="primary" tamanho="sm">
              <Plus size={14} /> Adicionar volume
            </Botao>
          </div>
        </div>
      </div>
    );
  return (
    <div className="vx-area">
      <p className="vx-ajuda vx-explica">Projeto → Volumes → Grupos (separatriz, LD, pranchas, anexos). A ordem na tela é a ordem do PDF.</p>
      <PreMontagem aberta={false} />
      <section className="vx-volume">
        <header className="vx-volume-cabeca">
          <span className="vx-volume-n mp-mono ds-num">01</span>
          <input className="vx-volume-titulo" defaultValue={VOLUME.titulo} aria-label="Título de Volume 01" />
          <span className="vl-estado">incompleto</span>
          <span className="mp-mono mp-g-fraco vx-pags">26 pág. no PDF</span>
          <span className="vx-icones">
            <button type="button" className="mp-acao vx-previa-btn" onClick={onPrevia}>
              <Eye size={14} /> Prévia
            </button>
            <Icone rotulo="Mover Volume 01 para cima">
              <ArrowUp size={13} />
            </Icone>
            <Icone rotulo="Mover Volume 01 para baixo">
              <ArrowDown size={13} />
            </Icone>
            <Icone rotulo="Duplicar Volume 01">
              <Copy size={13} />
            </Icone>
            <Icone rotulo="Remover Volume 01" perigo>
              <Trash2 size={13} />
            </Icone>
          </span>
        </header>
        <label className="vx-nome-final">
          <span>Nome final do PDF</span>
          <input className="mp-mono" defaultValue={VOLUME.arquivoFinal} placeholder="ex.: 106_25_vol_5_est.pdf" />
        </label>
        <div className="vx-volume-corpo">
          <Lugar rotulo="Capa" acao={<button type="button" className="vx-link">Trocar</button>}>
            <span className="mp-mono vx-peca">{VOLUME.capa}</span>
          </Lugar>
          {VOLUME.grupos.map((g, i) => (
            <Grupo key={g.id} g={g} i={i} destino={g.id === "g2"} selecao={selecao} />
          ))}
          <button type="button" className="mp-acao vx-mais">
            <Plus size={14} /> Adicionar grupo
          </button>
        </div>
      </section>
      <button type="button" className="mp-acao vx-mais">
        <Plus size={14} /> Adicionar volume
      </button>
    </div>
  );
}

/* ------------------------------ Conferência ------------------------------ */

function Conferencia({ estado, onPrevia }: { estado: "nao-conferida" | "valida" | "exportando" | "vazio"; onPrevia: () => void }) {
  const { k } = useTempo();
  const [feito, setFeito] = useState(0);
  useEffect(() => {
    if (estado !== "exportando" || feito >= 26) return;
    const t = setTimeout(() => setFeito((n) => n + 1), 140 * k);
    return () => clearTimeout(t);
  }, [estado, feito, k]);
  if (estado === "vazio")
    return (
      <div className="vx-area">
        <p className="mp-lado-sub">Crie um volume para começar.</p>
      </div>
    );
  const valida = estado !== "nao-conferida";
  return (
    <div className="vx-area vx-conferencia">
      <section className="vx-cartao">
        <header className="vx-cartao-cabeca">
          <p>Pendências da montagem</p>
          <span className="mp-g-fraco ds-num">{plural(PENDENCIAS.length, "aviso", "avisos")}, nenhum bloqueio</span>
        </header>
        <ul className="mp-lista mp-lista--docs vx-lista">
          {PENDENCIAS.map((p) => (
            <li key={p.id}>
              <span className="mp-lista-texto">
                <b className="vl-pendencia">
                  <i className={`vl-grav vl-grav--${p.gravidade}`} />
                  {p.texto}
                </b>
                <span>Aviso: não impede exportar.</span>
              </span>
              <button type="button" className="mp-lista-ver">
                Ir para
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="vx-cartao">
        <header className="vx-cartao-cabeca">
          <p>Conferência da montagem</p>
          <Botao variante="ghost" tamanho="sm">
            {valida ? "Conferir de novo" : "Conferir esta versão"}
          </Botao>
        </header>
        <p className={`vl-situacao vx-pad${valida ? " vl-situacao--ok" : ""}`}>{valida ? "Conferida às 17:58. Nenhum problema apontado." : "Esta montagem ainda não foi conferida."}</p>
      </section>

      <section className="vx-cartao">
        <header className="vx-cartao-cabeca">
          <p>Prévia e exportação</p>
          <span className="mp-g-fraco">PDF único</span>
        </header>
        <dl className="mp-campos vx-saida">
          {[
            ["Volumes", "1"],
            ["Páginas no total", "26"],
            ["Estrutura", "1 capa, 2 grupos, 2 separatrizes automáticas, 1 LD, 20 pranchas"],
            ["Conferência", valida ? "conferida" : "não conferida"],
          ].map(([r, v]) => (
            <div key={r} className="mp-campo">
              <dt>{r}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <div className="vx-pad vx-saida-acoes">
          <AnimatePresence initial={false} mode="popLayout">
            {estado === "exportando" ? (
              <motion.div key="exp" className="vl-exportando" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
                <p>
                  {feito < 26 ? "Gerando o PDF" : "PDF pronto"}
                  <span className="ds-num mp-g-fraco"> {Math.min(feito, 26)} de 26 páginas</span>
                </p>
                <div className="mp-barra-progresso">
                  <motion.i animate={{ scaleX: Math.min(feito, 26) / 26 }} transition={{ duration: 0.3 * k, ease: SUAVE }} />
                </div>
              </motion.div>
            ) : (
              <motion.div key="bot" className="vx-saida-botoes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Botao variante="primary">Gerar PDF</Botao>
                <Botao variante="quiet" onClick={onPrevia}>
                  <Eye size={14} /> Abrir prévia
                </Botao>
                <Botao variante="quiet">
                  <FileText size={14} /> Baixar relatório (.md)
                </Botao>
              </motion.div>
            )}
          </AnimatePresence>
          {!valida && <p className="vx-aviso-export">Esta versão não foi conferida. Exportar continua possível; conferir antes é o recomendado.</p>}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------ Prévia ------------------------------ */

function Previa({ onFechar }: { onFechar: () => void }) {
  const { k } = useTempo();
  const sequencia = useMemo(() => {
    const s: { rotulo: string; no: ReactNode }[] = [{ rotulo: "Capa", no: <PapelDoDocumento d={{ id: "c", tipo: "capa", nome: "Capa", detalhe: "" }} estado="gerado" tomo={1} distancia="media" /> }];
    for (const g of VOLUME.grupos) {
      s.push({ rotulo: `Separatriz ${g.codigo}`, no: <PapelDoDocumento d={{ id: `s${g.id}`, tipo: "separatriz", nome: "Separatriz", detalhe: "" }} estado="gerado" tomo={1} distancia="media" /> });
      if (g.ld) s.push({ rotulo: "LD", no: <PapelDoDocumento d={{ id: `l${g.id}`, tipo: "ld", nome: "LD", detalhe: "" }} estado="gerado" tomo={1} distancia="media" /> });
      for (const f of g.pranchas.folhas) s.push({ rotulo: f.id, no: <CartaoDaFolha f={f} estilo="carimbo" distancia="perto" /> });
    }
    return s;
  }, []);
  const [i, setI] = useState(0);
  const fita = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fita.current?.children[i]?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [i]);
  useEffect(() => {
    const t = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") (e.preventDefault(), setI((x) => Math.min(sequencia.length - 1, x + 1)));
      else if (e.key === "ArrowLeft") (e.preventDefault(), setI((x) => Math.max(0, x - 1)));
      else if (e.key === "Escape") (e.preventDefault(), onFechar());
    };
    document.addEventListener("keydown", t, true);
    return () => document.removeEventListener("keydown", t, true);
  }, [sequencia.length, onFechar]);
  return (
    <motion.div className="vl-previa" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
      <div className="vl-previa-cabeca">
        <span>
          Prévia de Volume 01 <span className="mp-mono mp-g-fraco">{VOLUME.arquivoFinal}</span>
        </span>
        <span className="ds-num mp-g-fraco">
          {i + 1} de {sequencia.length} peças, 26 páginas
        </span>
        <button type="button" className="vl-previa-fechar" onClick={onFechar} aria-label="Fechar a prévia (Esc)">
          <X size={16} />
        </button>
      </div>
      <div className="vl-previa-fita" ref={fita}>
        {sequencia.map((s, j) => (
          <button key={j} type="button" className={`vl-previa-item${i === j ? " vl-previa-item--atual" : ""}`} onClick={() => setI(j)}>
            {s.no}
            <span>{s.rotulo}</span>
          </button>
        ))}
      </div>
      <div className="vl-previa-pe">
        <button type="button" className="mp-acao" onClick={() => setI((x) => Math.max(0, x - 1))}>
          <ChevronLeft size={14} /> Anterior
        </button>
        <span className="mp-g-fraco">← → para andar, Esc para fechar</span>
        <button type="button" className="mp-acao" onClick={() => setI((x) => Math.min(sequencia.length - 1, x + 1))}>
          Próxima <ChevronRight size={14} />
        </button>
      </div>
    </motion.div>
  );
}

/* ------------------------------ a tela ------------------------------ */

export function TelaVolumes({ situacao }: { situacao: SituacaoVolumes }) {
  const { k } = useTempo();
  const vazio = situacao === "vazio";
  const [aba, setAba] = useState<"montagem" | "conferencia">(situacao === "conferencia" || situacao === "exportando" ? "conferencia" : "montagem");
  const [selecao, setSelecao] = useState<string[]>(situacao === "selecao" ? ["f5:1", "f5:2"] : []);
  const [importar, setImportar] = useState(vazio || situacao === "montando");
  const [dados, setDados] = useState(false);
  const [previa, setPrevia] = useState(situacao === "previa");
  const conferencia = vazio ? "vazio" : situacao === "exportando" ? "exportando" : situacao === "conferencia" ? "valida" : "nao-conferida";

  useEffect(() => {
    const t = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea") || previa) return;
      if (e.key === "Escape" && selecao.length) (e.preventDefault(), setSelecao([]));
    };
    document.addEventListener("keydown", t, true);
    return () => document.removeEventListener("keydown", t, true);
  });

  return (
    <div className="mp pj vl vx">
      <Topo atual={null} />
      <header className="mp-cabeca">
        <div>
          <p className="mp-trilha">
            <span>Juntar PDFs prontos em volumes, conferir e exportar</span>
          </p>
          <h1>Montar volumes</h1>
        </div>
        <Botao variante="quiet" tamanho="sm">
          Gerar a partir das pranchas
        </Botao>
      </header>

      <section className="mp-painel">
        {/* a barra da mesa: de qual obra, desfazer/refazer, onde está salvo, e os dados do volume */}
        <div className="vl-barra">
          <label className="vl-projeto">
            <span className="mp-g-fraco">Projeto</span>
            <button type="button" className="mp-divisao-tomos">
              {vazio ? (
                "Independente (sem projeto)"
              ) : (
                <>
                  <MarcaDaPrefeitura prefeitura="Criciúma" forma="sinal" />
                  <span className="mp-mono">117-25</span> UBS da Rua São Francisco de Assis
                </>
              )}
              <ChevronDown size={13} />
            </button>
          </label>
          <span className="vl-historico">
            <button type="button" aria-label="Desfazer: adicionar 8 páginas como Pranchas" disabled={vazio}>
              <Undo2 size={14} />
            </button>
            <button type="button" aria-label="Refazer (nada a refazer)" disabled>
              <Redo2 size={14} />
            </button>
          </span>
          <span className={`vl-rascunho${situacao === "falha-gravacao" ? " vl-rascunho--falha" : ""}`}>
            {situacao === "falha-gravacao" ? (
              <>
                <i /> O espaço de armazenamento deste navegador acabou. A montagem continua aberta nesta aba, mas não está salva.
              </>
            ) : vazio ? (
              "Modo independente: o rascunho fica neste dispositivo e exportar não registra nada em projeto."
            ) : (
              "Rascunho salvo só neste dispositivo. Ao exportar, os PDFs e o relatório entram no projeto."
            )}
          </span>
        </div>

        {!vazio && (
          <div className="vx-dados">
            <p>
              <span className="mp-g-fraco">Dados do volume</span>
              <span>
                <span className="mp-mono">{DADOS.projectCode}</span>, {DADOS.projectName}, vol. {DADOS.volume}, tomo {DADOS.tomo}, rev. {DADOS.revision}, {DADOS.date}
              </span>
            </p>
            <button type="button" className="vx-link" onClick={() => setDados((d) => !d)}>
              {dados ? "Fechar dados" : "Editar dados do volume"}
            </button>
          </div>
        )}
        <AnimatePresence initial={false}>
          {dados && (
            <motion.div className="vx-recolhe vx-dados-form" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
              <div className="mp-form vx-dados-campos">
                {[
                  ["Código", DADOS.projectCode, "Ex: 106_25"],
                  ["Projeto", DADOS.projectName, "Nome do projeto"],
                  ["Cliente", DADOS.client, "Nome do cliente"],
                  ["Cidade", DADOS.city, "Cidade"],
                  ["Volume", DADOS.volume, "Ex: 5"],
                  ["Tomo", DADOS.tomo, "Ex: 01"],
                  ["Revisão", DADOS.revision, "Ex: A"],
                  ["Data", DADOS.date, "Ex: 2026-06"],
                ].map(([r, v, ph]) => (
                  <label key={r}>
                    <span>{r}</span>
                    <input defaultValue={v} placeholder={ph} />
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {situacao === "recuperado" && (
            <motion.div className="vl-aviso" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <p>
                <b>Rascunho recuperado.</b> A montagem de hoje, 17:52, voltou deste dispositivo depois que a página recarregou.
              </p>
              <Botao variante="quiet" tamanho="sm">
                Começar do zero
              </Botao>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="vx-mesa">
          {/* ARQUIVOS: importar, biblioteca e, no pé, o destino */}
          <aside className="vx-arquivos-col" aria-label="Arquivos">
            <div className="vx-col-cabeca">
              <p className="vl-col-titulo">Arquivos</p>
              <span className="mp-g-fraco ds-num">{vazio ? "nenhum" : plural(ARQUIVOS.length, "PDF", "PDFs")}</span>
            </div>
            <div className="vx-arquivos-rolagem">
              <Importar fila={situacao === "montando"} aberta={importar} onAlternar={() => setImportar((a) => !a)} />
              {!vazio && <Biblioteca selecao={selecao} onSelecao={setSelecao} onAmpliar={() => {}} />}
            </div>
            {!vazio && <Destino n={selecao.length} />}
          </aside>

          {/* MONTAGEM ou CONFERÊNCIA, por aba */}
          <div className="vx-direita">
            <div className="mp-ferramentas vx-abas">
              <div className="mp-abas" role="tablist" aria-label="Áreas da mesa">
                {(
                  [
                    ["montagem", "Montagem"],
                    ["conferencia", "Conferência"],
                  ] as const
                ).map(([id, nome]) => (
                  <button key={id} type="button" role="tab" aria-selected={aba === id} onClick={() => setAba(id)}>
                    {nome}
                    {id === "conferencia" && !vazio && (
                      <span className="vx-aba-marca">
                        <i className="vl-grav vl-grav--aviso" /> 1
                      </span>
                    )}
                    {aba === id && <motion.i layoutId="vx-aba" className="mp-aba-marca" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
                  </button>
                ))}
              </div>
              {aba === "montagem" && !vazio && (
                <Botao variante="ghost" tamanho="sm">
                  <Plus size={14} /> Adicionar volume
                </Botao>
              )}
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={aba} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
                {aba === "montagem" ? <Montagem vazio={vazio} selecao={selecao.length} onPrevia={() => setPrevia(true)} /> : <Conferencia estado={conferencia} onPrevia={() => setPrevia(true)} />}
              </motion.div>
            </AnimatePresence>
            <AnimatePresence>{previa && <Previa onFechar={() => setPrevia(false)} />}</AnimatePresence>
          </div>
        </div>

        <footer className="mp-rodape">
          <span>
            <Tecla>Shift</Tecla> + clique: intervalo
          </span>
          <span>
            <Tecla>Esc</Tecla> limpar seleção
          </span>
          <span>
            <Tecla>Ctrl</Tecla>
            <Tecla>Z</Tecla> desfazer
          </span>
          <span className="mp-rodape-fim">{selecao.length ? plural(selecao.length, "página selecionada", "páginas selecionadas") : "arrastar páginas para a montagem também funciona"}</span>
        </footer>
      </section>
    </div>
  );
}
