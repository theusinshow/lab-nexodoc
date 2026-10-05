"use client";

import { Search, Trash2 } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";

import { Botao, Girando } from "@/components/ds/basicos";
import { plural } from "@/lib/plural";

import { useCarga } from "./dados";
import { GavetaDoExpurgo, megas, useExpurgo } from "./gaveta-do-expurgo";
import { AvisoDaCarga, quandoCurto } from "./pecas";
import "./pessoas-banco.css";
import "./projetos.css";

/*
 * PROJETOS (05/10/2026, pedido dele): cada projeto com o que guarda —
 * conversas (auditorias e montagens de volume), auditorias, LDs e artefatos —
 * e como apagar um item ou o projeto inteiro.
 *
 * Apaga pelo EXPURGO, o mesmo da tela de Dados (`alcance` `itens` e
 * `projeto`): prévia contada no banco, palavra de confirmação e lápide para as
 * máquinas que guardam cópia. Ver [[server/admin/projetos.ts]].
 */

type Projeto = {
  id: string;
  code: string;
  name: string;
  client: string;
  ownerEmail: string;
  atualizadoEm: string;
  auditorias: number;
  conversas: number;
  lds: number;
  artefatos: number;
  documentos: number;
};

type Detalhe = {
  projeto: Projeto;
  conversas: { id: string; title: string; tipo: string | null; userEmail: string; atualizadaEm: string; auditorias: string[] }[];
  auditorias: { id: string; title: string; status: string; achados: number; criadaEm: string; quem: string | null; conversaId: string | null }[];
  lds: { id: string; title: string; status: string; atualizadaEm: string; userEmail: string }[];
  artefatos: { id: string; fileName: string; kind: string; sizeBytes: number | null; criadoEm: string }[];
};

const ehProjetos = (c: unknown): c is { projetos: Projeto[] } => Array.isArray((c as { projetos?: unknown } | null)?.projetos);
const TIPO_DA_CONVERSA: Record<string, string> = { auditoria: "Auditoria", volume: "Montagem de volume" };
const STATUS: Record<string, string> = { COMPLETED: "concluída", PROCESSING: "processando", FAILED: "falhou", CANCELED: "cancelada" };
const nomeDo = (p: Projeto) => [p.code.trim(), p.name.trim()].filter(Boolean).join(" · ") || p.id;

/** A marca de um item na seleção: tipo + id, porque conversa, auditoria e LD dividem a mesma lista. */
type Marca = `c:${string}` | `a:${string}` | `l:${string}`;

export function ProjetosDoAdmin() {
  const carga = useCarga("/api/admin/projetos", ehProjetos);
  const { token, restaurado, recarga, carregar } = carga;
  const projetos = useMemo(() => carga.dados?.projetos ?? [], [carga.dados]);
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [marcas, setMarcas] = useState<Set<Marca>>(new Set());
  // Sobe depois de um expurgo: o detalhe aberto relê o que sobrou.
  const [versao, setVersao] = useState(0);
  const [limite, setLimite] = useState(30);

  const expurgo = useExpurgo(async () => {
    setMarcas(new Set());
    setVersao((v) => v + 1);
    await carregar(token);
  });

  useEffect(() => {
    if (!restaurado || !token.trim()) return;
    queueMicrotask(() => void carregar(token));
  }, [restaurado, token, recarga, carregar]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return projetos;
    return projetos.filter((p) => [p.code, p.name, p.client, p.ownerEmail].some((t) => t.toLowerCase().includes(q)));
  }, [projetos, busca]);

  const alternar = (m: Marca) =>
    setMarcas((atual) => {
      const n = new Set(atual);
      if (n.has(m)) n.delete(m);
      else n.add(m);
      return n;
    });

  function excluirSelecionados() {
    const ids = (prefixo: string) => [...marcas].filter((m) => m.startsWith(prefixo)).map((m) => m.slice(2));
    const alcance = { tipo: "itens" as const, conversas: ids("c:"), auditorias: ids("a:"), lds: ids("l:") };
    void expurgo.pedirPrevia(alcance, "a seleção", plural(marcas.size, "item selecionado", "itens selecionados"));
  }

  return (
    <section className="adm-bloco" aria-labelledby="pj-titulo">
      <header>
        <h2 id="pj-titulo">Projetos</h2>
        {carga.dados && <span className="adm-fraco ds-num">{plural(projetos.length, "projeto", "projetos")}</span>}
      </header>
      <p className="din-lede">
        Abra um projeto para ver o que ele guarda. Marque conversas, auditorias ou LDs para apagar só eles, ou apague o projeto inteiro. Apagar é permanente e alcança as máquinas que guardam cópia.
      </p>
      <div className="pb-avisos-da-secao">
        <AvisoDaCarga fase={carga.fase} erro={carga.erro?.tipo} detalhe={carga.erro?.detalhe} oque="os projetos" atualizadoEm={carga.carregadoEm} onTentar={() => void carregar(token)} />
        {expurgo.erro && <p className="din-erro-linha">{expurgo.erro}</p>}
        {expurgo.feito && <p className="din-salvo">{expurgo.feito}</p>}
      </div>

      <GavetaDoExpurgo expurgo={expurgo} />

      {carga.dados && projetos.length === 0 && <p className="adm-vazio">Nenhum projeto no banco.</p>}
      {projetos.length > 0 && (
        <>
          <label className="pb-busca pb-busca--dados">
            <Search size={14} aria-hidden />
            <input value={busca} onChange={(e) => (setBusca(e.target.value), setLimite(30))} placeholder="Buscar código, nome, cliente ou dono" aria-label="Buscar projetos" />
          </label>
          <div className="adm-tabela pj-lista">
            {filtrados.slice(0, limite).map((p) => {
              const estaAberto = aberto === p.id;
              return (
                <Fragment key={p.id}>
                  <div className={`adm-linha pj-projeto${estaAberto ? " pj-projeto--aberto" : ""}`}>
                    <button type="button" className="adm-tit pb-obra-abrir" aria-expanded={estaAberto} onClick={() => setAberto(estaAberto ? null : p.id)}>
                      <b>{nomeDo(p)}</b>
                      <small>
                        {p.client || "sem cliente"} · <span className="mp-mono">{p.ownerEmail}</span>
                      </small>
                    </button>
                    <span className="adm-fraco ds-num pj-contas">
                      {plural(p.auditorias, "auditoria", "auditorias")} · {plural(p.conversas, "conversa", "conversas")} · {plural(p.lds, "LD", "LDs")}
                      {p.artefatos ? ` · ${plural(p.artefatos, "artefato", "artefatos")}` : ""}
                    </span>
                    <span className="ds-num adm-fraco din-direita">{quandoCurto(p.atualizadoEm)}</span>
                    <Botao variante="quiet" tamanho="sm" className="pj-excluir" onClick={() => void expurgo.pedirPrevia({ tipo: "projeto", projectId: p.id }, p.code.trim() || p.name.trim(), `o projeto ${nomeDo(p)}`)}>
                      <Trash2 size={13} /> Excluir projeto
                    </Botao>
                  </div>
                  {estaAberto && <DetalheDoProjeto id={p.id} versao={versao} marcas={marcas} alternar={alternar} />}
                </Fragment>
              );
            })}
          </div>
          {filtrados.length > limite && (
            <button type="button" className="pb-mostrar-mais" onClick={() => setLimite(limite + 30)}>
              Mostrar mais · faltam {plural(filtrados.length - limite, "projeto", "projetos")}
            </button>
          )}
          <div className="pb-rodape-acoes">
            <Botao variante="ghost" tamanho="sm" disabled={marcas.size === 0} onClick={excluirSelecionados}>
              <Trash2 size={13} /> Excluir selecionados{marcas.size ? ` (${marcas.size})` : ""}
            </Botao>
            {marcas.size > 0 && (
              <Botao variante="quiet" tamanho="sm" onClick={() => setMarcas(new Set())}>
                Limpar seleção
              </Botao>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function DetalheDoProjeto({ id, versao, marcas, alternar }: { id: string; versao: number; marcas: Set<Marca>; alternar: (m: Marca) => void }) {
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const controle = new AbortController();
    fetch(`/api/admin/projetos/${encodeURIComponent(id)}`, { cache: "no-store", signal: controle.signal })
      .then(async (r) => {
        const corpo = (await r.json().catch(() => null)) as { detalhe?: Detalhe; error?: string } | null;
        if (!r.ok || !corpo?.detalhe) throw new Error(corpo?.error ?? `HTTP ${r.status}`);
        setDetalhe(corpo.detalhe);
        setErro("");
      })
      .catch((e: unknown) => {
        if (controle.signal.aborted) return;
        // Projeto que acabou de sair num expurgo: some da lista na recarga.
        setErro(e instanceof Error ? e.message : "Não foi possível abrir o projeto.");
      });
    return () => controle.abort();
  }, [id, versao]);

  if (erro) return <p className="pj-detalhe pj-nota">{erro}</p>;
  if (!detalhe) {
    return (
      <p className="pj-detalhe pj-nota">
        <Girando tamanho={12} /> Abrindo o projeto…
      </p>
    );
  }

  const tituloDaConversa = new Map(detalhe.conversas.map((c) => [c.id, c.title]));
  const vazio = !detalhe.conversas.length && !detalhe.auditorias.length && !detalhe.lds.length && !detalhe.artefatos.length;

  const caixa = (m: Marca, rotulo: string) => (
    <input type="checkbox" className="pb-check" checked={marcas.has(m)} onChange={() => alternar(m)} aria-label={`Selecionar ${rotulo}`} />
  );

  return (
    <div className="pj-detalhe">
      {vazio && <p className="pj-nota">Nada guardado neste projeto — só a linha dele. “Excluir projeto” a remove.</p>}

      {detalhe.conversas.length > 0 && (
        <div className="pj-grupo">
          <h3>Conversas</h3>
          <p className="pj-nota">Apagar a conversa leva junto as auditorias que ela registrou.</p>
          {detalhe.conversas.map((c) => (
            <label key={c.id} className={`pj-item${marcas.has(`c:${c.id}`) ? " pb-pessoa--marcada" : ""}`}>
              {caixa(`c:${c.id}`, c.title)}
              <span className="pj-item-tit">{c.title}</span>
              <span className="adm-fraco">
                {c.tipo ? (TIPO_DA_CONVERSA[c.tipo] ?? c.tipo) : "sem trabalho"}
                {c.auditorias.length ? ` · ${plural(c.auditorias.length, "auditoria", "auditorias")}` : ""}
              </span>
              <span className="mp-mono adm-fraco">{c.userEmail}</span>
              <span className="ds-num adm-fraco din-direita">{quandoCurto(c.atualizadaEm)}</span>
            </label>
          ))}
        </div>
      )}

      {detalhe.auditorias.length > 0 && (
        <div className="pj-grupo">
          <h3>Auditorias</h3>
          {detalhe.auditorias.map((a) => (
            <label key={a.id} className={`pj-item${marcas.has(`a:${a.id}`) ? " pb-pessoa--marcada" : ""}`}>
              {caixa(`a:${a.id}`, a.title)}
              <span className="pj-item-tit">{a.title}</span>
              <span className="adm-fraco">
                {STATUS[a.status] ?? a.status} · {plural(a.achados, "achado", "achados")}
              </span>
              <span className="adm-fraco pj-de">{a.conversaId ? `na conversa “${tituloDaConversa.get(a.conversaId) ?? "—"}”` : "sem conversa"}</span>
              <span className="ds-num adm-fraco din-direita">{quandoCurto(a.criadaEm)}</span>
            </label>
          ))}
        </div>
      )}

      {detalhe.lds.length > 0 && (
        <div className="pj-grupo">
          <h3>LDs</h3>
          {detalhe.lds.map((l) => (
            <label key={l.id} className={`pj-item${marcas.has(`l:${l.id}`) ? " pb-pessoa--marcada" : ""}`}>
              {caixa(`l:${l.id}`, l.title)}
              <span className="pj-item-tit">{l.title}</span>
              <span className="adm-fraco">{l.status.toLowerCase()}</span>
              <span className="mp-mono adm-fraco">{l.userEmail}</span>
              <span className="ds-num adm-fraco din-direita">{quandoCurto(l.atualizadaEm)}</span>
            </label>
          ))}
        </div>
      )}

      {detalhe.artefatos.length > 0 && (
        <div className="pj-grupo">
          <h3>Artefatos gerados</h3>
          <p className="pj-nota">Saem junto com a auditoria ou LD que os gerou, ou com o projeto.</p>
          {detalhe.artefatos.map((a) => (
            <div key={a.id} className="pj-item pj-item--fixo">
              <span />
              <span className="pj-item-tit mp-mono">{a.fileName}</span>
              <span className="adm-fraco">{a.kind}</span>
              <span className="adm-fraco">{a.sizeBytes ? megas(a.sizeBytes) : ""}</span>
              <span className="ds-num adm-fraco din-direita">{quandoCurto(a.criadoEm)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
