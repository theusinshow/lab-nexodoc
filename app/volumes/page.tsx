import { redirect } from "next/navigation";

import { lerContextoDaUrl, linkDoNexo } from "@/lib/contexto-da-url";

/**
 * `/volumes` — ENDEREÇO ANTIGO, mantido para não virar 404.
 *
 * Era a montagem manual de volumes com PDFs já prontos. Saiu em 01/10/2026,
 * por decisão do Matheus ("é antigo, pode ser removido com cuidado"): montar
 * volume é no Nexo, a partir das pranchas. Mesmo contrato de `/capas` e `/ld`:
 * leva ao Nexo com a intenção "montar" e o projeto pedido (`?project=` de
 * antes continua aceito). A validação do acesso acontece em `/nexo`.
 *
 * O rascunho de montagem que alguém tenha deixado no navegador não é lido por
 * mais ninguém: o aviso foi dado antes da retirada.
 */
export default async function VolumesLegadaPage({
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
  redirect(linkDoNexo({ projeto, intencao: "montar" }));
}
