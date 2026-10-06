"use client";

/**
 * MONTAR UM / MONTAR TODOS — o laço que morava em `VolumesDoConjunto`, agora
 * para quem não é cartão: o cartão curto do chat e o canvas. A montagem de
 * cada tomo é o montador registrado pelo cartão sem tela.
 */
import { useMemo, useState } from "react";

import type { SeloForLd } from "@/server/nexo/build-ld-proposal";
import { summarizeSelos } from "../lib/agent-context";
import { montarEmLote } from "../lib/lote-de-volumes";
import { idDoVolume, tomosDoVolume } from "../lib/tomos-do-volume";
import { useConversation } from "./conversation-store";
import { useFasesDaMontagem, useMontadoresDeVolume } from "./montadores-de-volume";

export function useMontarTodos(selos: SeloForLd[]) {
  const { montador } = useMontadoresDeVolume();
  const { marcarFase } = useFasesDaMontagem();
  const { results, conferirAntesDeGastar } = useConversation();
  const [montando, setMontando] = useState(false);
  const [falhas, setFalhas] = useState<{ rotulo: string; motivo: string }[]>([]);

  const tomos = useMemo(() => {
    const codigo = summarizeSelos(selos).codigo;
    const lista = tomosDoVolume(results);
    return lista.map((t) => ({
      id: idDoVolume(codigo, t.sufixo),
      numero: t.numero,
      rotulo: lista.length > 1 ? `TOMO ${String(t.numero).padStart(2, "0")}` : "VOLUME",
    }));
  }, [selos, results]);

  async function montarUm(id: string): Promise<string | null> {
    const m = montador(id);
    if (!m) return "Gere a capa e a LD primeiro.";
    return m();
  }

  async function montarTodos() {
    setFalhas([]);
    setMontando(true);
    for (const t of tomos) if (montador(t.id)) marcarFase(t.id, "aguardando");
    const comecados = new Set<number>();
    let coletadas: { rotulo: string; motivo: string }[] = [];
    try {
      const lote = await montarEmLote({
        itens: tomos.map((t) => ({ id: t.id, rotulo: t.rotulo, montar: montador(t.id) })),
        conferir: conferirAntesDeGastar,
        aoComecar: (i) => comecados.add(i),
      });
      coletadas = lote.recusado ? [{ rotulo: "Volumes", motivo: lote.recusado }] : lote.falhas;
    } finally {
      // Quem não chegou a começar sai da fila — senão "montando" para sempre.
      tomos.forEach((t, i) => {
        if (!comecados.has(i)) marcarFase(t.id, null);
      });
      setFalhas(coletadas);
      setMontando(false);
    }
  }

  return { tomos, montando, falhas, montarTodos, montarUm };
}
