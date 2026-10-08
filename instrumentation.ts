/**
 * O ERRO DE SERVIDOR VIRA CHAMADO (Next 16: `onRequestError`).
 *
 * Roda para todo erro lançado em rota, API, server action e render. O import é
 * dinâmico e só no runtime node: o serviço puxa Prisma, que não existe na borda.
 *
 * Nunca lança e nunca reporta a si mesmo (`/api/suporte*`).
 */
import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const caminho = request.path.split("?")[0];
  if (caminho.startsWith("/api/suporte")) return;
  try {
    const { isDatabaseConfigured } = await import("@/lib/db");
    if (!isDatabaseConfigured()) return;
    const { registrarErro } = await import("@/server/suporte/chamados");
    const e = err as Error & { digest?: string };
    await registrarErro({
      origem: "ERRO_SERVIDOR",
      rota: caminho,
      nome: e?.name || "Error",
      mensagem: e?.message || String(err),
      digest: e?.digest ?? null,
      stack: e?.stack ?? null,
      quem: null,
      contexto: { metodo: request.method, trilha: [] },
    });
  } catch (falha) {
    console.error("[suporte] onRequestError não conseguiu registrar:", falha);
  }
};
