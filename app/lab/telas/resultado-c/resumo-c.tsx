"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, ChevronDown, FileSearch, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Avatar, Botao, Tecla } from "@/components/ds/basicos";
import { FaixaDeVeredito, MapaDasPaginas } from "@/components/ds/graficos";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";

import { DESFECHO_NOME, IMPACTOS, PAGINAS_DO_MEMORIAL, pontosPorPagina, type Achado } from "./dados";
import { estadoDaEmissao, type EstadoEmissao } from "./resumo";

const FAIXAS = [
  { rotulo: "Liberado", tom: "ok" as const, ate: 25 },
  { rotulo: "Ressalvas", tom: "ok" as const, ate: 50 },
  { rotulo: "Revisar", tom: "decide" as const, ate: 75 },
  { rotulo: "Não emitir", tom: "block" as const, ate: 100 },
];
const POSICAO: Record<EstadoEmissao, number> = { liberado: 12.5, liberado_com_ressalvas: 37.5, revisar: 62.5, nao_emitir: 87.5, incompleto: 87.5 };

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];
const conta = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const EU = "Victor";

/**
 * RESUMO, VERSÃO C: o resumo É a lista do que falta. O Nexo é aberto para
 * resolver, então a maior área da tela é o trabalho: os pendentes em ordem
 * de impacto, cada um numa linha, com Marcar corrigido ali mesmo. O que
 * explica (veredito, onde, o que foi lido) fica numa coluna estreita ao lado.
 */
export function ResumoC({
  achados,
  parcial,
  comparado,
  onAbrir,
  onMudar,
}: {
  achados: Achado[];
  parcial: boolean;
  comparado: boolean;
  onAbrir: (id?: string) => void;
  onMudar: (id: string, desfecho: Achado["desfecho"] | undefined) => void;
}) {
  const { dur, mola } = useTempo();
  const [verTratados, setVerTratados] = useState(false);
  const estado = estadoDaEmissao(achados, parcial);
  const n = (i: string) => achados.filter((a) => a.impacto === i).length;
  const pendentes = achados.filter((a) => !a.desfecho);
  const tratados = achados.filter((a) => a.desfecho);

  const porque = {
    incompleto: "3 de 12 blocos não foram lidos. Os achados valem, mas não dá para liberar.",
    nao_emitir: `${conta(n("block"), "achado bloqueia", "achados bloqueiam")} a emissão.`,
    revisar: `${conta(n("decide"), "ponto técnico precisa", "pontos técnicos precisam")} de aceite antes de executar.`,
    liberado_com_ressalvas: "Só ajustes de texto, sem impacto documental.",
    liberado: "Nenhum achado no escopo analisado.",
  }[estado];

  return (
    <div className="rc">
      {/* ================= o trabalho ================= */}
      <section className="rc-trabalho" aria-label="O que falta tratar">
        <header className="rc-trabalho-cabeca">
          <h2>
            {pendentes.length ? (
              <>
                Falta tratar <b className="ds-num">{pendentes.length}</b>
              </>
            ) : (
              "Tudo tratado"
            )}
          </h2>
          <span className="rs-nota">na ordem de impacto</span>
          <Botao variante="quiet" tamanho="sm" onClick={() => onAbrir()}>
            Abrir a fila <Tecla>A</Tecla>
          </Botao>
        </header>

        <div className="rc-lista">
          {IMPACTOS.map((imp) => {
            const doNivel = pendentes.filter((a) => a.impacto === imp.id);
            if (!doNivel.length) return null;
            return (
              <div key={imp.id} className={`rc-grupo rc--${imp.id}`}>
                <h3>
                  <i />
                  {imp.nome}
                  <span>{imp.dica}</span>
                </h3>
                <AnimatePresence initial={false}>
                  {doNivel.map((a) => (
                    <motion.div
                      key={a.id}
                      layout
                      className="rc-linha"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0, transition: { duration: dur("state") } }}
                      transition={mola("smooth")}
                    >
                      <button type="button" className="rc-linha-corpo" onClick={() => onAbrir(a.id)}>
                        <span className="rc-id">{a.id}</span>
                        <span className="rc-titulo">{a.titulo}</span>
                        <span className="rc-meta ds-num">p. {a.pagina}</span>
                        {a.responsavel ? <Avatar iniciais={a.responsavel.slice(0, 2).toUpperCase()} pequeno /> : <span className="rc-sem">sem dono</span>}
                      </button>
                      <span className="rc-acoes">
                        <button
                          type="button"
                          className="rc-corrigir"
                          aria-label={`Marcar ${a.id} como corrigido`}
                          title="Marcar corrigido"
                          onClick={() => onMudar(a.id, { tipo: "corrigido", por: EU, quando: "agora" })}
                        >
                          <Check size={14} />
                        </button>
                        <button type="button" className="rc-abrir" aria-label={`Abrir ${a.id}`} onClick={() => onAbrir(a.id)}>
                          <ArrowRight size={14} />
                        </button>
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            );
          })}
          {!pendentes.length && <p className="rc-vazio">Nada pendente nesta revisão. O próximo passo é auditar a revisão corrigida.</p>}
        </div>

        {tratados.length > 0 && (
          <div className="rc-tratados">
            <button type="button" className="rc-tratados-barra" aria-expanded={verTratados} onClick={() => setVerTratados((v) => !v)}>
              <Check size={14} />
              {conta(tratados.length, "tratado", "tratados")}
              <motion.span animate={{ rotate: verTratados ? 180 : 0 }} transition={{ duration: dur("state") }} style={{ display: "inline-flex", marginLeft: "auto" }}>
                <ChevronDown size={14} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {verTratados && (
                <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: dur("layout"), ease: ease(CURVA.out) }}>
                  {tratados.map((a) => (
                    <li key={a.id}>
                      <span className="rc-id">{a.id}</span>
                      <span className="rc-titulo">{a.titulo}</span>
                      <span className="rc-desfecho">
                        {DESFECHO_NOME[a.desfecho!.tipo]}, {a.desfecho!.por === EU ? "você" : a.desfecho!.por}
                      </span>
                      <button type="button" className="rs-link" onClick={() => onMudar(a.id, undefined)}>
                        Reabrir
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* ================= o que explica ================= */}
      <aside className="rc-lado">
        <section className={`rc-cartao rc-veredito rc-veredito--${estado}`}>
          <h3>Veredito</h3>
          <p>{porque}</p>
          <FaixaDeVeredito posicao={POSICAO[estado]} faixas={FAIXAS} />
          <span className="rs-nota">
            {estado === "incompleto" ? "Leitura incompleta não vale como liberação." : "Tratar não muda o veredito desta revisão; auditar a corrigida, sim."}
          </span>
          {estado === "incompleto" && (
            <Botao variante="primary" tamanho="sm">
              <RotateCcw />
              Auditar de novo
            </Botao>
          )}
        </section>

        {comparado && (
          <section className="rc-cartao rc-comparado">
            <h3>Desde 18/09</h3>
            <p>
              <b className="rs-delta--ok">4</b> corrigidos, <b className="rs-delta--novo">1</b> novo, <b>8</b> continuam
            </p>
          </section>
        )}

        <section className="rc-cartao">
          <h3>
            Onde estão
            <button type="button" className="rs-link">
              <FileSearch size={13} /> No documento
            </button>
          </h3>
          <MapaDasPaginas colunas={9} legenda={null} paginas={pontosPorPagina(achados)} lidas={parcial ? 30 : PAGINAS_DO_MEMORIAL} atuais={[]} />
        </section>

        <p className="rc-lido">
          Lido: 42 páginas, <span className={parcial ? "rs-falta" : undefined}>{parcial ? "9 de 12 blocos" : "12 de 12 blocos"}</span>, 38 regras locais.
          <button type="button" className="rs-link">
            Registrar erro ausente
          </button>
        </p>
      </aside>
    </div>
  );
}
