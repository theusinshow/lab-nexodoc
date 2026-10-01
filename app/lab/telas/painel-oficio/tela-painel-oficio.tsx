"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ArrowDown, ArrowUp, ChevronRight, FileSearch, Layers, RotateCcw } from "lucide-react";
import { Fragment, useMemo, useState } from "react";

import { Avatar, Botao, Esqueleto, Orbe, Segmento } from "@/components/ds/basicos";
import { ETAPAS, LINHA, USUARIO, type ObraNaLinha } from "@/lib/design-lab/amostras";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import { EM_CURSO, NOTAS_DE_TEXTO, RETOMAR, TRAVANDO, type AchadoQueTrava } from "./dados";

import "./painel-oficio.css";

export type SituacaoDoOficio = "dia-normal" | "nexo-trabalhando" | "nada-travando" | "primeiro-acesso" | "carregando" | "erro" | "arrastando";

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];

/*
 * O PAINEL "OFÍCIO" (01/10/2026): a mesma tela, na linguagem da revisão de
 * documento em vez da de um app de IA.
 *  - Sem saudação centralizada: a tela abre num CARIMBO (o quadro de título da
 *    prancha) com as duas funções do Nexo à mão.
 *  - O que trava a emissão vem primeiro, como a marcação do revisor: o trecho
 *    do documento, com a parte errada sublinhada a caneta.
 *  - A interface é grafite; cor só na marcação (bloqueia, decide) e no orbe,
 *    que fica pequeno no topo, como indicador.
 *  - Trabalho do Nexo aparece como mostrador: blocos lidos, tempo que falta.
 */
export function TelaPainelOficio({ situacao }: { situacao: SituacaoDoOficio }) {
  const { dur, mola } = useTempo();
  const vazio = situacao === "primeiro-acesso";
  const trabalhando = situacao === "nexo-trabalhando";
  const semTrava = situacao === "nada-travando" || vazio;
  const [lista, setLista] = useState<"ok" | "carregando" | "erro">(situacao === "carregando" ? "carregando" : situacao === "erro" ? "erro" : "ok");
  const [aberto, setAberto] = useState<string | null>("a1");
  const [arrastando, setArrastando] = useState(situacao === "arrastando");

  const travando = semTrava ? [] : TRAVANDO;
  const bloqueios = travando.filter((a) => a.gravidade === "block").length;
  const decisoes = travando.filter((a) => a.gravidade === "decide").length;

  function tentarDeNovo() {
    setLista("carregando");
    setTimeout(() => setLista("ok"), 1100 * (dur("layout") / 0.32));
  }

  return (
    <div
      className="pf"
      onDragEnter={(e) => {
        e.preventDefault();
        setArrastando(true);
      }}
    >
      <Topo atual="Painel" trabalhando={trabalhando} aviso={!semTrava} />

      <div className="pf-folha">
        {/* ---------- o carimbo ---------- */}
        <header className="pf-carimbo">
          <Campo rotulo="Escritório" valor={USUARIO.escritorio} />
          <Campo rotulo="Responsável" valor={`${USUARIO.nome}, ${USUARIO.papel}`} />
          <Campo rotulo="Data" valor="01/10/2026, qua" mono />
          <Campo rotulo="Obras abertas" valor={vazio ? "0" : String(LINHA.filter((o) => o.etapa < 6).length)} mono />
          <div className="pf-campo pf-campo--trava">
            <span>Travando a emissão</span>
            {semTrava ? (
              <b className="ds-num">nada</b>
            ) : (
              <b className="ds-num">
                <em className="pf-tinta--block">{bloqueios}</em> {bloqueios === 1 ? "bloqueio" : "bloqueios"} ·{" "}
                <em className="pf-tinta--decide">{decisoes}</em> {decisoes === 1 ? "decisão" : "decisões"}
              </b>
            )}
          </div>
          <div className="pf-carimbo-acoes">
            <Botao variante="primary">
              <FileSearch />
              Auditar um memorial
            </Botao>
            <Botao variante="ghost">
              <Layers />
              Montar um volume
            </Botao>
            <small>ou solte o PDF em qualquer lugar da tela</small>
          </div>
        </header>

        {/* ---------- em curso: um mostrador, não um "pensando" ---------- */}
        {trabalhando && (
          <div className="pf-mostrador" role="status">
            <Orbe tamanho={14} estado="trabalhando" />
            <b>{EM_CURSO.oque}</b>
            <span className="ds-code">{EM_CURSO.obra}</span>
            <span className="pf-cinza">{EM_CURSO.etapa}</span>
            <Regua total={EM_CURSO.blocos} feitos={EM_CURSO.lidos} />
            <span className="ds-num">
              {EM_CURSO.lidos} de {EM_CURSO.blocos} blocos
            </span>
            <span className="ds-num pf-cinza">~{EM_CURSO.resta} para terminar</span>
            <Botao variante="quiet" tamanho="sm">
              Cancelar
            </Botao>
          </div>
        )}

        {/* ---------- onde você parou ---------- */}
        {!vazio && (
          <div className="pf-retomar">
            <span className="pf-cinza">Onde você parou</span>
            <span className="ds-code">{RETOMAR.obra}</span>
            <b>
              {RETOMAR.documento}, rev. {RETOMAR.revisao}
            </b>
            <span className="ds-num">
              p. {RETOMAR.pagina} de {RETOMAR.paginas}
            </span>
            <Regua total={RETOMAR.paginas} feitos={RETOMAR.pagina} fina />
            <span className="pf-cinza">{RETOMAR.quando}</span>
            <Botao variante="ghost" tamanho="sm">
              Continuar
              <ChevronRight />
            </Botao>
          </div>
        )}

        {/* ---------- o que trava a emissão ---------- */}
        <section className="pf-secao" aria-labelledby="pf-travando">
          <div className="pf-secao-cabeca">
            <h2 id="pf-travando">Travando a emissão</h2>
            {!semTrava && <span className="ds-num pf-cinza">{travando.length} achados</span>}
          </div>
          {semTrava ? (
            <p className="pf-nada">
              {vazio ? (
                "Nenhuma auditoria ainda. O que travar a emissão de uma obra aparece aqui, com o trecho do documento."
              ) : (
                <>
                  Nada travando a emissão. Última auditoria: <span className="ds-code">117-25</span>, hoje às 14:20.{" "}
                  <span className="ds-num">{NOTAS_DE_TEXTO}</span> notas de texto em aberto.
                </>
              )}
            </p>
          ) : (
            <div className="pf-tabela pf-tabela--trava" role="table" aria-label="Achados que travam a emissão">
              <div className="pf-th" role="row">
                <span role="columnheader" />
                <span role="columnheader">Achado</span>
                <span role="columnheader">Obra</span>
                <span role="columnheader">Onde</span>
                <span role="columnheader">O que</span>
                <span role="columnheader">Com</span>
                <span role="columnheader" className="pf-dir">
                  Parado
                </span>
              </div>
              {travando.map((a) => (
                <LinhaDoAchado key={a.id} a={a} aberto={aberto === a.id} onAlternar={() => setAberto((x) => (x === a.id ? null : a.id))} />
              ))}
              <p className="pf-rodape">
                Mais <span className="ds-num">{NOTAS_DE_TEXTO}</span> notas de texto, que não travam a emissão.
              </p>
            </div>
          )}
        </section>

        {/* ---------- as obras ---------- */}
        <Obras estado={vazio ? "vazio" : lista} onTentar={tentarDeNovo} />
      </div>

      {/* ---------- soltar PDF ---------- */}
      <AnimatePresence>
        {arrastando && (
          <motion.div
            className="pf-soltar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur("state") }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => {
              if (e.currentTarget === e.target) setArrastando(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setArrastando(false);
            }}
            onClick={() => setArrastando(false)}
          >
            <motion.div className="pf-soltar-caixa" initial={{ scale: 0.98 }} animate={{ scale: 1 }} transition={mola("gentle")}>
              <div className="pf-soltar-alvo">
                <b>Memorial</b>
                <span>vira auditoria</span>
              </div>
              <div className="pf-soltar-alvo">
                <b>Pranchas</b>
                <span>viram LD, capa e volume</span>
              </div>
              <small>Solte o PDF. O Nexo lê a capa e escolhe sozinho.</small>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Campo({ rotulo, valor, mono }: { rotulo: string; valor: string; mono?: boolean }) {
  return (
    <div className="pf-campo">
      <span>{rotulo}</span>
      <b className={mono ? "ds-num" : undefined}>{valor}</b>
    </div>
  );
}

/** Régua de células: o progresso como contagem, não como barra que desliza. */
function Regua({ total, feitos, fina }: { total: number; feitos: number; fina?: boolean }) {
  return (
    <span className={`pf-regua${fina ? " pf-regua--fina" : ""}`} aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} data-feito={i < feitos || undefined} data-agora={i === feitos || undefined} />
      ))}
    </span>
  );
}

/** O trecho do documento com a parte errada sublinhada: [assim]. */
function Trecho({ texto, gravidade }: { texto: string; gravidade: AchadoQueTrava["gravidade"] }) {
  const partes = texto.split(/(\[[^\]]+\])/);
  return (
    <>
      {partes.map((p, i) =>
        p.startsWith("[") ? (
          <mark key={i} className={`pf-caneta pf-caneta--${gravidade}`}>
            {p.slice(1, -1)}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

function LinhaDoAchado({ a, aberto, onAlternar }: { a: AchadoQueTrava; aberto: boolean; onAlternar: () => void }) {
  const { dur } = useTempo();
  return (
    <div className={`pf-achado${aberto ? " pf-achado--aberto" : ""}`} role="rowgroup">
      <button type="button" className="pf-tr" role="row" aria-expanded={aberto} onClick={onAlternar}>
        <span role="cell">
          <i className={`pf-marca pf-marca--${a.gravidade}`} aria-label={a.gravidade === "block" ? "Bloqueia" : "Decide"} />
        </span>
        <span role="cell" className="ds-code">
          {a.sigla}
        </span>
        <span role="cell" className="ds-code">
          {a.obra}
        </span>
        <span role="cell" className="pf-cinza">
          <span className="ds-num">p. {a.pagina}</span> · {a.disciplina}
        </span>
        <span role="cell" className="pf-oque">
          {a.oque}
        </span>
        <span role="cell">
          <Avatar iniciais={a.com} pequeno />
        </span>
        <span role="cell" className={`ds-num pf-dir${a.dias >= 30 ? " pf-tinta--decide" : " pf-cinza"}`}>
          {a.dias === 0 ? "hoje" : `${a.dias} d`}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {aberto && (
          <motion.div
            className="pf-evidencia"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: dur("layout"), ease: ease(CURVA.out) }}
          >
            <div className="pf-evidencia-dentro">
              <div className="pf-papel">
                <span className="pf-papel-margem ds-num">
                  {a.documento} · p. {a.pagina}
                </span>
                <p>
                  <Trecho texto={a.trecho} gravidade={a.gravidade} />
                </p>
              </div>
              <div className="pf-evidencia-lado">
                <span className="pf-cinza">Conferido contra</span>
                <span>{a.contra}</span>
                <span className="pf-evidencia-acoes">
                  <Botao variante="ghost" tamanho="sm">
                    Abrir no documento
                  </Botao>
                  <Botao variante="quiet" tamanho="sm">
                    Marcar corrigido
                  </Botao>
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type Ordem = { coluna: "codigo" | "etapa" | "dias"; desc: boolean };
type Obra = Omit<ObraNaLinha, "tom"> & { tom: ObraNaLinha["tom"] | "neutro" };

function Obras({ estado, onTentar }: { estado: "ok" | "carregando" | "erro" | "vazio"; onTentar: () => void }) {
  const { mola } = useTempo();
  const [escopo, setEscopo] = useState<"minhas" | "todas">("todas");
  const [ordem, setOrdem] = useState<Ordem>({ coluna: "dias", desc: true });

  const obras = useMemo(() => {
    const base: Obra[] = LINHA.filter((o) => o.etapa < 6)
      // a tabela de cima é a fonte: só tem decisão aqui quem tem achado lá
      .map((o) => (o.codigo === "117-25" ? { ...o, trava: "1 bloqueio e 1 decisão com você" } : o.codigo === "SIM031-26" ? { ...o, trava: "Esperando a revisão B do memorial", tom: "neutro" as const } : o))
      // COR SÓ PARA ACHADO: esperar memorial, faltar capa ou conferir volume é
      // andamento, não marcação de revisor; essas ficam em cinza.
      .map((o) => ((o.tom === "block" || o.tom === "decide") && !/achado|decis|bloqueio/.test(o.trava) ? { ...o, tom: "neutro" as const } : o))
      .filter((o) => escopo === "todas" || o.responsavel === "VI");
    const v = (o: Obra) => (ordem.coluna === "codigo" ? o.codigo : ordem.coluna === "etapa" ? o.etapa : o.diasNaEtapa);
    return [...base].sort((x, y) => {
      const a = v(x), b = v(y);
      const r = typeof a === "string" ? a.localeCompare(b as string) : a - (b as number);
      return ordem.desc ? -r : r;
    });
  }, [escopo, ordem]);

  const cab = (coluna: Ordem["coluna"], rotulo: string, dir?: boolean) => {
    const ativa = ordem.coluna === coluna;
    return (
      <button
        type="button"
        role="columnheader"
        aria-sort={ativa ? (ordem.desc ? "descending" : "ascending") : "none"}
        className={`pf-ordenar${dir ? " pf-dir" : ""}${ativa ? " pf-ordenar--ativa" : ""}`}
        onClick={() => setOrdem((o) => ({ coluna, desc: o.coluna === coluna ? !o.desc : coluna !== "codigo" }))}
      >
        {rotulo}
        {ativa && (ordem.desc ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
      </button>
    );
  };

  return (
    <section className="pf-secao" aria-labelledby="pf-obras">
      <div className="pf-secao-cabeca">
        <h2 id="pf-obras">Obras</h2>
        {estado === "ok" && (
          <>
            <span className="ds-num pf-cinza">{obras.length} abertas</span>
            <span style={{ marginLeft: "auto" }}>
              <Segmento
                rotulo="Quais obras"
                valor={escopo}
                onTroca={setEscopo}
                opcoes={[
                  { valor: "todas", rotulo: "Todas" },
                  { valor: "minhas", rotulo: "Minhas" },
                ]}
              />
            </span>
          </>
        )}
      </div>

      {estado === "vazio" ? (
        <p className="pf-nada">
          Nenhuma obra ainda. Solte o primeiro memorial ou as pranchas de uma obra em qualquer lugar desta tela: o Nexo lê a capa e cria a obra.
        </p>
      ) : estado === "erro" ? (
        <div className="pf-erro" role="alert">
          <b>Não deu para carregar as obras.</b>
          <span className="pf-cinza">O servidor não respondeu. O resto do painel continua funcionando.</span>
          <Botao variante="ghost" tamanho="sm" onClick={onTentar}>
            <RotateCcw />
            Tentar de novo
          </Botao>
        </div>
      ) : (
        <div className="pf-tabela pf-tabela--obras" role="table" aria-label="Obras abertas" aria-busy={estado === "carregando"}>
          <div className="pf-th" role="row">
            {cab("codigo", "Código")}
            <span role="columnheader">Obra</span>
            <span role="columnheader">Prefeitura</span>
            {cab("etapa", "Etapa")}
            <span role="columnheader">O que segura</span>
            {cab("dias", "Na etapa", true)}
            <span role="columnheader">Resp.</span>
          </div>
          {estado === "carregando" ? (
            [0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="pf-tr pf-tr--esqueleto" role="row">
                <Esqueleto largura={64} altura={11} />
                <Esqueleto largura={[300, 240, 330, 220, 280, 260][i]} altura={11} />
                <Esqueleto largura={84} altura={11} />
                <Esqueleto largura={108} altura={8} />
                <Esqueleto largura={[150, 120, 170, 140, 130, 160][i]} altura={11} />
                <Esqueleto largura={28} altura={11} />
                <Esqueleto largura={20} altura={20} raio={999} />
              </div>
            ))
          ) : (
            <LayoutGroup>
              {obras.map((o) => (
                <motion.div key={o.id} layout="position" transition={mola("smooth")} className="pf-tr" role="row">
                  <span role="cell" className="ds-code">
                    {o.codigo}
                  </span>
                  <span role="cell" className="pf-obra">
                    {o.nome}
                  </span>
                  <span role="cell" className="pf-prefeitura">
                    <MarcaDaPrefeitura prefeitura={o.cidade} forma="sinal" />
                    {o.cidade}
                  </span>
                  <span role="cell" className="pf-etapa">
                    <span className="pf-regua pf-regua--etapa" aria-hidden>
                      {ETAPAS.map((e, i) => (
                        <i key={e} data-feito={i < o.etapa || undefined} data-agora={i === o.etapa || undefined} data-tom={i === o.etapa ? o.tom : undefined} />
                      ))}
                    </span>
                    <span className="pf-cinza">{ETAPAS[o.etapa]}</span>
                  </span>
                  <span role="cell" className={o.tom === "block" || o.tom === "decide" ? `pf-tinta--${o.tom}` : "pf-cinza"}>
                    {o.tom === "nexo" && <Orbe tamanho={11} estado="trabalhando" />}
                    {o.trava}
                  </span>
                  <span role="cell" className={`ds-num pf-dir${o.diasNaEtapa >= 30 ? " pf-tinta--decide" : ""}`}>
                    {o.diasNaEtapa === 0 ? "hoje" : `${o.diasNaEtapa} d`}
                  </span>
                  <span role="cell">
                    <Avatar iniciais={o.responsavel} pequeno />
                  </span>
                </motion.div>
              ))}
            </LayoutGroup>
          )}
        </div>
      )}
    </section>
  );
}
