"use client";

import { useMemo, useState } from "react";

import { NumeroQueChega, Segmento } from "@/components/ds/basicos";
import { BarrasPorMes, ColunasEmPilula, Fichas, LinhaAcumulada, MESES, type Coluna } from "@/components/ds/graficos";
import { formatarDiaDeCalendario } from "@/lib/fuso-de-brasilia";
import type { DiaDoEscritorio } from "@/lib/resumo-do-escritorio";

/**
 * O NEXO NO ESCRITÓRIO (veio do lab: inicio-d2/resumo-do-escritorio.tsx) —
 * o que ele já fez, numa faixa só: acompanha as tarefas, não disputa o foco
 * com elas. Os números são os de [[lib/resumo-do-escritorio.ts]]; os totais
 * saem da mesma série diária que desenha os gráficos, então número e gráfico
 * nunca discordam.
 */

type Periodo = "mes" | "sempre";
type Campo = Exclude<keyof DiaDoEscritorio, "dia">;

const mesDe = (dia: string) => Number(dia.slice(5, 7)) - 1;
const diaDoMes = (dia: string) => Number(dia.slice(8, 10));
const semana = (dia: string) => formatarDiaDeCalendario(dia, { weekday: "short" }).replace(".", "");
const dataCurta = (dia: string) => `${diaDoMes(dia)} ${MESES[mesDe(dia)]}`;
const soma = (ds: DiaDoEscritorio[], campo: Campo) => ds.reduce((a, d) => a + d[campo], 0);
const plural = (n: number, um: string, varios: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;
const NOME_DO_MES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Agrupa em semanas começando na segunda; a primeira e a última podem estar pela metade. */
function porSemana(dias: DiaDoEscritorio[]) {
  const grupos: DiaDoEscritorio[][] = [];
  for (const d of dias) {
    if (!grupos.length || semana(d.dia) === "seg") grupos.push([]);
    grupos[grupos.length - 1].push(d);
  }
  return grupos;
}

export function ResumoDoEscritorio({ dias }: { dias: DiaDoEscritorio[] }) {
  const hoje = dias[dias.length - 1].dia;
  const mesAtual = hoje.slice(0, 7);
  const doMes = useMemo(() => dias.filter((d) => d.dia.startsWith(mesAtual)), [dias, mesAtual]);
  // No começo do mês, "este mês" seria uma faixa de zeros: abre no que já aconteceu.
  const [periodo, setPeriodo] = useState<Periodo>(() => (doMes.some((d) => d.encontrados || d.resolvidos || d.volumes || d.lds || d.leituras) ? "mes" : "sempre"));
  const recorte = periodo === "mes" ? doMes : dias;

  const encontrados = soma(recorte, "encontrados");
  const resolvidos = soma(recorte, "resolvidos");
  const taxa = encontrados ? Math.min(100, Math.round((resolvidos / encontrados) * 100)) : 0;

  // uma coluna por dia no mês; por semana desde o início
  const grupos = periodo === "mes" ? doMes.map((d) => [d]) : porSemana(dias);
  const achados: Coluna[] = grupos.map((g, i) => {
    const d0 = g[0].dia;
    const e = soma(g, "encontrados");
    const rs = Math.min(e, soma(g, "resolvidos"));
    const quando = periodo === "mes" ? `${semana(d0)}, ${dataCurta(d0)}` : `semana de ${dataCurta(d0)}`;
    const eixo =
      periodo === "mes"
        ? [1, 8, 15, 22].includes(diaDoMes(d0))
          ? `${diaDoMes(d0)}`
          : undefined
        : i === 0 || g.some((d) => diaDoMes(d.dia) === 1)
          ? MESES[mesDe(g[g.length - 1].dia)]
          : undefined;
    return {
      eixo,
      valor: e,
      parte: rs,
      rotulo: (
        <>
          <b>{quando}</b>: {e === 0 ? "sem auditoria" : `${plural(e, "achado", "achados")}, ${plural(rs, "resolvido", "resolvidos")}`}
        </>
      ),
    };
  });

  // os últimos quatro meses com movimento, para as LDs e capas
  const meses = [...new Set(dias.map((d) => d.dia.slice(0, 7)))].slice(-4);
  const porMes = meses.map((m) => ({ rotulo: MESES[mesDe(`${m}-01`)], valor: soma(dias.filter((d) => d.dia.startsWith(m)), "lds") }));
  const primeiro = dias[0].dia;

  const menores = [
    {
      campo: "encontrados",
      valor: encontrados,
      rotulo: encontrados ? `achados encontrados, ${taxa}% resolvidos` : "achados encontrados",
      grafico: <ColunasEmPilula key={periodo} colunas={achados} altura={22} compacto />,
    },
    { campo: "volumes", valor: soma(recorte, "volumes"), rotulo: "volumes gerados", grafico: <Fichas key={periodo} total={soma(recorte, "volumes")} /> },
    { campo: "lds", valor: soma(recorte, "lds"), rotulo: "LDs e capas gerados", grafico: <BarrasPorMes key={periodo} meses={porMes} atual={periodo === "mes" ? porMes.length - 1 : null} /> },
    { campo: "leituras", valor: soma(recorte, "leituras"), rotulo: "leituras de carimbo", grafico: <LinhaAcumulada key={periodo} valores={recorte.map((d) => d.leituras)} /> },
  ];

  return (
    <section className="d2-resumo" aria-label="O Nexo no escritório">
      <div className="d2-resumo-cabeca">
        <h2>
          O Nexo no escritório{" "}
          <span>{periodo === "mes" ? `em ${NOME_DO_MES[mesDe(hoje)]}` : `desde ${NOME_DO_MES[mesDe(primeiro)]} de ${primeiro.slice(0, 4)}`}</span>
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

      <div className="d2-resumo-menores">
        {menores.map((m) => (
          <div key={m.campo} className="d2-menor">
            <b className="d2-menor-num">
              <NumeroQueChega valor={m.valor} />
            </b>
            {m.grafico}
            <span className="d2-menor-rotulo">{m.rotulo}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
