import { redirect } from "next/navigation";

import { lerContextoDaUrl, linkDoNexo } from "@/lib/contexto-da-url";

/**
 * `/capas` — ENDEREÇO ANTIGO, mantido para não virar 404 (auditoria UX/UI, G03).
 *
 * Mesmo contrato de `/ld`: leva ao Nexo com a intenção "gerar a capa" e o
 * projeto pedido. A validação do acesso acontece em `/nexo`, no servidor.
 */
export default async function CapasLegadaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { projeto } = lerContextoDaUrl({
    get: (nome) => {
      const v = params[nome];
      return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
    },
  });
  redirect(linkDoNexo({ projeto, intencao: "capa" }));
}
