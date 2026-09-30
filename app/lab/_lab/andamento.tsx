"use client";

import { motion } from "motion/react";
import Link from "next/link";

import { CURVA, DURACAO } from "@/lib/ds/movimento";

import { useLab } from "./contexto";

interface Fase {
  numero: string;
  nome: string;
  href?: string;
  itens: readonly { id: string }[];
  descricao: string;
}

/**
 * O andamento de cada fase, contado do registro. A barra cresce da esquerda
 * porque o que ela mostra é acumulação — e só cresce depois que o registro
 * chegou, para não animar de zero a um número que já existia.
 */
export function AndamentoDasFases({ fases }: { fases: Fase[] }) {
  const { aprovacoes, carregado, escala } = useLab();

  return (
    <div className="lab-grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
      {fases.map((f) => {
        const total = f.itens.length;
        const aprovados = f.itens.filter((i) => aprovacoes[i.id]?.status === "aprovado").length;
        const mudar = f.itens.filter((i) => aprovacoes[i.id]?.status === "mudar").length;
        const conteudo = (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span className="lab-nota">Fase {f.numero}</span>
              {!f.href && <span className="lab-pilula" style={{ marginLeft: "auto" }}>depois</span>}
            </div>
            <b style={{ fontWeight: 500, fontSize: "var(--ds-text-lg)", letterSpacing: "-0.015em" }}>{f.nome}</b>
            <span style={{ color: "var(--ds-text-secondary)", fontSize: "var(--ds-text-xs)", minHeight: 40 }}>{f.descricao}</span>
            {total > 0 && (
              <>
                <div style={{ height: 4, borderRadius: 999, background: "rgb(255 255 255 / 0.07)", overflow: "hidden", display: "flex", gap: 2 }}>
                  <motion.i
                    style={{ height: "100%", background: "var(--ds-state-ok)", borderRadius: 999, transformOrigin: "left" }}
                    initial={{ width: 0 }}
                    animate={{ width: carregado ? `${(aprovados / total) * 100}%` : 0 }}
                    transition={{ duration: DURACAO.layout * 2 * escala, ease: CURVA.out }}
                  />
                  <motion.i
                    style={{ height: "100%", background: "var(--ds-state-attention)", borderRadius: 999 }}
                    initial={{ width: 0 }}
                    animate={{ width: carregado ? `${(mudar / total) * 100}%` : 0 }}
                    transition={{ duration: DURACAO.layout * 2 * escala, ease: CURVA.out, delay: 0.08 * escala }}
                  />
                </div>
                <span className="lab-nota ds-num">
                  {aprovados} de {total} aprovados{mudar ? `, ${mudar} com mudança pedida` : ""}
                </span>
              </>
            )}
          </>
        );
        const estilo: React.CSSProperties = {
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: 18,
          color: "inherit",
          textDecoration: "none",
          opacity: f.href ? 1 : 0.6,
        };
        return f.href ? (
          <Link key={f.numero + f.nome} href={f.href} className="lab-cartao" style={estilo}>
            {conteudo}
          </Link>
        ) : (
          <div key={f.numero + f.nome} className="lab-cartao" style={estilo}>
            {conteudo}
          </div>
        );
      })}
    </div>
  );
}
