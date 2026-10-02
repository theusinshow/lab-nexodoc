"use client";

import { AnimatePresence, motion } from "motion/react";
import { Archive, ArchiveRestore, ArrowUpRight, Download, MessageSquare, Search, Settings, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import { useIr, type IdTela } from "../_comum/prototipo";
import { RITMO, SUAVE } from "../conversa/turnos";
import { ARQUIVOS, DOCUMENTOS, EVENTOS, GERADOS, TAREFAS, type Aba, type Item, type Tarefa } from "./dados";
import "../mapa/mapa.css";
import "../projetos/projetos.css";
import "./projeto.css";

export type SituacaoProjeto = "com-registros" | "item-escolhido" | "eventos" | "configuracoes" | "arquivado" | "vazio";

const ABAS: { id: Aba; nome: string; itens: Item[]; colunas: string[] }[] = [
  { id: "documentos", nome: "Documentos", itens: DOCUMENTOS, colunas: ["Arquivo", "Tipo", "Situação", "Quem", "Quando"] },
  { id: "arquivos", nome: "Arquivos enviados", itens: ARQUIVOS, colunas: ["Arquivo", "Tipo", "Tamanho", "Por onde", "Quando"] },
  { id: "gerados", nome: "Gerados pelo Nexo", itens: GERADOS, colunas: ["Arquivo", "Tipo", "Conteúdo", "Quem", "Quando"] },
  { id: "eventos", nome: "Eventos recentes", itens: EVENTOS, colunas: ["O que houve", "Tipo", "Resultado", "Quem", "Quando"] },
];

const semAcento = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** As quatro tarefas da obra, cada uma com o estado real e a ação que ela pede. */
/** Onde cada tarefa da obra leva (no protótipo). */
const LEVA: Record<string, (vazio: boolean) => [IdTela, string]> = {
  auditoria: (vazio) => (vazio ? ["nexo-auditoria", "rodando"] : ["nexo-auditoria", "pronta"]),
  ld: () => ["mapa", "lido"],
  capas: () => ["conversa", "plano-de-geracao"],
  volume: (vazio) => (vazio ? ["nexo", "soltou"] : ["nexo", "montado"]),
};

function Tarefas({ vazio, arquivado }: { vazio: boolean; arquivado: boolean }) {
  const ir = useIr();
  return (
    <div className="mp-tiles pr-tarefas">
      {TAREFAS.map((t: Tarefa) => (
        <button key={t.id} type="button" className="mp-tile pr-tarefa" disabled={arquivado} onClick={() => LEVA[t.id] && ir(...LEVA[t.id](vazio))}>
          <span className="mp-tile-rotulo">{t.nome}</span>
          <span className={`pr-tarefa-estado${!vazio && t.tom === "aviso" ? " mp-tom--aviso-texto" : ""}`}>{vazio ? "ainda não" : t.estado}</span>
          <span className="mp-tile-sub">{vazio ? { auditoria: "nenhum memorial auditado", ld: "nenhuma prancha lida", capas: "nenhuma capa gerada", volume: "nada para juntar" }[t.id] : t.detalhe}</span>
          {!arquivado && (
            <span className="pr-tarefa-acao">
              {vazio ? { auditoria: "Auditar documentos", ld: "Montar LD", capas: "Gerar capas", volume: "Montar volume" }[t.id] : t.acao}
              <ArrowUpRight size={13} />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Sem item escolhido: o que fazer agora, derivado do estado da obra. */
function Agora() {
  const ir = useIr();
  return (
    <div className="mp-lado-bloco">
      <div className="mp-lista-cabeca">
        <p className="mp-lado-titulo">O que fazer agora</p>
        <p className="mp-lado-sub">Em ordem: o que está com você, depois o que ficou para trás.</p>
      </div>
      <ul className="mp-lista mp-lista--docs pr-agora">
        <li>
          <span className="mp-lista-texto">
            <b>2 achados esperam por você</b>
            <span>Memorial geral, rev. A: os 2 impedem a entrega.</span>
          </span>
          <button type="button" className="mp-lista-ver" onClick={() => ir("nexo-auditoria", "achado")}>
            Abrir
          </button>
        </li>
        <li>
          <span className="mp-lista-texto">
            <b>O memorial elétrico não foi auditado</b>
            <span>Enviado por Carla em 22/09.</span>
          </span>
          <button type="button" className="mp-lista-ver" onClick={() => ir("nexo-auditoria", "rodando")}>
            Auditar
          </button>
        </li>
        <li>
          <span className="mp-lista-texto">
            <b>O volume ainda não foi montado</b>
            <span>LD, capas e separatrizes dos 2 tomos já existem.</span>
          </span>
          <button type="button" className="mp-lista-ver" onClick={() => ir("nexo", "soltou")}>
            Montar
          </button>
        </li>
      </ul>
      <div className="mp-lado-pe">
        <Botao variante="primary" className="mp-gerar" onClick={() => ir("conversa", "nova")}>
          <MessageSquare size={14} /> Abrir a conversa da obra
        </Botao>
      </div>
    </div>
  );
}

function DoItem({ it, aba }: { it: Item; aba: Aba }) {
  const evento = aba === "eventos";
  const ir = useIr();
  return (
    <div className="mp-lado-bloco">
      <div className="pj-obra-cabeca">
        <p className="mp-trilha">
          <span>{it.tipo}</span>
        </p>
        <p className={`pj-obra-nome${evento ? "" : " pr-mono-nome"}`}>{it.nome}</p>
      </div>
      <dl className="mp-campos">
        {it.situacao && (
          <div className="mp-campo">
            <dt>{evento ? "Resultado" : aba === "gerados" ? "Conteúdo" : "Situação"}</dt>
            <dd className={it.tom === "aviso" ? "mp-tom--aviso-texto" : it.tom === "critico" ? "mp-tom--critico-texto" : undefined}>{it.situacao}</dd>
          </div>
        )}
        {it.tamanho && (
          <div className="mp-campo">
            <dt>Tamanho</dt>
            <dd>{it.tamanho}</dd>
          </div>
        )}
        <div className="mp-campo">
          <dt>{aba === "arquivos" ? "Enviado" : evento ? "Quando" : "Registrado"}</dt>
          <dd>
            {it.quando}
            {it.quem && <small>por {it.quem}</small>}
          </dd>
        </div>
        {it.origem && (
          <div className="mp-campo">
            <dt>Por onde</dt>
            <dd>{it.origem}</dd>
          </div>
        )}
      </dl>
      <div className="mp-acoes">
        {!evento && (
          <>
            <button type="button" className="mp-acao" onClick={() => ir("nexo-auditoria", "no-documento")}>
              <ArrowUpRight size={14} /> Abrir <Tecla>O</Tecla>
            </button>
            <button type="button" className="mp-acao">
              <Download size={14} /> Baixar
            </button>
          </>
        )}
        <button type="button" className="mp-acao" onClick={() => ir("conversa", "nova")}>
          <MessageSquare size={14} /> Ver na conversa
        </button>
        {aba === "documentos" && it.situacao === "não auditado" && (
          <button type="button" className="mp-acao" onClick={() => ir("nexo-auditoria", "rodando")}>
            <Search size={14} /> Auditar este memorial
          </button>
        )}
        {!evento && (
          <button type="button" className="mp-acao mp-acao--perigo">
            <Trash2 size={14} /> Excluir
          </button>
        )}
      </div>
    </div>
  );
}

function Configuracoes({ arquivado, onFechar }: { arquivado: boolean; onFechar: () => void }) {
  const [excluindo, setExcluindo] = useState(false);
  return (
    <form className="mp-lado-bloco mp-form" onSubmit={(e) => (e.preventDefault(), onFechar())}>
      <div className="mp-lista-cabeca">
        <p className="mp-lado-titulo">Configurações do projeto</p>
      </div>
      <label>
        <span>Código</span>
        <input className="mp-mono" defaultValue="117-25" />
      </label>
      <label>
        <span>Nome</span>
        <textarea rows={2} defaultValue="Unidade Básica de Saúde da Rua São Francisco de Assis" />
      </label>
      <label>
        <span>Cliente</span>
        <input defaultValue="Prefeitura Municipal de Criciúma" />
      </label>
      <label>
        <span>Observações</span>
        <textarea rows={2} defaultValue="Projeto executivo, 2 tomos" />
      </label>
      <div className="mp-form-acoes">
        <Botao variante="primary" tamanho="sm" type="submit">
          Salvar <Tecla>↵</Tecla>
        </Botao>
        <Botao variante="quiet" tamanho="sm" type="button" onClick={onFechar}>
          Cancelar <Tecla>Esc</Tecla>
        </Botao>
      </div>
      <div className="pr-perigo">
        <button type="button" className="mp-acao">
          {arquivado ? <ArchiveRestore size={14} /> : <Archive size={14} />} {arquivado ? "Voltar para em andamento" : "Arquivar o projeto"}
        </button>
        <AnimatePresence initial={false} mode="popLayout">
          {excluindo ? (
            <motion.div key="conf" className="pr-confirma" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: RITMO.troca, ease: SUAVE }}>
              <p>Excluir a 117-25? Documentos, gerados e eventos ficam guardados no histórico, mas a obra some das listas.</p>
              <div className="mp-form-acoes">
                <Botao variante="ghost" tamanho="sm" type="button" className="pr-excluir">
                  Excluir
                </Botao>
                <Botao variante="quiet" tamanho="sm" type="button" onClick={() => setExcluindo(false)}>
                  Manter
                </Botao>
              </div>
            </motion.div>
          ) : (
            <motion.button key="btn" type="button" className="mp-acao mp-acao--perigo" onClick={() => setExcluindo(true)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Trash2 size={14} /> Excluir o projeto
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}

/**
 * O PROJETO. Tudo de uma obra, na língua das telas aprovadas: as quatro
 * tarefas em tiles no topo (estado e ação), um painel com abas para
 * documentos, arquivos, gerados e eventos, e à direita o que fazer agora ou o
 * item escolhido. Configurações abrem no lado.
 */
export function TelaProjeto({ situacao }: { situacao: SituacaoProjeto }) {
  const { k } = useTempo();
  const ir = useIr();
  const vazio = situacao === "vazio";
  const arquivado = situacao === "arquivado";
  const [aba, setAba] = useState<Aba>(situacao === "eventos" ? "eventos" : "documentos");
  const [sel, setSel] = useState<string | null>(situacao === "item-escolhido" ? "d3" : null);
  const [config, setConfig] = useState(situacao === "configuracoes");
  const [busca, setBusca] = useState("");
  const campo = useRef<HTMLInputElement>(null);
  const atual = ABAS.find((a) => a.id === aba)!;
  const visiveis = useMemo(() => (vazio ? [] : atual.itens.filter((i) => !busca || semAcento(`${i.nome} ${i.tipo} ${i.situacao ?? ""} ${i.quem ?? ""}`).includes(semAcento(busca)))), [atual, busca, vazio]);
  const item = atual.itens.find((i) => i.id === sel) ?? null;

  const andar = (d: number) => {
    if (!visiveis.length) return;
    const i = item ? visiveis.indexOf(item) : -1;
    setConfig(false);
    setSel(visiveis[Math.min(visiveis.length - 1, Math.max(0, i < 0 ? 0 : i + d))].id);
  };

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (alvo.closest("input, textarea")) {
        if (e.key === "Escape") (e.preventDefault(), config ? setConfig(false) : alvo.blur());
        return;
      }
      // Ctrl/Meta/Alt são de outro dono (Ctrl K abre a busca de qualquer tela)
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "ArrowDown" || e.key === "j") (e.preventDefault(), andar(1));
      else if (e.key === "ArrowUp" || e.key === "k") (e.preventDefault(), andar(-1));
      else if (e.key === "/") (e.preventDefault(), campo.current?.focus());
      else if (["1", "2", "3", "4"].includes(e.key)) (setAba(ABAS[Number(e.key) - 1].id), setSel(null));
      else if (e.key === "Escape" && (config || sel)) (e.preventDefault(), config ? setConfig(false) : setSel(null));
    };
    document.addEventListener("keydown", tecla, true);
    return () => document.removeEventListener("keydown", tecla, true);
  });

  const chave = config ? "config" : item ? `${aba}-${item.id}` : "agora";
  const colunas = atual.colunas;

  return (
    <div className="mp pj pr">
      <Topo atual="Projetos" />
      <header className="mp-cabeca">
        <div>
          <p className="mp-trilha">
            <MarcaDaPrefeitura prefeitura="Prefeitura Municipal de Criciúma" forma="selo" />
            <span className="mp-mono">117-25</span>
            <span>Criciúma, Prefeitura Municipal de Criciúma</span>
            {arquivado && <span className="pj-arquivada">arquivado em 17/09</span>}
          </p>
          <h1 className="pr-titulo">Unidade Básica de Saúde da Rua São Francisco de Assis</h1>
        </div>
        <div className="pr-cabeca-acoes">
          <Botao variante="quiet" tamanho="sm" onClick={() => (setSel(null), setConfig(true))}>
            <Settings size={14} /> Configurações
          </Botao>
          {arquivado ? (
            <Botao variante="ghost" tamanho="sm">
              <ArchiveRestore size={14} /> Voltar para em andamento
            </Botao>
          ) : (
            <Botao variante="ghost" tamanho="sm" onClick={() => ir("conversa", "nova")}>
              <MessageSquare size={14} /> Conversa da obra
            </Botao>
          )}
        </div>
      </header>

      <section className="mp-painel">
        <Tarefas vazio={vazio} arquivado={arquivado} />

        <div className="mp-miolo">
          <div className="mp-principal">
            <div className="mp-ferramentas">
              <div className="mp-abas" role="tablist" aria-label="O que a obra tem">
                {ABAS.map((a, i) => (
                  <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} onClick={() => (setAba(a.id), setSel(null))} title={`${a.nome} (${i + 1})`}>
                    {a.nome} <span className="ds-num">{vazio ? (a.id === "eventos" ? 1 : 0) : a.itens.length}</span>
                    {aba === a.id && <motion.i layoutId="pr-aba-marca" className="mp-aba-marca" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
                  </button>
                ))}
              </div>
              <label className="mp-busca pr-busca">
                <Search size={14} />
                <input ref={campo} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nesta obra" aria-label="Buscar nesta obra" />
                <Tecla>/</Tecla>
              </label>
            </div>

            {vazio && aba !== "eventos" ? (
              <div className="pj-sem pr-vazio">
                <p>A obra acabou de ser criada: ainda não tem {atual.nome.toLowerCase()}.</p>
                <p className="mp-g-fraco">Os arquivos entram pela conversa do Nexo, quando você pede uma das quatro tarefas acima.</p>
                <div className="pj-vazio-acoes">
                  <Botao variante="primary" tamanho="sm" onClick={() => ir("conversa", "nova")}>
                    <MessageSquare size={14} /> Abrir a conversa da obra
                  </Botao>
                </div>
              </div>
            ) : (
              <div className="mp-grade pr-grade" role="grid">
                <div className="mp-g-cab" role="row">
                  <span>#</span>
                  {colunas.map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </div>
                {(vazio ? [{ id: "e0", nome: "Criou o projeto", tipo: "projeto", quando: "hoje, 09:02", quem: "Rafael" } as Item] : visiveis).map((it, i) => {
                  const escolhido = sel === it.id && !config;
                  return (
                    <div key={it.id} role="row" aria-selected={escolhido} className="mp-g-linha" onClick={() => (setConfig(false), setSel(escolhido ? null : it.id))}>
                      {escolhido && <motion.i layoutId="pr-sel" className="mp-g-sel" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
                      <span className="mp-g-n ds-num">{i + 1}</span>
                      <span className={aba === "eventos" ? "pr-evento" : "mp-mono pr-arquivo"}>{it.nome}</span>
                      <span className="mp-g-fraco">{it.tipo}</span>
                      <span className={it.tom === "aviso" ? "mp-tom--aviso-texto" : it.tom === "critico" ? "mp-tom--critico-texto" : "mp-g-fraco"}>{it.situacao ?? it.tamanho ?? ""}</span>
                      <span className="mp-g-fraco">{aba === "arquivos" ? it.origem : it.quem}</span>
                      <span className="mp-g-fraco ds-num">{it.quando}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="mp-lado" aria-label="Detalhe">
            <div className="mp-lado-troca">
              <AnimatePresence initial={false}>
                <motion.div key={chave} className="mp-lado-camada" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
                  {config ? (
                    <Configuracoes arquivado={arquivado} onFechar={() => setConfig(false)} />
                  ) : item ? (
                    <DoItem it={item} aba={aba} />
                  ) : vazio ? (
                    <div className="mp-lado-bloco">
                      <p className="mp-lado-titulo">Por onde começar</p>
                      <p className="mp-lado-sub">Uma obra nova costuma começar pela auditoria do memorial ou pela leitura das pranchas para a LD.</p>
                    </div>
                  ) : arquivado ? (
                    <div className="mp-lado-bloco">
                      <p className="mp-lado-titulo">Arquivado</p>
                      <p className="mp-lado-sub">Entregue em 17/09. Tudo continua aqui para consulta; para gerar ou auditar de novo, volte a obra para em andamento.</p>
                    </div>
                  ) : (
                    <Agora />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </aside>
        </div>

        <footer className="mp-rodape">
          <span>
            <Tecla>1</Tecla>
            <Tecla>4</Tecla> abas
          </span>
          <span>
            <Tecla>↑</Tecla>
            <Tecla>↓</Tecla> item
          </span>
          <span>
            <Tecla>O</Tecla> abrir
          </span>
          <span>
            <Tecla>/</Tecla> buscar
          </span>
          <span>
            <Tecla>Esc</Tecla> voltar
          </span>
          <span className="mp-rodape-fim">
            {vazio ? "criado hoje por Rafael" : "31 eventos desde 18/09"}
          </span>
        </footer>
      </section>
    </div>
  );
}
