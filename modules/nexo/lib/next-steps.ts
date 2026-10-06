/**
 * Próximos passos DETERMINÍSTICOS a partir do que a mensagem propôs (núcleo puro,
 * só `import type` → testável com node cru). Ordem do fluxo do escritório:
 * ld → capa → volume (conferir as folhas é opcional e vem por último). Cada passo vira um chip que ENVIA a frase ao
 * agente (a IA re-propõe). Vazio quando não há LD/capa proposta (nada a encadear).
 */
import type { NexoAgentProposal } from "../types";

/** Um próximo passo: rótulo + a frase que vai ao agente ao clicar. */
export interface NextStep {
  label: string;
  send: string;
}

export function nextStepsFor(
  proposals: NexoAgentProposal[] | undefined,
  /** Os tipos JÁ GERADOS na conversa. Sem isto, vale só o que foi proposto. */
  gerados?: ReadonlySet<string>,
): NextStep[] {
  const kinds = new Set((proposals ?? []).map((p) => p.kind));
  if (!kinds.has("ld") && !kinds.has("capa")) return [];
  /*
   * PROPOSTO NÃO É GERADO (06/10/2026): com o plano ainda por gerar, o próximo
   * passo é o "Gerar" do próprio plano. "Montar o volume" aceso ali levou a
   * três pedidos seguidos de montagem que não podiam montar nada.
   */
  if (gerados && [...kinds].some((k) => (k === "ld" || k === "capa") && !gerados.has(k))) return [];
  const steps: NextStep[] = [];
  if (kinds.has("ld") && !kinds.has("capa")) {
    steps.push({ label: "Gerar a capa", send: "Gera a capa também" });
  }
  if (kinds.has("capa") && !kinds.has("ld")) {
    steps.push({ label: "Gerar a LD", send: "Gera a LD também" });
  }
  // MONTAR antes de CONFERIR (06/10/2026): o primeiro chip é o aceso, e o
  // passo seguinte do fluxo é montar; conferir as folhas é opcional — a
  // montagem já confere o volume no fim.
  steps.push({ label: "Montar o volume", send: "Monta o volume" });
  steps.push({ label: "Conferir as folhas", send: "Confere as folhas" });
  return steps;
}
