"use client";

/**
 * O HISTÓRICO DE CONVERSAS (desenho do lab: Histórico de conversas, aprovado
 * pelo Matheus em 02/10/2026). Substitui a lista de pastas com etiquetas.
 *
 * - POR OBRA, e a obra no grupo da sua conversa mais recente: Agora (auditoria
 *   rodando), Hoje, Esta semana, Antes. O nome da obra vem primeiro; código,
 *   município e quantas conversas, embaixo.
 * - CADA CONVERSA DIZ COMO TERMINOU (`estado-da-conversa.ts`): o sinal (ref.
 *   Status Mark) e a palavra do resultado — "Não emitir · 8 de 53 a tratar",
 *   "Capa, 3 LDs e 3 separatrizes" com as disciplinas na linha de baixo.
 * - EXEMPLOS E TESTES À PARTE, recolhidos no fim.
 * - Teclado: ↑ ↓ andam entre as conversas, ← → recolhem ou abrem a obra.
 */

import { ChevronRight } from "lucide-react";
import { Fragment, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { MarcaDeEstado, type EstadoDaMarca } from "@/components/ds/micro";
import { cidadeDoCliente } from "@/lib/cliente-do-projeto";
import { diaEmBrasilia } from "@/lib/fuso-de-brasilia";
import { filtrarCartoes, type CartaoDeProjeto, type ConversaDoCartao } from "../lib/cartoes-de-projeto";
import { oQueFoiGerado, type EstadoDaConversa } from "../lib/estado-da-conversa";
import type { ConversationSummary } from "../lib/nexo-db";
import { useCartoesDeProjeto } from "../state/use-cartoes-de-projeto";
import { nomeProprio, quando } from "./CartaoDeProjeto";
import { MarcaDaPrefeitura } from "./MarcaDaPrefeitura";
import "@/components/telas/nexo/historico.css";

export type FiltroDoHistorico = "tudo" | "auditorias" | "volumes";

type Grupo = "agora" | "hoje" | "semana" | "antes";
const GRUPOS: { id: Grupo; nome: string }[] = [
  { id: "agora", nome: "Agora" },
  { id: "hoje", nome: "Hoje" },
  { id: "semana", nome: "Esta semana" },
  { id: "antes", nome: "Antes" },
];

/** A cor de cada disciplina (os tokens --ds-disc-*); fundações tem a sua desde 03/10/2026. */
const COR_DA_DISCIPLINA: Record<string, string> = {
  ARQ: "var(--ds-disc-arq)",
  EST: "var(--ds-disc-est)",
  FND: "var(--ds-disc-fnd)",
  MET: "var(--ds-disc-est)",
  HID: "var(--ds-disc-hid)",
  HIS: "var(--ds-disc-hid)",
  ELE: "var(--ds-disc-ele)",
  ELT: "var(--ds-disc-ele)",
  PCI: "var(--ds-disc-pci)",
  INC: "var(--ds-disc-pci)",
  CLI: "var(--ds-disc-cli)",
  TER: "var(--ds-disc-ter)",
  PAI: "var(--ds-disc-pai)",
  CAB: "var(--ds-disc-cab)",
  GAS: "var(--ds-disc-gas)",
};

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** O trecho que casou com a busca, marcado. */
function Marcado({ texto, busca }: { texto: string; busca: string }) {
  const q = semAcento(busca.trim());
  const i = q ? semAcento(texto).indexOf(q) : -1;
  if (i < 0) return <>{texto}</>;
  return (
    <>
      {texto.slice(0, i)}
      <mark>{texto.slice(i, i + q.length)}</mark>
      {texto.slice(i + q.length)}
    </>
  );
}

/** As disciplinas, pela sigla e na cor de cada uma. Até cinco; o resto vira "+N". */
function Disciplinas({ siglas }: { siglas: readonly string[] }) {
  if (!siglas.length) return null;
  return (
    <span className="hs-discs" title={siglas.join(", ")}>
      {siglas.slice(0, 5).map((s) => (
        <span key={s} className="hs-disc" style={{ ["--dc-cor" as string]: COR_DA_DISCIPLINA[s] ?? "var(--ds-text-tertiary)" }}>
          <i aria-hidden />
          {s}
        </span>
      ))}
      {siglas.length > 5 && <span className="hs-disc-mais ds-num">+{siglas.length - 5}</span>}
    </span>
  );
}

function marcaDe(e: EstadoDaConversa): EstadoDaMarca {
  switch (e.tipo) {
    case "auditando":
      return "rodando";
    case "auditoria":
      return e.veredito === "liberado" ? "feito" : e.veredito === "revisar" ? "atencao" : e.veredito ? "falhou" : "feito";
    case "volume":
    case "documentos":
      return "feito";
    case "leitura":
    case "conversa":
      return "pendente";
  }
}

/** A segunda (e às vezes terceira) linha da conversa: como ela terminou. */
function ComoTerminou({ e }: { e: EstadoDaConversa }) {
  let frase: ReactNode;
  switch (e.tipo) {
    case "auditando":
      frase = <b>Auditando agora</b>;
      break;
    case "auditoria": {
      const rotulo = e.veredito ? { "nao-emitir": "Não emitir", revisar: "Revisar", liberado: "Liberado", parcial: "Análise parcial" }[e.veredito] : "Auditoria";
      const resto =
        e.veredito === "parcial"
          ? "rodar de novo"
          : e.total === null || e.aTratar === null
            ? ""
            : e.aTratar
              ? `${e.aTratar} de ${e.total} a tratar`
              : e.total
                ? "tudo tratado"
                : "nenhum achado";
      frase = (
        <>
          <b>{rotulo}</b>
          {resto && <span className="hs-estado-resto"> · {resto}</span>}
        </>
      );
      break;
    }
    case "volume":
      frase = <b>{e.tomos > 1 ? `${e.tomos} tomos montados` : "Volume montado"}</b>;
      break;
    case "documentos":
      frase = <b>{oQueFoiGerado(e)}</b>;
      break;
    case "leitura":
      frase = <span className="hs-estado-resto">folhas lidas, nada gerado ainda</span>;
      break;
    case "conversa":
      frase = <span className="hs-estado-resto">sem tarefa</span>;
  }
  const marca = marcaDe(e);
  const detalhe = e.tipo === "volume" || e.tipo === "documentos" || e.tipo === "leitura" ? e : null;
  return (
    <>
      <span className={`hs-estado hs-estado--${marca}`}>
        <MarcaDeEstado estado={marca} tamanho={13} />
        <span className="hs-estado-frase">{frase}</span>
      </span>
      {detalhe && (detalhe.disciplinas.length > 0 || detalhe.folhas > 0) && (
        <span className="hs-volume">
          <Disciplinas siglas={detalhe.disciplinas} />
          {detalhe.folhas > 0 && <span className="ds-num">{detalhe.folhas} fl</span>}
        </span>
      )}
    </>
  );
}

const passaNoFiltro = (c: ConversaDoCartao, f: FiltroDoHistorico) =>
  f === "tudo" ||
  (f === "auditorias"
    ? c.estado.tipo === "auditoria" || c.estado.tipo === "auditando"
    : c.estado.tipo === "volume" || c.estado.tipo === "documentos" || c.estado.tipo === "leitura");

/** Em que grupo a obra mora: o da conversa mais recente dela. */
function grupoDa(cartao: CartaoDeProjeto, agora: number): Grupo {
  if (cartao.rodando) return "agora";
  if (diaEmBrasilia(cartao.atualizadoEm) === diaEmBrasilia(agora)) return "hoje";
  if (agora - cartao.atualizadoEm < 7 * 86_400_000) return "semana";
  return "antes";
}

export function HistoricoDeConversas({
  conversations,
  query,
  filtro,
  activeId,
  onSelect,
}: {
  conversations: readonly ConversationSummary[];
  query: string;
  filtro: FiltroDoHistorico;
  activeId?: string;
  onSelect?: (id: string) => void;
}) {
  const cartoes = useCartoesDeProjeto(conversations);
  // A obra que a pessoa recolheu ou abriu à mão; sem escolha, vale o grupo (Antes começa recolhida).
  const [escolhas, setEscolhas] = useState<Record<string, boolean>>({});
  const [estendidas, setEstendidas] = useState<ReadonlySet<string>>(() => new Set());
  const [exemplos, setExemplos] = useState(false);
  const [agora] = useState(() => Date.now());
  const lista = useRef<HTMLDivElement>(null);
  const q = query.trim();

  const filtrados = useMemo(
    () =>
      filtrarCartoes(cartoes, query)
        .map((c) => ({ ...c, conversas: c.conversas.filter((x) => passaNoFiltro(x, filtro)), ocultas: c.ocultas.filter((x) => passaNoFiltro(x, filtro)) }))
        .filter((c) => c.conversas.length + c.ocultas.length > 0),
    [cartoes, query, filtro],
  );
  const reais = filtrados.filter((c) => !c.exemplo);
  const deExemplo = filtrados.filter((c) => c.exemplo);
  const exemplosAbertos = exemplos || Boolean(q) || deExemplo.some((c) => [...c.conversas, ...c.ocultas].some((x) => x.id === activeId));

  const temAtiva = (c: CartaoDeProjeto) => [...c.conversas, ...c.ocultas].some((x) => x.id === activeId);
  const aberta = (c: CartaoDeProjeto) => Boolean(q) || temAtiva(c) || (escolhas[c.chave] ?? grupoDa(c, agora) !== "antes");
  const alternar = (c: CartaoDeProjeto, abrir?: boolean) => setEscolhas((e) => ({ ...e, [c.chave]: abrir ?? !aberta(c) }));

  if (filtrados.length === 0) {
    return (
      <div className="hs-vazio">
        {q ? (
          <>
            <p className="hs-vazio-titulo">Nada com “{q}”</p>
            <p>A busca olha o código e o nome da obra, o município e o título da conversa.</p>
          </>
        ) : filtro !== "tudo" ? (
          <p>Nenhuma conversa {filtro === "auditorias" ? "de auditoria" : "de volume"} ainda.</p>
        ) : (
          <>
            <p className="hs-vazio-titulo">Nenhuma conversa ainda</p>
            <p>Cada tarefa, auditar um memorial ou montar um volume, vira uma conversa aqui, guardada na obra dela.</p>
          </>
        )}
      </div>
    );
  }

  // ↑ ↓ andam pelas conversas à vista; ← → recolhem ou abrem a obra da conversa em foco.
  const teclado = (e: KeyboardEvent) => {
    const botoes = [...(lista.current?.querySelectorAll<HTMLButtonElement>("[data-conversa]") ?? [])];
    const i = botoes.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      botoes[Math.min(botoes.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))]?.focus();
    } else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && i >= 0) {
      const chave = botoes[i].dataset.obra;
      const c = filtrados.find((x) => x.chave === chave);
      if (c) alternar(c, e.key === "ArrowRight");
    }
  };

  const obra = (c: CartaoDeProjeto) => {
    const abertaAgora = aberta(c);
    const estendida = estendidas.has(c.chave) || c.ocultas.some((x) => x.id === activeId) || Boolean(q);
    const visiveis = estendida ? [...c.conversas, ...c.ocultas] : c.conversas;
    const total = c.conversas.length + c.ocultas.length;
    const cidade = c.cliente ? nomeProprio(cidadeDoCliente(c.cliente) || c.cliente) : "";
    const nome = c.nome || (c.aEnderecar ? "A endereçar" : cidade || c.codigo || "Sem obra");
    return (
      <section key={c.chave || "sem-codigo"} className={`hs-obra${abertaAgora ? " hs-obra--aberta" : ""}${temAtiva(c) ? " hs-obra--ativa" : ""}`}>
        <button type="button" className="hs-obra-cabeca" aria-expanded={abertaAgora} onClick={() => alternar(c)} title={[c.codigo, c.nome, cidade].filter(Boolean).join(" · ")}>
          <ChevronRight size={13} className="hs-seta" aria-hidden />
          <span className="hs-obra-texto">
            <span className="hs-obra-nome">
              <Marcado texto={nome} busca={q} />
            </span>
            <span className="hs-obra-sub">
              <MarcaDaPrefeitura prefeitura={c.cliente} forma="sinal" />
              {c.codigo && (
                <span className="hs-codigo ds-num">
                  <Marcado texto={c.codigo} busca={q} />
                </span>
              )}
              {cidade && c.nome && (
                <span>
                  <Marcado texto={cidade} busca={q} />
                </span>
              )}
              <span className="hs-conta ds-num">
                · {total} {total === 1 ? "conversa" : "conversas"}
              </span>
            </span>
          </span>
        </button>
        {abertaAgora && (
          <ul className="hs-conversas">
            {visiveis.map((x) => (
              <li key={x.id}>
                <button
                  type="button"
                  data-conversa={x.id}
                  data-obra={c.chave}
                  className={`hs-conversa${x.id === activeId ? " hs-conversa--sel" : ""}`}
                  aria-current={x.id === activeId ? "true" : undefined}
                  onClick={() => onSelect?.(x.id)}
                >
                  <span className="hs-conversa-linha">
                    <span className="hs-conversa-titulo">
                      <Marcado texto={x.titulo} busca={q} />
                    </span>
                    <span className="hs-quando ds-num">{x.rodando ? "agora" : quando(x.updatedAt)}</span>
                  </span>
                  <ComoTerminou e={x.estado} />
                </button>
              </li>
            ))}
            {!estendida && c.ocultas.length > 0 && (
              <li>
                <button
                  type="button"
                  className="hs-mais"
                  onClick={() =>
                    setEstendidas((s) => {
                      const n = new Set(s);
                      n.add(c.chave);
                      return n;
                    })
                  }
                >
                  Mais {c.ocultas.length} {c.ocultas.length === 1 ? "conversa" : "conversas"}, desde {quando(c.restantesDesde)}
                </button>
              </li>
            )}
          </ul>
        )}
      </section>
    );
  };

  return (
    <div className="hs-lista" ref={lista} onKeyDown={teclado}>
      {q && (
        <p className="hs-resultado ds-num" role="status">
          {filtrados.reduce((n, c) => n + c.conversas.length + c.ocultas.length, 0)} conversas em {filtrados.length} {filtrados.length === 1 ? "obra" : "obras"}
        </p>
      )}
      {GRUPOS.map((g) => {
        const doGrupo = reais.filter((c) => grupoDa(c, agora) === g.id);
        if (!doGrupo.length) return null;
        return (
          <Fragment key={g.id}>
            <h3 className={`hs-grupo${g.id === "agora" ? " hs-grupo--agora" : ""}`}>{g.nome}</h3>
            {doGrupo.map(obra)}
          </Fragment>
        );
      })}
      {deExemplo.length > 0 && (
        <div className="hs-exemplos">
          <button type="button" className="hs-exemplos-cabeca" aria-expanded={exemplosAbertos} onClick={() => setExemplos((v) => !v)}>
            <ChevronRight size={13} className="hs-seta" aria-hidden />
            Exemplos e testes
            <span className="hs-conta ds-num">{deExemplo.length}</span>
          </button>
          {exemplosAbertos && deExemplo.map(obra)}
        </div>
      )}
    </div>
  );
}
