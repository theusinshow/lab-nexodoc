"use client";

import { Maximize2, PanelLeftClose, PanelRightClose } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { useIr, useNoPrototipo } from "../_comum/prototipo";
import { Topo } from "../_comum/topo";
import { TelaAuditoria } from "../auditoria/tela-auditoria";
import { Campo } from "../conversa/tela-conversa";
import { DeVoce, DoNexo, Passo, Respondendo, Saidas, type Arquivo } from "../conversa/turnos";
import { Conversas } from "../nexo/tela-nexo";
import { ACHADOS, DESFECHO_NOME } from "../resultado-e/dados";
import { TelaResultado, type SituacaoRes } from "../resultado-e/tela-resultado";
import "../conversa/conversa.css";
import "../nexo/nexo.css";
import "./nexo-auditoria.css";

/*
 * A AUDITORIA DENTRO DA CONVERSA (01/10/2026). O Matheus apontou que o
 * redesenho tinha perdido a premissa do app: o Nexo é um chat que audita. Aqui
 * a auditoria volta a ser uma conversa, no mesmo shell do Montar o volume:
 * conversas por obra | o palco (a auditoria rodando, depois o Resultado
 * inteiro) | o chat. Perguntar sobre o projeto auditado é escrever ao lado do
 * resultado; o achado citado na resposta abre no palco.
 */

export type SituacaoNexoAud = "rodando" | "pronta" | "achado" | "no-documento" | "respondendo" | "obra";

type Palco = { tipo: "auditoria" } | { tipo: "resultado"; sit: SituacaoRes; sel?: string };

const PALCO_DA: Record<SituacaoNexoAud, Palco> = {
  rodando: { tipo: "auditoria" },
  pronta: { tipo: "resultado", sit: "nao-emitir" },
  achado: { tipo: "resultado", sit: "fila", sel: "ACH-002" },
  "no-documento": { tipo: "resultado", sit: "memorial" },
  respondendo: { tipo: "resultado", sit: "parecer" },
  obra: { tipo: "resultado", sit: "nao-emitir" },
};

const MEMORIAL: Arquivo[] = [{ nome: "117_25_md_geral_a.pdf", paginas: 42 }];

/* ------------------------------ respostas ------------------------------ */

type Resposta = { texto: string; achado?: string };

/**
 * O Nexo do protótipo responde pelo que reconhece na pergunta: um achado
 * (pelo número ou pelo assunto), o que trava a emissão, a outra disciplina.
 * Fora disso, diz o que sabe responder. No app, quem responde é o modelo,
 * com o parecer da revisão como contexto.
 */
export function responder(pergunta: string): Resposta {
  const q = pergunta.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const id = q.match(/(?:ach|inc)[\s-]*0*(\d{1,3})/)?.[1];
  const qual = id ? `ACH-${id.padStart(3, "0")}` : /capa|carimbo|revis/.test(q) ? "ACH-001" : /arq-?07|lista de doc|\bld\b|prancha/.test(q) ? "ACH-002" : /area|1\.?240|1\.?180/.test(q) ? "ACH-003" : /5626|hidr/.test(q) ? "ACH-004" : /quadro de carga|reserva|eletric/.test(q) ? "ACH-005" : null;
  const a = qual ? ACHADOS.find((x) => x.id === qual) : null;
  if (a) {
    const estado = a.desfecho ? ` Já foi tratado (${DESFECHO_NOME[a.desfecho.tipo].toLowerCase()}) por ${a.desfecho.por}, ${a.desfecho.quando}.` : "";
    return {
      achado: a.id,
      texto: `${a.id}, página ${a.pagina}: ${a.errado} ${a.importa} O que fazer: ${a.fazer.charAt(0).toLowerCase()}${a.fazer.slice(1)}${estado} Abri ele ao lado.`,
    };
  }
  if (/emit|entreg|prefeitura|bloque|trava/.test(q))
    return {
      texto:
        "Dois achados travam a emissão: a capa diz revisão A e o carimbo diz B (ACH-001, p. 1), e o memorial cita a ARQ-07, que não está na lista de documentos (ACH-002, p. 6). Corrigidos os dois, a revisão B cai para com ressalvas: sobram duas decisões técnicas.",
    };
  if (/eletric|ele\b|hidro|outro memorial|estrutur/.test(q))
    return {
      texto:
        "Esta conversa é a do memorial geral. Na mesma obra, o memorial elétrico (117_25_md_ele_a.pdf, enviado pela Carla em 22/09) ainda não foi auditado; posso começar agora, numa conversa nova da 117-25.",
    };
  return {
    texto:
      "Posso explicar qualquer achado desta auditoria (ACH-001 a ACH-009), mostrar onde ele está no memorial, dizer o que trava a emissão ou resumir o parecer para o cliente. Pergunte pelo número ou pelo assunto.",
  };
}

/** O achado citado: número, gravidade e página; clicar abre no palco. */
function Citacao({ id, onAbrir }: { id: string; onAbrir: (id: string) => void }) {
  const a = ACHADOS.find((x) => x.id === id);
  if (!a) return null;
  return (
    <button type="button" className={`na-cita na-cita--${a.impacto}`} onClick={() => onAbrir(a.id)} title="Abrir no palco">
      <i aria-hidden />
      <span className="ds-code">{a.id}</span>
      <span className="na-cita-titulo">{a.titulo}</span>
      <span className="ds-num na-cita-pag">p. {a.pagina}</span>
    </button>
  );
}

/* ------------------------------ a tela ------------------------------ */

export function TelaNexoAuditoria({ situacao }: { situacao: SituacaoNexoAud }) {
  const ir = useIr();
  const proto = useNoPrototipo();
  const [palco, setPalco] = useState<Palco>(PALCO_DA[situacao]);
  const [volta, setVolta] = useState(0); // remonta o palco quando o chat escolhe outro achado
  const [perguntas, setPerguntas] = useState<{ texto: string; resposta: Resposta }[]>([]);
  const [semConversas, setSemConversas] = useState(false);
  const [semChat, setSemChat] = useState(false);
  const fio = useRef<HTMLDivElement>(null);
  const rodando = situacao === "rodando";

  // No protótipo a auditoria termina sozinha, como a de verdade, e o resultado abre no palco.
  useEffect(() => {
    if (!proto || !rodando) return;
    const id = setTimeout(() => ir("nexo-auditoria", "pronta"), 12000);
    return () => clearTimeout(id);
  }, [proto, rodando, ir]);

  useEffect(() => {
    fio.current?.scrollTo({ top: fio.current.scrollHeight, behavior: "smooth" });
  }, [perguntas.length]);

  const abrirAchado = (id: string) => {
    setPalco({ tipo: "resultado", sit: "fila", sel: id });
    setVolta((v) => v + 1);
  };
  const perguntar = (texto: string) => {
    const resposta = responder(texto);
    setPerguntas((l) => [...l, { texto, resposta }]);
    if (resposta.achado) abrirAchado(resposta.achado);
  };

  const estado = rodando ? "auditando, 9 de 12 blocos" : palco.tipo === "resultado" && palco.sit === "parecer" ? "relatório" : "não emitir";

  return (
    <div className="mp nw na">
      <Topo atual="Nexo" trabalhando={rodando} />
      <div className={`nw-mesa${semConversas ? " na-mesa--sem-conversas" : ""}${semChat ? " na-mesa--sem-chat" : ""}`}>
        <Conversas ativa="auditoria" />

        <main className="nw-palco" aria-label="A auditoria">
          <header className="nw-palco-cabeca">
            <span className="mp-trilha nw-obra">
              <MarcaDaPrefeitura prefeitura="Criciúma" forma="sinal" />
              <span className="mp-mono">117-25</span>
              <span>Memorial geral, rev. A</span>
              <span className="nw-estado">{estado}</span>
            </span>
            <span className="nw-vistas" role="tablist" aria-label="Vistas do palco">
              <button type="button" role="tab" aria-selected>
                Auditoria
              </button>
              <button type="button" role="tab" aria-selected={false} onClick={() => ir("nexo", "lido")}>
                Mapa do volume
              </button>
            </span>
            <span className="nw-espaco">
              <button
                type="button"
                aria-label="Abrir em tela cheia"
                title="Abrir em tela cheia"
                onClick={() => ir(rodando ? "auditoria" : "resultado", rodando ? "em-curso" : palco.tipo === "resultado" ? palco.sit : "nao-emitir")}
              >
                <Maximize2 size={15} />
              </button>
              <button type="button" aria-pressed={semConversas} aria-label={semConversas ? "Mostrar as conversas" : "Recolher as conversas"} title={semConversas ? "Mostrar as conversas" : "Recolher as conversas"} onClick={() => setSemConversas((v) => !v)}>
                <PanelLeftClose size={15} />
              </button>
              <button type="button" aria-pressed={semChat} aria-label={semChat ? "Mostrar o chat" : "Recolher o chat"} title={semChat ? "Mostrar o chat" : "Recolher o chat"} onClick={() => setSemChat((v) => !v)}>
                <PanelRightClose size={15} />
              </button>
            </span>
          </header>
          <div className="na-palco">
            {palco.tipo === "auditoria" ? <TelaAuditoria situacao="em-curso" embutido /> : <TelaResultado key={volta} situacao={palco.sit} selecionado={palco.sel} embutido />}
          </div>
        </main>

        <aside className="nw-chat cx" aria-label="Nexo">
          <header className="nw-chat-cabeca">
            <span className="nw-chat-titulo">Auditar o memorial geral</span>
            <span className="mp-g-fraco">117-25</span>
          </header>
          <div ref={fio} className="cx-fio nw-fio">
            <DeVoce arquivos={MEMORIAL} texto="audita esse memorial, é o da UBS" />
            {rodando ? (
              <DoNexo atraso={0.2}>
                <Passo texto="Lendo capítulo a capítulo, 9 de 12 blocos" emCurso />
                <p className="cx-texto">Até agora, 10 pontos. O segundo modelo ainda confere cada um antes do parecer. Pode fechar a aba: eu continuo, e o resultado abre aqui ao lado.</p>
              </DoNexo>
            ) : (
              <DoNexo atraso={0.2}>
                <Passo texto="Auditei o memorial geral, revisão A, em 4 min 21 s" />
                <p className="cx-texto">
                  <b>Não emitir.</b> 9 achados: 2 impedem a entrega, 3 pedem decisão técnica e 4 são de texto. Os dois que travam:
                </p>
                <div className="na-citas">
                  <Citacao id="ACH-001" onAbrir={abrirAchado} />
                  <Citacao id="ACH-002" onAbrir={abrirAchado} />
                </div>
                <Saidas itens={[{ texto: "O que trava a emissão?", principal: true }, { texto: "Resumir para o cliente" }, { texto: "Auditar de novo (nova rodada)" }]} onEscolher={(t) => perguntar(t === "Resumir para o cliente" ? "resume os bloqueios pro cliente" : t)} />
              </DoNexo>
            )}
            <Situacao s={situacao} onAbrir={abrirAchado} />
            {perguntas.map((p, i) => (
              <Perguntado key={i} texto={p.texto} resposta={p.resposta} onAbrir={abrirAchado} />
            ))}
          </div>
          <div className="nw-campo">
            <Campo respondendo={rodando || situacao === "respondendo"} onEnviar={perguntar} dica="Pergunte sobre esta auditoria: “por que a ACH-002 bloqueia?”" />
          </div>
        </aside>
      </div>
    </div>
  );
}

/** O que a situação já traz conversado (para abrir cada estado direto). */
function Situacao({ s, onAbrir }: { s: SituacaoNexoAud; onAbrir: (id: string) => void }): ReactNode {
  switch (s) {
    case "achado":
      return (
        <>
          <DeVoce texto="por que a ACH-002 bloqueia? a ARQ-07 está no jogo de pranchas" />
          <DoNexo atraso={0.3}>
            <Passo texto="Consultei o parecer e a lista de documentos" />
            <p className="cx-texto">
              Porque a lista de documentos (p. 3) vai só até a ARQ-06, e o memorial manda consultar a ARQ-07 na p. 6. Se a prancha existe, o que falta é ela na LD: gerar a LD de novo com a ARQ-07 resolve, sem mexer no memorial.
            </p>
            <Citacao id="ACH-002" onAbrir={onAbrir} />
          </DoNexo>
        </>
      );
    case "no-documento":
      return (
        <>
          <DeVoce texto="me mostra onde isso aparece no memorial" />
          <DoNexo atraso={0.3}>
            <p className="cx-texto">Página 6, no capítulo 2: “…conforme detalhado na prancha ARQ-07 (planta de cobertura)…”. Abri a página ao lado, com o trecho grifado.</p>
            <Citacao id="ACH-002" onAbrir={onAbrir} />
          </DoNexo>
        </>
      );
    case "respondendo":
      return (
        <>
          <DeVoce texto="resume os bloqueios em duas linhas pra mandar pro cliente" />
          <Respondendo texto="O memorial geral, revisão A, não pode ser emitido ainda: a capa está em revisão A e o carimbo em revisão B, e o texto cita a prancha ARQ-07, que não consta da lista de documentos. Ajustados os dois pontos, a revisão B segue com duas decisões técnicas de menor impacto." />
        </>
      );
    case "obra":
      return (
        <>
          <DeVoce texto="o que falta pra emitir a 117-25?" />
          <DoNexo atraso={0.3}>
            <Passo texto="Olhei a obra inteira" />
            <p className="cx-texto">Três coisas, nesta ordem:</p>
            <ol className="na-lista">
              <li>Corrigir os 2 bloqueios do memorial geral (ACH-001 e ACH-002).</li>
              <li>Auditar o memorial elétrico, que a Carla mandou em 22/09 e ainda não passou por mim.</li>
              <li>Montar o volume: LD, capas e separatrizes dos 2 tomos já existem.</li>
            </ol>
            <Saidas itens={[{ texto: "Montar o volume", principal: true }, { texto: "Auditar o memorial elétrico" }]} />
          </DoNexo>
        </>
      );
    default:
      return null;
  }
}

/** Uma pergunta feita agora, no protótipo: a resposta chega escrevendo. */
function Perguntado({ texto, resposta, onAbrir }: { texto: string; resposta: Resposta; onAbrir: (id: string) => void }) {
  return (
    <>
      <DeVoce texto={texto} />
      <Respondendo texto={resposta.texto} />
      {resposta.achado && (
        <div className="na-cita-solta">
          <Citacao id={resposta.achado} onAbrir={onAbrir} />
        </div>
      )}
    </>
  );
}
