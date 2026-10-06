"use client";

/**
 * AS SAÍDAS DE UMA RESPOSTA (desenho do lab: `Saidas` da Conversa v2):
 * empilhadas, na largura do texto, a principal em papel claro. Responder com
 * uma delas é o mesmo que escrever no campo — `fill` só preenche (a pessoa
 * completa), o resto envia.
 *
 * Os rótulos acessíveis ("Enviar: …", "Preencher no campo de mensagem: …")
 * são os de antes: dizem o que o clique faz, e o tour e as provas os leem.
 */

import { ArrowRight, CornerDownLeft, Pencil } from "lucide-react";

import type { NexoAgentProposal, NexoSlotSuggestion } from "../types";
import { nextStepsFor } from "../lib/next-steps";
import { useComposer } from "../state/composer-controller";
import { useConversation } from "../state/conversation-store";

export function QuickReplyChips({ suggestions, className }: { suggestions: NexoSlotSuggestion[]; className?: string }) {
  const composer = useComposer();
  if (suggestions.length === 0) return null;

  return (
    <div className={`cx-saidas${className ? ` ${className}` : ""}`}>
      {suggestions.map((s, i) => {
        const isFill = s.commit === "fill";
        return (
          <button
            key={`${s.value}-${i}`}
            type="button"
            className={`cx-saida${i === 0 ? " cx-saida--principal" : ""}`}
            aria-label={isFill ? `Preencher no campo de mensagem: ${s.label}` : `Enviar: ${s.label}`}
            onClick={() => (isFill ? composer.fill(s.value) : composer.send(s.value))}
          >
            {s.label}
            {isFill ? <Pencil size={13} aria-hidden /> : <CornerDownLeft size={13} aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}

export function NextStepChips({ proposals, className }: { proposals: NexoAgentProposal[] | undefined; className?: string }) {
  const composer = useComposer();
  const { results } = useConversation();
  const steps = nextStepsFor(proposals, new Set(results.map((r) => r.kind)));
  if (steps.length === 0) return null;

  return (
    <div className={`nx-proximo${className ? ` ${className}` : ""}`}>
      {/* O rótulo do grupo: sem ele as saídas leem como botões soltos no fim da conversa. */}
      <span className="cx-passo">Próximo passo</span>
      <div className="cx-saidas">
        {steps.map((s, i) => (
          <button key={s.label} type="button" className={`cx-saida${i === 0 ? " cx-saida--principal" : ""}`} aria-label={`Enviar: ${s.label}`} onClick={() => composer.send(s.send)}>
            {s.label}
            <ArrowRight size={13} aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}
