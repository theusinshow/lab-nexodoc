"use client";

import { AnimatePresence, motion } from "motion/react";
import { Maximize2, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { Botao } from "@/components/ds/basicos";

import { Aprovacao } from "./aprovacao";
import { useLab } from "./contexto";

/**
 * A VITRINE de uma tela: escolhe a situação, mostra a tela de verdade e pede
 * UMA decisão por situação. É o formato que o Matheus pediu — julgar olhando
 * e clicando, não lendo lista.
 *
 * A tela é desenhada para 1440 px e aparece reduzida para caber; "Tela cheia"
 * mostra no tamanho real. Trocar de situação remonta a tela, para que ela
 * comece do estado certo.
 */
export function Vitrine<S extends string>({
  telaId,
  situacoes,
  render,
}: {
  telaId: string;
  situacoes: { id: S; nome: string; dica: string }[];
  render: (s: S) => ReactNode;
}) {
  const [atual, setAtual] = useState<S>(situacoes[0].id);
  const [cheia, setCheia] = useState(false);
  const { aprovacoes } = useLab();
  const sit = situacoes.find((s) => s.id === atual)!;

  useEffect(() => {
    if (!cheia) return;
    // Esc já tratado por algo dentro da tela (barra, menu) não fecha a tela cheia.
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !e.defaultPrevented && setCheia(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [cheia]);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div className="vt-situacoes" role="tablist" aria-label="Situações da tela">
        {situacoes.map((s, i) => {
          const st = aprovacoes[`tela.${telaId}.${s.id}`]?.status;
          return (
            <button key={s.id} type="button" role="tab" aria-selected={s.id === atual} onClick={() => setAtual(s.id)}>
              <span className="ds-num vt-n">{i + 1}</span>
              {s.nome}
              {st && st !== "pendente" && <i data-status={st} aria-label={st === "aprovado" ? "aprovado" : "mudança pedida"} />}
            </button>
          );
        })}
      </div>

      <div className="vt-barra">
        <p>
          <b>{sit.nome}.</b> {sit.dica}
        </p>
        <Botao variante="ghost" tamanho="sm" onClick={() => setCheia(true)}>
          <Maximize2 />
          Tela cheia
        </Botao>
        <Aprovacao key={atual} id={`tela.${telaId}.${atual}`} rotulo={`${sit.nome}`} />
      </div>

      {/* Com a tela cheia aberta, a miniatura sai de cena: duas cópias vivas
          ouviriam o mesmo teclado. */}
      <Moldura>{!cheia && render(atual)}</Moldura>

      <AnimatePresence>
        {cheia && (
          <motion.div
            className="vt-cheia"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="vt-cheia-barra">
              <span>
                {sit.nome}. <span style={{ color: "var(--ds-text-tertiary)" }}>Esc para sair</span>
              </span>
              <Botao variante="quiet" tamanho="sm" icone aria-label="Sair da tela cheia" onClick={() => setCheia(false)}>
                <X />
              </Botao>
            </div>
            <div className="vt-cheia-tela">{render(atual)}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Moldura({ children }: { children: ReactNode }) {
  const fora = useRef<HTMLDivElement>(null);
  const dentro = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  const [h, setH] = useState(900);

  useLayoutEffect(() => {
    const medir = () => {
      if (!fora.current || !dentro.current) return;
      setK(Math.min(1, fora.current.clientWidth / 1440));
      setH(dentro.current.offsetHeight);
    };
    medir();
    const ro = new ResizeObserver(medir);
    if (fora.current) ro.observe(fora.current);
    if (dentro.current) ro.observe(dentro.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={fora} className="vt-moldura" style={{ height: h * k }}>
      <div ref={dentro} style={{ width: 1440, minHeight: 900, transform: `scale(${k})`, transformOrigin: "0 0" }}>
        {children}
      </div>
    </div>
  );
}
