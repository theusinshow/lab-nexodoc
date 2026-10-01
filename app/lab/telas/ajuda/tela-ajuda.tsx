"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ChevronRight, FileSearch, Search } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";
import { useTempo } from "@/lib/ds/tempo";

import { useIr, type IdTela } from "../_comum/prototipo";
import { Topo } from "../_comum/topo";
import { RITMO, SUAVE } from "../conversa/turnos";
import { achaLugar, achaPalavra, achaTarefa, HIERARQUIA, LUGARES, PALAVRAS, semAcento, TAREFAS, type Lugar, type Palavra, type Tarefa } from "./dados";
import "../mapa/mapa.css";
import "./ajuda.css";

/*
 * AJUDA. A pessoa chega aqui perdida no meio de uma tarefa: a tela responde
 * "como faço" (Tarefas), "onde fica" (o caminho até o botão) e "o que quer
 * dizer" (Palavras). A mesma língua de Projetos: um painel, abas com
 * contagem, busca sem acento, tabela e o lado com a resposta inteira.
 */

export type SituacaoAjuda = "inicio" | "tarefa" | "onde-fica" | "palavra" | "busca" | "busca-vazia";
type Aba = "tarefas" | "lugares" | "palavras";
const ABAS: [Aba, string][] = [
  ["tarefas", "Tarefas"],
  ["lugares", "Onde fica"],
  ["palavras", "Palavras"],
];

/** O caminho até o botão, como trilha: Resultado › Levar adiante › Parecer em PDF. */
function Caminho({ partes }: { partes: string[] }) {
  return (
    <span className="aj-caminho">
      {partes.map((p, i) => (
        <Fragment key={p + i}>
          {i > 0 && <ChevronRight size={12} aria-hidden />}
          <span className={i === partes.length - 1 ? "aj-caminho-fim" : undefined}>{p}</span>
        </Fragment>
      ))}
    </span>
  );
}

function Teclas({ teclas }: { teclas: string }) {
  return (
    <span className="aj-teclas">
      {(teclas.includes("Ctrl") ? [teclas] : teclas.split(" ")).map((t) => (
        <Tecla key={t}>{t}</Tecla>
      ))}
    </span>
  );
}

/** Sem nada escolhido: o principal do Nexo, e como achar o resto. */
function OPrincipal({ onAbrir }: { onAbrir: (id: string) => void }) {
  const t = TAREFAS.find((x) => x.principal)!;
  return (
    <div className="mp-lado-bloco">
      <div className="mp-lista-cabeca">
        <p className="mp-lado-titulo">O principal</p>
        <p className="mp-lado-sub">Quase tudo começa por aqui: o Nexo lê o memorial e aponta o que não bate com a obra.</p>
      </div>
      <button type="button" className="aj-principal" onClick={() => onAbrir(t.id)}>
        <FileSearch size={18} aria-hidden />
        <span>
          <b>{t.nome}</b>
          <small>Precisa: {t.precisa}</small>
        </span>
        <ArrowRight size={14} className="aj-principal-seta" aria-hidden />
      </button>
      <div className="aj-dicas">
        <p>
          <Tecla>Ctrl K</Tecla> no Nexo procura as mesmas funções pelo nome ou por um sinônimo.
        </p>
        <p>
          <Tecla>/</Tecla> aqui procura em tarefas, lugares e palavras de uma vez.
        </p>
      </div>
    </div>
  );
}

/** Onde cada tarefa começa, no protótipo. */
const COMECA_EM: Record<string, [IdTela, string?]> = { Painel: ["inicio"], Resultado: ["nexo-auditoria", "pronta"], Nexo: ["nexo"] };

function DaTarefa({ t, onPalavra }: { t: Tarefa; onPalavra: (id: string) => void }) {
  const ir = useIr();
  return (
    <div className="mp-lado-bloco">
      <div className="aj-cabeca">
        {t.principal && <span className="aj-selo">o principal</span>}
        <p className="aj-titulo">{t.nome}</p>
        <p className="mp-lado-sub">
          Precisa: <span className="aj-forte">{t.precisa}</span>
        </p>
      </div>
      <ol className="aj-passos">
        {t.passos.map((p, i) => (
          <li key={i}>
            <span className="aj-n ds-num">{i + 1}</span>
            <div>
              <p>{p.texto}</p>
              {(p.caminho || p.tecla) && (
                <p className="aj-passo-meta">
                  {p.caminho && <Caminho partes={p.caminho} />}
                  {p.tecla && <Teclas teclas={p.tecla} />}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div className="aj-pe">
        <Botao variante="primary" tamanho="sm" onClick={() => COMECA_EM[t.comeca] && ir(...COMECA_EM[t.comeca])}>
          {t.ir} <Tecla>↵</Tecla>
        </Botao>
      </div>
      <div className="aj-relacionadas">
        <p className="aj-rotulo">Palavras desta tarefa</p>
        <div className="aj-fichas">
          {t.palavras.map((id) => {
            const p = PALAVRAS.find((x) => x.id === id);
            return p ? (
              <button key={id} type="button" className="aj-ficha" onClick={() => onPalavra(id)}>
                {p.termo}
              </button>
            ) : null;
          })}
        </div>
      </div>
    </div>
  );
}

function DoLugar({ l }: { l: Lugar }) {
  return (
    <div className="mp-lado-bloco">
      <div className="aj-cabeca">
        <p className="aj-titulo">{l.nome}</p>
        <p className="mp-lado-sub">
          Precisa antes: <span className="aj-forte">{l.precisa}</span>
        </p>
      </div>
      <div className="aj-trajeto" aria-label="Caminho">
        {l.caminho.map((p, i) => (
          <div key={p + i} className={`aj-trajeto-passo${i === l.caminho.length - 1 ? " aj-trajeto-passo--fim" : ""}`}>
            <i aria-hidden />
            <span>{p}</span>
            {i === l.caminho.length - 1 && l.tecla && <Teclas teclas={l.tecla} />}
          </div>
        ))}
      </div>
      {l.nota && <p className="aj-nota">{l.nota}</p>}
      <div className="aj-pe">
        <Botao variante="ghost" tamanho="sm">
          Ir para lá <Tecla>↵</Tecla>
        </Botao>
      </div>
    </div>
  );
}

function DaPalavra({ p, onLugar }: { p: Palavra; onLugar: (id: string) => void }) {
  return (
    <div className="mp-lado-bloco">
      <div className="aj-cabeca">
        <p className="aj-titulo">{p.termo}</p>
      </div>
      <p className="aj-definicao">{p.texto}</p>
      {p.nivel !== undefined && (
        <div className="aj-hierarquia">
          <p className="aj-rotulo">Onde fica na obra</p>
          <ol>
            {HIERARQUIA.map((h, i) => (
              <li key={h} className={i === p.nivel ? "aj-h--aqui" : i < p.nivel! ? "aj-h--acima" : undefined} style={{ paddingLeft: i * 14 }}>
                <i aria-hidden />
                {h}
              </li>
            ))}
          </ol>
        </div>
      )}
      {p.ve && (
        <div className="aj-relacionadas">
          <p className="aj-rotulo">Onde mexer</p>
          <div className="mp-acoes">
            {p.ve.map((id) => {
              const l = LUGARES.find((x) => x.id === id);
              return l ? (
                <button key={id} type="button" className="mp-acao" onClick={() => onLugar(id)}>
                  <ArrowRight size={14} />
                  {l.nome}
                </button>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function TelaAjuda({ situacao }: { situacao: SituacaoAjuda }) {
  const { k } = useTempo();
  const [aba, setAba] = useState<Aba>(situacao === "onde-fica" ? "lugares" : situacao === "palavra" ? "palavras" : "tarefas");
  const [busca, setBusca] = useState(situacao === "busca" ? "separatriz" : situacao === "busca-vazia" ? "boleto da prefeitura" : "");
  const [sel, setSel] = useState<string | null>(situacao === "tarefa" ? "auditar" : situacao === "onde-fica" ? "pdf" : situacao === "palavra" ? "achado" : null);
  const campo = useRef<HTMLInputElement>(null);
  const q = semAcento(busca.trim());

  const achados = useMemo(
    () => ({ tarefas: TAREFAS.filter((t) => achaTarefa(q, t)), lugares: LUGARES.filter((l) => achaLugar(q, l)), palavras: PALAVRAS.filter((p) => achaPalavra(q, p)) }),
    [q],
  );
  const lista = achados[aba];
  const total = achados.tarefas.length + achados.lugares.length + achados.palavras.length;

  const abrir = (a: Aba, id: string) => (setAba(a), setSel(id));
  const andar = (d: number) => {
    if (!lista.length) return;
    const i = lista.findIndex((x) => x.id === sel);
    setSel(lista[Math.min(lista.length - 1, Math.max(0, i < 0 ? 0 : i + d))].id);
  };

  // Na busca, a aba sem resultado cede para a primeira que tem.
  useEffect(() => {
    if (q && !achados[aba].length) {
      const outra = ABAS.find(([a]) => achados[a].length);
      if (outra) setAba(outra[0]);
    }
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (alvo.closest("input, textarea")) {
        if (e.key === "Escape") (e.preventDefault(), busca ? setBusca("") : alvo.blur());
        if (e.key === "ArrowDown" && alvo === campo.current) (e.preventDefault(), alvo.blur(), andar(1));
        return;
      }
      if (e.key === "ArrowDown" || e.key === "j") (e.preventDefault(), andar(1));
      else if (e.key === "ArrowUp" || e.key === "k") (e.preventDefault(), andar(-1));
      else if (e.key === "/") (e.preventDefault(), campo.current?.focus());
      else if (["1", "2", "3"].includes(e.key)) (e.preventDefault(), setAba(ABAS[Number(e.key) - 1][0]), setSel(null));
      else if (e.key === "Escape" && sel) (e.preventDefault(), setSel(null));
    };
    document.addEventListener("keydown", tecla, true);
    return () => document.removeEventListener("keydown", tecla, true);
  });

  const tarefa = aba === "tarefas" ? TAREFAS.find((t) => t.id === sel) : undefined;
  const lugar = aba === "lugares" ? LUGARES.find((l) => l.id === sel) : undefined;
  const palavra = aba === "palavras" ? PALAVRAS.find((p) => p.id === sel) : undefined;
  const chave = tarefa?.id ?? lugar?.id ?? palavra?.id ?? "principal";

  return (
    <div className="mp aj">
      <Topo atual="Ajuda" />
      <header className="mp-cabeca">
        <div>
          <p className="mp-trilha">
            <span>
              {TAREFAS.length} tarefas, {LUGARES.length} lugares, {PALAVRAS.length} palavras
            </span>
          </p>
          <h1>Ajuda</h1>
        </div>
      </header>

      <section className="mp-painel">
        <div className="mp-miolo">
          <div className="mp-principal">
            <div className="mp-ferramentas">
              <div className="mp-abas" role="tablist" aria-label="O que procurar">
                {ABAS.map(([id, nome]) => (
                  <button key={id} type="button" role="tab" aria-selected={aba === id} onClick={() => (setAba(id), setSel(null))}>
                    {nome} <span className="ds-num">{achados[id].length}</span>
                    {aba === id && <motion.i layoutId="aj-aba-marca" className="mp-aba-marca" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
                  </button>
                ))}
              </div>
              <label className="mp-busca aj-busca">
                <Search size={14} />
                <input ref={campo} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Uma função ou uma palavra" aria-label="Buscar na ajuda" />
                <Tecla>/</Tecla>
              </label>
            </div>

            <div className={`mp-grade aj-grade aj-grade--${aba}`} role="grid" aria-rowcount={lista.length}>
              {lista.length > 0 && (
                <div className="mp-g-cab" role="row">
                  <span>#</span>
                  {aba === "tarefas" && (
                    <>
                      <span>Tarefa</span>
                      <span>Precisa</span>
                      <span>Começa em</span>
                    </>
                  )}
                  {aba === "lugares" && (
                    <>
                      <span>Função</span>
                      <span>Onde fica</span>
                    </>
                  )}
                  {aba === "palavras" && (
                    <>
                      <span>Palavra</span>
                      <span>O que é</span>
                    </>
                  )}
                </div>
              )}
              {lista.map((item, i) => {
                const escolhida = sel === item.id;
                return (
                  <div key={item.id} role="row" aria-selected={escolhida} className="mp-g-linha aj-linha" onClick={() => setSel(escolhida ? null : item.id)}>
                    {escolhida && <motion.i layoutId="aj-sel" className="mp-g-sel" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
                    <span className="mp-g-n ds-num">{i + 1}</span>
                    {aba === "tarefas" && (
                      <>
                        <span className="aj-nome">
                          {(item as Tarefa).nome}
                          {(item as Tarefa).principal && <span className="aj-selo">o principal</span>}
                        </span>
                        <span className="mp-g-fraco">{(item as Tarefa).precisa}</span>
                        <span className="mp-g-fraco">{(item as Tarefa).comeca}</span>
                      </>
                    )}
                    {aba === "lugares" && (
                      <>
                        <span className="aj-nome">{(item as Lugar).nome}</span>
                        <Caminho partes={(item as Lugar).caminho} />
                      </>
                    )}
                    {aba === "palavras" && (
                      <>
                        <span className="aj-nome">{(item as Palavra).termo}</span>
                        <span className="mp-g-fraco aj-resumo">{(item as Palavra).texto}</span>
                      </>
                    )}
                    <ArrowRight size={14} className="aj-seta" />
                  </div>
                );
              })}
              {lista.length === 0 && (
                <div className="aj-sem">
                  <p>
                    Nada na ajuda com <b>“{busca}”</b>.
                  </p>
                  <p className="mp-g-fraco">A busca olha os nomes, os passos e os sinônimos. Tente a palavra que aparece na tela, como “parecer” ou “carimbo”.</p>
                  <div className="aj-sem-acoes">
                    <Botao variante="ghost" tamanho="sm" onClick={() => setBusca("")}>
                      Limpar a busca
                    </Botao>
                  </div>
                </div>
              )}
              {q && total > lista.length && lista.length > 0 && (
                <p className="aj-tambem">
                  Também em{" "}
                  {ABAS.filter(([a]) => a !== aba && achados[a].length).map(([a, nome], i, arr) => (
                    <Fragment key={a}>
                      <button type="button" onClick={() => (setAba(a), setSel(null))}>
                        {nome} <span className="ds-num">{achados[a].length}</span>
                      </button>
                      {i < arr.length - 1 ? " e " : ""}
                    </Fragment>
                  ))}
                </p>
              )}
            </div>
          </div>

          <aside className="mp-lado" aria-label="Resposta">
            <div className="mp-lado-troca">
              <AnimatePresence initial={false}>
                <motion.div
                  key={chave}
                  className="mp-lado-camada"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: RITMO.troca * k, ease: SUAVE }}
                >
                  {tarefa ? (
                    <DaTarefa t={tarefa} onPalavra={(id) => abrir("palavras", id)} />
                  ) : lugar ? (
                    <DoLugar l={lugar} />
                  ) : palavra ? (
                    <DaPalavra p={palavra} onLugar={(id) => abrir("lugares", id)} />
                  ) : (
                    <OPrincipal onAbrir={(id) => abrir("tarefas", id)} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </aside>
        </div>

        <footer className="mp-rodape">
          <span>
            <Tecla>↑</Tecla>
            <Tecla>↓</Tecla> item
          </span>
          <span>
            <Tecla>1</Tecla>
            <Tecla>2</Tecla>
            <Tecla>3</Tecla> aba
          </span>
          <span>
            <Tecla>/</Tecla> buscar
          </span>
          <span>
            <Tecla>↵</Tecla> ir para lá
          </span>
          <span>
            <Tecla>Esc</Tecla> voltar
          </span>
          <span className="mp-rodape-fim">os nomes são os da tela</span>
        </footer>
      </section>
    </div>
  );
}
