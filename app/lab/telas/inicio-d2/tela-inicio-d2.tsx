"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronRight, FileUp, X } from "lucide-react";
import { useState } from "react";

import { Botao, Orbe, Selo } from "@/components/ds/basicos";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { BarraDeComando } from "../_comum/barra-de-comando";
import { Topo } from "../_comum/topo";
import { DEPOIS_DE_LER, TAREFAS, type IdTarefa } from "../inicio-d/tela-inicio-d";
import "../inicio-d/inicio-d.css";
import "./inicio-d2.css";
import { ResumoDoEscritorio } from "./resumo-do-escritorio";

export type SituacaoD2 = "padrao" | "buscando" | "tarefa-escolhida" | "arquivo-recebido" | "arrastando" | "nada-com-voce" | "primeiro-acesso";

const CONTINUAR = [
  { obra: "117-25", cidade: "Criciúma", trabalho: "Auditoria do memorial geral", estado: "2 bloqueios para corrigir", tom: "block", quando: "há 4 h" },
  { obra: "SIM099-26", cidade: "São José", trabalho: "Volume da Praça da Juventude", estado: "montado, falta exportar", tom: "decide", quando: "ontem" },
  { obra: "SIM118-25", cidade: "Criciúma", trabalho: "LD e capa do Ginásio", estado: "gerados", tom: "ok", quando: "21/09" },
  { obra: "063-26", cidade: "Tubarão", trabalho: "Auditoria da Cancha de Bocha", estado: "1 bloqueio", tom: "block", quando: "18/09" },
] as const;

const COM_VOCE = [
  { titulo: "Volumes divergentes entre memorial e quadro", obra: "117-25", grav: "block", pagina: 14, de: "Victor" },
  { titulo: "Revisão B no carimbo, revisão A na capa", obra: "117-25", grav: "block", pagina: 1, de: "Victor" },
  { titulo: "Área coberta de 1.240 m² no texto, 1.180 m² no quadro", obra: "SIM047-26", grav: "decide", pagina: 9, de: "Rafael" },
] as const;

/** O que a tarefa precisa, curto o bastante para caber inteiro na fileira. */
const PRECISA_CURTO: Record<IdTarefa, string> = {
  auditar: "memorial em PDF",
  volume: "PDFs prontos",
  ld: "pranchas em PDF",
  conferir: "pranchas em PDF",
};

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];

/**
 * INÍCIO D, REVISTO. O D acertou o essencial (o que fazer, o que ter em mãos);
 * esta versão encolhe as tarefas para uma fileira, põe a barra de comando no
 * topo como busca que só abre quando se digita, e fecha com duas colunas
 * curtas: o que retomar e o que está com você. Nada de acompanhamento diário.
 */
export function TelaInicioD2({ situacao }: { situacao: SituacaoD2 }) {
  const { dur, mola } = useTempo();
  const primeiro = situacao === "primeiro-acesso";
  const [escolhida, setEscolhida] = useState<IdTarefa | null>(situacao === "tarefa-escolhida" || situacao === "arquivo-recebido" ? "auditar" : null);
  const [arquivo, setArquivo] = useState(situacao === "arquivo-recebido");
  const [arrastando, setArrastando] = useState(situacao === "arrastando");
  const [alvo, setAlvo] = useState<IdTarefa | null>(situacao === "arrastando" ? "auditar" : null);
  const tarefa = TAREFAS.find((t) => t.id === escolhida) ?? null;
  const lido = tarefa ? DEPOIS_DE_LER[tarefa.id] : null;
  const comVoce = situacao === "nada-com-voce" || primeiro ? [] : COM_VOCE;

  function receber(id: IdTarefa) {
    setEscolhida(id);
    setArquivo(true);
    setArrastando(false);
    setAlvo(null);
  }

  return (
    <div
      className="d2"
      onDragEnter={(e) => {
        e.preventDefault();
        setArrastando(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setArrastando(false);
          setAlvo(null);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        receber(alvo ?? "auditar");
      }}
    >
      <Topo atual="Painel" busca={false} aviso={comVoce.length > 0} />

      <div className="d2-centro">
        <div className="d2-cabeca">
          <Orbe tamanho={26} estado={arquivo ? "trabalhando" : "repouso"} />
          <h1>{arrastando ? "Para que é este arquivo?" : "Boa noite, Victor."}</h1>
        </div>

        <BarraDeComando modo="suspensa" autoFoco={situacao === "buscando"} inicialQ={situacao === "buscando" ? "117" : ""} abertaInicial={situacao === "buscando"} primeiro={primeiro} />

        {/* ---------- tarefas, compactas ---------- */}
        <div className="d2-tarefas" role="group" aria-label="Tarefas">
          {TAREFAS.map((t) => {
            const ativa = escolhida === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`d2-tarefa${ativa ? " d2-tarefa--ativa" : ""}${arrastando ? " d2-tarefa--alvo" : ""}${alvo === t.id ? " d2-tarefa--sobre" : ""}`}
                aria-pressed={ativa}
                onClick={() => {
                  setEscolhida((e) => (e === t.id ? null : t.id));
                  setArquivo(false);
                }}
                onDragEnter={() => setAlvo(t.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (alvo !== t.id) setAlvo(t.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  receber(t.id);
                }}
              >
                {ativa && <motion.span layoutId="d2-tarefa-ativa" className="d2-tarefa-fundo" transition={mola("snappy")} />}
                <span className="d2-tarefa-icone">
                  <t.Icone size={16} />
                </span>
                <span className="d2-tarefa-texto">
                  <b>{t.nome}</b>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span key={alvo === t.id ? "s" : "p"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur("feedback") }}>
                      {alvo === t.id ? t.soltar : t.id === "volume" ? `Precisa dos ${PRECISA_CURTO[t.id]}` : `Precisa de ${PRECISA_CURTO[t.id]}`}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </button>
            );
          })}
        </div>

        {/* ---------- a tarefa aberta, logo abaixo da fileira ---------- */}
        <AnimatePresence initial={false}>
          {tarefa && (
            <motion.section
              key="tarefa"
              className="d2-painel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: dur("layout"), ease: ease(CURVA.out) }}
            >
              <div className="d2-painel-dentro">
                <AnimatePresence mode="wait" initial={false}>
                  {arquivo && lido ? (
                    <motion.div key={`r-${tarefa.id}`} className="d2-recebido" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur("state") }}>
                      <div className="pd-arquivo">
                        <span className="pd-pdf" aria-hidden />
                        <div>
                          <b>{lido.arquivo}</b>
                          <span>{lido.tamanho}</span>
                        </div>
                        <Botao variante="quiet" tamanho="sm" icone aria-label="Tirar o arquivo" onClick={() => setArquivo(false)}>
                          <X />
                        </Botao>
                      </div>
                      <dl className="d2-ficha">
                        <div>
                          <dt>Obra</dt>
                          <dd>
                            <MarcaDaPrefeitura prefeitura={lido.obra.cidade} forma="sinal" />
                            <span className="ds-code">{lido.obra.codigo}</span> {lido.obra.nome}
                            <Selo tom="ok">
                              <Check size={12} /> projeto encontrado
                            </Selo>
                          </dd>
                        </div>
                        <div>
                          <dt>{lido.leu}</dt>
                          <dd>{lido.obra.detalhe}</dd>
                        </div>
                        <div>
                          <dt>O que vou fazer</dt>
                          <dd>{lido.plano}</dd>
                        </div>
                        <div>
                          <dt>Tempo e custo</dt>
                          <dd>{lido.custo}</dd>
                        </div>
                      </dl>
                      <div className="pd-acoes">
                        <Botao variante="quiet" tamanho="sm">
                          É outro projeto
                        </Botao>
                        <Botao variante="primary">
                          <tarefa.Icone size={16} />
                          {lido.acao}
                        </Botao>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.button
                      key={`s-${tarefa.id}`}
                      type="button"
                      className="d2-soltar"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: dur("state") }}
                      onClick={() => receber(tarefa.id)}
                    >
                      <FileUp size={18} />
                      <span>
                        <b>{tarefa.soltar}</b> ou <u>escolha no computador</u>
                      </span>
                      <span className="d2-nota">{tarefa.precisa}</span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ---------- retomar e com você ---------- */}
        <motion.div layout="position" transition={mola("smooth")} className="d2-colunas">
          <section className="d2-bloco">
            <h2>Continuar</h2>
            {primeiro ? (
              <p className="d2-vazio">Os trabalhos que você começar aparecem aqui, com o estado de cada um.</p>
            ) : (
              <table className="d2-tabela">
                <thead>
                  <tr>
                    <th>Obra</th>
                    <th>Trabalho</th>
                    <th>Estado</th>
                    <th className="d2-dir">Quando</th>
                    <th aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {CONTINUAR.map((c) => (
                    <tr key={c.obra + c.trabalho} tabIndex={0}>
                      <td>
                        <span className="d2-obra">
                          <MarcaDaPrefeitura prefeitura={c.cidade} forma="sinal" />
                          <span className="ds-code">{c.obra}</span>
                        </span>
                      </td>
                      <td className="d2-trabalho">{c.trabalho}</td>
                      <td className={`d2-estado d2-estado--${c.tom}`}>{c.estado}</td>
                      <td className="d2-dir d2-quando">{c.quando}</td>
                      <td className="d2-seta">
                        <ChevronRight size={14} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="d2-bloco">
            <h2>
              Com você {comVoce.length > 0 && <span className="ds-num d2-conta">{comVoce.length}</span>}
            </h2>
            {comVoce.length === 0 ? (
              <p className="d2-vazio">{primeiro ? "Achados atribuídos a você aparecem aqui." : "Nenhum achado atribuído a você."}</p>
            ) : (
              <>
                <ul className="d2-achados">
                  {comVoce.map((a) => (
                    <li key={a.titulo} tabIndex={0}>
                      <i className={`d2-grav d2-grav--${a.grav}`} aria-hidden />
                      <span className="d2-achado-texto">
                        <b>{a.titulo}</b>
                        <span>
                          <span className="ds-code">{a.obra}</span> p. {a.pagina}, de {a.de}
                        </span>
                      </span>
                      <span className="d2-abrir">Abrir</span>
                    </li>
                  ))}
                </ul>
                <button type="button" className="d2-todos">
                  Ver todos os achados <ChevronRight size={13} />
                </button>
              </>
            )}
          </section>
        </motion.div>

        {/* O que o Nexo já fez: some no primeiro acesso, onde tudo seria zero. */}
        {!primeiro && (
          <motion.div layout="position" transition={mola("smooth")}>
            <ResumoDoEscritorio />
          </motion.div>
        )}
      </div>
    </div>
  );
}
