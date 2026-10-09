"use client";

import { ReactFlowProvider, useReactFlow, type Node, type OnNodeDrag, type OnNodesChange } from "@xyflow/react";
import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react";
import { MessageSquarePlus, PanelLeftClose, PanelRightClose, Search } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Botao, Orbe, Tecla } from "@/components/ds/basicos";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import { useIr } from "../_comum/prototipo";
import { Campo } from "../conversa/tela-conversa";
import { DeVoce, Lacuna, Passo, PecaDeArquivo, RITMO, SUAVE, Saidas, Troca, type Arquivo } from "../conversa/turnos";
import { ALTURA_DO_NO, LARGURA_DA_FOLHA, montarCanvas, ondeCai, ordemPadrao, Tela } from "../mapa/canvas";
import { CartaoAtual } from "../mapa/cartoes";
import { ControlesDoZoom } from "../mapa/tela-mapa";
import { FOLHAS } from "../mapa/dados";
import { useCamera, useNosQueAndam } from "./andar";
import { FAIXAS, quadroDa, ROTEIROS, type Quadro, type SituacaoNexo } from "./roteiro";
import "../conversa/conversa.css";
import "../mapa/mapa.css";
import "../mapa/cartoes.css";
import "./nexo.css";

export type { SituacaoNexo } from "./roteiro";

/*
 * O NEXO COMO ELE É: uma tela só. À esquerda as conversas (por obra); no
 * centro o palco com o mapa do volume; à direita o chat. Montar um volume é
 * conversar: você solta os PDFs, o Nexo lê os selos e as folhas aparecem no
 * mapa; cada pedido no chat reorganiza o mapa NA FRENTE de quem pediu: as
 * folhas deslizam para o lugar novo, os papéis imprimem, a câmera vai até o
 * que mudou. Chat e mapa andam no mesmo relógio (roteiro.ts).
 */

const PAGINAS = [12, 8, 6, 7];

/** Lendo os selos: o retrato do meio da leitura (14 de 33), com a folha da vez marcada. */
const LIDAS_NA_LEITURA = 14;

/* ------------------------------ as conversas ------------------------------ */

/** As conversas, por obra. É a mesma coluna no volume e na auditoria. */
export function Conversas({ ativa = "volume" }: { ativa?: "volume" | "auditoria" }) {
  const ir = useIr();
  const pastas = [
    {
      codigo: "117-25",
      nome: "UBS da Rua São Francisco de Assis",
      cliente: "Criciúma",
      aberta: true,
      conversas: [
        { titulo: "Auditar o memorial geral", tipo: "auditoria", quando: "21:08", ativa: ativa === "auditoria" },
        { titulo: "Montar o volume", tipo: "montagem", quando: "18:02", ativa: ativa === "volume" },
        { titulo: "LD, capa e separatrizes", tipo: "montagem", quando: "29/09" },
      ],
    },
    { codigo: "SIM047-26", nome: "Quadra poliesportiva coberta do CAIC", cliente: "Criciúma", n: 2 },
    { codigo: "SIM031-26", nome: "Muro de contenção da Rua Anita Garibaldi", cliente: "Tubarão", n: 1 },
  ];
  return (
    <aside className="nw-conversas" aria-label="Conversas">
      <Botao variante="ghost" tamanho="sm" className="nw-nova" onClick={() => ir("conversa", "nova")}>
        <MessageSquarePlus size={14} /> Nova conversa <Tecla>N</Tecla>
      </Botao>
      <label className="mp-busca nw-busca">
        <Search size={14} />
        <input placeholder="Buscar conversa" aria-label="Buscar conversa" />
      </label>
      <div className="nw-pastas">
        {pastas.map((p) => (
          <section key={p.codigo} className={`nw-pasta${p.aberta ? " nw-pasta--aberta" : ""}`}>
            <p className="nw-pasta-cabeca">
              <MarcaDaPrefeitura prefeitura={p.cliente} forma="sinal" />
              <span className="mp-mono">{p.codigo}</span>
              <span className="nw-pasta-nome">{p.nome}</span>
              {!p.aberta && <span className="ds-num mp-g-fraco">{p.n}</span>}
            </p>
            {p.conversas && (
              <ul>
                {p.conversas.map((c) => (
                  <li key={c.titulo} className={c.ativa ? "nw-ativa" : undefined} onClick={() => !c.ativa && (c.tipo === "auditoria" ? ir("nexo-auditoria", "pronta") : c.titulo === "Montar o volume" ? ir("nexo", "lido") : ir("conversa", "plano-de-geracao"))}>
                    <span className="nw-conversa-titulo">{c.titulo}</span>
                    <span className="nw-conversa-meta">
                      <span>{c.tipo}</span>
                      <span className="ds-num">{c.quando}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </aside>
  );
}

/* ------------------------------ o chat ------------------------------ */

/**
 * A resposta do Nexo, montada pelo relógio: cada parte entra quando a batida
 * dela chega. As que já estavam lá na abertura entram em escada; as que chegam
 * depois entram sozinhas, na hora em que o mapa muda.
 */
function Resposta({ partes }: { partes: [string, ReactNode | false][] }) {
  const { k } = useTempo();
  const visiveis = partes.filter(([, p]) => p !== false);
  // as partes que já estavam lá na abertura (lidas uma vez, na montagem)
  const [naAbertura] = useState(() => new Set(visiveis.map(([c]) => c)));
  return (
    <div className="cx-nexo">
      <motion.span className="cx-nexo-marca" aria-hidden initial={false} animate={{ opacity: 1, scale: 1 }} transition={{ duration: RITMO.entra * k, delay: 0.3 * k, ease: SUAVE }}>
        <Orbe tamanho={16} />
      </motion.span>
      <div className="cx-nexo-corpo">
        {visiveis.map(([chave, p]) => (
          <motion.div
            key={chave}
            className="cx-parte"
            initial={naAbertura.has(chave) ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: RITMO.entra * k, ease: SUAVE }}
          >
            {p}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** Lendo: a barra fina e a conta, que andam junto com as folhas que acendem no mapa. */
function Progresso({ lidas }: { lidas: number }) {
  return (
    <div className="nw-progresso">
      <span className="nw-progresso-barra" aria-hidden>
        <i style={{ transform: `scaleX(${lidas / FOLHAS.length})` }} />
      </span>
      <span className="ds-num">
        {lidas} de {FOLHAS.length} folhas
      </span>
    </div>
  );
}

/** Gerando no ritmo do mapa: a linha vira arquivo no instante em que o papel imprime. */
function GerandoNoRitmo({ prontos }: { prontos: number }) {
  const itens = [
    { id: "ld", fazendo: "Montando as 2 listas de documentos", feito: { nome: "LD_117-25_TOMO-01.pdf", paginas: 3 }, mais: 1 },
    { id: "capa", fazendo: "Desenhando as 2 capas", feito: { nome: "Capa_117-25_TOMO-01.pdf", paginas: 1 }, mais: 1 },
    { id: "sep", fazendo: "Gerando as 4 separatrizes", feito: { nome: "Separatrizes_117-25_TOMO-01.pdf", paginas: 2 }, mais: 1 },
  ];
  return (
    <div className="cx-pecas cx-pecas--coluna">
      {itens.map((it, i) => (
        <Troca key={it.id} chave={i < prontos ? "feito" : i === prontos ? "agora" : "fila"} className="cx-gerando-linha">
          {i < prontos ? (
            <span className="nw-peca-e-mais">
              <PecaDeArquivo gerado nova a={it.feito} />
              <span className="nw-mais ds-num" title="e a do tomo 02">
                +{it.mais}
              </span>
            </span>
          ) : i === prontos ? (
            <Passo texto={`${it.fazendo}…`} emCurso />
          ) : (
            <span className="cx-fila">{it.fazendo}, na fila</span>
          )}
        </Troca>
      ))}
    </div>
  );
}

function Fio({ s, b, lidas }: { s: SituacaoNexo; b: number; lidas: number }): ReactNode {
  const lendoAgora = FAIXAS.findIndex((f) => lidas < f.ate);
  const pranchas: Arquivo[] = FAIXAS.map((f, i) => ({ nome: f.nome, paginas: PAGINAS[i], lendo: s === "soltou" && b >= 1 && i === lendoAgora }));
  const pedido = <DeVoce arquivos={pranchas} texto="monta o volume da UBS com essas pranchas" atraso={-1} />;
  switch (s) {
    case "soltou": {
      const leu = lidas >= FOLHAS.length;
      return (
        <>
          {pedido}
          {b >= 1 && (
            <Resposta
              partes={[
                ["passo", <Passo key="p" texto={leu ? "Li 33 folhas de 4 arquivos, em 4 disciplinas" : "Lendo os selos das pranchas"} emCurso={!leu} />],
                ["conta", !leu && <Progresso lidas={lidas} />],
                ["texto", leu ? <p className="cx-texto">Estão todas no mapa, na ordem do volume. Já dá para pedir a divisão, a LD ou a capa.</p> : <p className="cx-texto">As folhas acendem no mapa conforme eu leio o selo de cada uma.</p>],
              ]}
            />
          )}
        </>
      );
    }
    case "lido":
      return (
        <>
          {pedido}
          <Resposta
            partes={[
              ["passo", <Passo key="p" texto="Li 33 folhas de 4 arquivos, em 4 disciplinas" />],
              ["texto", b >= 1 && <p className="cx-texto">São 412 páginas, mais do que um tomo costuma levar. Marquei no mapa 4 folhas para conferir.</p>],
              [
                "frase",
                b >= 2 && (
                  <p className="cx-frase">
                    Divido em <Lacuna valor="2 tomos" opcoes={["1 tomo", "2 tomos", "3 tomos"]} />, com o tomo 02 começando em <Lacuna valor="HID-01" opcoes={["EST-01", "HID-01", "ELE-01"]} mono />?
                  </p>
                ),
              ],
              ["saidas", b >= 2 && <Saidas itens={[{ texto: "Dividir assim", principal: true }, { texto: "Um tomo só" }]} />],
            ]}
          />
        </>
      );
    case "dividido":
      return (
        <>
          <DeVoce texto="divide em 2 tomos, a HID começa o 2" />
          <Resposta
            partes={[
              ["passo", <Passo key="p" texto={b >= 1 ? "Dividi em 2 tomos" : "Dividindo em 2 tomos"} emCurso={b < 1} />],
              ["texto", b >= 1 && <p className="cx-texto">Tomo 01 com ARQ e EST, 20 folhas e 238 páginas. Tomo 02 com HID e ELE, 13 folhas e 174 páginas. Acendi no mapa o que mudou de lugar.</p>],
              ["saidas", b >= 2 && <Saidas itens={[{ texto: "Desfazer" }]} />],
            ]}
          />
        </>
      );
    case "tirou":
      return (
        <>
          <DeVoce texto="tira a ARQ-12, a folha foi cancelada" />
          <Resposta
            partes={[
              ["passo", <Passo key="p" texto={b >= 1 ? "Tirei a ARQ-12 do tomo 01" : "Tirando a ARQ-12"} emCurso={b < 1} />],
              ["texto", b >= 1 && <p className="cx-texto">Ficam 19 folhas no tomo 01. Ela continua riscada no mapa até você gerar, caso queira de volta.</p>],
              ["saidas", b >= 1 && <Saidas itens={[{ texto: "Pode gerar", principal: true }, { texto: "Restaurar a ARQ-12" }]} />],
            ]}
          />
        </>
      );
    case "gerando":
      return (
        <>
          <DeVoce texto="pode gerar" />
          <Resposta
            partes={[
              ["passo", <Passo key="p" texto={b >= 5 ? "Gerei para os 2 tomos" : "Gerando para os 2 tomos"} emCurso={b < 5} />],
              ["pecas", b >= 2 && <GerandoNoRitmo prontos={Math.max(0, b - 2)} />],
              ["saidas", b >= 5 && <Saidas itens={[{ texto: "Monta os volumes", principal: true }, { texto: "Baixar os editáveis (ZIP)" }]} />],
            ]}
          />
        </>
      );
    case "montado":
      return (
        <>
          <DeVoce texto="monta os 2 volumes" />
          <Resposta
            partes={[
              ["passo", <Passo key="p" texto={b >= 3 ? "Montei os 2 volumes e conferi" : b >= 2 ? "Montando o volume do tomo 02" : "Montando o volume do tomo 01"} emCurso={b < 3} />],
              ["v1", b >= 1 && <PecaDeArquivo gerado nova a={{ nome: "Volume_117-25_TOMO-01.pdf", paginas: 238 }} />],
              ["v2", b >= 3 && <PecaDeArquivo gerado nova a={{ nome: "Volume_117-25_TOMO-02.pdf", paginas: 174 }} />],
              ["saidas", b >= 3 && <Saidas itens={[{ texto: "Baixar os 2 (ZIP)", principal: true }, { texto: "Baixar os editáveis (ZIP)" }]} />],
            ]}
          />
        </>
      );
    case "desatualizado":
      return (
        <>
          <DeVoce texto="o título da LD do tomo 1 tá errado, é UBS da Rua São Francisco de Assis" />
          <Resposta
            partes={[
              ["passo", <Passo key="p" texto={b >= 1 ? "Corrigi a LD do tomo 01" : "Corrigindo a LD do tomo 01"} emCurso={b < 1} />],
              ["aviso", b >= 3 && <Passo texto="O volume do tomo 01 foi montado antes da correção" aviso />],
              ["texto", b >= 3 && <p className="cx-texto">O PDF que você baixou ainda tem a LD antiga. O tomo 02 não mudou.</p>],
              ["saidas", b >= 3 && <Saidas itens={[{ texto: "Remontar e baixar", principal: true }, { texto: "Deixar como está" }]} />],
            ]}
          />
        </>
      );
  }
}

/* ------------------------------ o palco ------------------------------ */

type Fileiras = ReturnType<typeof montarCanvas>["fileiras"];
interface Feito {
  id: string;
  texto: ReactNode;
  antes: Map<number, string[]>;
}

/** A frase do que o arrasto fez: para onde a folha foi, em palavras de quem monta volume. */
function fraseDoArrasto(id: string, de: number, para: number, depoisDe: string | undefined, tomos: number): ReactNode {
  const onde = depoisDe ? (
    <>
      depois da <b>{depoisDe}</b>
    </>
  ) : (
    "no começo"
  );
  return (
    <span>
      <b>{id}</b> {de !== para && tomos > 1 ? <>foi para o tomo {String(para).padStart(2, "0")}, </> : <>agora vem </>}
      {onde}
    </span>
  );
}

function Palco({ q, lidas }: { q: Quadro; lidas: number }) {
  const reduzir = !!useReducedMotionConfig();
  const [ordem, setOrdem] = useState<Map<number, string[]> | null>(null);
  const [arrasto, setArrasto] = useState<{ id: string; pos: { x: number; y: number } } | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);

  const alvo = useMemo(
    () =>
      montarCanvas({
        lidas,
        sel: null,
        filtro: () => true,
        estadoDoDoc: (d) => q.docs(d.id),
        estadoDoVolume: (n) => q.vol(n),
        comSobras: false,
        tomos: q.tomos,
        destaque: feito ? new Set([...(q.destaque ?? []), feito.id]) : q.destaque,
        removidas: q.removidas,
        sem: q.sem,
        corteAntesDe: q.corte,
        ordemDosTomos: ordem ?? undefined,
      }),
    [q, lidas, ordem, feito],
  );
  // Só o que a mão fez anda: soltar uma folha acomoda tudo em 240 ms. Abrir a tela não anima nada.
  const { nos, ajustar } = useNosQueAndam(alvo.nodes, reduzir ? 0 : 0.24);
  const pronto = useCamera(alvo.nodes, q.foco, 0.9, 0, false);
  const { fitView } = useReactFlow();

  const posicoes = useMemo(() => new Map(alvo.nodes.filter((n) => n.type === "folha").map((n) => [n.id, n.position])), [alvo]);
  const arrastandoFolha = arrasto ? posicoes.has(arrasto.id) : false;
  const cai = arrasto && arrastandoFolha ? ondeCai(alvo.fileiras as Fileiras, posicoes, arrasto.id, { x: arrasto.pos.x + LARGURA_DA_FOLHA / 2, y: arrasto.pos.y + ALTURA_DO_NO / 2 }) : null;

  const vistos = useMemo(() => {
    // Os papéis (capa, separatrizes, LD, volume) também saem na mão, para puxar o fio; soltos, voltam ao lugar.
    const soltos = nos.map((n) => (n.type === "doc" ? { ...n, draggable: true } : n));
    if (!arrasto) return soltos;
    const r = soltos.map((n) =>
      n.id === arrasto.id
        ? { ...n, position: arrasto.pos, className: "mp-erguida", dragging: true }
        : n.id === cai?.antes
          ? { ...n, className: "mp-abre-antes" }
          : n.id === cai?.depois
            ? { ...n, className: "mp-abre-depois" }
            : n,
    );
    return cai ? [...r, { id: "fresta", type: "fresta", position: cai.fresta, data: {}, draggable: false, selectable: false, zIndex: 999 } as Node] : r;
  }, [nos, arrasto, cai]);

  const aoMudar: OnNodesChange = (mudancas) => {
    for (const m of mudancas) if (m.type === "position" && m.position && m.dragging) setArrasto({ id: m.id, pos: m.position });
  };

  const aoSoltar: OnNodeDrag = (_, no) => {
    setArrasto(null);
    const atual = ordem ?? ordemPadrao(q.tomos, q.sem);
    ajustar(no.id, no.position);
    if (no.type === "doc" || !cai) return;
    const de = [...atual.entries()].find(([, ids]) => ids.includes(no.id))?.[0] ?? cai.tomo;
    const nova = new Map([...atual.entries()].map(([t, ids]) => [t, ids.filter((id) => id !== no.id)]));
    const destino = [...(nova.get(cai.tomo) ?? [])];
    destino.splice(cai.indice, 0, no.id);
    nova.set(cai.tomo, destino);
    const igual = [...atual.entries()].every(([t, ids]) => ids.join() === (nova.get(t) ?? []).join());
    if (igual) return;
    setOrdem(nova);
    setFeito({ id: no.id, antes: atual, texto: fraseDoArrasto(no.id, de, cai.tomo, cai.antes, q.tomos.length) });
  };

  const desfazer = () => {
    if (!feito) return;
    setOrdem(feito.antes);
    setFeito(null);
  };

  // Ctrl+Z desfaz o último arrasto.
  useEffect(() => {
    if (!feito) return;
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        desfazer();
      }
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  });

  return (
    <div className={`nw-canvas${pronto ? " nw-canvas--pronto" : ""}`}>
      <Tela nodes={vistos} edges={alvo.edges} onFolha={() => {}} onVazio={() => {}} zoomMinimo={0.08} minimapa={false} arrastavel onNodesChange={aoMudar} onNodeDragStop={aoSoltar} />
      <ControlesDoZoom onEnquadrar={() => fitView({ padding: 0.08, duration: 240 })} />
      <AnimatePresence>
        {feito && (
          <motion.div
            key={feito.id + [...(ordem?.values() ?? [])].join()}
            className="nw-feito"
            role="status"
            initial={{ opacity: 0, y: 6, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, x: "-50%" }}
            transition={{ duration: 0.24, ease: SUAVE }}
          >
            {feito.texto}
            <button type="button" onClick={desfazer}>
              Desfazer <Tecla>Ctrl Z</Tecla>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** A aba Auditoria do palco leva à conversa da auditoria (no protótipo). */
function NoPalco() {
  const ir = useIr();
  return (
    <button type="button" role="tab" aria-selected={false} onClick={() => ir("nexo-auditoria", "pronta")}>
      Auditoria
    </button>
  );
}

/* ------------------------------ a tela ------------------------------ */

export function TelaNexo({ situacao }: { situacao: SituacaoNexo }) {
  // A tela abre no estado da situação, pronta para ler e mexer: nada roda sozinho na frente de quem olha.
  const q = useMemo(() => quadroDa(situacao, ROTEIROS[situacao].batidas.length), [situacao]);
  const lidas = situacao === "soltou" ? LIDAS_NA_LEITURA : FOLHAS.length;
  const lendo = situacao === "soltou";
  const estado = lendo ? `lendo os selos, ${lidas} de ${FOLHAS.length}` : q.estado;
  const [semConversas, setSemConversas] = useState(false);
  const [semChat, setSemChat] = useState(false);
  return (
    <CartaoAtual.Provider value="carimbo">
      <div className="mp nw">
        <Topo atual="Nexo" />
        <div className={`nw-mesa${semConversas ? " nw-mesa--sem-conversas" : ""}${semChat ? " nw-mesa--sem-chat" : ""}`}>
          <Conversas />

          <main className="nw-palco" aria-label="Organização dos arquivos">
            <header className="nw-palco-cabeca">
              <span className="mp-trilha nw-obra">
                <MarcaDaPrefeitura prefeitura="Criciúma" forma="sinal" />
                <span className="mp-mono">117-25</span>
                <span>Mapa do volume</span>
                <span className="nw-estado">{estado}</span>
              </span>
              <span className="nw-vistas" role="tablist" aria-label="Vistas do palco">
                <button type="button" role="tab" aria-selected>
                  Mapa do volume
                </button>
                <NoPalco />
              </span>
              <span className="nw-espaco">
                <button type="button" aria-pressed={semConversas} aria-label={semConversas ? "Mostrar as conversas" : "Recolher as conversas"} title={semConversas ? "Mostrar as conversas" : "Recolher as conversas"} onClick={() => setSemConversas((v) => !v)}>
                  <PanelLeftClose size={15} />
                </button>
                <button type="button" aria-pressed={semChat} aria-label={semChat ? "Mostrar o chat" : "Recolher o chat"} title={semChat ? "Mostrar o chat" : "Recolher o chat"} onClick={() => setSemChat((v) => !v)}>
                  <PanelRightClose size={15} />
                </button>
              </span>
            </header>
            <ReactFlowProvider>
              <Palco q={q} lidas={lidas} />
            </ReactFlowProvider>
          </main>

          <aside className="nw-chat cx" aria-label="Nexo">
            <header className="nw-chat-cabeca">
              <span className="nw-chat-titulo">Montar o volume</span>
              <span className="mp-g-fraco">117-25</span>
            </header>
            <div className="cx-fio nw-fio">
              <Fio s={situacao} b={ROTEIROS[situacao].batidas.length} lidas={lidas} />
            </div>
            <div className="nw-campo">
              <Campo respondendo={lendo} />
            </div>
          </aside>
        </div>
      </div>
    </CartaoAtual.Provider>
  );
}
