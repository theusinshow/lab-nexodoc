import { INVENTARIO } from "@/lib/design-lab/inventario";

/**
 * Os itens aprováveis de cada fase, com o mesmo `id` que o registro grava. A
 * visão geral conta o andamento a partir daqui, e cada página usa os mesmos
 * ids nos seus selos — uma lista só, para a conta não mentir.
 */

export const ITENS_DO_INVENTARIO = INVENTARIO.flatMap((g) =>
  g.telas.map((t) => ({ id: `inv.${t.id}`, rotulo: t.nome })),
);

export const ITENS_DOS_FUNDAMENTOS = [
  { id: "fund.principios", rotulo: "Princípios" },
  { id: "fund.cor.superficies", rotulo: "Superfícies" },
  { id: "fund.cor.texto", rotulo: "Texto" },
  { id: "fund.cor.linhas", rotulo: "Linhas" },
  { id: "fund.cor.nexo", rotulo: "Cor do Nexo e ação principal" },
  { id: "fund.cor.gravidade", rotulo: "Gravidade" },
  { id: "fund.cor.estado", rotulo: "Estado do sistema" },
  { id: "fund.cor.disciplinas", rotulo: "Disciplinas" },
  { id: "fund.cor.prefeituras", rotulo: "Prefeituras" },
  { id: "fund.tipo", rotulo: "Tipografia" },
  { id: "fund.espaco", rotulo: "Espaço" },
  { id: "fund.raio", rotulo: "Raio" },
  { id: "fund.elevacao", rotulo: "Elevação" },
  { id: "fund.movimento", rotulo: "Movimento" },
  { id: "fund.foco", rotulo: "Foco" },
] as const;
