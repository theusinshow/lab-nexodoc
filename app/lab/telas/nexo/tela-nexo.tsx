"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { motion } from "motion/react";
import { MessageSquarePlus, PanelLeftClose, PanelRightClose, Search } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import { Campo } from "../conversa/tela-conversa";
import { DeVoce, DoNexo, Gerando, Lacuna, Passo, PecaDeArquivo, RITMO, SUAVE, Saidas, type Arquivo } from "../conversa/turnos";
import { montarCanvas, Tela } from "../mapa/canvas";
import { CartaoAtual } from "../mapa/cartoes";
import { FOLHAS, TOMOS, type Tomo } from "../mapa/dados";
import type { EstadoDoDoc } from "../mapa/documentos";
import "../conversa/conversa.css";
import "../mapa/mapa.css";
import "../mapa/cartoes.css";
import "./nexo.css";

export type SituacaoNexo = "soltou" | "lido" | "dividido" | "tirou" | "gerando" | "montado" | "desatualizado";

/*
 * O NEXO COMO ELE É: uma tela só. À esquerda as conversas (por obra); no
 * centro o palco com o mapa do volume; à direita o chat. Montar um volume é
 * conversar: você solta os PDFs, o Nexo lê os selos e as folhas aparecem no
 * mapa; cada pedido no chat ("divide em 2 tomos", "tira a ARQ-12", "monta os
 * volumes") reorganiza o mapa, e o que mudou acende uma vez.
 */

const PRANCHAS: Arquivo[] = [
  { nome: "117_25_ARQ_rev-B.pdf", paginas: 12 },
  { nome: "117_25_EST_rev-A.pdf", paginas: 8 },
  { nome: "117_25_HID_rev-A.pdf", paginas: 6 },
  { nome: "117_25_ELE_rev-A.pdf", paginas: 7 },
];
const UM_TOMO: Tomo[] = [{ n: 1, disciplinas: ["arquitetura", "estrutural", "hidrossanitario", "eletrico"], paginas: 412 }];
const DO_TOMO_2 = new Set(FOLHAS.filter((f) => f.disc === "hidrossanitario" || f.disc === "eletrico").map((f) => f.id));

interface Cena {
  tomos: Tomo[];
  lendo?: boolean;
  destaque?: Set<string>;
  removidas?: Set<string>;
  sem?: Set<string>;
  /** O trecho do mapa que o palco enquadra: o que a mensagem mexeu, legível. */
  foco: string[];
  docs: (id: string) => EstadoDoDoc;
  vol: (n: number) => EstadoDoDoc;
  estado: string;
}

const CENAS: Record<SituacaoNexo, Cena> = {
  soltou: { tomos: UM_TOMO, lendo: true, foco: ["rot-1", "capa-1", "sep-1", "ld-1", "ARQ-01", "ARQ-02", "ARQ-03", "ARQ-04"], docs: () => "a-gerar", vol: () => "a-gerar", estado: "lendo os selos" },
  lido: { tomos: UM_TOMO, foco: ["rot-1", "capa-1", "sep-1", "ld-1", "ARQ-01", "ARQ-02", "ARQ-03", "ARQ-04"], docs: () => "a-gerar", vol: () => "a-gerar", estado: "33 folhas lidas, 4 para conferir" },
  dividido: { tomos: TOMOS, destaque: DO_TOMO_2, foco: ["rot-1", "rot-2", "capa-1", "capa-2", "sep-2", "ld-2", "HID-01", "HID-02", "HID-03"], docs: () => "a-gerar", vol: () => "a-gerar", estado: "2 tomos" },
  tirou: { tomos: TOMOS, removidas: new Set(["ARQ-12"]), foco: ["ARQ-10", "ARQ-11", "ARQ-12", "EST-01", "EST-02"], docs: () => "a-gerar", vol: () => "a-gerar", estado: "2 tomos, 32 folhas" },
  gerando: { tomos: TOMOS, sem: new Set(["ARQ-12"]), destaque: new Set(["capa-1", "sep-1", "ld-1", "capa-2", "sep-2", "ld-2"]), foco: ["rot-1", "rot-2", "capa-1", "capa-2", "sep-2", "ld-2", "HID-01", "HID-02", "HID-03"], docs: () => "gerado", vol: () => "a-gerar", estado: "LD, capas e separatrizes gerados" },
  montado: { tomos: TOMOS, sem: new Set(["ARQ-12"]), destaque: new Set(["vol-1", "vol-2"]), foco: ["EST-06", "EST-07", "EST-08", "vol-1", "vol-2"], docs: () => "gerado", vol: () => "gerado", estado: "2 volumes montados" },
  desatualizado: { tomos: TOMOS, sem: new Set(["ARQ-12"]), destaque: new Set(["ld-1", "vol-1"]), foco: ["rot-1", "capa-1", "sep-1", "ld-1", "ARQ-01", "ARQ-02", "ARQ-03", "ARQ-04"], docs: (id) => (id === "ld-1" ? "corrigido" : "gerado"), vol: (n) => (n === 1 ? "desatualizado" : "gerado"), estado: "volume do tomo 01 velho" },
};

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

/* ------------------------------ o fio de cada momento ------------------------------ */

function Fio({ s }: { s: SituacaoNexo }): ReactNode {
  const pedido = <DeVoce arquivos={PRANCHAS} texto="monta o volume da UBS com essas pranchas" atraso={s === "soltou" ? 0 : -1} />;
  switch (s) {
    case "soltou":
      return (
        <>
          {pedido}
          <DoNexo atraso={0.3}>
            <Passo texto="Lendo os selos das pranchas" emCurso />
            <p className="cx-texto">As folhas aparecem no mapa conforme eu leio. Já dá para olhar as que acenderam.</p>
          </DoNexo>
        </>
      );
    case "lido":
      return (
        <>
          {pedido}
          <DoNexo atraso={0.3}>
            <Passo texto="Li 33 folhas de 4 arquivos, em 4 disciplinas" />
            <p className="cx-texto">São 412 páginas, mais do que um tomo costuma levar. Marquei no mapa 4 folhas para conferir.</p>
            <p className="cx-frase">
              Divido em <Lacuna valor="2 tomos" opcoes={["1 tomo", "2 tomos", "3 tomos"]} />, com o tomo 02 começando em{" "}
              <Lacuna valor="HID-01" opcoes={["EST-01", "HID-01", "ELE-01"]} mono />?
            </p>
            <Saidas itens={[{ texto: "Dividir assim", principal: true }, { texto: "Um tomo só" }]} />
          </DoNexo>
        </>
      );
    case "dividido":
      return (
        <>
          <DeVoce texto="divide em 2 tomos, a HID começa o 2" />
          <DoNexo atraso={0.3}>
            <Passo texto="Dividi em 2 tomos" />
            <p className="cx-texto">
              Tomo 01 com ARQ e EST, 20 folhas e 238 páginas. Tomo 02 com HID e ELE, 13 folhas e 174 páginas. Acendi no mapa o que mudou de lugar.
            </p>
            <Saidas itens={[{ texto: "Desfazer" }]} />
          </DoNexo>
        </>
      );
    case "tirou":
      return (
        <>
          <DeVoce texto="tira a ARQ-12, a folha foi cancelada" />
          <DoNexo atraso={0.3}>
            <Passo texto="Tirei a ARQ-12 do tomo 01" />
            <p className="cx-texto">Ficam 19 folhas no tomo 01. Ela continua apagada no mapa até você gerar, caso queira de volta.</p>
            <Saidas itens={[{ texto: "Pode gerar", principal: true }, { texto: "Restaurar a ARQ-12" }]} />
          </DoNexo>
        </>
      );
    case "gerando":
      return (
        <>
          <DeVoce texto="pode gerar" />
          <DoNexo atraso={0.3}>
            <Passo texto="Gerando para os 2 tomos" />
            <Gerando
              itens={[
                { id: "ld", fazendo: "Montando as 2 listas de documentos", feito: { nome: "LD_117-25_TOMO-01.pdf", paginas: 3 } },
                { id: "capa", fazendo: "Desenhando as 2 capas", feito: { nome: "Capa_117-25_TOMO-01.pdf", paginas: 1 } },
                { id: "sep", fazendo: "Gerando as 4 separatrizes", feito: { nome: "Separatrizes_117-25_TOMO-01.pdf", paginas: 2 } },
              ]}
            />
          </DoNexo>
        </>
      );
    case "montado":
      return (
        <>
          <DeVoce texto="monta os 2 volumes" />
          <DoNexo atraso={0.3}>
            <Passo texto="Montei os 2 volumes e conferi" />
            <div className="cx-pecas cx-pecas--coluna">
              <PecaDeArquivo gerado nova a={{ nome: "Volume_117-25_TOMO-01.pdf", paginas: 238 }} atraso={0.45} />
              <PecaDeArquivo gerado nova a={{ nome: "Volume_117-25_TOMO-02.pdf", paginas: 174 }} atraso={0.55} />
            </div>
            <Saidas itens={[{ texto: "Baixar os 2 (ZIP)", principal: true }, { texto: "Baixar os editáveis (ZIP)" }]} />
          </DoNexo>
        </>
      );
    case "desatualizado":
      return (
        <>
          <DeVoce texto="o título da LD do tomo 1 tá errado, é UBS da Rua São Francisco de Assis" />
          <DoNexo atraso={0.3} copiar>
            <Passo texto="Corrigi a LD do tomo 01" />
            <Passo texto="O volume do tomo 01 foi montado antes da correção" aviso />
            <p className="cx-texto">O PDF que você baixou ainda tem a LD antiga. O tomo 02 não mudou.</p>
            <Saidas itens={[{ texto: "Remontar e baixar", principal: true }, { texto: "Deixar como está" }]} />
          </DoNexo>
        </>
      );
  }
}

/* ------------------------------ a tela ------------------------------ */

function Palco({ s }: { s: SituacaoNexo }) {
  const { k } = useTempo();
  const cena = CENAS[s];
  const [lidas, setLidas] = useState(cena.lendo ? 6 : FOLHAS.length);
  useEffect(() => {
    if (!cena.lendo || lidas >= FOLHAS.length) return;
    const t = setTimeout(() => setLidas((n) => n + 1), 360 * k);
    return () => clearTimeout(t);
  }, [cena.lendo, lidas, k]);
  const { nodes, edges } = useMemo(
    () =>
      montarCanvas({
        lidas,
        sel: null,
        filtro: () => true,
        estadoDoDoc: (d) => cena.docs(d.id),
        estadoDoVolume: (n) => cena.vol(n),
        comSobras: false,
        tomos: cena.tomos,
        destaque: cena.destaque,
        removidas: cena.removidas,
        sem: cena.sem,
      }),
    [lidas, cena],
  );
  return (
    <div className="nw-canvas">
      <Tela nodes={nodes} edges={edges} onFolha={() => {}} onVazio={() => {}} enquadrar={0.9} enquadrarEm={cena.foco} zoomMinimo={0.1} minimapa={false} />
    </div>
  );
}

export function TelaNexo({ situacao }: { situacao: SituacaoNexo }) {
  const { k } = useTempo();
  const cena = CENAS[situacao];
  return (
    <CartaoAtual.Provider value="carimbo">
      <div className="mp nw">
        <Topo atual="Painel" />
        <div className="nw-mesa">
          <Conversas />

          <main className="nw-palco" aria-label="Organização dos arquivos">
            <header className="nw-palco-cabeca">
              <span className="mp-trilha nw-obra">
                <MarcaDaPrefeitura prefeitura="Criciúma" forma="sinal" />
                <span className="mp-mono">117-25</span>
                <span>Mapa do volume</span>
                <motion.span key={cena.estado} className="nw-estado" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
                  {cena.estado}
                </motion.span>
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
              <Palco key={situacao} s={situacao} />
            </ReactFlowProvider>
          </main>

          <aside className="nw-chat cx" aria-label="Nexo">
            <header className="nw-chat-cabeca">
              <span className="nw-chat-titulo">Montar o volume</span>
              <span className="mp-g-fraco">117-25</span>
            </header>
            <div className="cx-fio nw-fio">
              <Fio s={situacao} />
            </div>
            <div className="nw-campo">
              <Campo respondendo={situacao === "soltou" || situacao === "gerando"} />
            </div>
          </aside>
        </div>
      </div>
    </CartaoAtual.Provider>
  );
}
