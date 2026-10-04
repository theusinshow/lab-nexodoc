"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Check, FileSearch, FileText, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Botao, Esqueleto, Orbe, Selo } from "@/components/ds/basicos";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import "./auditoria.css";

export type SituacaoAud = "enviando" | "em-curso" | "passou" | "retomada" | "cancelando" | "falhou" | "concluida";

/**
 * As etapas do motor, com os NOMES e as DESCRIÇÕES que o código usa hoje
 * (lib/audit-progress.ts e AuditoriaEmCurso.tsx). "confronto" fica de fora
 * porque há um arquivo só — o motor não a anuncia, e a tela não promete
 * trabalho que não vai acontecer.
 */
const ETAPAS = [
  { id: "extracao", nome: "Abrindo o memorial", detalhe: "Extrai o texto de todas as páginas do PDF.", previsto: 15, feito: "42 páginas com texto, nenhuma só com desenho" },
  { id: "regras", nome: "Conferindo identidade e coerência", detalhe: "Regras determinísticas, sem IA: obra divergente, contradição entre capítulos.", previsto: 20, feito: "obra, município e código batem com o projeto" },
  { id: "global", nome: "Lendo o documento", detalhe: "Uma leitura da IA sobre o documento: é a etapa mais longa.", previsto: 110, feito: "leitura completa, 11 pontos marcados" },
  { id: "blocos", nome: "Lendo capítulo a capítulo", detalhe: "Blocos por capítulo, para alcançar o que a leitura única não cobriu.", previsto: 70, feito: "12 blocos, 4 pontos novos" },
  { id: "evidencia", nome: "Conferindo as evidências no texto", detalhe: "Descarta achado que não se ancora em trecho real do documento.", previsto: 25, feito: "15 pontos, 13 com trecho real, 2 descartados" },
  { id: "validacao", nome: "Revisando cada achado com um segundo modelo", detalhe: "Segunda passada: rebaixa o incerto em vez de apagá-lo.", previsto: 40, feito: "13 achados, 2 rebaixados" },
  { id: "parecer", nome: "Fechando o parecer", detalhe: "Ordena por impacto e fecha o veredito de emissão.", previsto: 10, feito: "não emitir: 2 bloqueios" },
] as const;

/** O registro: o que o Nexo foi apurando, com a hora em que apurou. */
const REGISTRO = [
  { h: "21:08:02", t: "Arquivo recebido: 117_25_md_geral_a.pdf, 3,1 MB" },
  { h: "21:08:14", t: "42 páginas com texto; nenhuma página só com desenho" },
  { h: "21:08:21", t: "Capa e carimbo: obra 117-25, Criciúma, revisão A" },
  { h: "21:08:33", t: "Regras locais: 38 aplicadas, 2 não se aplicam a UBS" },
  { h: "21:10:24", t: "Leitura global concluída: 11 pontos marcados" },
  { h: "21:10:31", t: "Bloco 1/12: cap. 1, Disposições gerais" },
  { h: "21:10:40", t: "Bloco 3/12: cap. 3, Fundações. 1 ponto novo" },
  { h: "21:10:52", t: "Bloco 5/12: cap. 5, Alvenarias" },
  { h: "21:11:03", t: "Bloco 7/12: cap. 7, Instalações hidrossanitárias" },
  { h: "21:11:11", t: "Bloco 8/12: cap. 8, Instalações elétricas. 1 ponto novo" },
  { h: "21:11:20", t: "Bloco 9/12: cap. 9, Quadro de quantitativos" },
  { h: "21:11:29", t: "Bloco 10/12: cap. 10, Cobertura" },
];

function mmss(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];

/**
 * AUDITORIA RODANDO — técnica, como o resto. As etapas reais numa tabela
 * (estado, tempo gasto, tempo previsto) e, ao lado, o REGISTRO do que o Nexo
 * vai apurando. A única coisa que se mexe é o que está trabalhando: a etapa
 * atual pulsa, a barra anda, o registro recebe linha nova.
 */
export function TelaAuditoria({ situacao }: { situacao: SituacaoAud }) {
  const { dur, k } = useTempo();
  const atualInicial = situacao === "concluida" ? ETAPAS.length : situacao === "enviando" || situacao === "retomada" ? -1 : 3;
  const [atual, setAtual] = useState(atualInicial);
  const [decorrido, setDecorrido] = useState(situacao === "passou" ? 247 : situacao === "concluida" ? 312 : situacao === "enviando" ? 2 : 161);
  const [naEtapa, setNaEtapa] = useState(situacao === "passou" ? 101 : 34);
  const [linhas, setLinhas] = useState(situacao === "enviando" || situacao === "retomada" ? 0 : situacao === "concluida" ? REGISTRO.length : 9);
  const [confirmar, setConfirmar] = useState(situacao === "cancelando");
  const [aviso, setAviso] = useState(true);
  const [envio, setEnvio] = useState(situacao === "enviando" ? 18 : 100);
  const falhou = situacao === "falhou";
  const concluida = atual >= ETAPAS.length;
  const rodando = !concluida && !falhou && situacao !== "retomada";
  const registroRef = useRef<HTMLOListElement>(null);

  // O relógio e a etapa atual andam enquanto roda.
  useEffect(() => {
    if (!rodando || confirmar) return;
    const id = setInterval(() => {
      setDecorrido((d) => d + 1);
      setNaEtapa((n) => n + 1);
    }, 1000 * k);
    return () => clearInterval(id);
  }, [rodando, confirmar, k]);
  // O registro recebe linha nova de tempos em tempos.
  useEffect(() => {
    if (!rodando || confirmar || situacao === "enviando") return;
    const id = setInterval(() => setLinhas((n) => (n < REGISTRO.length ? n + 1 : n)), 2600 * k);
    return () => clearInterval(id);
  }, [rodando, confirmar, situacao, k]);
  useEffect(() => {
    registroRef.current?.scrollTo({ top: registroRef.current.scrollHeight, behavior: "smooth" });
  }, [linhas]);
  // Enviando: a barra de envio enche e a auditoria começa.
  useEffect(() => {
    if (situacao !== "enviando") return;
    const id = setInterval(() => {
      setEnvio((e) => {
        if (e >= 100) {
          clearInterval(id);
          setAtual(0);
          setLinhas(1);
          return 100;
        }
        return e + 9;
      });
    }, 240 * k);
    return () => clearInterval(id);
  }, [situacao, k]);

  const feitas = Math.max(0, Math.min(atual, ETAPAS.length));
  const pct = concluida ? 100 : Math.round(((feitas + (atual >= 0 ? 0.55 : 0)) / ETAPAS.length) * 100);
  const passou = situacao === "passou";

  return (
    <div className="au">
      <Topo atual="Painel" trabalhando={rodando} />

      <div className="au-corpo">
        {/* ---------- cabeçalho ---------- */}
        <header className="au-cabeca">
          <div className="au-obra">
            <MarcaDaPrefeitura prefeitura="Criciúma" forma="sinal" />
            <span className="ds-code">117-25</span>
            <span>UBS da Rua São Francisco de Assis</span>
          </div>
          <div className="au-titulo">
            <h1>{concluida ? "Auditoria concluída" : falhou ? "A auditoria parou" : situacao === "enviando" && envio < 100 ? "Enviando o memorial" : "Auditoria em curso"}</h1>
            <div className="au-titulo-dir">
              <span className="au-relogio ds-num">{mmss(decorrido)}</span>
              {rodando && !confirmar && (
                <Botao variante="ghost" tamanho="sm" onClick={() => setConfirmar(true)}>
                  <X />
                  Cancelar
                </Botao>
              )}
            </div>
          </div>
          <p className="au-arquivo">
            <FileText size={14} /> 117_25_md_geral_a.pdf, 42 páginas, revisão A. Iniciada às 21:08 por Victor.
          </p>
        </header>

        {/* ---------- cancelar: confirmação no lugar ---------- */}
        <AnimatePresence initial={false}>
          {confirmar && (
            <motion.div
              className="au-confirmar"
              role="alertdialog"
              aria-label="Cancelar a auditoria"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: dur("layout"), ease: ease(CURVA.out) }}
            >
              <div>
                <AlertTriangle size={16} />
                <span>
                  <b>Cancelar a auditoria?</b> Ela para agora e não gera parecer. Para auditar depois, comece de novo pelo Início.
                </span>
                <Botao variante="quiet" tamanho="sm" onClick={() => setConfirmar(false)}>
                  Continuar auditando
                </Botao>
                <Botao variante="ghost" tamanho="sm" className="au-perigo">
                  Cancelar auditoria
                </Botao>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- progresso ---------- */}
        <div className="au-progresso">
          <div className="au-barra">
            <motion.i
              className={concluida ? "au-barra--ok" : falhou ? "au-barra--erro" : ""}
              animate={{ width: `${situacao === "enviando" && envio < 100 ? envio * 0.08 : pct}%` }}
              transition={{ duration: dur("layout") * 2, ease: ease(CURVA.out) }}
            />
          </div>
          <div className="au-progresso-texto ds-num">
            <span>
              {situacao === "enviando" && envio < 100
                ? `Enviando, ${Math.min(envio, 100)}%`
                : situacao === "retomada"
                  ? "Rodando no servidor"
                  : concluida
                    ? `${ETAPAS.length} de ${ETAPAS.length} etapas`
                    : `Etapa ${Math.max(1, feitas + 1)} de ${ETAPAS.length}`}
            </span>
            <span>{concluida ? "Parecer pronto" : falhou ? "Parou na etapa 4" : situacao === "retomada" ? "" : passou ? "A etapa atual passou do previsto" : "Cerca de 3 min restantes"}</span>
          </div>
        </div>

        {/* ---------- concluída: o resultado em uma linha ---------- */}
        <AnimatePresence initial={false}>
          {concluida && (
            <motion.div className="au-pronto" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: dur("enter"), ease: ease(CURVA.out) }}>
              <div className="au-pronto-veredito">
                <Selo tom="block" ponto>
                  Não emitir ainda
                </Selo>
                <span className="ds-num">2 bloqueios, 3 decisões técnicas, 4 de revisão de texto</span>
              </div>
              <div className="au-pronto-acoes">
                <Botao variante="ghost" tamanho="sm">
                  Exportar parecer em PDF
                </Botao>
                <Botao variante="primary">
                  <FileSearch />
                  Abrir o parecer
                </Botao>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {falhou && (
          <div className="au-falha" role="alert">
            <div>
              <b>O modelo não respondeu na leitura capítulo a capítulo.</b>
              <span>Três tentativas, a última às 21:11:40. As três etapas anteriores terminaram.</span>
            </div>
            <Botao variante="ghost" tamanho="sm">
              Voltar ao início
            </Botao>
            <Botao variante="primary" tamanho="sm">
              <RotateCcw />
              Tentar de novo
            </Botao>
          </div>
        )}

        <div className="au-grade">
          {/* ---------- etapas ---------- */}
          <section className="au-bloco">
            <h2>Etapas</h2>
            {situacao === "retomada" ? (
              <div className="au-retomada">
                <p>Esta análise já estava rodando no servidor. O resultado aparece aqui quando ela terminar.</p>
                <span className="au-nota">As etapas desta sessão não voltam depois de recarregar a página; a auditoria segue igual.</span>
                {[0, 1, 2].map((i) => (
                  <Esqueleto key={i} largura={[280, 240, 300][i]} altura={11} />
                ))}
              </div>
            ) : (
              <table className="au-etapas">
                <thead>
                  <tr>
                    <th aria-label="Estado" />
                    <th>Etapa</th>
                    <th className="au-dir">Tempo</th>
                    <th className="au-dir">Previsto</th>
                  </tr>
                </thead>
                <tbody>
                  {ETAPAS.map((e, i) => {
                    const feita = i < feitas;
                    const agora = i === atual && !concluida;
                    const erro = falhou && i === 3;
                    const tempo = feita ? [12, 19, 98, 64, 22, 37, 9][i] : agora ? naEtapa : null;
                    return (
                      <tr key={e.id} className={feita ? "au-feita" : agora ? (erro ? "au-erro" : "au-agora") : "au-futura"}>
                        <td className="au-marca">
                          {feita ? (
                            <span className="au-m au-m--feita">
                              <Check size={11} strokeWidth={3} />
                            </span>
                          ) : agora && erro ? (
                            <span className="au-m au-m--erro">
                              <X size={11} strokeWidth={3} />
                            </span>
                          ) : agora ? (
                            <span className="au-m au-m--agora">
                              <i />
                            </span>
                          ) : (
                            <span className="au-m" />
                          )}
                        </td>
                        <td>
                          <span className="au-nome">
                            {e.nome}
                            {agora && passou && <Selo tom="decide">passou do previsto</Selo>}
                          </span>
                          {(agora || feita) && (
                            <span className="au-detalhe">
                              {feita ? e.feito : erro ? "O modelo não respondeu após três tentativas." : agora ? `${e.detalhe}${e.id === "blocos" ? " Bloco 10 de 12." : ""}` : ""}
                            </span>
                          )}
                          {agora && !erro && e.id === "blocos" && (
                            <span className="au-sub">
                              <motion.i animate={{ width: `${(10 / 12) * 100}%` }} transition={{ duration: dur("layout") }} />
                            </span>
                          )}
                        </td>
                        <td className={`au-dir au-tempo${agora && passou ? " au-tempo--passou" : ""}`}>{tempo !== null ? mmss(tempo) : ""}</td>
                        <td className="au-dir au-previsto">{mmss(e.previsto)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {/* ---------- registro ---------- */}
          <aside className="au-bloco au-registro">
            <h2>
              Registro
              {rodando && situacao !== "enviando" && <Orbe tamanho={11} estado="trabalhando" />}
            </h2>
            {linhas === 0 ? (
              <p className="au-nota" style={{ padding: "0 12px" }}>
                {situacao === "retomada" ? "O registro desta sessão se perdeu ao recarregar." : "Enviando o documento para análise…"}
              </p>
            ) : (
              <ol ref={registroRef}>
                <AnimatePresence initial={false}>
                  {REGISTRO.slice(0, linhas).map((l) => (
                    <motion.li
                      key={l.h}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: dur("enter"), ease: ease(CURVA.out) }}
                    >
                      <time>{l.h}</time>
                      <span>{l.t}</span>
                    </motion.li>
                  ))}
                </AnimatePresence>
                {concluida && (
                  <li className="au-registro-fim">
                    <time>21:13:14</time>
                    <span>Parecer fechado: não emitir, 2 bloqueios</span>
                  </li>
                )}
              </ol>
            )}
            {!concluida && !falhou && (
              <div className="au-sair">
                <span>Pode fechar a aba. A auditoria continua no servidor e fica em Continuar, no Início.</span>
                <label>
                  <button type="button" role="switch" aria-checked={aviso} className="au-chave" onClick={() => setAviso((a) => !a)}>
                    <motion.span animate={{ x: aviso ? 14 : 0 }} transition={{ type: "spring", stiffness: 520 / (k * k), damping: 40 / k }} />
                  </button>
                  Avisar por e-mail quando terminar
                </label>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
