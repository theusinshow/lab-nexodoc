"use client";

/**
 * A FILA DE ACHADOS (desenho do lab: resultado-e/fila.tsx), com os dados e as
 * ações de verdade (use-parecer-vivo.ts). À esquerda a lista — busca, situação,
 * filtros, agrupamento, seleção para atribuir —; à direita o achado aberto, com
 * "Ver no memorial" em destaque e a barra de encerrar sempre à vista.
 *
 * Teclas: J K andam, M abre no memorial, C corrigido, D decisão técnica,
 * F falso positivo, Z desfaz, / busca, Esc fecha o que estiver aberto.
 */
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, ChevronUp, FileSearch, Link2, Mail, Search, SlidersHorizontal, Undo2, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Avatar, Botao, Menu, Segmento, Selo, Seletor, Tecla } from "@/components/ds/basicos";
import { BotaoDoGrupo, GrupoDeBotoes } from "@/components/ds/micro";
import { CartaoDoMotor } from "@/components/achado/cartao-do-motor";
import { ConversaDoAchado } from "@/components/achado/conversa-do-achado";
import { OQueFazer } from "@/components/achado/o-que-fazer";
import { getHighlightNeedle } from "@/components/audit-result";
import { findingCard } from "@/lib/audit-engine/finding-card";
import { getErrorTypeLabel, type FindingDiscipline, type FindingErrorType } from "@/lib/audit-report";
import type { Desfecho } from "@/lib/desfecho-do-achado";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";
import { resolverFonte, type FonteDoCatalogo } from "@/lib/fonte-da-evidencia";
import { formatarEmBrasilia } from "@/lib/fuso-de-brasilia";
import { linkDoAchado } from "@/lib/link-do-achado";
import { paginasEmConflito, trechosDaEvidencia } from "@/lib/trechos-da-evidencia";
import { DISCIPLINAS, NIVEIS, type Nivel } from "@/lib/nivel-do-achado";
import type { TextoCorrigido } from "@/lib/texto-corrigido";

import { SeloDaDisciplina } from "../comum/disciplina";
import { NOME_DO_DESFECHO, conta } from "./textos";
import type { AchadoDaTela, ParecerVivo } from "./use-parecer-vivo";
import "./enxuta.css";
import "./filtros.css";

type Filtro = "todos" | "meus" | "sem" | "pendentes" | "corrigidos" | "encerrados";
type Ordem = "impacto" | "pagina" | "disciplina" | "referencia";
type Agrupar = "impacto" | "disciplina";
type Aba = "evidencia" | "conversa" | "historico";

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];
const iniciais = (nome: string) =>
  nome
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "?";
const quando = (iso?: string | null) => (iso ? formatarEmBrasilia(iso, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "");

/** O trecho com o grifo, como no lab: a parte que importa marcada. */
/** Copia para a área de transferência; sem a API (contexto inseguro), o caminho antigo. */
async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const campo = document.createElement("textarea");
    campo.value = texto;
    campo.style.position = "fixed";
    campo.style.opacity = "0";
    document.body.appendChild(campo);
    campo.select();
    const ok = document.execCommand("copy");
    campo.remove();
    return ok;
  }
}

/*
 * O GRIFO COPIA (05/10/2026, retorno de um usuário): o trecho em roxo é
 * exatamente o que se procura no arquivo editável. Um clique copia, e o "Copiado"
 * confirma — dali é Ctrl+F no Writer e colar.
 */
function Trecho({ texto, marca }: { texto: string; marca?: string }) {
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 1800);
    return () => clearTimeout(t);
  }, [copiado]);

  const i = marca ? texto.toLowerCase().indexOf(marca.toLowerCase()) : -1;
  if (!marca || i < 0) return <>{texto}</>;
  const grifado = texto.slice(i, i + marca.length);
  const copiar = async () => setCopiado(await copiarTexto(grifado.trim()));
  return (
    <>
      {texto.slice(0, i)}
      <mark
        className="rs-grifo-copiavel"
        role="button"
        tabIndex={0}
        title="Clique para copiar — e procure com Ctrl+F no arquivo editável"
        onClick={() => void copiar()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            void copiar();
          }
        }}
      >
        {grifado}
      </mark>
      {copiado && (
        <span className="rs-copiado" role="status">
          <Check size={11} aria-hidden /> Copiado — cole no Ctrl+F
        </span>
      )}
      {texto.slice(i + marca.length)}
    </>
  );
}

export function FilaDeAchados({
  parecer,
  auditId,
  catalogo,
  inicial,
  nivelInicial,
  filtroInicial,
  onVerNoMemorial,
  aoGerarTexto,
}: {
  /** Abre já filtrada num nível (o clique no nível do resumo completo). */
  nivelInicial?: Nivel | null;
  /** Abre num filtro ("meus": o link do e-mail leva ao que é da pessoa). */
  filtroInicial?: "meus" | null;
  parecer: ParecerVivo;
  auditId?: string | null;
  catalogo: FonteDoCatalogo[];
  /** O achado que abre primeiro (link do e-mail, clique no resumo). */
  inicial?: string | null;
  /** `pagina` abre o visor nela — o trecho 2 de um achado entre páginas. */
  onVerNoMemorial: (chave: string, pagina?: number) => void;
  aoGerarTexto?: (findingId: string, texto: TextoCorrigido) => void;
}) {
  const { dur, mola } = useTempo();
  const confirmados = useMemo(() => parecer.achados.filter((a) => a.confirmado), [parecer.achados]);
  const sugestoes = useMemo(() => parecer.achados.filter((a) => !a.confirmado), [parecer.achados]);
  const todos = parecer.achados;

  const [filtro, setFiltro] = useState<Filtro>(filtroInicial ?? "todos");
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<string | null>(inicial ?? null);
  /*
   * ABERTA NUM FILTRO (o link do e-mail abre em "Meus"), o detalhe acompanha a
   * LISTA até a pessoa escolher um achado: o foco que veio no pedido pode não
   * ser dela, e o detalhe mostraria um achado que a lista filtrada nem lista. Os
   * responsáveis chegam do servidor depois que a fila monta — por isso é regra
   * de exibição, e não estado inicial.
   */
  const [escolheu, setEscolheu] = useState(false);
  const [direcao, setDirecao] = useState(1);
  const [decisao, setDecisao] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [marcados, setMarcados] = useState<string[]>([]);
  const [aba, setAba] = useState<Aba>("evidencia");
  const [ultimo, setUltimo] = useState<string | null>(null);
  const [niveis, setNiveis] = useState<Nivel[]>(nivelInicial ? [nivelInicial] : []);
  const [discs, setDiscs] = useState<FindingDiscipline[]>([]);
  const [tipos, setTipos] = useState<FindingErrorType[]>([]);
  const [responsavel, setResponsavel] = useState("qualquer");
  const [ordem, setOrdem] = useState<Ordem>("impacto");
  const [agrupar, setAgrupar] = useState<Agrupar>("impacto");
  const [painel, setPainel] = useState(false);
  const [verSugestoes, setVerSugestoes] = useState(false);
  const [faltou, setFaltou] = useState<string | null>(null);
  const [confirmandoAviso, setConfirmandoAviso] = useState(false);
  const [rascunhos, setRascunhos] = useState<Record<string, string>>({});
  const buscaRef = useRef<HTMLInputElement>(null);

  const nFiltros = niveis.length + discs.length + tipos.length + (responsavel !== "qualquer" ? 1 : 0);
  const limparFiltros = () => {
    setNiveis([]);
    setDiscs([]);
    setTipos([]);
    setResponsavel("qualquer");
  };
  const alternarEm = <T,>(lista: T[], set: (v: T[]) => void, v: T) => set(lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);

  const discsPresentes = DISCIPLINAS.map((d) => ({ ...d, n: confirmados.filter((a) => a.disc === d.id).length }))
    .filter((d) => d.n)
    .sort((a, b) => b.n - a.n);
  const tiposPresentes = [...new Set(confirmados.map((a) => a.estruturado.tipoErro).filter((t): t is FindingErrorType => Boolean(t)))].map((t) => ({
    id: t,
    nome: getErrorTypeLabel(t),
    n: confirmados.filter((a) => a.estruturado.tipoErro === t).length,
  }));
  const pessoas = [...new Map(confirmados.filter((a) => a.responsavel).map((a) => [a.responsavel!.email, a.responsavel!])).values()];

  const contagem: Record<Filtro, number> = {
    todos: confirmados.length,
    meus: confirmados.filter((a) => a.responsavel?.souEu && !a.desfecho).length,
    sem: confirmados.filter((a) => !a.responsavel && !a.desfecho).length,
    pendentes: confirmados.filter((a) => !a.desfecho).length,
    // Só o corrigido no documento; "Encerrados" junta também falso positivo e decisão técnica.
    corrigidos: confirmados.filter((a) => a.desfecho?.tipo === "FIXED_IN_DOC").length,
    encerrados: confirmados.filter((a) => a.desfecho).length,
  };

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const pos = (a: AchadoDaTela) => NIVEIS.findIndex((n) => n.id === a.nivel);
    const chave: Record<Ordem, (a: AchadoDaTela) => number | string> = {
      impacto: (a) => pos(a) * 100000 + (a.paginas[0] ?? 9999),
      pagina: (a) => a.paginas[0] ?? 99999,
      disciplina: (a) => DISCIPLINAS.findIndex((d) => d.id === a.disc) * 1000 + pos(a),
      referencia: (a) => a.id,
    };
    const cmp = (x: AchadoDaTela, y: AchadoDaTela) => {
      const a = chave[ordem](x);
      const b = chave[ordem](y);
      return a < b ? -1 : a > b ? 1 : 0;
    };
    return [...confirmados].sort(cmp).filter((a) => {
      if (niveis.length && !niveis.includes(a.nivel)) return false;
      if (discs.length && !discs.includes(a.disc)) return false;
      if (tipos.length && !(a.estruturado.tipoErro && tipos.includes(a.estruturado.tipoErro))) return false;
      if (responsavel !== "qualquer" && a.responsavel?.email !== responsavel) return false;
      if (filtro === "meus" && !(a.responsavel?.souEu && !a.desfecho)) return false;
      if (filtro === "sem" && !(!a.responsavel && !a.desfecho)) return false;
      if (filtro === "pendentes" && a.desfecho) return false;
      if (filtro === "corrigidos" && a.desfecho?.tipo !== "FIXED_IN_DOC") return false;
      if (filtro === "encerrados" && !a.desfecho) return false;
      if (!q) return true;
      const disc = DISCIPLINAS.find((d) => d.id === a.disc)?.nome ?? "";
      return [a.id, a.chave, a.titulo, disc, a.pagina ? `p. ${a.pagina}` : "", a.bruto.evidencia ?? "", a.bruto.descricao ?? ""].some((t) => t.toLowerCase().includes(q));
    });
  }, [confirmados, filtro, busca, niveis, discs, tipos, responsavel, ordem]);

  const grupos =
    agrupar === "impacto"
      ? NIVEIS.map((n) => ({ id: n.id as string, nome: n.nome, marca: <i className={`rs-ponto rs-ponto--${n.id}`} />, itens: visiveis.filter((a) => a.nivel === n.id) }))
      : DISCIPLINAS.map((d) => ({ id: d.id as string, nome: d.nome, marca: <i className={`dc-ponto dc--${d.id}`} />, itens: visiveis.filter((a) => a.disc === d.id) }));

  /*
   * MEUS CORRIGIDOS (05/10/2026, retorno de um colega): o corrigido saía do
   * "Meus" no instante em que era marcado, e quem trabalhou perdia de vista o
   * que já fez. Em "Meus" eles ficam num grupo próprio, abaixo dos pendentes.
   * "Meu" = estava comigo OU fui eu que marquei (ver `AchadoDaTela.meu`).
   */
  const meusCorrigidos = useMemo(() => {
    if (filtro !== "meus") return [];
    const q = busca.trim().toLowerCase();
    return confirmados
      .filter((a) => a.meu && a.desfecho?.tipo === "FIXED_IN_DOC")
      .filter((a) => !q || [a.id, a.chave, a.titulo, a.bruto.evidencia ?? ""].some((t) => t.toLowerCase().includes(q)))
      .sort((x, y) => String(y.desfecho?.quando ?? "").localeCompare(String(x.desfecho?.quando ?? "")));
  }, [filtro, busca, confirmados]);

  const doFoco = todos.find((a) => a.chave === selecionado);
  const focoVisivel = doFoco && [...visiveis, ...meusCorrigidos].some((a) => a.chave === doFoco.chave);
  const primeiroDaLista = visiveis[0] ?? meusCorrigidos[0];
  const atual = (filtroInicial && !escolheu && !focoVisivel ? primeiroDaLista : doFoco) ?? primeiroDaLista ?? confirmados[0] ?? todos[0];
  const posicao = atual ? visiveis.findIndex((a) => a.chave === atual.chave) : -1;
  const temArquivo = (a: AchadoDaTela) => resolverFonte({ arquivo: a.estruturado.documento }, catalogo).tipo === "arquivo";

  const abrir = (chave: string, passo = 1) => {
    setDirecao(passo);
    setSelecionado(chave);
    setEscolheu(true);
    setDecisao(false);
    setMotivo("");
    setAba("evidencia");
  };
  const ir = (passo: number) => {
    if (!visiveis.length) return;
    const i = posicao < 0 ? 0 : (posicao + passo + visiveis.length) % visiveis.length;
    abrir(visiveis[i]!.chave, passo);
  };
  const encerrar = async (tipo: Desfecho, nota?: string) => {
    if (!atual || atual.desfecho) return;
    const ok = await parecer.encerrar(atual, tipo, nota);
    if (ok) {
      setUltimo(atual.chave);
      setDecisao(false);
      setMotivo("");
    }
  };
  const desfazer = () => {
    const a = todos.find((x) => x.chave === ultimo);
    if (a) void parecer.reabrir(a);
    setUltimo(null);
  };

  useEffect(() => {
    if (!ultimo) return;
    const t = setTimeout(() => setUltimo(null), 6000);
    return () => clearTimeout(t);
  }, [ultimo]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (alvo.closest("[role='dialog']")) return;
      const digitando = alvo.closest("input, textarea, select, [contenteditable='true']");
      if (e.key === "Escape") {
        if (decisao) {
          e.preventDefault();
          setDecisao(false);
        } else if (marcados.length) {
          e.preventDefault();
          setMarcados([]);
        } else if (digitando && busca) {
          e.preventDefault();
          setBusca("");
        }
        return;
      }
      if (digitando || e.ctrlKey || e.metaKey || e.altKey || !atual) return;
      const k = e.key.toLowerCase();
      if (k === "j") ir(1);
      else if (k === "k") ir(-1);
      else if (k === "m" && temArquivo(atual)) onVerNoMemorial(atual.chave);
      else if (k === "/") {
        e.preventDefault();
        buscaRef.current?.focus();
      } else if (!atual.desfecho && k === "c") void encerrar("FIXED_IN_DOC");
      else if (!atual.desfecho && k === "f") void encerrar("FALSE_POSITIVE");
      else if (!atual.desfecho && k === "d") {
        e.preventDefault();
        setDecisao(true);
      } else if (k === "z" && ultimo) desfazer();
    };
    document.addEventListener("keydown", tecla, true);
    return () => document.removeEventListener("keydown", tecla, true);
  });

  const alternar = (chave: string) => setMarcados((m) => (m.includes(chave) ? m.filter((x) => x !== chave) : [...m, chave]));
  const opcoesDePessoas = parecer.membros.map((m) => ({ rotulo: m.name ? `${m.name}${m.status === "INVITED" ? " (convidado)" : ""}` : m.email, valor: m.email }));

  async function copiarLink(a: AchadoDaTela) {
    if (!auditId) return;
    const link = linkDoAchado({ base: window.location.origin, auditId, findingId: a.chave });
    try {
      await navigator.clipboard.writeText(link);
      parecer.setAviso({ tom: "ok", texto: "Link do achado copiado." });
    } catch {
      parecer.setAviso({ tom: "falha", texto: `Não deu para copiar. O link é: ${link}` });
    }
  }

  const linhaDaLista = (a: AchadoDaTela, sugestao = false) => {
    const ativo = a.chave === atual?.chave;
    const marcado = marcados.includes(a.chave);
    return (
      <div key={a.chave} className={`rs-linha${ativo ? " rs-linha--ativa" : ""}${a.desfecho ? " rs-linha--encerrada" : ""}${a.desfecho?.tipo === "FIXED_IN_DOC" ? " rs-linha--corrigida" : ""}${marcados.length ? " rs-linha--selecionando" : ""}`}>
        {ativo && <motion.span layoutId="rs-linha-ativa" className="rs-linha-fundo" transition={mola("snappy")} />}
        <button type="button" role="checkbox" aria-checked={marcado} aria-label={`Selecionar ${a.id} para atribuir`} className="rs-marcar" disabled={Boolean(a.desfecho) || sugestao} onClick={() => alternar(a.chave)}>
          <AnimatePresence>
            {marcado && (
              <motion.svg viewBox="0 0 16 16" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.path d="M4 8.5 L7 11 L12 5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: dur("state") }} />
              </motion.svg>
            )}
          </AnimatePresence>
        </button>
        <button
          type="button"
          className="rs-linha-corpo"
          onClick={() => {
            abrir(a.chave, visiveis.indexOf(a) > posicao ? 1 : -1);
            /*
             * O CLIQUE ABRE O PDF, já no trecho (05/10/2026, retorno de um
             * usuário): quem clica num achado quer ver onde ele está. J/K e as
             * setas continuam só andando na lista, para triagem pelo teclado.
             */
            if (temArquivo(a)) onVerNoMemorial(a.chave);
          }}
        >
          <span className="rs-linha-id">{a.id}</span>
          <span className="rs-linha-titulo">{a.titulo}</span>
          <span className="rs-linha-meta">
            {a.desfecho ? (
              <span className="rs-linha-desfecho">
                <Check size={12} /> {NOME_DO_DESFECHO[a.desfecho.tipo]}
              </span>
            ) : (
              <>
                {agrupar === "disciplina" ? <i className={`rs-ponto rs-ponto--${a.nivel}`} title={NIVEIS.find((n) => n.id === a.nivel)?.nome} /> : <SeloDaDisciplina disc={a.disc} />}
                {a.comentarios > 0 && <span className="rs-linha-conversa ds-num" title={conta(a.comentarios, "comentário", "comentários")}>{a.comentarios}</span>}
                {a.responsavel ? <Avatar iniciais={iniciais(a.responsavel.nome)} pequeno /> : <span className="rs-sem-dono">sem dono</span>}
              </>
            )}
          </span>
        </button>
      </div>
    );
  };

  if (!atual) {
    return (
      <div className="rs-fila rs-fila--vazia">
        <p className="rs-vazio">
          <b>Nenhum achado nesta auditoria.</b>
          <span>O escopo analisado não mostrou problema. Se faltou apontar algo, conte abaixo.</span>
        </p>
      </div>
    );
  }

  const fonteAtual = resolverFonte({ arquivo: atual.estruturado.documento }, catalogo);
  const grifo = getHighlightNeedle(atual.estruturado);
  const paginaDoTitulo = atual.paginas.length ? (atual.paginas.length === 1 ? `p. ${atual.paginas[0]}` : `p. ${atual.paginas[0]} e mais ${atual.paginas.length - 1}`) : "";
  const linha = atual.linha;
  /*
   * O ACHADO ENTRE PÁGINAS. A regra grava "Pág. 10: … | Pág. 22: …" numa string
   * só, e o cartão a mostrava num bloco — quem lia não via que o defeito é a
   * DIVERGÊNCIA entre duas folhas (05/10/2026). Com dois trechos ou mais, o
   * cartão diz "Conflito entre p. 10 e p. 22" e mostra um trecho por página.
   */
  const trechos = trechosDaEvidencia(atual.bruto.evidencia);
  const emConflito = paginasEmConflito(atual.bruto.evidencia);
  const entrePaginas = emConflito.length >= 2;
  /*
   * VÁRIAS PÁGINAS SEM TRECHO POR PÁGINA (05/10/2026): o achado da IA cita
   * "pág. 10" e "pág. 22" no conflito, mas a evidência vem num bloco só. O
   * cartão diz quais páginas o defeito envolve e dá um "Abrir p. N" para cada;
   * no visor, cada página procura o pedaço da evidência que está nela.
   */
  const variasPaginas = !entrePaginas && atual.paginas.length >= 2;
  // Em ordem de leitura na exibição; `atual.paginas[0]` continua sendo a principal (pin, visor).
  const paginasEmOrdem = [...atual.paginas].sort((x, y) => x - y);

  return (
    <div className="rs-fila">
      {/* ================= a lista ================= */}
      <section className="rs-lista" aria-label="Fila de achados">
        <div className="rs-lista-topo">
          <label className="rs-busca">
            <Search size={14} />
            <input ref={buscaRef} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por texto, referência ou página" />
            {busca ? (
              <button type="button" aria-label="Limpar a busca" onClick={() => setBusca("")}>
                <X size={13} />
              </button>
            ) : (
              <Tecla>/</Tecla>
            )}
          </label>
          <Segmento
            rotulo="Mostrar"
            valor={filtro}
            onTroca={setFiltro}
            opcoes={[
              { valor: "todos", rotulo: <>Todos <em>{contagem.todos}</em></> },
              { valor: "meus", rotulo: <>Meus <em>{contagem.meus}</em></> },
              { valor: "sem", rotulo: <>Sem dono <em>{contagem.sem}</em></> },
              { valor: "pendentes", rotulo: <>Pendentes <em>{contagem.pendentes}</em></> },
              { valor: "corrigidos", rotulo: <>Corrigidos <em>{contagem.corrigidos}</em></> },
              { valor: "encerrados", rotulo: <>Encerrados <em>{contagem.encerrados}</em></> },
            ]}
          />
          {/*
            NOTIFICAR POR E-MAIL — o gesto que fecha a distribuição. Atribuir não
            manda e-mail (seriam cinco avisos em dez minutos para a mesma pessoa);
            este manda UM por pessoa, do que é dela. Só existe com alguém a avisar,
            e abre uma confirmação antes: e-mail não tem desfazer.
          */}
          {parecer.aAvisar.length > 0 && (
            <div className="rs-notificar">
              <button type="button" className="rs-notificar-barra" aria-expanded={confirmandoAviso} onClick={() => setConfirmandoAviso((v) => !v)}>
                <Mail size={14} />
                <span>
                  {conta(parecer.aAvisar.length, "pessoa espera", "pessoas esperam")} aviso por e-mail
                </span>
                <b>Notificar por e-mail</b>
              </button>
              {confirmandoAviso && (
                <div className="rs-notificar-painel">
                  <ul>
                    {parecer.aAvisar.map((p) => (
                      <li key={p.email}>
                        <span>
                          {p.nome}
                          {p.convidado && <em> convidado, ainda não entrou</em>}
                        </span>
                        <span className="ds-num">{conta(p.quantidade, "achado", "achados")}</span>
                      </li>
                    ))}
                  </ul>
                  <p>O e-mail leva a contagem, o projeto e o link para o achado. O conteúdo dos achados não sai do sistema.</p>
                  <span className="rs-notificar-acoes">
                    <Botao variante="quiet" tamanho="sm" onClick={() => setConfirmandoAviso(false)}>
                      Cancelar
                    </Botao>
                    <Botao variante="primary" tamanho="sm" disabled={parecer.avisando} onClick={() => void parecer.avisarPorEmail().then((ok) => ok && setConfirmandoAviso(false))}>
                      <Mail size={14} /> {parecer.avisando ? "Enviando…" : `Notificar ${conta(parecer.aAvisar.length, "pessoa", "pessoas")}`}
                    </Botao>
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="fl-barra">
            <button type="button" className={`fl-botao${painel || nFiltros ? " fl-botao--ligado" : ""}`} aria-expanded={painel} onClick={() => setPainel((v) => !v)}>
              <SlidersHorizontal size={14} />
              Filtros
              {nFiltros > 0 && <b className="ds-num">{nFiltros}</b>}
            </button>
            <span className="fl-agrupar">
              Agrupar por
              <Segmento
                rotulo="Agrupar por"
                valor={agrupar}
                onTroca={setAgrupar}
                opcoes={[
                  { valor: "impacto", rotulo: "Impacto" },
                  { valor: "disciplina", rotulo: "Disciplina" },
                ]}
              />
            </span>
          </div>
          <AnimatePresence initial={false}>
            {painel && (
              <motion.div className="fl-painel" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: dur("layout"), ease: ease(CURVA.out) }}>
                <div className="fl-painel-dentro">
                  <div className="fl-selects">
                    <span>
                      Responsável
                      <Seletor valor={responsavel} onTroca={setResponsavel} opcoes={[{ valor: "qualquer", rotulo: "Qualquer" }, ...pessoas.map((p) => ({ valor: p.email, rotulo: p.souEu ? "Você" : p.nome }))]} />
                    </span>
                    <span>
                      Ordem
                      <Seletor
                        valor={ordem}
                        onTroca={setOrdem}
                        opcoes={[
                          { valor: "impacto", rotulo: "Por impacto" },
                          { valor: "pagina", rotulo: "Por página" },
                          { valor: "disciplina", rotulo: "Por disciplina" },
                          { valor: "referencia", rotulo: "Por referência" },
                        ]}
                      />
                    </span>
                  </div>
                  <div className="fl-linha">
                    <span className="fl-rotulo">Gravidade</span>
                    <div className="fl-chips">
                      {NIVEIS.map((n) => (
                        <button key={n.id} type="button" aria-pressed={niveis.includes(n.id)} className="fl-chip" onClick={() => alternarEm(niveis, setNiveis, n.id)}>
                          <i className={`rs-ponto rs-ponto--${n.id}`} />
                          {n.nome}
                          <em>{confirmados.filter((a) => a.nivel === n.id).length}</em>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="fl-linha">
                    <span className="fl-rotulo">Disciplina</span>
                    <div className="fl-chips">
                      {discsPresentes.map((d) => (
                        <button key={d.id} type="button" aria-pressed={discs.includes(d.id)} className={`fl-chip fl-chip--disc dc--${d.id}`} onClick={() => alternarEm(discs, setDiscs, d.id)}>
                          <i className="dc-ponto" />
                          {d.nome}
                          <em>{d.n}</em>
                        </button>
                      ))}
                    </div>
                  </div>
                  {tiposPresentes.length > 0 && (
                    <div className="fl-linha">
                      <span className="fl-rotulo">Tipo</span>
                      <div className="fl-chips">
                        {tiposPresentes.map((t) => (
                          <button key={t.id} type="button" aria-pressed={tipos.includes(t.id)} className="fl-chip" onClick={() => alternarEm(tipos, setTipos, t.id)}>
                            {t.nome}
                            <em>{t.n}</em>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="fl-pe">
                    <span className="ds-num">
                      {visiveis.length} de {confirmados.length} achados
                    </span>
                    {nFiltros > 0 && (
                      <button type="button" className="rs-link" onClick={limparFiltros}>
                        Limpar filtros
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="rs-linhas">
          {visiveis.length === 0 && meusCorrigidos.length > 0 ? (
            <p className="rs-meus-vazio">Nada pendente com você.</p>
          ) : visiveis.length === 0 ? (
            <div className="rs-vazio">
              <b>Nenhum achado com {busca ? `“${busca}”` : "esse filtro"}.</b>
              <span>A busca olha o título, a referência, a disciplina, a página e o trecho.</span>
              <Botao
                variante="ghost"
                tamanho="sm"
                onClick={() => {
                  setBusca("");
                  setFiltro("todos");
                  limparFiltros();
                }}
              >
                Limpar busca e filtros
              </Botao>
            </div>
          ) : (
            grupos.map((grupo) =>
              grupo.itens.length ? (
                <div key={grupo.id} className={`rs-grupo${agrupar === "disciplina" ? ` rs-grupo--disc dc--${grupo.id}` : ""}`}>
                  <h4>
                    {grupo.marca}
                    {grupo.nome}
                    <span className="ds-num">{grupo.itens.length}</span>
                  </h4>
                  {grupo.itens.map((a) => linhaDaLista(a))}
                </div>
              ) : null,
            )
          )}

          {meusCorrigidos.length > 0 && (
            <div className="rs-grupo rs-grupo--meus-corrigidos">
              <h4>
                <Check size={12} aria-hidden />
                Corrigidos por você
                <span className="ds-num">{meusCorrigidos.length}</span>
              </h4>
              {meusCorrigidos.map((a) => linhaDaLista(a))}
            </div>
          )}

          {/* As sugestões da IA: rebaixadas pela validação, não contam em nada. */}
          {sugestoes.length > 0 && (
            <div className="rs-grupo rs-grupo--sugestoes">
              <button type="button" className="rs-sugestoes-barra" aria-expanded={verSugestoes} onClick={() => setVerSugestoes((v) => !v)}>
                {conta(sugestoes.length, "sugestão da IA", "sugestões da IA")}
                <span>não contam no veredito</span>
                <ChevronDown size={13} style={{ transform: verSugestoes ? "rotate(180deg)" : undefined }} />
              </button>
              {verSugestoes && sugestoes.map((a) => linhaDaLista(a, true))}
            </div>
          )}

          {/* O que a auditoria não apontou e devia: vai para o benchmark. */}
          <div className="rs-faltou">
            {faltou === null ? (
              <button type="button" className="rs-link" onClick={() => setFaltou("")}>
                Faltou apontar algum problema?
              </button>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (faltou.trim() && (await parecer.faltou(faltou.trim()))) setFaltou(null);
                }}
              >
                <textarea autoFocus rows={2} value={faltou} onChange={(e) => setFaltou(e.target.value)} placeholder="O que a auditoria deixou passar, e em que página" />
                <span>
                  <Botao variante="quiet" tamanho="sm" onClick={() => setFaltou(null)}>
                    Cancelar
                  </Botao>
                  <Botao variante="ghost" tamanho="sm" type="submit" disabled={!faltou.trim()}>
                    Registrar
                  </Botao>
                </span>
              </form>
            )}
          </div>
        </div>

        <AnimatePresence>
          {marcados.length > 0 && (
            <motion.div className="rs-selecao" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0, transition: { duration: dur("feedback") } }} transition={{ duration: dur("enter"), ease: ease(CURVA.out) }}>
              <b className="ds-num">{marcados.length}</b> selecionados
              <span className="rs-selecao-acoes">
                <Menu
                  rotulo={
                    <>
                      <UserPlus /> Atribuir a…
                    </>
                  }
                  alinhar="left"
                  itens={opcoesDePessoas.map((p) => ({
                    rotulo: p.rotulo,
                    onClick: () => {
                      void parecer.atribuir(marcados, p.valor).then((ok) => ok && setMarcados([]));
                    },
                  }))}
                />
                <Botao variante="quiet" tamanho="sm" icone aria-label="Limpar seleção (Esc)" title="Limpar seleção (Esc)" onClick={() => setMarcados([])}>
                  <X />
                </Botao>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ================= o achado aberto ================= */}
      <section className="rs-detalhe" aria-label={`Achado ${atual.id}`}>
        <div className="rs-detalhe-topo">
          <span className="rs-detalhe-id">{atual.id}</span>
          <Selo tom={atual.nivel} ponto>
            {NIVEIS.find((n) => n.id === atual.nivel)?.nome}
          </Selo>
          <SeloDaDisciplina disc={atual.disc} nome />
          <span className="rs-origem">
            {!atual.confirmado
              ? "Sugestão da IA: a validação rebaixou, não conta"
              : atual.origem === "regra"
                ? "Regra verificada: página e trecho conferidos"
                : atual.origem === "chat"
                  ? "Achado da conversa: confira o trecho"
                  : "Lido pela IA e mantido pelo segundo modelo"}
          </span>
          <span className="rs-navegar">
            <span className="ds-num">{posicao < 0 ? "fora do filtro" : `${posicao + 1} de ${visiveis.length}`}</span>
            <Botao variante="quiet" tamanho="sm" icone aria-label="Achado anterior (K)" onClick={() => ir(-1)}>
              <ChevronUp />
            </Botao>
            <Botao variante="quiet" tamanho="sm" icone aria-label="Próximo achado (J)" onClick={() => ir(1)}>
              <ChevronDown />
            </Botao>
            <Menu
              rotulo="Mais"
              variante="quiet"
              itens={[
                { rotulo: "O achado procede", dica: "Conta a favor do motor; não encerra", icone: <Check size={14} />, onClick: () => void parecer.julgar(atual, "CONFIRMED") },
                { rotulo: "Gravidade errada", dica: "Avisa o motor; o achado continua na fila", icone: <X size={14} />, onClick: () => void parecer.julgar(atual, "WRONG_SEVERITY") },
                ...(auditId ? [{ rotulo: "Copiar link do achado", icone: <Link2 size={14} />, onClick: () => void copiarLink(atual) }] : []),
              ]}
            />
          </span>
        </div>

        <AnimatePresence mode="wait" initial={false} custom={direcao}>
          <motion.div
            key={atual.chave}
            className="rs-detalhe-corpo"
            initial={{ opacity: 0, y: 10 * direcao }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 * direcao, transition: { duration: dur("feedback") } }}
            transition={{ duration: dur("enter"), ease: ease(CURVA.out) }}
          >
            <h2>{atual.titulo}</h2>
            {atual.desfecho?.tipo === "FIXED_IN_DOC" && (
              <p className="rs-faixa-corrigido" role="status">
                <Check size={14} aria-hidden /> Corrigido
                {atual.desfecho.por ? ` por ${atual.desfecho.por}` : ""} · <time>{quando(atual.desfecho.quando)}</time>
              </p>
            )}
            {entrePaginas && (
              <p className="rs-entre-paginas">
                <span aria-hidden>⇄</span> Conflito entre {emConflito.map((p) => `p. ${p}`).join(emConflito.length === 2 ? " e " : ", ")}
                <small>o defeito é a divergência entre as páginas, não uma delas sozinha</small>
              </p>
            )}
            {variasPaginas && (
              <p className="rs-entre-paginas">
                <span aria-hidden>⇄</span> Envolve {paginasEmOrdem.map((p) => `p. ${p}`).join(paginasEmOrdem.length === 2 ? " e " : ", ")}
                <small>confira todas: o achado se apoia em mais de uma página</small>
              </p>
            )}
            <div className="rs-dono">
              {atual.responsavel ? (
                <>
                  <Avatar iniciais={iniciais(atual.responsavel.nome)} pequeno /> Com {atual.responsavel.souEu ? "você" : atual.responsavel.nome}
                </>
              ) : (
                <span className="rs-sem-dono">Sem responsável</span>
              )}
              {!atual.desfecho && opcoesDePessoas.length > 0 && (
                <Menu rotulo={atual.responsavel ? "Trocar" : "Atribuir a…"} variante="quiet" alinhar="left" itens={opcoesDePessoas.map((p) => ({ rotulo: p.rotulo, onClick: () => void parecer.atribuir([atual.chave], p.valor) }))} />
              )}
              <Botao
                key={atual.chave}
                variante="ghost"
                tamanho="sm"
                className="rs-ver-memorial"
                disabled={fonteAtual.tipo !== "arquivo"}
                title={fonteAtual.tipo === "arquivo" ? "Abre o memorial nesta página, com o trecho grifado (M)" : fonteAtual.frase}
                onClick={() => onVerNoMemorial(atual.chave)}
                onPointerMove={(e) => {
                  // a luz de dentro segue o ponteiro (ref.: Aurora Glow Button), só enquanto ele está em cima
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
                }}
              >
                <FileSearch /> Ver no memorial{paginaDoTitulo ? `, ${paginaDoTitulo}` : ""} <Tecla>M</Tecla>
              </Botao>
            </div>

            {atual.estruturado.motor ? (
              <CartaoDoMotor
                modelo={findingCard(
                  {
                    descricao: atual.estruturado.descricao ?? "",
                    conflito: atual.estruturado.conflito ?? "",
                    evidencia: atual.estruturado.evidencia ?? "",
                    sugestao_correcao: atual.estruturado.acao ?? "",
                    pagina: atual.estruturado.pagina ?? "",
                    motor: atual.estruturado.motor,
                  },
                  { hasRevision: (rev: string, arquivo?: string) => resolverFonte({ revisao: rev, arquivo }, catalogo).tipo === "arquivo" },
                )}
                aoAbrir={() => onVerNoMemorial(atual.chave)}
                corretor={{ auditId: auditId ?? undefined, findingId: atual.chave, achado: atual.bruto, inicial: atual.bruto.texto_corrigido, aoGerar: aoGerarTexto }}
              />
            ) : (
              <dl className="rs-partes">
                <div>
                  <dt>O que está errado</dt>
                  <dd>{atual.estruturado.descricao || atual.titulo}</dd>
                </div>
                <div>
                  <dt>Por que importa</dt>
                  <dd>{atual.estruturado.conflito || atual.estruturado.referencia || "Consequência não detalhada no parecer."}</dd>
                </div>
                <div className="rs-parte-fazer">
                  <dt>O que fazer</dt>
                  <dd>
                    <OQueFazer
                      acao={atual.estruturado.acao || "Ação recomendada não identificada."}
                      corretor={{ auditId: auditId ?? undefined, findingId: atual.chave, achado: atual.bruto, inicial: atual.bruto.texto_corrigido, aoGerar: aoGerarTexto }}
                    />
                  </dd>
                </div>
              </dl>
            )}

            <Segmento
              rotulo="Detalhe do achado"
              valor={aba}
              onTroca={setAba}
              opcoes={[
                { valor: "evidencia", rotulo: "Evidência" },
                { valor: "conversa", rotulo: <>Conversa {atual.comentarios > 0 && <em>{atual.comentarios}</em>}</> },
                { valor: "historico", rotulo: "Histórico" },
              ]}
            />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={aba} className="rs-aba" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur("feedback") }}>
                {aba === "evidencia" && (
                  <div className="rs-evidencias">
                    {entrePaginas ? (
                      trechos.map((t, i) => (
                        <figure key={i} className="rs-trecho-de-conflito">
                          <figcaption>
                            <b>
                              Trecho {i + 1} de {trechos.length}
                              {t.pagina !== null ? `, p. ${t.pagina}` : ""}
                            </b>
                            {fonteAtual.tipo === "arquivo" && t.pagina !== null && (
                              <button type="button" className="rs-link" onClick={() => onVerNoMemorial(atual.chave, t.pagina!)}>
                                Abrir p. {t.pagina}
                              </button>
                            )}
                          </figcaption>
                          <blockquote>
                            {/* A regra cita uma JANELA do texto, que corta palavra nas pontas: as reticências dizem que o trecho continua. */}
                            {atual.bruto.origem === "regra" && "…"}
                            <Trecho texto={t.texto} marca={grifo} />
                            {atual.bruto.origem === "regra" && "…"}
                          </blockquote>
                        </figure>
                      ))
                    ) : (
                    <figure>
                      <figcaption>
                        {atual.estruturado.documento ?? "Memorial"}
                        {atual.paginas.length ? `, p. ${atual.paginas.join(", ")}` : ""}
                        {fonteAtual.tipo === "arquivo" &&
                          (variasPaginas ? (
                            paginasEmOrdem.map((p) => (
                              <button key={p} type="button" className="rs-link" onClick={() => onVerNoMemorial(atual.chave, p)}>
                                Abrir p. {p}
                              </button>
                            ))
                          ) : (
                            <button type="button" className="rs-link" onClick={() => onVerNoMemorial(atual.chave)}>
                              Abrir a página
                            </button>
                          ))}
                      </figcaption>
                      <blockquote>{atual.bruto.evidencia ? <Trecho texto={atual.bruto.evidencia} marca={grifo} /> : "Evidência não informada no parecer."}</blockquote>
                    </figure>
                    )}
                    {atual.bruto.referencia_comparada && (
                      <figure>
                        <figcaption>Comparado com</figcaption>
                        <blockquote>{atual.bruto.referencia_comparada}</blockquote>
                      </figure>
                    )}
                  </div>
                )}
                {aba === "conversa" &&
                  (auditId ? (
                    <ConversaDoAchado
                      auditId={auditId}
                      findingId={atual.chave}
                      membros={parecer.membros}
                      rascunho={rascunhos[atual.chave] ?? ""}
                      onRascunho={(t) => setRascunhos((r) => ({ ...r, [atual.chave]: t }))}
                      onPublicado={parecer.reler}
                    />
                  ) : (
                    <p className="rs-nota">A conversa existe quando o parecer está gravado no servidor.</p>
                  ))}
                {aba === "historico" && (
                  <ol className="rs-historico">
                    <li>
                      <time>{quando(linha?.createdAt) || "—"}</time> Encontrado{" "}
                      {atual.origem === "regra" ? "pela regra de coerência" : atual.origem === "chat" ? "na conversa sobre o parecer" : "pela leitura da IA e mantido pelo segundo modelo"}
                      {atual.bruto.herdado_de ? `, herdado do parecer de ${atual.bruto.herdado_de.quando}` : ""}
                    </li>
                    {linha?.assignedAt && linha.assigneeName && (
                      <li>
                        <time>{quando(linha.assignedAt)}</time> Atribuído a {linha.assigneeName}
                        {linha.notifiedAt ? ", avisado por e-mail" : ""}
                      </li>
                    )}
                    {atual.validade && atual.validade !== "FALSE_POSITIVE" && (
                      <li>
                        <time>{quando(linha?.updatedAt)}</time> {atual.validade === "CONFIRMED" ? "Marcado como procedente" : atual.validade === "WRONG_SEVERITY" ? "Gravidade contestada" : "Avaliado"}
                      </li>
                    )}
                    {atual.desfecho && (
                      <li>
                        <time>{quando(atual.desfecho.quando)}</time> {NOME_DO_DESFECHO[atual.desfecho.tipo]}
                        {atual.desfecho.por ? `, por ${atual.desfecho.por}` : ""}
                      </li>
                    )}
                  </ol>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* ---------- o que fazer com ele ---------- */}
        <div className="rs-acoes">
          {parecer.aviso && (
            <p className={`rs-aviso rs-aviso--${parecer.aviso.tom}`} role={parecer.aviso.tom === "falha" ? "alert" : "status"}>
              {parecer.aviso.texto}
            </p>
          )}
          <AnimatePresence mode="wait" initial={false}>
            {atual.desfecho ? (
              <motion.div key="encerrado" className="rs-encerrado" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: dur("enter"), ease: ease(CURVA.out) }}>
                <span className="rs-encerrado-marca">
                  <Check size={14} />
                </span>
                <div>
                  <b>
                    {NOME_DO_DESFECHO[atual.desfecho.tipo]}
                    <span>
                      , por {atual.desfecho.por ?? "você"}
                      {atual.desfecho.quando ? ` em ${quando(atual.desfecho.quando)}` : ""}
                    </span>
                  </b>
                  {atual.desfecho.nota && <p>{atual.desfecho.nota}</p>}
                </div>
                {ultimo === atual.chave ? (
                  <Botao variante="ghost" tamanho="sm" onClick={desfazer}>
                    <Undo2 /> Desfazer <Tecla>Z</Tecla>
                  </Botao>
                ) : (
                  <Botao variante="quiet" tamanho="sm" disabled={parecer.salvando === atual.chave} onClick={() => void parecer.reabrir(atual)}>
                    Reabrir
                  </Botao>
                )}
              </motion.div>
            ) : decisao ? (
              <motion.form
                key="decisao"
                className="rs-decisao"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: dur("enter"), ease: ease(CURVA.out) }}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (motivo.trim()) void encerrar("ACCEPTED_RISK", motivo.trim());
                }}
              >
                <label htmlFor="rs-motivo">
                  Motivo da decisão técnica <span>Fica no histórico e vai no parecer.</span>
                </label>
                <textarea id="rs-motivo" autoFocus rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Por que o projeto segue assim" />
                <div>
                  <Botao variante="quiet" tamanho="sm" onClick={() => setDecisao(false)}>
                    Cancelar <Tecla>Esc</Tecla>
                  </Botao>
                  <Botao variante="primary" tamanho="sm" type="submit" disabled={!motivo.trim() || parecer.salvando === atual.chave}>
                    Gravar decisão técnica
                  </Botao>
                </div>
              </motion.form>
            ) : (
              <motion.div key="botoes" className="rs-botoes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur("feedback") }}>
                <GrupoDeBotoes rotulo="Encerrar o achado">
                  <BotaoDoGrupo principal tecla="C" curto="Corrigido" disabled={!auditId || parecer.salvando === atual.chave} onClick={() => void encerrar("FIXED_IN_DOC")}>
                    <Check /> Marcar corrigido
                  </BotaoDoGrupo>
                  <BotaoDoGrupo tecla="D" curto="Decisão" disabled={!auditId} onClick={() => setDecisao(true)}>
                    Decisão técnica
                  </BotaoDoGrupo>
                  <BotaoDoGrupo tecla="F" curto="Falso positivo" disabled={!auditId || parecer.salvando === atual.chave} onClick={() => void encerrar("FALSE_POSITIVE")}>
                    Falso positivo
                  </BotaoDoGrupo>
                </GrupoDeBotoes>
                <span className="rs-atalhos" title="J próximo, K anterior">
                  <Tecla>J</Tecla>
                  <Tecla>K</Tecla> andam
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
