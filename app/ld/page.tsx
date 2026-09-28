import { redirect } from "next/navigation";

import { lerContextoDaUrl, linkDoNexo } from "@/lib/contexto-da-url";

/**
 * `/ld` — ENDEREÇO ANTIGO, mantido para não virar 404 (auditoria UX/UI, G03).
 *
 * O detalhe do projeto (e favoritos de quem usou a tela antiga) apontam para
 * cá. A LD hoje é gerada no Nexo, a partir das pranchas; o redirecionamento
 * entrega a INTENÇÃO ("gerar a LD") e o PROJETO, em vez de uma saudação
 * genérica. `?project=` e `?projeto=` são aceitos; o destino usa o canônico.
 * Quem valida o acesso ao projeto é `/nexo`, no servidor.
 */
export default async function LdLegadaPage({
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
  redirect(linkDoNexo({ projeto, intencao: "ld" }));
}
