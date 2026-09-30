"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, ChevronUp, FileSearch, FileText, Link2, Mail, Search, Undo2, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Avatar, Botao, Menu, Segmento, Selo, Tecla } from "@/components/ds/basicos";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";

import { DESFECHO_NOME, IMPACTOS, PESSOAS, type Achado, type Desfecho } from "./dados";

export type Filtro = "todos" | "meus" | "sem" | "pendentes" | "encerrados";

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];
const EU = "Victor";

/** O trecho com a parte que importa marcada — o olho vai direto nela. */
function Trecho({ texto, marca }: { texto: string; marca: string }) {
  const i = texto.indexOf(marca);
  if (i < 0) return <>{texto}</>;
  return (
    <>
      {texto.slice(0, i)}
      <mark>{marca}</mark>
      {texto.slice(i + marca.length)}
    </>
  );
}

export function Fila({
  achados,
  onMudar,
  inicial,
  onAbrirPagina,
}: {
  onAbrirPagina?: (id: string) => void;
  achados: Achado[];
  onMudar: (id: string, desfecho: Achado["desfecho"] | undefined, responsavel?: string | null) => void;
  inicial: { selecionado: string; filtro?: Filtro; busca?: string; decisao?: boolean; marcados?: string[] };
}) {
  const { dur, mola } = useTempo();
  const [filtro, setFiltro] = useState<Filtro>(inicial.filtro ?? "todos");
  const [busca, setBusca] = useState(inicial.busca ?? "");
  const [selecionado, setSelecionado] = useState(inicial.selecionado);
  const [direcao, setDirecao] = useState(1);
  const [decisao, setDecisao] = useState(!!inicial.decisao);
  const [motivo, setMotivo] = useState(inicial.decisao ? "Reserva de 6% aceita: a ampliação de 2027 terá quadro próprio (QDG-02)." : "");
  const [marcados, setMarcados] = useState<string[]>(inicial.marcados ?? []);
  const [aba, setAba] = useState<"evidencia" | "conversa" | "historico">("evidencia");
  const [ultimo, setUltimo] = useState<{ id: string; tipo: Desfecho } | null>(null);
  const buscaRef = useRef<HTMLInputElement>(null);

  const contagem: Record<Filtro, number> = {
    todos: achados.length,
    meus: achados.filter((a) => a.responsavel === EU && !a.desfecho).length,
    sem: achados.filter((a) => !a.responsavel && !a.desfecho).length,
    pendentes: achados.filter((a) => !a.desfecho).length,
    encerrados: achados.filter((a) => a.desfecho).length,
  };
  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return IMPACTOS.flatMap((i) => achados.filter((a) => a.impacto === i.id)).filter((a) => {
      if (filtro === "meus" && !(a.responsavel === EU && !a.desfecho)) return false;
      if (filtro === "sem" && !(!a.responsavel && !a.desfecho)) return false;
      if (filtro === "pendentes" && a.desfecho) return false;
      if (filtro === "encerrados" && !a.desfecho) return false;
      if (!q) return true;
      return [a.id, a.titulo, a.disciplina, `p. ${a.pagina}`, a.evidencia.trecho].some((t) => t.toLowerCase().includes(q));
    });
  }, [achados, filtro, busca]);

  const atual = achados.find((a) => a.id === selecionado) ?? achados[0];
  const posicao = visiveis.findIndex((a) => a.id === atual.id);

  const ir = (passo: number) => {
    if (!visiveis.length) return;
    const i = posicao < 0 ? 0 : (posicao + passo + visiveis.length) % visiveis.length;
    setDirecao(passo);
    setSelecionado(visiveis[i].id);
    setDecisao(false);
    setAba("evidencia");
  };
  const encerrar = (tipo: Desfecho, texto?: string) => {
    onMudar(atual.id, { tipo, por: EU, quando: "agora", motivo: texto });
    setUltimo({ id: atual.id, tipo });
    setDecisao(false);
  };
  const desfazer = () => {
    if (!ultimo) return;
    onMudar(ultimo.id, undefined);
    setUltimo(null);
  };

  useEffect(() => {
    if (!ultimo) return;
    const t = setTimeout(() => setUltimo(null), 6000);
    return () => clearTimeout(t);
  }, [ultimo]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      const digitando = alvo.closest("input, textarea");
      if (e.key === "Escape") {
        if (decisao) {
          e.preventDefault();
          setDecisao(false);
        } else if (marcados.length) {
          e.preventDefault();
          setMarcados([]);
        } else if (digitando && busca) {
          e.preventDefault();
          setBusca("");
        }
        return;
      }
      if (digitando || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "j") ir(1);
      else if (k === "k") ir(-1);
      else if (k === "m") onAbrirPagina?.(atual.id);
      else if (k === "/") {
        e.preventDefault();
        buscaRef.current?.focus();
      } else if (!atual.desfecho && k === "c") encerrar("corrigido");
      else if (!atual.desfecho && k === "f") encerrar("falso-positivo");
      else if (!atual.desfecho && k === "d") {
        e.preventDefault();
        setDecisao(true);
      } else if (k === "z" && ultimo) desfazer();
    };
    // captura: roda antes do Esc global da página, que respeita o preventDefault
    document.addEventListener("keydown", tecla, true);
    return () => document.removeEventListener("keydown", tecla, true);
  });

  const alternar = (id: string) => setMarcados((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));

  return (
    <div className="rs-fila">
      {/* ================= a lista ================= */}
      <section className="rs-lista" aria-label="Fila de achados">
        <div className="rs-lista-topo">
          <label className="rs-busca">
            <Search size={14} />
            <input ref={buscaRef} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por texto, referência ou página" />
            {busca ? (
              <button type="button" aria-label="Limpar a busca" onClick={() => setBusca("")}>
                <X size={13} />
              </button>
            ) : (
              <Tecla>/</Tecla>
            )}
          </label>
          <Segmento
            rotulo="Mostrar"
            valor={filtro}
            onTroca={setFiltro}
            opcoes={[
              { valor: "todos", rotulo: <>Todos <em>{contagem.todos}</em></> },
              { valor: "meus", rotulo: <>Meus <em>{contagem.meus}</em></> },
              { valor: "sem", rotulo: <>Sem dono <em>{contagem.sem}</em></> },
              { valor: "pendentes", rotulo: <>Pendentes <em>{contagem.pendentes}</em></> },
              { valor: "encerrados", rotulo: <>Encerrados <em>{contagem.encerrados}</em></> },
            ]}
          />
        </div>

        <div className="rs-linhas">
          {visiveis.length === 0 ? (
            <div className="rs-vazio">
              <b>Nenhum achado com {busca ? `“${busca}”` : "esse filtro"}.</b>
              <span>A busca olha o título, a referência, a disciplina, a página e o trecho.</span>
              <Botao
                variante="ghost"
                tamanho="sm"
                onClick={() => {
                  setBusca("");
                  setFiltro("todos");
                }}
              >
                Limpar busca e filtros
              </Botao>
            </div>
          ) : (
            IMPACTOS.map((imp) => {
              const doGrupo = visiveis.filter((a) => a.impacto === imp.id);
              if (!doGrupo.length) return null;
              return (
                <div key={imp.id} className="rs-grupo">
                  <h4>
                    <i className={`rs-ponto rs-ponto--${imp.id}`} />
                    {imp.nome}
                    <span className="ds-num">{doGrupo.length}</span>
                  </h4>
                  {doGrupo.map((a) => {
                    const ativo = a.id === atual.id;
                    const marcado = marcados.includes(a.id);
                    return (
                      <div key={a.id} className={`rs-linha${ativo ? " rs-linha--ativa" : ""}${a.desfecho ? " rs-linha--encerrada" : ""}${marcados.length ? " rs-linha--selecionando" : ""}`}>
                        {ativo && <motion.span layoutId="rs-linha-ativa" className="rs-linha-fundo" transition={mola("snappy")} />}
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={marcado}
                          aria-label={`Selecionar ${a.id} para atribuir`}
                          className="rs-marcar"
                          disabled={!!a.desfecho}
                          onClick={() => alternar(a.id)}
                        >
                          <AnimatePresence>
                            {marcado && (
                              <motion.svg viewBox="0 0 16 16" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <motion.path d="M4 8.5 L7 11 L12 5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: dur("state") }} />
                              </motion.svg>
                            )}
                          </AnimatePresence>
                        </button>
                        <button
                          type="button"
                          className="rs-linha-corpo"
                          onClick={() => {
                            setDirecao(visiveis.indexOf(a) > posicao ? 1 : -1);
                            setSelecionado(a.id);
                            setDecisao(false);
                            setAba("evidencia");
                          }}
                        >
                          <span className="rs-linha-id">{a.id}</span>
                          <span className="rs-linha-titulo">{a.titulo}</span>
                          <span className="rs-linha-meta">
                            {a.desfecho ? (
                              <span className="rs-linha-desfecho">
                                <Check size={12} /> {DESFECHO_NOME[a.desfecho.tipo]}
                              </span>
                            ) : (
                              <>
                                <span className="ds-num">p. {a.pagina}</span>
                                {a.responsavel ? <Avatar iniciais={a.responsavel.slice(0, 2).toUpperCase()} pequeno /> : <span className="rs-sem-dono">sem dono</span>}
                              </>
                            )}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <AnimatePresence>
          {marcados.length > 0 && (
            <motion.div
              className="rs-selecao"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0, transition: { duration: dur("feedback") } }}
              transition={{ duration: dur("enter"), ease: ease(CURVA.out) }}
            >
              <b className="ds-num">{marcados.length}</b> selecionados
              <span className="rs-selecao-acoes">
                <Menu rotulo={<><UserPlus /> Atribuir a…</>} alinhar="left" itens={PESSOAS.map((p) => ({ rotulo: p.rotulo, onClick: () => { marcados.forEach((id) => onMudar(id, undefined, p.valor)); setMarcados([]); } }))} />
                <Botao variante="ghost" tamanho="sm">
                  <Mail /> Enviar
                </Botao>
                <Botao variante="quiet" tamanho="sm" icone aria-label="Limpar seleção (Esc)" title="Limpar seleção (Esc)" onClick={() => setMarcados([])}>
                  <X />
                </Botao>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ================= o achado aberto ================= */}
      <section className="rs-detalhe" aria-label={`Achado ${atual.id}`}>
        <div className="rs-detalhe-topo">
          <span className="rs-detalhe-id">{atual.id}</span>
          <Selo tom={atual.impacto} ponto>
            {IMPACTOS.find((i) => i.id === atual.impacto)?.nome}
          </Selo>
          <Selo>{atual.disciplina}</Selo>
          <span className="rs-origem">{atual.origem === "regra" ? "Regra verificada: página e trecho conferidos" : "Sugerido pela IA: confira o trecho"}</span>
          <span className="rs-navegar">
            <span className="ds-num">{posicao < 0 ? "fora do filtro" : `${posicao + 1} de ${visiveis.length}`}</span>
            <Botao variante="quiet" tamanho="sm" icone aria-label="Achado anterior (K)" onClick={() => ir(-1)}>
              <ChevronUp />
            </Botao>
            <Botao variante="quiet" tamanho="sm" icone aria-label="Próximo achado (J)" onClick={() => ir(1)}>
              <ChevronDown />
            </Botao>
            <Menu
              rotulo="Mais"
              variante="quiet"
              itens={[
                { rotulo: "Gravidade errada", dica: "Avisa o motor; o achado continua na fila", icone: <X size={14} /> },
                { rotulo: "Copiar link do achado", icone: <Link2 size={14} /> },
                { rotulo: "Cartão do achado", dica: "Imagem para mandar no WhatsApp", icone: <FileText size={14} /> },
              ]}
            />
          </span>
        </div>

        <AnimatePresence mode="wait" initial={false} custom={direcao}>
          <motion.div
            key={atual.id}
            className="rs-detalhe-corpo"
            initial={{ opacity: 0, y: 10 * direcao }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 * direcao, transition: { duration: dur("feedback") } }}
            transition={{ duration: dur("enter"), ease: ease(CURVA.out) }}
          >
            <h2>{atual.titulo}</h2>
            <div className="rs-dono">
              {atual.responsavel ? (
                <>
                  <Avatar iniciais={atual.responsavel.slice(0, 2).toUpperCase()} pequeno /> Com {atual.responsavel === EU ? "você" : atual.responsavel}
                </>
              ) : (
                <span className="rs-sem-dono">Sem responsável</span>
              )}
              <Menu rotulo={atual.responsavel ? "Trocar" : "Atribuir a…"} variante="quiet" alinhar="left" itens={PESSOAS.map((p) => ({ rotulo: p.rotulo, onClick: () => onMudar(atual.id, atual.desfecho, p.valor) }))} />
              <Botao variante="ghost" tamanho="sm" className="rs-ver-memorial" title="Abre o memorial nesta página, com o trecho grifado (M)" onClick={() => onAbrirPagina?.(atual.id)}>
                <FileSearch /> Ver no memorial, p. {atual.pagina} <Tecla>M</Tecla>
              </Botao>
            </div>

            <dl className="rs-partes">
              <div>
                <dt>O que está errado</dt>
                <dd>{atual.errado}</dd>
              </div>
              <div>
                <dt>Por que importa</dt>
                <dd>{atual.importa}</dd>
              </div>
              <div>
                <dt>O que fazer</dt>
                <dd>{atual.fazer}</dd>
              </div>
            </dl>

            <Segmento
              rotulo="Detalhe do achado"
              valor={aba}
              onTroca={setAba}
              opcoes={[
                { valor: "evidencia", rotulo: "Evidência" },
                { valor: "conversa", rotulo: <>Conversa <em>2</em></> },
                { valor: "historico", rotulo: "Histórico" },
              ]}
            />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={aba} className="rs-aba" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur("feedback") }}>
                {aba === "evidencia" && (
                  <div className="rs-evidencias">
                    <figure>
                      <figcaption>
                        Memorial, p. {atual.pagina}
                      </figcaption>
                      <blockquote>
                        <Trecho texto={atual.evidencia.trecho} marca={atual.evidencia.marca} />
                      </blockquote>
                    </figure>
                    {atual.comparada && (
                      <figure>
                        <figcaption>
                          {atual.comparada.onde}
                          <button type="button" className="rs-link">
                            Abrir página
                          </button>
                        </figcaption>
                        <blockquote>
                          <Trecho texto={atual.comparada.trecho} marca={atual.comparada.marca} />
                        </blockquote>
                      </figure>
                    )}
                  </div>
                )}
                {aba === "conversa" && (
                  <ol className="rs-conversa">
                    <li>
                      <Avatar iniciais="RA" pequeno />
                      <div>
                        <b>Rafael</b> <time>21:24</time>
                        <p>Conferi o quadro: o erro é do texto, o quadro foi refeito na revisão B.</p>
                      </div>
                    </li>
                    <li>
                      <Avatar iniciais="VI" pequeno />
                      <div>
                        <b>Victor</b> <time>21:26</time>
                        <p>Fechado, corrijo no texto e marco aqui.</p>
                      </div>
                    </li>
                    <li className="rs-conversa-escrever">
                      <input placeholder="Escrever para quem cuida deste achado" />
                    </li>
                  </ol>
                )}
                {aba === "historico" && (
                  <ol className="rs-historico">
                    <li>
                      <time>21:13</time> Encontrado {atual.origem === "regra" ? "pela regra de coerência" : "pela leitura da IA e mantido pelo segundo modelo"}
                    </li>
                    {atual.responsavel && (
                      <li>
                        <time>21:20</time> Atribuído a {atual.responsavel} por Victor
                      </li>
                    )}
                    {atual.desfecho && (
                      <li>
                        <time>{atual.desfecho.quando.replace("hoje, ", "")}</time> {DESFECHO_NOME[atual.desfecho.tipo]}, por {atual.desfecho.por}
                      </li>
                    )}
                  </ol>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* ---------- o que fazer com ele ---------- */}
        <div className="rs-acoes">
          <AnimatePresence mode="wait" initial={false}>
            {atual.desfecho ? (
              <motion.div key="encerrado" className="rs-encerrado" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: dur("enter"), ease: ease(CURVA.out) }}>
                <span className="rs-encerrado-marca">
                  <Check size={14} />
                </span>
                <div>
                  <b>
                    {DESFECHO_NOME[atual.desfecho.tipo]}
                    <span>
                      , por {atual.desfecho.por === EU ? "você" : atual.desfecho.por} {atual.desfecho.quando}
                    </span>
                  </b>
                  {atual.desfecho.motivo && <p>{atual.desfecho.motivo}</p>}
                </div>
                {ultimo?.id === atual.id ? (
                  <Botao variante="ghost" tamanho="sm" onClick={desfazer}>
                    <Undo2 /> Desfazer <Tecla>Z</Tecla>
                  </Botao>
                ) : (
                  <Botao variante="quiet" tamanho="sm" onClick={() => onMudar(atual.id, undefined)}>
                    Reabrir
                  </Botao>
                )}
              </motion.div>
            ) : decisao ? (
              <motion.form
                key="decisao"
                className="rs-decisao"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: dur("enter"), ease: ease(CURVA.out) }}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (motivo.trim()) encerrar("decisao", motivo.trim());
                }}
              >
                <label htmlFor="rs-motivo">
                  Motivo da decisão técnica <span>Fica no histórico e vai no parecer. Quem assina: Victor, responsável técnico.</span>
                </label>
                <textarea id="rs-motivo" autoFocus rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Por que o projeto segue assim" />
                <div>
                  <Botao variante="quiet" tamanho="sm" onClick={() => setDecisao(false)}>
                    Cancelar <Tecla>Esc</Tecla>
                  </Botao>
                  <Botao variante="primary" tamanho="sm" type="submit" disabled={!motivo.trim()}>
                    Gravar decisão técnica
                  </Botao>
                </div>
              </motion.form>
            ) : (
              <motion.div key="botoes" className="rs-botoes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur("feedback") }}>
                <Botao variante="primary" tamanho="sm" onClick={() => encerrar("corrigido")}>
                  <Check /> Marcar corrigido <Tecla>C</Tecla>
                </Botao>
                <Botao variante="ghost" tamanho="sm" onClick={() => setDecisao(true)}>
                  Decisão técnica <Tecla>D</Tecla>
                </Botao>
                <Botao variante="ghost" tamanho="sm" onClick={() => encerrar("falso-positivo")}>
                  Falso positivo <Tecla>F</Tecla>
                </Botao>
                <span className="rs-atalhos" title="J próximo, K anterior">
                  <Tecla>J</Tecla>
                  <Tecla>K</Tecla> andam
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
