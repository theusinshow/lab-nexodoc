"use client";

import { motion } from "motion/react";
import { useState } from "react";

import { NumeroQueChega, Segmento } from "@/components/ds/basicos";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";

/**
 * O NEXO NO ESCRITÓRIO — o que ele já fez, para quem abre (e para quem vê a
 * tela por cima do ombro). Pedido do Matheus: "para vender o peixe".
 *
 * Só números que o sistema TEM: achados das auditorias e os encerrados como
 * corrigidos, volumes exportados, LDs e capas gerados, folhas lidas dos
 * carimbos. Nada de "horas economizadas": seria estimativa apresentada como
 * fato, e um número inventado derruba a credibilidade dos verdadeiros.
 */

type Periodo = "mes" | "sempre";

const DADOS: Record<Periodo, { encontrados: number; resolvidos: number; volumes: number; lds: number; folhas: number; rotulo: string }> = {
  mes: { encontrados: 47, resolvidos: 39, volumes: 12, lds: 18, folhas: 1284, rotulo: "em setembro" },
  sempre: { encontrados: 412, resolvidos: 356, volumes: 64, lds: 97, folhas: 9870, rotulo: "desde junho de 2026" },
};

export function ResumoDoEscritorio() {
  const { dur } = useTempo();
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const d = DADOS[periodo];
  const taxa = Math.round((d.resolvidos / d.encontrados) * 100);

  return (
    <section className="d2-resumo" aria-label="O Nexo no escritório">
      <div className="d2-resumo-cabeca">
        <h2>
          O Nexo no escritório <span>{d.rotulo}</span>
        </h2>
        <Segmento
          rotulo="Período"
          valor={periodo}
          onTroca={setPeriodo}
          opcoes={[
            { valor: "mes", rotulo: "Este mês" },
            { valor: "sempre", rotulo: "Desde o início" },
          ]}
        />
      </div>
      <div className="d2-resumo-grade">
        <div className="d2-num">
          <b>
            <NumeroQueChega valor={d.encontrados} />
          </b>
          <span>achados encontrados nos memoriais</span>
        </div>
        <div className="d2-num">
          <b>
            <NumeroQueChega valor={d.resolvidos} />
          </b>
          <span>
            resolvidos, <span className="ds-num">{taxa}%</span> dos encontrados
          </span>
          <span className="d2-num-barra" aria-hidden>
            <motion.i
              initial={{ scaleX: 0 }}
              animate={{ scaleX: taxa / 100 }}
              transition={{ duration: dur("layout") * 2, ease: [...CURVA.out] as [number, number, number, number] }}
            />
          </span>
        </div>
        <div className="d2-num">
          <b>
            <NumeroQueChega valor={d.volumes} />
          </b>
          <span>volumes montados e exportados</span>
        </div>
        <div className="d2-num">
          <b>
            <NumeroQueChega valor={d.lds} />
          </b>
          <span>LDs e capas gerados</span>
        </div>
        <div className="d2-num">
          <b>
            <NumeroQueChega valor={d.folhas} />
          </b>
          <span>folhas lidas dos carimbos</span>
        </div>
      </div>
    </section>
  );
}
