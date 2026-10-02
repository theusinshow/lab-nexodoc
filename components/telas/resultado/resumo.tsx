"use client";

/**
 * O RESUMO (desenho do lab: resultado-e/resumo-c.tsx): o resumo É a lista do
 * que falta. O Nexo é aberto para resolver, então a maior área é o trabalho —
 * os pendentes em ordem de impacto, cada um numa linha, com corrigir e ver no
 * memorial ali mesmo. O que explica (disciplinas, onde estão, o que foi lido)
 * fica numa coluna estreita ao lado.
 */
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, ChevronDown, FileSearch } from "lucide-react";
import { useState } from "react";

import { Avatar, Botao, Tecla } from "@/components/ds/basicos";
import { MapaDasPaginas } from "@/components/ds/graficos";
import type { AuditReport } from "@/lib/audit-report";
import { rotuloDaContagem } from "@/lib/auditoria-incompleta";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";
import { DISCIPLINAS, NIVEIS } from "@/lib/nivel-do-achado";
import type { FindingDiscipline } from "@/lib/audit-report";

import { SeloDaDisciplina } from "../comum/disciplina";
import { NOME_DO_DESFECHO, conta } from "./textos";
import type { AchadoDaTela, ParecerVivo } from "./use-parecer-vivo";
import "./resultado-c.css";

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];
const iniciais = (nome: string) =>
  nome
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "?";

export function ResumoDoParecer({
  report,
  parecer,
  temArquivo,
  onAbrir,
  onVerNoMemorial,
  onAbrirDisciplina,
  onNoDocumento,
}: {
  report: AuditReport;
  parecer: ParecerVivo;
  temArquivo: (a: AchadoDaTela) => boolean;
  onAbrir: (chave?: string) => void;
  onVerNoMemorial: (chave: string) => void;
  onAbrirDisciplina: (d: FindingDiscipline) => void;
  onNoDocumento?: () => void;
}) {
  const { dur, mola } = useTempo();
  const [verTratados, setVerTratados] = useState(false);
  const achados = parecer.achados.filter((a) => a.confirmado);
  const pendentes = achados.filter((a) => !a.desfecho);
  const tratados = achados.filter((a) => a.desfecho);
  const porDisciplina = DISCIPLINAS.map((d) => {
    const dela = achados.filter((a) => a.disc === d.id);
    return { ...d, total: dela.length, pendentes: dela.filter((a) => !a.desfecho).length };
  })
    .filter((d) => d.total)
    .sort((a, b) => b.pendentes - a.pendentes || b.total - a.total);

  // Onde estão: um ponto por achado em cada página citada.
  const totalDePaginas = Math.max(0, ...report.arquivos_analisados.map((a) => a.paginas ?? 0), ...achados.flatMap((a) => a.paginas));
  const pontos = Array.from({ length: totalDePaginas }, (_, i) => achados.filter((a) => a.paginas.includes(i + 1)).length);

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
            ) : achados.length ? (
              "Tudo tratado"
            ) : (
              "Nenhum achado"
            )}
          </h2>
          <span className="rs-nota">{rotuloDaContagem(report)}, na ordem de impacto</span>
          {achados.length > 0 && (
            <Botao variante="quiet" tamanho="sm" onClick={() => onAbrir()}>
              Abrir a fila <Tecla>2</Tecla>
            </Botao>
          )}
        </header>

        <div className="rc-lista">
          {NIVEIS.map((n) => {
            const doNivel = pendentes.filter((a) => a.nivel === n.id);
            if (!doNivel.length) return null;
            return (
              <div key={n.id} className={`rc-grupo rc--${n.id}`}>
                <h3>
                  <i />
                  {n.nome}
                  <span>{n.dica}</span>
                </h3>
                <AnimatePresence initial={false}>
                  {doNivel.map((a) => (
                    <motion.div
                      key={a.chave}
                      layout
                      className="rc-linha"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0, transition: { duration: dur("state") } }}
                      transition={mola("smooth")}
                    >
                      <button type="button" className="rc-linha-corpo" onClick={() => onAbrir(a.chave)}>
                        <span className="rc-titulo">{a.titulo}</span>
                        <SeloDaDisciplina disc={a.disc} neutro />
                        {a.responsavel ? <Avatar iniciais={iniciais(a.responsavel.nome)} pequeno /> : <span className="rc-sem">sem dono</span>}
                      </button>
                      <span className="rc-acoes">
                        <button
                          type="button"
                          className="rc-corrigir"
                          aria-label={`Marcar ${a.id} como corrigido`}
                          title="Marcar corrigido"
                          disabled={parecer.salvando === a.chave}
                          onClick={() => void parecer.encerrar(a, "FIXED_IN_DOC")}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          className="rc-memorial"
                          aria-label={`Ver ${a.id} no memorial${a.paginas[0] ? `, página ${a.paginas[0]}` : ""}`}
                          title="Ver no memorial"
                          disabled={!temArquivo(a)}
                          onClick={() => onVerNoMemorial(a.chave)}
                        >
                          <FileSearch size={14} />
                        </button>
                        <button type="button" className="rc-abrir" aria-label={`Abrir ${a.id}`} onClick={() => onAbrir(a.chave)}>
                          <ArrowRight size={14} />
                        </button>
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            );
          })}
          {!pendentes.length && (
            <p className="rc-vazio">{achados.length ? "Nada pendente nesta revisão. O próximo passo é auditar a revisão corrigida." : "O escopo analisado não mostrou problema."}</p>
          )}
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
                    <li key={a.chave}>
                      <span className="rc-id">{a.id}</span>
                      <span className="rc-titulo">{a.titulo}</span>
                      <span className="rc-desfecho">
                        {NOME_DO_DESFECHO[a.desfecho!.tipo]}, {a.desfecho!.por ?? "você"}
                      </span>
                      <button type="button" className="rs-link" onClick={() => void parecer.reabrir(a)}>
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

      {/* ================= como os achados se distribuem, e o que foi lido ================= */}
      <aside className="rc-lado">
        <div className="re-distribuicao">
          {porDisciplina.length > 0 && (
            <section className="rc-cartao rc-disc">
              <h3>Por disciplina</h3>
              <div className="rc-disc-faixa" aria-hidden>
                {porDisciplina.map((d) => (
                  <motion.i key={d.id} className={`dc--${d.id}`} style={{ flexGrow: d.total }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: dur("layout") * 1.4, ease: ease(CURVA.out) }} />
                ))}
              </div>
              <ul>
                {porDisciplina.map((d) => (
                  <li key={d.id}>
                    <button type="button" className={`dc--${d.id}`} onClick={() => onAbrirDisciplina(d.id)}>
                      <i className="dc-ponto" />
                      <span className="rc-disc-nome">{d.nome}</span>
                      <span className="rc-disc-conta ds-num">
                        {d.pendentes ? (
                          <>
                            <b>{d.pendentes}</b> de {d.total} {d.pendentes === 1 ? "pendente" : "pendentes"}
                          </>
                        ) : (
                          <span className="rc-disc-ok">{d.total === 1 ? "1 tratado" : `${d.total} tratados`}</span>
                        )}
                      </span>
                      <ArrowRight size={13} className="rc-disc-seta" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {totalDePaginas > 0 && (
            <section className="rc-cartao">
              <h3>
                Onde estão
                {onNoDocumento && (
                  <button type="button" className="rs-link" onClick={onNoDocumento}>
                    <FileSearch size={13} /> No documento
                  </button>
                )}
              </h3>
              <MapaDasPaginas colunas={9} paginas={pontos} lidas={totalDePaginas} atuais={[]} />
            </section>
          )}
          <section className="rc-cartao rc-leitura">
            <h3>O que foi lido</h3>
            <ul>
              {report.arquivos_analisados.map((arq) => (
                <li key={arq.arquivo}>
                  <b>{arq.arquivo}</b>
                  <span className="ds-num">
                    {arq.paginas ? `${arq.paginas} páginas` : ""}
                    {arq.caracteres_extraidos ? `${arq.paginas ? ", " : ""}${arq.caracteres_extraidos.toLocaleString("pt-BR")} caracteres` : ""}
                  </span>
                  {arq.resumo && <p>{arq.resumo}</p>}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </aside>
    </div>
  );
}
