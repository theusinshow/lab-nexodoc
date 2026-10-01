"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ChevronDown, FileSearch, FileText, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Botao, Esqueleto, NumeroQueChega, Orbe, Selo } from "@/components/ds/basicos";
import { LinhaDoTempo, MapaDasPaginas, NiveisEmFaixa, type GrupoDoMapa, type PassoDaLinha } from "@/components/ds/graficos";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import { useIr, useNoPrototipo } from "../_comum/prototipo";
import "./auditoria.css";

export type SituacaoAud = "enviando" | "em-curso" | "passou" | "retomada" | "cancelando" | "falhou" | "concluida";

/**
 * As passadas do motor com os nomes de hoje (lib/audit-progress.ts). Os
 * tempos previstos das que não têm orçamento vêm da média das últimas
 * auditorias — hoje o motor só manda orçamento da leitura global (modo
 * profundo) e da validação.
 */
const ETAPAS = [
  { id: "extracao", rotulo: "Abrindo o memorial", previsto: 15, real: 12 },
  { id: "regras", rotulo: "Identidade e coerência", previsto: 20, real: 19 },
  { id: "global", rotulo: "Lendo o documento", previsto: 110, real: 98 },
  { id: "blocos", rotulo: "Capítulo a capítulo", previsto: 70, real: 64 },
  { id: "evidencia", rotulo: "Evidências no texto", previsto: 25, real: 22 },
  { id: "validacao", rotulo: "Segundo modelo", previsto: 40, real: 37 },
  { id: "parecer", rotulo: "Fechando o parecer", previsto: 10, real: 9 },
];

/**
 * Os blocos da leitura capítulo a capítulo, com as páginas de cada um (o
 * `chunk.startPage/endPage` do motor). Rodam três de cada vez, então terminam
 * fora de ordem: o 10 pode acabar antes do 9.
 */
const BLOCOS = [
  { n: 1, cap: "Capa e identificação", de: 1, ate: 3 },
  { n: 2, cap: "Disposições gerais", de: 4, ate: 7 },
  { n: 3, cap: "Arquitetura", de: 8, ate: 11 },
  { n: 4, cap: "Fundações", de: 12, ate: 15 },
  { n: 5, cap: "Estrutura", de: 16, ate: 18 },
  { n: 6, cap: "Hidrossanitário", de: 19, ate: 21 },
  { n: 7, cap: "Elétrica", de: 22, ate: 25 },
  { n: 8, cap: "Climatização", de: 26, ate: 28 },
  { n: 9, cap: "Quantitativos", de: 29, ate: 31 },
  { n: 10, cap: "Cobertura", de: 32, ate: 35 },
  { n: 11, cap: "Esquadrias", de: 36, ate: 39 },
  { n: 12, cap: "Encerramento", de: 40, ate: 42 },
];
const paginasDe = (b: (typeof BLOCOS)[number]) => Array.from({ length: b.ate - b.de + 1 }, (_, i) => b.de + i);

/** Pontos marcados por página (42 páginas) — onde os problemas se juntam. */
const PONTOS = [1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 2, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0];

/**
 * Os achados até agora por NÍVEL (as faixas de impacto do parecer) e, dentro
 * de cada nível, por TIPO (lib/audit-report.ts, ERROR_TYPE_LABELS). Redação e
 * gramática sai da revisão de texto e ganha nível e cor próprios.
 */
const NIVEIS: GrupoDoMapa[] = [
  {
    id: "block",
    rotulo: "Bloqueia a emissão",
    tom: "block",
    itens: [
      { id: "identidade", rotulo: "Identidade / documental", valor: 2 },
    ],
  },
  {
    id: "decide",
    rotulo: "Decisão técnica",
    tom: "decide",
    itens: [
      { id: "norma", rotulo: "Norma", valor: 1 },
      { id: "especificacao", rotulo: "Especificação", valor: 1 },
      { id: "quantitativo", rotulo: "Quantitativo", valor: 1 },
      { id: "tecnico", rotulo: "Técnico", valor: 1 },
    ],
  },
  { id: "note", rotulo: "Revisão de texto", tom: "note", itens: [{ id: "forma", rotulo: "Numeração e unidades", valor: 2 }] },
  { id: "texto", rotulo: "Gramática", tom: "texto", itens: [{ id: "editorial", rotulo: "Redação e gramática", valor: 2, tom: "texto" }] },
];

const REGISTRO = [
  { h: "21:08:02", t: "Arquivo recebido: 117_25_md_geral_a.pdf, 3,1 MB" },
  { h: "21:08:14", t: "42 páginas, 314.848 caracteres; nenhuma só com desenho" },
  { h: "21:08:21", t: "Capa e carimbo: obra 117-25, Criciúma, revisão A" },
  { h: "21:08:33", t: "Regras locais: 38 aplicadas, 2 achados" },
  { h: "21:10:24", t: "Leitura global: 6 achados" },
  { h: "21:10:31", t: "Capítulo a capítulo: 12 blocos, 3 de cada vez" },
  { h: "21:10:58", t: "Bloco 4, Fundações, p. 12–15: 1 achado" },
  { h: "21:11:20", t: "Bloco 7, Elétrica, p. 22–25: 1 achado" },
  { h: "21:11:29", t: "Bloco 10, Cobertura, terminou antes do 9" },
  { h: "21:11:41", t: "Bloco 8, Climatização, p. 26–28" },
];

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];

type EstadoDoPainel = "enviando" | "rodando" | "passou" | "retomada" | "concluida" | "falhou";
const ROTULO_DO_ESTADO: Record<EstadoDoPainel, string> = {
  enviando: "Enviando",
  rodando: "Auditando",
  passou: "Auditando, além do previsto",
  retomada: "Rodando no servidor",
  concluida: "Concluída",
  falhou: "Parou",
};

/**
 * O RELÓGIO EM ANEL: quanto do tempo estimado já passou. Sem estimativa
 * (enviando, depois de recarregar), o arco gira sem medir nada — "está
 * trabalhando", não "está em 25%".
 */
function Anel({ fracao, estado }: { fracao: number | null; estado: EstadoDoPainel }) {
  const { dur } = useTempo();
  return (
    <svg className={`au-anel au-anel--${estado}`} viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r="27" className="au-anel-trilho" />
      {fracao === null ? (
        <circle cx="32" cy="32" r="27" className="au-anel-giro" pathLength={1} strokeDasharray="0.22 0.78" />
      ) : (
        <motion.circle
          cx="32"
          cy="32"
          r="27"
          className="au-anel-arco"
          transform="rotate(-90 32 32)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: fracao }}
          transition={{ duration: dur("layout") * 3, ease: ease(CURVA.out) }}
        />
      )}
    </svg>
  );
}
function mmss(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/**
 * AUDITORIA RODANDO. De cima para baixo: o que já se sabe (os fatos do
 * documento), o que está acontecendo (a linha do tempo, com a etapa atual
 * dizendo o que faz) e onde (o mapa das páginas com os blocos), ao lado dos
 * achados até agora. Embaixo, o que vem depois: dá para sair, e o resultado
 * abre aqui.
 */
export function TelaAuditoria({ situacao, embutido = false }: { situacao: SituacaoAud; embutido?: boolean }) {
  const { dur, k } = useTempo();
  const concluida = situacao === "concluida";
  const falhou = situacao === "falhou";
  const semSinal = situacao === "enviando" || situacao === "retomada";
  const atual = concluida ? ETAPAS.length : semSinal ? -1 : 3;
  const rodando = !concluida && !falhou && situacao !== "retomada";

  const [naEtapa, setNaEtapa] = useState(situacao === "passou" ? 101 : 34);
  const [linhas, setLinhas] = useState(semSinal ? 0 : concluida ? REGISTRO.length : 8);
  const [feitos, setFeitos] = useState<number[]>(concluida ? BLOCOS.map((b) => b.n) : semSinal ? [] : [1, 2, 3, 4, 5, 6, 7, 8, 10]);
  const [confirmar, setConfirmar] = useState(situacao === "cancelando");
  const [aviso, setAviso] = useState(true);
  const [blocoSobre, setBlocoSobre] = useState<number | null>(null);
  const [registroAberto, setRegistroAberto] = useState(false);
  const registroRef = useRef<HTMLOListElement>(null);
  const ir = useIr();
  const proto = useNoPrototipo();

  // No protótipo a auditoria anda sozinha: o envio vira leitura, e a leitura
  // termina num parecer. No lab, cada situação fica parada onde está.
  useEffect(() => {
    if (!proto) return;
    const proxima = situacao === "enviando" ? ["em-curso", 2200] : situacao === "em-curso" ? ["concluida", 16000] : null;
    if (!proxima) return;
    const id = setTimeout(() => ir("auditoria", proxima[0] as string), (proxima[1] as number) * k);
    return () => clearTimeout(id);
  }, [proto, situacao, ir, k]);

  useEffect(() => {
    if (!rodando || confirmar || situacao === "enviando") return;
    const id = setInterval(() => setNaEtapa((n) => n + 1), 1000 * k);
    const id2 = setInterval(() => setLinhas((n) => Math.min(REGISTRO.length, n + 1)), 3000 * k);
    // o bloco 9 termina depois do 10: a leitura é em paralelo
    const id3 = setInterval(() => setFeitos((f) => (f.includes(9) ? f : [...f, 9])), 7000 * k);
    return () => {
      clearInterval(id);
      clearInterval(id2);
      clearInterval(id3);
    };
  }, [rodando, confirmar, situacao, k]);
  useEffect(() => {
    registroRef.current?.scrollTo({ top: registroRef.current.scrollHeight, behavior: "smooth" });
  }, [linhas]);

  const lendo = semSinal || concluida ? [] : BLOCOS.filter((b) => !feitos.includes(b.n)).map((b) => b.n);
  const paginasLidas = BLOCOS.filter((b) => feitos.includes(b.n)).flatMap(paginasDe);
  const paginasLendo = rodando ? BLOCOS.filter((b) => lendo.includes(b.n)).flatMap(paginasDe) : [];
  const achadosBlocos = BLOCOS.filter((b) => feitos.includes(b.n) && [4, 7].includes(b.n)).length;
  const achadosAteAgora = semSinal ? 0 : 2 + 6 + achadosBlocos;
  const falaDosBlocos = lendo.length ? `lendo agora ${lendo.length === 1 ? "o" : "os"} ${lendo.join(", ").replace(/, (\d+)$/, " e $1")}` : "fechando a etapa";

  // As pílulas: feitas com o tempo real, a atual com o decorrido, as que faltam
  // com o previsto, cada uma começando onde a anterior terminou.
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
    let nota: PassoDaLinha["nota"];
    if (estado === "atual")
      nota = (
        <>
          <Orbe tamanho={12} estado="trabalhando" />
          <span className="au-brilho">
            {feitos.length} de 12 blocos lidos, {falaDosBlocos}
          </span>
          {situacao === "passou" && <Selo tom="decide">passou do previsto</Selo>}
        </>
      );
    if (estado === "erro") nota = <span className="au-nota-erro">O modelo não respondeu no bloco 9, depois de três tentativas.</span>;
    return { id: e.id, rotulo: e.rotulo, inicio, duracao, previsto: e.previsto, estado, nota };
  });
  const total = Math.max(330, t);
  const agora = rodando && atual >= 0 ? passos[atual].inicio + naEtapa : situacao === "enviando" ? 2 : null;
  const decorrido = concluida ? passos.reduce((s, p) => s + p.duracao, 0) : falhou ? passos[3].inicio + naEtapa : (agora ?? 0);
  const restante = Math.max(0, t - decorrido);
  const passou = situacao === "passou";
  const blocoEmFoco = BLOCOS.find((b) => b.n === blocoSobre);
  const ultimaLinha = concluida ? { h: "21:13:14", t: "Parecer fechado: não emitir, 2 bloqueios" } : REGISTRO[linhas - 1];
  const estadoDoPainel: EstadoDoPainel = concluida ? "concluida" : falhou ? "falhou" : situacao === "enviando" ? "enviando" : situacao === "retomada" ? "retomada" : passou ? "passou" : "rodando";
  const fracao = semSinal ? null : concluida ? 1 : Math.min(1, decorrido / Math.max(1, decorrido + restante));
  const fim = 21 * 3600 + 8 * 60 + decorrido + restante;
  const horaDoFim = `${Math.floor(fim / 3600)}:${String(Math.floor((fim % 3600) / 60)).padStart(2, "0")}`;


  return (
    <div className={`au${embutido ? " au--embutido" : ""}`}>
      {!embutido && <Topo atual={null} trabalhando={rodando} />}

      <div className="au-corpo">
        <header className={`au-painel au-painel--${estadoDoPainel}`}>
          <div className="au-painel-topo">
            <div className="au-painel-texto">
              <div className="au-painel-linha">
                <span className="au-estado">
                  <i />
                  {ROTULO_DO_ESTADO[estadoDoPainel]}
                </span>
                <span className="au-obra">
                  <MarcaDaPrefeitura prefeitura="Criciúma" forma="sinal" />
                  <span className="ds-code">117-25</span>
                  <span>UBS da Rua São Francisco de Assis</span>
                </span>
              </div>
              <h1>Memorial geral, revisão A</h1>
              <p className="au-arquivo">
                <FileText size={13} />
                <span>117_25_md_geral_a.pdf, 42 páginas</span>
                <span className="au-sep" />
                <span title="Leitura do documento inteiro, capítulo a capítulo, e revisão de cada achado por um segundo modelo">Análise profunda</span>
                <span className="au-sep" />
                <span>Victor, às 21:08</span>
              </p>
            </div>

            <div className="au-cronometro">
              <Anel fracao={fracao} estado={estadoDoPainel} />
              <div className="au-cronometro-texto">
                <span className="au-cronometro-tempo">
                  <b className="ds-num">{mmss(decorrido)}</b>
                  <small>{concluida ? "levou no total" : falhou ? "até parar" : "decorrido"}</small>
                </span>
                <span className={`au-cronometro-falta${passou ? " au-ambar" : ""}`}>
                  {concluida
                    ? "terminou às 21:13"
                    : falhou
                      ? "parou às 21:11"
                      : semSinal
                        ? "estimativa depois da primeira etapa"
                        : passou
                          ? `passou do previsto; ~${mmss(restante)} para terminar`
                          : `~${mmss(restante)} para terminar, lá pelas ${horaDoFim}`}
                </span>
              </div>
            </div>

            {rodando && !confirmar && (
              <Botao variante="quiet" tamanho="sm" className="au-cancelar" onClick={() => setConfirmar(true)}>
                <X />
                Cancelar
              </Botao>
            )}
          </div>

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
                  <b>Cancelar a auditoria?</b> Ela para agora e não gera parecer. Para auditar depois, comece de novo pelo Painel.
                </span>
                <Botao variante="quiet" tamanho="sm" onClick={() => setConfirmar(false)}>
                  Continuar auditando
                </Botao>
                <Botao variante="ghost" tamanho="sm" className="au-perigo" onClick={() => ir("inicio")}>
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
                Não emitir
              </Selo>
              <span className="ds-num">2 bloqueios, 3 decisões técnicas, 4 de revisão de texto</span>
            </div>
            <div className="au-pronto-acoes">
              <Botao variante="ghost" tamanho="sm" onClick={() => ir("resultado", "parecer-gerando")}>
                Exportar parecer em PDF
              </Botao>
              <Botao variante="primary" onClick={() => ir("nexo-auditoria", "pronta")}>
                <FileSearch />
                Abrir o resultado
              </Botao>
            </div>
          </motion.div>
        )}
        {falhou && (
          <div className="au-falha" role="alert">
            <div>
              <b>O modelo não respondeu na leitura capítulo a capítulo.</b>
              <span>Três tentativas no bloco 9, a última às 21:11:40. As três etapas anteriores terminaram e o que acharam está guardado.</span>
            </div>
            <Botao variante="ghost" tamanho="sm" onClick={() => ir("inicio")}>
              Voltar ao painel
            </Botao>
            <Botao variante="primary" tamanho="sm" onClick={() => ir("auditoria", "em-curso")}>
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
        </section>

        <div className="au-grade">
          {/* ---------- onde: páginas e blocos ---------- */}
          <section className="au-bloco au-paginas">
            <div className="au-bloco-cabeca">
              <h2>Páginas do memorial</h2>
              <span className="au-nota ds-num">{paginasLidas.length} de 42 lidas capítulo a capítulo</span>
            </div>
            <MapaDasPaginas legenda={null} paginas={PONTOS} lidas={0} lidasEm={paginasLidas} atuais={paginasLendo} destaque={blocoEmFoco ? paginasDe(blocoEmFoco) : null} />
            <div className="au-blocos" onMouseLeave={() => setBlocoSobre(null)}>
              <div className="au-blocos-faixa">
                {BLOCOS.map((b) => {
                  const est = feitos.includes(b.n) ? "feito" : lendo.includes(b.n) ? (falhou && b.n === 9 ? "erro" : "lendo") : "fila";
                  return (
                    <button
                      key={b.n}
                      type="button"
                      className={`au-bloco-pil au-bloco-pil--${est}${blocoSobre === b.n ? " au-bloco-pil--sobre" : ""}`}
                      style={{ flexGrow: b.ate - b.de + 1 }}
                      onMouseEnter={() => setBlocoSobre(b.n)}
                      onFocus={() => setBlocoSobre(b.n)}
                      aria-label={`Bloco ${b.n}, ${b.cap}, páginas ${b.de} a ${b.ate}`}
                    >
                      <span className="ds-num">{b.n}</span>
                    </button>
                  );
                })}
              </div>
              <p className="au-blocos-rodape">
                {blocoEmFoco ? (
                  <>
                    <b>Bloco {blocoEmFoco.n}</b>, {blocoEmFoco.cap}, p. {blocoEmFoco.de}–{blocoEmFoco.ate}:{" "}
                    {feitos.includes(blocoEmFoco.n) ? "lido" : lendo.includes(blocoEmFoco.n) ? (falhou && blocoEmFoco.n === 9 ? "parou aqui" : "lendo agora") : "na fila"}
                  </>
                ) : semSinal ? (
                  "Os blocos aparecem quando a leitura capítulo a capítulo começar."
                ) : null}
              </p>
            </div>
          </section>

          {/* ---------- o que já se achou: por nível e por etapa ---------- */}
          <section className="au-bloco au-achados">
            <div className="au-bloco-cabeca">
              <h2>Achados até agora</h2>
              <span className="au-achados-total ds-num" title={concluida ? "Antes do segundo modelo, que manteve 9 no parecer" : "Antes do segundo modelo, que ainda pode derrubar alguns"}>{semSinal ? "—" : achadosAteAgora}</span>
            </div>
            {semSinal ? (
              <p className="au-nota">Os achados aparecem quando a primeira etapa terminar.</p>
            ) : (
              <NiveisEmFaixa niveis={NIVEIS} semFaixa />
            )}
          </section>
        </div>

        {/* ---------- o registro: uma linha, a última; o resto sob demanda ---------- */}
        <section className="au-registro-fino">
          <button type="button" className="au-registro-fino-barra" aria-expanded={registroAberto} onClick={() => setRegistroAberto((a) => !a)} disabled={linhas === 0}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={ultimaLinha?.h ?? "nada"} className="au-registro-ultimo" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: dur("state") }}>
                {ultimaLinha ? (
                  <>
                    <time>{ultimaLinha.h}</time> {ultimaLinha.t}
                  </>
                ) : situacao === "retomada" ? (
                  "O registro desta sessão se perdeu ao recarregar."
                ) : (
                  "Enviando o documento para análise…"
                )}
              </motion.span>
            </AnimatePresence>
            {linhas > 0 && (
              <span className="au-registro-ver">
                {registroAberto ? "Fechar o registro" : `Registro completo, ${linhas + (concluida ? 1 : 0)} linhas`}
                <motion.span animate={{ rotate: registroAberto ? 180 : 0 }} transition={{ duration: dur("state") }} style={{ display: "inline-flex" }}>
                  <ChevronDown size={14} />
                </motion.span>
              </span>
            )}
          </button>
          <AnimatePresence initial={false}>
            {registroAberto && (
              <motion.div className="au-registro au-registro-aberto" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: dur("layout"), ease: ease(CURVA.out) }}>
                <ol ref={registroRef}>
                  {REGISTRO.slice(0, linhas).map((l) => (
                    <li key={l.h}>
                      <time>{l.h}</time>
                      <span>{l.t}</span>
                    </li>
                  ))}
                  {concluida && (
                    <li className="au-registro-fim">
                      <time>21:13:14</time>
                      <span>Parecer fechado: não emitir, 2 bloqueios</span>
                    </li>
                  )}
                </ol>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ---------- o que vem depois ---------- */}
        {!concluida && !falhou && (
          <footer className="au-depois">
            <span className="au-depois-texto">
              Pode fechar a aba: a auditoria continua no servidor e fica em Continuar, no Painel. Quando terminar, o resultado abre aqui, com o
              veredito e a fila de achados.
            </span>
            <label>
              <button type="button" role="switch" aria-checked={aviso} className="au-chave" onClick={() => setAviso((a) => !a)}>
                <motion.span animate={{ x: aviso ? 14 : 0 }} transition={{ type: "spring", stiffness: 520 / (k * k), damping: 40 / k }} />
              </button>
              Avisar por e-mail quando terminar
            </label>
          </footer>
        )}
      </div>
    </div>
  );
}
