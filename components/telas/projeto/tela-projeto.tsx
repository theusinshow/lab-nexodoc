"use client";

import { AnimatePresence, motion } from "motion/react";
import { Archive, ArchiveRestore, ArrowUpRight, Download, FileSearch, MessageSquare, Search, Settings, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Botao, Girando, Tecla } from "@/components/ds/basicos";
import { useMoldura } from "@/components/moldura/contexto";
import { linkDoNexo } from "@/lib/contexto-da-url";
import { useTempo } from "@/lib/ds/tempo";
import { linkDoAchado } from "@/lib/link-do-achado";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { quandoNaLinha } from "../comum/quando";
import { RITMO, SUAVE } from "../comum/ritmo";
import { plural, semAcento } from "../comum/texto";
import "../mapa/mapa.css";
import "../projetos/projetos.css";
import "./projeto.css";

export type Aba = "documentos" | "arquivos" | "gerados" | "eventos";

export type TarefaDaObra = {
  id: "auditoria" | "ld" | "capas" | "volume";
  nome: string;
  feito: boolean;
  estado: string;
  detalhe: string;
  quando: string | null;
  acao: string;
  href: string;
  /** Há achado aberto: o estado sai na cor de aviso. */
  aviso: boolean;
};

export type ItemDaObra = {
  id: string;
  nome: string;
  tipo: string;
  situacao?: string;
  tom?: "aviso" | "critico";
  tamanho?: string;
  origem?: string;
  quando: string;
  quem?: string;
  /** Só quando o armazenamento dá um endereço: sem ele, não há botão. */
  baixar?: string;
  /** O gerado é de uma auditoria: abre o parecer. */
  parecer?: string;
};

export type ObraAberta = {
  id: string;
  codigo: string;
  nome: string;
  cliente: string;
  cidade: string;
  observacoes: string;
  arquivada: boolean;
  arquivadaEm: string | null;
  contagens: { documentos: number; arquivos: number; gerados: number; eventos: number };
  primeiroEvento: string | null;
  comVoce: number;
  parecerComVoce: string | null;
  /** Um achado desse parecer que está com você: o link abre a fila nele. */
  achadoComVoce: string | null;
  tituloDoParecerComVoce: string | null;
};

const ABAS: { id: Aba; nome: string; colunas: string[] }[] = [
  { id: "documentos", nome: "Documentos", colunas: ["Arquivo", "Tipo", "Situação", "Quem", "Quando"] },
  { id: "arquivos", nome: "Arquivos enviados", colunas: ["Arquivo", "Tipo", "Tamanho", "Por onde", "Quando"] },
  { id: "gerados", nome: "Gerados pelo Nexo", colunas: ["Arquivo", "Tipo", "Tamanho", "Quem", "Quando"] },
  { id: "eventos", nome: "Eventos recentes", colunas: ["O que houve", "Tipo", "Resumo", "Quem", "Quando"] },
];

/** As quatro tarefas da obra, cada uma com o estado real e a ação que ela pede. */
function Tarefas({ tarefas, arquivada }: { tarefas: TarefaDaObra[]; arquivada: boolean }) {
  const router = useRouter();
  return (
    <div className="mp-tiles pr-tarefas">
      {tarefas.map((t) => (
        <button key={t.id} type="button" className="mp-tile pr-tarefa" disabled={arquivada} onClick={() => router.push(t.href)} data-tarefa={t.id}>
          <span className="mp-tile-rotulo">{t.nome}</span>
          <span className={`pr-tarefa-estado${t.aviso ? " mp-tom--aviso-texto" : ""}`}>{t.estado}</span>
          <span className="mp-tile-sub">
            {t.detalhe}
            {t.quando ? `, ${quandoNaLinha(t.quando)}` : ""}
          </span>
          {!arquivada && (
            <span className="pr-tarefa-acao">
              {t.acao}
              <ArrowUpRight size={13} />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Sem item escolhido: o que fazer agora, derivado do estado da obra. */
function Agora({ obra, tarefas }: { obra: ObraAberta; tarefas: TarefaDaObra[] }) {
  const router = useRouter();
  const [auditoria, ld, , volume] = tarefas;
  const passos: { titulo: string; sub: string; acao: string; href: string }[] = [];
  if (obra.comVoce && obra.parecerComVoce)
    passos.push({
      titulo: `${plural(obra.comVoce, "achado espera", "achados esperam")} por você`,
      sub: obra.tituloDoParecerComVoce ?? "",
      acao: "Abrir",
      href: linkDoAchado({ base: "", auditId: obra.parecerComVoce, findingId: obra.achadoComVoce, fila: "meus" }),
    });
  if (!auditoria.feito) passos.push({ titulo: "Nenhum memorial foi auditado", sub: "O Nexo lê o memorial e aponta o que não bate com a obra.", acao: "Auditar", href: auditoria.href });
  if (!ld.feito) passos.push({ titulo: "A lista de documentos não foi gerada", sub: "Sai dos carimbos das pranchas.", acao: "Montar", href: ld.href });
  else if (!volume.feito) passos.push({ titulo: "O volume ainda não foi montado", sub: "A LD já existe.", acao: "Montar", href: volume.href });

  return (
    <div className="mp-lado-bloco">
      <div className="mp-lista-cabeca">
        <p className="mp-lado-titulo">O que fazer agora</p>
        <p className="mp-lado-sub">{passos.length ? "Em ordem: o que está com você, depois o que ficou para trás." : "Nada pendente nesta obra."}</p>
      </div>
      {passos.length > 0 && (
        <ul className="mp-lista mp-lista--docs pr-agora">
          {passos.map((p) => (
            <li key={p.titulo}>
              <span className="mp-lista-texto">
                <b>{p.titulo}</b>
                {p.sub && <span>{p.sub}</span>}
              </span>
              <button type="button" className="mp-lista-ver" onClick={() => router.push(p.href)}>
                {p.acao}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mp-lado-pe">
        <Botao variante="primary" className="mp-gerar" onClick={() => router.push(linkDoNexo({ projeto: obra.id }))}>
          <MessageSquare size={14} /> Abrir a conversa da obra
        </Botao>
      </div>
    </div>
  );
}

function DoItem({ it, aba, obraId }: { it: ItemDaObra; aba: Aba; obraId: string }) {
  const router = useRouter();
  const evento = aba === "eventos";
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
            <dt>{evento ? "Resumo" : aba === "gerados" ? "Tamanho" : "Situação"}</dt>
            <dd className={it.tom === "aviso" ? "mp-tom--aviso-texto" : it.tom === "critico" ? "mp-tom--critico-texto" : undefined}>{it.situacao}</dd>
          </div>
        )}
        {it.tamanho && aba !== "gerados" && (
          <div className="mp-campo">
            <dt>Tamanho</dt>
            <dd>{it.tamanho}</dd>
          </div>
        )}
        <div className="mp-campo">
          <dt>{aba === "arquivos" ? "Enviado" : evento ? "Quando" : "Registrado"}</dt>
          <dd>
            {quandoNaLinha(it.quando)}
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
        {it.parecer && (
          <button type="button" className="mp-acao" onClick={() => router.push(`/nexo?auditoria=${encodeURIComponent(it.parecer!)}`)}>
            <FileSearch size={14} /> Abrir o parecer <Tecla>O</Tecla>
          </button>
        )}
        {it.baixar && (
          <a className="mp-acao" href={it.baixar} target="_blank" rel="noreferrer">
            <Download size={14} /> Baixar
          </a>
        )}
        <button type="button" className="mp-acao" onClick={() => router.push(linkDoNexo({ projeto: obraId }))}>
          <MessageSquare size={14} /> Ver na conversa da obra
        </button>
      </div>
    </div>
  );
}

function Configuracoes({ obra, onFechar }: { obra: ObraAberta; onFechar: () => void }) {
  const router = useRouter();
  const { avisar } = useMoldura();
  const [form, setForm] = useState({ code: obra.codigo, name: obra.nome, client: obra.cliente, description: obra.observacoes });
  const [erro, setErro] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const [enviando, iniciar] = useTransition();
  const muda = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function mandar(metodo: "PATCH" | "DELETE", corpo: Record<string, string> | null, depois: () => void) {
    setErro("");
    iniciar(async () => {
      try {
        const resposta = await fetch(`/api/projects/${obra.id}`, {
          method: metodo,
          headers: corpo ? { "Content-Type": "application/json" } : undefined,
          body: corpo ? JSON.stringify(corpo) : undefined,
        });
        const dados = (await resposta.json().catch(() => null)) as { error?: string } | null;
        if (!resposta.ok) throw new Error(dados?.error ?? "Não foi possível atualizar o projeto.");
        depois();
      } catch (falha) {
        setErro(falha instanceof Error ? falha.message : "Não foi possível atualizar o projeto.");
      }
    });
  }

  function salvar() {
    if (!form.code.trim() || !form.name.trim()) {
      setErro("Código e nome são obrigatórios.");
      return;
    }
    mandar("PATCH", { code: form.code.trim(), name: form.name.trim(), client: form.client.trim(), description: form.description.trim() }, () => {
      avisar({ tom: "ok", titulo: "Projeto salvo" });
      onFechar();
      router.refresh();
    });
  }

  return (
    <form
      className="mp-lado-bloco mp-form"
      onSubmit={(e) => {
        e.preventDefault();
        salvar();
      }}
    >
      <div className="mp-lista-cabeca">
        <p className="mp-lado-titulo">Configurações do projeto</p>
      </div>
      <label>
        <span>Código</span>
        <input className="mp-mono" value={form.code} onChange={muda("code")} />
      </label>
      <label>
        <span>Nome</span>
        <textarea rows={2} value={form.name} onChange={muda("name")} />
      </label>
      <label>
        <span>Cliente</span>
        <input value={form.client} onChange={muda("client")} />
      </label>
      <label>
        <span>Observações</span>
        <textarea rows={2} value={form.description} onChange={muda("description")} />
      </label>
      {erro && (
        <p className="mp-tom--critico-texto" role="alert">
          {erro}
        </p>
      )}
      <div className="mp-form-acoes">
        <Botao variante="primary" tamanho="sm" type="submit" disabled={enviando}>
          {enviando && <Girando tamanho={12} />}
          Salvar <Tecla>↵</Tecla>
        </Botao>
        <Botao variante="quiet" tamanho="sm" type="button" onClick={onFechar}>
          Cancelar <Tecla>Esc</Tecla>
        </Botao>
      </div>
      <div className="pr-perigo">
        <button
          type="button"
          className="mp-acao"
          disabled={enviando}
          onClick={() =>
            mandar("PATCH", { status: obra.arquivada ? "ACTIVE" : "ARCHIVED" }, () => {
              avisar({ tom: "ok", titulo: obra.arquivada ? `${obra.codigo} voltou para em andamento` : `${obra.codigo} arquivado` });
              onFechar();
              router.refresh();
            })
          }
        >
          {obra.arquivada ? <ArchiveRestore size={14} /> : <Archive size={14} />} {obra.arquivada ? "Voltar para em andamento" : "Arquivar o projeto"}
        </button>
        <AnimatePresence initial={false} mode="popLayout">
          {excluindo ? (
            <motion.div key="conf" className="pr-confirma" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: RITMO.troca, ease: SUAVE }}>
              <p>Excluir a {obra.codigo}? Documentos, gerados e eventos ficam guardados no histórico, mas a obra some das listas.</p>
              <div className="mp-form-acoes">
                <Botao
                  variante="ghost"
                  tamanho="sm"
                  type="button"
                  className="pr-excluir"
                  disabled={enviando}
                  onClick={() =>
                    mandar("DELETE", null, () => {
                      avisar({ tom: "ok", titulo: `${obra.codigo} excluído` });
                      router.push("/projetos");
                    })
                  }
                >
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
 * O PROJETO (veio do lab: app/lab/telas/projeto). Tudo de uma obra: as quatro
 * tarefas em tiles no topo (estado e ação), um painel com abas para
 * documentos, arquivos, gerados e eventos, e à direita o que fazer agora ou o
 * item escolhido. Configurações abrem no lado.
 */
export function TelaProjeto({ obra, tarefas, itens }: { obra: ObraAberta; tarefas: TarefaDaObra[]; itens: Record<Aba, ItemDaObra[]> }) {
  const { k } = useTempo();
  const router = useRouter();
  const [aba, setAba] = useState<Aba>("documentos");
  const [sel, setSel] = useState<string | null>(null);
  const [config, setConfig] = useState(false);
  const [busca, setBusca] = useState("");
  const campo = useRef<HTMLInputElement>(null);
  const atual = ABAS.find((a) => a.id === aba)!;
  const lista = itens[aba];
  const visiveis = useMemo(
    () => lista.filter((i) => !busca || semAcento(`${i.nome} ${i.tipo} ${i.situacao ?? ""} ${i.quem ?? ""}`).includes(semAcento(busca))),
    [lista, busca],
  );
  const item = lista.find((i) => i.id === sel) ?? null;

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
      else if ((e.key === "o" || e.key === "O") && item?.parecer) (e.preventDefault(), router.push(`/nexo?auditoria=${encodeURIComponent(item.parecer)}`));
      else if (["1", "2", "3", "4"].includes(e.key)) (setAba(ABAS[Number(e.key) - 1].id), setSel(null));
      else if (e.key === "Escape" && (config || sel)) (e.preventDefault(), config ? setConfig(false) : setSel(null));
    };
    document.addEventListener("keydown", tecla, true);
    return () => document.removeEventListener("keydown", tecla, true);
  });

  const chave = config ? "config" : item ? `${aba}-${item.id}` : "agora";
  const vazia = obra.contagens.documentos + obra.contagens.arquivos + obra.contagens.gerados === 0;

  return (
    <div className="mp pj pr">
      <header className="mp-cabeca">
        <div>
          <p className="mp-trilha">
            <MarcaDaPrefeitura prefeitura={obra.cliente} forma="selo" />
            <span className="mp-mono">{obra.codigo}</span>
            {(obra.cidade || obra.cliente) && <span>{[obra.cidade, obra.cliente].filter((x, i, a) => x && a.indexOf(x) === i).join(", ")}</span>}
            {obra.arquivada && <span className="pj-arquivada">arquivado{obra.arquivadaEm ? ` em ${quandoNaLinha(obra.arquivadaEm)}` : ""}</span>}
          </p>
          <h1 className="pr-titulo">{obra.nome}</h1>
        </div>
        <div className="pr-cabeca-acoes">
          <Botao variante="quiet" tamanho="sm" onClick={() => (setSel(null), setConfig(true))}>
            <Settings size={14} /> Configurações
          </Botao>
          {!obra.arquivada && (
            <Botao variante="ghost" tamanho="sm" onClick={() => router.push(linkDoNexo({ projeto: obra.id }))}>
              <MessageSquare size={14} /> Conversa da obra
            </Botao>
          )}
        </div>
      </header>

      <section className="mp-painel">
        <Tarefas tarefas={tarefas} arquivada={obra.arquivada} />

        <div className="mp-miolo">
          <div className="mp-principal">
            <div className="mp-ferramentas">
              <div className="mp-abas" role="tablist" aria-label="O que a obra tem">
                {ABAS.map((a, i) => (
                  <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} onClick={() => (setAba(a.id), setSel(null))} title={`${a.nome} (${i + 1})`}>
                    {a.nome} <span className="ds-num">{obra.contagens[a.id]}</span>
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

            {lista.length === 0 ? (
              <div className="pj-sem pr-vazio">
                <p>A obra ainda não tem {atual.nome.toLowerCase()}.</p>
                <p className="mp-g-fraco">Os arquivos entram pela conversa do Nexo, quando você pede uma das quatro tarefas acima.</p>
                {!obra.arquivada && (
                  <div className="pj-vazio-acoes">
                    <Botao variante="primary" tamanho="sm" onClick={() => router.push(linkDoNexo({ projeto: obra.id }))}>
                      <MessageSquare size={14} /> Abrir a conversa da obra
                    </Botao>
                  </div>
                )}
              </div>
            ) : (
              <div className="mp-grade pr-grade" role="grid">
                <div className="mp-g-cab" role="row">
                  <span>#</span>
                  {atual.colunas.map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </div>
                {visiveis.map((it, i) => {
                  const escolhido = sel === it.id && !config;
                  return (
                    <div key={it.id} role="row" aria-selected={escolhido} className="mp-g-linha" onClick={() => (setConfig(false), setSel(escolhido ? null : it.id))}>
                      {escolhido && <motion.i layoutId="pr-sel" className="mp-g-sel" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
                      <span className="mp-g-n ds-num">{i + 1}</span>
                      <span className={aba === "eventos" ? "pr-evento" : "mp-mono pr-arquivo"}>{it.nome}</span>
                      <span className="mp-g-fraco">{it.tipo}</span>
                      <span className={it.tom === "aviso" ? "mp-tom--aviso-texto" : it.tom === "critico" ? "mp-tom--critico-texto" : "mp-g-fraco"}>
                        {aba === "arquivos" ? (it.tamanho ?? "") : (it.situacao ?? it.tamanho ?? "")}
                      </span>
                      <span className="mp-g-fraco">{aba === "arquivos" ? it.origem : it.quem}</span>
                      <span className="mp-g-fraco ds-num">{quandoNaLinha(it.quando)}</span>
                    </div>
                  );
                })}
                {visiveis.length === 0 && <p className="mp-g-vazio">Nada com “{busca}” nesta aba.</p>}
              </div>
            )}
          </div>

          <aside className="mp-lado" aria-label="Detalhe">
            <div className="mp-lado-troca">
              <AnimatePresence initial={false}>
                <motion.div key={chave} className="mp-lado-camada" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
                  {config ? (
                    <Configuracoes obra={obra} onFechar={() => setConfig(false)} />
                  ) : item ? (
                    <DoItem it={item} aba={aba} obraId={obra.id} />
                  ) : obra.arquivada ? (
                    <div className="mp-lado-bloco">
                      <p className="mp-lado-titulo">Arquivado</p>
                      <p className="mp-lado-sub">Tudo continua aqui para consulta; para gerar ou auditar de novo, volte a obra para em andamento em Configurações.</p>
                    </div>
                  ) : vazia ? (
                    <div className="mp-lado-bloco">
                      <p className="mp-lado-titulo">Por onde começar</p>
                      <p className="mp-lado-sub">Uma obra nova costuma começar pela auditoria do memorial ou pela leitura das pranchas para a LD.</p>
                    </div>
                  ) : (
                    <Agora obra={obra} tarefas={tarefas} />
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
            <Tecla>/</Tecla> buscar
          </span>
          <span>
            <Tecla>Esc</Tecla> voltar
          </span>
          <span className="mp-rodape-fim">
            {plural(obra.contagens.eventos, "evento", "eventos")}
            {obra.primeiroEvento ? ` desde ${quandoNaLinha(obra.primeiroEvento)}` : ""}
          </span>
        </footer>
      </section>
    </div>
  );
}
