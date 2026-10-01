"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";

import { BarraDeComando } from "../_comum/barra-de-comando";
import { ATALHOS } from "./dados";

/*
 * O QUE APARECE POR CIMA DE QUALQUER TELA. Três formas, cada uma com o seu
 * peso: a paleta e os atalhos escurecem a tela e prendem o foco (são um
 * desvio pedido pela pessoa); o aviso não escurece nada e não rouba foco (é
 * uma notícia sobre o que ela acabou de fazer).
 */

/** O véu e a caixa: escurece, centra no terço de cima, fecha com Esc e com clique fora. */
export function Camada({ aberta, onFechar, rotulo, largura, children }: { aberta: boolean; onFechar: () => void; rotulo: string; largura: number; children: ReactNode }) {
  const { dur } = useTempo();
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberta) return;
    const antes = document.activeElement as HTMLElement | null;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      onFechar();
    };
    document.addEventListener("keydown", esc);
    // Sem nada focável lá dentro (os atalhos), o foco vai para a própria caixa.
    requestAnimationFrame(() => {
      if (!caixa.current?.contains(document.activeElement)) caixa.current?.focus();
    });
    return () => {
      document.removeEventListener("keydown", esc);
      antes?.focus?.();
    };
  }, [aberta, onFechar]);

  return (
    <AnimatePresence>
      {aberta && (
        <motion.div
          className="pc-veu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: dur("feedback") } }}
          transition={{ duration: dur("enter") }}
          onMouseDown={(e) => e.target === e.currentTarget && onFechar()}
        >
          <motion.div
            ref={caixa}
            role="dialog"
            aria-modal="true"
            aria-label={rotulo}
            tabIndex={-1}
            className="pc-caixa"
            style={{ width: `min(${largura}px, 100% - 32px)` }}
            initial={{ opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99, transition: { duration: dur("feedback"), ease: [...CURVA.exit] } }}
            transition={{ duration: dur("enter"), ease: [...CURVA.out] }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Paleta({ aberta, onFechar, inicialQ = "" }: { aberta: boolean; onFechar: () => void; inicialQ?: string }) {
  return (
    <Camada aberta={aberta} onFechar={onFechar} rotulo="Buscar obra, código ou ação" largura={880}>
      <div className="pc-paleta">
        <BarraDeComando modo="fixa" inicialQ={inicialQ} />
      </div>
    </Camada>
  );
}

export function Atalhos({ aberta, onFechar }: { aberta: boolean; onFechar: () => void }) {
  return (
    <Camada aberta={aberta} onFechar={onFechar} rotulo="Atalhos de teclado" largura={720}>
      <header className="pc-atalhos-cabeca">
        <h2>Atalhos de teclado</h2>
        <Botao variante="quiet" icone aria-label="Fechar" onClick={onFechar}>
          <X />
        </Botao>
      </header>
      <div className="pc-atalhos">
        {ATALHOS.map((g) => (
          <section key={g.nome} className="pc-atalhos-grupo" aria-label={g.nome}>
            <h3>
              {g.nome}
              {g.onde && <small>{g.onde}</small>}
            </h3>
            <dl>
              {g.atalhos.map((a) => (
                <div key={a.texto}>
                  <dt>{a.texto}</dt>
                  <dd>
                    {a.teclas.map((t, i) => (
                      <Tecla key={i}>{t}</Tecla>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <p className="pc-rodape pc-rodape--texto">As teclas de letra ficam caladas enquanto você digita num campo.</p>
    </Camada>
  );
}

/**
 * O AVISO PASSAGEIRO (o Pop do app): sucesso some sozinho em 6 s, falha
 * espera alguém fechar. Não escurece, não rouba o foco, e se empilha de baixo
 * para cima: o mais novo fica mais perto da mão.
 */
export type Aviso = { id: number; tom: "ok" | "falha"; texto: string };

function UmAviso({ a, onFechar }: { a: Aviso; onFechar: (id: number) => void }) {
  useEffect(() => {
    if (a.tom !== "ok") return;
    const t = setTimeout(() => onFechar(a.id), 6000);
    return () => clearTimeout(t);
  }, [a, onFechar]);
  const Icone = a.tom === "ok" ? Check : TriangleAlert;
  return (
    <div className={`pc-aviso pc-aviso--${a.tom}`} role={a.tom === "falha" ? "alert" : "status"}>
      <Icone size={16} aria-hidden />
      <p>{a.texto}</p>
      <button type="button" aria-label="Fechar aviso" onClick={() => onFechar(a.id)}>
        <X size={15} aria-hidden />
      </button>
    </div>
  );
}

export function Avisos({ avisos, onFechar }: { avisos: Aviso[]; onFechar: (id: number) => void }) {
  const { dur } = useTempo();
  return (
    <div className="pc-avisos" aria-live="polite">
      <AnimatePresence initial={false}>
        {avisos.map((a) => (
          <motion.div
            key={a.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6, transition: { duration: dur("feedback") } }}
            transition={{ duration: dur("enter"), ease: [...CURVA.out] }}
          >
            <UmAviso a={a} onFechar={onFechar} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
