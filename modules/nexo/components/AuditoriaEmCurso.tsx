"use client";

/**
 * A AUDITORIA RODANDO, no palco do Nexo — o desenho do lab (Auditoria, "em
 * curso"), com o que o motor relata de verdade.
 *
 * A primeira versão do app (migração 5h) era um cartão com o relógio e uma
 * lista; a segunda (02/10/2026) trouxe a linha do tempo, os capítulos e o
 * registro, mas cortou o que o motor não mandava. Na terceira (02/10/2026,
 * "o backend não acompanhava o front") o motor passou a mandar as páginas e o
 * estado de cada bloco e a foto dos achados por nível, tipo e página
 * (lib/foto-da-auditoria.ts), e a tela voltou a ser a do lab: o mapa das
 * páginas com os blocos, os achados por nível e o previsto na linha do tempo.
 *
 * Uma regra continua: nada inventado. O previsto sai das últimas auditorias
 * deste navegador (modules/nexo/lib/tempos-da-auditoria.ts); sem histórico ele
 * não aparece e o anel gira sem fingir porcentagem.
 */
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, FileText } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Esqueleto, Orbe, Selo } from "@/components/ds/basicos";
import { LinhaDoTempo, MapaDasPaginas, NiveisEmFaixa, type GrupoDoMapa, type PassoDaLinha } from "@/components/ds/graficos";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";
import { formatarEmBrasilia } from "@/lib/fuso-de-brasilia";
import { NOME_DA_PASSADA, type PassadaDaAuditoria } from "@/lib/audit-progress";
import { NIVEIS as NOMES_DOS_NIVEIS } from "@/lib/nivel-do-achado";
import { etapasDosMarcos, type EtapaVista, type MarcoRecebido } from "../lib/etapas-da-auditoria";
import { maisRecente, paginasDosMarcos, previsaoPorEtapa } from "../lib/tempos-da-auditoria";
import { MarcaDaPrefeitura } from "./MarcaDaPrefeitura";
import { useMoldura } from "@/components/moldura/contexto";
import { tituloDoMemorial } from "@/lib/titulo-do-memorial";
import "@/components/telas/auditoria/auditoria.css";

/** Os nomes curtos da linha do tempo (os do lab). */
const ROTULO: Record<PassadaDaAuditoria, string> = {
  extracao: "Abrindo o memorial",
  regras: "Identidade e coerência",
  global: "Lendo o documento",
  blocos: "Capítulo a capítulo",
  evidencia: "Evidências no texto",
  confronto: "Entre os documentos",
  validacao: "Segundo modelo",
  parecer: "Fechando o parecer",
};

/**
 * As etapas que toda auditoria percorre. "Capítulo a capítulo" só existe quando
 * o motor planeja blocos; o confronto, só com mais de um arquivo.
 */
const PREVISTAS: PassadaDaAuditoria[] = ["extracao", "regras", "global", "blocos", "evidencia", "validacao", "parecer"];

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];

function mmss(s: number) {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

function hora(ms: number, segundos = true) {
  return formatarEmBrasilia(ms, { hour: "2-digit", minute: "2-digit", ...(segundos ? { second: "2-digit" } : {}) });
}

const juntar = (n: number[]) => n.join(", ").replace(/, (\d+)$/, " e $1");

type Estado = "enviando" | "rodando" | "passou" | "retomada";
const ROTULO_DO_ESTADO: Record<Estado, string> = {
  enviando: "Enviando",
  rodando: "Auditando",
  passou: "Auditando, além do previsto",
  retomada: "Rodando no servidor",
};

/**
 * O relógio em anel: quanto do tempo previsto já passou. Sem previsão o arco
 * gira sem medir nada — "está trabalhando", não "está em 25%".
 */
function Anel({ fracao, estado }: { fracao: number | null; estado: Estado }) {
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
          initial={false}
          animate={{ pathLength: fracao }}
          transition={{ duration: dur("layout") * 3, ease: ease(CURVA.out) }}
        />
      )}
    </svg>
  );
}

/** Uma linha do registro: o que o motor relatou, com a hora. */
function linhaDoRegistro(m: MarcoRecebido): { ms: number; texto: string } {
  const nome = NOME_DA_PASSADA[m.passada];
  if (m.estado === "fim") return { ms: m.emMs, texto: m.detalhe ? `${nome}: ${m.detalhe}` : `${nome}: pronto` };
  if (m.passada === "blocos" && m.total) return { ms: m.ultimoMs ?? m.emMs, texto: `${nome}: ${m.indice ?? 0} de ${m.total} blocos` };
  return { ms: m.emMs, texto: m.detalhe ? `${nome}: ${m.detalhe}` : `${nome}…` };
}

export function AuditoriaEmCurso({
  nivel,
  arquivo,
  inicioMs,
  marcos,
  retomada = false,
  obra,
  codigo,
  prefeitura,
}: {
  nivel: "standard" | "deep";
  arquivo: string;
  inicioMs: number;
  marcos: MarcoRecebido[];
  onCancelar?: () => void;
  retomada?: boolean;
  obra?: string;
  codigo?: string;
  prefeitura?: string;
}) {
  const { dur } = useTempo();
  const { primeiroNome } = useMoldura();
  const [agoraMs, setAgoraMs] = useState(() => Date.now());
  const [registroAberto, setRegistroAberto] = useState(false);
  const [blocoSobre, setBlocoSobre] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setAgoraMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const etapas = etapasDosMarcos(marcos);
  const porPassada = new Map<PassadaDaAuditoria, EtapaVista>(etapas.map((e) => [e.passada, e]));
  const atual = etapas.find((e) => !e.concluida);
  const decorrido = (agoraMs - inicioMs) / 1000;
  const semSinal = etapas.length === 0;

  const totalDePaginas = paginasDosMarcos(marcos);
  // O histórico só muda quando uma corrida termina: lido uma vez por documento.
  const previsao = useMemo(() => previsaoPorEtapa(nivel, totalDePaginas), [nivel, totalDePaginas]);

  // Sem blocos planejados (a leitura do documento já leu tudo e a etapa seguinte
  // começou), ou sem blocos no histórico, "Capítulo a capítulo" sai da linha.
  const blocosNaoVem =
    !porPassada.has("blocos") &&
    ((porPassada.has("evidencia") && Boolean(porPassada.get("global")?.concluida)) || (previsao !== null && previsao.blocos === undefined));
  const ordem = PREVISTAS.filter((p) => !(p === "blocos" && blocosNaoVem)).flatMap((p) =>
    p === "validacao" && porPassada.has("confronto") ? (["confronto", p] as PassadaDaAuditoria[]) : [p],
  );

  // As pílulas: feitas com o tempo real, a atual com o decorrido, as que faltam
  // com o previsto, cada uma começando onde a anterior terminaria.
  let cursor = 0;
  let restante = 0;
  let passouDoPrevisto = false;
  const passos: PassoDaLinha[] = [];
  for (const p of ordem) {
    const e = porPassada.get(p);
    const previsto = previsao?.[p] ?? 0;
    if (!e) {
      const inicio = Math.max(cursor, decorrido);
      cursor = inicio + previsto;
      restante += previsto;
      passos.push({ id: p, rotulo: ROTULO[p], inicio, duracao: 0, previsto, estado: "futuro" });
      continue;
    }
    const inicio = (e.inicioMs - inicioMs) / 1000;
    if (e.concluida) {
      const fim = ((e.fimMs ?? agoraMs) - inicioMs) / 1000;
      cursor = fim;
      passos.push({ id: p, rotulo: ROTULO[p], inicio, duracao: Math.max(0, fim - inicio), previsto: 0, estado: "feito" });
      continue;
    }
    const naEtapa = Math.max(0, decorrido - inicio);
    if (previsto > 0 && naEtapa > previsto) passouDoPrevisto = true;
    restante += Math.max(0, previsto - naEtapa);
    cursor = inicio + Math.max(naEtapa, previsto);
    let nota: ReactNode = (
      <>
        <Orbe tamanho={12} estado="trabalhando" />
        <span className="au-brilho">{e.detalhe ?? NOME_DA_PASSADA[p]}</span>
      </>
    );
    if (p === "blocos" && e.total) {
      const lendoAgora = (maisRecente(marcos, "blocos") ?? []).filter((b) => b.estado === "lendo").map((b) => b.n);
      nota = (
        <>
          <Orbe tamanho={12} estado="trabalhando" />
          <span className="au-brilho">
            {e.indice ?? 0} de {e.total} blocos lidos
            {lendoAgora.length ? `, lendo agora ${lendoAgora.length === 1 ? "o" : "os"} ${juntar(lendoAgora)}` : ""}
          </span>
        </>
      );
    }
    const estourou = e.orcamentoMs !== undefined && agoraMs - e.inicioMs > e.orcamentoMs;
    if (estourou || (previsto > 0 && naEtapa > previsto))
      nota = (
        <>
          {nota}
          <Selo tom="decide">{estourou ? "passou do teto" : "passou do previsto"}</Selo>
        </>
      );
    passos.push({ id: p, rotulo: ROTULO[p], inicio, duracao: naEtapa, previsto, estado: "atual", nota });
  }

  const estourouTeto = atual?.orcamentoMs !== undefined && agoraMs - atual.inicioMs > atual.orcamentoMs;
  const estado: Estado = retomada ? "retomada" : semSinal ? "enviando" : estourouTeto || passouDoPrevisto ? "passou" : "rodando";
  const comPrevisao = previsao !== null && !semSinal && !retomada;
  // A escala acompanha o tempo e o previsto, com folga à frente.
  const total = Math.max(60, decorrido * 1.15, cursor * 1.05);
  const fracao = comPrevisao ? Math.min(1, decorrido / Math.max(1, decorrido + restante)) : null;
  const horaDoFim = hora(agoraMs + restante * 1000, false);

  // ---------- as páginas e os blocos ----------
  const blocos = maisRecente(marcos, "blocos") ?? [];
  const foto = maisRecente(marcos, "foto");
  const global = porPassada.get("global");
  const paginas = totalDePaginas ? Array.from({ length: totalDePaginas }, (_, i) => foto?.porPagina[i] ?? 0) : [];
  const todas = paginas.map((_, i) => i + 1);
  const paginasDe = (b: { de: number; ate: number }) => todas.filter((n) => n >= b.de && n <= b.ate);
  const temBlocos = blocos.length > 0;
  // Sem blocos, quem lê o documento inteiro é a leitura global: as páginas acendem juntas.
  const lidasEm = temBlocos ? blocos.filter((b) => b.estado === "feito").flatMap(paginasDe) : global?.concluida ? todas : [];
  const atuais = temBlocos ? blocos.filter((b) => b.estado === "lendo").flatMap(paginasDe) : global && !global.concluida ? todas : [];
  const blocoEmFoco = blocos.find((b) => b.n === blocoSobre);
  const colunas = paginas.length <= 42 ? 14 : Math.min(40, Math.ceil(paginas.length / 6));

  // ---------- os achados até agora, por nível ----------
  const niveis: GrupoDoMapa[] = NOMES_DOS_NIVEIS.map((n) => ({
    id: n.id,
    rotulo: n.nome,
    tom: n.id,
    itens: (foto?.achados ?? [])
      .filter((a) => a.nivel === n.id)
      .map((a) => ({ id: a.tipo, rotulo: a.tipo, valor: a.n, ...(n.id === "texto" ? { tom: "texto" as const } : {}) })),
  }));
  const achadosAteAgora = (foto?.achados ?? []).reduce((s, a) => s + a.n, 0);
  const validacao = porPassada.get("validacao");

  const registro = marcos.map(linhaDoRegistro).sort((a, b) => a.ms - b.ms);
  const ultima = registro[registro.length - 1];

  return (
    <div className="au au--embutido" aria-live="polite" aria-busy="true">
      <div className="au-corpo">
        <header className={`au-painel au-painel--${estado}`}>
          <div className="au-painel-topo">
            <div className="au-painel-texto">
              <div className="au-painel-linha">
                <span className="au-estado">
                  <i />
                  {ROTULO_DO_ESTADO[estado]}
                </span>
                {(obra || codigo) && (
                  <span className="au-obra">
                    {prefeitura && <MarcaDaPrefeitura prefeitura={prefeitura} forma="sinal" />}
                    {codigo && <span className="ds-code">{codigo}</span>}
                    {obra && <span>{obra}</span>}
                  </span>
                )}
              </div>
              <h1>{tituloDoMemorial(arquivo)}</h1>
              <p className="au-arquivo">
                <FileText size={13} aria-hidden />
                <span title={arquivo}>
                  {arquivo}
                  {totalDePaginas ? `, ${totalDePaginas} páginas` : ""}
                </span>
                <span className="au-sep" />
                <span title={nivel === "deep" ? "Leitura do documento inteiro e revisão de cada achado por um segundo modelo" : undefined}>
                  {nivel === "deep" ? "Análise profunda" : "Análise padrão"}
                </span>
                <span className="au-sep" />
                <span>{primeiroNome ? `${primeiroNome}, às` : "começou às"} {hora(inicioMs, false)}</span>
              </p>
            </div>

            <div className="au-cronometro">
              <Anel fracao={fracao} estado={estado} />
              <div className="au-cronometro-texto">
                <span className="au-cronometro-tempo">
                  <b className="ds-num">{mmss(decorrido)}</b>
                  <small>decorrido</small>
                </span>
                <span className={`au-cronometro-falta${estado === "passou" ? " au-ambar" : ""}`}>
                  {retomada
                    ? "reconectada à análise no servidor"
                    : semSinal
                      ? "esperando a primeira etapa"
                      : estourouTeto
                        ? "a etapa passou do teto; pode voltar incompleta"
                        : !comPrevisao
                          ? "a estimativa vem depois da primeira auditoria completa"
                          : passouDoPrevisto
                            ? `passou do previsto; ~${mmss(restante)} para terminar`
                            : `~${mmss(restante)} para terminar, lá pelas ${horaDoFim}`}
                </span>
              </div>
            </div>

            {/* O Cancelar mora no cabeçalho do palco (BarraDoNexo), que vale também no mapa: um só. */}
          </div>
        </header>

        {/* ---------- a linha do tempo ---------- */}
        <section className="au-bloco au-bloco--linha">
          <div className="au-bloco-cabeca">
            <h2>Linha do tempo</h2>
            <span className="au-legenda">
              <i className="au-leg au-leg--feito" /> feito
              <i className="au-leg au-leg--lento" /> mais lento
              <i className="au-leg au-leg--agora" /> agora
              {comPrevisao && (
                <>
                  <i className="au-leg au-leg--futuro" /> previsto
                </>
              )}
            </span>
          </div>
          {retomada && semSinal ? (
            <div className="au-retomada">
              <p>Esta análise já estava rodando no servidor. O resultado aparece aqui quando ela terminar.</p>
              <span className="au-nota">A linha do tempo desta sessão não volta depois de recarregar a página; a auditoria segue igual.</span>
              <Esqueleto largura="100%" altura={18} raio={999} />
              <Esqueleto largura="70%" altura={18} raio={999} />
            </div>
          ) : semSinal ? (
            <div className="au-retomada">
              <p>Enviando o documento para análise…</p>
              <Esqueleto largura="100%" altura={18} raio={999} />
              <Esqueleto largura="70%" altura={18} raio={999} />
            </div>
          ) : (
            <LinhaDoTempo passos={passos} agora={decorrido} total={total} />
          )}
        </section>

        <div className="au-grade">
          {/* ---------- onde: páginas e blocos ---------- */}
          <section className="au-bloco au-paginas">
            <div className="au-bloco-cabeca">
              <h2>Páginas do memorial</h2>
              <span className="au-nota ds-num">
                {!totalDePaginas
                  ? "as páginas aparecem quando o memorial abrir"
                  : temBlocos
                    ? `${lidasEm.length} de ${totalDePaginas} lidas capítulo a capítulo`
                    : global?.concluida
                      ? `${totalDePaginas} de ${totalDePaginas} lidas pela leitura do documento`
                      : global
                        ? `lendo as ${totalDePaginas} páginas de uma vez`
                        : `${totalDePaginas} páginas`}
              </span>
            </div>
            {paginas.length > 0 ? (
              <MapaDasPaginas
                legenda={null}
                paginas={paginas}
                lidas={0}
                lidasEm={lidasEm}
                atuais={atuais}
                destaque={blocoEmFoco ? paginasDe(blocoEmFoco) : null}
                colunas={colunas}
              />
            ) : (
              <Esqueleto largura="100%" altura={64} raio={8} />
            )}
            {temBlocos && (
              <div className="au-blocos" onMouseLeave={() => setBlocoSobre(null)}>
                <div className="au-blocos-faixa">
                  {blocos.map((b) => (
                    <button
                      key={b.n}
                      type="button"
                      className={`au-bloco-pil au-bloco-pil--${b.estado}${blocoSobre === b.n ? " au-bloco-pil--sobre" : ""}`}
                      style={{ flexGrow: b.ate - b.de + 1 }}
                      onMouseEnter={() => setBlocoSobre(b.n)}
                      onFocus={() => setBlocoSobre(b.n)}
                      aria-label={`Bloco ${b.n}, páginas ${b.de} a ${b.ate}`}
                    >
                      <span className="ds-num">{b.n}</span>
                    </button>
                  ))}
                </div>
                <p className="au-blocos-rodape">
                  {blocoEmFoco ? (
                    <>
                      <b>Bloco {blocoEmFoco.n}</b>, p. {blocoEmFoco.de}–{blocoEmFoco.ate}:{" "}
                      {blocoEmFoco.estado === "feito" ? "lido" : blocoEmFoco.estado === "lendo" ? "lendo agora" : "na fila"}
                    </>
                  ) : null}
                </p>
              </div>
            )}
          </section>

          {/* ---------- o que já se achou: por nível e por tipo ---------- */}
          <section className="au-bloco au-achados">
            <div className="au-bloco-cabeca">
              <h2>Achados até agora</h2>
              <span
                className="au-achados-total ds-num"
                title={
                  validacao?.concluida
                    ? `O segundo modelo terminou: ${validacao.detalhe ?? "revisão pronta"}`
                    : "Antes do segundo modelo, que ainda pode derrubar alguns"
                }
              >
                {foto ? achadosAteAgora : "—"}
              </span>
            </div>
            {foto ? <NiveisEmFaixa niveis={niveis} semFaixa /> : <p className="au-nota">Os achados aparecem quando a primeira etapa terminar.</p>}
          </section>
        </div>

        {/* ---------- o registro: a última linha; o resto sob demanda ---------- */}
        <section className="au-registro-fino">
          <button type="button" className="au-registro-fino-barra" aria-expanded={registroAberto} onClick={() => setRegistroAberto((a) => !a)} disabled={registro.length === 0}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={ultima ? `${ultima.ms}-${ultima.texto}` : "nada"}
                className="au-registro-ultimo"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: dur("state") }}
              >
                {ultima ? (
                  <>
                    <time>{hora(ultima.ms)}</time> {ultima.texto}
                  </>
                ) : (
                  "Enviando o documento para análise…"
                )}
              </motion.span>
            </AnimatePresence>
            {registro.length > 0 && (
              <span className="au-registro-ver">
                {registroAberto ? "Fechar o registro" : `Registro completo, ${registro.length} ${registro.length === 1 ? "linha" : "linhas"}`}
                <motion.span animate={{ rotate: registroAberto ? 180 : 0 }} transition={{ duration: dur("state") }} style={{ display: "inline-flex" }}>
                  <ChevronDown size={14} aria-hidden />
                </motion.span>
              </span>
            )}
          </button>
          <AnimatePresence initial={false}>
            {registroAberto && (
              <motion.div
                className="au-registro au-registro-aberto"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: dur("layout"), ease: ease(CURVA.out) }}
              >
                <ol>
                  {registro.map((l, i) => (
                    <li key={i}>
                      <time>{hora(l.ms)}</time>
                      <span>{l.texto}</span>
                    </li>
                  ))}
                </ol>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ---------- o que vem depois ---------- */}
        <footer className="au-depois">
          <span className="au-depois-texto">
            Pode fechar a aba: a auditoria continua no servidor. Quando você voltar a esta conversa, o resultado abre aqui, com o veredito e a fila de
            achados.
          </span>
        </footer>
      </div>
    </div>
  );
}
