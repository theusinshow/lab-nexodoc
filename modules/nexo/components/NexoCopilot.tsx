"use client";

/**
 * NexoCopilot — orb (acima) + chat, a unidade que VIAJA centro→direita no slide.
 * É o nó reposicionado pelo shell (view-transition-name); o `NexoChat` dentro é
 * montado UMA vez (continuidade §1) e o orb viaja junto, sempre acima do chat.
 *
 * Welcome: orb grande + saudação, chat como caixa centralizada. Active: orb
 * pequeno + chat docado alto (direita).
 */

import { useState } from "react";

import { Orbe } from "@/components/ds/basicos";
import { cn } from "@/lib/utils";
import type { SeloForLd } from "@/server/nexo/build-ld-proposal";
import { AgentPopover } from "@/components/ui/agent-popover";
import { useComposer } from "../state/composer-controller";
import { AgentOrb, AgentStatusPopover, type AgentState } from "./agent-orb";
import type { AgentContext } from "../lib/agent-context";
import { NexoChat, type ReadStatus, type Attachment } from "./NexoChat";
import { PartidasDoNexo } from "./PartidasDoNexo";
import type { Partida } from "../lib/partidas";
import { SaudacaoDoNexo } from "./SaudacaoDoNexo";

export function NexoCopilot({
  started,
  nome,
  selos,
  onSend,
  onAttach,
  arrastando = false,
  readStatus,
  agentState = "idle",
  ouvindo = false,
  fileCount = 0,
  activity = 0,
  context,
  pranchaFiles,
  memorialFile,
  memorialFatos = null,
  attachments,
  onRemoveAttachment,
  onTrocarPapelAnexo,
  onDefinirPapelAnexo,
  onTurnStatus,
  tarefa = null,
  onEscolherTarefa,
}: {
  /** A tarefa da tela (Painel → Nexo, ou um atalho): a entrada fala dela. */
  tarefa?: Partida | null;
  onEscolherTarefa?: (id: string) => void;
  started: boolean;
  /** Nome de quem está logado — a saudação usa o primeiro. */
  nome?: string | null;
  selos: SeloForLd[];
  onSend?: () => void;
  onAttach?: () => void;
  /** Arrasto em curso: a zona de solta cede a vez ao overlay de tela cheia. */
  arrastando?: boolean;
  readStatus?: ReadStatus | null;
  /** Estado do Nexo Core (derivado dos sinais do app pelo NexoWorkspace). */
  agentState?: AgentState;
  /** Cursor no composer: o orbe levanta o aro enquanto você escreve. */
  ouvindo?: boolean;
  fileCount?: number;
  /** Atividade real 0..1: progresso da leitura ou cadência do texto. */
  activity?: number;
  /** Contexto derivado dos selos (o que o Nexo já entendeu) — popover do orb. */
  context: AgentContext;
  /** Pranchas originais retidas (bytes p/ montar o volume no chat). */
  pranchaFiles: File[];
  /** Memorial anexado (arquivo distinto) — alimenta a auditoria no chat. */
  memorialFile: File | null;
  /** O que a classificação leu do memorial — vai ao agente como fato. */
  memorialFatos?: {
    fileName: string;
    obra?: string | null;
    /** Prefeitura/órgão emissor lido do próprio memorial. */
    orgao?: string | null;
    municipio?: string | null;
    codigo?: string | null;
    /** Endereço da caracterização da obra — distingue obras de mesmo nome. */
    endereco?: string | null;
  } | null;
  /** Anexos com preview imediato (imagem/PDF). */
  attachments: Attachment[];
  onRemoveAttachment?: (id: string) => void;
  /** Corrige o papel lido do nome do arquivo (memorial ↔ prancha). */
  onTrocarPapelAnexo?: (id: string) => void;
  onDefinirPapelAnexo?: (id: string, papel: "memorial" | "prancha") => void;
  onTurnStatus?: (s: { thinking: boolean; error: boolean; responding: boolean }) => void;
}) {
  // Popover de status: clique no orb "espia a cabeça" do agente.
  const [popoverOpen, setPopoverOpen] = useState(false);
  const composer = useComposer();

  /*
   * O CLIQUE NO ORBE TEM DUAS RESPOSTAS, porque tem duas situações.
   *
   * Com fatos lidos, ele abre o cartão — que é a razão de o cartão existir.
   * SEM fatos, abrir o cartão era um beco: na tela de boas-vindas ele cobria a
   * própria saudação para repetir, em letra menor, o convite que já estava
   * escrito atrás dele ("solte os PDFs"). Duas vezes a mesma frase, uma delas
   * tapando a outra.
   *
   * Então, vazio, o clique faz a coisa útil: leva o cursor para o campo. O orbe
   * deixa de ser um enfeite clicável e vira a porta de entrada.
   */
  const temFatos = context.folhas > 0;
  const ativarOrbe = () => {
    if (temFatos) setPopoverOpen((o) => !o);
    else composer.focus();
  };

  /*
   * O ORBE FALA A SAUDAÇÃO. Enquanto a frase se escreve, ele fica em
   * `responding` — que é o estado de quem está produzindo texto, e é
   * literalmente o que está acontecendo. Não é um estado inventado para a
   * animação: é o mesmo que ele usa quando responde no chat.
   *
   * Só vale na tela de boas-vindas. Depois que a conversa começa, quem manda no
   * orbe é o trabalho de verdade.
   */
  const [saudando, setSaudando] = useState(false);
  const orbState: AgentState = !started && saudando ? "responding" : agentState;
  const orbActivity = !started && saudando ? 0.5 : activity;

  /*
   * O RÓTULO LÊ O ESTADO, e não mais o store da auditoria.
   *
   * Havia aqui um `useAuditoria().emCurso` só para o texto: o estado visual não
   * sabia distinguir auditoria de turno de chat, então o rótulo consertava por
   * fora o que a máquina não dizia. Com `auditing` no enum, a informação chega
   * pelo mesmo caminho de todo o resto — e as duas leituras (a cara e o nome)
   * não têm mais como divergir, que era o risco de manter duas fontes.
   */
  const working =
    agentState === "analyzing" ||
    agentState === "responding" ||
    agentState === "reading" ||
    agentState === "auditing";
  // Base do rótulo SEM reticência — a "…" animada é adicionada no render quando
  // está trabalhando (movimento = o Nexo está fazendo algo).
  const statusLabel =
    agentState === "error"
      ? "instabilidade"
      : agentState === "reading"
        ? "lendo os selos"
        : agentState === "auditing"
          ? "auditando o memorial"
          : // Fora do grupo `working` de propósito: esperar não é trabalhar, e a
            // reticência animada diria que o Nexo está fazendo alguma coisa.
            agentState === "waiting"
            ? "aguardando você"
              : working
                ? "pensando"
                : fileCount > 0
                  ? `${fileCount} folha${fileCount > 1 ? "s" : ""} no contexto`
                  : "pronto";

  /*
   * O ESTADO DO NEXO, numa linha só no alto do chat docado (Conversa v2): o
   * orbe pequeno do ds — trabalhando, ele gira — e o que está fazendo, em
   * texto. Tocar no orbe abre o cartão de status (o que ele sabe da conversa);
   * sem fatos ainda, leva ao campo. Na entrada (sem conversa) o orbe grande
   * continua: é a presença do Nexo, a exceção à regra do movimento.
   */
  const orbe = (
    <AgentPopover
      open={popoverOpen && temFatos}
      onClose={() => setPopoverOpen(false)}
      label="Status do Nexo"
      anchor={
        started ? (
          <button type="button" className="nx-chat-orbe" onClick={ativarOrbe} aria-label={`Nexo: ${statusLabel}`}>
            <Orbe tamanho={18} estado={working ? "trabalhando" : "repouso"} />
          </button>
        ) : (
          <AgentOrb state={orbState} ouvindo={ouvindo} fileCount={fileCount} activity={orbActivity} size="hero" interactive onActivate={ativarOrbe} />
        )
      }
    >
      {/* O mesmo `activity` que move o orbe alimenta a barra do cartão: um
          número só, duas leituras — a física e a numérica. */}
      <AgentStatusPopover state={agentState} context={context} progresso={activity} />
    </AgentPopover>
  );

  return (
    <div className={cn("flex h-full min-h-0 flex-col", started ? "" : "justify-center gap-3")}>
      {started ? (
        <header data-tour="orbe" className="nw-chat-cabeca nx-chat-cabeca">
          {orbe}
          <span className="nw-chat-titulo">Nexo</span>
          <span className={working ? "nx-chat-estado nx-chat-estado--trabalhando" : "nx-chat-estado"} aria-live="polite">
            {statusLabel}
          </span>
        </header>
      ) : (
        <div data-tour="orbe" className="flex shrink-0 flex-col items-center gap-2 pt-1 text-center">
          {orbe}
          {/*
            A ENTRADA. As DUAS portas continuam nomeadas — a tela dizia só
            "montar" e falava só de pranchas, e quem chegava com um memorial na
            mão não sabia que a auditoria mora aqui —, mas agora quem as nomeia é
            o próprio Nexo, escrevendo.
          */}
          <>
            <SaudacaoDoNexo nome={nome} convite={tarefa?.tela.convite} onDigitando={setSaudando} />
            {/*
              As partidas ENTRAM COM A SAUDAÇÃO, e saem com ela: passada a
              primeira mensagem, a pessoa já sabe pedir, e três chips fixos no
              topo de toda conversa seriam mobília.
            */}
            <PartidasDoNexo
              temPranchas={pranchaFiles.length > 0 || selos.length > 0}
              temMemorial={Boolean(memorialFile)}
              onAnexar={onAttach}
              ativa={tarefa?.id ?? null}
              onEscolher={onEscolherTarefa}
            />
          </>
        </div>
      )}

      <div
        className={cn(
          "min-h-0 w-full",
          started ? "flex-1" : "h-[460px] max-h-full",
        )}
      >
        <NexoChat
          selos={selos}
          onSend={onSend}
          onAttach={onAttach}
          arrastando={arrastando}
          tarefa={tarefa?.tela ?? null}
          readStatus={readStatus}
          pranchaFiles={pranchaFiles}
          memorialFile={memorialFile}
          memorialFatos={memorialFatos}
          attachments={attachments}
          onRemoveAttachment={onRemoveAttachment}
          onTrocarPapelAnexo={onTrocarPapelAnexo}
          onDefinirPapelAnexo={onDefinirPapelAnexo}
          onTurnStatus={onTurnStatus}
        />
      </div>
    </div>
  );
}
