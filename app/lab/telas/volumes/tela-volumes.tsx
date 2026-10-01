"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, FileText, GripVertical, Plus, Redo2, Undo2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import { RITMO, SUAVE } from "../conversa/turnos";
import { CartaoDaFolha } from "../mapa/cartoes";
import { PapelDoDocumento } from "../mapa/documentos";
import { ARQUIVOS, FILA, PENDENCIAS, TIPOS, VOLUME } from "./dados";
import "../mapa/mapa.css";
import "../mapa/cartoes.css";
import "../projetos/projetos.css";
import "../projeto/projeto.css";
import "./volumes.css";

export type SituacaoVolumes = "vazio" | "arquivos" | "montagem" | "escolher-paginas" | "conferir" | "exportando" | "falha-gravacao" | "recuperado";

type Etapa = 1 | 2 | 3;
const plural = (n: number, um: string, v: string) => `${n} ${n === 1 ? um : v}`;
const nomeDoTipo = (t: string) => TIPOS.find((x) => x.id === t)!.um;

/*
 * MONTAR VOLUMES, EM TRÊS ETAPAS. A versão anterior mostrava biblioteca,
 * montagem e conferência ao mesmo tempo, com seis ações disputando o olho, e
 * obrigava a montar à mão antes de qualquer coisa. Agora:
 *   1. Arquivos: importar e dizer o que cada PDF é.
 *   2. Montagem: o Nexo propõe a ordem pelos tipos; você corrige.
 *   3. Conferir e exportar: a prévia, as pendências e Gerar PDF.
 * Cada etapa tem UMA ação principal, no pé do lado direito. A biblioteca de
 * páginas só aparece quando é preciso escolher páginas.
 */

/* ------------------------------ etapa 1 ------------------------------ */

function Arquivos({ vazio, fila }: { vazio: boolean; fila: boolean }) {
  return (
    <div className="vm-principal">
      <label className={`vl-importar vm-importar${vazio ? " vl-importar--grande" : ""}`}>
        <Upload size={18} />
        <span>
          <b>{vazio ? "Solte aqui os PDFs do volume" : "Importar mais PDFs"}</b>
          <small>Capa, LD, pranchas e anexos. O Nexo lê o tipo de cada um; dá para trocar depois.</small>
        </span>
        <input type="file" accept="application/pdf" multiple hidden />
      </label>

      {!vazio && (
        <div className="mp-grade vm-grade-arquivos" role="grid">
          <div className="mp-g-cab" role="row">
            <span>#</span>
            <span>Arquivo</span>
            <span>É</span>
            <span>Páginas</span>
            <span>Situação</span>
          </div>
          {fila &&
            FILA.map((f, i) => (
              <div key={f.nome} role="row" className={`mp-g-linha vm-fila vm-fila--${f.estado}`}>
                <span className="mp-g-n ds-num">{i + 1}</span>
                <span className="mp-mono vm-nome">{f.nome}</span>
                <span className="mp-g-fraco">—</span>
                <span className="mp-g-fraco">—</span>
                <span className="vm-situacao">
                  {f.estado === "lendo" ? (
                    <span className="vm-lendo">{f.mensagem}</span>
                  ) : (
                    <span className="mp-conf mp-tom--aviso">
                      <i />
                      {f.mensagem}
                    </span>
                  )}
                  {f.estado !== "lendo" && (
                    <button type="button" aria-label={`Dispensar ${f.nome}`}>
                      <X size={12} />
                    </button>
                  )}
                </span>
              </div>
            ))}
          {ARQUIVOS.map((a, i) => (
            <div key={a.id} role="row" className="mp-g-linha">
              <span className="mp-g-n ds-num">{(fila ? FILA.length : 0) + i + 1}</span>
              <span className="mp-mono vm-nome">{a.nome}</span>
              <span>
                <button type="button" className="vm-tipo">
                  {nomeDoTipo(a.tipo)} <ChevronDown size={12} />
                </button>
              </span>
              <span className="mp-g-fraco ds-num">{a.paginas}</span>
              <span className="mp-g-fraco">{a.tipo === "document" ? `${a.folhas?.length} folhas lidas do carimbo` : "importado"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LadoArquivos({ vazio, onMontar }: { vazio: boolean; onMontar: () => void }) {
  if (vazio)
    return (
      <div className="mp-lado-bloco">
        <p className="mp-lado-titulo">Como funciona</p>
        <ol className="vm-passos">
          <li>
            <b>Arquivos.</b> Solte os PDFs prontos: capa, LD, pranchas, anexos.
          </li>
          <li>
            <b>Montagem.</b> O Nexo propõe a ordem do volume; você corrige o que precisar.
          </li>
          <li>
            <b>Conferir e exportar.</b> Veja a prévia, resolva as pendências e gere o PDF.
          </li>
        </ol>
        <p className="mp-lado-sub">Se as pranchas ainda não têm LD nem capa, é mais rápido gerar pelo Nexo e montar depois.</p>
      </div>
    );
  return (
    <div className="mp-lado-bloco">
      <div className="mp-lista-cabeca">
        <p className="mp-lado-titulo">O que o Nexo entendeu</p>
        <p className="mp-lado-sub">Pelos nomes e pelos carimbos. Se algum tipo estiver errado, troque na tabela.</p>
      </div>
      <dl className="mp-campos">
        {[
          ["Capa", "1, do tomo 01"],
          ["LD", "1, com 3 páginas"],
          ["Pranchas", "20 folhas, de ARQ e EST"],
          ["Anexos", "o memorial geral"],
          ["Separatrizes", "nenhuma: o Nexo cria uma por disciplina"],
        ].map(([r, v]) => (
          <div key={r} className="mp-campo">
            <dt>{r}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mp-lado-pe vm-pe">
        <Botao variante="primary" className="mp-gerar" onClick={onMontar}>
          Montar o volume <Tecla>↵</Tecla>
        </Botao>
        <button type="button" className="vm-secundaria">
          Prefiro montar à mão
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ etapa 2 ------------------------------ */

function Item({ ordem, tipo, children, origem, paginas, aviso, acao }: { ordem: string; tipo: string; children: ReactNode; origem?: string; paginas: number | null; aviso?: boolean; acao?: ReactNode }) {
  return (
    <div className={`vm-item${aviso ? " vm-item--aviso" : ""}`}>
      <span className="vm-alca" aria-hidden>
        {!aviso && <GripVertical size={14} />}
      </span>
      <span className="vm-ordem ds-num">{ordem}</span>
      <span className="vm-item-tipo">{tipo}</span>
      <span className="vm-item-conteudo">
        {children}
        {origem && <small className="mp-mono">{origem}</small>}
      </span>
      <span className="vm-item-n ds-num">{paginas == null ? "" : plural(paginas, "pág.", "págs.")}</span>
      <span className="vm-item-acao">{acao}</span>
    </div>
  );
}

function Montagem({ alvo, onEscolher }: { alvo: boolean; onEscolher: () => void }) {
  let p = 1;
  const de = (n: number) => {
    const t = `p. ${p}`;
    p += n;
    return t;
  };
  return (
    <div className="vm-principal">
      <div className="vm-volume-cabeca">
        <span className="vm-volume-nome">{VOLUME.nome}</span>
        <button type="button" className="vm-arquivo-final mp-mono" title="Nome do PDF final">
          {VOLUME.arquivoFinal}
        </button>
        <span className="mp-g-fraco vm-volume-n ds-num">26 páginas</span>
        <button type="button" className="mp-acao vm-mais-volume">
          <Plus size={14} /> Outro volume
        </button>
      </div>

      <div className="vm-lista">
        <Item ordem={de(1)} tipo="Capa" origem={VOLUME.capa.arquivo} paginas={1}>
          Capa do tomo 01
        </Item>
        {VOLUME.grupos.map((g) => (
          <section key={g.id} className="vm-secao">
            <p className="vm-secao-nome">
              {g.nome} <span className="mp-mono mp-g-fraco">{g.codigo}</span>
            </p>
            <Item ordem={de(1)} tipo="Separatriz" paginas={1}>
              <span className="vm-auto">criada pelo Nexo:</span> {g.separatriz}
            </Item>
            {g.ld ? (
              <Item ordem={de(g.ld.ate - g.ld.de + 1)} tipo="LD" origem={`${g.ld.arquivo}, p. ${g.ld.de}–${g.ld.ate}`} paginas={g.ld.ate - g.ld.de + 1}>
                Lista de documentos
              </Item>
            ) : (
              <Item
                ordem="—"
                tipo="LD"
                paginas={null}
                aviso
                acao={
                  <Botao variante="ghost" tamanho="sm" onClick={onEscolher} aria-pressed={alvo}>
                    Escolher a LD
                  </Botao>
                }
              >
                <span className="vm-falta">Falta a LD do {g.nome}.</span>
              </Item>
            )}
            <Item ordem={de(g.pranchas.folhas.length)} tipo="Pranchas" origem={g.pranchas.arquivo} paginas={g.pranchas.folhas.length}>
              <span className="vl-pranchas">
                {g.pranchas.folhas.map((f) => (
                  <span key={f.id} className="vl-prancha mp-mono" title={`${f.id}: ${f.titulo}`}>
                    {f.id.slice(-2)}
                  </span>
                ))}
              </span>
            </Item>
          </section>
        ))}
        <button type="button" className="mp-acao vm-mais">
          <Plus size={14} /> Adicionar páginas ou disciplina
        </button>
      </div>
    </div>
  );
}

function LadoMontagem({ onConferir }: { onConferir: () => void }) {
  return (
    <div className="mp-lado-bloco">
      <div className="mp-lista-cabeca">
        <p className="mp-lado-titulo">Montado pelo Nexo</p>
        <p className="mp-lado-sub">Na ordem de sempre: capa, e por disciplina a separatriz, a LD e as pranchas. Arraste pela alça para mudar a ordem.</p>
      </div>
      <ul className="mp-lista mp-lista--docs">
        {PENDENCIAS.map((p) => (
          <li key={p.id}>
            <span className="mp-lista-texto">
              <b className="vl-pendencia">
                <i className={`vl-grav vl-grav--${p.gravidade}`} />
                {p.texto}
              </b>
              <span>Dá para exportar assim, mas o volume sai sem a LD dessa disciplina.</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mp-lado-pe vm-pe">
        <Botao variante="primary" className="mp-gerar" onClick={onConferir}>
          Conferir <ArrowRight size={14} />
        </Botao>
      </div>
    </div>
  );
}

/** Escolher páginas: a biblioteca só aparece aqui, já filtrada para o que falta. */
function EscolherPaginas({ onFechar }: { onFechar: () => void }) {
  const ld = ARQUIVOS.find((a) => a.tipo === "ld")!;
  const [sel, setSel] = useState<number[]>([1, 2, 3]);
  return (
    <div className="mp-lado-bloco">
      <div className="vm-escolher-cabeca">
        <p className="mp-lado-titulo">Escolher a LD do Estrutural</p>
        <button type="button" className="vl-previa-fechar" onClick={onFechar} aria-label="Fechar (Esc)">
          <X size={15} />
        </button>
      </div>
      <p className="mp-lado-sub">Só os arquivos marcados como LD. Para usar outro, troque o tipo dele na etapa 1.</p>
      <div className="vm-escolher-arquivo">
        <p className="mp-mono">{ld.nome}</p>
        <div className="vm-paginas">
          {Array.from({ length: ld.paginas }, (_, i) => i + 1).map((n) => {
            const marcada = sel.includes(n);
            return (
              <button key={n} type="button" className={`vl-pagina${marcada ? " vl-pagina--sel" : ""}`} aria-pressed={marcada} onClick={() => setSel((s) => (marcada ? s.filter((x) => x !== n) : [...s, n]))}>
                <span className="vl-pagina-n ds-num">{n}</span>
                <span className="vl-pagina-titulo">LD</span>
              </button>
            );
          })}
        </div>
        <p className="mp-g-fraco vm-aviso-ld">Essas 3 páginas já são a LD do Arquitetura. Usar de novo repete a mesma lista nas duas disciplinas.</p>
      </div>
      <div className="mp-lado-pe vm-pe">
        <Botao variante="primary" className="mp-gerar" onClick={onFechar} disabled={!sel.length}>
          Usar {plural(sel.length, "página", "páginas")} <Tecla>↵</Tecla>
        </Botao>
        <button type="button" className="vm-secundaria" onClick={onFechar}>
          Deixar sem LD
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ etapa 3 ------------------------------ */

function Previa() {
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
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      if (e.key === "ArrowRight") (e.preventDefault(), setI((x) => Math.min(sequencia.length - 1, x + 1)));
      else if (e.key === "ArrowLeft") (e.preventDefault(), setI((x) => Math.max(0, x - 1)));
    };
    document.addEventListener("keydown", t, true);
    return () => document.removeEventListener("keydown", t, true);
  }, [sequencia.length]);
  return (
    <div className="vm-principal vm-previa">
      <div className="vm-previa-cabeca">
        <span>
          Prévia do {VOLUME.nome} <span className="mp-mono mp-g-fraco">{VOLUME.arquivoFinal}</span>
        </span>
        <span className="vm-previa-nav">
          <button type="button" onClick={() => setI((x) => Math.max(0, x - 1))} aria-label="Peça anterior (←)">
            <ChevronLeft size={15} />
          </button>
          <span className="ds-num mp-g-fraco">
            {i + 1} de {sequencia.length}
          </span>
          <button type="button" onClick={() => setI((x) => Math.min(sequencia.length - 1, x + 1))} aria-label="Próxima peça (→)">
            <ChevronRight size={15} />
          </button>
        </span>
      </div>
      <div className="vl-previa-fita vm-fita" ref={fita}>
        {sequencia.map((s, j) => (
          <button key={j} type="button" className={`vl-previa-item${i === j ? " vl-previa-item--atual" : ""}`} onClick={() => setI(j)}>
            {s.no}
            <span>{s.rotulo}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LadoConferir({ estado, onVoltar }: { estado: "conferir" | "exportando"; onVoltar: () => void }) {
  const { k } = useTempo();
  const [feito, setFeito] = useState(0);
  useEffect(() => {
    if (estado !== "exportando" || feito >= 26) return;
    const t = setTimeout(() => setFeito((n) => n + 1), 140 * k);
    return () => clearTimeout(t);
  }, [estado, feito, k]);
  return (
    <div className="mp-lado-bloco">
      <div className="mp-lista-cabeca">
        <p className="mp-lado-titulo">Antes de exportar</p>
        <p className="mp-lado-sub vm-ok">Conferido às 17:58: nada impede exportar.</p>
      </div>
      <ul className="mp-lista mp-lista--docs">
        {PENDENCIAS.map((p) => (
          <li key={p.id}>
            <span className="mp-lista-texto">
              <b className="vl-pendencia">
                <i className={`vl-grav vl-grav--${p.gravidade}`} />
                {p.texto}
              </b>
              <span>Aviso: dá para exportar assim.</span>
            </span>
            <button type="button" className="mp-lista-ver" onClick={onVoltar}>
              Resolver
            </button>
          </li>
        ))}
      </ul>
      <dl className="mp-campos">
        <div className="mp-campo">
          <dt>Sai como</dt>
          <dd>
            1 PDF, 26 páginas<small className="mp-mono">{VOLUME.arquivoFinal}</small>
          </dd>
        </div>
        <div className="mp-campo">
          <dt>Vai para</dt>
          <dd>a obra 117-25, com o relatório</dd>
        </div>
      </dl>
      <div className="mp-lado-pe vm-pe">
        <AnimatePresence initial={false} mode="popLayout">
          {estado === "exportando" ? (
            <motion.div key="exp" className="vl-exportando" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
              <p>
                {feito < 26 ? "Juntando as páginas" : "Volume 01 pronto"}
                <span className="ds-num mp-g-fraco"> {Math.min(feito, 26)} de 26</span>
              </p>
              <div className="mp-barra-progresso">
                <motion.i animate={{ scaleX: Math.min(feito, 26) / 26 }} transition={{ duration: 0.3 * k, ease: SUAVE }} />
              </div>
            </motion.div>
          ) : (
            <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Botao variante="primary" className="mp-gerar">
                Gerar PDF <Tecla>↵</Tecla>
              </Botao>
            </motion.div>
          )}
        </AnimatePresence>
        <button type="button" className="vm-secundaria">
          <FileText size={13} /> Baixar só o relatório (.md)
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ a tela ------------------------------ */

export function TelaVolumes({ situacao }: { situacao: SituacaoVolumes }) {
  const { k } = useTempo();
  const vazio = situacao === "vazio";
  const inicial: Etapa = vazio || situacao === "arquivos" ? 1 : situacao === "conferir" || situacao === "exportando" ? 3 : 2;
  const [etapa, setEtapa] = useState<Etapa>(inicial);
  const [escolhendo, setEscolhendo] = useState(situacao === "escolher-paginas");

  useEffect(() => {
    const t = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      if (e.key === "Escape" && escolhendo) (e.preventDefault(), setEscolhendo(false));
      else if (["1", "2", "3"].includes(e.key) && !vazio) setEtapa(Number(e.key) as Etapa);
    };
    document.addEventListener("keydown", t, true);
    return () => document.removeEventListener("keydown", t, true);
  });

  const ETAPAS: { n: Etapa; nome: string; valor: string; sub: string; aviso?: boolean }[] = [
    { n: 1, nome: "Arquivos", valor: vazio ? "nenhum" : "5 PDFs", sub: vazio ? "comece por aqui" : "64 páginas, tipos lidos" },
    { n: 2, nome: "Montagem", valor: vazio ? "—" : "26 páginas", sub: vazio ? "depois dos arquivos" : "1 volume, 2 disciplinas" },
    { n: 3, nome: "Conferir e exportar", valor: vazio ? "—" : "1 aviso", sub: vazio ? "por último" : "nada impede exportar", aviso: !vazio },
  ];

  const chaveDoLado = escolhendo ? "escolher" : `etapa-${etapa}`;

  return (
    <div className="mp pj vl vm">
      <Topo atual="Montar volumes" />
      <header className="mp-cabeca">
        <div>
          <p className="mp-trilha">
            {vazio ? (
              <span>Juntar PDFs prontos num volume, conferir e exportar</span>
            ) : (
              <>
                <MarcaDaPrefeitura prefeitura="Criciúma" forma="sinal" />
                <span className="mp-mono">117-25</span>
                <span>UBS da Rua São Francisco de Assis</span>
                <button type="button" className="vm-trocar">
                  trocar
                </button>
              </>
            )}
          </p>
          <h1>Montar volumes</h1>
        </div>
        <span className={`vl-rascunho${situacao === "falha-gravacao" ? " vl-rascunho--falha" : ""}`}>
          {situacao === "falha-gravacao" ? (
            <>
              <i /> Não está salvo: o armazenamento deste navegador acabou. A montagem continua nesta aba.
              <button type="button" className="mp-lista-ver">
                Tentar de novo
              </button>
            </>
          ) : vazio ? null : (
            "Rascunho salvo neste dispositivo, 17:52"
          )}
          {!vazio && (
            <span className="vl-historico">
              <button type="button" aria-label="Desfazer (Ctrl+Z)">
                <Undo2 size={14} />
              </button>
              <button type="button" aria-label="Refazer" disabled>
                <Redo2 size={14} />
              </button>
            </span>
          )}
        </span>
      </header>

      <section className="mp-painel">
        <div className="mp-tiles vm-etapas" role="tablist" aria-label="Etapas">
          {ETAPAS.map((e) => {
            const feita = e.n < etapa;
            return (
              <button key={e.n} type="button" role="tab" aria-selected={etapa === e.n} disabled={vazio && e.n > 1} className="mp-tile vm-etapa" onClick={() => (setEtapa(e.n), setEscolhendo(false))}>
                <span className="mp-tile-rotulo vm-etapa-rotulo">
                  <span className={`vm-etapa-n${feita ? " vm-etapa-n--feita" : ""}`}>{feita ? "✓" : e.n}</span>
                  {e.nome}
                </span>
                <span className={`pr-tarefa-estado vm-etapa-valor${e.aviso ? " mp-tom--aviso-texto" : ""}`}>{e.valor}</span>
                <span className="mp-tile-sub">{e.sub}</span>
                {etapa === e.n && <motion.i layoutId="vm-etapa-marca" className="mp-tile-marca" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
              </button>
            );
          })}
        </div>

        <AnimatePresence initial={false}>
          {situacao === "recuperado" && (
            <motion.div className="vl-aviso" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <p>
                <b>A montagem voltou.</b> O rascunho deste dispositivo, de hoje às 17:52, foi recuperado depois que a página recarregou.
              </p>
              <Botao variante="quiet" tamanho="sm">
                Começar do zero
              </Botao>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mp-miolo vm-miolo">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={etapa} className="vm-area" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
              {etapa === 1 ? <Arquivos vazio={vazio} fila={situacao === "arquivos"} /> : etapa === 2 ? <Montagem alvo={escolhendo} onEscolher={() => setEscolhendo(true)} /> : <Previa />}
            </motion.div>
          </AnimatePresence>

          <aside className="mp-lado">
            <div className="mp-lado-troca">
              <AnimatePresence initial={false}>
                <motion.div key={chaveDoLado} className="mp-lado-camada" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
                  {escolhendo ? (
                    <EscolherPaginas onFechar={() => setEscolhendo(false)} />
                  ) : etapa === 1 ? (
                    <LadoArquivos vazio={vazio} onMontar={() => setEtapa(2)} />
                  ) : etapa === 2 ? (
                    <LadoMontagem onConferir={() => setEtapa(3)} />
                  ) : (
                    <LadoConferir estado={situacao === "exportando" ? "exportando" : "conferir"} onVoltar={() => setEtapa(2)} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </aside>
        </div>

        <footer className="mp-rodape">
          <span>
            <Tecla>1</Tecla>
            <Tecla>3</Tecla> etapas
          </span>
          <span>
            <Tecla>↵</Tecla> ação da etapa
          </span>
          {etapa === 3 && (
            <span>
              <Tecla>←</Tecla>
              <Tecla>→</Tecla> prévia
            </span>
          )}
          <span>
            <Tecla>Ctrl</Tecla>
            <Tecla>Z</Tecla> desfazer
          </span>
          <span className="mp-rodape-fim">
            etapa {etapa} de 3: {ETAPAS[etapa - 1].nome.toLowerCase()}
          </span>
        </footer>
      </section>
    </div>
  );
}
