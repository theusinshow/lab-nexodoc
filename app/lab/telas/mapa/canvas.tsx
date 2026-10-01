"use client";

import { Background, BackgroundVariant, getBezierPath, Handle, MiniMap, Position, ReactFlow, useStore, type Edge, type EdgeProps, type Node, type NodeProps, type OnNodeDrag, type OnNodesChange } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./cartoes.css";
import { CircleMinus } from "lucide-react";
import { memo } from "react";

import { densidadeDoZoom, oQueMostrar } from "@/modules/nexo/lib/densidade-do-canvas";

import { type Disciplina } from "../resultado-e/dados";
import { SeloDaDisciplina } from "../resultado-e/disciplina";
import { documentosDoTomo, FOLHAS, RESTOS, TOMOS, type Documento, type Folha, type Tomo } from "./dados";
import { CartaoDaFolha, useEstiloDoCartao } from "./cartoes";
import { ALTURA_DO_DOC, ALTURA_DO_PAPEL, ALTURA_DO_TITULO, LARGURA_DO_PAPEL, PapelDoDocumento, type EstadoDoDoc } from "./documentos";
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
/** Dentro do bloco as folhas ficam juntas (12 px): não há seta entre elas. */
const PASSO_DA_FOLHA = 152;
/** Entre os papéis (capa, separatrizes, LD): espaço para uma seta inteira. */
const ENTRE_PECAS = 76;
/** Entre um bloco de folhas e o próximo (ou o papel ao lado). */
const ENTRE_BLOCOS = 92;
/** A moldura do bloco passa 10 px por fora das folhas. */
const FOLGA_DO_BLOCO = 10;
export const Y_DA_FILEIRA = (i: number) => i * 300;
/** O papel é mais alto que a folha: sobe até o CENTRO do papel cair no centro da folha (a linha das setas). O título fica acima. */
const Y_DO_PAPEL = ALTURA_DO_NO / 2 - ALTURA_DO_PAPEL / 2 - ALTURA_DO_TITULO;
export const X_INICIAL = 160;


export type DadosDaFolha = { f: Folha; lida: boolean; agora?: boolean; escolhida: boolean; apagada: boolean; destaque?: boolean; removida?: boolean };
export type DadosDoCorte = { texto: string };
export type DadosDoDoc = { d: Documento; estado: EstadoDoDoc; tomo: number | null; destaque?: boolean };
export type DadosDoRotulo = { titulo: string; sub: string; resto?: boolean };

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
      {removida && (
        <span className="mp-no-removida">
          <CircleMinus size={11} strokeWidth={2} aria-hidden />
          Removida
        </span>
      )}
    </div>
  );
});

const NoDoDoc = memo(function NoDoDoc({ data }: NodeProps<Node<DadosDoDoc>>) {
  const densidade = useDensidade();
  return (
    <div className={`mp-no-casca${data.destaque ? " mp-no-casca--destaque" : ""}`}>
      {/* As alças ficam nas bordas do PAPEL, na altura do meio dele: a seta sai e chega no papel, não na legenda. */}
      <Handle type="target" position={Position.Left} className="mp-alca" isConnectable={false} style={{ top: ALTURA_DO_TITULO + ALTURA_DO_PAPEL / 2 }} />
      <Handle type="source" position={Position.Right} className="mp-alca" isConnectable={false} style={{ top: ALTURA_DO_TITULO + ALTURA_DO_PAPEL / 2, left: LARGURA_DO_PAPEL, right: "auto" }} />
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

/*
 * O BLOCO DE FOLHAS. As folhas seguidas da mesma disciplina formam um bloco
 * só, com moldura e cabeçalho (disciplina e quantas). Dentro do bloco não há
 * seta: a ordem já é a leitura, da esquerda para a direita. É o que o app faz
 * hoje (uma seta por folha viraria duzentas linhas cruzando a grade).
 */
export type DadosDoBloco = { disc: Disciplina; n: number; largura: number };
/** O título do bloco fica fora, em cima da moldura; a moldura passa 10 px por fora das folhas. */
const TITULO_DO_BLOCO = 30;
const ALTURA_DO_BLOCO = TITULO_DO_BLOCO + ALTURA_DO_NO + 20;
const TOPO_DO_BLOCO = -(TITULO_DO_BLOCO + 10);

const NoDoBloco = memo(function NoDoBloco({ data }: NodeProps<Node<DadosDoBloco>>) {
  return (
    <div className="mp-bloco" style={{ width: data.largura, height: ALTURA_DO_BLOCO }}>
      <Handle type="target" position={Position.Left} className="mp-alca" isConnectable={false} style={{ top: -TOPO_DO_BLOCO + ALTURA_DO_NO / 2 }} />
      <Handle type="source" position={Position.Right} className="mp-alca" isConnectable={false} style={{ top: -TOPO_DO_BLOCO + ALTURA_DO_NO / 2 }} />
      <p className="mp-bloco-cabeca" style={{ height: TITULO_DO_BLOCO }}>
        <SeloDaDisciplina disc={data.disc} nome />
        <span className="ds-num">{data.n === 1 ? "1 folha" : `${data.n} folhas`}</span>
      </p>
      <i className="mp-bloco-moldura" aria-hidden />
    </div>
  );
});

/** Onde a folha arrastada vai cair: uma fresta íris entre duas folhas. */
const NoDaFresta = memo(function NoDaFresta() {
  return <i className="mp-fresta" aria-hidden />;
});

/*
 * A SETA ESTRUTURADA. Liga só peças do volume: capa → separatrizes → LD →
 * blocos de folhas → volume. Fio fino reto, ponta cheia pequena, como as guias
 * de uma árvore: estrutura, não enfeite. A que encosta no que mudou fica íris.
 * Enquanto um bloco anda para outro lugar, a seta dele espera ele pousar.
 */
export type DadosDaSeta = { acesa?: boolean; fraca?: boolean };

const Seta = memo(function Seta({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps<Edge<DadosDaSeta>>) {
  // Nasce num ponto pequeno colado na peça de origem; o fio clareia no sentido da
  // leitura e chega numa ponta afinada, a 3 px da peça seguinte. Reta quando as
  // peças estão alinhadas; dobra com suavidade quando uma delas anda.
  const ponta = targetX - 3;
  const [caminho] = getBezierPath({ sourceX: sourceX + 4, sourceY, sourcePosition: Position.Right, targetX: ponta - 6, targetY, targetPosition: Position.Left, curvature: 0.35 });
  const cls = `mp-seta3${data?.acesa ? " mp-seta3--acesa" : ""}${data?.fraca ? " mp-seta3--fraca" : ""}`;
  const grad = `mp-seta-${id.replace(/[^a-zA-Z0-9-]/g, "_")}`;
  return (
    <g className={cls}>
      <defs>
        <linearGradient id={grad} gradientUnits="userSpaceOnUse" x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}>
          <stop offset="0" className="mp-seta3-de" />
          <stop offset="1" className="mp-seta3-para" />
        </linearGradient>
      </defs>
      <path d={caminho} className="mp-seta3-linha" stroke={`url(#${grad})`} />
      <circle cx={sourceX + 1} cy={sourceY} r={2.75} className="mp-seta3-origem" />
      <path d={`M${ponta},${targetY} L${ponta - 10},${targetY - 4.5} L${ponta - 7},${targetY} L${ponta - 10},${targetY + 4.5} Z`} className="mp-seta3-ponta" />
    </g>
  );
});

export const TIPOS_DE_SETA = { seta: Seta };

export const TIPOS = { folha: NoDaFolha, doc: NoDoDoc, rotulo: NoDoRotulo, bloco: NoDoBloco, corte: NoDoCorte, fresta: NoDaFresta };

/** Os tomos na ordem padrão (a das disciplinas), sem as folhas que saíram. */
export function ordemPadrao(tomos: Tomo[], sem?: Set<string>) {
  return new Map(tomos.map((t) => [t.n, FOLHAS.filter((f) => t.disciplinas.includes(f.disc) && !sem?.has(f.id)).map((f) => f.id)]));
}

const FOLHA_POR_ID = new Map(FOLHAS.map((f) => [f.id, f]));

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
  ordemDosTomos,
}: {
  /** A ordem das folhas em cada tomo, quando alguém arrastou; sem ela, a das disciplinas. */
  ordemDosTomos?: Map<number, string[]>;
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
  /** Para o arrasto: onde cada fileira está e a ordem das folhas nela. */
  const fileiras: { tomo: number; y: number; folhas: string[] }[] = [];
  const ordemDeLeitura = new Map(FOLHAS.map((f, i) => [f.id, i]));
  const ordemDosTomosUsada = ordemDosTomos ?? ordemPadrao(tomos, sem);
  const seta = (a: string, b: string, acesa: boolean, fraca = false) => edges.push({ id: `${a}>${b}`, source: a, target: b, type: "seta", data: { acesa, fraca } });

  tomos.forEach((t, ti) => {
    const y = Y_DA_FILEIRA(ti);
    inicioDaFileira.set(t.n, { x: 0, y });
    const ids = (ordemDosTomosUsada.get(t.n) ?? []).filter((id) => !sem?.has(id));
    const fs = ids.map((id) => FOLHA_POR_ID.get(id)!);
    fileiras.push({ tomo: t.n, y, folhas: ids });
    const contam = fs.filter((f) => !removidas?.has(f.id)).length;
    nodes.push({ id: `rot-${t.n}`, type: "rotulo", position: { x: 0, y: y + 18 }, data: { titulo: tomos.length === 1 ? "Volume" : `Tomo ${dd(t.n)}`, sub: `${contam} folhas, ${t.paginas} p.` }, selectable: false, draggable: false });
    let x = X_INICIAL;
    let anterior: { id: string; acesa: boolean } | null = null;
    const liga = (id: string, acesa: boolean) => {
      if (anterior) seta(anterior.id, id, acesa || anterior.acesa);
      anterior = { id, acesa };
    };
    for (const d of documentosDoTomo(t)) {
      nodes.push({ id: d.id, type: "doc", position: { x, y: y + Y_DO_PAPEL }, width: LARGURA_DO_DOC, height: ALTURA_DO_DOC, draggable: false, data: { d, estado: estadoDoDoc(d, t.n), tomo: t.n, destaque: destaque?.has(d.id) } });
      liga(d.id, !!destaque?.has(d.id));
      x += LARGURA_DO_DOC + ENTRE_PECAS;
    }
    // Blocos: cada sequência de folhas seguidas da mesma disciplina.
    const blocos: Folha[][] = [];
    for (const f of fs) {
      const ultimo = blocos[blocos.length - 1];
      if (ultimo && ultimo[0].disc === f.disc) ultimo.push(f);
      else blocos.push([f]);
    }
    const vezes = new Map<string, number>();
    x += ENTRE_BLOCOS - ENTRE_PECAS;
    for (const bloco of blocos) {
      const disc = bloco[0].disc;
      const vez = (vezes.get(disc) ?? 0) + 1;
      vezes.set(disc, vez);
      const id = `blc-${t.n}-${disc}-${vez}`;
      const largura = bloco.length * PASSO_DA_FOLHA - (PASSO_DA_FOLHA - LARGURA_DA_FOLHA) + 2 * FOLGA_DO_BLOCO;
      const aceso = bloco.some((f) => destaque?.has(f.id));
      nodes.push({ id, type: "bloco", position: { x: x - FOLGA_DO_BLOCO, y: y + TOPO_DO_BLOCO }, width: largura, height: ALTURA_DO_BLOCO, zIndex: -1, selectable: false, draggable: false, data: { disc, n: bloco.filter((f) => !removidas?.has(f.id)).length, largura } });
      liga(id, aceso);
      for (const f of bloco) {
        if (f.id === corteAntesDe) nodes.push({ id: "corte", type: "corte", position: { x: x - ENTRE_BLOCOS / 2 - 4, y: y - 70 }, width: 8, height: 230, data: { texto: "tomo 02 começa aqui?" }, selectable: false, draggable: false });
        posicao.set(f.id, { x, y });
        nodes.push({
          id: f.id,
          type: "folha",
          position: { x, y },
          width: LARGURA_DA_FOLHA,
          height: ALTURA_DO_NO,
          data: { f, lida: (ordemDeLeitura.get(f.id) ?? 0) < lidas, agora: ordemDeLeitura.get(f.id) === lidas, escolhida: sel === f.id, apagada: !filtro(f), destaque: destaque?.has(f.id), removida: removidas?.has(f.id) },
        });
        x += PASSO_DA_FOLHA;
      }
      x += ENTRE_BLOCOS - (PASSO_DA_FOLHA - LARGURA_DA_FOLHA);
    }
    const vol: Documento = { id: `vol-${t.n}`, tipo: "volume", nome: `Volume, tomo ${dd(t.n)}`, detalhe: "" };
    nodes.push({ id: vol.id, type: "doc", position: { x, y: y + Y_DO_PAPEL }, width: LARGURA_DO_DOC, height: ALTURA_DO_DOC, draggable: false, data: { d: vol, estado: estadoDoVolume(t.n), tomo: t.n, destaque: destaque?.has(vol.id) } });
    liga(vol.id, !!destaque?.has(vol.id));
  });

  if (comSobras) {
    const y = Y_DA_FILEIRA(tomos.length);
    inicioDaFileira.set(0, { x: 0, y });
    nodes.push({ id: "rot-0", type: "rotulo", position: { x: 0, y: y + 18 }, data: { titulo: "Fora da divisão", sub: "de antes dos tomos", resto: true }, selectable: false, draggable: false });
    RESTOS.forEach((d, i) => nodes.push({ id: d.id, type: "doc", draggable: false, position: { x: X_INICIAL + i * (LARGURA_DO_DOC + ENTRE_PECAS), y: y + Y_DO_PAPEL }, width: LARGURA_DO_DOC, height: ALTURA_DO_DOC, data: { d, estado: "sobra", tomo: null } }));
  }

  return { nodes, edges, posicao, inicioDaFileira, fileiras };
}

/**
 * Onde a folha arrastada cairia: a fileira mais perto do centro dela e, nessa
 * fileira, entre quais duas folhas. Devolve também onde desenhar a fresta.
 */
export function ondeCai(fileiras: { tomo: number; y: number; folhas: string[] }[], posicoes: Map<string, { x: number; y: number }>, arrastada: string, centro: { x: number; y: number }) {
  let melhor: (typeof fileiras)[number] | null = null;
  for (const f of fileiras) {
    const d = Math.abs(centro.y - (f.y + ALTURA_DO_NO / 2));
    if (d < 160 && (!melhor || d < Math.abs(centro.y - (melhor.y + ALTURA_DO_NO / 2)))) melhor = f;
  }
  if (!melhor) return null;
  const outras = melhor.folhas.filter((id) => id !== arrastada);
  let indice = outras.findIndex((id) => (posicoes.get(id)?.x ?? 0) + LARGURA_DA_FOLHA / 2 > centro.x);
  if (indice < 0) indice = outras.length;
  const antes = outras[indice - 1];
  const depois = outras[indice];
  const pa = antes ? posicoes.get(antes) : undefined;
  const pd = depois ? posicoes.get(depois) : undefined;
  const x = pa && pd ? (pa.x + LARGURA_DA_FOLHA + pd.x) / 2 : pa ? pa.x + LARGURA_DA_FOLHA + 8 : pd ? pd.x - 8 : X_INICIAL;
  return { tomo: melhor.tomo, indice, antes, depois, fresta: { x: x - 1.5, y: melhor.y - 8 } };
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
  arrastavel = false,
  onNodesChange,
  onNodeDragStop,
  onMoveStart,
}: {
  /** As folhas podem ser arrastadas para outra posição ou outro tomo (como no app). */
  arrastavel?: boolean;
  onNodesChange?: OnNodesChange;
  onNodeDragStop?: OnNodeDrag;
  /** Quem mexe na câmera (arrasta o fundo, rola) toma o controle dela. */
  onMoveStart?: (evento: MouseEvent | TouchEvent | null) => void;
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
      nodesDraggable={arrastavel}
      onNodesChange={onNodesChange}
      onNodeDragStop={onNodeDragStop}
      onMoveStart={onMoveStart}
      nodeDragThreshold={4}
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


