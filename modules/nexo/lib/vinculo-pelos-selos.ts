/**
 * O VÍNCULO PELOS SELOS (09/10/2026): o que a conversa de PRANCHAS leva ao
 * cadastro para achar o seu projeto.
 *
 * Até aqui só o memorial vinculava a conversa a um `Project`. Conversa de
 * volume ficava "a endereçar" para sempre — no banco de dev, 42 de 42 — e as
 * pranchas guardadas ([[pranchas-guardadas.ts]]) só sobem com projeto. O
 * código sai do carimbo pela MESMA leitura que nomeia a pasta da obra
 * (`summarizeSelos`): duas derivações do mesmo código discordariam.
 *
 * Sem código legível, nada: adivinhar projeto levaria pranchas para a obra
 * errada. Puro, testado em `scripts/test-vinculo-pelos-selos.ts`.
 */
import { summarizeSelos } from "./agent-context.ts";

type SeloLido = {
  fileName: string;
  extraction?: {
    arquivo?: string | null;
    disciplina?: string | null;
    obra?: string | null;
    cliente?: string | null;
  } | null;
};

export type PedidoDeVinculo = {
  codigoLido: string;
  prefeitura: string | null;
  obra: string | null;
};

export function pedidoDeVinculo(selos: readonly SeloLido[]): PedidoDeVinculo | null {
  if (selos.length === 0) return null;
  const resumo = summarizeSelos(
    selos.map((s) => ({
      fileName: s.fileName,
      arquivo: s.extraction?.arquivo ?? null,
      disciplina: s.extraction?.disciplina ?? null,
      obra: s.extraction?.obra ?? null,
    })),
  );
  if (!resumo.codigo) return null;
  const prefeitura = selos.find((s) => s.extraction?.cliente?.trim())?.extraction?.cliente?.trim() ?? null;
  return { codigoLido: resumo.codigo, prefeitura, obra: resumo.obra };
}
