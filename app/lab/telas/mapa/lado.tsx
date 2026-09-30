"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, ChevronLeft, ChevronRight, MessageSquare, PenLine, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";
import { useTempo } from "@/lib/ds/tempo";

import { RITMO, SUAVE } from "../conversa/turnos";
import { DISCIPLINA } from "../resultado-e/dados";
import { SeloDaDisciplina } from "../resultado-e/disciplina";
import { documentosDoTomo, FOLHAS, ORIGEM_NOME, RESTOS, TOMOS, type Folha } from "./dados";

/*
 * O LADO DO MAPA: o que mora na coluna da direita. Sem folha escolhida, o
 * checklist "Antes de gerar" (ou, depois de gerar, o que existe do tomo); com
 * folha, o carimbo inteiro dela e a correção.
 */

export const dd = (n: number) => String(n).padStart(2, "0");
export const precisaConferir = (f: Folha) => !!f.divergencia || f.numero == null || f.origem === "ordem";

/** O que a folha pede para conferir, em poucas palavras. O normal é nada. */
export function conferencia(f: Folha): { tom: "critico" | "aviso" | "neutro" | "mao"; texto: string } | null {
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

export function AntesDeGerar({ pronto, onVer }: { pronto: boolean; onVer: (id: string) => void }) {
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
export function Gerados({ tomo, velho }: { tomo: number; velho: boolean }) {
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
export function Sobras() {
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

export function DaFolha({ f, corrigindo, onCorrigir, onAndar }: { f: Folha; corrigindo: boolean; onCorrigir: (v: boolean) => void; onAndar: (d: number) => void }) {
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
          <button type="button" onClick={() => onAndar(-1)} disabled={i === 0} aria-label="Folha anterior (←)">
            <ChevronLeft size={15} />
          </button>
          <button type="button" onClick={() => onAndar(1)} disabled={i === FOLHAS.length - 1} aria-label="Próxima folha (→)">
            <ChevronRight size={15} />
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
