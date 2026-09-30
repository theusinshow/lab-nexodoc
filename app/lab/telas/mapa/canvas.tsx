"use client";

import { Background, BackgroundVariant, Handle, MarkerType, MiniMap, Position, ReactFlow, useStore, type Edge, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./cartoes.css";
import { memo } from "react";

import { densidadeDoZoom, oQueMostrar } from "@/modules/nexo/lib/densidade-do-canvas";

import { type Disciplina } from "../resultado-e/dados";
import { SeloDaDisciplina } from "../resultado-e/disciplina";
import { documentosDoTomo, FOLHAS, RESTOS, TOMOS, type Documento, type Folha } from "./dados";
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
const PASSO_DA_FOLHA = 152;
const ENTRE_DISCIPLINAS = 28;
export const Y_DA_FILEIRA = (i: number) => i * 300;
/** O papel é mais alto que a folha: sobe para os centros ficarem na mesma linha. */
const Y_DO_PAPEL = -46;
export const X_INICIAL = 160;


export type DadosDaFolha = { f: Folha; lida: boolean; escolhida: boolean; apagada: boolean };
export type DadosDoDoc = { d: Documento; estado: EstadoDoDoc; tomo: number | null };
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
  const { f, lida, escolhida, apagada } = data;
  const densidade = useDensidade();
  const estilo = useEstiloDoCartao();
  if (!lida)
    return (
      <div className={`mp-no mp-no--folha mp-no--lendo mp-no--${densidade}`} title="lendo o selo">
        {alcas}
        <div className="mp-no-corpo">
          <div className="mp-no-linha">
            <span className="mp-no-num mp-g-fraco">{dd(f.paginaNoPdf)}</span>
          </div>
          {densidade !== "longe" && (
            <>
              <span className="mp-g-esqueleto" style={{ width: "86%", marginTop: 6 }} />
              <span className="mp-g-esqueleto" style={{ width: "54%", marginTop: 6 }} />
            </>
          )}
        </div>
      </div>
    );
  return (
    <div className="mp-no-casca">
      {alcas}
      <CartaoDaFolha f={f} estilo={estilo} distancia={densidade} escolhida={escolhida} apagada={apagada} />
    </div>
  );
});

const NoDoDoc = memo(function NoDoDoc({ data }: NodeProps<Node<DadosDoDoc>>) {
  const densidade = useDensidade();
  return (
    <div className="mp-no-casca">
      {alcas}
      <PapelDoDocumento d={data.d} estado={data.estado} tomo={data.tomo} distancia={densidade} />
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

export const TIPOS = { folha: NoDaFolha, doc: NoDoDoc, rotulo: NoDoRotulo, grupo: NoDoGrupo };

/** Onde cada coisa fica: as fileiras, e a posição de cada folha para centralizar nela. */
export function montarCanvas({
  lidas,
  sel,
  filtro,
  estadoDoDoc,
  estadoDoVolume,
  comSobras,
}: {
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
  const seta = (a: string, b: string) =>
    edges.push({ id: `${a}>${b}`, source: a, target: b, type: "straight", markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: "rgba(255,255,255,0.22)" }, className: "mp-seta" });

  TOMOS.forEach((t, ti) => {
    const y = Y_DA_FILEIRA(ti);
    inicioDaFileira.set(t.n, { x: 0, y });
    const fs = FOLHAS.filter((f) => t.disciplinas.includes(f.disc));
    nodes.push({ id: `rot-${t.n}`, type: "rotulo", position: { x: 0, y: y + 18 }, data: { titulo: `Tomo ${dd(t.n)}`, sub: `${fs.length} folhas, ${t.paginas} p.` }, selectable: false });
    let x = X_INICIAL;
    let anterior: string | null = null;
    const liga = (id: string) => {
      if (anterior) seta(anterior, id);
      anterior = id;
    };
    for (const d of documentosDoTomo(t)) {
      nodes.push({ id: d.id, type: "doc", position: { x, y: y + Y_DO_PAPEL }, width: LARGURA_DO_DOC, height: ALTURA_DO_DOC, data: { d, estado: estadoDoDoc(d, t.n), tomo: t.n } });
      liga(d.id);
      x += LARGURA_DO_DOC + 20;
    }
    for (const disc of t.disciplinas) {
      x += ENTRE_DISCIPLINAS - 16;
      const doGrupo = fs.filter((f) => f.disc === disc);
      nodes.push({ id: `grp-${disc}`, type: "grupo", position: { x, y: y - 28 }, data: { disc, n: doGrupo.length }, selectable: false });
      for (const f of doGrupo) {
        posicao.set(f.id, { x, y });
        nodes.push({
          id: f.id,
          type: "folha",
          position: { x, y },
          width: LARGURA_DA_FOLHA,
          height: ALTURA_DO_NO,
          data: { f, lida: (ordem.get(f.id) ?? 0) < lidas, escolhida: sel === f.id, apagada: !filtro(f) },
        });
        liga(f.id);
        x += PASSO_DA_FOLHA;
      }
    }
    x += ENTRE_DISCIPLINAS;
    const vol: Documento = { id: `vol-${t.n}`, tipo: "volume", nome: `Volume, tomo ${dd(t.n)}`, detalhe: "" };
    nodes.push({ id: vol.id, type: "doc", position: { x, y: y + Y_DO_PAPEL }, width: LARGURA_DO_DOC, height: ALTURA_DO_DOC, data: { d: vol, estado: estadoDoVolume(t.n), tomo: t.n } });
    liga(vol.id);
  });

  if (comSobras) {
    const y = Y_DA_FILEIRA(TOMOS.length);
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
}: {
  nodes: Node[];
  edges: Edge[];
  onFolha: (id: string) => void;
  onVazio: () => void;
  viewportInicial: { x: number; y: number; zoom: number };
}) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={TIPOS}
      defaultViewport={viewportInicial}
      minZoom={0.3}
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
      <MiniMap
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
      />
    </ReactFlow>
  );
}


