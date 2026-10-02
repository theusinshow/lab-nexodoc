"use client";

import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, Search, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { useAdminToken } from "@/components/admin/admin-token";
import { Botao, Girando } from "@/components/ds/basicos";
import { BotaoDeSegurar } from "@/components/ds/micro";
import { BarraEmbutida } from "@/components/ds/medidas";
import { classificarFalha, faseDaCarga, type FalhaDaCarga } from "@/lib/estado-da-carga";
import { confirmacaoConfere, palavraDeConfirmacao, type Alcance } from "@/lib/expurgo";
import { useTempo } from "@/lib/ds/tempo";
import { plural } from "@/lib/plural";

import { RITMO, SUAVE } from "../comum/ritmo";
import { AvisoDaCarga, quandoCurto } from "./pecas";
import "./pessoas-banco.css";

/*
 * DADOS no sistema novo: o que ficou gravado no servidor. O expurgo vem
 * primeiro (é a pergunta que traz alguém aqui), depois as duas listas de
 * consulta. As cargas e as ações vieram de `components/admin/conteudo/`
 * (expurgo, auditorias, lds); muda a pele, e excluir auditorias e LDs, que
 * abria o diálogo do navegador, confirma aqui na tela, segurando o botão.
 */

const megas = (b: number) => (b <= 0 ? "0 MB" : b < 0.1 * 1048576 ? "menos de 0,1 MB" : `${(b / 1048576).toFixed(1).replace(".", ",")} MB`);
const ROTULO_DO_TIPO: Record<string, string> = { auditoria: "auditoria", volume: "montagem de volume" };

/** Carga com token, no padrão do painel: fase, falha com tipo, dados de antes ficam. */
function useCarga<T>(url: string, valido: (c: unknown) => c is T) {
  const { token, restaurado, recarga, registrarResposta } = useAdminToken();
  const [dados, setDados] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<{ tipo: FalhaDaCarga; detalhe: string | null } | null>(null);
  const [carregadoEm, setCarregadoEm] = useState<string | null>(null);
  const fase = faseDaCarga({ restaurado, token, carregando, erro: erro?.tipo ?? null, temDados: Boolean(dados) });

  const carregar = useCallback(
    async (t: string, consulta = "") => {
      if (!t.trim()) return;
      setCarregando(true);
      setErro(null);
      let r: Response;
      try {
        r = await fetch(`${url}${consulta ? `?${consulta}` : ""}`, { cache: "no-store", headers: { Authorization: `Bearer ${t.trim()}` } });
      } catch {
        setErro({ tipo: "rede", detalhe: null });
        setCarregando(false);
        return;
      }
      const corpo = (await r.json().catch(() => null)) as unknown;
      setCarregando(false);
      if (!r.ok || !valido(corpo)) {
        const tipo = classificarFalha(r);
        if (tipo === "negado") registrarResposta(false);
        setErro({ tipo, detalhe: (corpo as { error?: string } | null)?.error ?? `HTTP ${r.status}` });
        return;
      }
      registrarResposta(true);
      setDados(corpo);
      setCarregadoEm(new Date().toISOString());
    },
    [url, valido, registrarResposta],
  );
  return { token, restaurado, recarga, dados, fase, erro, carregadoEm, carregar };
}

function ConfirmaExclusao({ texto, feito, onCancelar, onConfirmar }: { texto: string | null; feito: string; onCancelar: () => void; onConfirmar: () => void }) {
  const { k } = useTempo();
  return (
    <AnimatePresence initial={false}>
      {texto && (
        <motion.div className="pb-confirma pb-confirma--perigo" role="alertdialog" aria-label={texto} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
          <div className="pb-confirma-dentro">
            <CircleAlert size={15} aria-hidden />
            <p>{texto}</p>
            <Botao variante="ghost" tamanho="sm" onClick={onCancelar}>
              Cancelar
            </Botao>
            <BotaoDeSegurar feito={feito} onConfirmar={onConfirmar}>
              <Trash2 size={14} /> Segure para excluir
            </BotaoDeSegurar>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------ o expurgo ------------------------------ */

type Conversa = { id: string; userEmail: string; title: string; tipo: string | null; atualizadaEm: string; obra: string; rotulo: string };
type Previa = { conversas: number; auditorias: number; achados: number; mensagensDeAchado: number; lds: number; artefatos: number; arquivos: number; bytes: number; donos: number; preservado: { eventosDeConsumo: number; custoUsd: number } };
type Pendente = { alcance: Alcance; rotulo: string; titulo: string; previa: Previa | null };
const ehConversas = (c: unknown): c is { conversas: Conversa[] } => Array.isArray((c as { conversas?: unknown } | null)?.conversas);

export function ExpurgoDeConversas() {
  const { k } = useTempo();
  const carga = useCarga("/api/admin/dados", ehConversas);
  const { token, restaurado, recarga, carregar } = carga;
  const conversas = useMemo(() => carga.dados?.conversas ?? [], [carga.dados]);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [pendente, setPendente] = useState<Pendente | null>(null);
  const [digitado, setDigitado] = useState("");
  const [executando, setExecutando] = useState(false);
  const [erro, setErro] = useState("");
  const [feito, setFeito] = useState("");

  useEffect(() => {
    if (!restaurado || !token.trim()) return;
    queueMicrotask(() => void carregar(token));
  }, [restaurado, token, recarga, carregar]);

  const obras = useMemo(() => {
    const mapa = new Map<string, { chave: string; rotulo: string; conversas: Conversa[] }>();
    for (const c of conversas) {
      const atual = mapa.get(c.obra);
      if (atual) atual.conversas.push(c);
      else mapa.set(c.obra, { chave: c.obra, rotulo: c.rotulo, conversas: [c] });
    }
    return [...mapa.values()];
  }, [conversas]);

  /** A prévia conta o que VAI e o que FICA antes de qualquer coisa ser apagada. */
  async function pedirPrevia(alcance: Alcance, rotulo: string, titulo: string) {
    setPendente({ alcance, rotulo, titulo, previa: null });
    setDigitado("");
    setErro("");
    setFeito("");
    try {
      const r = await fetch("/api/admin/dados/previa", { method: "POST", headers: { Authorization: `Bearer ${token.trim()}`, "Content-Type": "application/json" }, body: JSON.stringify({ alcance }) });
      const corpo = (await r.json().catch(() => null)) as { previa?: Previa; error?: string } | null;
      if (!r.ok || !corpo?.previa) throw new Error(corpo?.error ?? "Não foi possível contar o que seria apagado.");
      setPendente({ alcance, rotulo, titulo, previa: corpo.previa });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível contar o que seria apagado.");
      setPendente(null);
    }
  }

  async function executar() {
    if (!pendente) return;
    setExecutando(true);
    setErro("");
    try {
      const r = await fetch("/api/admin/dados/expurgo", {
        method: "POST",
        headers: { Authorization: `Bearer ${token.trim()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ alcance: pendente.alcance, rotulo: pendente.rotulo, confirmacao: digitado }),
      });
      const corpo = (await r.json().catch(() => null)) as { apagado?: Previa; error?: string } | null;
      if (!r.ok) throw new Error(corpo?.error ?? "Não foi possível expurgar.");
      const a = corpo?.apagado;
      setFeito(a ? `Expurgado: ${plural(a.conversas, "conversa", "conversas")}, ${plural(a.auditorias, "auditoria", "auditorias")} e ${megas(a.bytes)} de arquivos. ${plural(a.donos, "dono vai receber", "donos vão receber")} a lápide.` : "Expurgado.");
      setPendente(null);
      setDigitado("");
      setMarcadas(new Set());
      await carregar(token);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível expurgar.");
    } finally {
      setExecutando(false);
    }
  }

  const esperado = pendente ? palavraDeConfirmacao(pendente.alcance, pendente.rotulo) : "";
  const confere = pendente ? confirmacaoConfere(digitado, esperado) : false;
  const p = pendente?.previa;

  return (
    <section className="adm-bloco" aria-labelledby="pb-conv">
      <header>
        <h2 id="pb-conv">Conversas e expurgo</h2>
        {carga.dados && <span className="adm-fraco ds-num">{plural(conversas.length, "conversa", "conversas")} em {plural(obras.length, "obra", "obras")}</span>}
      </header>
      <p className="din-lede">As conversas do Nexo agrupadas por obra. Apagar aqui é permanente e alcança as máquinas que montaram — não só o banco.</p>
      <div className="pb-avisos-da-secao">
        <AvisoDaCarga fase={carga.fase} erro={carga.erro?.tipo} detalhe={carga.erro?.detalhe} oque="as conversas do servidor" atualizadoEm={carga.carregadoEm} onTentar={() => void carregar(token)} />
        {erro && <p className="din-erro-linha">{erro}</p>}
        {feito && <p className="din-salvo">{feito}</p>}
      </div>

      <AnimatePresence initial={false}>
        {pendente && (
          <motion.section className="pb-expurgo" aria-label={`Expurgar ${pendente.titulo}`} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
            <div className="pb-expurgo-dentro">
              <p className="pb-expurgo-tit">
                <Trash2 size={15} aria-hidden /> Expurgar {pendente.titulo}
              </p>
              {!p ? (
                <p className="pb-nota">
                  <Girando tamanho={12} /> Contando o que seria apagado…
                </p>
              ) : (
                <div className="pb-expurgo-colunas">
                  <div>
                    <p className="pb-rotulo pb-rotulo--vai">vai embora</p>
                    <ul>
                      <li>{plural(p.conversas, "conversa", "conversas")}</li>
                      <li>{plural(p.auditorias, "auditoria", "auditorias")}</li>
                      <li>{plural(p.achados, "achado", "achados")}</li>
                      <li>{plural(p.mensagensDeAchado, "mensagem de achado", "mensagens de achado")}</li>
                      <li>{plural(p.lds, "LD", "LDs")}</li>
                      <li>{plural(p.artefatos, "artefato", "artefatos")}</li>
                      <li>
                        {plural(p.arquivos, "arquivo guardado", "arquivos guardados")} ({megas(p.bytes)})
                      </li>
                    </ul>
                  </div>
                  <div>
                    <p className="pb-rotulo pb-rotulo--fica">fica</p>
                    <ul>
                      <li>
                        {plural(p.preservado.eventosDeConsumo, "evento de consumo", "eventos de consumo")} (US$ {p.preservado.custoUsd.toFixed(2).replace(".", ",")})
                      </li>
                    </ul>
                    <p className="pb-nota">O custo por obra vai passar a listar isto como “conversa removida”.</p>
                    {p.donos > 0 && <p className="pb-nota">{plural(p.donos, "dono vai receber", "donos vão receber")} a lápide: as máquinas deles apagam a cópia local no próximo carregamento do Nexo.</p>}
                  </div>
                </div>
              )}
              <label className="pb-palavra">
                <span>
                  Para confirmar, digite <b className="mp-mono">{esperado}</b>
                </span>
                <input className="pb-campo pb-campo--mono" value={digitado} onChange={(e) => setDigitado(e.target.value)} aria-label="Palavra de confirmação" autoComplete="off" disabled={!p || executando} />
              </label>
              <div className="pb-expurgo-acoes">
                <Botao variante="primary" tamanho="sm" className="pb-perigo" disabled={!p || !confere || executando} onClick={() => void executar()}>
                  {executando ? <Girando tamanho={12} /> : <Trash2 size={13} />} Expurgar permanentemente
                </Botao>
                <Botao variante="ghost" tamanho="sm" onClick={() => (setPendente(null), setDigitado(""))}>
                  Cancelar
                </Botao>
                {!confere && digitado && <span className="pb-ainda">ainda não confere</span>}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {carga.dados && conversas.length === 0 && <p className="adm-vazio">Nenhuma conversa guardada no servidor.</p>}
      {obras.length > 0 && (
        <>
          <div className="adm-tabela pb-conversas">
            {obras.map((o) => {
              const todas = o.conversas.every((c) => marcadas.has(c.id));
              return (
                <Fragment key={o.chave}>
                  <div className="adm-linha pb-obra">
                    <span>
                      <input
                        type="checkbox"
                        className="pb-check"
                        checked={todas}
                        onChange={() =>
                          setMarcadas((m) => {
                            const n = new Set(m);
                            o.conversas.forEach((c) => (todas ? n.delete(c.id) : n.add(c.id)));
                            return n;
                          })
                        }
                        aria-label={`Selecionar todas as conversas da obra ${o.rotulo}`}
                      />
                    </span>
                    <span className="adm-tit">
                      <b>{o.rotulo}</b>
                      <small className="ds-num">{plural(o.conversas.length, "conversa", "conversas")}</small>
                    </span>
                    <span />
                    <span />
                    <Botao variante="quiet" tamanho="sm" className="pb-acao-obra" onClick={() => void pedirPrevia({ tipo: "obra", chave: o.chave }, o.rotulo, `a obra ${o.rotulo}`)}>
                      Expurgar obra
                    </Botao>
                  </div>
                  {o.conversas.map((c) => (
                    <div key={c.id} className={`adm-linha pb-conversa${marcadas.has(c.id) ? " pb-pessoa--marcada" : ""}`}>
                      <span>
                        <input
                          type="checkbox"
                          className="pb-check"
                          checked={marcadas.has(c.id)}
                          onChange={() =>
                            setMarcadas((m) => {
                              const n = new Set(m);
                              if (n.has(c.id)) n.delete(c.id);
                              else n.add(c.id);
                              return n;
                            })
                          }
                          aria-label={`Selecionar ${c.title}`}
                        />
                      </span>
                      <span>{c.title}</span>
                      <span className="adm-fraco">{c.tipo ? (ROTULO_DO_TIPO[c.tipo] ?? c.tipo) : "sem trabalho registrado"}</span>
                      <span className="mp-mono adm-fraco">{c.userEmail}</span>
                      <span className="ds-num adm-fraco din-direita">{quandoCurto(c.atualizadaEm)}</span>
                    </div>
                  ))}
                </Fragment>
              );
            })}
          </div>
          <div className="pb-rodape-acoes">
            <Botao variante="ghost" tamanho="sm" disabled={marcadas.size === 0} onClick={() => void pedirPrevia({ tipo: "selecao", ids: [...marcadas] }, "a seleção", plural(marcadas.size, "conversa selecionada", "conversas selecionadas"))}>
              Expurgar seleção{marcadas.size ? ` (${marcadas.size})` : ""}
            </Botao>
            {/* "Zerar tudo" no canto oposto do gesto de todo dia: o único cujo acidente não se conserta */}
            <Botao variante="quiet" tamanho="sm" className="pb-zerar" onClick={() => void pedirPrevia({ tipo: "tudo" }, "tudo", "tudo")}>
              Zerar tudo
            </Botao>
          </div>
        </>
      )}
    </section>
  );
}

/* ------------------------- histórico de auditorias ------------------------- */

type Auditoria = {
  id: string;
  title: string;
  projectName: string;
  auditMode: string;
  analysisLevel: string;
  status: string;
  totalFindings: number;
  elapsedMs: number | null;
  createdAt: string;
  user: { email: string } | null;
  files: Array<{ id: string; fileName: string }>;
};
const ehAuditorias = (c: unknown): c is { audits: Auditoria[] } => Array.isArray((c as { audits?: unknown } | null)?.audits);
const PALAVRA_DO_STATUS: Record<string, string> = { COMPLETED: "Concluída", PROCESSING: "Processando", FAILED: "Falha", CANCELED: "Cancelada" };
const CLASSE_DO_STATUS: Record<string, string> = { COMPLETED: "mot-estado--pronto", FAILED: "mot-estado--sem-chave", PROCESSING: "mot-estado--reservado" };
const tempoDe = (ms: number | null) => {
  if (ms === null) return "—";
  const s = Math.max(1, Math.round(ms / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
};
const NIVEL: Record<string, string> = { standard: "Padrão", deep: "Profundo", padrao: "Padrão", profundo: "Profundo" };

export function HistoricoDeAuditorias() {
  const carga = useCarga("/api/admin/audits", ehAuditorias);
  const { token, restaurado, recarga, carregar } = carga;
  // o filtro pode vir na URL: o número "Falhas" do Cockpit abre /admin/dados?status=FAILED
  const vindo = useSearchParams().get("status")?.trim();
  const [filtros, setFiltros] = useState({ q: "", status: vindo || "all", modo: "all", usuario: "" });
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState("");
  const consulta = useMemo(() => {
    const p = new URLSearchParams();
    if (filtros.q) p.set("q", filtros.q);
    if (filtros.status !== "all") p.set("status", filtros.status);
    if (filtros.modo !== "all") p.set("mode", filtros.modo);
    if (filtros.usuario) p.set("user", filtros.usuario);
    return p.toString();
  }, [filtros]);

  useEffect(() => {
    if (!restaurado || !token.trim()) return;
    queueMicrotask(() => void carregar(token, consulta));
  }, [restaurado, token, recarga, carregar, consulta]);

  const auditorias = carga.dados?.audits ?? [];
  async function excluir() {
    setErro("");
    try {
      const r = await fetch("/api/admin/audits", { method: "DELETE", headers: { Authorization: `Bearer ${token.trim()}`, "Content-Type": "application/json" }, body: JSON.stringify({ ids: [...marcadas] }) });
      const corpo = (await r.json().catch(() => null)) as { deleted?: number; error?: string } | null;
      if (!r.ok) throw new Error(corpo?.error ?? "Não foi possível excluir as auditorias.");
      setMarcadas(new Set());
      setConfirmando(false);
      await carregar(token, consulta);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível excluir as auditorias.");
      setConfirmando(false);
    }
  }
  const todas = auditorias.length > 0 && auditorias.every((a) => marcadas.has(a.id));

  return (
    <section className="adm-bloco" aria-labelledby="pb-aud">
      <header>
        <h2 id="pb-aud">Histórico de auditorias</h2>
        {carga.dados && <span className="adm-fraco">{plural(auditorias.length, "auditoria", "auditorias")}</span>}
      </header>
      <p className="din-lede">Acompanhe auditorias persistidas e filtre por projeto, status, modo e responsável.</p>
      <form
        className="pb-linha-form pb-filtros"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const v = (n: string) => String(f.get(n) ?? "").trim();
          setFiltros({ q: v("q"), status: v("status") || "all", modo: v("modo") || "all", usuario: v("usuario") });
        }}
      >
        <label className="pb-busca">
          <Search size={14} aria-hidden />
          <input name="q" defaultValue={filtros.q} placeholder="Buscar projeto, título ou arquivo" aria-label="Buscar auditoria" />
        </label>
        <select name="status" className="pb-campo pb-select" aria-label="Status" defaultValue={filtros.status}>
          <option value="all">Todos status</option>
          <option value="COMPLETED">Concluídas</option>
          <option value="PROCESSING">Processando</option>
          <option value="FAILED">Falhas</option>
          <option value="CANCELED">Canceladas</option>
        </select>
        <select name="modo" className="pb-campo pb-select" aria-label="Modo" defaultValue={filtros.modo}>
          <option value="all">Todos modos</option>
          <option value="memorial">Memorial</option>
          <option value="volume">Volume</option>
        </select>
        <input name="usuario" defaultValue={filtros.usuario} className="pb-campo" placeholder="Usuário" aria-label="Usuário" />
        <Botao variante="ghost" tamanho="sm" type="submit">
          Filtrar
        </Botao>
        <Botao variante="quiet" tamanho="sm" className="pb-perigo-texto" disabled={marcadas.size === 0} onClick={() => setConfirmando(true)}>
          <Trash2 size={13} /> Excluir permanentemente
        </Botao>
      </form>
      <ConfirmaExclusao
        texto={confirmando ? `Excluir permanentemente ${plural(marcadas.size, "auditoria selecionada", "auditorias selecionadas")}? Remove os arquivos e os feedbacks vinculados.` : null}
        feito="Excluídas"
        onCancelar={() => setConfirmando(false)}
        onConfirmar={() => void excluir()}
      />
      <div className="pb-avisos-da-secao">
        <AvisoDaCarga fase={carga.fase} erro={carga.erro?.tipo} detalhe={carga.erro?.detalhe} oque="as auditorias" atualizadoEm={carga.carregadoEm} onTentar={() => void carregar(token, consulta)} />
        {erro && <p className="din-erro-linha">{erro}</p>}
      </div>
      {carga.dados && (
        <div className="adm-tabela pb-auditorias">
          <div className="adm-linha din-cab">
            <span>
              <input type="checkbox" className="pb-check" checked={todas} onChange={() => setMarcadas(todas ? new Set() : new Set(auditorias.map((a) => a.id)))} aria-label="Selecionar todas as auditorias listadas" />
            </span>
            <span>Auditoria</span>
            <span>Projeto</span>
            <span>Status</span>
            <span>Modo</span>
            <span>Nível</span>
            <span className="din-direita">PDFs</span>
            <span className="din-direita">Achados</span>
            <span className="din-direita">Tempo</span>
            <span>Usuário</span>
            <span>Criada em</span>
          </div>
          {auditorias.map((a) => (
            <div key={a.id} className={`adm-linha${marcadas.has(a.id) ? " pb-pessoa--marcada" : ""}`}>
              <span>
                <input
                  type="checkbox"
                  className="pb-check"
                  checked={marcadas.has(a.id)}
                  onChange={() =>
                    setMarcadas((m) => {
                      const n = new Set(m);
                      if (n.has(a.id)) n.delete(a.id);
                      else n.add(a.id);
                      return n;
                    })
                  }
                  aria-label={`Selecionar ${a.title}`}
                />
              </span>
              <span className="pb-corta" title={a.files.map((f) => f.fileName).join(", ")}>
                {a.title}
              </span>
              <span className="adm-fraco pb-corta">{a.projectName}</span>
              <span className={`mot-estado ${CLASSE_DO_STATUS[a.status] ?? "mot-estado--nada"}`}>
                <i aria-hidden />
                {PALAVRA_DO_STATUS[a.status] ?? a.status}
              </span>
              <span className="adm-fraco">{a.auditMode}</span>
              <span className="adm-fraco">{NIVEL[a.analysisLevel] ?? a.analysisLevel}</span>
              <span className="ds-num din-direita adm-fraco">{a.files.length}</span>
              <span className="ds-num din-direita">{a.totalFindings}</span>
              <span className="ds-num din-direita adm-fraco">{tempoDe(a.elapsedMs)}</span>
              <span className="mp-mono adm-fraco pb-corta">{a.user?.email ?? "não vinculado"}</span>
              <span className="ds-num adm-fraco">{quandoCurto(a.createdAt)}</span>
            </div>
          ))}
          {!auditorias.length && <p className="adm-vazio">Nenhuma auditoria com esses filtros.</p>}
        </div>
      )}
    </section>
  );
}

/* ----------------------------- operação de LDs ----------------------------- */

type Ld = { id: string; title: string; projectCode: string; workName: string; userEmail: string; status: "DRAFT" | "GENERATED" | "ARCHIVED"; rowCount: number; tomoCount: number; uploadedFileCount: number; eventCount: number; updatedAt: string };
const ehLds = (c: unknown): c is { lds: Ld[] } => Array.isArray((c as { lds?: unknown } | null)?.lds);
const PALAVRA_DA_LD: Record<Ld["status"], string> = { DRAFT: "Rascunho", GENERATED: "Gerada", ARCHIVED: "Arquivada" };

export function OperacaoDeLds() {
  const carga = useCarga("/api/admin/lds", ehLds);
  const { token, restaurado, recarga, carregar } = carga;
  const [filtros, setFiltros] = useState({ q: "", status: "all" });
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState("");
  const consulta = useMemo(() => {
    const p = new URLSearchParams();
    if (filtros.q) p.set("q", filtros.q);
    if (filtros.status !== "all") p.set("status", filtros.status);
    return p.toString();
  }, [filtros]);

  useEffect(() => {
    if (!restaurado || !token.trim()) return;
    queueMicrotask(() => void carregar(token, consulta));
  }, [restaurado, token, recarga, carregar, consulta]);

  const lds = carga.dados?.lds ?? [];
  const maxPranchas = Math.max(1, ...lds.map((l) => l.rowCount));
  async function excluir() {
    setErro("");
    try {
      const r = await fetch("/api/admin/lds", { method: "DELETE", headers: { Authorization: `Bearer ${token.trim()}`, "Content-Type": "application/json" }, body: JSON.stringify({ ids: [...marcadas] }) });
      const corpo = (await r.json().catch(() => null)) as { deleted?: number; error?: string } | null;
      if (!r.ok) throw new Error(corpo?.error ?? "Não foi possível excluir as LDs.");
      setMarcadas(new Set());
      setConfirmando(false);
      await carregar(token, consulta);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível excluir as LDs.");
      setConfirmando(false);
    }
  }
  const todas = lds.length > 0 && lds.every((l) => marcadas.has(l.id));

  return (
    <section className="adm-bloco" aria-labelledby="pb-ld">
      <header>
        <h2 id="pb-ld">Operação de LDs</h2>
        {carga.dados && <span className="adm-fraco">{plural(lds.length, "LD", "LDs")}</span>}
      </header>
      <p className="din-lede">As LDs geradas, por usuário — é o registro do servidor, o mesmo que o Nexo alimenta. PDFs anexados não são armazenados.</p>
      <form
        className="pb-linha-form pb-filtros"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setFiltros({ q: String(f.get("q") ?? "").trim(), status: String(f.get("status") ?? "all") });
        }}
      >
        <label className="pb-busca">
          <Search size={14} aria-hidden />
          <input name="q" placeholder="Código, obra ou usuário" aria-label="Buscar LD" />
        </label>
        <select name="status" className="pb-campo pb-select" aria-label="Status" defaultValue="all">
          <option value="all">Todos status</option>
          <option value="DRAFT">Rascunho</option>
          <option value="GENERATED">Gerada</option>
          <option value="ARCHIVED">Arquivada</option>
        </select>
        <Botao variante="ghost" tamanho="sm" type="submit">
          Filtrar
        </Botao>
        <Botao variante="quiet" tamanho="sm" className="pb-perigo-texto" disabled={marcadas.size === 0} onClick={() => setConfirmando(true)}>
          <Trash2 size={13} /> Excluir permanentemente
        </Botao>
      </form>
      <ConfirmaExclusao
        texto={confirmando ? `Excluir permanentemente ${plural(marcadas.size, "LD selecionada", "LDs selecionadas")}? Remove todos os eventos vinculados.` : null}
        feito="Excluídas"
        onCancelar={() => setConfirmando(false)}
        onConfirmar={() => void excluir()}
      />
      <div className="pb-avisos-da-secao">
        <AvisoDaCarga fase={carga.fase} erro={carga.erro?.tipo} detalhe={carga.erro?.detalhe} oque="as LDs" atualizadoEm={carga.carregadoEm} onTentar={() => void carregar(token, consulta)} />
        {erro && <p className="din-erro-linha">{erro}</p>}
      </div>
      {carga.dados && (
        <div className="adm-tabela pb-lds">
          <div className="adm-linha din-cab">
            <span>
              <input type="checkbox" className="pb-check" checked={todas} onChange={() => setMarcadas(todas ? new Set() : new Set(lds.map((l) => l.id)))} aria-label="Selecionar todas as LDs listadas" />
            </span>
            <span>Projeto / obra</span>
            <span>Status</span>
            <span>Usuário</span>
            <span className="din-direita">Pranchas</span>
            <span className="din-direita">PDFs</span>
            <span className="din-direita">Tomos</span>
            <span className="din-direita">Eventos</span>
            <span>Atualizada</span>
          </div>
          {lds.map((l) => (
            <div key={l.id} className={`adm-linha${marcadas.has(l.id) ? " pb-pessoa--marcada" : ""}`}>
              <span>
                <input
                  type="checkbox"
                  className="pb-check"
                  checked={marcadas.has(l.id)}
                  onChange={() =>
                    setMarcadas((m) => {
                      const n = new Set(m);
                      if (n.has(l.id)) n.delete(l.id);
                      else n.add(l.id);
                      return n;
                    })
                  }
                  aria-label={`Selecionar LD ${l.projectCode || l.title}`}
                />
              </span>
              <span className="adm-tit">
                <b className="mp-mono">{l.projectCode || l.title || "sem código"}</b>
                <small>{l.workName || "Obra não preenchida"}</small>
              </span>
              <span className={`mot-estado ${l.status === "GENERATED" ? "mot-estado--pronto" : "mot-estado--nada"}`}>
                <i aria-hidden />
                {PALAVRA_DA_LD[l.status]}
              </span>
              <span className="mp-mono adm-fraco pb-corta">{l.userEmail}</span>
              <span className="pb-aud din-direita">
                <BarraEmbutida valor={l.rowCount} maximo={maxPranchas} />
                <b className="ds-num">{l.rowCount}</b>
              </span>
              <span className="ds-num din-direita adm-fraco">{l.uploadedFileCount}</span>
              <span className="ds-num din-direita adm-fraco">{l.tomoCount}</span>
              <span className="ds-num din-direita adm-fraco">{l.eventCount}</span>
              <span className="ds-num adm-fraco">{quandoCurto(l.updatedAt)}</span>
            </div>
          ))}
          {!lds.length && <p className="adm-vazio">Nenhuma LD com esses filtros.</p>}
        </div>
      )}
    </section>
  );
}
