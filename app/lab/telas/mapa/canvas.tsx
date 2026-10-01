"use client";

import { Background, BackgroundVariant, Handle, MiniMap, Position, ReactFlow, useStore, type Edge, type EdgeProps, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./cartoes.css";
import { memo } from "react";

import { densidadeDoZoom, oQueMostrar } from "@/modules/nexo/lib/densidade-do-canvas";

import { type Disciplina } from "../resultado-e/dados";
import { SeloDaDisciplina } from "../resultado-e/disciplina";
import { documentosDoTomo, FOLHAS, RESTOS, TOMOS, type Documento, type Folha, type Tomo } from "./dados";
import { CartaoDaFolha, useEstiloDoCartao } from "./cartoes";
import { ALTURA_DO_DOC, LARGURA_DO_PAPEL, PapelDoDocumento, type EstadoDoDoc } from "./documentos";
import { dd } from "./lado";

/*
 * O CANVAS DO MAPA. Uma fileira por tomo, na ordem do volume (capa →
 * separatrizes → LD → folhas → volume), com setas de sequência. É o canvas de
 * hoje (React Flow, só leitura), com a pele nova: nós em cinza, a cor da
 * disciplina num fio de 2px, marca só onde há o que conferir. A densidade do
 * nó segue o zoom pela MESMA regra do app (densidade-do-canvas.ts).
 */

export const LARGURA_DA_FOLHA = 140;
export const ALTURA_DO_NO = 108;
const LARGURA_DO_DOC = LARGURA_DO_PAPEL + 12;
/** 24 px entre as folhas: o bastante para a seta se ler como seta, e não como um risco. */
const PASSO_DA_FOLHA = 164;
const ENTRE_DISCIPLINAS = 28;
export const Y_DA_FILEIRA = (i: number) => i * 300;
/** O papel é mais alto que a folha: sobe para os centros ficarem na mesma linha. */
const Y_DO_PAPEL = -46;
export const X_INICIAL = 160;


export type DadosDaFolha = { f: Folha; lida: boolean; agora?: boolean; escolhida: boolean; apagada: boolean; destaque?: boolean; removida?: boolean };
export type DadosDoCorte = { texto: string };
export type DadosDoDoc = { d: Documento; estado: EstadoDoDoc; tomo: number | null; destaque?: boolean };
export type DadosDoRotulo = { titulo: string; sub: string; resto?: boolean };
export type DadosDoGrupo = { disc: Disciplina; n: number };

const alcas = (
  <>
    <Handle type="target" position={Position.Left} className="mp-alca" isConnectable={false} />
    <Handle type="source" position={Position.Right} className="mp-alca" isConnectable={false} />
  </>
);

/** A densidade do nó muda só quando o zoom cruza um limiar, não a cada quadro. */
function useDensidade() {
  return useStore((s) => densidadeDoZoom(s.transform[2]));
}

const NoDaFolha = memo(function NoDaFolha({ data }: NodeProps<Node<DadosDaFolha>>) {
  const { f, lida, agora, escolhida, apagada, destaque, removida } = data;
  const densidade = useDensidade();
  const estilo = useEstiloDoCartao();
  // Ainda não lida: a página do PDF em contorno, com o canto do selo marcado.
  // A que está sendo lida AGORA tem a linha que varre o selo; a fila espera quieta.
  if (!lida)
    return (
      <div className={`mp-lendo${agora ? " mp-lendo--agora" : ""} mp-lendo--${densidade}`} title={agora ? "lendo o selo" : "na fila"}>
        {alcas}
        <span className="mp-lendo-pag ds-num">p. {dd(f.paginaNoPdf)}</span>
        <i className="mp-lendo-selo" aria-hidden>
          <i className="mp-lendo-varre" />
        </i>
      </div>
    );
  return (
    <div className={`mp-no-casca${destaque ? " mp-no-casca--destaque" : ""}${removida ? " mp-no-casca--removida" : ""}`}>
      {alcas}
      <CartaoDaFolha f={f} estilo={estilo} distancia={densidade} escolhida={escolhida} apagada={apagada} />
      {removida && <span className="mp-no-removida">removida</span>}
    </div>
  );
});

const NoDoDoc = memo(function NoDoDoc({ data }: NodeProps<Node<DadosDoDoc>>) {
  const densidade = useDensidade();
  return (
    <div className={`mp-no-casca${data.destaque ? " mp-no-casca--destaque" : ""}`}>
      {alcas}
      <PapelDoDocumento d={data.d} estado={data.estado} tomo={data.tomo} distancia={densidade} />
    </div>
  );
});

/** Onde o Nexo propõe cortar o volume: um traço tracejado entre duas folhas, com a pergunta em cima. */
const NoDoCorte = memo(function NoDoCorte({ data }: NodeProps<Node<DadosDoCorte>>) {
  return (
    <div className="mp-corte">
      <span className="mp-corte-texto">{data.texto}</span>
      <i className="mp-corte-traco" aria-hidden />
    </div>
  );
});

const NoDoRotulo = memo(function NoDoRotulo({ data }: NodeProps<Node<DadosDoRotulo>>) {
  return (
    <div className={`mp-no-rotulo${data.resto ? " mp-no-rotulo--resto" : ""}`}>
      <p>{data.titulo}</p>
      <span>{data.sub}</span>
    </div>
  );
});

const NoDoGrupo = memo(function NoDoGrupo({ data }: NodeProps<Node<DadosDoGrupo>>) {
  return (
    <div className="mp-no-grupo">
      <SeloDaDisciplina disc={data.disc} nome />
      <span className="ds-num">{data.n}</span>
    </div>
  );
});

/*
 * A SETA DA ORDEM DO VOLUME. Uma linha, uma ponta desenhada (não o marcador
 * padrão) e duas camadas de movimento:
 * - a ONDA: um brilho que corre a fileira da capa ao volume, em sequência,
 *   dizendo "é nesta ordem que o volume sai" (só no palco do Nexo);
 * - o FLUXO: nas setas que encostam no que acabou de mudar, um tracejado íris
 *   que corre no sentido da seta enquanto o destaque dura.
 * A seta nova (de uma folha que mudou de vizinha) se DESENHA ao nascer.
 */
export type DadosDaSeta = { i: number; acesa?: boolean; fraca?: boolean };

const Seta = memo(function Seta({ sourceX, sourceY, targetX, targetY, data }: EdgeProps<Edge<DadosDaSeta>>) {
  const x0 = sourceX + 3;
  const x1 = targetX - 3;
  const y = (sourceY + targetY) / 2;
  if (x1 - x0 < 6) return null;
  const linha = `M${x0},${y} L${x1},${y}`;
  const ponta = `M${x1 - 4.5},${y - 4} L${x1},${y} L${x1 - 4.5},${y + 4}`;
  const cls = `mp-seta2${data?.acesa ? " mp-seta2--acesa" : ""}${data?.fraca ? " mp-seta2--fraca" : ""}`;
  return (
    <g className={cls} style={{ ["--i" as string]: data?.i ?? 0 }}>
      <path d={linha} pathLength={1} className="mp-seta2-linha" />
      <path d={linha} pathLength={1} className="mp-seta2-fluxo" />
      <path d={linha} pathLength={1} className="mp-seta2-onda" />
      <path d={ponta} className="mp-seta2-ponta" />
    </g>
  );
});

export const TIPOS_DE_SETA = { seta: Seta };

export const TIPOS = { folha: NoDaFolha, doc: NoDoDoc, rotulo: NoDoRotulo, grupo: NoDoGrupo, corte: NoDoCorte };

/** Onde cada coisa fica: as fileiras, e a posição de cada folha para centralizar nela. */
export function montarCanvas({
  lidas,
  sel,
  filtro,
  estadoDoDoc,
  estadoDoVolume,
  comSobras,
  tomos = TOMOS,
  destaque,
  removidas,
  sem,
  corteAntesDe,
}: {
  /** A divisão proposta e ainda não aceita: o traço entra antes desta folha. */
  corteAntesDe?: string;
  /** Folhas que já saíram do volume: não entram no mapa. */
  sem?: Set<string>;
  tomos?: Tomo[];
  /** O que a última mensagem mudou: acende uma vez. */
  destaque?: Set<string>;
  /** Folhas tiradas do volume: ficam no lugar, apagadas, até sumirem. */
  removidas?: Set<string>;
  lidas: number;
  sel: string | null;
  filtro: (f: Folha) => boolean;
  estadoDoDoc: (d: Documento, tomo: number) => EstadoDoDoc;
  estadoDoVolume: (tomo: number) => EstadoDoDoc;
  comSobras: boolean;
}) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const posicao = new Map<string, { x: number; y: number }>();
  const inicioDaFileira = new Map<number, { x: number; y: number }>();
  const ordem = new Map(FOLHAS.map((f, i) => [f.id, i]));
  // i conta a seta DENTRO da fileira: a onda de cada tomo começa junto, na capa.
  let naFileira = 0;
  const seta = (a: string, b: string) =>
    edges.push({
      id: `${a}>${b}`,
      source: a,
      target: b,
      type: "seta",
      data: { i: naFileira++, acesa: !!(destaque?.has(a) || destaque?.has(b)), fraca: !!(removidas?.has(a) || removidas?.has(b)) },
    });

  tomos.forEach((t, ti) => {
    const y = Y_DA_FILEIRA(ti);
    inicioDaFileira.set(t.n, { x: 0, y });
    const fs = FOLHAS.filter((f) => t.disciplinas.includes(f.disc) && !sem?.has(f.id));
    naFileira = 0;
    nodes.push({ id: `rot-${t.n}`, type: "rotulo", position: { x: 0, y: y + 18 }, data: { titulo: tomos.length === 1 ? "Volume" : `Tomo ${dd(t.n)}`, sub: `${fs.length - (removidas ? fs.filter((f) => removidas.has(f.id)).length : 0)} folhas, ${t.paginas} p.` }, selectable: false });
    let x = X_INICIAL;
    let anterior: string | null = null;
    const liga = (id: string) => {
      if (anterior) seta(anterior, id);
      anterior = id;
    };
    for (const d of documentosDoTomo(t)) {
      nodes.push({ id: d.id, type: "doc", position: { x, y: y + Y_DO_PAPEL }, width: LARGURA_DO_DOC, height: ALTURA_DO_DOC, data: { d, estado: estadoDoDoc(d, t.n), tomo: t.n, destaque: destaque?.has(d.id) } });
      liga(d.id);
      x += LARGURA_DO_DOC + 20;
    }
    for (const disc of t.disciplinas) {
      x += ENTRE_DISCIPLINAS - 16;
      const doGrupo = fs.filter((f) => f.disc === disc);
      nodes.push({ id: `grp-${disc}`, type: "grupo", position: { x, y: y - 28 }, data: { disc, n: doGrupo.length }, selectable: false });
      for (const f of doGrupo) {
        if (f.id === corteAntesDe) nodes.push({ id: "corte", type: "corte", position: { x: x - 16, y: y - 70 }, width: 8, height: 230, data: { texto: "tomo 02 começa aqui?" }, selectable: false });
        posicao.set(f.id, { x, y });
        nodes.push({
          id: f.id,
          type: "folha",
          position: { x, y },
          width: LARGURA_DA_FOLHA,
          height: ALTURA_DO_NO,
          data: { f, lida: (ordem.get(f.id) ?? 0) < lidas, agora: ordem.get(f.id) === lidas, escolhida: sel === f.id, apagada: !filtro(f), destaque: destaque?.has(f.id), removida: removidas?.has(f.id) },
        });
        liga(f.id);
        x += PASSO_DA_FOLHA;
      }
    }
    x += ENTRE_DISCIPLINAS;
    const vol: Documento = { id: `vol-${t.n}`, tipo: "volume", nome: `Volume, tomo ${dd(t.n)}`, detalhe: "" };
    nodes.push({ id: vol.id, type: "doc", position: { x, y: y + Y_DO_PAPEL }, width: LARGURA_DO_DOC, height: ALTURA_DO_DOC, data: { d: vol, estado: estadoDoVolume(t.n), tomo: t.n, destaque: destaque?.has(vol.id) } });
    liga(vol.id);
  });

  if (comSobras) {
    const y = Y_DA_FILEIRA(tomos.length);
    inicioDaFileira.set(0, { x: 0, y });
    nodes.push({ id: "rot-0", type: "rotulo", position: { x: 0, y: y + 18 }, data: { titulo: "Fora da divisão", sub: "de antes dos tomos", resto: true }, selectable: false });
    RESTOS.forEach((d, i) => nodes.push({ id: d.id, type: "doc", position: { x: X_INICIAL + i * (LARGURA_DO_DOC + 20), y: y + Y_DO_PAPEL }, width: LARGURA_DO_DOC, height: ALTURA_DO_DOC, data: { d, estado: "sobra", tomo: null } }));
  }

  return { nodes, edges, posicao, inicioDaFileira };
}

export function Tela({
  nodes,
  edges,
  onFolha,
  onVazio,
  viewportInicial,
  enquadrar,
  enquadrarEm,
  minimapa = true,
  zoomMinimo = 0.3,
}: {
  zoomMinimo?: number;
  nodes: Node[];
  edges: Edge[];
  onFolha: (id: string) => void;
  onVazio: () => void;
  viewportInicial?: { x: number; y: number; zoom: number };
  /** Abre enquadrando tudo, até o zoom dado (o palco do Nexo é estreito). */
  enquadrar?: number;
  /** Enquadra só estes nós (o trecho que a última mensagem mexeu), e não tudo. */
  enquadrarEm?: string[];
  minimapa?: boolean;
}) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={TIPOS}
      edgeTypes={TIPOS_DE_SETA}
      defaultViewport={viewportInicial}
      fitView={enquadrar !== undefined}
      fitViewOptions={enquadrar !== undefined ? { padding: 0.08, maxZoom: enquadrar, nodes: enquadrarEm?.map((id) => ({ id })) } : undefined}
      minZoom={zoomMinimo}
      maxZoom={1.5}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      zoomOnDoubleClick={false}
      proOptions={{ hideAttribution: true }}
      onNodeClick={(_, n) => n.type === "folha" && (n.data as DadosDaFolha).lida && onFolha(n.id)}
      onPaneClick={onVazio}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="rgba(255,255,255,0.07)" />
      {minimapa && <MiniMap
        className="mp-minimapa"
        pannable
        zoomable
        nodeColor={(n) => (n.type === "folha" ? "rgba(255,255,255,0.55)" : n.type === "doc" ? "rgba(255,255,255,0.3)" : "transparent")}
        style={{ width: 200, height: 72 }}
        nodeStrokeWidth={0}
        maskColor="rgba(10,10,12,0.55)"
        maskStrokeColor="rgba(255,255,255,0.35)"
        maskStrokeWidth={1}
        bgColor="transparent"
      />}
    </ReactFlow>
  );
}


