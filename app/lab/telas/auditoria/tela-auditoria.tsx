"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, FileSearch, FileText, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Botao, Esqueleto, Orbe, Selo } from "@/components/ds/basicos";
import { LinhaDoTempo, MapaDasPaginas, type PassoDaLinha } from "@/components/ds/graficos";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import "./auditoria.css";

export type SituacaoAud = "enviando" | "em-curso" | "passou" | "retomada" | "cancelando" | "falhou" | "concluida";

/**
 * As etapas do motor com os nomes de hoje (lib/audit-progress.ts). O rótulo
 * curto vai no gráfico; o que cada uma faz e o que apurou vão no registro.
 * "confronto" fica de fora: com um arquivo só o motor não a anuncia.
 */
const ETAPAS = [
  { id: "extracao", rotulo: "Abrindo o memorial", previsto: 15, real: 12, fazendo: "Extraindo o texto de todas as páginas" },
  { id: "regras", rotulo: "Identidade e coerência", previsto: 20, real: 19, fazendo: "Conferindo obra, município e código" },
  { id: "global", rotulo: "Lendo o documento", previsto: 110, real: 98, fazendo: "Leitura da IA sobre o documento inteiro" },
  { id: "blocos", rotulo: "Capítulo a capítulo", previsto: 70, real: 64, fazendo: "Bloco 10 de 12: cap. 10, Cobertura" },
  { id: "evidencia", rotulo: "Evidências no texto", previsto: 25, real: 22, fazendo: "Conferindo cada ponto contra o trecho" },
  { id: "validacao", rotulo: "Segundo modelo", previsto: 40, real: 37, fazendo: "Revisando cada achado com um segundo modelo" },
  { id: "parecer", rotulo: "Fechando o parecer", previsto: 10, real: 9, fazendo: "Ordenando por impacto" },
] as const;

/** Pontos marcados por página (42 páginas) — onde os problemas se juntam. */
const PONTOS = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 2, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0];

const REGISTRO = [
  { h: "21:08:02", t: "Arquivo recebido: 117_25_md_geral_a.pdf, 3,1 MB" },
  { h: "21:08:14", t: "42 páginas com texto; nenhuma só com desenho" },
  { h: "21:08:21", t: "Capa e carimbo: obra 117-25, Criciúma, revisão A" },
  { h: "21:08:33", t: "Regras locais: 38 aplicadas, 2 não se aplicam a UBS" },
  { h: "21:10:24", t: "Leitura global: 8 pontos marcados" },
  { h: "21:10:40", t: "Bloco 3/12, Fundações: 1 ponto novo (p. 14)" },
  { h: "21:11:03", t: "Bloco 7/12, Instalações hidrossanitárias" },
  { h: "21:11:11", t: "Bloco 8/12, Instalações elétricas: 1 ponto novo" },
  { h: "21:11:20", t: "Bloco 9/12, Quadro de quantitativos (p. 31)" },
  { h: "21:11:29", t: "Bloco 10/12, Cobertura" },
];

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];
function mmss(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/**
 * AUDITORIA RODANDO, v2 — no idioma dos gráficos da Matos UI. A LINHA DO
 * TEMPO mostra as etapas como pílulas no eixo do tempo (o que falta aparece
 * tracejado onde deve cair, e um marcador diz "agora"); o MAPA DAS PÁGINAS
 * mostra onde os pontos se concentram enquanto a leitura anda.
 */
export function TelaAuditoria({ situacao }: { situacao: SituacaoAud }) {
  const { dur, k } = useTempo();
  const concluida0 = situacao === "concluida";
  const atual = concluida0 ? ETAPAS.length : situacao === "enviando" || situacao === "retomada" ? -1 : 3;
  const [naEtapa, setNaEtapa] = useState(situacao === "passou" ? 101 : 34);
  const [linhas, setLinhas] = useState(situacao === "enviando" || situacao === "retomada" ? 0 : concluida0 ? REGISTRO.length : 8);
  const [lidas, setLidas] = useState(concluida0 ? 42 : situacao === "enviando" || situacao === "retomada" ? 0 : 33);
  const [confirmar, setConfirmar] = useState(situacao === "cancelando");
  const [aviso, setAviso] = useState(true);
  const falhou = situacao === "falhou";
  const concluida = atual >= ETAPAS.length;
  const rodando = !concluida && !falhou && situacao !== "retomada";
  const registroRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!rodando || confirmar || situacao === "enviando") return;
    const id = setInterval(() => setNaEtapa((n) => n + 1), 1000 * k);
    const id2 = setInterval(() => setLinhas((n) => Math.min(REGISTRO.length, n + 1)), 3000 * k);
    const id3 = setInterval(() => setLidas((n) => (n < 39 ? n + 1 : n)), 2200 * k);
    return () => {
      clearInterval(id);
      clearInterval(id2);
      clearInterval(id3);
    };
  }, [rodando, confirmar, situacao, k]);
  useEffect(() => {
    registroRef.current?.scrollTo({ top: registroRef.current.scrollHeight, behavior: "smooth" });
  }, [linhas]);

  // Monta as pílulas: feitas com o tempo real, a atual com o decorrido, as que
  // faltam com o previsto, cada uma começando onde a anterior terminou.
  let t = 0;
  const passos: PassoDaLinha[] = ETAPAS.map((e, i) => {
    const inicio = t;
    let estado: PassoDaLinha["estado"] = "futuro";
    let duracao = 0;
    if (i < atual || concluida) {
      estado = "feito";
      duracao = e.real;
    } else if (i === atual) {
      estado = falhou ? "erro" : "atual";
      duracao = naEtapa;
    }
    t = inicio + (estado === "futuro" ? e.previsto : estado === "atual" ? Math.max(naEtapa, e.previsto) : duracao);
    return { id: e.id, rotulo: e.rotulo, inicio, duracao, previsto: e.previsto, estado };
  });
  const total = Math.max(330, t);
  const agora = rodando && atual >= 0 ? passos[atual].inicio + naEtapa : situacao === "enviando" ? 2 : null;
  const decorrido = concluida ? passos.reduce((s, p) => s + p.duracao, 0) : falhou ? passos[atual].inicio + naEtapa : agora ?? 0;
  const restante = Math.max(0, t - decorrido);
  const passou = situacao === "passou";
  const blocoPaginas = [lidas + 1, lidas + 2].filter((n) => n <= 42);

  return (
    <div className="au">
      <Topo atual="Painel" trabalhando={rodando} />

      <div className="au-corpo">
        <header className="au-cabeca">
          <div className="au-obra">
            <MarcaDaPrefeitura prefeitura="Criciúma" forma="sinal" />
            <span className="ds-code">117-25</span>
            <span>UBS da Rua São Francisco de Assis</span>
          </div>
          <div className="au-titulo">
            <h1>{concluida ? "Auditoria concluída" : falhou ? "A auditoria parou" : situacao === "enviando" ? "Enviando o memorial" : "Auditoria em curso"}</h1>
            <div className="au-titulo-dir">
              <span className="au-metrica">
                <small>{concluida ? "levou" : "decorrido"}</small>
                <b className="ds-num">{mmss(decorrido)}</b>
              </span>
              {rodando && (
                <span className="au-metrica">
                  <small>restante</small>
                  <b className={`ds-num${passou ? " au-ambar" : ""}`}>~{mmss(restante)}</b>
                </span>
              )}
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

        {/* ---------- a linha do tempo ---------- */}
        <section className="au-bloco au-bloco--linha">
          <div className="au-bloco-cabeca">
            <h2>Linha do tempo</h2>
            <span className="au-legenda">
              <i className="au-leg au-leg--feito" /> feito
              <i className="au-leg au-leg--lento" /> mais lento
              {rodando && (
                <>
                  <i className="au-leg au-leg--agora" /> agora
                </>
              )}
              {!concluida && (
                <>
                  <i className="au-leg au-leg--futuro" /> previsto
                </>
              )}
            </span>
          </div>
          {situacao === "retomada" ? (
            <div className="au-retomada">
              <p>Esta análise já estava rodando no servidor. O resultado aparece aqui quando ela terminar.</p>
              <span className="au-nota">A linha do tempo desta sessão não volta depois de recarregar a página; a auditoria segue igual.</span>
              <Esqueleto largura="100%" altura={18} raio={999} />
              <Esqueleto largura="70%" altura={18} raio={999} />
            </div>
          ) : (
            <LinhaDoTempo passos={passos} agora={agora} total={total} />
          )}
          {rodando && atual >= 0 && (
            <div className="au-fazendo">
              <Orbe tamanho={13} estado="trabalhando" />
              <span className="au-brilho">{(ETAPAS as readonly { fazendo: string }[])[atual]?.fazendo}</span>
              {passou && <Selo tom="decide">passou do previsto</Selo>}
            </div>
          )}
        </section>

        <div className="au-grade">
          {/* ---------- o mapa das páginas ---------- */}
          <section className="au-bloco">
            <div className="au-bloco-cabeca">
              <h2>Páginas do memorial</h2>
              <span className="au-nota ds-num">
                {lidas} de 42 lidas, {PONTOS.slice(0, lidas).reduce((a, b) => a + b, 0)} pontos
              </span>
            </div>
            <MapaDasPaginas paginas={PONTOS} lidas={lidas} atuais={rodando && atual === 3 ? blocoPaginas : []} />
          </section>

          {/* ---------- o registro ---------- */}
          <section className="au-bloco au-registro">
            <div className="au-bloco-cabeca">
              <h2>Registro</h2>
            </div>
            {linhas === 0 ? (
              <p className="au-nota" style={{ padding: "0 12px" }}>
                {situacao === "retomada" ? "O registro desta sessão se perdeu ao recarregar." : "Enviando o documento para análise…"}
              </p>
            ) : (
              <ol ref={registroRef}>
                <AnimatePresence initial={false}>
                  {REGISTRO.slice(0, linhas).map((l) => (
                    <motion.li key={l.h} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: dur("enter"), ease: ease(CURVA.out) }}>
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
          </section>
        </div>
      </div>
    </div>
  );
}
