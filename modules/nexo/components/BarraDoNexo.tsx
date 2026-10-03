"use client";

/**
 * DE QUE OBRA É ESTA CONVERSA, e o que está acontecendo nela — o começo do
 * cabeçalho do palco (desenho do lab: `nw-obra` + `nw-estado`). Era uma faixa
 * atravessando as três colunas; no sistema novo ela mora no palco, porque é do
 * trabalho do palco que ela fala.
 *
 * Duas camadas. Em REPOUSO: a marca da prefeitura, o código e a obra (lidos
 * dos selos ou do projeto pedido por link). TRABALHANDO: a auditoria em curso,
 * a etapa e Cancelar — a marca sai, porque identidade ao lado de progresso
 * disputa o olho com o único campo que muda ali.
 */

import { X } from "lucide-react";
import { useState } from "react";

import { Botao, Girando } from "@/components/ds/basicos";
import { contextoDaBarra } from "../lib/contexto-da-barra";
import { resumoDaAuditoria } from "../lib/resumo-da-auditoria";
import { auditoriaDaConversa, useAuditoria } from "../state/auditoria-store";
import { useConversation } from "../state/conversation-store";
import type { ProjetoPedido } from "../lib/projeto-pedido";
import { MarcaDaPrefeitura } from "./MarcaDaPrefeitura";

/**
 * CANCELAR PERGUNTA ANTES (o "Cancelar a auditoria?" do lab). Um clique no
 * cabeçalho jogava fora minutos de análise já pagos; agora o botão abre a
 * pergunta no mesmo lugar, e continuar auditando é o botão em evidência.
 */
function CancelarComConfirmacao({ cancelar }: { cancelar: () => void }) {
  const [perguntando, setPerguntando] = useState(false);
  if (!perguntando) {
    return (
      <Botao variante="quiet" tamanho="sm" onClick={() => setPerguntando(true)}>
        <X size={13} aria-hidden /> Cancelar
      </Botao>
    );
  }
  return (
    <span className="nx-cancelar" role="alertdialog" aria-label="Cancelar a auditoria">
      <span>
        <b>Cancelar a auditoria?</b> Ela para agora e não gera parecer.
      </span>
      <Botao variante="ghost" tamanho="sm" autoFocus onClick={() => setPerguntando(false)}>
        Continuar auditando
      </Botao>
      <Botao variante="quiet" tamanho="sm" className="nx-cancelar-sim" onClick={cancelar}>
        Cancelar auditoria
      </Botao>
    </span>
  );
}

export function BarraDoNexo({ projetoPedido = null }: { projetoPedido?: ProjetoPedido | null } = {}) {
  const { conversationId, identidade, seloResults, projectId } = useConversation();
  const { emCurso } = useAuditoria();

  const auditando = auditoriaDaConversa(emCurso, conversationId);
  const contexto = contextoDaBarra({ identidade, seloResults });
  const projeto = projetoPedido?.estado === "ok" && projectId === projetoPedido.id ? projetoPedido : null;

  if (!auditando && !contexto && !projeto) return null;

  if (auditando) {
    const { rotulo, contagem } = resumoDaAuditoria(auditando.marcos);
    return (
      <span className="mp-trilha nw-obra nx-obra" data-camada="trabalho" role="status" aria-live="polite">
        <Girando tamanho={12} />
        <span>Auditoria</span>
        <span className="nx-obra-nome" title={auditando.arquivo}>
          {auditando.arquivo}
        </span>
        <span className="nw-estado">
          {rotulo}
          {contagem ? `, ${contagem}` : ""}
        </span>
        {auditando.cancelar && <CancelarComConfirmacao cancelar={auditando.cancelar} />}
      </span>
    );
  }

  if (!contexto) {
    return (
      <span className="mp-trilha nw-obra nx-obra" data-camada="repouso" data-projeto-da-conversa={projeto!.id}>
        <span className="mp-mono">{projeto!.codigo}</span>
        <span className="nx-obra-nome" title={projeto!.nome}>
          {projeto!.nome}
        </span>
        {projeto!.arquivado && <span className="nw-estado">arquivado</span>}
      </span>
    );
  }

  const { obra, orgao, codigo } = contexto;
  return (
    <span className="mp-trilha nw-obra nx-obra" data-camada="repouso" data-projeto-da-conversa={projeto?.id}>
      {/* A cor vem do órgão, que é opcional: sem órgão, marca cinza — "ainda não sei de quem é esta obra" é estado real. */}
      <MarcaDaPrefeitura prefeitura={orgao} forma="sinal" />
      {(codigo || projeto?.codigo) && <span className="mp-mono">{codigo || projeto?.codigo}</span>}
      <span className="nx-obra-nome" title={obra}>
        {obra}
      </span>
      {orgao && <span className="nw-estado nx-obra-orgao">{orgao}</span>}
    </span>
  );
}
