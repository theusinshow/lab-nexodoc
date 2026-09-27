/**
 * Leitura da saída da Responses API sem heurística.
 *
 * `output_text` do SDK concatena todas as mensagens, inclusive `commentary`:
 * interpretar essa concatenação como um JSON único é o defeito que o piloto
 * pegou. Aqui só a mensagem final explícita conta; recusa, final ausente,
 * finais ambíguos e limite de saída viram estados próprios — nunca "achar um
 * JSON conveniente" por regex.
 *
 * Promovido de `scripts/audit-pilot/response-text.ts` (mesma semântica).
 */

export type ResponseErrorCode =
  | "missing_final_message"
  | "ambiguous_final_messages"
  | "invalid_message_content"
  | "response_refused"
  | "invalid_output_text";

/** Texto da mensagem final. Lança um `ResponseErrorCode`; "" quando só há chamadas de ferramenta. */
export function finalMessageText(output: Array<Record<string, unknown>>): string {
  const messages = output.filter(item => item.type === "message");
  const final = messages.filter(item => item.phase === "final_answer");
  const selected = final.length ? final : messages.filter(item => item.phase !== "commentary");
  if (!selected.length && output.some(item => item.type === "function_call")) return "";
  if (!selected.length) throw new Error("missing_final_message");
  if (selected.length !== 1) throw new Error("ambiguous_final_messages");
  const content = selected[0].content;
  if (!Array.isArray(content)) throw new Error("invalid_message_content");
  if (content.some(item => item.type === "refusal")) throw new Error("response_refused");
  return content.filter(item => item.type === "output_text").map(item => {
    if (typeof item.text !== "string") throw new Error("invalid_output_text");
    return item.text;
  }).join("");
}

export type ToolCall = { callId: string; name: string; arguments: string };

export type Interpreted =
  | { kind: "tool_calls"; calls: ToolCall[] }
  | { kind: "final"; text: string }
  | { kind: "refused" }
  | { kind: "output_limit" }
  | { kind: "incomplete"; reason: string }
  | { kind: "invalid"; code: ResponseErrorCode | "invalid_tool_call" };

/**
 * Estado da resposta. Chamada de ferramenta tem precedência: a mensagem que a
 * acompanhe não é decisão. Itens de saída devem ser preservados pelo chamador
 * para a continuação (raciocínio cifrado, ids de chamada).
 */
export function interpretOutput(
  status: string,
  incompleteReason: string | null,
  output: Array<Record<string, unknown>>,
): Interpreted {
  if (status === "incomplete") {
    return incompleteReason === "max_output_tokens" ? { kind: "output_limit" } : { kind: "incomplete", reason: incompleteReason ?? "unknown" };
  }
  if (status !== "completed") return { kind: "incomplete", reason: status };
  const calls = output.filter(o => o.type === "function_call");
  if (calls.length) {
    for (const c of calls) {
      if (typeof c.call_id !== "string" || typeof c.name !== "string" || typeof c.arguments !== "string") {
        return { kind: "invalid", code: "invalid_tool_call" };
      }
    }
    return { kind: "tool_calls", calls: calls.map(c => ({ callId: c.call_id as string, name: c.name as string, arguments: c.arguments as string })) };
  }
  try {
    return { kind: "final", text: finalMessageText(output) };
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "response_refused") return { kind: "refused" };
    return { kind: "invalid", code: (["missing_final_message", "ambiguous_final_messages", "invalid_message_content", "invalid_output_text"].includes(code) ? code : "invalid_message_content") as ResponseErrorCode };
  }
}
