"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, ChevronDown, ChevronUp, MessageSquare, PenLine, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import { RITMO, SUAVE } from "../conversa/turnos";
import { DISCIPLINA } from "../resultado-e/dados";
import { SeloDaDisciplina } from "../resultado-e/disciplina";
import { documentosDoTomo, FOLHAS, ORIGEM_NOME, RESTOS, TOMOS, type Folha } from "./dados";
import "./mapa.css";

export type SituacaoMapa = "lendo-selos" | "lido" | "folha-aberta" | "corrigindo" | "vou-gerar" | "desatualizado" | "fora-da-divisao";

const dd = (n: number) => String(n).padStart(2, "0");
const precisaConferir = (f: Folha) => !!f.divergencia || f.numero == null || f.origem === "ordem";

/** O que a coluna "Conferência" diz. O normal é vazio: só aparece texto onde há o que olhar. */
function conferencia(f: Folha): { tom: "critico" | "aviso" | "neutro" | "mao"; texto: string } | null {
  if (f.numero == null) return { tom: "critico", texto: "carimbo ilegível, sem número" };
  if (f.divergencia) return { tom: "aviso", texto: `rev. ${f.revisao}; as outras em B` };
  if (f.origem === "ordem") return { tom: "neutro", texto: "número deduzido da ordem" };
  if (f.editado) return { tom: "mao", texto: `${f.editado.campo.toLowerCase()} corrigido à mão` };
  return null;
}

/* ------------------------------------------------------------------ */
/* O checklist "Antes de gerar": o trabalho desta tela, em quatro itens. */
/* ------------------------------------------------------------------ */

interface ItemDaLista {
  id: string;
  titulo: string;
  detalhe: string;
  folhas?: string[];
  feito: boolean;
}

function itensIniciais(tudoConferido: boolean): ItemDaLista[] {
  return [
    { id: "lidas", titulo: "33 folhas lidas", detalhe: "de 4 arquivos, em 4 disciplinas", feito: true },
    { id: "rev", titulo: "ARQ-03 e ARQ-07 na revisão A", detalhe: "As outras 10 de Arquitetura estão em B.", folhas: ["ARQ-03", "ARQ-07"], feito: tudoConferido },
    { id: "num", titulo: "ELE-04 sem número", detalhe: "O carimbo não pôde ser lido. Sem número, ela entra no fim do Elétrico.", folhas: ["ELE-04"], feito: tudoConferido },
    { id: "ordem", titulo: "EST-06 com número deduzido", detalhe: "Ninguém leu o 06: ele saiu da ordem das páginas.", folhas: ["EST-06"], feito: tudoConferido },
  ];
}

function Caixinha({ feito }: { feito: boolean }) {
  const { k } = useTempo();
  return (
    <span className={`mp-caixa${feito ? " mp-caixa--feita" : ""}`} aria-hidden>
      <svg viewBox="0 0 16 16" width="12" height="12">
        <motion.path d="M3.5 8.5 L6.8 11.5 L12.5 4.8" initial={false} animate={{ pathLength: feito ? 1 : 0, opacity: feito ? 1 : 0 }} transition={{ duration: 0.4 * k, ease: SUAVE }} />
      </svg>
    </span>
  );
}

function AntesDeGerar({ pronto, onVer }: { pronto: boolean; onVer: (id: string) => void }) {
  const { k } = useTempo();
  const [itens, setItens] = useState(() => itensIniciais(pronto));
  const feitos = itens.filter((i) => i.feito).length;
  const faltam = itens.length - feitos;
  return (
    <div className="mp-lado-bloco">
      <div className="mp-lista-cabeca">
        <p className="mp-lado-titulo">Antes de gerar</p>
        <p className="mp-lado-sub">Capa, lista de documentos e separatrizes de cada tomo. Não usa IA.</p>
        <div className="mp-lista-progresso">
          <span>
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span key={faltam} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
                {faltam === 0 ? "Tudo conferido" : faltam === 1 ? "1 item para conferir" : `${faltam} itens para conferir`}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="ds-num">
            {feitos} de {itens.length}
          </span>
        </div>
        <div className="mp-barra-progresso">
          <motion.i animate={{ scaleX: feitos / itens.length }} transition={{ duration: 0.5 * k, ease: SUAVE }} />
        </div>
      </div>
      <ul className="mp-lista">
        {itens.map((it) => (
          <li key={it.id}>
            <button
              type="button"
              className="mp-lista-marcar"
              disabled={it.id === "lidas"}
              aria-pressed={it.feito}
              aria-label={`Marcar como conferido: ${it.titulo}`}
              onClick={() => setItens((l) => l.map((x) => (x.id === it.id ? { ...x, feito: !x.feito } : x)))}
            >
              <Caixinha feito={it.feito} />
            </button>
            <div className="mp-lista-texto">
              <b className={it.feito && it.id !== "lidas" ? "mp-lista--feito" : undefined}>{it.titulo}</b>
              <span>{it.detalhe}</span>
            </div>
            {it.folhas && (
              <button type="button" className="mp-lista-ver" onClick={() => onVer(it.folhas![0])}>
                Ver
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="mp-lado-pe">
        <Botao variante={faltam === 0 ? "primary" : "ghost"} className="mp-gerar">
          {faltam === 0 ? "Confirmar e gerar" : "Gerar mesmo assim"} {faltam === 0 && <Tecla>↵</Tecla>}
        </Botao>
      </div>
    </div>
  );
}

/** Depois de gerar: o que existe do tomo, e o que ficou velho. */
function Gerados({ tomo, velho }: { tomo: number; velho: boolean }) {
  const t = TOMOS.find((x) => x.n === tomo)!;
  const docs = documentosDoTomo(t);
  return (
    <div className="mp-lado-bloco">
      <div className="mp-lista-cabeca">
        <p className="mp-lado-titulo">Tomo {dd(tomo)}, gerado</p>
        {velho ? (
          <p className="mp-lado-sub mp-lado-sub--aviso">A lista de documentos mudou depois que o volume foi montado. O PDF que você baixou ainda tem a LD antiga.</p>
        ) : (
          <p className="mp-lado-sub">Tudo gerado e montado.</p>
        )}
      </div>
      <ul className="mp-lista mp-lista--docs">
        {docs.map((d) => (
          <li key={d.id}>
            <span className="mp-lista-texto">
              <b>{d.nome}</b>
              <span className="mp-mono">{d.arquivo}</span>
            </span>
            {velho && d.tipo === "ld" ? <span className="mp-estado mp-estado--aviso">corrigida</span> : <span className="mp-estado">gerada</span>}
          </li>
        ))}
        <li>
          <span className="mp-lista-texto">
            <b>Volume, tomo {dd(tomo)}</b>
            <span className="mp-mono">Volume_117-25_TOMO-{dd(tomo)}.pdf</span>
          </span>
          {velho ? <span className="mp-estado mp-estado--aviso">desatualizado</span> : <span className="mp-estado">montado</span>}
        </li>
      </ul>
      {velho && (
        <div className="mp-lado-pe">
          <Botao variante="primary" className="mp-gerar">
            Remontar e baixar
          </Botao>
        </div>
      )}
    </div>
  );
}

/** As sobras de antes da divisão: o que são e o que fazer com elas. */
function Sobras() {
  return (
    <div className="mp-lado-bloco">
      <div className="mp-lista-cabeca">
        <p className="mp-lado-titulo">Fora da divisão</p>
        <p className="mp-lado-sub">Gerados quando a obra ainda tinha volume único. Os tomos têm capa e LD próprias; estes não entram em volume nenhum.</p>
      </div>
      <ul className="mp-lista mp-lista--docs">
        {RESTOS.map((d) => (
          <li key={d.id}>
            <span className="mp-lista-texto">
              <b>{d.nome}</b>
              <span className="mp-mono">{d.arquivo}</span>
            </span>
            <span className="mp-estado mp-estado--aviso">sem volume</span>
          </li>
        ))}
      </ul>
      <div className="mp-lado-pe">
        <Botao variante="ghost" className="mp-gerar">
          <Trash2 size={14} /> Excluir os 2
        </Botao>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* A folha aberta: o carimbo inteiro e o que fazer com ela.             */
/* ------------------------------------------------------------------ */

function Linha({ rotulo, children, nota }: { rotulo: string; children: ReactNode; nota?: ReactNode }) {
  return (
    <div className="mp-campo">
      <dt>{rotulo}</dt>
      <dd>
        {children}
        {nota && <small>{nota}</small>}
      </dd>
    </div>
  );
}

function DaFolha({ f, corrigindo, onCorrigir, onAndar }: { f: Folha; corrigindo: boolean; onCorrigir: (v: boolean) => void; onAndar: (d: number) => void }) {
  const i = FOLHAS.indexOf(f);
  const c = conferencia(f);
  return (
    <div className="mp-lado-bloco">
      <div className="mp-folha-cabeca">
        <span className="mp-folha-codigo">{f.id}</span>
        <span className="mp-folha-nav">
          <span className="ds-num">
            {i + 1} de {FOLHAS.length}
          </span>
          <button type="button" onClick={() => onAndar(-1)} disabled={i === 0} aria-label="Folha anterior (↑)">
            <ChevronUp size={15} />
          </button>
          <button type="button" onClick={() => onAndar(1)} disabled={i === FOLHAS.length - 1} aria-label="Próxima folha (↓)">
            <ChevronDown size={15} />
          </button>
        </span>
      </div>

      {corrigindo ? (
        <form className="mp-form" onSubmit={(e) => (e.preventDefault(), onCorrigir(false))}>
          <label>
            <span>Título</span>
            <textarea rows={2} defaultValue={f.titulo} autoFocus />
          </label>
          <div className="mp-form-dupla">
            <label>
              <span>Número</span>
              <input defaultValue={f.numero == null ? "" : dd(f.numero)} placeholder="faltando" inputMode="numeric" />
            </label>
            <label>
              <span>De</span>
              <input defaultValue={dd(f.total)} inputMode="numeric" />
            </label>
          </div>
          <label>
            <span>Código da prancha</span>
            <input defaultValue={f.id} className="mp-mono" />
          </label>
          <label>
            <span>Disciplina</span>
            <input defaultValue={DISCIPLINA[f.disc].nome} list="mp-disciplinas" />
            <datalist id="mp-disciplinas">
              {Object.values(DISCIPLINA).map((d) => (
                <option key={d.id} value={d.nome} />
              ))}
            </datalist>
          </label>
          <p className="mp-lado-sub">O que você mudar fica marcado como seu, e não do carimbo. O PDF da prancha não muda.</p>
          <div className="mp-form-acoes">
            <Botao variante="primary" tamanho="sm" type="submit">
              Aplicar <Tecla>↵</Tecla>
            </Botao>
            <Botao variante="quiet" tamanho="sm" type="button" onClick={() => onCorrigir(false)}>
              Cancelar <Tecla>Esc</Tecla>
            </Botao>
          </div>
        </form>
      ) : (
        <>
          <p className="mp-folha-titulo">{f.titulo}</p>
          {c && (
            <p className={`mp-folha-nota mp-tom--${c.tom}`}>
              <i />
              {f.divergencia?.motivo ?? (f.origem === "ordem" ? "O número saiu da ordem das páginas no PDF: ninguém o leu no carimbo." : `Antes: ${f.editado?.antes}`)}
            </p>
          )}
          <dl className="mp-campos">
            <Linha rotulo="Número" nota={ORIGEM_NOME[f.origem]}>
              {f.numero == null ? <span className="mp-tom--critico-texto">faltando</span> : `${dd(f.numero)} de ${dd(f.total)}`}
            </Linha>
            <Linha rotulo="Disciplina">
              <SeloDaDisciplina disc={f.disc} nome />
            </Linha>
            <Linha rotulo="Revisão">{f.revisao}</Linha>
            <Linha rotulo="Arquivo" nota={`página ${f.paginaNoPdf}`}>
              <span className="mp-mono">{f.arquivo}</span>
            </Linha>
          </dl>
          <div className="mp-acoes">
            <button type="button" className="mp-acao">
              <ArrowUpRight size={14} /> Abrir a página original <Tecla>O</Tecla>
            </button>
            <button type="button" className="mp-acao" onClick={() => onCorrigir(true)}>
              <PenLine size={14} /> Corrigir a folha <Tecla>E</Tecla>
            </button>
            <button type="button" className="mp-acao">
              <MessageSquare size={14} /> Alterar no chat
            </button>
            <button type="button" className="mp-acao mp-acao--perigo">
              <Trash2 size={14} /> Remover do volume
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* A tela.                                                             */
/* ------------------------------------------------------------------ */

type Recorte = "todas" | "conferir" | "mao";

/**
 * O MAPA DO VOLUME. Um painel só: em cima, um tile por tomo (o número de folhas
 * e o que falta conferir); no meio, a tabela das folhas como o carimbo as disse;
 * à direita, o checklist "Antes de gerar" ou, com uma folha escolhida, o
 * carimbo inteiro dela. Embaixo, as teclas. Cor só onde há o que conferir.
 */
export function TelaMapa({ situacao }: { situacao: SituacaoMapa }) {
  const { k } = useTempo();
  const inicial = situacao === "folha-aberta" ? "ARQ-03" : situacao === "corrigindo" ? "ELE-04" : null;
  const [sel, setSel] = useState<string | null>(inicial);
  const [corrigindo, setCorrigindo] = useState(situacao === "corrigindo");
  const [tomo, setTomo] = useState(situacao === "fora-da-divisao" ? 0 : inicial === "ELE-04" ? 2 : 1);
  const [recorte, setRecorte] = useState<Recorte>("todas");
  const [busca, setBusca] = useState("");
  const [lidas, setLidas] = useState(situacao === "lendo-selos" ? 7 : FOLHAS.length);
  const grade = useRef<HTMLDivElement>(null);
  const campoDeBusca = useRef<HTMLInputElement>(null);
  const gerado = situacao === "desatualizado";

  useEffect(() => {
    if (situacao !== "lendo-selos" || lidas >= FOLHAS.length) return;
    const t = setTimeout(() => setLidas((n) => n + 1), 380 * k);
    return () => clearTimeout(t);
  }, [situacao, lidas, k]);

  const ordem = useMemo(() => new Map(FOLHAS.map((f, i) => [f.id, i])), []);
  const doTomo = (n: number) => FOLHAS.filter((f) => TOMOS.find((t) => t.n === n)!.disciplinas.includes(f.disc));
  const visiveis = useMemo(() => {
    if (tomo === 0) return [];
    const q = busca.trim().toLowerCase();
    return doTomo(tomo).filter(
      (f) =>
        (recorte === "todas" || (recorte === "conferir" ? precisaConferir(f) : !!f.editado)) &&
        (!q || f.id.toLowerCase().includes(q) || f.titulo.toLowerCase().includes(q)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tomo, recorte, busca]);
  const folha = FOLHAS.find((f) => f.id === sel) ?? null;

  const escolher = (id: string | null) => {
    setCorrigindo(false);
    setSel(id);
    if (id) {
      const f = FOLHAS.find((x) => x.id === id)!;
      const t = TOMOS.find((x) => x.disciplinas.includes(f.disc))!.n;
      if (t !== tomo) setTomo(t);
    }
  };
  const andar = (d: number) => {
    const lista = visiveis.length ? visiveis : FOLHAS;
    const i = folha ? lista.indexOf(folha) : -1;
    const prox = lista[Math.min(lista.length - 1, Math.max(0, i < 0 ? 0 : i + d))];
    if (prox) escolher(prox.id);
  };

  // A linha escolhida sempre à vista; a de partida já está, então não rola ao abrir.
  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) return void (primeira.current = false);
    if (sel) grade.current?.querySelector(`[data-folha="${sel}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [sel]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (alvo.closest("input, textarea")) {
        if (e.key === "Escape") {
          e.preventDefault();
          if (corrigindo) setCorrigindo(false);
          else (alvo as HTMLInputElement).blur();
        }
        return;
      }
      if (e.key === "ArrowDown" || e.key === "j") (e.preventDefault(), andar(1));
      else if (e.key === "ArrowUp" || e.key === "k") (e.preventDefault(), andar(-1));
      else if ((e.key === "e" || e.key === "E") && folha) (e.preventDefault(), setCorrigindo(true));
      else if (e.key === "/") (e.preventDefault(), campoDeBusca.current?.focus());
      else if (e.key === "Escape" && (corrigindo || sel)) {
        e.preventDefault();
        if (corrigindo) setCorrigindo(false);
        else setSel(null);
      }
    };
    document.addEventListener("keydown", tecla, true);
    return () => document.removeEventListener("keydown", tecla, true);
  });

  const lidasDoTomo = (n: number) => doTomo(n).filter((f) => (ordem.get(f.id) ?? 0) < lidas).length;
  const lendo = lidas < FOLHAS.length;
  const pronto = situacao === "vou-gerar";
  const contagem = (r: Recorte) => (tomo === 0 ? 0 : doTomo(tomo).filter((f) => (r === "todas" ? true : r === "conferir" ? precisaConferir(f) : !!f.editado)).length);

  return (
    <div className="mp">
      <Topo atual="Painel" />
      <header className="mp-cabeca">
        <div>
          <p className="mp-trilha">
            <MarcaDaPrefeitura prefeitura="Criciúma" forma="sinal" />
            <span className="mp-mono">117-25</span>
            <span>UBS da Rua São Francisco de Assis</span>
          </p>
          <h1>Mapa do volume</h1>
        </div>
        <Botao variante="ghost" tamanho="sm">
          Voltar à conversa
        </Botao>
      </header>

      <section className="mp-painel">
        {/* um tile por tomo: o número que importa e o que falta */}
        <div className="mp-tiles" role="tablist" aria-label="Tomos">
          {TOMOS.map((t) => {
            const fs = doTomo(t.n);
            const pend = fs.filter(precisaConferir).length;
            const lidasAqui = lidasDoTomo(t.n);
            return (
              <button key={t.n} type="button" role="tab" aria-selected={tomo === t.n} className="mp-tile" onClick={() => (setTomo(t.n), setSel(null))}>
                <span className="mp-tile-rotulo">Tomo {dd(t.n)}</span>
                <span className="mp-tile-valor ds-num">
                  {lendo ? `${lidasAqui} de ${fs.length}` : fs.length}
                  <small>{lendo ? "lidas" : "folhas"}</small>
                </span>
                <span className="mp-tile-sub">
                  {t.paginas} páginas, {t.disciplinas.map((d) => DISCIPLINA[d].sigla).join(" e ")}
                  {!lendo && !gerado && situacao !== "fora-da-divisao" && (pend > 0 && !pronto ? <em className="mp-tom--aviso-texto">{pend} para conferir</em> : <em>conferido</em>)}
                  {gerado && (t.n === 1 ? <em className="mp-tom--aviso-texto">volume velho</em> : <em>montado</em>)}
                  {situacao === "fora-da-divisao" && <em>montado</em>}
                </span>
                {lendo && (
                  <span className="mp-tile-leitura" aria-hidden>
                    <motion.i animate={{ scaleX: lidasAqui / fs.length }} transition={{ duration: 0.4 * k, ease: SUAVE }} />
                  </span>
                )}
                {tomo === t.n && <motion.i layoutId="mp-tile-marca" className="mp-tile-marca" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
              </button>
            );
          })}
          {situacao === "fora-da-divisao" && (
            <button type="button" role="tab" aria-selected={tomo === 0} className="mp-tile mp-tile--resto" onClick={() => (setTomo(0), setSel(null))}>
              <span className="mp-tile-rotulo">Fora da divisão</span>
              <span className="mp-tile-valor ds-num">
                {RESTOS.length}
                <small>documentos</small>
              </span>
              <span className="mp-tile-sub">
                de antes dos tomos<em className="mp-tom--aviso-texto">sem volume</em>
              </span>
              {tomo === 0 && <motion.i layoutId="mp-tile-marca" className="mp-tile-marca" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
            </button>
          )}
          <div className="mp-divisao">
            <span className="mp-tile-rotulo">Divisão</span>
            <span className="mp-divisao-valor">
              <span className="ds-num">412</span> páginas em
              <button type="button" className="mp-divisao-tomos" aria-haspopup="listbox">
                2 tomos <ChevronDown size={13} />
              </button>
            </span>
            <span className="mp-tile-sub">automática, pelas disciplinas</span>
          </div>
        </div>

        <div className="mp-miolo">
          <div className="mp-principal">
            {tomo === 0 ? (
              <>
                <div className="mp-ferramentas">
                  <p className="mp-ferramentas-texto">2 documentos de antes da divisão em tomos</p>
                </div>
                <div className="mp-grade mp-grade--docs" role="grid">
                  <div className="mp-g-cab" role="row">
                    <span>#</span>
                    <span>Documento</span>
                    <span>Arquivo</span>
                    <span>Feito para</span>
                    <span />
                  </div>
                  {RESTOS.map((d, i) => (
                    <div key={d.id} className="mp-g-linha" role="row">
                      <span className="mp-g-n ds-num">{i + 1}</span>
                      <span>{d.nome}</span>
                      <span className="mp-mono mp-g-fraco">{d.arquivo}</span>
                      <span className="mp-g-fraco">{d.detalhe}</span>
                      <span className="mp-g-acao">
                        <ArrowUpRight size={14} />
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="mp-ferramentas">
                  <div className="mp-abas" role="tablist" aria-label="Recorte">
                    {(
                      [
                        ["todas", "Todas"],
                        ["conferir", "Para conferir"],
                        ["mao", "Corrigidas à mão"],
                      ] as [Recorte, string][]
                    ).map(([id, nome]) => (
                      <button key={id} type="button" role="tab" aria-selected={recorte === id} onClick={() => setRecorte(id)}>
                        {nome} <span className="ds-num">{contagem(id)}</span>
                        {recorte === id && <motion.i layoutId="mp-aba-marca" className="mp-aba-marca" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
                      </button>
                    ))}
                  </div>
                  <label className="mp-busca">
                    <Search size={14} />
                    <input ref={campoDeBusca} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar código ou título" aria-label="Buscar folha" />
                    <Tecla>/</Tecla>
                  </label>
                </div>

                <div className="mp-grade" role="grid" ref={grade} aria-rowcount={visiveis.length}>
                  <div className="mp-g-cab" role="row">
                    <span>#</span>
                    <span>Folha</span>
                    <span>Nº</span>
                    <span>Título no carimbo</span>
                    <span>Disc.</span>
                    <span>Rev.</span>
                    <span>Conferência</span>
                  </div>
                  {visiveis.map((f, i) => {
                    const lida = (ordem.get(f.id) ?? 0) < lidas;
                    const c = conferencia(f);
                    const escolhida = sel === f.id;
                    return (
                      <div
                        key={f.id}
                        role="row"
                        data-folha={f.id}
                        aria-selected={escolhida}
                        className={`mp-g-linha${lida ? "" : " mp-g-linha--lendo"}`}
                        onClick={() => lida && escolher(escolhida ? null : f.id)}
                      >
                        {escolhida && <motion.i layoutId="mp-g-sel" className="mp-g-sel" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
                        <span className="mp-g-n ds-num">{i + 1}</span>
                        <span className="mp-mono">{f.id}</span>
                        {lida ? (
                          <>
                            <span className={`ds-num mp-mono${f.numero == null ? " mp-tom--critico-texto" : ""}`}>
                              {f.numero == null ? "—" : dd(f.numero)}
                              <span className="mp-g-fraco">/{dd(f.total)}</span>
                            </span>
                            <span className="mp-g-titulo">{f.titulo}</span>
                            <span>
                              <SeloDaDisciplina disc={f.disc} />
                            </span>
                            <span className="mp-g-fraco">{f.revisao}</span>
                            <span>
                              {c && (
                                <span className={`mp-conf mp-tom--${c.tom}`}>
                                  <i />
                                  {c.texto}
                                </span>
                              )}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="mp-g-esqueleto" style={{ width: 34 }} />
                            <span className="mp-g-esqueleto" style={{ width: `${40 + ((i * 37) % 45)}%` }} />
                            <span className="mp-g-esqueleto" style={{ width: 30 }} />
                            <span className="mp-g-esqueleto" style={{ width: 14 }} />
                            <span />
                          </>
                        )}
                      </div>
                    );
                  })}
                  {visiveis.length === 0 && <p className="mp-g-vazio">Nenhuma folha com esse filtro.</p>}
                </div>
              </>
            )}
          </div>

          <aside className="mp-lado" aria-label={folha ? `Folha ${folha.id}` : "Antes de gerar"}>
            <div className="mp-lado-troca">
              <AnimatePresence initial={false}>
                <motion.div
                  key={folha ? `${folha.id}-${corrigindo ? "c" : "v"}` : `lista-${tomo}`}
                  className="mp-lado-camada"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: RITMO.troca * k, ease: SUAVE }}
                >
                  {folha ? (
                    <DaFolha f={folha} corrigindo={corrigindo} onCorrigir={setCorrigindo} onAndar={andar} />
                  ) : tomo === 0 ? (
                    <Sobras />
                  ) : gerado || situacao === "fora-da-divisao" ? (
                    <Gerados tomo={tomo} velho={gerado && tomo === 1} />
                  ) : lendo ? (
                    <div className="mp-lado-bloco">
                      <p className="mp-lado-titulo">Lendo os selos</p>
                      <p className="mp-lado-sub">
                        <span className="ds-num">
                          {lidas} de {FOLHAS.length}
                        </span>{" "}
                        folhas. As que já foram lidas podem ser abertas enquanto o resto termina.
                      </p>
                      <div className="mp-barra-progresso">
                        <motion.i animate={{ scaleX: lidas / FOLHAS.length }} transition={{ duration: 0.4 * k, ease: SUAVE }} />
                      </div>
                    </div>
                  ) : (
                    <AntesDeGerar pronto={pronto} onVer={(id) => escolher(id)} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </aside>
        </div>

        <footer className="mp-rodape">
          <span>
            <Tecla>↑</Tecla>
            <Tecla>↓</Tecla> folha
          </span>
          <span>
            <Tecla>E</Tecla> corrigir
          </span>
          <span>
            <Tecla>O</Tecla> abrir a página
          </span>
          <span>
            <Tecla>/</Tecla> buscar
          </span>
          <span>
            <Tecla>Esc</Tecla> voltar
          </span>
          <span className="mp-rodape-fim ds-num">{lendo ? `lendo ${lidas} de ${FOLHAS.length}` : `${FOLHAS.length} folhas lidas de 4 arquivos`}</span>
        </footer>
      </section>
    </div>
  );
}
