"use client";

/**
 * O HISTÓRICO, redesenhado (02/10/2026). A coluna das conversas do Nexo dizia
 * só "AUDITORIA" e "LD CAPA SEP VOL" ao lado do código — para saber se a
 * auditoria de ontem bloqueou a emissão, era preciso abri-la. E as obras de
 * exemplo e as simulações da bateria se misturavam com as de verdade.
 *
 * Três decisões:
 * 1. POR OBRA, e a obra no grupo da sua conversa mais recente (Agora, Hoje,
 *    Esta semana, Antes): a obra não se parte em dois lugares.
 * 2. CADA CONVERSA DIZ COMO TERMINOU: o veredito e quantos faltam tratar, o
 *    volume montado ou velho, os documentos gerados. O ponto tem a cor do sinal,
 *    e só ele tem cor.
 * 3. EXEMPLOS E TESTES À PARTE, recolhidos no fim.
 *
 * Navegável pelo teclado: / busca, ↑ ↓ andam, Enter abre, ← → recolhem a obra.
 */
import { ChevronRight, MessageSquarePlus, Search, X } from "lucide-react";
import { Fragment, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { Botao, Segmento, Tecla } from "@/components/ds/basicos";
import { MarcaDeEstado, type EstadoDaMarca } from "@/components/ds/micro";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { OBRAS, type Conversa, type Estado, type Obra } from "./dados";
import "../mapa/mapa.css";
import "./historico.css";

export type SituacaoHistorico = "dia" | "busca" | "auditorias" | "exemplos" | "vazio";

type Filtro = "tudo" | "auditorias" | "volumes";

const GRUPOS: { id: "agora" | Conversa["dia"]; nome: string }[] = [
  { id: "agora", nome: "Agora" },
  { id: "hoje", nome: "Hoje" },
  { id: "semana", nome: "Esta semana" },
  { id: "antes", nome: "Antes" },
];

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** O trecho que casou com a busca, marcado. */
function Marcado({ texto, busca }: { texto: string; busca: string }) {
  const q = semAcento(busca.trim());
  if (!q) return <>{texto}</>;
  const i = semAcento(texto).indexOf(q);
  if (i < 0) return <>{texto}</>;
  return (
    <>
      {texto.slice(0, i)}
      <mark>{texto.slice(i, i + q.length)}</mark>
      {texto.slice(i + q.length)}
    </>
  );
}

/** A cor de cada disciplina (os tokens --ds-disc-*); fundações é do grupo estrutural. */
const COR_DA_DISCIPLINA: Record<string, string> = {
  ARQ: "var(--ds-disc-arq)",
  EST: "var(--ds-disc-est)",
  FND: "var(--ds-disc-est)",
  HID: "var(--ds-disc-hid)",
  ELE: "var(--ds-disc-ele)",
  PCI: "var(--ds-disc-pci)",
  CLI: "var(--ds-disc-cli)",
  TER: "var(--ds-disc-ter)",
  PAI: "var(--ds-disc-pai)",
};

/**
 * AS DISCIPLINAS do volume, pelas siglas e na cor de cada uma — a mesma
 * linguagem do Resultado. Até cinco; o resto vira "+N" (o título diz quais).
 */
function Disciplinas({ siglas }: { siglas: string[] }) {
  const vistas = siglas.slice(0, 5);
  return (
    <span className="hs-discs" title={siglas.join(", ")}>
      {vistas.map((s) => (
        <span key={s} className="hs-disc" style={{ ["--dc-cor" as string]: COR_DA_DISCIPLINA[s] ?? "var(--ds-text-tertiary)" }}>
          <i aria-hidden />
          {s}
        </span>
      ))}
      {siglas.length > 5 && <span className="hs-disc-mais ds-num">+{siglas.length - 5}</span>}
    </span>
  );
}

/** "Capa, 3 LDs e 3 separatrizes" — cada documento contado, sem os que não há. */
function oQueFoiGerado(e: { capas: number; lds: number; separatrizes: number }) {
  const conta = (n: number, um: string, varios: string) => (n === 1 ? um : `${n} ${varios}`);
  const partes = [
    e.capas && conta(e.capas, "Capa", "capas"),
    e.lds && conta(e.lds, "LD", "LDs"),
    e.separatrizes && conta(e.separatrizes, "separatriz", "separatrizes"),
  ].filter(Boolean) as string[];
  const frase = partes.length > 1 ? `${partes.slice(0, -1).join(", ")} e ${partes.at(-1)}` : (partes[0] ?? "");
  return frase.charAt(0).toUpperCase() + frase.slice(1);
}

/** O sinal de cada estado (ref. Status Mark): só ele tem cor. */
function marcaDe(e: Estado): EstadoDaMarca {
  switch (e.tipo) {
    case "auditando":
      return "rodando";
    case "auditoria":
      return e.veredito === "liberado" ? "feito" : e.veredito === "revisar" ? "atencao" : "falhou";
    case "volume":
      return e.velho ? "atencao" : "feito";
    case "documentos":
      return "feito";
    case "conversa":
      return "pendente";
  }
}

/** A linha de baixo de cada conversa: como ela terminou, em palavras. */
function ComoTerminou({ e }: { e: Estado }): ReactNode {
  let frase: ReactNode;
  switch (e.tipo) {
    case "auditando":
      frase = (
        <>
          <b>Auditando</b>
          <span className="hs-estado-resto">
            {" "}· {e.etapa} · <span className="ds-num">{e.desde}</span>
          </span>
        </>
      );
      break;
    case "auditoria": {
      const rotulo = { "nao-emitir": "Não emitir", revisar: "Revisar", liberado: "Liberado", parcial: "Análise parcial" }[e.veredito];
      const resto =
        e.veredito === "parcial" ? "rodar de novo" : e.aTratar ? `${e.aTratar} de ${e.total} a tratar` : e.total ? "tudo tratado" : "nenhum achado";
      frase = (
        <>
          <b>{rotulo}</b>
          <span className="hs-estado-resto"> · {resto}</span>
        </>
      );
      break;
    }
    case "volume":
      frase = e.velho ? (
        <>
          <b>Volume velho</b>
          <span className="hs-estado-resto">: {e.velho}</span>
        </>
      ) : (
        <>
          <b>{e.tomos > 1 ? `${e.tomos} tomos montados` : "Volume montado"}</b>
        </>
      );
      break;
    case "documentos":
      frase = (
        <>
          <b>{oQueFoiGerado(e)}</b>
        </>
      );
      break;
    case "conversa":
      frase = <span className="hs-estado-resto">sem tarefa</span>;
  }
  const marca = marcaDe(e);
  // Volume e documentos ganham uma linha a mais: as disciplinas e as folhas. Na
  // linha do estado elas eram cortadas pelas reticências.
  const deVolume = e.tipo === "volume" || e.tipo === "documentos" ? e : null;
  return (
    <>
      <span className={`hs-estado hs-estado--${marca}`}>
        <MarcaDeEstado estado={marca} tamanho={13} />
        <span className="hs-estado-frase">{frase}</span>
      </span>
      {deVolume && (
        <span className="hs-volume">
          <Disciplinas siglas={deVolume.disciplinas} />
          <span className="ds-num">{deVolume.folhas} fl</span>
        </span>
      )}
    </>
  );
}

const passaNoFiltro = (c: Conversa, f: Filtro) =>
  f === "tudo" ||
  (f === "auditorias" ? c.estado.tipo === "auditoria" || c.estado.tipo === "auditando" : c.estado.tipo === "volume" || c.estado.tipo === "documentos");

const ORDEM_DO_DIA = { hoje: 0, semana: 1, antes: 2 } as const;

export function TelaHistorico({ situacao }: { situacao: SituacaoHistorico }) {
  const [busca, setBusca] = useState(situacao === "busca" ? "cric" : "");
  const [filtro, setFiltro] = useState<Filtro>(situacao === "auditorias" ? "auditorias" : "tudo");
  const [recolhidas, setRecolhidas] = useState<Set<string>>(() => new Set(["084-25"]));
  const [exemplos, setExemplos] = useState(situacao === "exemplos");
  const [sel, setSel] = useState<string>(situacao === "vazio" ? "" : "c3");
  const campo = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLDivElement>(null);

  const obras = situacao === "vazio" ? [] : OBRAS;
  const q = semAcento(busca.trim());

  // A obra com só as conversas que passam no filtro e na busca.
  const filtradas = obras
    .map((o) => {
      const obraCasa = q && semAcento(`${o.codigo} ${o.nome} ${o.municipio}`).includes(q);
      const conversas = o.conversas.filter((c) => passaNoFiltro(c, filtro) && (!q || obraCasa || semAcento(c.titulo).includes(q)));
      return { ...o, conversas };
    })
    .filter((o) => o.conversas.length > 0);

  // A obra entra no grupo da conversa mais recente dela.
  const grupoDa = (o: Obra) =>
    o.conversas.some((c) => c.estado.tipo === "auditando") ? "agora" : o.conversas.map((c) => c.dia).sort((a, b) => ORDEM_DO_DIA[a] - ORDEM_DO_DIA[b])[0];
  const reais = filtradas.filter((o) => !o.exemplo);
  const deExemplo = filtradas.filter((o) => o.exemplo);
  const totalDeConversas = filtradas.reduce((n, o) => n + o.conversas.length, 0);

  // As conversas que se veem, na ordem da tela: é por elas que ↑ ↓ andam.
  const visiveis = [
    ...GRUPOS.flatMap((g) => reais.filter((o) => grupoDa(o) === g.id && (q || !recolhidas.has(o.codigo))).flatMap((o) => o.conversas)),
    ...(exemplos || q ? deExemplo.flatMap((o) => o.conversas) : []),
  ];
  const selecionada = OBRAS.flatMap((o) => o.conversas.map((c) => ({ o, c }))).find((x) => x.c.id === sel);

  const alternar = (codigo: string, aberta?: boolean) =>
    setRecolhidas((r) => {
      const n = new Set(r);
      if (aberta ?? n.has(codigo)) n.delete(codigo);
      else n.add(codigo);
      return n;
    });

  const teclado = (e: KeyboardEvent) => {
    if (e.key === "/" && document.activeElement !== campo.current) {
      e.preventDefault();
      campo.current?.focus();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const dona = OBRAS.find((o) => o.conversas.some((c) => c.id === sel));
      if (dona && document.activeElement !== campo.current) alternar(dona.codigo, e.key === "ArrowRight");
      return;
    }
    e.preventDefault();
    const i = visiveis.findIndex((c) => c.id === sel);
    const prox = visiveis[Math.min(visiveis.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))];
    if (prox) {
      setSel(prox.id);
      lista.current?.querySelector<HTMLButtonElement>(`[data-conversa="${prox.id}"]`)?.focus();
    }
  };

  const linhaDaObra = (o: (typeof filtradas)[number]) => {
    const aberta = Boolean(q) || !recolhidas.has(o.codigo);
    return (
      <section key={o.codigo} className={`hs-obra${aberta ? " hs-obra--aberta" : ""}`}>
        <button type="button" className="hs-obra-cabeca" aria-expanded={aberta} onClick={() => alternar(o.codigo)} title={`${o.nome}, ${o.municipio}`}>
          <ChevronRight size={13} className="hs-seta" aria-hidden />
          {/* O NOME da obra é o que se procura com o olho; código e município vêm embaixo. */}
          <span className="hs-obra-texto">
            <span className="hs-obra-nome">
              <Marcado texto={o.nome} busca={busca} />
            </span>
            <span className="hs-obra-sub">
              <MarcaDaPrefeitura prefeitura={o.municipio} forma="sinal" />
              <span className="hs-codigo ds-num">
                <Marcado texto={o.codigo} busca={busca} />
              </span>
              <span>
                <Marcado texto={o.municipio} busca={busca} />
              </span>
              <span className="hs-conta ds-num">
                · {o.conversas.length} {o.conversas.length === 1 ? "conversa" : "conversas"}
              </span>
            </span>
          </span>
        </button>
        {aberta && (
          <ul className="hs-conversas">
            {o.conversas.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  data-conversa={c.id}
                  className={`hs-conversa${sel === c.id ? " hs-conversa--sel" : ""}`}
                  aria-current={sel === c.id ? "true" : undefined}
                  onClick={() => setSel(c.id)}
                >
                  <span className="hs-conversa-linha">
                    <span className="hs-conversa-titulo">
                      <Marcado texto={c.titulo} busca={busca} />
                    </span>
                    <span className="hs-quando ds-num">{c.quando}</span>
                  </span>
                  <ComoTerminou e={c.estado} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  };

  return (
    <div className="hs-mesa">
      <aside className="hs" aria-label="Histórico de conversas" onKeyDown={teclado}>
        <div className="hs-topo">
          <Botao variante="ghost" tamanho="sm" className="hs-nova">
            <MessageSquarePlus size={14} /> Nova conversa <Tecla>N</Tecla>
          </Botao>
          <label className="mp-busca hs-busca">
            <Search size={14} aria-hidden />
            <input ref={campo} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Obra, código, município ou tarefa" aria-label="Buscar no histórico" />
            {busca ? (
              <button type="button" className="hs-limpar" aria-label="Limpar a busca" onClick={() => setBusca("")}>
                <X size={13} />
              </button>
            ) : (
              <Tecla>/</Tecla>
            )}
          </label>
          {obras.length > 0 && (
            <Segmento
              rotulo="O que mostrar"
              valor={filtro}
              onTroca={setFiltro}
              opcoes={[
                { valor: "tudo", rotulo: "Tudo" },
                { valor: "auditorias", rotulo: "Auditorias" },
                { valor: "volumes", rotulo: "Volumes" },
              ]}
            />
          )}
        </div>

        <div className="hs-lista" ref={lista}>
          {obras.length === 0 ? (
            <div className="hs-vazio">
              <p className="hs-vazio-titulo">Nenhuma conversa ainda</p>
              <p>Cada tarefa, auditar um memorial ou montar um volume, vira uma conversa aqui, guardada na obra dela.</p>
            </div>
          ) : filtradas.length === 0 ? (
            <div className="hs-vazio">
              <p className="hs-vazio-titulo">Nada com “{busca}”</p>
              <p>A busca olha o código e o nome da obra, o município e o título da conversa.</p>
              <button type="button" className="hs-link" onClick={() => setBusca("")}>
                Limpar a busca
              </button>
            </div>
          ) : (
            <>
              {q && (
                <p className="hs-resultado ds-num" role="status">
                  {totalDeConversas} {totalDeConversas === 1 ? "conversa" : "conversas"} em {filtradas.length} {filtradas.length === 1 ? "obra" : "obras"}
                </p>
              )}
              {GRUPOS.map((g) => {
                const doGrupo = reais.filter((o) => grupoDa(o) === g.id);
                if (!doGrupo.length) return null;
                return (
                  <Fragment key={g.id}>
                    <h3 className={`hs-grupo${g.id === "agora" ? " hs-grupo--agora" : ""}`}>{g.nome}</h3>
                    {doGrupo.map(linhaDaObra)}
                  </Fragment>
                );
              })}
              {deExemplo.length > 0 && (
                <div className="hs-exemplos">
                  <button type="button" className="hs-exemplos-cabeca" aria-expanded={exemplos || Boolean(q)} onClick={() => setExemplos((v) => !v)}>
                    <ChevronRight size={13} className="hs-seta" aria-hidden />
                    Exemplos e testes
                    <span className="hs-conta ds-num">{deExemplo.length}</span>
                  </button>
                  {(exemplos || q) && deExemplo.map(linhaDaObra)}
                </div>
              )}
            </>
          )}
        </div>

        <p className="hs-dica" aria-hidden>
          <Tecla>/</Tecla> busca · <Tecla>↑</Tecla>
          <Tecla>↓</Tecla> andam · <Tecla>←</Tecla>
          <Tecla>→</Tecla> obra
        </p>
      </aside>

      {/* O palco, só para dar contexto: mostra o que abriria. */}
      <div className="hs-palco">
        {selecionada ? (
          <div className="hs-palco-aberta">
            <p className="hs-palco-obra">
              <MarcaDaPrefeitura prefeitura={selecionada.o.municipio} forma="sinal" />
              <span className="ds-num">{selecionada.o.codigo}</span> {selecionada.o.nome}
            </p>
            <h2>{selecionada.c.titulo}</h2>
            <ComoTerminou e={selecionada.c.estado} />
            <p className="hs-palco-nota">A conversa abre aqui, com o chat ao lado e o resultado no palco.</p>
          </div>
        ) : (
          <p className="hs-palco-nota">Escolha uma conversa à esquerda, ou comece uma nova.</p>
        )}
      </div>
    </div>
  );
}
