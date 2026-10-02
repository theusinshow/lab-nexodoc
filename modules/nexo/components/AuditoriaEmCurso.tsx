"use client";

/**
 * A AUDITORIA RODANDO, no palco do Nexo — o desenho do lab (Auditoria, "em
 * curso"), com o que o motor relata de verdade.
 *
 * A primeira versão do app (migração 5h) era um cartão com o relógio e uma
 * lista; o lab tinha a linha do tempo em barras, os capítulos, os achados até
 * agora e o registro (Matheus, 02/10/2026). Tudo isso volta, com uma regra:
 * nada inventado. O motor não manda previsão por etapa nem as páginas de cada
 * bloco; então o futuro fica "na fila" (sem pílula prevista), o anel gira sem
 * fingir porcentagem, e os capítulos são contados pela conclusão.
 *
 * O que o motor manda (lib/audit-progress.ts, app/api/audit/route.ts): início
 * e fim de cada etapa, um FATO medido no fim ("6 achado(s)", "218 páginas,
 * 464.585 caracteres"), o progresso dos blocos e o teto de tempo da validação.
 */
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, FileText } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Esqueleto, Orbe, Selo } from "@/components/ds/basicos";
import { LinhaDoTempo, type PassoDaLinha } from "@/components/ds/graficos";
import { useTempo } from "@/lib/ds/tempo";
import { formatarEmBrasilia } from "@/lib/fuso-de-brasilia";
import { NOME_DA_PASSADA, type PassadaDaAuditoria } from "@/lib/audit-progress";
import { etapasDosMarcos, type EtapaVista, type MarcoRecebido } from "../lib/etapas-da-auditoria";
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

/** As etapas que toda auditoria percorre; o confronto só existe com mais de um arquivo. */
const PREVISTAS: PassadaDaAuditoria[] = ["extracao", "regras", "global", "blocos", "evidencia", "validacao", "parecer"];

/** As etapas que acham problema, na ordem: é delas a conta de "achados até agora". */
const QUE_ACHAM: { passada: PassadaDaAuditoria; rotulo: string }[] = [
  { passada: "regras", rotulo: "Regras locais" },
  { passada: "global", rotulo: "Leitura do documento" },
  { passada: "blocos", rotulo: "Capítulo a capítulo" },
];

/** O primeiro número do fato ("6 achado(s)" → 6). */
function numeroDo(detalhe?: string): number | null {
  const m = detalhe?.match(/(\d[\d.]*)/);
  return m ? Number(m[1].replace(/\./g, "")) : null;
}

function mmss(s: number) {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

function hora(ms: number) {
  return formatarEmBrasilia(ms, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

type Estado = "enviando" | "rodando" | "passou" | "retomada";
const ROTULO_DO_ESTADO: Record<Estado, string> = {
  enviando: "Enviando",
  rodando: "Auditando",
  passou: "Auditando, além do previsto",
  retomada: "Rodando no servidor",
};

/** O anel: sem estimativa honesta, ele gira — "está trabalhando", não "está em 25%". */
function Anel({ estado }: { estado: Estado }) {
  return (
    <svg className={`au-anel au-anel--${estado}`} viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r="27" className="au-anel-trilho" />
      <circle cx="32" cy="32" r="27" className="au-anel-giro" pathLength={1} strokeDasharray="0.22 0.78" />
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
  arquivo,
  inicioMs,
  marcos,
  retomada = false,
}: {
  nivel: "standard" | "deep";
  arquivo: string;
  inicioMs: number;
  marcos: MarcoRecebido[];
  onCancelar?: () => void;
  retomada?: boolean;
}) {
  const { dur } = useTempo();
  const [agoraMs, setAgoraMs] = useState(() => Date.now());
  const [registroAberto, setRegistroAberto] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setAgoraMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const etapas = etapasDosMarcos(marcos);
  const porPassada = new Map<PassadaDaAuditoria, EtapaVista>(etapas.map((e) => [e.passada, e]));
  const atual = etapas.find((e) => !e.concluida);
  const decorrido = (agoraMs - inicioMs) / 1000;
  const semSinal = etapas.length === 0;

  const estourou = atual?.orcamentoMs !== undefined && agoraMs - atual.inicioMs > atual.orcamentoMs;
  const estado: Estado = retomada ? "retomada" : semSinal ? "enviando" : estourou ? "passou" : "rodando";

  // As etapas desta corrida: as previstas, mais o confronto se o motor o abriu.
  const ordem = PREVISTAS.flatMap((p) => (p === "validacao" && porPassada.has("confronto") ? (["confronto", p] as PassadaDaAuditoria[]) : [p]));

  const passos: PassoDaLinha[] = ordem.map((p) => {
    const e = porPassada.get(p);
    const inicio = e ? (e.inicioMs - inicioMs) / 1000 : decorrido;
    if (!e) return { id: p, rotulo: ROTULO[p], inicio, duracao: 0, previsto: 0, estado: "futuro" };
    if (e.concluida) {
      const fim = ((e.fimMs ?? agoraMs) - inicioMs) / 1000;
      return { id: p, rotulo: ROTULO[p], inicio, duracao: Math.max(0, fim - inicio), previsto: 0, estado: "feito" };
    }
    const naEtapa = Math.max(0, decorrido - inicio);
    let nota: ReactNode = (
      <>
        <Orbe tamanho={12} estado="trabalhando" />
        <span className="au-brilho">{e.detalhe ?? NOME_DA_PASSADA[p]}</span>
      </>
    );
    if (p === "blocos" && e.total)
      nota = (
        <>
          <Orbe tamanho={12} estado="trabalhando" />
          <span className="au-brilho">
            {e.indice ?? 0} de {e.total} blocos lidos
          </span>
        </>
      );
    if (estourou)
      nota = (
        <>
          {nota}
          <Selo tom="decide">passou do teto</Selo>
        </>
      );
    // O teto (orcamentoMs) não é previsão: serve só para dizer "passou do teto".
    return { id: p, rotulo: ROTULO[p], inicio, duracao: naEtapa, previsto: 0, estado: "atual", nota };
  });
  // A escala acompanha o tempo, com folga à frente.
  const total = Math.max(60, decorrido * 1.2);
  const concluidas = etapas.filter((e) => e.concluida).length;

  // Os fatos da abertura do memorial: "218 páginas, 464.585 caracteres".
  const abertura = porPassada.get("extracao")?.concluida ? porPassada.get("extracao")?.detalhe : undefined;
  const paginas = abertura ? numeroDo(abertura) : null;

  // Capítulo a capítulo: contados pela CONCLUSÃO (os blocos rodam em paralelo).
  const blocos = porPassada.get("blocos");
  const totalDeBlocos = blocos?.total ?? 0;
  const blocosFeitos = blocos?.concluida ? totalDeBlocos : (blocos?.indice ?? 0);

  // Achados até agora: o fato de fim de cada etapa que acha problema.
  const contas = QUE_ACHAM.map((q) => {
    const e = porPassada.get(q.passada);
    return { ...q, valor: e?.concluida ? numeroDo(e.detalhe) : null, emCurso: Boolean(e && !e.concluida) };
  });
  const achadosAteAgora = contas.reduce((s, c) => s + (c.valor ?? 0), 0);
  const maiorConta = Math.max(1, ...contas.map((c) => c.valor ?? 0));
  const validacao = porPassada.get("validacao");
  const aRevisar = validacao ? numeroDo(validacao.detalhe && !validacao.concluida ? validacao.detalhe : undefined) : null;
  const confirmados = validacao?.concluida ? numeroDo(validacao.detalhe) : null;

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
              </div>
              <h1>Memorial descritivo</h1>
              <p className="au-arquivo">
                <FileText size={13} aria-hidden />
                <span title={arquivo}>
                  {arquivo}
                  {paginas ? `, ${paginas} páginas` : ""}
                </span>
                <span className="au-sep" />
                <span>Auditoria</span>
              </p>
            </div>

            <div className="au-cronometro">
              <Anel estado={estado} />
              <div className="au-cronometro-texto">
                <span className="au-cronometro-tempo">
                  <b className="ds-num">{mmss(decorrido)}</b>
                  <small>decorrido</small>
                </span>
                <span className={`au-cronometro-falta${estourou ? " au-ambar" : ""}`}>
                  {retomada
                    ? "reconectada à análise no servidor"
                    : semSinal
                      ? "esperando a primeira etapa"
                      : estourou
                        ? "a etapa passou do teto; pode voltar incompleta"
                        : `${concluidas} de ${ordem.length} etapas prontas`}
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
          {/* ---------- capítulo a capítulo ---------- */}
          <section className="au-bloco au-paginas">
            <div className="au-bloco-cabeca">
              <h2>Capítulo a capítulo</h2>
              <span className="au-nota ds-num">{abertura ?? "páginas e caracteres quando o memorial abrir"}</span>
            </div>
            <div className="au-blocos">
              {totalDeBlocos > 0 ? (
                <div className="au-blocos-faixa" role="img" aria-label={`${blocosFeitos} de ${totalDeBlocos} blocos lidos`}>
                  {Array.from({ length: totalDeBlocos }, (_, i) => (
                    <span key={i} className={`au-bloco-pil au-bloco-pil--${i < blocosFeitos ? "feito" : blocos?.concluida ? "feito" : "fila"}`}>
                      <span className="ds-num">{i + 1}</span>
                    </span>
                  ))}
                </div>
              ) : null}
              <p className="au-blocos-rodape">
                {totalDeBlocos > 0
                  ? blocos?.concluida
                    ? `${totalDeBlocos} blocos lidos${blocos.detalhe ? `, ${blocos.detalhe}` : ""}`
                    : `${blocosFeitos} de ${totalDeBlocos} blocos lidos`
                  : "Os blocos aparecem quando a leitura capítulo a capítulo começar."}
              </p>
            </div>
          </section>

          {/* ---------- o que já se achou, por etapa ---------- */}
          <section className="au-bloco au-achados">
            <div className="au-bloco-cabeca">
              <h2>Achados até agora</h2>
              <span className="au-achados-total ds-num" title="Antes do segundo modelo, que ainda pode derrubar alguns">
                {contas.some((c) => c.valor !== null) ? achadosAteAgora : "—"}
              </span>
            </div>
            {contas.some((c) => c.valor !== null || c.emCurso) ? (
              <ul className="au-contas">
                {contas.map((c) => (
                  <li key={c.passada} data-em-curso={c.emCurso || undefined}>
                    <span>{c.rotulo}</span>
                    <i aria-hidden>
                      <motion.em initial={false} animate={{ width: `${((c.valor ?? 0) / maiorConta) * 100}%` }} transition={{ duration: dur("layout") }} />
                    </i>
                    <b className="ds-num">{c.valor ?? (c.emCurso ? "lendo" : "—")}</b>
                  </li>
                ))}
                {(aRevisar !== null || confirmados !== null) && (
                  <li className="au-contas-validacao">
                    <span>Segundo modelo</span>
                    <small>{confirmados !== null ? `${confirmados} confirmados` : `revisando ${aRevisar}`}</small>
                  </li>
                )}
              </ul>
            ) : (
              <p className="au-nota">Os achados aparecem quando a primeira etapa terminar.</p>
            )}
          </section>
        </div>

        {/* ---------- o registro: a última linha; o resto sob demanda ---------- */}
        <section className="au-registro-fino">
          <button type="button" className="au-registro-fino-barra" aria-expanded={registroAberto} onClick={() => setRegistroAberto((a) => !a)} disabled={registro.length === 0}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={ultima ? `${ultima.ms}-${ultima.texto}` : "nada"} className="au-registro-ultimo" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: dur("state") }}>
                {ultima ? (
                  <>
                    <time>{hora(ultima.ms)}</time>
                    {ultima.texto}
                  </>
                ) : (
                  "O registro começa quando o motor responder."
                )}
              </motion.span>
            </AnimatePresence>
            {registro.length > 1 && (
              <span className="au-registro-ver">
                {registroAberto ? "fechar" : `ver as ${registro.length} linhas`}
                <ChevronDown size={14} aria-hidden style={{ transform: registroAberto ? "rotate(180deg)" : undefined }} />
              </span>
            )}
          </button>
          {registroAberto && (
            <div className="au-registro-aberto au-registro">
              <ol>
                {registro.map((l, i) => (
                  <li key={i}>
                    <time>{hora(l.ms)}</time>
                    <span>{l.texto}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
