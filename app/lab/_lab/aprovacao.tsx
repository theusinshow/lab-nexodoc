"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useState } from "react";

import { CURVA, DURACAO, MOLA, escalarMola } from "@/lib/ds/movimento";

import { useLab, type StatusDeAprovacao } from "./contexto";

/**
 * O SELO DE APROVAÇÃO de cada item do lab. Três estados, uma nota.
 *
 * É também a primeira micro-interação do catálogo, e segue a regra dele: a
 * pílula DESLIZA de um estado para o outro porque a pergunta é "para onde foi
 * a decisão" — o olho acompanha a troca em vez de procurá-la. A nota só se abre
 * quando há o que dizer (pedido de mudança, ou nota já escrita).
 */

const OPCOES: { status: StatusDeAprovacao; rotulo: string }[] = [
  { status: "pendente", rotulo: "Pendente" },
  { status: "mudar", rotulo: "Pedir mudança" },
  { status: "aprovado", rotulo: "Aprovado" },
];

const QUANDO = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export function Aprovacao({ id, rotulo }: { id: string; rotulo: string }) {
  const { aprovacoes, gravar, escala, carregado } = useLab();
  const atual = aprovacoes[id];
  const status = atual?.status ?? "pendente";
  const [nota, setNota] = useState(atual?.nota ?? "");
  const [falhou, setFalhou] = useState(false);
  const grupo = useId();

  // O registro chega depois da primeira pintura; a nota acompanha.
  useEffect(() => {
    setNota(atual?.nota ?? "");
  }, [atual?.nota]);

  const abrirNota = status === "mudar" || nota.length > 0;

  async function escolher(s: StatusDeAprovacao) {
    const ok = await gravar(id, s, nota);
    setFalhou(!ok);
  }

  return (
    <div className="aprov">
      <div className="aprov-seg" role="radiogroup" aria-label={`Decisão sobre ${rotulo}`}>
        {OPCOES.map((o) => {
          const ligado = status === o.status;
          return (
            <button
              key={o.status}
              type="button"
              role="radio"
              aria-checked={ligado}
              data-status={o.status}
              onClick={() => escolher(o.status)}
            >
              {ligado && (
                <motion.span
                  layoutId={`${grupo}-pilula`}
                  className="aprov-pilula"
                  transition={escalarMola(MOLA.snappy, escala)}
                />
              )}
              <span>
                {o.status === "aprovado" && ligado && (
                  <motion.svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    {/* O check se DESENHA: é a confirmação de que gravou. */}
                    <motion.path
                      d="m5 12.5 4.5 4.5L19 7.5"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: DURACAO.enter * escala, ease: CURVA.out, delay: 0.06 * escala }}
                    />
                  </motion.svg>
                )}
                {o.rotulo}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {abrirNota && (
          <motion.div
            key="nota"
            style={{ width: "100%", overflow: "hidden" }}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DURACAO.layout * escala, ease: CURVA.out }}
          >
            <textarea
              className="aprov-nota"
              aria-label={`Nota sobre ${rotulo}`}
              placeholder="O que mudar, e por quê."
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              onBlur={() => {
                if (nota !== (atual?.nota ?? "")) void escolher(status);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="aprov-meta" aria-live="polite">
        {falhou
          ? "Não gravou. O registro só grava com o lab rodando em desenvolvimento."
          : atual
            ? `${status === "aprovado" ? "Aprovado" : status === "mudar" ? "Mudança pedida" : "Pendente"} em ${QUANDO.format(new Date(atual.em))}`
            : carregado
              ? "Ainda sem decisão"
              : ""}
      </div>
    </div>
  );
}
