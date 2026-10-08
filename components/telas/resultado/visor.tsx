"use client";

/**
 * O VISOR DO MEMORIAL (desenho do lab: resultado-e/visor.tsx), com o PDF de
 * verdade. Abre por cima do resultado, na página do achado, com o trecho
 * grifado; ao lado, os achados daquela página e a fita das páginas que têm
 * achado. ← → folheiam; J K pulam entre páginas com achado; Shift+← → andam
 * entre as páginas DO achado aberto; + − ampliam; Esc fecha.
 */
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ArrowUp, ChevronLeft, ChevronRight, Minus, Plus, SearchX, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Botao, Orbe, Tecla } from "@/components/ds/basicos";
import { CURVA } from "@/lib/ds/movimento";
import { candidatosDoGrifo, porQueSemGrifo, type FolhasSemCamada } from "@/lib/grifo-do-achado";
import { useTempo } from "@/lib/ds/tempo";
import { NIVEIS } from "@/lib/nivel-do-achado";
import { lerPerguntaSobreAchado, textoDaPergunta } from "@/lib/pergunta-sobre-achado";
import { RotuloDaPergunta } from "@/components/achado/rotulo-da-pergunta";

import type { AchadoDaTela } from "./use-parecer-vivo";
import { NOME_DO_DESFECHO } from "./textos";
import "./visor.css";

const AuditPdfViewer = dynamic(() => import("@/components/audit-pdf-viewer-internal"), {
  ssr: false,
  loading: () => <div className="vm-carregando">Abrindo o memorial…</div>,
});

const ZOOMS = [0.75, 1, 1.25, 1.5, 2, 2.5, 3];

/** A conversa do Nexo vista pelo visor: o que já foi dito e como perguntar. */
export type ChatDoVisor = {
  mensagens: readonly { id: string; role: string; content: string }[];
  enviar: (texto: string) => void;
};

/*
 * O CHAT EMBAIXO DO PDF (05/10/2026, retorno de um usuário). O visor cobre a
 * conversa da direita; a dúvida sobre o achado nascia e não tinha onde ir sem
 * fechar o documento. É a MESMA conversa do Nexo: a pergunta sai pelo composer
 * dela, com o achado e a página no começo, e a resposta é lida das mensagens.
 */
function ChatNoVisor({ chat, achado, pagina }: { chat: ChatDoVisor; achado: AchadoDaTela | undefined; pagina: number }) {
  const [texto, setTexto] = useState("");
  const [desde, setDesde] = useState<number | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  const novas = desde === null ? [] : chat.mensagens.slice(desde).filter((m) => m.content.trim());
  const esperando = desde !== null && (novas.length === 0 || novas[novas.length - 1].role === "user");

  const ultima = novas[novas.length - 1]?.content ?? "";
  useEffect(() => {
    fim.current?.scrollIntoView({ block: "nearest" });
  }, [novas.length, ultima]);

  const enviar = () => {
    const pergunta = texto.trim();
    if (!pergunta || !achado) return;
    if (desde === null) setDesde(chat.mensagens.length);
    chat.enviar(textoDaPergunta(achado, pagina, pergunta));
    setTexto("");
  };

  return (
    <section className="vm-chat" aria-label="Perguntar ao Nexo sobre o achado">
      <p className="vm-chat-cabeca">
        <Orbe tamanho={12} estado={esperando ? "trabalhando" : "repouso"} />
        <b>Pergunte ao Nexo</b>
        <span>{achado ? `sobre o ${achado.id}, p. ${pagina} — a resposta também fica na conversa` : "escolha um achado"}</span>
      </p>
      {novas.length > 0 || esperando ? (
        <div className="vm-chat-mensagens">
          {novas.map((m) => {
            const sobre = m.role === "user" ? lerPerguntaSobreAchado(m.content) : null;
            return (
              <div key={m.id} className={`vm-chat-msg vm-chat-msg--${m.role === "user" ? "eu" : "nexo"}`}>
                {sobre && <RotuloDaPergunta achado={sobre} />}
                <p>{sobre ? sobre.pergunta : m.content}</p>
              </div>
            );
          })}
          {esperando && <p className="vm-chat-msg vm-chat-msg--nexo vm-chat-pensando">Nexo está lendo o memorial…</p>}
          <div ref={fim} />
        </div>
      ) : null}
      <form
        className="vm-chat-campo"
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={achado ? "Ex.: o que exatamente diverge entre as páginas?" : "Escolha um achado para perguntar"}
          aria-label="Pergunta ao Nexo sobre este achado"
          disabled={!achado}
        />
        <Botao type="submit" variante="primary" tamanho="sm" icone aria-label="Enviar pergunta (Enter)" title="Enviar (Enter)" disabled={!texto.trim() || !achado}>
          <ArrowUp />
        </Botao>
      </form>
    </section>
  );
}
/** "Página [12] de 40": digitar o número e Enter leva até ela. */
function IrParaPagina({ pagina, total, onIr }: { pagina: number; total: number; onIr: (p: number) => void }) {
  const [texto, setTexto] = useState<string | null>(null);
  const confirmar = () => {
    const n = Number(texto);
    if (texto !== null && Number.isInteger(n) && n >= 1) onIr(n);
    setTexto(null);
  };
  return (
    <label className="ds-num vm-irpara">
      Página
      <input
        inputMode="numeric"
        value={texto ?? String(pagina)}
        onChange={(e) => setTexto(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
        onFocus={(e) => e.target.select()}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Escape") setTexto(null);
        }}
        aria-label="Ir para a página"
        size={Math.max(2, String(total || pagina).length)}
      />
      {total ? ` de ${total}` : ""}
    </label>
  );
}
const ease = (c: readonly number[]) => [...c] as [number, number, number, number];

export function VisorDoMemorial({
  achados,
  url,
  arquivo,
  inicial,
  paginaInicial,
  folhas,
  chat,
  aberto,
  onFechar,
  onIrParaAchado,
}: {
  /** Os achados deste arquivo. */
  achados: AchadoDaTela[];
  url: string | null;
  arquivo: string;
  inicial: string | null;
  /** A página pedida ("Abrir p. 22" num achado entre páginas); sem ela, a primeira do achado. */
  paginaInicial?: number | null;
  /** Onde o texto não está na camada do PDF (cobertura do parecer) — para dizer por que não há grifo. */
  folhas?: FolhasSemCamada | null;
  /** A conversa do Nexo: sem ela (fora do palco), o visor não mostra o chat. */
  chat?: ChatDoVisor;
  aberto: boolean;
  onFechar: () => void;
  onIrParaAchado: (chave: string) => void;
}) {
  const { dur, mola } = useTempo();
  const paginasComAchado = useMemo(() => [...new Set(achados.flatMap((a) => a.paginas))].sort((x, y) => x - y), [achados]);
  const primeiro = achados.find((a) => a.chave === inicial) ?? achados.find((a) => !a.desfecho) ?? achados[0];
  const [pagina, setPagina] = useState(paginaInicial ?? primeiro?.paginas[0] ?? 1);
  const [ativo, setAtivo] = useState(primeiro?.chave ?? "");
  const [zoom, setZoom] = useState(1);
  const [total, setTotal] = useState(0);

  /*
   * O GRIFO PODE ESTAR EM OUTRA PÁGINA DO ACHADO: ele cita "1, 2" e o trecho
   * está na 2. Abrindo na primeira, o visor mostrava a página sem marca. Se o
   * trecho não está aqui, vai à próxima página do achado — uma volta só.
   */
  const [procurando, setProcurando] = useState(true);
  // O último veredito do grifo, por página: é ele que acende o aviso "sem grifo".
  const [casou, setCasou] = useState<{ pagina: number; achou: boolean } | null>(null);
  const aoGrifo = useCallback(
    (achou: boolean, p: number) => {
      setCasou({ pagina: p, achou });
      if (!procurando) return;
      const doAtivoAgora = achados.find((a) => a.chave === ativo);
      const proxima = doAtivoAgora?.paginas.find((x) => x > p);
      if (achou || !proxima) setProcurando(false);
      else setPagina(proxima);
    },
    [procurando, achados, ativo],
  );

  const daPagina = achados.filter((a) => a.paginas.includes(pagina));
  const doAtivo = achados.find((a) => a.chave === ativo && a.paginas.includes(pagina)) ?? daPagina[0];
  // Os candidatos DESTA página: no achado entre páginas, a p. 22 procura o
  // trecho da p. 22, e não o da p. 10 (ver lib/grifo-do-achado.ts).
  // Sem memo: o visor do PDF já reduz a lista a uma chave estável (`needle`).
  const grifo = doAtivo ? candidatosDoGrifo(doAtivo.bruto, pagina) : undefined;

  /*
   * FOLHEAR NÃO TROCA DE ACHADO (07/10/2026). `ir` escolhia o primeiro achado
   * da página nova: no achado que se repete em várias páginas, avançar para a
   * próxima grifava OUTRO achado que estivesse lá. O ativo só muda quando a
   * página nova não tem nada dele.
   */
  const ir = (p: number) => {
    setProcurando(false);
    const alvo = Math.max(1, total ? Math.min(total, p) : p);
    setPagina(alvo);
    const atual = achados.find((x) => x.chave === ativo);
    if (atual?.paginas.includes(alvo)) return;
    const a = achados.find((x) => x.paginas.includes(alvo));
    if (a) setAtivo(a.chave);
  };
  // As páginas DO achado aberto, para andar entre elas sem passar pelas outras.
  const paginasDoAtivo = doAtivo ? [...new Set(doAtivo.paginas)].sort((x, y) => x - y) : [];
  const posicaoNoAtivo = paginasDoAtivo.indexOf(pagina);
  const anteriorDoAtivo = [...paginasDoAtivo].reverse().find((p) => p < pagina);
  const proximaDoAtivo = paginasDoAtivo.find((p) => p > pagina);
  const zoomPasso = (passo: number) => setZoom((z) => ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, ZOOMS.indexOf(z) + passo))]);
  const vizinha = (passo: number) => {
    const lista = paginasComAchado;
    if (!lista.length) return;
    const i = lista.indexOf(pagina);
    if (i < 0) return ir(passo > 0 ? (lista.find((p) => p > pagina) ?? lista[0]) : ([...lista].reverse().find((p) => p < pagina) ?? lista[lista.length - 1]));
    ir(lista[(i + passo + lista.length) % lista.length]);
  };

  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea")) {
        // No campo do chat, Esc só sai do campo; o visor fecha no segundo Esc.
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onFechar();
      } else if (e.key === "ArrowRight" && e.shiftKey) {
        if (proximaDoAtivo) ir(proximaDoAtivo);
      } else if (e.key === "ArrowLeft" && e.shiftKey) {
        if (anteriorDoAtivo) ir(anteriorDoAtivo);
      } else if (e.key === "ArrowRight") ir(pagina + 1);
      else if (e.key === "ArrowLeft") ir(pagina - 1);
      else if ((e.key === "+" || e.key === "=") && !e.ctrlKey && !e.metaKey) zoomPasso(1);
      else if (e.key === "-" && !e.ctrlKey && !e.metaKey) zoomPasso(-1);
      else if (e.key.toLowerCase() === "j" && !e.ctrlKey && !e.metaKey) vizinha(1);
      else if (e.key.toLowerCase() === "k" && !e.ctrlKey && !e.metaKey) vizinha(-1);
    };
    document.addEventListener("keydown", tecla, true);
    return () => document.removeEventListener("keydown", tecla, true);
  });

  const nivelDe = (a: AchadoDaTela) => a.nivel;

  /*
   * NUM PORTAL, na raiz `.ds` (02/10/2026): dentro do palco, o empilhamento dele
   * deixava o topo e a coluna do chat por cima do visor. Na raiz, o CSS do ds
   * continua valendo e o visor cobre a tela inteira, como no lab.
   */
  if (typeof document === "undefined") return null;
  const raiz = document.querySelector(".ds") ?? document.body;

  return createPortal(
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
                <b>{arquivo}</b>
                <span>Memorial descritivo</span>
              </div>
              <div className="vm-navegar">
                <Botao variante="quiet" tamanho="sm" icone aria-label="Página anterior (←)" onClick={() => ir(pagina - 1)} disabled={pagina <= 1}>
                  <ChevronLeft />
                </Botao>
                <IrParaPagina pagina={pagina} total={total} onIr={ir} />
                <Botao variante="quiet" tamanho="sm" icone aria-label="Próxima página (→)" onClick={() => ir(pagina + 1)} disabled={Boolean(total) && pagina >= total}>
                  <ChevronRight />
                </Botao>
              </div>
              <div className="vm-zoom">
                <Botao variante="quiet" tamanho="sm" icone aria-label="Diminuir zoom (−)" title="Diminuir zoom (−)" onClick={() => zoomPasso(-1)} disabled={zoom === ZOOMS[0]}>
                  <Minus />
                </Botao>
                <span className="ds-num">{Math.round(zoom * 100)}%</span>
                <Botao variante="quiet" tamanho="sm" icone aria-label="Aumentar zoom (+)" title="Aumentar zoom (+)" onClick={() => zoomPasso(1)} disabled={zoom === ZOOMS[ZOOMS.length - 1]}>
                  <Plus />
                </Botao>
              </div>
              <Botao variante="quiet" tamanho="sm" icone aria-label="Fechar (Esc)" title="Fechar (Esc)" onClick={onFechar}>
                <X />
              </Botao>
            </header>

            <div className="vm-corpo">
              <div className="vm-esquerda">
              {doAtivo && paginasDoAtivo.length > 1 && (
                <nav className={`vm-doachado vm--${doAtivo.nivel}`} aria-label={`Páginas do ${doAtivo.id}`}>
                  <span className="vm-doachado-rotulo">
                    <i aria-hidden /> <b>{doAtivo.id}</b> em {paginasDoAtivo.length} páginas
                    {posicaoNoAtivo >= 0 && <span className="ds-num"> · {posicaoNoAtivo + 1} de {paginasDoAtivo.length}</span>}
                  </span>
                  <Botao variante="quiet" tamanho="sm" icone aria-label="Página anterior deste achado (Shift ←)" title="Página anterior deste achado (Shift ←)" onClick={() => anteriorDoAtivo && ir(anteriorDoAtivo)} disabled={!anteriorDoAtivo}>
                    <ChevronLeft />
                  </Botao>
                  <span className="vm-doachado-paginas">
                    {paginasDoAtivo.map((p) => (
                      <button key={p} type="button" className={p === pagina ? "vm-doachado-aqui" : undefined} aria-current={p === pagina ? "page" : undefined} onClick={() => ir(p)}>
                        p. {p}
                      </button>
                    ))}
                  </span>
                  <Botao variante="quiet" tamanho="sm" icone aria-label="Próxima página deste achado (Shift →)" title="Próxima página deste achado (Shift →)" onClick={() => proximaDoAtivo && ir(proximaDoAtivo)} disabled={!proximaDoAtivo}>
                    <ChevronRight />
                  </Botao>
                </nav>
              )}
              <div className="vm-mesa vm-mesa--pdf">
                {url ? (
                  <div className="vm-pdf">
                    {!procurando && casou?.pagina === pagina && !casou.achou && grifo?.length ? (
                      <p className="vm-sem-grifo" role="status">
                        <SearchX size={15} strokeWidth={1.75} aria-hidden />
                        <span>{porQueSemGrifo(pagina, folhas)}</span>
                      </p>
                    ) : null}
                    <AuditPdfViewer url={url} page={pagina} highlight={grifo} zoom={zoom} onNumPages={setTotal} onGrifo={aoGrifo} />
                    {/* No pé da folha, onde a leitura acaba: o achado continua adiante. */}
                    {proximaDoAtivo && doAtivo && (
                      <Botao variante="ghost" tamanho="sm" className={`vm-continua vm--${doAtivo.nivel}`} onClick={() => ir(proximaDoAtivo)}>
                        {doAtivo.id} continua na p. {proximaDoAtivo} <ArrowRight />
                      </Botao>
                    )}
                  </div>
                ) : (
                  <p className="vm-sem">O arquivo deste memorial não está nesta máquina. Anexe-o de novo na conversa para ver o trecho na página.</p>
                )}
              </div>
              {chat && <ChatNoVisor chat={chat} achado={doAtivo} pagina={pagina} />}
              </div>

              <aside className="vm-lado">
                <h3>{daPagina.length ? `Nesta página, ${daPagina.length === 1 ? "1 achado" : `${daPagina.length} achados`}` : "Nesta página"}</h3>
                {daPagina.map((a) => (
                  <button key={a.chave} type="button" className={`vm-achado vm--${nivelDe(a)}${a.chave === doAtivo?.chave ? " vm-achado--ativo" : ""}`} onClick={() => setAtivo(a.chave)}>
                    <span className="vm-achado-id">
                      <i /> {a.id} <small>{NIVEIS.find((x) => x.id === a.nivel)?.nome}</small>
                    </span>
                    <b>{a.titulo}</b>
                    {a.desfecho && <span className="vm-achado-feito">{NOME_DO_DESFECHO[a.desfecho.tipo]}</span>}
                    {a.chave === doAtivo?.chave && (
                      <span
                        className="vm-achado-abrir"
                        role="link"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onIrParaAchado(a.chave);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") onIrParaAchado(a.chave);
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
                      const doP = achados.filter((a) => a.paginas.includes(p));
                      const pior = NIVEIS.find((n) => doP.some((a) => a.nivel === n.id))?.id;
                      return (
                        <button key={p} type="button" className={`vm-pag vm--${pior}${p === pagina ? " vm-pag--aqui" : ""}`} onClick={() => ir(p)}>
                          {p}
                          {doP.length > 1 && <small>{doP.length}</small>}
                        </button>
                      );
                    })}
                  </div>
                  <p className="rs-nota">
                    <Tecla>J</Tecla> <Tecla>K</Tecla> entre elas, <Tecla>←</Tecla> <Tecla>→</Tecla> folheia, <Tecla>Shift</Tecla> <Tecla>→</Tecla> segue o achado, <Tecla>+</Tecla> <Tecla>−</Tecla> zoom
                  </p>
                </div>
              </aside>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    raiz,
  );
}
