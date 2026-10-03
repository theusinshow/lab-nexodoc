"use client";

/**
 * A LINHA DO PENSAMENTO (desenho do lab: conversa/turnos.tsx, ref. Thought
 * Line), com o que o turno faz DE VERDADE.
 *
 * Enquanto pensa: a treliça, "Pensando" e o tempo correndo, e embaixo os passos
 * — o feito com visto, o da vez com o ponto. Quando a primeira palavra chega,
 * tudo recolhe em "Pensou por 1,8 s", que abre de novo no clique.
 *
 * No lab os passos andavam por relógio. Aqui cada um é um fato do turno: a
 * pergunta saiu, o que foi junto para o modelo (o parecer, os carimbos, o
 * memorial) e cada consulta que o chat da auditoria relata (`ferramenta`).
 * Nada aparece por tempo.
 */
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

import { Cronometro, Trelica } from "@/components/ds/micro";
import { RITMO, SUAVE } from "@/components/telas/comum/ritmo";
import { useTempo } from "@/lib/ds/tempo";

export interface PensamentoDoTurno {
  /** Quando o turno saiu (ms). */
  inicio: number;
  /** Quando a primeira palavra chegou; ausente = ainda pensando. */
  primeira?: number;
  passos: string[];
}

export function LinhaDoPensamento({ pensamento, pensando }: { pensamento: PensamentoDoTurno; pensando: boolean }) {
  const { k } = useTempo();
  const [aberta, setAberta] = useState(false);
  const segundos = pensamento.primeira ? (pensamento.primeira - pensamento.inicio) / 1000 : 0;
  const mostrar = pensando ? pensamento.passos : aberta ? pensamento.passos : [];
  return (
    <div className="cx-pensamento">
      {pensando ? (
        <span className="cx-pensando" role="status" aria-label="Nexo está pensando">
          <Trelica />
          <span>Pensando</span>
          <Cronometro desde={pensamento.inicio} />
        </span>
      ) : (
        <button type="button" className="cx-pensou" aria-expanded={aberta} onClick={() => setAberta((a) => !a)}>
          <Check size={13} aria-hidden />
          Pensou por <span className="ds-num">{segundos.toFixed(1).replace(".", ",")} s</span>
          <motion.span className="cx-pensou-seta" animate={{ rotate: aberta ? 180 : 0 }} transition={{ duration: RITMO.toque * k }}>
            <ChevronDown size={13} aria-hidden />
          </motion.span>
        </button>
      )}
      <AnimatePresence initial={false}>
        {mostrar.length > 0 && (
          <motion.ol
            className="cx-pensamento-passos"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: RITMO.troca * k, ease: SUAVE }}
          >
            {mostrar.map((p, i) => {
              const daVez = pensando && i === mostrar.length - 1;
              return (
                <motion.li key={`${i}-${p}`} data-da-vez={daVez || undefined} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: RITMO.toque * k }}>
                  {daVez ? <i aria-hidden /> : <Check size={12} aria-hidden />}
                  {p}
                </motion.li>
              );
            })}
          </motion.ol>
        )}
      </AnimatePresence>
    </div>
  );
}
