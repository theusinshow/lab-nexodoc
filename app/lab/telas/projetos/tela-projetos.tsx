"use client";

import { AnimatePresence, motion } from "motion/react";
import { Archive, ArchiveRestore, ArrowRight, FileSearch, Layers, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import { useIr } from "../_comum/prototipo";
import { RITMO, SUAVE } from "../conversa/turnos";
import { OBRAS, resumo, type Obra } from "./dados";
import "../mapa/mapa.css";
import "./projetos.css";

export type SituacaoProjetos = "lista" | "obra-escolhida" | "busca-vazia" | "arquivados" | "novo" | "vazia";

type Recorte = "ativos" | "arquivados" | "todos";
const RECORTES: [Recorte, string][] = [
  ["ativos", "Em andamento"],
  ["arquivados", "Arquivados"],
  ["todos", "Todos"],
];
const noRecorte = (r: Recorte, o: Obra) => (r === "todos" ? true : r === "arquivados" ? o.situacao === "ARCHIVED" : o.situacao !== "ARCHIVED");
/** Sem acento e sem caixa: quem digita "ginasio" acha "Ginásio". */
const semAcento = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const casa = (q: string, o: Obra) => !q || [o.codigo, o.nome, o.cliente, o.cidade, o.observacoes].some((c) => semAcento(c).includes(semAcento(q)));
const plural = (n: number, um: string, v: string) => `${n} ${n === 1 ? um : v}`;

/** Sem obra escolhida: por onde começar. Quem espera por você, e o que esfriou. */
function PorOndeComecar({ obras, onAbrir }: { obras: Obra[]; onAbrir: (id: string) => void }) {
  const comVoce = obras.filter((o) => o.comVoce);
  const paradas = obras.filter((o) => o.situacao === "ACTIVE" && o.dias >= 20);
  return (
    <div className="mp-lado-bloco">
      <div className="mp-lista-cabeca">
        <p className="mp-lado-titulo">Por onde começar</p>
        <p className="mp-lado-sub">
          {comVoce.reduce((s, o) => s + (o.comVoce ?? 0), 0)} achados esperam por você em {plural(comVoce.length, "obra", "obras")}.
        </p>
      </div>
      <ul className="mp-lista mp-lista--docs">
        {comVoce.map((o) => (
          <li key={o.id}>
            <span className="mp-lista-texto">
              <b className="pj-lado-obra">
                <span className="mp-mono">{o.codigo}</span> {o.nome}
              </b>
              <span className="mp-tom--aviso-texto">{plural(o.comVoce!, "achado com você", "achados com você")}</span>
            </span>
            <button type="button" className="mp-lista-ver" onClick={() => onAbrir(o.id)}>
              Ver
            </button>
          </li>
        ))}
      </ul>
      {paradas.length > 0 && (
        <>
          <p className="mp-insp-titulo pj-sep">Paradas há mais de 20 dias</p>
          <ul className="mp-lista mp-lista--docs">
            {paradas.map((o) => (
              <li key={o.id}>
                <span className="mp-lista-texto">
                  <b className="pj-lado-obra">
                    <span className="mp-mono">{o.codigo}</span> {o.nome}
                  </b>
                  <span>
                    {o.dias} dias. {o.observacoes || o.ultimos[0].oque}
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
function DaObra({ o }: { o: Obra }) {
  const arquivada = o.situacao === "ARCHIVED";
  const ir = useIr();
  return (
    <div className="mp-lado-bloco">
      <div className="pj-obra-cabeca">
        <p className="mp-trilha">
          <MarcaDaPrefeitura prefeitura={o.cliente} forma="selo" />
          <span className="mp-mono">{o.codigo}</span>
          <span>{o.cidade}</span>
          {arquivada && <span className="pj-arquivada">arquivado</span>}
        </p>
        <p className="pj-obra-nome">{o.nome}</p>
        {o.observacoes && <p className="mp-lado-sub">{o.observacoes}</p>}
      </div>

      <dl className="mp-campos">
        <div className="mp-campo">
          <dt>Espera</dt>
          <dd>
            {o.pendentes ? plural(o.pendentes, "achado aberto", "achados abertos") : "nada aberto"}
            {o.comVoce ? <small className="mp-tom--aviso-texto">{plural(o.comVoce, "com você", "com você")}</small> : null}
          </dd>
        </div>
        <div className="mp-campo">
          <dt>Tem</dt>
          <dd>{resumo(o.contagens) || "nada ainda"}</dd>
        </div>
        <div className="mp-campo">
          <dt>Cliente</dt>
          <dd>{o.cliente}</dd>
        </div>
      </dl>

      <div className="pj-ultimos">
        <p className="mp-insp-titulo">Por último</p>
        <ol>
          {o.ultimos.map((u) => (
            <li key={u.quando + u.oque}>
              <span className="ds-num">{u.quando}</span>
              <span>{u.oque}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mp-lado-pe pj-acoes">
        <Botao variante="primary" className="mp-gerar" onClick={() => ir("projeto", arquivada ? "arquivado" : "com-registros")}>
          {arquivada ? "Abrir" : "Retomar"} <Tecla>↵</Tecla>
        </Botao>
        <div className="mp-acoes">
          {!arquivada && (
            <>
              <button type="button" className="mp-acao" onClick={() => ir("nexo-auditoria", "rodando")}>
                <FileSearch size={14} /> Auditar documentos
              </button>
              <button type="button" className="mp-acao" onClick={() => ir("nexo", "soltou")}>
                <Layers size={14} /> Montar volume
              </button>
            </>
          )}
          <button type="button" className="mp-acao">
            {arquivada ? <ArchiveRestore size={14} /> : <Archive size={14} />} {arquivada ? "Voltar para em andamento" : "Arquivar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NovoProjeto({ onFechar }: { onFechar: () => void }) {
  return (
    <form className="mp-lado-bloco mp-form" onSubmit={(e) => (e.preventDefault(), onFechar())}>
      <div className="mp-lista-cabeca">
        <p className="mp-lado-titulo">Novo projeto</p>
        <p className="mp-lado-sub">Também nasce sozinho quando o Nexo lê um memorial de uma obra que ainda não está aqui.</p>
      </div>
      <label>
        <span>Código</span>
        <input className="mp-mono" placeholder="Ex.: SIM120-26" autoFocus />
      </label>
      <label>
        <span>Nome</span>
        <textarea rows={2} placeholder="Nome da obra, como vai na capa" />
      </label>
      <label>
        <span>Cliente</span>
        <input placeholder="Prefeitura ou contratante" />
      </label>
      <label>
        <span>Observações</span>
        <textarea rows={2} placeholder="Escopo, fase, lote" />
      </label>
      <div className="mp-form-acoes">
        <Botao variante="primary" tamanho="sm" type="submit">
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
 * PROJETOS. Achar a obra e entrar nela. Um painel: abas com contagem e busca
 * em cima, a tabela das obras (atualizadas primeiro) e, à direita, "por onde
 * começar" ou a obra escolhida, com o que espera nela e Retomar. Tudo pelo
 * teclado: / busca, ↑ ↓ andam, Enter entra, N cria.
 */
export function TelaProjetos({ situacao }: { situacao: SituacaoProjetos }) {
  const { k } = useTempo();
  const ir = useIr();
  const obras = situacao === "vazia" ? [] : OBRAS;
  const [recorte, setRecorte] = useState<Recorte>(situacao === "arquivados" ? "arquivados" : "ativos");
  const [busca, setBusca] = useState(situacao === "busca-vazia" ? "ginasio sao jose" : "");
  const [sel, setSel] = useState<string | null>(situacao === "obra-escolhida" ? "o1" : situacao === "arquivados" ? "o9" : null);
  const [novo, setNovo] = useState(situacao === "novo");
  const campo = useRef<HTMLInputElement>(null);
  const q = busca.trim().toLowerCase();
  const visiveis = useMemo(() => obras.filter((o) => noRecorte(recorte, o) && casa(q, o)), [obras, recorte, q]);
  const obra = obras.find((o) => o.id === sel) ?? null;

  const andar = (d: number) => {
    if (!visiveis.length) return;
    const i = obra ? visiveis.indexOf(obra) : -1;
    setNovo(false);
    setSel(visiveis[Math.min(visiveis.length - 1, Math.max(0, i < 0 ? 0 : i + d))].id);
  };

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (alvo.closest("input, textarea")) {
        if (e.key === "Escape") {
          e.preventDefault();
          if (novo) setNovo(false);
          else (alvo as HTMLInputElement).blur();
        }
        if (e.key === "ArrowDown" && alvo === campo.current) (e.preventDefault(), alvo.blur(), andar(1));
        return;
      }
      if (e.key === "ArrowDown" || e.key === "j") (e.preventDefault(), andar(1));
      else if (e.key === "ArrowUp" || e.key === "k") (e.preventDefault(), andar(-1));
      else if (e.key === "/") (e.preventDefault(), campo.current?.focus());
      else if (e.key === "n" || e.key === "N") (e.preventDefault(), setSel(null), setNovo(true));
      else if (e.key === "Escape" && (novo || sel)) (e.preventDefault(), novo ? setNovo(false) : setSel(null));
    };
    document.addEventListener("keydown", tecla, true);
    return () => document.removeEventListener("keydown", tecla, true);
  });

  const chaveDoLado = novo ? "novo" : obra ? obra.id : "comecar";

  return (
    <div className="mp pj">
      <Topo atual="Projetos" />
      <header className="mp-cabeca">
        <div>
          {obras.length > 0 && (
            <p className="mp-trilha">
              <span>
                {obras.filter((o) => o.situacao === "ACTIVE").length} em andamento, {obras.filter((o) => o.situacao === "ARCHIVED").length} arquivados
              </span>
            </p>
          )}
          <h1>Projetos</h1>
        </div>
        <Botao variante="ghost" tamanho="sm" onClick={() => (setSel(null), setNovo(true))}>
          <Plus size={14} /> Novo projeto <Tecla>N</Tecla>
        </Botao>
      </header>

      <section className="mp-painel">
        {obras.length === 0 ? (
          <div className="pj-vazio">
            <p className="pj-vazio-titulo">Nenhum projeto ainda</p>
            <p className="mp-lado-sub">Um projeto nasce quando o Nexo lê o memorial de uma obra nova, ou quando você cria um aqui.</p>
            <div className="pj-vazio-acoes">
              <Botao variante="primary" tamanho="sm">
                <Plus size={14} /> Novo projeto <Tecla>N</Tecla>
              </Botao>
              <Botao variante="ghost" tamanho="sm" onClick={() => ir("inicio", "tarefa-escolhida")}>
                Auditar um memorial
              </Botao>
            </div>
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
                      className={`mp-g-linha pj-linha${o.situacao === "ARCHIVED" ? " pj-linha--arquivada" : ""}`}
                      onClick={() => (setNovo(false), setSel(escolhida ? null : o.id))}
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
                      <span className="mp-g-fraco ds-num">{o.atualizado}</span>
                      <ArrowRight size={14} className="pj-seta" />
                    </div>
                  );
                })}
                {visiveis.length === 0 && (
                  <div className="pj-sem">
                    <p>
                      Nenhuma obra com <b>“{busca}”</b>
                      {recorte !== "todos" ? ` em ${recorte === "ativos" ? "andamento" : "arquivados"}` : ""}.
                    </p>
                    <p className="mp-g-fraco">A busca olha código, nome, cliente e observações.</p>
                    <div className="pj-vazio-acoes">
                      <Botao variante="ghost" tamanho="sm" onClick={() => setBusca("")}>
                        Limpar a busca
                      </Botao>
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
                    {novo ? <NovoProjeto onFechar={() => setNovo(false)} /> : obra ? <DaObra o={obra} /> : <PorOndeComecar obras={obras} onAbrir={(id) => setSel(id)} />}
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
          <span>
            <Tecla>N</Tecla> novo projeto
          </span>
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
