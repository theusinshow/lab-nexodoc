"use client";

import { useMemo, useState } from "react";

import { NumeroQueChega, Segmento } from "@/components/ds/basicos";
import { BarrasPorMes, ColunasEmPilula, Fichas, LinhaAcumulada, MESES, type Coluna } from "@/components/ds/graficos";

/**
 * O NEXO NO ESCRITÓRIO — o que ele já fez, para quem abre (e para quem vê a
 * tela por cima do ombro). Pedido do Matheus: "para vender o peixe", no
 * idioma dos gráficos da Matos UI.
 *
 * Só números que o sistema TEM: achados das auditorias e os encerrados como
 * corrigidos, volumes exportados, LDs e capas gerados, folhas lidas dos
 * carimbos. Nada de "horas economizadas": seria
 * estimativa apresentada como fato, e um número inventado derruba a
 * credibilidade dos verdadeiros. Numa faixa só: acompanha as tarefas, não
 * disputa o foco com elas.
 *
 * Os totais saem da mesma série diária que desenha os gráficos, então número
 * e gráfico nunca discordam.
 */

type Periodo = "mes" | "sempre";

interface Dia {
  data: Date;
  auditorias: number;
  encontrados: number;
  resolvidos: number;
  volumes: number;
  lds: number;
  folhas: number;
}

const INICIO = new Date(2026, 5, 1); // 1º de junho, quando o escritório começou
const HOJE = new Date(2026, 8, 29);

/** Série de exemplo, determinística (mesma a cada render e no servidor). */
function serie(): Dia[] {
  let s = 7;
  const r = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const dias: Dia[] = [];
  const total = Math.round((HOJE.getTime() - INICIO.getTime()) / 864e5) + 1;
  for (let i = 0; i < total; i++) {
    const data = new Date(2026, 5, 1 + i);
    const util = data.getDay() !== 0 && data.getDay() !== 6;
    const adocao = Math.min(1, (i + 12) / 45);
    const auditorias = util && r() < 0.6 * adocao ? 1 + Math.floor(r() * 3) : !util && r() < 0.05 ? 1 : 0;
    let encontrados = 0;
    for (let a = 0; a < auditorias; a++) encontrados += 1 + Math.floor(r() * 4);
    // o recente ainda está sendo corrigido; o antigo quase todo já foi
    const falta = total - i;
    const fracao = falta > 14 ? 0.9 : 0.25 + (falta / 14) * 0.6;
    const resolvidos = Math.min(encontrados, Math.round(encontrados * fracao + (r() - 0.5)));
    const volumes = util && r() < 0.28 * adocao ? 1 : 0;
    const lds = volumes ? 1 + Math.floor(r() * 2) : util && r() < 0.08 ? 1 : 0;
    const folhas = volumes ? 40 + Math.floor(r() * 120) : 0;
    dias.push({ data, auditorias, encontrados, resolvidos, volumes, lds, folhas });
  }
  return dias;
}

const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const dataCurta = (d: Date) => `${d.getDate()} ${MESES[d.getMonth()]}`;
const plural = (n: number, um: string, varios: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;

/** Agrupa em semanas começando na segunda; a última pode estar pela metade. */
function porSemana(dias: Dia[]) {
  const grupos: Dia[][] = [];
  dias.forEach((d) => {
    if (!grupos.length || d.data.getDay() === 1) grupos.push([]);
    grupos[grupos.length - 1].push(d);
  });
  return grupos;
}
const soma = (ds: Dia[], campo: keyof Omit<Dia, "data">) => ds.reduce((a, d) => a + d[campo], 0);

export function ResumoDoEscritorio() {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const dias = useMemo(serie, []);
  const doMes = dias.filter((d) => d.data.getMonth() === HOJE.getMonth());
  const recorte = periodo === "mes" ? doMes : dias;

  const encontrados = soma(recorte, "encontrados");
  const resolvidos = soma(recorte, "resolvidos");
  const taxa = Math.round((resolvidos / Math.max(1, encontrados)) * 100);

  // uma coluna por dia no mês; por semana desde o início
  const grupos = periodo === "mes" ? doMes.map((d) => [d]) : porSemana(dias);
  const achados: Coluna[] = grupos.map((g, i) => {
    const d0 = g[0].data;
    const e = soma(g, "encontrados");
    const rs = soma(g, "resolvidos");
    const quando = periodo === "mes" ? `${SEMANA[d0.getDay()]}, ${dataCurta(d0)}` : `semana de ${dataCurta(d0)}`;
    const eixo =
      periodo === "mes"
        ? [1, 8, 15, 22].includes(d0.getDate())
          ? `${d0.getDate()}`
          : undefined
        : i === 0 || g.some((d) => d.data.getDate() === 1)
          ? MESES[g[g.length - 1].data.getMonth()]
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

  // cada número com o desenho que combina com o que ele conta
  const porMes = [5, 6, 7, 8].map((m) => ({ rotulo: MESES[m], valor: soma(dias.filter((d) => d.data.getMonth() === m), "lds") }));
  const menores = [
    {
      campo: "encontrados",
      valor: encontrados,
      rotulo: `achados encontrados, ${taxa}% resolvidos`,
      grafico: <ColunasEmPilula key={periodo} colunas={achados} altura={22} compacto />,
    },
    { campo: "volumes", valor: soma(recorte, "volumes"), rotulo: "volumes montados e exportados", grafico: <Fichas key={periodo} total={soma(recorte, "volumes")} /> },
    { campo: "lds", valor: soma(recorte, "lds"), rotulo: "LDs e capas gerados", grafico: <BarrasPorMes key={periodo} meses={porMes} atual={periodo === "mes" ? 3 : null} /> },
    { campo: "folhas", valor: soma(recorte, "folhas"), rotulo: "folhas lidas dos carimbos", grafico: <LinhaAcumulada key={periodo} valores={recorte.map((d) => d.folhas)} /> },
  ];

  return (
    <section className="d2-resumo" aria-label="O Nexo no escritório">
      <div className="d2-resumo-cabeca">
        <h2>
          O Nexo no escritório <span>{periodo === "mes" ? "em setembro" : "desde junho de 2026"}</span>
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
