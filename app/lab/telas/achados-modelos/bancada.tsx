"use client";

/**
 * A BANCADA DOS MODELOS: carrega um parecer de verdade, monta o cérebro da fila
 * e troca entre os layouts. As ações gravam no banco deste ambiente — é para
 * usar, não só olhar.
 */
import { useEffect, useMemo, useState } from "react";

import { Segmento } from "@/components/ds/basicos";
import { FilaDeAchados } from "@/components/telas/resultado/fila";
import { useParecerVivo } from "@/components/telas/resultado/use-parecer-vivo";
import { VisorDoMemorial } from "@/components/telas/resultado/visor";
import type { AuditReport } from "@/lib/audit-report";
import { catalogoDoParecer, resolverFonte } from "@/lib/fonte-da-evidencia";

import { FilaA as ModeloA } from "@/components/telas/resultado/fila-a/fila-a";
import { ModeloB } from "./modelo-b";
import { ModeloC } from "./modelo-c";
import { ModeloD } from "./modelo-d";
import { useFila } from "@/components/telas/resultado/fila-a/use-fila";

import "@/components/telas/resultado/resultado.css";
import "@/components/telas/resultado/documento.css";
import "@/components/telas/resultado/embutido.css";
import "@/components/telas/resultado/trilho.css";
import "./modelos.css";

type Modelo = "atual" | "a" | "b" | "c" | "d";

export const MODELOS: { id: Modelo; nome: string; ideia: string }[] = [
  { id: "atual", nome: "Atual", ideia: "A fila de hoje, para comparar." },
  { id: "a", nome: "A · Três faixas", ideia: "Lista enxuta (3 situações + Mais, filtros num botão, ações no hover). Detalhe com cabeçalho fixo, texto e prévia lado a lado, e as ações sempre no rodapé." },
  { id: "b", nome: "B · Caixa de entrada", ideia: "Filtros como facetas à esquerda (como um e-mail). Uma lista larga: o achado abre DENTRO da própria linha, com prévia e ações. Bom para triar muitos de uma vez." },
  { id: "c", nome: "C · Documento primeiro", ideia: "O PDF no centro, grande. À esquerda as páginas com achado; à direita o achado da página e suas ações. Para revisar o memorial folha a folha." },
  { id: "d", nome: "D · Quadro por situação", ideia: "Colunas Sem dono / Com alguém / Corrigidos / Encerrados. Cartões com ações; o detalhe abre numa gaveta lateral. Para coordenar quem faz o quê." },
];

const PARECERES = [
  { id: "f8539b5d-7a1e-43cd-9b84-01bb9e6b3ac4", nome: "017-26 · Centro Comunitário (53 achados)" },
  { id: "a85e0b8f-f847-401a-ab1f-5ad428272172", nome: "141-26 · Arena Belvedere (14 achados)" },
];

export function BancadaDosModelos() {
  const [modelo, setModelo] = useState<Modelo>("a");
  const [comChat, setComChat] = useState(true);
  const [auditId, setAuditId] = useState(PARECERES[0].id);
  const [dados, setDados] = useState<{ id: string; report: AuditReport | null; arquivos: { fileName: string; checksumSha256: string | null }[]; erro?: string } | null>(null);
  const [visor, setVisor] = useState<string | null>(null);
  const [paginaDoVisor, setPaginaDoVisor] = useState<number | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/audits/${auditId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => vivo && setDados({ id: auditId, report: j.report ?? null, arquivos: j.arquivos ?? [], erro: j.report ? undefined : (j.error ?? "Parecer sem relatório.") }))
      .catch(() => vivo && setDados({ id: auditId, report: null, arquivos: [], erro: "Não foi possível carregar o parecer." }));
    return () => {
      vivo = false;
    };
  }, [auditId]);

  const report = dados?.id === auditId ? dados.report : null;
  const catalogo = useMemo(() => catalogoDoParecer({ local: null, auditados: dados?.arquivos ?? [] }), [dados]);
  const parecer = useParecerVivo({ auditId, report });
  const verNoMemorial = (chave: string, pagina?: number) => {
    setPaginaDoVisor(pagina ?? null);
    setVisor(chave);
  };
  const fila = useFila({ parecer, auditId, catalogo, onVerNoMemorial: verNoMemorial, teclado: modelo !== "atual" && !visor });

  const doVisor = parecer.achados.find((a) => a.chave === visor);
  const fonteDoVisor = doVisor ? resolverFonte({ arquivo: doVisor.estruturado.documento }, catalogo) : null;
  const urlDoVisor = fonteDoVisor?.tipo === "arquivo" ? fonteDoVisor.fonte.url : null;
  const achadosDoVisor = urlDoVisor ? parecer.achados.filter((a) => a.confirmado && resolverFonte({ arquivo: a.estruturado.documento }, catalogo).tipo === "arquivo") : [];
  const analisados = report?.arquivos_analisados ?? [];

  const atual = MODELOS.find((m) => m.id === modelo)!;

  return (
    <div className="am-bancada">
      <div className="am-controles">
        <Segmento rotulo="Modelo" valor={modelo} onTroca={setModelo} opcoes={MODELOS.map((m) => ({ valor: m.id, rotulo: m.nome }))} />
        <label className="am-parecer">
          <input type="checkbox" checked={comChat} onChange={(e) => setComChat(e.target.checked)} />
          Com o chat do Nexo à direita
        </label>
        <label className="am-parecer">
          Parecer
          <select value={auditId} onChange={(e) => (setAuditId(e.target.value), setVisor(null))}>
            {PARECERES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="am-ideia">{atual.ideia}</p>

      {!report ? (
        <p className="lab-nota">{dados?.erro ?? "Carregando o parecer…"}</p>
      ) : (
        <div className={comChat ? "am-com-chat" : undefined}>
          <div className="re-conteudo rs rd re re--embutido am-palco">
            {modelo === "atual" && <FilaDeAchados parecer={parecer} auditId={auditId} catalogo={catalogo} onVerNoMemorial={verNoMemorial} />}
            {modelo === "a" && <ModeloA f={fila} />}
            {modelo === "b" && <ModeloB f={fila} />}
            {modelo === "c" && <ModeloC f={fila} />}
            {modelo === "d" && <ModeloD f={fila} />}
          </div>
          {comChat && <ChatDeMentira />}
        </div>
      )}

      <VisorDoMemorial
        key={visor ? `${visor}:${paginaDoVisor ?? ""}` : "fechado"}
        achados={achadosDoVisor}
        url={urlDoVisor}
        arquivo={fonteDoVisor?.tipo === "arquivo" ? fonteDoVisor.fonte.nome : "Memorial"}
        inicial={visor}
        paginaInicial={paginaDoVisor}
        folhas={analisados.length === 1 ? analisados[0].cobertura : null}
        aberto={Boolean(visor)}
        onFechar={() => setVisor(null)}
        onIrParaAchado={(chave) => {
          setVisor(null);
          fila.abrir(chave);
        }}
      />
    </div>
  );
}

/**
 * A COLUNA DO CHAT, só para ocupar o espaço que ela ocupa na tela real (~280px
 * à direita do palco). Não conversa: o chat de verdade é o do Nexo.
 */
function ChatDeMentira() {
  return (
    <aside className="am-chat" aria-label="Chat do Nexo (simulado)">
      <header>
        <i className="am-chat-orbe" aria-hidden /> Nexo <small>simulado no laboratório</small>
      </header>
      <div className="am-chat-msgs">
        <p className="am-chat-msg am-chat-msg--eu">Auditar este memorial</p>
        <p className="am-chat-msg">Li o memorial: 53 achados, 8 bloqueiam a emissão. Abra a fila para tratar um por vez.</p>
        <p className="am-chat-msg am-chat-msg--eu">O que diverge no ACH-001?</p>
        <p className="am-chat-msg">A p. 11 cita “Cidade do Autista”, mas a capa e a p. 10 identificam a obra como “Centro Comunitário Primeira Linha”.</p>
      </div>
      <div className="am-chat-campo">Escreva para o Nexo…</div>
    </aside>
  );
}
