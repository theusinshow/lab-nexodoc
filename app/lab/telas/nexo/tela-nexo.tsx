"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { FileText, MessageSquarePlus, PanelLeftClose, PanelRightClose, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { Botao, Orbe, Tecla } from "@/components/ds/basicos";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import { Campo } from "../conversa/tela-conversa";
import { DeVoce, Lacuna, Passo, PecaDeArquivo, RITMO, SUAVE, Saidas, Troca, type Arquivo } from "../conversa/turnos";
import { montarCanvas, Tela } from "../mapa/canvas";
import { CartaoAtual } from "../mapa/cartoes";
import { FOLHAS } from "../mapa/dados";
import { useCamera, useNosQueAndam } from "./andar";
import { FAIXAS, focoDaLeitura, quadroDa, ROTEIROS, type Quadro, type SituacaoNexo } from "./roteiro";
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
const TICK_DA_LEITURA = 0.2;

/** O relógio da situação: em que batida estamos, e quantas folhas já foram lidas. */
function useRelogio(s: SituacaoNexo) {
  const { k } = useTempo();
  const reduzir = useReducedMotion();
  const batidas = ROTEIROS[s].batidas;
  const [b, setB] = useState(reduzir ? batidas.length : 0);
  const [lidas, setLidas] = useState(s === "soltou" && !reduzir ? 0 : FOLHAS.length);
  const q = useMemo(() => quadroDa(s, b), [s, b]);

  useEffect(() => {
    if (reduzir) return;
    const ts = batidas.map((bt, i) => setTimeout(() => setB(i + 1), bt.em * 1000 * k));
    return () => ts.forEach(clearTimeout);
  }, [batidas, k, reduzir]);

  useEffect(() => {
    if (!q.lendo || lidas >= FOLHAS.length) return;
    const t = setTimeout(() => setLidas((n) => n + 1), (lidas === 0 ? 0.7 : TICK_DA_LEITURA) * 1000 * k);
    return () => clearTimeout(t);
  }, [q.lendo, lidas, k]);

  const fim = b >= batidas.length && lidas >= FOLHAS.length;
  return { b, q, lidas, fim };
}

/* ------------------------------ as conversas ------------------------------ */

function Conversas() {
  const pastas = [
    {
      codigo: "117-25",
      nome: "UBS da Rua São Francisco de Assis",
      cliente: "Criciúma",
      aberta: true,
      conversas: [
        { titulo: "Montar o volume", tipo: "montagem", quando: "18:02", ativa: true },
        { titulo: "Auditar o memorial geral", tipo: "auditoria", quando: "17:44" },
        { titulo: "LD, capa e separatrizes", tipo: "montagem", quando: "29/09" },
      ],
    },
    { codigo: "SIM047-26", nome: "Quadra poliesportiva coberta do CAIC", cliente: "Criciúma", n: 2 },
    { codigo: "SIM031-26", nome: "Muro de contenção da Rua Anita Garibaldi", cliente: "Tubarão", n: 1 },
  ];
  return (
    <aside className="nw-conversas" aria-label="Conversas">
      <Botao variante="ghost" tamanho="sm" className="nw-nova">
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
                  <li key={c.titulo} className={c.ativa ? "nw-ativa" : undefined}>
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
  const naAbertura = useRef<Set<string> | null>(null);
  const visiveis = partes.filter(([, p]) => p !== false);
  if (naAbertura.current === null) naAbertura.current = new Set(visiveis.map(([c]) => c));
  return (
    <div className="cx-nexo">
      <motion.span className="cx-nexo-marca" aria-hidden initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: RITMO.entra * k, delay: 0.3 * k, ease: SUAVE }}>
        <Orbe tamanho={16} />
      </motion.span>
      <div className="cx-nexo-corpo">
        {visiveis.map(([chave, p], i) => (
          <motion.div
            key={chave}
            className="cx-parte"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: RITMO.entra * k, delay: (naAbertura.current!.has(chave) ? 0.38 + i * RITMO.escada : 0.05) * k, ease: SUAVE }}
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
  const pedido = <DeVoce arquivos={pranchas} texto="monta o volume da UBS com essas pranchas" atraso={s === "soltou" ? 0 : -1} />;
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

/** Antes da leitura: os PDFs pousam no palco, empilhados, e o palco diz o que chegou. */
function Chegando() {
  const { k } = useTempo();
  return (
    <motion.div className="nw-chegando" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.985 }} transition={{ duration: RITMO.entra * k, ease: SUAVE }}>
      <div className="nw-chegando-pilha">
        {FAIXAS.map((f, i) => (
          <motion.span
            key={f.nome}
            className="nw-chegando-pdf"
            initial={{ opacity: 0, y: -18, rotate: (i - 1.5) * 2.5 }}
            animate={{ opacity: 1, y: 0, rotate: (i - 1.5) * 1.2 }}
            transition={{ duration: 0.6 * k, delay: (0.1 + i * 0.09) * k, ease: SUAVE }}
            style={{ zIndex: 4 - i }}
          >
            <FileText size={13} />
            <span className="mp-mono">{f.nome}</span>
            <span className="ds-num">{PAGINAS[i]} p.</span>
          </motion.span>
        ))}
      </div>
      <p>4 PDFs, 33 páginas</p>
    </motion.div>
  );
}

function Palco({ s, q, lidas }: { s: SituacaoNexo; q: Quadro; lidas: number }) {
  const { k } = useTempo();
  const reduzir = useReducedMotion();
  const duracao = reduzir ? 0 : 1.1 * k;
  const alvo = useMemo(
    () =>
      q.vazio
        ? { nodes: [], edges: [] }
        : montarCanvas({
            lidas,
            sel: null,
            filtro: () => true,
            estadoDoDoc: (d) => q.docs(d.id),
            estadoDoVolume: (n) => q.vol(n),
            comSobras: false,
            tomos: q.tomos,
            destaque: q.destaque,
            removidas: q.removidas,
            sem: q.sem,
            corteAntesDe: q.corte,
          }),
    [q, lidas],
  );
  const nos = useNosQueAndam(alvo.nodes, duracao);
  // Lendo, a câmera acompanha a frente da leitura; ao terminar, recua para o volume inteiro.
  const foco = q.lendo ? (lidas < 4 ? q.foco : focoDaLeitura(lidas)) : q.foco;
  const pronto = useCamera(alvo.nodes, foco, 0.9, reduzir ? 0 : (q.lendo ? 0.9 : 1.15) * k);
  return (
    <div className={`nw-canvas${pronto ? " nw-canvas--pronto" : ""}${s === "soltou" ? " nw-revela" : ""}${q.pingar ? " nw-pingar" : ""}`}>
      <Tela nodes={nos} edges={alvo.edges} onFolha={() => {}} onVazio={() => {}} zoomMinimo={0.08} minimapa={false} />
      <AnimatePresence>{q.vazio && <Chegando key="chegando" />}</AnimatePresence>
    </div>
  );
}

/* ------------------------------ a tela ------------------------------ */

export function TelaNexo({ situacao }: { situacao: SituacaoNexo }) {
  const { k } = useTempo();
  const { b, q, lidas, fim } = useRelogio(situacao);
  const estado = q.lendo && lidas < FOLHAS.length ? `lendo os selos, ${lidas} de ${FOLHAS.length}` : q.lendo ? "33 folhas lidas" : q.estado;
  return (
    <CartaoAtual.Provider value="carimbo">
      <div className="mp nw" style={{ ["--k" as string]: k } as CSSProperties}>
        <Topo atual="Painel" />
        <div className="nw-mesa">
          <Conversas />

          <main className="nw-palco" aria-label="Organização dos arquivos">
            <header className="nw-palco-cabeca">
              <span className="mp-trilha nw-obra">
                <MarcaDaPrefeitura prefeitura="Criciúma" forma="sinal" />
                <span className="mp-mono">117-25</span>
                <span>Mapa do volume</span>
                <span className="nw-estado">
                  <Troca chave={q.lendo ? "lendo" : estado} y={4}>
                    {estado}
                  </Troca>
                </span>
              </span>
              <span className="nw-vistas" role="tablist" aria-label="Vistas do palco">
                <button type="button" role="tab" aria-selected>
                  Mapa do volume
                </button>
                <button type="button" role="tab" aria-selected={false}>
                  Auditoria
                </button>
              </span>
              <span className="nw-espaco">
                <button type="button" aria-label="Recolher as conversas" title="Recolher as conversas">
                  <PanelLeftClose size={15} />
                </button>
                <button type="button" aria-label="Recolher o chat" title="Recolher o chat">
                  <PanelRightClose size={15} />
                </button>
              </span>
            </header>
            <ReactFlowProvider>
              <Palco s={situacao} q={q} lidas={lidas} />
            </ReactFlowProvider>
          </main>

          <aside className="nw-chat cx" aria-label="Nexo">
            <header className="nw-chat-cabeca">
              <span className="nw-chat-titulo">Montar o volume</span>
              <span className="mp-g-fraco">117-25</span>
            </header>
            <div className="cx-fio nw-fio">
              <Fio s={situacao} b={b} lidas={lidas} />
            </div>
            <div className="nw-campo">
              <Campo respondendo={!fim} />
            </div>
          </aside>
        </div>
      </div>
    </CartaoAtual.Provider>
  );
}
