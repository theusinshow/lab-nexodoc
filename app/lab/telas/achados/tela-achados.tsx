"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, FileSearch, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import { useIr } from "../_comum/prototipo";
import { RITMO, SUAVE } from "../conversa/turnos";
import { IMPACTOS, type Impacto } from "../resultado-e/dados";
import { SeloDaDisciplina } from "../resultado-e/disciplina";
import { COM_VOCE, QUE_VOCE_PASSOU, type Parecer } from "./dados";
import "../mapa/mapa.css";
import "../projetos/projetos.css";
import "../projeto/projeto.css";
import "./achados.css";

export type SituacaoAchados = "com-voce" | "parecer-escolhido" | "que-voce-passou" | "so-passados" | "nada";

type Lado = "com-voce" | "passou";
type Nivel = "todos" | Impacto;
const NOME_CURTO: Record<Impacto, string> = { block: "Impedem", decide: "Decisão", note: "Revisão", texto: "Gramática" };
const semAcento = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const plural = (n: number, um: string, v: string) => `${n} ${n === 1 ? um : v}`;
const total = (ps: Parecer[]) => ps.reduce((s, p) => s + p.achados.length, 0);

/** Os pontos do nível, contados: o que o parecer guarda, de relance. */
function Niveis({ p }: { p: Parecer }) {
  const conta = IMPACTOS.map((i) => ({ i, n: p.achados.filter((a) => a.impacto === i.id).length })).filter((x) => x.n);
  return (
    <span className="ac-niveis">
      {conta.map(({ i, n }) => (
        <span key={i.id} className={`ac-nivel ac-nivel--${i.id}`} title={i.nome}>
          <i />
          {n}
        </span>
      ))}
    </span>
  );
}

/** Sem parecer escolhido: o resumo do dia, por nível, e o mais antigo. */
function Resumo({ lado, lista }: { lado: Lado; lista: Parecer[] }) {
  const todos = lista.flatMap((p) => p.achados);
  const antigo = [...lista].sort((a, b) => b.dias - a.dias)[0];
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
        {IMPACTOS.map((i) => {
          const n = todos.filter((a) => a.impacto === i.id).length;
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
      {antigo && antigo.dias > 0 && (
        <p className="mp-lado-sub">
          O mais antigo espera há {plural(antigo.dias, "dia", "dias")}: <span className="mp-mono">{antigo.codigo}</span>, {antigo.titulo.charAt(0).toLowerCase() + antigo.titulo.slice(1)}
          {lado === "passou" ? `, com ${antigo.pessoa}` : ""}.
        </p>
      )}
    </div>
  );
}

/** O parecer escolhido: os achados que esperam nele, antes de abrir. */
function DoParecer({ p, lado }: { p: Parecer; lado: Lado }) {
  const ir = useIr();
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
          {lado === "com-voce" ? (p.pessoa.startsWith("Nexo") ? "Da sua auditoria" : `Enviado por ${p.pessoa}`) : `Com ${p.pessoa}`}, {p.desde}
        </p>
      </div>
      <ul className="mp-lista ac-lista">
        {p.achados.map((a) => (
          <li key={a.id}>
            <span className={`ac-nivel ac-nivel--${a.impacto}`}>
              <i />
            </span>
            <span className="mp-lista-texto">
              <b>{a.titulo}</b>
              <span className="ac-meta">
                <span className="mp-mono">{a.id}</span>
                <SeloDaDisciplina disc={a.disc} />
                <span>p. {a.pagina}</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mp-lado-pe">
        <Botao variante={lado === "com-voce" ? "primary" : "ghost"} className="mp-gerar" onClick={() => ir("nexo-auditoria", "pronta")}>
          Abrir o parecer <Tecla>↵</Tecla>
        </Botao>
      </div>
    </div>
  );
}

/**
 * ACHADOS. O que está com você e o que você passou a alguém. Dois tiles no
 * topo (como as tarefas do Projeto) trocam o lado; a tabela lista os
 * pareceres com os níveis contados; à direita, o resumo ou os achados do
 * parecer escolhido, antes de abrir. Abrir leva ao parecer no Nexo.
 */
export function TelaAchados({ situacao }: { situacao: SituacaoAchados }) {
  const { k } = useTempo();
  const ir = useIr();
  const comVoce = situacao === "so-passados" || situacao === "nada" ? [] : COM_VOCE;
  const passou = situacao === "nada" ? [] : QUE_VOCE_PASSOU;
  const [lado, setLado] = useState<Lado>(situacao === "que-voce-passou" || situacao === "so-passados" ? "passou" : "com-voce");
  const [nivel, setNivel] = useState<Nivel>("todos");
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<string | null>(situacao === "parecer-escolhido" ? "c1" : null);
  const campo = useRef<HTMLInputElement>(null);
  const lista = lado === "com-voce" ? comVoce : passou;
  const visiveis = useMemo(
    () =>
      lista.filter(
        (p) =>
          (nivel === "todos" || p.achados.some((a) => a.impacto === nivel)) &&
          (!busca || semAcento(`${p.codigo} ${p.obra} ${p.titulo} ${p.pessoa} ${p.achados.map((a) => `${a.id} ${a.titulo}`).join(" ")}`).includes(semAcento(busca))),
      ),
    [lista, nivel, busca],
  );
  const parecer = lista.find((p) => p.id === sel) ?? null;

  const andar = (d: number) => {
    if (!visiveis.length) return;
    const i = parecer ? visiveis.indexOf(parecer) : -1;
    setSel(visiveis[Math.min(visiveis.length - 1, Math.max(0, i < 0 ? 0 : i + d))].id);
  };

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (alvo.closest("input, textarea")) {
        if (e.key === "Escape") (e.preventDefault(), alvo.blur());
        return;
      }
      // Ctrl/Meta/Alt são de outro dono (Ctrl K abre a busca de qualquer tela)
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "ArrowDown" || e.key === "j") (e.preventDefault(), andar(1));
      else if (e.key === "ArrowUp" || e.key === "k") (e.preventDefault(), andar(-1));
      else if (e.key === "/") (e.preventDefault(), campo.current?.focus());
      else if (e.key === "Tab" && !e.shiftKey && alvo === document.body) (e.preventDefault(), setLado((l) => (l === "com-voce" ? "passou" : "com-voce")), setSel(null));
      else if (e.key === "Escape" && sel) (e.preventDefault(), setSel(null));
    };
    document.addEventListener("keydown", tecla, true);
    return () => document.removeEventListener("keydown", tecla, true);
  });

  const nada = comVoce.length === 0 && passou.length === 0;
  const antigo = (ps: Parecer[]) => Math.max(0, ...ps.map((p) => p.dias));

  return (
    <div className="mp pj pr ac">
      <Topo atual="Achados" />
      <header className="mp-cabeca">
        <div>
          <p className="mp-trilha">
            <span>De todas as obras em que você trabalha</span>
          </p>
          <h1>Achados</h1>
        </div>
        <Botao variante="ghost" tamanho="sm" onClick={() => ir("inicio", "tarefa-escolhida")}>
          <FileSearch size={14} /> Nova auditoria
        </Botao>
      </header>

      <section className="mp-painel">
        {nada ? (
          <div className="pj-vazio">
            <p className="pj-vazio-titulo">Nada em aberto</p>
            <p className="mp-lado-sub">Nenhum achado está com você, e tudo o que você passou a alguém já foi tratado.</p>
            <div className="pj-vazio-acoes">
              <Botao variante="ghost" tamanho="sm" onClick={() => ir("inicio", "tarefa-escolhida")}>
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
                ] as [Lado, string, Parecer[]][]
              ).map(([id, nome, ps]) => (
                <button key={id} type="button" role="tab" aria-selected={lado === id} className="mp-tile pr-tarefa" onClick={() => (setLado(id), setSel(null))}>
                  <span className="mp-tile-rotulo">{nome}</span>
                  <span className="pr-tarefa-estado">{ps.length ? plural(total(ps), "achado", "achados") : "nada"}</span>
                  <span className="mp-tile-sub">
                    {ps.length
                      ? id === "com-voce"
                        ? `em ${plural(ps.length, "parecer", "pareceres")}, ${ps.flatMap((p) => p.achados).filter((a) => a.impacto === "block").length} impedem a entrega`
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
                    {(["todos", ...IMPACTOS.map((i) => i.id)] as Nivel[]).map((n) => {
                      const c = n === "todos" ? total(lista) : lista.flatMap((p) => p.achados).filter((a) => a.impacto === n).length;
                      if (n !== "todos" && !c) return null;
                      return (
                        <button key={n} type="button" role="tab" aria-selected={nivel === n} onClick={() => setNivel(n)}>
                          {n !== "todos" && (
                            <span className={`ac-nivel ac-nivel--${n}`}>
                              <i />
                            </span>
                          )}
                          {n === "todos" ? "Todos" : NOME_CURTO[n]} <span className="ds-num">{c}</span>
                          {nivel === n && <motion.i layoutId="ac-aba-marca" className="mp-aba-marca" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
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
                    <p className="mp-g-fraco">{lado === "com-voce" ? "Quando alguém passar um achado para você, ou uma auditoria sua tiver achados sem dono, ele aparece aqui." : "O que você passar a alguém aparece aqui até ser tratado."}</p>
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
                      const escolhido = sel === p.id;
                      return (
                        <div key={p.id} role="row" aria-selected={escolhido} className="mp-g-linha pj-linha" onClick={() => setSel(escolhido ? null : p.id)}>
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
                          <span className="mp-g-fraco">{p.pessoa.startsWith("Nexo") ? "sua auditoria" : p.pessoa}</span>
                          <span className={`ds-num ${p.dias >= 7 ? "mp-tom--aviso-texto" : "mp-g-fraco"}`}>{p.desde}</span>
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
                    <motion.div key={parecer ? parecer.id : `resumo-${lado}`} className="mp-lado-camada" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
                      {parecer ? (
                        <DoParecer p={parecer} lado={lado} />
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
