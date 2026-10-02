"use client";

import { AnimatePresence, motion } from "motion/react";
import { Archive, ArchiveRestore, ArrowRight, FileSearch, Layers, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Botao, Girando, Tecla } from "@/components/ds/basicos";
import { useMoldura } from "@/components/moldura/contexto";
import { linkDoNexo } from "@/lib/contexto-da-url";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { diasDesde, quandoNaLinha } from "../comum/quando";
import { RITMO, SUAVE } from "../comum/ritmo";
import { plural, semAcento } from "../comum/texto";
import "../mapa/mapa.css";
import "./projetos.css";

export type ObraDaLista = {
  id: string;
  codigo: string;
  nome: string;
  cliente: string;
  cidade: string;
  observacoes: string;
  arquivada: boolean;
  atualizadoEm: string;
  contagens: { documentos: number; arquivos: number; gerados: number; eventos: number };
  /** Achados atribuídos e abertos na obra, e quantos com quem lê. */
  pendentes: number;
  comVoce: number;
  /** Os três últimos eventos, o mais novo primeiro. */
  ultimos: { quando: string; oque: string }[];
};

type Recorte = "ativos" | "arquivados" | "todos";
const RECORTES: [Recorte, string][] = [
  ["ativos", "Em andamento"],
  ["arquivados", "Arquivados"],
  ["todos", "Todos"],
];
const noRecorte = (r: Recorte, o: ObraDaLista) => (r === "todos" ? true : r === "arquivados" ? o.arquivada : !o.arquivada);
const casa = (q: string, o: ObraDaLista) => !q || [o.codigo, o.nome, o.cliente, o.cidade, o.observacoes].some((c) => semAcento(c).includes(semAcento(q)));
/** "5 documentos, 9 arquivos, 7 gerados" — só o que existe. */
const resumo = (c: ObraDaLista["contagens"]) =>
  [
    c.documentos && plural(c.documentos, "documento", "documentos"),
    c.arquivos && plural(c.arquivos, "arquivo", "arquivos"),
    c.gerados && plural(c.gerados, "gerado", "gerados"),
  ]
    .filter(Boolean)
    .join(", ");
/** Obra em andamento sem mudança há mais disto entra em "paradas". */
const PARADA_EM_DIAS = 20;

/** Sem obra escolhida: por onde começar. Quem espera por você, e o que esfriou. */
function PorOndeComecar({ obras, onAbrir }: { obras: ObraDaLista[]; onAbrir: (id: string) => void }) {
  const comVoce = obras.filter((o) => o.comVoce > 0);
  const paradas = obras.filter((o) => !o.arquivada && diasDesde(o.atualizadoEm) >= PARADA_EM_DIAS).slice(0, 5);
  return (
    <div className="mp-lado-bloco">
      <div className="mp-lista-cabeca">
        <p className="mp-lado-titulo">Por onde começar</p>
        <p className="mp-lado-sub">
          {comVoce.length
            ? `${plural(comVoce.reduce((s, o) => s + o.comVoce, 0), "achado espera", "achados esperam")} por você em ${plural(comVoce.length, "obra", "obras")}.`
            : "Nenhum achado espera por você."}
        </p>
      </div>
      {comVoce.length > 0 && (
        <ul className="mp-lista mp-lista--docs">
          {comVoce.map((o) => (
            <li key={o.id}>
              <span className="mp-lista-texto">
                <b className="pj-lado-obra">
                  <span className="mp-mono">{o.codigo}</span> {o.nome}
                </b>
                <span className="mp-tom--aviso-texto">{plural(o.comVoce, "achado com você", "achados com você")}</span>
              </span>
              <button type="button" className="mp-lista-ver" onClick={() => onAbrir(o.id)}>
                Ver
              </button>
            </li>
          ))}
        </ul>
      )}
      {paradas.length > 0 && (
        <>
          <p className="mp-insp-titulo pj-sep">Paradas há mais de {PARADA_EM_DIAS} dias</p>
          <ul className="mp-lista mp-lista--docs">
            {paradas.map((o) => (
              <li key={o.id}>
                <span className="mp-lista-texto">
                  <b className="pj-lado-obra">
                    <span className="mp-mono">{o.codigo}</span> {o.nome}
                  </b>
                  <span>
                    {diasDesde(o.atualizadoEm)} dias. {o.observacoes || o.ultimos[0]?.oque || ""}
                  </span>
                </span>
                <button type="button" className="mp-lista-ver" onClick={() => onAbrir(o.id)}>
                  Ver
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** A obra escolhida: quem é, o que espera, o que aconteceu por último, e entrar. */
function DaObra({ o, onArquivar, arquivando }: { o: ObraDaLista; onArquivar: () => void; arquivando: boolean }) {
  const router = useRouter();
  return (
    <div className="mp-lado-bloco">
      <div className="pj-obra-cabeca">
        <p className="mp-trilha">
          <MarcaDaPrefeitura prefeitura={o.cliente} forma="selo" />
          <span className="mp-mono">{o.codigo}</span>
          {o.cidade && <span>{o.cidade}</span>}
          {o.arquivada && <span className="pj-arquivada">arquivado</span>}
        </p>
        <p className="pj-obra-nome">{o.nome}</p>
        {o.observacoes && <p className="mp-lado-sub">{o.observacoes}</p>}
      </div>

      <dl className="mp-campos">
        <div className="mp-campo">
          <dt>Espera</dt>
          <dd>
            {o.pendentes ? plural(o.pendentes, "achado aberto", "achados abertos") : "nada aberto"}
            {o.comVoce ? <small className="mp-tom--aviso-texto">{o.comVoce} com você</small> : null}
          </dd>
        </div>
        <div className="mp-campo">
          <dt>Tem</dt>
          <dd>{resumo(o.contagens) || "nada ainda"}</dd>
        </div>
        {o.cliente && (
          <div className="mp-campo">
            <dt>Cliente</dt>
            <dd>{o.cliente}</dd>
          </div>
        )}
      </dl>

      {o.ultimos.length > 0 && (
        <div className="pj-ultimos">
          <p className="mp-insp-titulo">Por último</p>
          <ol>
            {o.ultimos.map((u) => (
              <li key={u.quando + u.oque}>
                <span className="ds-num">{quandoNaLinha(u.quando)}</span>
                <span>{u.oque}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mp-lado-pe pj-acoes">
        <Botao variante="primary" className="mp-gerar" onClick={() => router.push(`/projetos/${o.id}`)}>
          {o.arquivada ? "Abrir" : "Retomar"} <Tecla>↵</Tecla>
        </Botao>
        <div className="mp-acoes">
          {!o.arquivada && (
            <>
              <button type="button" className="mp-acao" onClick={() => router.push(linkDoNexo({ projeto: o.id, intencao: "auditar" }))}>
                <FileSearch size={14} /> Auditar documentos
              </button>
              <button type="button" className="mp-acao" onClick={() => router.push(linkDoNexo({ projeto: o.id, intencao: "montar" }))}>
                <Layers size={14} /> Montar volume
              </button>
            </>
          )}
          <button type="button" className="mp-acao" onClick={onArquivar} disabled={arquivando}>
            {arquivando ? <Girando tamanho={13} /> : o.arquivada ? <ArchiveRestore size={14} /> : <Archive size={14} />}{" "}
            {o.arquivada ? "Voltar para em andamento" : "Arquivar"}
          </button>
        </div>
      </div>
    </div>
  );
}

const FORM_VAZIO = { code: "", name: "", client: "", description: "" };

function NovoProjeto({ onFechar }: { onFechar: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState(FORM_VAZIO);
  const [erro, setErro] = useState("");
  const [enviando, iniciar] = useTransition();
  const muda = (k: keyof typeof FORM_VAZIO) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function criar() {
    const corpo = { code: form.code.trim(), name: form.name.trim(), client: form.client.trim(), description: form.description.trim() };
    if (!corpo.code || !corpo.name) {
      setErro("Informe código e nome do projeto.");
      return;
    }
    setErro("");
    iniciar(async () => {
      try {
        const resposta = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
        const dados = (await resposta.json().catch(() => null)) as { project?: { id: string }; error?: string } | null;
        if (!resposta.ok || !dados?.project) throw new Error(dados?.error ?? "Não foi possível criar o projeto.");
        router.push(`/projetos/${dados.project.id}`);
      } catch (falha) {
        setErro(falha instanceof Error ? falha.message : "Não foi possível criar o projeto.");
      }
    });
  }

  return (
    <form
      className="mp-lado-bloco mp-form"
      onSubmit={(e) => {
        e.preventDefault();
        criar();
      }}
    >
      <div className="mp-lista-cabeca">
        <p className="mp-lado-titulo">Novo projeto</p>
        <p className="mp-lado-sub">Também nasce sozinho quando o Nexo lê um memorial de uma obra que ainda não está aqui.</p>
      </div>
      <label>
        <span>Código</span>
        <input className="mp-mono" placeholder="Ex.: SIM120-26" autoFocus value={form.code} onChange={muda("code")} />
      </label>
      <label>
        <span>Nome</span>
        <textarea rows={2} placeholder="Nome da obra, como vai na capa" value={form.name} onChange={muda("name")} />
      </label>
      <label>
        <span>Cliente</span>
        <input placeholder="Prefeitura ou contratante" value={form.client} onChange={muda("client")} />
      </label>
      <label>
        <span>Observações</span>
        <textarea rows={2} placeholder="Escopo, fase, lote" value={form.description} onChange={muda("description")} />
      </label>
      {erro && (
        <p className="mp-tom--critico-texto" role="alert">
          {erro}
        </p>
      )}
      <div className="mp-form-acoes">
        <Botao variante="primary" tamanho="sm" type="submit" disabled={enviando}>
          {enviando && <Girando tamanho={12} />}
          Criar projeto <Tecla>↵</Tecla>
        </Botao>
        <Botao variante="quiet" tamanho="sm" type="button" onClick={onFechar}>
          Cancelar <Tecla>Esc</Tecla>
        </Botao>
      </div>
    </form>
  );
}

/**
 * PROJETOS (veio do lab: app/lab/telas/projetos). Achar a obra e entrar nela.
 * Um painel: abas com contagem e busca em cima, a tabela das obras
 * (atualizadas primeiro) e, à direita, "por onde começar" ou a obra
 * escolhida, com o que espera nela e Retomar. Tudo pelo teclado: / busca,
 * ↑ ↓ andam, Enter entra, N cria.
 *
 * O SELETOR DE ORDEM SAIU (decisão do redesenho): a lista é sempre das
 * atualizadas primeiro, e "o que está com você" mora no lado.
 */
export function TelaProjetos({ obras, semBanco, podeCriar }: { obras: ObraDaLista[]; semBanco: boolean; podeCriar: boolean }) {
  const { k } = useTempo();
  const router = useRouter();
  const { avisar } = useMoldura();
  const [recorte, setRecorte] = useState<Recorte>("ativos");
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [arquivando, setArquivando] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const q = busca.trim();
  const visiveis = useMemo(() => obras.filter((o) => noRecorte(recorte, o) && casa(q, o)), [obras, recorte, q]);
  const obra = obras.find((o) => o.id === sel) ?? null;

  const andar = (d: number) => {
    if (!visiveis.length) return;
    const i = obra ? visiveis.indexOf(obra) : -1;
    setNovo(false);
    setSel(visiveis[Math.min(visiveis.length - 1, Math.max(0, i < 0 ? 0 : i + d))].id);
  };

  async function arquivar(o: ObraDaLista) {
    setArquivando(true);
    try {
      const resposta = await fetch(`/api/projects/${o.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: o.arquivada ? "ACTIVE" : "ARCHIVED" }),
      });
      const dados = (await resposta.json().catch(() => null)) as { error?: string } | null;
      if (!resposta.ok) throw new Error(dados?.error ?? "Não foi possível mudar a situação do projeto.");
      avisar({ tom: "ok", titulo: o.arquivada ? `${o.codigo} voltou para em andamento` : `${o.codigo} arquivado` });
      router.refresh();
    } catch (falha) {
      avisar({ tom: "falha", titulo: "Não deu para arquivar", texto: falha instanceof Error ? falha.message : undefined });
    } finally {
      setArquivando(false);
    }
  }

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (alvo.closest("input, textarea")) {
        if (e.key === "Escape") {
          e.preventDefault();
          if (novo) setNovo(false);
          else alvo.blur();
        }
        if (e.key === "ArrowDown" && alvo === campo.current) (e.preventDefault(), alvo.blur(), andar(1));
        return;
      }
      // Ctrl/Meta/Alt são de outro dono (Ctrl K abre a busca de qualquer tela)
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "ArrowDown" || e.key === "j") (e.preventDefault(), andar(1));
      else if (e.key === "ArrowUp" || e.key === "k") (e.preventDefault(), andar(-1));
      else if (e.key === "/") (e.preventDefault(), campo.current?.focus());
      else if (e.key === "Enter" && obra && !novo && !alvo.closest("button, a")) (e.preventDefault(), router.push(`/projetos/${obra.id}`));
      else if ((e.key === "n" || e.key === "N") && podeCriar) (e.preventDefault(), setSel(null), setNovo(true));
      else if (e.key === "Escape" && (novo || sel)) (e.preventDefault(), novo ? setNovo(false) : setSel(null));
    };
    document.addEventListener("keydown", tecla, true);
    return () => document.removeEventListener("keydown", tecla, true);
  });

  const chaveDoLado = novo ? "novo" : obra ? obra.id : "comecar";
  const ativas = obras.filter((o) => !o.arquivada).length;

  return (
    <div className="mp pj">
      <header className="mp-cabeca">
        <div>
          {obras.length > 0 && (
            <p className="mp-trilha">
              <span>
                {ativas} em andamento, {obras.length - ativas} arquivados
              </span>
            </p>
          )}
          <h1>Projetos</h1>
        </div>
        {podeCriar && (
          <Botao variante="ghost" tamanho="sm" onClick={() => (setSel(null), setNovo(true))}>
            <Plus size={14} /> Novo projeto <Tecla>N</Tecla>
          </Botao>
        )}
      </header>

      <section className="mp-painel">
        {obras.length === 0 && !novo ? (
          <div className="pj-vazio">
            <p className="pj-vazio-titulo">{semBanco ? "Sem banco neste ambiente" : "Nenhum projeto ainda"}</p>
            <p className="mp-lado-sub">
              {semBanco ? "Sem DATABASE_URL não há projetos para consultar." : "Um projeto nasce quando o Nexo lê o memorial de uma obra nova, ou quando a coordenação cria um aqui."}
            </p>
            {!semBanco && (
              <div className="pj-vazio-acoes">
                {podeCriar && (
                  <Botao variante="primary" tamanho="sm" onClick={() => setNovo(true)}>
                    <Plus size={14} /> Novo projeto <Tecla>N</Tecla>
                  </Botao>
                )}
                <Botao variante="ghost" tamanho="sm" onClick={() => router.push("/nexo?intencao=auditar")}>
                  Auditar um memorial
                </Botao>
              </div>
            )}
          </div>
        ) : (
          <div className="mp-miolo">
            <div className="mp-principal">
              <div className="mp-ferramentas">
                <div className="mp-abas" role="tablist" aria-label="Situação do projeto">
                  {RECORTES.map(([id, nome]) => (
                    <button key={id} type="button" role="tab" aria-selected={recorte === id} onClick={() => (setRecorte(id), setSel(null))}>
                      {nome} <span className="ds-num">{obras.filter((o) => noRecorte(id, o)).length}</span>
                      {recorte === id && <motion.i layoutId="pj-aba-marca" className="mp-aba-marca" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
                    </button>
                  ))}
                </div>
                <label className="mp-busca pj-busca">
                  <Search size={14} />
                  <input ref={campo} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Código, nome, cliente ou observação" aria-label="Buscar projeto" />
                  <Tecla>/</Tecla>
                </label>
              </div>

              <div className="mp-grade pj-grade" role="grid" aria-rowcount={visiveis.length}>
                <div className="mp-g-cab" role="row">
                  <span>#</span>
                  <span>Código</span>
                  <span>Obra</span>
                  <span>Cidade</span>
                  <span>Espera</span>
                  <span>Atualizado</span>
                </div>
                {visiveis.map((o, i) => {
                  const escolhida = sel === o.id && !novo;
                  return (
                    <div
                      key={o.id}
                      role="row"
                      aria-selected={escolhida}
                      className={`mp-g-linha pj-linha${o.arquivada ? " pj-linha--arquivada" : ""}`}
                      onClick={() => (setNovo(false), setSel(escolhida ? null : o.id))}
                      onDoubleClick={() => router.push(`/projetos/${o.id}`)}
                    >
                      {escolhida && <motion.i layoutId="pj-sel" className="mp-g-sel" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
                      <span className="mp-g-n ds-num">{i + 1}</span>
                      <span className="pj-codigo">
                        <MarcaDaPrefeitura prefeitura={o.cliente} forma="sinal" />
                        <span className="mp-mono">{o.codigo}</span>
                      </span>
                      <span className="pj-nome">{o.nome}</span>
                      <span className="mp-g-fraco">{o.cidade}</span>
                      <span className="pj-espera">
                        {o.comVoce ? (
                          <span className="mp-conf mp-tom--aviso">
                            <i />
                            <span>
                              {o.comVoce} com você<span className="mp-g-fraco">{`, de ${o.pendentes}`}</span>
                            </span>
                          </span>
                        ) : o.pendentes ? (
                          <span className="mp-g-fraco">{plural(o.pendentes, "achado aberto", "achados abertos")}</span>
                        ) : (
                          <span className="mp-g-fraco pj-nada">nada</span>
                        )}
                      </span>
                      <span className="mp-g-fraco ds-num">{quandoNaLinha(o.atualizadoEm)}</span>
                      <ArrowRight size={14} className="pj-seta" />
                    </div>
                  );
                })}
                {visiveis.length === 0 && (
                  <div className="pj-sem">
                    <p>
                      {q ? (
                        <>
                          Nenhuma obra com <b>“{busca}”</b>
                          {recorte !== "todos" ? ` em ${recorte === "ativos" ? "andamento" : "arquivados"}` : ""}.
                        </>
                      ) : recorte === "arquivados" ? (
                        "Nenhuma obra arquivada."
                      ) : (
                        "Nenhuma obra em andamento."
                      )}
                    </p>
                    {q && <p className="mp-g-fraco">A busca olha código, nome, cliente e observações.</p>}
                    <div className="pj-vazio-acoes">
                      {q && (
                        <Botao variante="ghost" tamanho="sm" onClick={() => setBusca("")}>
                          Limpar a busca
                        </Botao>
                      )}
                      {recorte !== "todos" && (
                        <Botao variante="quiet" tamanho="sm" onClick={() => setRecorte("todos")}>
                          Procurar em todos
                        </Botao>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <aside className="mp-lado" aria-label={obra ? `Projeto ${obra.codigo}` : "Por onde começar"}>
              <div className="mp-lado-troca">
                <AnimatePresence initial={false}>
                  <motion.div
                    key={chaveDoLado}
                    className="mp-lado-camada"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: RITMO.troca * k, ease: SUAVE }}
                  >
                    {novo ? (
                      <NovoProjeto onFechar={() => setNovo(false)} />
                    ) : obra ? (
                      <DaObra o={obra} arquivando={arquivando} onArquivar={() => void arquivar(obra)} />
                    ) : (
                      <PorOndeComecar obras={obras} onAbrir={(id) => setSel(id)} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </aside>
          </div>
        )}

        {obras.length > 0 && (
          <footer className="mp-rodape">
            <span>
              <Tecla>↑</Tecla>
              <Tecla>↓</Tecla> obra
            </span>
            <span>
              <Tecla>↵</Tecla> retomar
            </span>
            <span>
              <Tecla>/</Tecla> buscar
            </span>
            {podeCriar && (
              <span>
                <Tecla>N</Tecla> novo projeto
              </span>
            )}
            <span>
              <Tecla>Esc</Tecla> voltar
            </span>
            <span className="mp-rodape-fim">atualizadas primeiro</span>
          </footer>
        )}
      </section>
    </div>
  );
}
