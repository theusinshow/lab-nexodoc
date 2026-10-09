"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  ArrowUp,
  Check,
  ChevronRight,
  Clock,
  FileText,
  FileUp,
  MessageSquare,
  Paperclip,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Avatar, Botao, Esqueleto, NumeroQueChega, Orbe, Segmento, Selo } from "@/components/ds/basicos";
import { DA_EQUIPE, EM_ANDAMENTO, FILA, USUARIO, type Faixa, type ItemDaFila, type Trabalho } from "@/lib/design-lab/amostras";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import "./painel-b.css";

export type SituacaoB =
  | "dia-normal"
  | "item-aberto"
  | "escrevendo"
  | "nexo-terminando"
  | "soltando-pdf"
  | "fila-vazia"
  | "primeiro-acesso"
  | "carregando"
  | "deu-erro";

const FAIXAS: { id: Faixa; nome: string }[] = [
  { id: "agora", nome: "Agora" },
  { id: "semana", nome: "Esta semana" },
  { id: "espera", nome: "Pode esperar" },
];

type Filtro = "tudo" | "achado" | "parado" | "pedido";

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];

/**
 * PAINEL B — a mesa de trabalho. A pergunta que a tela responde deixa de ser
 * "o que existe" e passa a ser "o que depende de mim, e o que o Nexo está
 * fazendo por mim". Uma fila única, de todas as obras, com a ação no item.
 */
export function TelaPainelB({ situacao }: { situacao: SituacaoB }) {
  const { dur } = useTempo();
  const vazioTotal = situacao === "primeiro-acesso";
  const [fila, setFila] = useState<ItemDaFila[]>(situacao === "fila-vazia" || vazioTotal ? [] : FILA);
  const [aberto, setAberto] = useState<string | null>(situacao === "item-aberto" ? "f1" : null);
  const [filtro, setFiltro] = useState<Filtro>("tudo");
  const [estado, setEstado] = useState<"ok" | "carregando" | "erro">(
    situacao === "carregando" ? "carregando" : situacao === "deu-erro" ? "erro" : "ok",
  );
  const [trabalhos, setTrabalhos] = useState<(Trabalho & { pronto?: boolean })[]>(
    vazioTotal ? [] : situacao === "nexo-terminando" ? [{ ...EM_ANDAMENTO[0], progresso: 93 }, EM_ANDAMENTO[1]] : EM_ANDAMENTO,
  );
  const [aviso, setAviso] = useState<{ texto: string; desfazer?: () => void } | null>(null);
  const [soltando, setSoltando] = useState(situacao === "soltando-pdf");
  const [recolhida, setRecolhida] = useState<Record<Faixa, boolean>>({ agora: false, semana: false, espera: true });
  const avisoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // O Nexo trabalha: o progresso anda sozinho. Ao chegar em 100, o cartão
  // vira "pronto" e um item novo ENTRA NO TOPO da fila — a resposta a "o
  // que mudou" e a "para onde foi o resultado", na mesma cena.
  useEffect(() => {
    if (estado !== "ok") return;
    const id = setInterval(() => {
      setTrabalhos((ts) =>
        ts.map((t) => {
          if (t.pronto) return t;
          const passo = situacao === "nexo-terminando" ? 3 : 0.6;
          const p = Math.min(100, t.progresso + passo);
          return p >= 100 ? { ...t, progresso: 100, pronto: true } : { ...t, progresso: p };
        }),
      );
    }, 900 * (dur("layout") / 0.32));
    return () => clearInterval(id);
  }, [estado, situacao, dur]);

  const prontos = trabalhos.filter((t) => t.pronto).map((t) => t.id).join(",");
  // t1 pronto vira item da fila (conferido a cada mudança dos prontos)
  const [prontosVistos, setProntosVistos] = useState("");
  if (prontos !== prontosVistos) {
    setProntosVistos(prontos);
    if (prontos.split(",").includes("t1")) {
      setFila((f) =>
        f.some((i) => i.id === "pronto-t1")
          ? f
          : [
              {
                id: "pronto-t1",
                faixa: "agora",
                tipo: "pronto",
                titulo: "Parecer de 117-25 pronto: não emitir ainda",
                obra: "117-25",
                cidade: "Criciúma",
                porque: "Auditoria concluída agora. 2 bloqueios, 3 decisões técnicas.",
                acao: "Abrir parecer",
              },
              ...f,
            ],
      );
    }
  }

  function avisar(texto: string, desfazer?: () => void) {
    if (avisoTimer.current) clearTimeout(avisoTimer.current);
    setAviso({ texto, desfazer });
    avisoTimer.current = setTimeout(() => setAviso(null), 5200 * (dur("layout") / 0.32));
  }

  function resolver(item: ItemDaFila) {
    const antes = fila;
    setFila((f) => f.filter((i) => i.id !== item.id));
    if (aberto === item.id) setAberto(null);
    const texto =
      item.acao === "Marcar corrigido"
        ? "Achado marcado como corrigido."
        : item.acao === "Decidir"
          ? "Decisão registrada."
          : `${item.acao}: pedido enviado ao Nexo.`;
    avisar(texto, () => setFila(antes));
  }

  function pedirAoNexo(texto: string) {
    const novo: Trabalho = { id: `t${Date.now()}`, oque: texto.length > 42 ? texto.slice(0, 40) + "…" : texto, obra: "novo pedido", progresso: 4, etapa: "Entendendo o pedido" };
    setTrabalhos((ts) => [novo, ...ts]);
  }

  const visiveis = useMemo(() => fila.filter((i) => filtro === "tudo" || i.tipo === filtro || (filtro === "achado" && i.tipo === "pronto")), [fila, filtro]);
  const agora = fila.filter((i) => i.faixa === "agora").length;

  return (
    <div className="pb" onDragEnter={(e) => { e.preventDefault(); setSoltando(true); }}>
      <div className="pb-brilho" aria-hidden />
      <Topo atual="Painel" trabalhando={trabalhos.some((t) => !t.pronto)} aviso={!vazioTotal} />

      <section className="pb-abertura">
        <div className="pb-saudacao">
          <h1>Boa noite, {USUARIO.nome}.</h1>
          <p>
            {vazioTotal ? (
              "Comece pelo campo ao lado: peça ou solte o PDF de uma obra."
            ) : estado === "carregando" ? (
              <Esqueleto largura={300} altura={13} />
            ) : agora > 0 ? (
              <>
                <b className="ds-num">
                  <NumeroQueChega valor={agora} />
                </b>{" "}
                {agora === 1 ? "coisa pede" : "coisas pedem"} você agora.{" "}
                {(() => {
                  const n = trabalhos.filter((t) => !t.pronto).length;
                  return n === 0 ? "" : n === 1 ? "O Nexo está com 1 trabalho em andamento." : `O Nexo está com ${n} trabalhos em andamento.`;
                })()}
              </>
            ) : (
              "Nada pede você agora."
            )}
          </p>
        </div>
        <Compositor iniciarEscrevendo={situacao === "escrevendo"} destaque={vazioTotal} onEnviar={pedirAoNexo} />
      </section>

      <div className="pb-grade">
        {/* ---------------- a fila ---------------- */}
        <section className="pb-fila" aria-label="Sua fila">
          <div className="pb-fila-cabeca">
            <h2>Sua fila</h2>
            {estado === "ok" && fila.length > 0 && (
              <>
                <Selo>
                  <NumeroQueChega valor={fila.length} /> {fila.length === 1 ? "item" : "itens"}
                </Selo>
                <span style={{ marginLeft: "auto" }}>
                  <Segmento
                    rotulo="Filtrar a fila"
                    valor={filtro}
                    onTroca={setFiltro}
                    opcoes={[
                      { valor: "tudo", rotulo: "Tudo" },
                      { valor: "achado", rotulo: "Achados" },
                      { valor: "parado", rotulo: "Obras paradas" },
                      { valor: "pedido", rotulo: "Pedidos" },
                    ]}
                  />
                </span>
              </>
            )}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {estado === "carregando" ? (
              <motion.div key="c" className="pb-fila-corpo" {...entra(dur)} aria-busy="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="pb-item pb-item--esqueleto">
                    <Esqueleto largura={8} altura={8} raio={9} />
                    <div style={{ display: "grid", gap: 8, flex: 1 }}>
                      <Esqueleto largura={[340, 280, 300, 360, 250][i]} altura={13} />
                      <Esqueleto largura={[220, 180, 260, 200, 160][i]} altura={10} />
                    </div>
                    <Esqueleto largura={110} altura={28} raio={999} />
                  </div>
                ))}
              </motion.div>
            ) : estado === "erro" ? (
              <motion.div key="e" className="pb-fila-corpo pb-estado" {...entra(dur)} role="alert">
                <b style={{ color: "var(--ds-state-error)" }}>Não deu para carregar sua fila.</b>
                <span>O servidor não respondeu. O Nexo e o resto do painel continuam funcionando.</span>
                <Botao
                  variante="ghost"
                  tamanho="sm"
                  onClick={() => {
                    setEstado("carregando");
                    setTimeout(() => setEstado("ok"), 1100 * (dur("layout") / 0.32));
                  }}
                >
                  <RotateCcw />
                  Tentar de novo
                </Botao>
              </motion.div>
            ) : fila.length === 0 ? (
              <motion.div key="v" className="pb-fila-corpo pb-estado" {...entra(dur)}>
                {vazioTotal ? (
                  <>
                    <span className="pb-estado-icone">
                      <FileUp size={20} />
                    </span>
                    <b>Sua fila aparece aqui.</b>
                    <span>Quando o Nexo auditar um memorial ou alguém atribuir um achado a você, o que depender de você entra nesta lista, na ordem de urgência.</span>
                  </>
                ) : (
                  <>
                    <span className="pb-estado-icone pb-estado-icone--ok">
                      <Check size={20} />
                    </span>
                    <b>Nada esperando você.</b>
                    <span>Esta semana você fechou 14 achados e liberou 2 obras para emissão.</span>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div key="l" className="pb-fila-corpo" {...entra(dur)}>
                <LayoutGroup>
                  {FAIXAS.map((fx) => {
                    const itens = visiveis.filter((i) => i.faixa === fx.id);
                    if (itens.length === 0) return null;
                    return (
                      <motion.div key={fx.id} layout="position" className="pb-faixa">
                        <button
                          type="button"
                          className="pb-faixa-cabeca"
                          aria-expanded={!recolhida[fx.id]}
                          onClick={() => setRecolhida((r) => ({ ...r, [fx.id]: !r[fx.id] }))}
                        >
                          <motion.span animate={{ rotate: recolhida[fx.id] ? 0 : 90 }} transition={{ duration: dur("state") }} style={{ display: "inline-flex" }}>
                            <ChevronRight size={13} />
                          </motion.span>
                          {fx.nome}
                          <span className="ds-num">{itens.length}</span>
                        </button>
                        <AnimatePresence initial={false}>
                          {!recolhida[fx.id] && (
                            <motion.ul
                              className="pb-itens"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: dur("layout"), ease: ease(CURVA.out) }}
                            >
                              <AnimatePresence initial={false}>
                                {itens.map((item) => (
                                  <ItemDaFilaView
                                    key={item.id}
                                    item={item}
                                    aberto={aberto === item.id}
                                    onAbrir={() => setAberto((a) => (a === item.id ? null : item.id))}
                                    onResolver={() => resolver(item)}
                                  />
                                ))}
                              </AnimatePresence>
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </LayoutGroup>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ---------------- a lateral ---------------- */}
        <aside className="pb-lado">
          <div className="pb-cartao">
            <h3>
              Em andamento
              {trabalhos.some((t) => !t.pronto) && <Orbe tamanho={12} estado="trabalhando" />}
            </h3>
            {trabalhos.length === 0 ? (
              <p className="pb-nota">Quando o Nexo estiver auditando ou gerando algo, o progresso aparece aqui. Pode fechar a aba: ele avisa quando terminar.</p>
            ) : (
              <ul className="pb-trabalhos">
                <AnimatePresence initial={false}>
                  {trabalhos.map((t) => (
                    <motion.li
                      key={t.id}
                      layout
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: dur("enter"), ease: ease(CURVA.out) }}
                      className={t.pronto ? "pb-trabalho pb-trabalho--pronto" : "pb-trabalho"}
                    >
                      <div className="pb-trabalho-topo">
                        <b>{t.oque}</b>
                        <span className="ds-code">{t.obra}</span>
                      </div>
                      <AnimatePresence mode="wait" initial={false}>
                        {t.pronto ? (
                          <motion.div key="p" className="pb-trabalho-pronto" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: dur("state") }}>
                            <span>
                              <Check size={13} /> Pronto
                            </span>
                            <Botao variante="ghost" tamanho="sm">
                              Abrir
                            </Botao>
                          </motion.div>
                        ) : (
                          <motion.div key="a" exit={{ opacity: 0 }} transition={{ duration: dur("feedback") }}>
                            <span className="pb-brilho-texto">{t.etapa}</span>
                            <div className="pb-barra">
                              <motion.i animate={{ width: `${t.progresso}%` }} transition={{ duration: dur("layout") * 2, ease: ease(CURVA.out) }} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>

          {!vazioTotal && (
            <button type="button" className="pb-cartao pb-retomar">
              <span className="pb-nota">Onde você parou</span>
              <b>Memorial geral 117-25</b>
              <span className="pb-nota">UBS da Rua São Francisco de Assis, há 4 h</span>
              <ChevronRight size={16} className="pb-retomar-seta" />
            </button>
          )}

          <div className="pb-cartao">
            <h3>Da equipe</h3>
            {vazioTotal ? (
              <p className="pb-nota">Respostas nos seus achados e o que mexerem nas suas obras aparecem aqui.</p>
            ) : (
              <ul className="pb-equipe">
                {DA_EQUIPE.map((e) => (
                  <li key={e.quem + e.obra}>
                    <Avatar iniciais={e.iniciais} pequeno />
                    <span>
                      <b>{e.quem}</b> {e.oque} {e.ref && <span className="ds-code">{e.ref}</span>} <span className="ds-code">{e.obra}</span>
                    </span>
                    <time>{e.quando}</time>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <SeuEspaco />
        </aside>
      </div>

      {/* ---------------- aviso com desfazer ---------------- */}
      <AnimatePresence>
        {aviso && (
          <motion.div
            className="pb-aviso"
            role="status"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, transition: { duration: dur("feedback") } }}
            transition={{ duration: dur("enter"), ease: ease(CURVA.out) }}
          >
            <Check size={15} style={{ color: "var(--ds-state-ok)" }} />
            {aviso.texto}
            {aviso.desfazer && (
              <button
                type="button"
                onClick={() => {
                  aviso.desfazer?.();
                  setAviso(null);
                }}
              >
                Desfazer
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {soltando && (
          <motion.div
            className="pb-soltar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur("state") }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => e.currentTarget === e.target && setSoltando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setSoltando(false);
              pedirAoNexo(e.dataTransfer.files[0]?.name ? `Ler ${e.dataTransfer.files[0].name}` : "Ler o PDF solto");
            }}
            onClick={() => setSoltando(false)}
          >
            <div className="pb-soltar-caixa">
              <Orbe tamanho={64} estado="trabalhando" />
              <b>Solte para o Nexo ler</b>
              <span>Memorial vira auditoria. Pranchas viram LD, capa e volume.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function entra(dur: (n: "enter" | "feedback") => number) {
  return {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, transition: { duration: dur("feedback") } },
    transition: { duration: dur("enter"), ease: ease(CURVA.out) },
  };
}

function Marcador({ item }: { item: ItemDaFila }) {
  if (item.tipo === "achado") return <i className={`pb-grav pb-grav--${item.gravidade}`} aria-hidden />;
  const Icone = item.tipo === "parado" ? Clock : item.tipo === "pedido" ? MessageSquare : Sparkles;
  return (
    <span className={`pb-marcador${item.tipo === "pronto" ? " pb-marcador--nexo" : ""}`} aria-hidden>
      <Icone size={13} />
    </span>
  );
}

/**
 * Um item da fila. Clicar abre a evidência no lugar. A ação resolve ali mesmo:
 * o botão vira "feito" com o check se desenhando, e só DEPOIS o item sai — o
 * olho vê o que aconteceu antes de o item sumir.
 */
function ItemDaFilaView({ item, aberto, onAbrir, onResolver }: { item: ItemDaFila; aberto: boolean; onAbrir: () => void; onResolver: () => void }) {
  const { dur, mola } = useTempo();
  const [feito, setFeito] = useState(false);

  function agir(e: React.MouseEvent) {
    e.stopPropagation();
    if (feito) return;
    setFeito(true);
    setTimeout(onResolver, 650 * (dur("layout") / 0.32));
  }

  return (
    <motion.li
      layout="position"
      className={`pb-item${aberto ? " pb-item--aberto" : ""}${item.tipo === "pronto" ? " pb-item--novo" : ""}`}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0, transition: { duration: dur("layout"), ease: ease(CURVA.out) } }}
      transition={{ ...mola("smooth"), opacity: { duration: dur("enter") } }}
    >
      {/* O título abre; a ação fica AO LADO, nunca dentro — botão dentro de
          botão confunde teclado e leitor de tela. A linha inteira continua
          clicável pelo mouse, via o botão que ocupa o espaço do texto. */}
      <div className="pb-item-linha">
        <button type="button" className="pb-item-abrir" aria-expanded={aberto} onClick={onAbrir}>
        <Marcador item={item} />
        <div className="pb-item-texto">
          <b>{item.titulo}</b>
          <span>
            <MarcaDaPrefeitura prefeitura={item.cidade} forma="sinal" />
            <span className="ds-code">{item.obra}</span>
            {item.porque}
          </span>
        </div>
        </button>
        <Botao variante={feito ? "quiet" : "ghost"} tamanho="sm" onClick={agir} className={feito ? "pb-feito" : ""} aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            {feito ? (
              <motion.span key="f" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: dur("state") }} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <motion.path d="m5 12.5 4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: dur("enter"), ease: ease(CURVA.out) }} />
                </svg>
                Feito
              </motion.span>
            ) : (
              <motion.span key="a" exit={{ opacity: 0 }} transition={{ duration: dur("feedback") }}>
                {item.acao}
              </motion.span>
            )}
          </AnimatePresence>
        </Botao>
      </div>
      <AnimatePresence initial={false}>
        {aberto && (
          <motion.div
            className="pb-item-corpo"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: dur("layout"), ease: ease(CURVA.out) }}
          >
            <div className="pb-item-detalhe">
              {item.evidencia ? (
                <blockquote>
                  “{item.evidencia.trecho}”
                  <span>
                    <FileText size={13} /> página {item.evidencia.pagina}
                  </span>
                </blockquote>
              ) : (
                <p className="pb-nota" style={{ margin: 0 }}>
                  {item.porque}
                </p>
              )}
              <div className="pb-item-acoes">
                {item.evidencia && (
                  <Botao variante="quiet" tamanho="sm">
                    <FileText />
                    Abrir página {item.evidencia.pagina}
                  </Botao>
                )}
                <Botao variante="quiet" tamanho="sm">
                  Atribuir a alguém
                </Botao>
                {item.tipo === "achado" && (
                  <Botao variante="quiet" tamanho="sm">
                    Não é erro
                  </Botao>
                )}
                <Botao variante="quiet" tamanho="sm">
                  Abrir no Nexo
                  <ChevronRight />
                </Botao>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

/**
 * O COMPOSITOR como porta de entrada. Ao ganhar foco ele cresce e oferece os
 * pedidos mais comuns; ao enviar, o pedido VAI PARA "Em andamento" — quem
 * pediu vê para onde o pedido foi.
 */
function Compositor({ iniciarEscrevendo, destaque, onEnviar }: { iniciarEscrevendo: boolean; destaque: boolean; onEnviar: (t: string) => void }) {
  const { dur, mola } = useTempo();
  const [texto, setTexto] = useState(iniciarEscrevendo ? "audita o memorial da quadra do CAIC, foca nas áreas" : "");
  const [foco, setFoco] = useState(iniciarEscrevendo);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (iniciarEscrevendo) ref.current?.focus();
  }, [iniciarEscrevendo]);

  function enviar() {
    const t = texto.trim();
    if (!t) return;
    onEnviar(t);
    setTexto("");
  }

  return (
    <motion.div
      className={`pb-compositor${foco ? " pb-compositor--foco" : ""}${destaque ? " pb-compositor--destaque" : ""}`}
      layout
      transition={mola("smooth")}
      onFocus={() => setFoco(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setFoco(false);
      }}
    >
      <div className="pb-compositor-linha">
        <Orbe tamanho={20} />
        <textarea
          ref={ref}
          rows={1}
          aria-label="Pedir ao Nexo"
          placeholder="Peça ao Nexo ou solte um PDF…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar();
            }
          }}
        />
        <Botao variante="quiet" icone tamanho="sm" aria-label="Anexar PDFs">
          <Paperclip />
        </Botao>
        <motion.button
          type="button"
          className="pb-enviar"
          aria-label="Enviar"
          disabled={!texto.trim()}
          onClick={enviar}
          animate={{ scale: texto.trim() ? 1 : 0.9, opacity: texto.trim() ? 1 : 0.45 }}
          transition={mola("snappy")}
        >
          <ArrowUp size={15} />
        </motion.button>
      </div>
      <AnimatePresence initial={false}>
        {foco && (
          <motion.div
            className="pb-sugestoes"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: dur("layout"), ease: ease(CURVA.out) }}
          >
            <div>
              {["Auditar um memorial", "Gerar LD e capa", "Montar um volume", "Conferir as folhas"].map((s, i) => (
                <motion.button
                  key={s}
                  type="button"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: dur("enter"), delay: 0.03 * i * (dur("enter") / 0.24), ease: ease(CURVA.out) }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setTexto(s + " ")}
                >
                  {s}
                </motion.button>
              ))}
              <span className="pb-nota" style={{ marginLeft: "auto" }}>
                Enter envia
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SeuEspaco() {
  const { dur } = useTempo();
  const [aberto, setAberto] = useState(false);
  const [rodando, setRodando] = useState(false);
  const [resta, setResta] = useState(45 * 60);
  useEffect(() => {
    if (!rodando) return;
    const id = setInterval(() => setResta((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [rodando]);
  const mm = String(Math.floor(resta / 60)).padStart(2, "0");
  const ss = String(resta % 60).padStart(2, "0");
  return (
    <div className="pb-cartao pb-espaco">
      <button type="button" className="pb-espaco-cabeca" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
        <motion.span animate={{ rotate: aberto ? 90 : 0 }} transition={{ duration: dur("state") }} style={{ display: "inline-flex" }}>
          <ChevronRight size={13} />
        </motion.span>
        Seu espaço
        <span className="pb-nota" style={{ marginLeft: "auto" }}>
          Foco <span className="ds-num">{mm}:{ss}</span>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {aberto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: dur("layout"), ease: ease(CURVA.out) }}
            style={{ overflow: "hidden" }}
          >
            <div className="pb-espaco-corpo">
              <div className="pb-espaco-foco">
                <span className="ds-num">{mm}:{ss}</span>
                <Botao variante="ghost" tamanho="sm" onClick={() => setRodando((r) => !r)}>
                  {rodando ? <Pause /> : <Play />}
                  {rodando ? "Pausar" : "Iniciar"}
                </Botao>
              </div>
              <textarea className="pb-rascunho" aria-label="Rascunho" placeholder="O que não pode escapar hoje…" defaultValue="Ligar para a prefeitura de Criciúma sobre o traço do contrapiso" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
