"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronLeft, ChevronRight, Copy, Eye, FileText, FolderOpen, Plus, Redo2, Search, Sparkles, Trash2, Undo2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import { RITMO, SUAVE } from "../conversa/turnos";
import { CartaoDaFolha } from "../mapa/cartoes";
import { PapelDoDocumento } from "../mapa/documentos";
import { ARQUIVOS, FILA, PENDENCIAS, TIPOS, VOLUME, type Arquivo, type TipoDoArquivo } from "./dados";
import "../mapa/mapa.css";
import "../mapa/cartoes.css";
import "../projetos/projetos.css";
import "./volumes.css";

export type SituacaoVolumes = "vazio" | "montando" | "selecao" | "conferencia" | "previa" | "exportando" | "falha-gravacao" | "recuperado";

const plural = (n: number, um: string, v: string) => `${n} ${n === 1 ? um : v}`;

/* ------------------------------------------------------------------ */
/* Biblioteca: o que foi importado, e as páginas para escolher.         */
/* ------------------------------------------------------------------ */

function Biblioteca({ vazio, fila, selecao, onSelecao }: { vazio: boolean; fila: boolean; selecao: string[]; onSelecao: (s: string[]) => void }) {
  const { k } = useTempo();
  const [tipo, setTipo] = useState<TipoDoArquivo | "todos">("todos");
  const [aberto, setAberto] = useState<string | null>(selecao.length ? "f2" : "f3");
  const arquivos = vazio ? [] : ARQUIVOS.filter((a) => tipo === "todos" || a.tipo === tipo);
  const usadas = new Set(["f3", "f4", "f1", "f2"]);
  const alternar = (id: string) => onSelecao(selecao.includes(id) ? selecao.filter((x) => x !== id) : [...selecao, id]);

  return (
    <div className="vl-col vl-biblioteca">
      <div className="vl-col-cabeca">
        <p className="vl-col-titulo">Biblioteca</p>
        <span className="mp-g-fraco ds-num">{vazio ? "vazia" : plural(ARQUIVOS.length, "arquivo", "arquivos")}</span>
      </div>

      <label className={`vl-importar${vazio ? " vl-importar--grande" : ""}`}>
        <Upload size={16} />
        <span>
          <b>Importar PDFs</b>
          <small>ou solte aqui. O tipo dá para trocar depois.</small>
        </span>
        <input type="file" accept="application/pdf" multiple hidden />
      </label>

      {fila && (
        <ul className="vl-fila" aria-label="Fila de importação">
          {FILA.map((f) => (
            <li key={f.nome} className={`vl-fila--${f.estado}`}>
              <span className="mp-mono">{f.nome}</span>
              <span>{f.mensagem}</span>
              {f.estado !== "lendo" && (
                <button type="button" aria-label={`Dispensar aviso de ${f.nome}`}>
                  <X size={12} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!vazio && (
        <>
          <div className="vl-tipos" role="tablist" aria-label="Tipo">
            {[{ id: "todos" as const, nome: "Todos" }, ...TIPOS].map((t) => {
              const n = t.id === "todos" ? ARQUIVOS.length : ARQUIVOS.filter((a) => a.tipo === t.id).length;
              if (!n) return null;
              return (
                <button key={t.id} type="button" role="tab" aria-selected={tipo === t.id} onClick={() => setTipo(t.id)}>
                  {t.nome} <span className="ds-num">{n}</span>
                </button>
              );
            })}
          </div>
          <label className="mp-busca vl-busca">
            <Search size={14} />
            <input placeholder="Arquivo, página, código ou texto" aria-label="Buscar páginas" />
          </label>
          <ul className="vl-arquivos">
            {arquivos.map((a: Arquivo) => {
              const ab = aberto === a.id;
              return (
                <li key={a.id} className={ab ? "vl-arquivo--aberto" : undefined}>
                  <button type="button" className="vl-arquivo" onClick={() => setAberto(ab ? null : a.id)} aria-expanded={ab}>
                    <motion.span animate={{ rotate: ab ? 0 : -90 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }} className="vl-seta">
                      <ChevronDown size={13} />
                    </motion.span>
                    <span className="vl-arquivo-nome mp-mono">{a.nome}</span>
                    <span className="vl-arquivo-tipo">{TIPOS.find((t) => t.id === a.tipo)!.um}</span>
                    <span className="mp-g-fraco ds-num">{a.paginas} p.</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {ab && (
                      <motion.div className="vl-paginas" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
                        <div className="vl-paginas-grade">
                          {Array.from({ length: Math.min(a.paginas, 12) }, (_, i) => {
                            const id = `${a.id}:${i + 1}`;
                            const f = a.folhas?.[i];
                            const marcada = selecao.includes(id);
                            return (
                              <button key={id} type="button" className={`vl-pagina${marcada ? " vl-pagina--sel" : ""}`} onClick={() => alternar(id)} aria-pressed={marcada} aria-label={`Página ${i + 1} de ${a.nome}`}>
                                <span className="vl-pagina-n ds-num">{i + 1}</span>
                                <span className="vl-pagina-titulo">{f ? f.id : a.tipo === "appendix" ? "texto" : TIPOS.find((t) => t.id === a.tipo)!.um}</span>
                                {usadas.has(a.id) && <i className="vl-usada" title="Já está na montagem" />}
                              </button>
                            );
                          })}
                        </div>
                        {a.paginas > 12 && <p className="mp-g-fraco vl-mais">e mais {a.paginas - 12} páginas</p>}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Montagem: volume → grupos, na ordem do PDF, com as páginas contadas. */
/* ------------------------------------------------------------------ */

function Linha({ paginas, rotulo, children, vazio, alvo }: { paginas: string; rotulo: string; children: ReactNode; vazio?: boolean; alvo?: boolean }) {
  return (
    <div className={`vl-linha${vazio ? " vl-linha--vazia" : ""}${alvo ? " vl-linha--alvo" : ""}`}>
      <span className="vl-linha-p ds-num">{paginas}</span>
      <span className="vl-linha-rotulo">{rotulo}</span>
      <div className="vl-linha-conteudo">{children}</div>
    </div>
  );
}

function Montagem({ vazio, destino, selecao, onDestino }: { vazio: boolean; destino: string; selecao: number; onDestino: (g: string) => void }) {
  const { k } = useTempo();
  if (vazio)
    return (
      <div className="vl-col vl-montagem">
        <div className="vl-col-cabeca">
          <p className="vl-col-titulo">Montagem</p>
        </div>
        <div className="pj-sem vl-vazio">
          <p>Nenhum volume ainda.</p>
          <p className="mp-g-fraco">Importe os PDFs à esquerda e crie o volume: ele nasce com um grupo e vira o destino das páginas que você escolher.</p>
          <div className="pj-vazio-acoes">
            <Botao variante="ghost" tamanho="sm">
              <Plus size={14} /> Adicionar volume
            </Botao>
          </div>
        </div>
      </div>
    );

  let p = 1;
  const faixa = (n: number) => {
    const t = n === 1 ? `${p}` : `${p}–${p + n - 1}`;
    p += n;
    return t;
  };
  const grupoAlvo = VOLUME.grupos.find((g) => g.id === destino)!;

  return (
    <div className="vl-col vl-montagem">
      <div className="vl-col-cabeca">
        <p className="vl-col-titulo">Montagem</p>
        <span className="mp-g-fraco">a ordem aqui é a ordem do PDF</span>
      </div>

      <div className={`vl-destino${selecao ? " vl-destino--ativo" : ""}`}>
        <AnimatePresence initial={false} mode="popLayout">
          {selecao ? (
            <motion.div key="sel" className="vl-destino-linha" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
              <span>
                <b className="ds-num">{plural(selecao, "página escolhida", "páginas escolhidas")}</b> vão para {VOLUME.nome} › {grupoAlvo.nome}
              </span>
              <span className="vl-destino-acoes">
                <button type="button" className="vl-como">
                  como LD <ChevronDown size={12} />
                </button>
                <Botao variante="primary" tamanho="sm">
                  Adicionar <Tecla>↵</Tecla>
                </Botao>
              </span>
            </motion.div>
          ) : (
            <motion.p key="sem" className="vl-destino-linha mp-g-fraco" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: RITMO.troca * k }}>
              Destino: {VOLUME.nome} › {grupoAlvo.nome}, no fim. Escolha páginas na biblioteca (Shift+clique para um intervalo).
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <section className="vl-volume">
        <header className="vl-volume-cabeca">
          <span className="vl-volume-nome">{VOLUME.nome}</span>
          <span className="mp-mono mp-g-fraco">{VOLUME.arquivoFinal}</span>
          <span className="vl-estado">incompleto</span>
          <span className="vl-acoes-icone">
            <button type="button" aria-label="Prévia do PDF de Volume 01">
              <Eye size={14} />
            </button>
            <button type="button" aria-label="Duplicar Volume 01">
              <Copy size={14} />
            </button>
            <button type="button" aria-label="Remover Volume 01">
              <Trash2 size={14} />
            </button>
          </span>
        </header>

        <Linha paginas={faixa(1)} rotulo="Capa">
          <span className="vl-peca mp-mono">{VOLUME.capa.arquivo}</span>
        </Linha>

        {VOLUME.grupos.map((g) => {
          const alvo = g.id === destino;
          return (
            <div key={g.id} className={`vl-grupo${alvo ? " vl-grupo--alvo" : ""}`}>
              <div className="vl-grupo-cabeca">
                <button type="button" className="vl-grupo-destino" aria-pressed={alvo} onClick={() => onDestino(g.id)} title="Usar como destino das páginas">
                  <i />
                </button>
                <span className="vl-grupo-nome">{g.nome}</span>
                <span className="mp-mono mp-g-fraco">{g.codigo}</span>
                {alvo && <span className="vl-destino-marca">destino</span>}
              </div>
              <Linha paginas={faixa(1)} rotulo="Separatriz">
                <span className="vl-auto">automática</span> <span className="vl-separatriz">{g.separatriz}</span>
              </Linha>
              {g.ld ? (
                <Linha paginas={faixa(g.ld.ate - g.ld.de + 1)} rotulo="LD">
                  <span className="vl-peca mp-mono">
                    {g.ld.arquivo}, p. {g.ld.de}–{g.ld.ate}
                  </span>
                </Linha>
              ) : (
                <Linha paginas="—" rotulo="LD" vazio alvo={alvo && selecao > 0}>
                  <span className="vl-falta">Sem LD. Escolha a página na biblioteca e adicione aqui.</span>
                </Linha>
              )}
              <Linha paginas={faixa(g.pranchas.folhas.length)} rotulo="Pranchas">
                <div className="vl-pranchas">
                  {g.pranchas.folhas.map((f) => (
                    <span key={f.id} className="vl-prancha mp-mono" title={f.titulo}>
                      {f.id.slice(-2)}
                    </span>
                  ))}
                  <span className="mp-g-fraco vl-pranchas-de mp-mono">{g.pranchas.arquivo}</span>
                </div>
              </Linha>
            </div>
          );
        })}

        <div className="vl-volume-pe">
          <button type="button" className="mp-acao">
            <Plus size={14} /> Adicionar grupo
          </button>
          <span className="mp-g-fraco ds-num">{p - 1} páginas</span>
        </div>
      </section>

      <button type="button" className="mp-acao vl-novo-volume">
        <Plus size={14} /> Adicionar volume
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Conferência e saída.                                                */
/* ------------------------------------------------------------------ */

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
      <div className="vl-col vl-conferencia">
        <div className="vl-col-cabeca">
          <p className="vl-col-titulo">Conferência</p>
        </div>
        <p className="mp-lado-sub vl-pad">Crie um volume para começar. As pendências aparecem aqui conforme a montagem cresce.</p>
      </div>
    );

  const valida = estado !== "nao-conferida";
  return (
    <div className="vl-col vl-conferencia">
      <div className="vl-col-cabeca">
        <p className="vl-col-titulo">Conferência</p>
        <span className="mp-g-fraco ds-num">{plural(PENDENCIAS.length, "pendência", "pendências")}</span>
      </div>
      <ul className="mp-lista mp-lista--docs vl-pendencias">
        {PENDENCIAS.map((p) => (
          <li key={p.id}>
            <span className="mp-lista-texto">
              <b className="vl-pendencia">
                <i className={`vl-grav vl-grav--${p.gravidade}`} />
                {p.texto}
              </b>
              <span>{p.gravidade === "bloqueio" ? "Impede exportar." : "Aviso: dá para exportar assim."}</span>
            </span>
            <button type="button" className="mp-lista-ver">
              Ir para
            </button>
          </li>
        ))}
      </ul>

      <div className="vl-pad vl-conferir">
        <p className={`vl-situacao${valida ? " vl-situacao--ok" : ""}`}>
          {valida ? "Esta versão foi conferida às 17:58. Nenhum bloqueio." : "Esta montagem ainda não foi conferida."}
        </p>
        <Botao variante="ghost" tamanho="sm">
          {valida ? "Conferir de novo" : "Conferir esta versão"}
        </Botao>
      </div>

      <dl className="mp-campos vl-saida">
        <div className="mp-campo">
          <dt>Volumes</dt>
          <dd>1</dd>
        </div>
        <div className="mp-campo">
          <dt>Páginas</dt>
          <dd>26</dd>
        </div>
        <div className="mp-campo">
          <dt>Sai como</dt>
          <dd>
            PDF único<small className="mp-mono">{VOLUME.arquivoFinal}</small>
          </dd>
        </div>
      </dl>

      <div className="vl-pad vl-botoes">
        <AnimatePresence initial={false} mode="popLayout">
          {estado === "exportando" ? (
            <motion.div key="exp" className="vl-exportando" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
              <p>
                {feito < 26 ? "Juntando as páginas do Volume 01" : "Volume 01 pronto"}
                <span className="ds-num mp-g-fraco"> {Math.min(feito, 26)} de 26</span>
              </p>
              <div className="mp-barra-progresso">
                <motion.i animate={{ scaleX: Math.min(feito, 26) / 26 }} transition={{ duration: 0.3 * k, ease: SUAVE }} />
              </div>
            </motion.div>
          ) : (
            <motion.div key="bot" className="vl-botoes-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Botao variante={valida ? "primary" : "ghost"} className="mp-gerar">
                Gerar PDF
              </Botao>
              {!valida && <p className="mp-lado-sub">Esta versão não foi conferida. Exportar continua possível; conferir antes é o recomendado.</p>}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="mp-acoes">
          <button type="button" className="mp-acao" onClick={onPrevia}>
            <Eye size={14} /> Abrir prévia <Tecla>P</Tecla>
          </button>
          <button type="button" className="mp-acao">
            <FileText size={14} /> Baixar relatório (.md)
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Prévia: o volume na ordem, página a página, com as peças do Mapa.    */
/* ------------------------------------------------------------------ */

function Previa({ onFechar }: { onFechar: () => void }) {
  const { k } = useTempo();
  const sequencia = useMemo(() => {
    const s: { rotulo: string; no: ReactNode }[] = [];
    s.push({ rotulo: "Capa", no: <PapelDoDocumento d={{ id: "c", tipo: "capa", nome: "Capa", detalhe: "" }} estado="gerado" tomo={1} distancia="media" /> });
    for (const g of VOLUME.grupos) {
      s.push({ rotulo: `Separatriz ${g.codigo}`, no: <PapelDoDocumento d={{ id: `s${g.id}`, tipo: "separatriz", nome: "Separatriz", detalhe: "" }} estado="gerado" tomo={1} distancia="media" /> });
      if (g.ld) s.push({ rotulo: "LD", no: <PapelDoDocumento d={{ id: `l${g.id}`, tipo: "ld", nome: "LD", detalhe: "" }} estado="gerado" tomo={1} distancia="media" /> });
      for (const f of g.pranchas.folhas) s.push({ rotulo: f.id, no: <CartaoDaFolha f={f} estilo="carimbo" distancia="perto" /> });
    }
    return s;
  }, []);
  const [i, setI] = useState(0);
  const fita = useRef<HTMLDivElement>(null);
  // A peça atual sempre à vista na fita.
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
          Prévia do {VOLUME.nome} <span className="mp-mono mp-g-fraco">{VOLUME.arquivoFinal}</span>
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

/**
 * MONTAR VOLUMES. A mesa manual com PDFs prontos, na língua das telas
 * aprovadas: um painel com três colunas (biblioteca, montagem, conferência).
 * Em cima, de qual obra é a montagem, desfazer/refazer e onde o rascunho
 * está salvo. A prévia mostra o volume com as mesmas peças do Mapa.
 */
export function TelaVolumes({ situacao }: { situacao: SituacaoVolumes }) {
  const vazio = situacao === "vazio";
  const [selecao, setSelecao] = useState<string[]>(situacao === "selecao" ? ["f2:1", "f2:2", "f2:3"] : []);
  const [destino, setDestino] = useState("g2");
  const [previa, setPrevia] = useState(situacao === "previa");
  const conferencia = vazio ? "vazio" : situacao === "exportando" ? "exportando" : situacao === "conferencia" ? "valida" : "nao-conferida";

  useEffect(() => {
    const t = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (alvo.closest("input, textarea") || previa) return;
      if ((e.key === "p" || e.key === "P") && !vazio) (e.preventDefault(), setPrevia(true));
      else if (e.key === "Escape" && selecao.length) (e.preventDefault(), setSelecao([]));
    };
    document.addEventListener("keydown", t, true);
    return () => document.removeEventListener("keydown", t, true);
  });

  return (
    <div className="mp pj vl">
      <Topo atual="Montar volumes" />
      <header className="mp-cabeca">
        <div>
          <p className="mp-trilha">
            <span>Juntar PDFs prontos num volume, conferir e exportar</span>
          </p>
          <h1>Montar volumes</h1>
        </div>
        <div className="vl-cabeca-acoes">
          <Botao variante="quiet" tamanho="sm">
            <Sparkles size={14} /> Sugerir montagem
          </Botao>
          <Botao variante="ghost" tamanho="sm">
            <FolderOpen size={14} /> Gerar a partir das pranchas
          </Botao>
        </div>
      </header>

      <section className="mp-painel">
        <div className="vl-barra">
          <label className="vl-projeto">
            <span className="mp-g-fraco">Obra</span>
            <button type="button" className="mp-divisao-tomos">
              {vazio ? (
                "Independente, sem obra"
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
            <button type="button" aria-label="Desfazer: adicionar pranchas a Estrutural (Ctrl+Z)" disabled={vazio}>
              <Undo2 size={14} />
            </button>
            <button type="button" aria-label="Refazer (nada a refazer)" disabled>
              <Redo2 size={14} />
            </button>
          </span>
          <span className={`vl-rascunho${situacao === "falha-gravacao" ? " vl-rascunho--falha" : ""}`}>
            {situacao === "falha-gravacao" ? (
              <>
                <i /> Não está salvo: o espaço de armazenamento deste navegador acabou. A montagem continua aberta nesta aba.
                <button type="button" className="mp-lista-ver">
                  Tentar de novo
                </button>
              </>
            ) : vazio ? (
              "Nada para salvar ainda."
            ) : (
              <>Rascunho salvo neste dispositivo, 17:52. Ao exportar, os PDFs e o relatório entram na obra.</>
            )}
          </span>
        </div>

        <AnimatePresence initial={false}>
          {situacao === "recuperado" && (
            <motion.div className="vl-aviso" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <p>
                <b>A montagem voltou.</b> O rascunho deste dispositivo, de hoje às 17:52, foi recuperado depois que a página recarregou. Os PDFs ainda estão aqui.
              </p>
              <Botao variante="quiet" tamanho="sm">
                Começar do zero
              </Botao>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="vl-mesa">
          <Biblioteca vazio={vazio} fila={situacao === "montando"} selecao={selecao} onSelecao={setSelecao} />
          <Montagem vazio={vazio} destino={destino} selecao={selecao.length} onDestino={setDestino} />
          <Conferencia estado={conferencia} onPrevia={() => setPrevia(true)} />
          <AnimatePresence>{previa && <Previa onFechar={() => setPrevia(false)} />}</AnimatePresence>
        </div>

        <footer className="mp-rodape">
          <span>
            <Tecla>Shift</Tecla> + clique: intervalo
          </span>
          <span>
            <Tecla>↵</Tecla> adicionar ao destino
          </span>
          <span>
            <Tecla>P</Tecla> prévia
          </span>
          <span>
            <Tecla>Ctrl</Tecla>
            <Tecla>Z</Tecla> desfazer
          </span>
          <span>
            <Tecla>Esc</Tecla> limpar seleção
          </span>
          <span className="mp-rodape-fim">{selecao.length ? plural(selecao.length, "página escolhida", "páginas escolhidas") : "arraste páginas para a montagem, ou escolha e adicione"}</span>
        </footer>
      </section>
    </div>
  );
}
