"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, FileSearch, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";
import type { ParecerEmAberto } from "@/lib/achados-em-aberto";
import { useTempo } from "@/lib/ds/tempo";
import { NIVEIS, type Nivel } from "@/lib/nivel-do-achado";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { SeloDaDisciplina } from "../comum/disciplina";
import { diasDesde, quandoNaLinha } from "../comum/quando";
import { RITMO, SUAVE } from "../comum/ritmo";
import { plural, semAcento } from "../comum/texto";
import "../mapa/mapa.css";
import "../projetos/projetos.css";
import "../projeto/projeto.css";
import "./achados.css";

type Lado = "com-voce" | "passou";
type Filtro = "todos" | Nivel;
const total = (ps: ParecerEmAberto[]) => ps.reduce((s, p) => s + p.achados.length, 0);
/** ", 2 impedem a entrega" — só quando o nível é conhecido: sem relatório, "0" seria mentira. */
const impedem = (ps: ParecerEmAberto[]) => {
  const achados = ps.flatMap((p) => p.achados);
  if (!achados.some((a) => a.nivel)) return "";
  return `, ${achados.filter((a) => a.nivel === "block").length} impedem a entrega`;
};
const abrirParecer = (auditId: string) => `/nexo?auditoria=${encodeURIComponent(auditId)}`;

/** Os pontos do nível, contados: o que o parecer guarda, de relance. */
function Niveis({ p }: { p: ParecerEmAberto }) {
  const conta = NIVEIS.map((i) => ({ i, n: p.achados.filter((a) => a.nivel === i.id).length })).filter((x) => x.n);
  const semNivel = p.achados.filter((a) => !a.nivel).length;
  return (
    <span className="ac-niveis">
      {conta.map(({ i, n }) => (
        <span key={i.id} className={`ac-nivel ac-nivel--${i.id}`} title={i.nome}>
          <i />
          {n}
        </span>
      ))}
      {semNivel > 0 && (
        <span className="ac-nivel" title="Sem nível: o relatório não traz este achado">
          {conta.length ? `+${semNivel}` : plural(semNivel, "achado", "achados")}
        </span>
      )}
    </span>
  );
}

/** Sem parecer escolhido: o resumo, por nível, e o mais antigo. */
function Resumo({ lado, lista }: { lado: Lado; lista: ParecerEmAberto[] }) {
  const todos = lista.flatMap((p) => p.achados);
  const antigo = [...lista].sort((a, b) => a.desde.localeCompare(b.desde))[0];
  const diasDoAntigo = antigo ? diasDesde(antigo.desde) : 0;
  return (
    <div className="mp-lado-bloco">
      <div className="mp-lista-cabeca">
        <p className="mp-lado-titulo">{lado === "com-voce" ? "Com você" : "Que você passou"}</p>
        <p className="mp-lado-sub">
          {lado === "com-voce"
            ? `${plural(todos.length, "achado", "achados")} em ${plural(lista.length, "parecer", "pareceres")}. Abrir leva ao parecer no Nexo, com a fila e o tratamento.`
            : `${plural(todos.length, "achado", "achados")} com ${plural(new Set(lista.map((p) => p.pessoa)).size, "pessoa", "pessoas")}, ainda abertos.`}
        </p>
      </div>
      <dl className="mp-campos ac-resumo">
        {NIVEIS.map((i) => {
          const n = todos.filter((a) => a.nivel === i.id).length;
          return n ? (
            <div key={i.id} className="mp-campo">
              <dt>
                <span className={`ac-nivel ac-nivel--${i.id}`}>
                  <i />
                </span>
              </dt>
              <dd>
                {plural(n, "achado", "achados")}
                <small>{i.nome.toLowerCase()}</small>
              </dd>
            </div>
          ) : null;
        })}
      </dl>
      {antigo && diasDoAntigo > 0 && (
        <p className="mp-lado-sub">
          O mais antigo espera há {plural(diasDoAntigo, "dia", "dias")}: <span className="mp-mono">{antigo.codigo}</span>, {antigo.titulo.charAt(0).toLowerCase() + antigo.titulo.slice(1)}
          {lado === "passou" && antigo.pessoa ? `, com ${antigo.pessoa}` : ""}.
        </p>
      )}
    </div>
  );
}

/** O parecer escolhido: os achados que esperam nele, antes de abrir. */
function DoParecer({ p, lado, onAbrir }: { p: ParecerEmAberto; lado: Lado; onAbrir: () => void }) {
  return (
    <div className="mp-lado-bloco">
      <div className="pj-obra-cabeca">
        <p className="mp-trilha">
          <MarcaDaPrefeitura prefeitura={p.cliente} forma="selo" />
          <span className="mp-mono">{p.codigo}</span>
        </p>
        <p className="mp-lado-sub ac-obra">{p.obra}</p>
        <p className="pj-obra-nome">{p.titulo}</p>
        <p className="mp-lado-sub">
          {lado === "com-voce" ? (p.pessoa ? (p.pessoa === "você" ? "Você mesmo atribuiu" : `Enviado por ${p.pessoa}`) : "Atribuído a você") : `Com ${p.pessoa ?? "—"}`}, {quandoNaLinha(p.desde)}
        </p>
      </div>
      <ul className="mp-lista ac-lista">
        {p.achados.map((a) => (
          <li key={a.id}>
            <span className={`ac-nivel${a.nivel ? ` ac-nivel--${a.nivel}` : ""}`}>
              <i />
            </span>
            <span className="mp-lista-texto">
              <b>{a.titulo}</b>
              <span className="ac-meta">
                <span className="mp-mono">{a.rotulo}</span>
                {a.disciplina && <SeloDaDisciplina disc={a.disciplina} />}
                {a.pagina && <span>p. {a.pagina}</span>}
                {a.foraDoParecer && <span>fora do parecer atual</span>}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mp-lado-pe">
        <Botao variante={lado === "com-voce" ? "primary" : "ghost"} className="mp-gerar" onClick={onAbrir}>
          Abrir o parecer <Tecla>↵</Tecla>
        </Botao>
      </div>
    </div>
  );
}

/**
 * ACHADOS (veio do lab: app/lab/telas/achados). O que está com você e o que
 * você passou a alguém. Dois tiles no topo trocam o lado; a tabela lista os
 * pareceres com os níveis contados; à direita, o resumo ou os achados do
 * parecer escolhido, antes de abrir. Abrir leva ao parecer no Nexo.
 */
export function TelaAchados({ comVoce, passou, semBanco }: { comVoce: ParecerEmAberto[]; passou: ParecerEmAberto[]; semBanco: boolean }) {
  const { k } = useTempo();
  const router = useRouter();
  const [lado, setLado] = useState<Lado>(comVoce.length === 0 && passou.length > 0 ? "passou" : "com-voce");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const campo = useRef<HTMLInputElement>(null);
  const lista = lado === "com-voce" ? comVoce : passou;
  const visiveis = useMemo(
    () =>
      lista.filter(
        (p) =>
          (filtro === "todos" || p.achados.some((a) => a.nivel === filtro)) &&
          (!busca || semAcento(`${p.codigo} ${p.obra} ${p.titulo} ${p.pessoa ?? ""} ${p.achados.map((a) => `${a.rotulo} ${a.titulo}`).join(" ")}`).includes(semAcento(busca))),
      ),
    [lista, filtro, busca],
  );
  const parecer = lista.find((p) => p.chave === sel) ?? null;
  const novaAuditoria = () => router.push("/nexo?intencao=auditar");

  const trocarLado = (l: Lado) => (setLado(l), setSel(null), setFiltro("todos"));
  const andar = (d: number) => {
    if (!visiveis.length) return;
    const i = parecer ? visiveis.indexOf(parecer) : -1;
    setSel(visiveis[Math.min(visiveis.length - 1, Math.max(0, i < 0 ? 0 : i + d))].chave);
  };

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (alvo.closest("input, textarea")) {
        if (e.key === "Escape") (e.preventDefault(), alvo.blur());
        if (e.key === "ArrowDown" && alvo === campo.current) (e.preventDefault(), alvo.blur(), andar(1));
        return;
      }
      // Ctrl/Meta/Alt são de outro dono (Ctrl K abre a busca de qualquer tela)
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "ArrowDown" || e.key === "j") (e.preventDefault(), andar(1));
      else if (e.key === "ArrowUp" || e.key === "k") (e.preventDefault(), andar(-1));
      else if (e.key === "/") (e.preventDefault(), campo.current?.focus());
      else if (e.key === "Enter" && parecer && !alvo.closest("button, a")) (e.preventDefault(), router.push(abrirParecer(parecer.auditId)));
      else if (e.key === "Tab" && !e.shiftKey && alvo === document.body) (e.preventDefault(), trocarLado(lado === "com-voce" ? "passou" : "com-voce"));
      else if (e.key === "Escape" && sel) (e.preventDefault(), setSel(null));
    };
    document.addEventListener("keydown", tecla, true);
    return () => document.removeEventListener("keydown", tecla, true);
  });

  const nada = comVoce.length === 0 && passou.length === 0;
  const antigo = (ps: ParecerEmAberto[]) => Math.max(0, ...ps.map((p) => diasDesde(p.desde)));

  return (
    <div className="mp pj pr ac">
      <header className="mp-cabeca">
        <div>
          <p className="mp-trilha">
            <span>De todas as obras em que você trabalha</span>
          </p>
          <h1>Achados</h1>
        </div>
        <Botao variante="ghost" tamanho="sm" onClick={novaAuditoria}>
          <FileSearch size={14} /> Nova auditoria
        </Botao>
      </header>

      <section className="mp-painel">
        {nada ? (
          <div className="pj-vazio">
            <p className="pj-vazio-titulo">{semBanco ? "Sem banco neste ambiente" : "Nada em aberto"}</p>
            <p className="mp-lado-sub">
              {semBanco ? "Sem DATABASE_URL não há achados para listar." : "Nenhum achado está com você, e tudo o que você passou a alguém já foi tratado."}
            </p>
            <div className="pj-vazio-acoes">
              <Botao variante="ghost" tamanho="sm" onClick={novaAuditoria}>
                <FileSearch size={14} /> Nova auditoria
              </Botao>
            </div>
          </div>
        ) : (
          <>
            <div className="mp-tiles pr-tarefas ac-tiles" role="tablist" aria-label="De quem é">
              {(
                [
                  ["com-voce", "Com você", comVoce],
                  ["passou", "Que você passou", passou],
                ] as [Lado, string, ParecerEmAberto[]][]
              ).map(([id, nome, ps]) => (
                <button key={id} type="button" role="tab" aria-selected={lado === id} className="mp-tile pr-tarefa" data-secao-achados={id === "com-voce" ? "recebidos" : "enviados"} onClick={() => trocarLado(id)}>
                  <span className="mp-tile-rotulo">{nome}</span>
                  <span className="pr-tarefa-estado">{ps.length ? plural(total(ps), "achado", "achados") : "nada"}</span>
                  <span className="mp-tile-sub">
                    {ps.length
                      ? id === "com-voce"
                        ? `em ${plural(ps.length, "parecer", "pareceres")}${impedem(ps)}`
                        : `com ${plural(new Set(ps.map((p) => p.pessoa)).size, "pessoa", "pessoas")}; o mais antigo há ${plural(antigo(ps), "dia", "dias")}`
                      : id === "com-voce"
                        ? "nenhum achado atribuído a você"
                        : "nada do que você passou está esperando"}
                  </span>
                  {lado === id && <motion.i layoutId="ac-tile-marca" className="mp-tile-marca" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
                </button>
              ))}
            </div>

            <div className="mp-miolo">
              <div className="mp-principal">
                <div className="mp-ferramentas">
                  <div className="mp-abas" role="tablist" aria-label="Nível">
                    {(["todos", ...NIVEIS.map((i) => i.id)] as Filtro[]).map((n) => {
                      const c = n === "todos" ? total(lista) : lista.flatMap((p) => p.achados).filter((a) => a.nivel === n).length;
                      if (n !== "todos" && !c) return null;
                      return (
                        <button key={n} type="button" role="tab" aria-selected={filtro === n} onClick={() => setFiltro(n)}>
                          {n !== "todos" && (
                            <span className={`ac-nivel ac-nivel--${n}`}>
                              <i />
                            </span>
                          )}
                          {n === "todos" ? "Todos" : NIVEIS.find((i) => i.id === n)!.curto} <span className="ds-num">{c}</span>
                          {filtro === n && <motion.i layoutId="ac-aba-marca" className="mp-aba-marca" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
                        </button>
                      );
                    })}
                  </div>
                  <label className="mp-busca pr-busca">
                    <Search size={14} />
                    <input ref={campo} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Obra, parecer, pessoa ou ACH" aria-label="Buscar achados" />
                    <Tecla>/</Tecla>
                  </label>
                </div>

                {lista.length === 0 ? (
                  <div className="pj-sem pr-vazio">
                    <p>{lado === "com-voce" ? "Nenhum achado atribuído a você está em aberto." : "Nada do que você passou está esperando."}</p>
                    <p className="mp-g-fraco">
                      {lado === "com-voce" ? "Quando alguém passar um achado para você, ele aparece aqui." : "O que você passar a alguém aparece aqui até ser tratado."}
                    </p>
                  </div>
                ) : (
                  <div className="mp-grade ac-grade" role="grid">
                    <div className="mp-g-cab" role="row">
                      <span>#</span>
                      <span>Obra</span>
                      <span>Parecer</span>
                      <span>Achados</span>
                      <span>{lado === "com-voce" ? "De" : "Com"}</span>
                      <span>Desde</span>
                      <span />
                    </div>
                    {visiveis.map((p, i) => {
                      const escolhido = sel === p.chave;
                      return (
                        <div
                          key={p.chave}
                          role="row"
                          aria-selected={escolhido}
                          className="mp-g-linha pj-linha"
                          onClick={() => setSel(escolhido ? null : p.chave)}
                          onDoubleClick={() => router.push(abrirParecer(p.auditId))}
                        >
                          {escolhido && <motion.i layoutId="ac-sel" className="mp-g-sel" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
                          <span className="mp-g-n ds-num">{i + 1}</span>
                          <span className="pj-codigo">
                            <MarcaDaPrefeitura prefeitura={p.cliente} forma="sinal" />
                            <span className="mp-mono">{p.codigo}</span>
                          </span>
                          <span className="ac-parecer">
                            <b>{p.titulo}</b>
                            <span className="mp-g-fraco">{p.obra}</span>
                          </span>
                          <Niveis p={p} />
                          <span className="mp-g-fraco">{p.pessoa ?? "—"}</span>
                          <span className={`ds-num ${diasDesde(p.desde) >= 7 ? "mp-tom--aviso-texto" : "mp-g-fraco"}`}>{quandoNaLinha(p.desde)}</span>
                          <ArrowRight size={14} className="pj-seta" />
                        </div>
                      );
                    })}
                    {visiveis.length === 0 && <p className="mp-g-vazio">Nenhum parecer com esse filtro.</p>}
                  </div>
                )}
              </div>

              <aside className="mp-lado" aria-label={parecer ? parecer.titulo : "Resumo"}>
                <div className="mp-lado-troca">
                  <AnimatePresence initial={false}>
                    <motion.div
                      key={parecer ? parecer.chave : `resumo-${lado}`}
                      className="mp-lado-camada"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: RITMO.troca * k, ease: SUAVE }}
                    >
                      {parecer ? (
                        <DoParecer p={parecer} lado={lado} onAbrir={() => router.push(abrirParecer(parecer.auditId))} />
                      ) : lista.length ? (
                        <Resumo lado={lado} lista={lista} />
                      ) : (
                        <div className="mp-lado-bloco">
                          <p className="mp-lado-titulo">{lado === "com-voce" ? "Com você" : "Que você passou"}</p>
                          <p className="mp-lado-sub">Nada por aqui.</p>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </aside>
            </div>
          </>
        )}

        {!nada && (
          <footer className="mp-rodape">
            <span>
              <Tecla>↑</Tecla>
              <Tecla>↓</Tecla> parecer
            </span>
            <span>
              <Tecla>↵</Tecla> abrir o parecer
            </span>
            <span>
              <Tecla>Tab</Tecla> com você / que você passou
            </span>
            <span>
              <Tecla>/</Tecla> buscar
            </span>
            <span className="mp-rodape-fim">abrir leva ao parecer no Nexo</span>
          </footer>
        )}
      </section>
    </div>
  );
}
