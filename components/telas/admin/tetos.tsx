"use client";

import { MedidorDeTeto } from "@/components/ds/medidas";
import { formatarReais, type CotacaoDeclarada } from "@/lib/cambio";
import { formatarEmBrasilia } from "@/lib/fuso-de-brasilia";

import { CampoDeControle, useControles } from "./controles";
import { AvisoDaCarga } from "./pecas";

const usd = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" }).format(v);

/*
 * O TETO DE GASTO (por conta e do sistema), no topo do Dinheiro. Barreira de
 * entrada: mede o que já foi registrado, então não freia auditoria em voo.
 * Vazio = sem teto. O do sistema ganha o medidor contra o gasto do mês — o
 * mesmo número que o veredito do trilho usa.
 */
export function TetosDeGasto({ gastoDoMesUsd, cotacao }: { gastoDoMesUsd: number | null; cotacao: CotacaoDeclarada }) {
  const c = useControles();
  const tetos = (c.retrato?.controles ?? []).filter((x) => x.chave === "teto.mensal.usd" || x.chave === "teto.global.usd");
  const mes = formatarEmBrasilia(new Date(), { month: "long" });
  return (
    <section className="adm-bloco din-tetos" aria-labelledby="din-teto">
      <header>
        <h2 id="din-teto">Teto de gasto</h2>
      </header>
      <div className="din-tetos-corpo">
        <AvisoDaCarga fase={c.fase} erro={c.erroDaCarga?.tipo} detalhe={c.erroDaCarga?.detalhe} oque="os tetos" atualizadoEm={c.carregadoEm} onTentar={c.carregar} />
        {c.retrato && !c.retrato.databaseConfigured && <p className="din-aviso-linha">Sem DATABASE_URL: os tetos valem pelo ambiente, e nada do que for declarado aqui é gravado.</p>}
        {c.erro && <p className="din-erro-linha">{c.erro}</p>}
      </div>
      {tetos.length > 0 && (
        <div className="din-tetos-grade">
          {tetos.map((t) => (
            <CampoDeControle
              key={t.chave}
              controle={t}
              prefixo="US$"
              valorMostrado={t.valor === null ? "sem teto" : usd(t.valor)}
              rascunho={c.rascunho[t.chave] ?? ""}
              onMudar={(v) => c.setRascunho((r) => ({ ...r, [t.chave]: v }))}
              onSalvar={() => void c.mandar({ chave: t.chave, valor: c.rascunho[t.chave] ?? "" }, t.chave)}
              onEsquecer={() => void c.mandar({ acao: "esquecer", chave: t.chave }, `${t.chave}:esquecer`)}
              salvando={c.salvando}
              semBanco={!c.retrato?.databaseConfigured}
              medidor={
                t.chave === "teto.global.usd" && t.valor !== null && gastoDoMesUsd !== null ? (
                  <div className="din-medidor-lugar" title="O gasto do mês que o veredito do trilho já mostra">
                    <MedidorDeTeto
                      valor={gastoDoMesUsd}
                      teto={t.valor}
                      rotulo={
                        <>
                          {usd(gastoDoMesUsd)} de {usd(t.valor)} em {mes}
                          {formatarReais(gastoDoMesUsd, cotacao) ? ` · ${formatarReais(gastoDoMesUsd, cotacao)}` : ""}
                        </>
                      }
                    />
                  </div>
                ) : undefined
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
