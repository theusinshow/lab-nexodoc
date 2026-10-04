"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Check, ChevronRight, Download, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Avatar, Botao, Esqueleto, Segmento, Selo, Seletor } from "@/components/ds/basicos";
import { ETAPAS, LINHA, type ObraNaLinha } from "@/lib/design-lab/amostras";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import "./projetos-c.css";

export type SituacaoC = "todas" | "gargalo" | "obra-aberta" | "carregando" | "vazio";

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];

const PROXIMO: Record<number, string> = {
  0: "Pedir o memorial",
  1: "Ver a auditoria",
  2: "Abrir os achados",
  3: "Gerar capa e LD",
  4: "Conferir o volume",
  5: "Emitir",
};

/**
 * PROJETOS C — a linha de produção. Toda obra do escritório passa pelas mesmas
 * seis etapas até sair; a tela mostra ONDE cada uma está e O QUE a segura. O
 * cabeçalho de cada etapa é um filtro: clicar em "Correções" mostra o gargalo.
 */
export function TelaProjetosC({ situacao }: { situacao: SituacaoC }) {
  const { dur, mola, k } = useTempo();
  const [etapa, setEtapa] = useState<number | null>(situacao === "gargalo" ? 2 : null);
  const [aberta, setAberta] = useState<string | null>(situacao === "obra-aberta" ? "l4" : null);
  const [escopo, setEscopo] = useState<"ativas" | "emitidas" | "todas">("ativas");
  const [cidade, setCidade] = useState("todas");
  const carregando = situacao === "carregando";
  const vazio = situacao === "vazio";

  const base = useMemo(() => {
    let l = vazio ? [] : LINHA;
    if (escopo === "ativas") l = l.filter((o) => o.etapa < 6);
    if (escopo === "emitidas") l = l.filter((o) => o.etapa >= 6);
    if (cidade !== "todas") l = l.filter((o) => o.cidade === cidade);
    return [...l].sort((a, b) => a.etapa - b.etapa || b.diasNaEtapa - a.diasNaEtapa);
  }, [escopo, cidade, vazio]);
  const obras = etapa === null ? base : base.filter((o) => o.etapa === etapa);
  const porEtapa = ETAPAS.map((_, i) => base.filter((o) => o.etapa === i).length);
  const maior = Math.max(1, ...porEtapa);

  return (
    <div className="pc">
      <Topo atual="Projetos" trabalhando />
      <div className="pc-corpo">
        <header className="pc-cabeca">
          <div>
            <h1>Projetos</h1>
            <p>Onde cada obra está, do memorial ao volume emitido, e o que a segura.</p>
          </div>
          <div className="pc-cabeca-acoes">
            <Botao variante="ghost">
              <Download />
              Exportar lista
            </Botao>
            <Botao variante="primary">
              <Plus />
              Novo projeto
            </Botao>
          </div>
        </header>

        <div className="pc-ferramentas">
          <label className="pc-busca">
            <Search size={15} />
            <input placeholder="Buscar por código, obra ou cliente" aria-label="Buscar obra" />
          </label>
          <Segmento
            rotulo="Quais obras"
            valor={escopo}
            onTroca={(v) => {
              setEscopo(v);
              setEtapa(null);
            }}
            opcoes={[
              { valor: "ativas", rotulo: "Em andamento" },
              { valor: "emitidas", rotulo: "Emitidas" },
              { valor: "todas", rotulo: "Todas" },
            ]}
          />
          <Seletor
            prefixo="Prefeitura"
            valor={cidade}
            onTroca={setCidade}
            opcoes={[
              { valor: "todas", rotulo: "todas" },
              { valor: "Criciúma", rotulo: "Criciúma" },
              { valor: "Florianópolis", rotulo: "Florianópolis" },
              { valor: "Chapecó", rotulo: "Chapecó" },
              { valor: "São José", rotulo: "São José" },
              { valor: "Tubarão", rotulo: "Tubarão" },
            ]}
          />
          <AnimatePresence>
            {etapa !== null && (
              <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: dur("state") }}>
                <Botao variante="quiet" tamanho="sm" onClick={() => setEtapa(null)}>
                  Só em {ETAPAS[etapa]} ×
                </Botao>
              </motion.span>
            )}
          </AnimatePresence>
          <span className="pc-conta ds-num">
            {obras.length} de {LINHA.length} obras
          </span>
        </div>

        <div className="pc-tabela">
          {/* cabeçalho: cada etapa é um filtro com a contagem */}
          <div className="pc-linha pc-linha--cabeca">
            <span className="pc-col-obra">Obra</span>
            <LayoutGroup id="etapas">
              {ETAPAS.map((nome, i) => (
                <button
                  key={nome}
                  type="button"
                  className="pc-etapa-cabeca"
                  aria-pressed={etapa === i}
                  onClick={() => setEtapa((e) => (e === i ? null : i))}
                  disabled={carregando || vazio}
                >
                  {etapa === i && <motion.span layoutId="pc-etapa-ativa" className="pc-etapa-ativa" transition={mola("snappy")} />}
                  <span className="pc-etapa-nome">{nome}</span>
                  <span className="pc-etapa-conta ds-num">{carregando ? "–" : porEtapa[i]}</span>
                  <span className="pc-etapa-barra">
                    <motion.i
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: carregando ? 0 : porEtapa[i] / maior }}
                      transition={{ duration: dur("layout") * 1.5, ease: ease(CURVA.out), delay: 0.04 * i * k }}
                    />
                  </span>
                </button>
              ))}
            </LayoutGroup>
          </div>

          {carregando ? (
            [0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="pc-linha pc-linha--esqueleto">
                <span className="pc-col-obra" style={{ display: "grid", gap: 8 }}>
                  <Esqueleto largura={[260, 220, 280, 240, 200, 250][i]} altura={13} />
                  <Esqueleto largura={160} altura={10} />
                </span>
                <span className="pc-trilha-esq">
                  <Esqueleto largura="100%" altura={2} />
                </span>
              </div>
            ))
          ) : obras.length === 0 ? (
            <div className="pc-vazio">
              <b>{vazio ? "Nenhuma obra ainda." : "Nenhuma obra nesta etapa."}</b>
              <span>
                {vazio
                  ? "Crie um projeto ou solte o memorial de uma obra no Nexo; ela entra aqui em Documentos e avança sozinha conforme o trabalho acontece."
                  : "Bom sinal: nada está parado aqui."}
              </span>
              {vazio && (
                <Botao variante="ghost" tamanho="sm">
                  <Plus />
                  Novo projeto
                </Botao>
              )}
            </div>
          ) : (
            <LayoutGroup id="obras">
              <AnimatePresence initial={false}>
                {obras.map((o, idx) => (
                  <LinhaDaObra key={o.id} o={o} idx={idx} aberta={aberta === o.id} onAlternar={() => setAberta((a) => (a === o.id ? null : o.id))} destaque={etapa} />
                ))}
              </AnimatePresence>
            </LayoutGroup>
          )}
        </div>
        <p className="pc-nota">
          A etapa de cada obra é deduzida do que o sistema já guarda: arquivos enviados, auditorias, achados abertos, LD, capa e volume gerados. Se
          vocês registrarem prazo de entrega, ele entra ao lado dos dias nesta etapa.
        </p>
      </div>
    </div>
  );
}

function LinhaDaObra({ o, idx, aberta, onAlternar, destaque }: { o: ObraNaLinha; idx: number; aberta: boolean; onAlternar: () => void; destaque: number | null }) {
  const { dur, mola, k } = useTempo();
  const emitida = o.etapa >= 6;
  // A linha vai do centro da 1ª etapa ao centro da última; preenche até o
  // centro da etapa atual — etapa/5 do comprimento — ou inteira, se emitida.
  const preenchido = emitida ? 1 : o.etapa / (ETAPAS.length - 1);

  return (
    <motion.div
      layout="position"
      className={`pc-obra${aberta ? " pc-obra--aberta" : ""}`}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ ...mola("smooth"), opacity: { duration: dur("enter") } }}
    >
      <div className="pc-linha" role="button" tabIndex={0} aria-expanded={aberta} onClick={onAlternar} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onAlternar()}>
        <span className="pc-col-obra">
          <span className="pc-obra-nome">
            <MarcaDaPrefeitura prefeitura={o.cidade} forma="sinal" />
            <b>{o.nome}</b>
          </span>
          <span className="pc-obra-meta">
            <span className="ds-code">{o.codigo}</span>
            {o.cidade}
            <span className={`pc-trava pc-trava--${o.tom}`}>{o.trava}</span>
          </span>
        </span>

        <span className="pc-trilha" aria-label={emitida ? "Emitida" : `Etapa atual: ${ETAPAS[o.etapa]}. ${o.trava}.`}>
          <span className="pc-trilha-fundo" />
          <motion.span
            className={`pc-trilha-feita${emitida ? " pc-trilha-feita--ok" : ""}`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: preenchido }}
            transition={{ duration: dur("layout") * 2, ease: ease(CURVA.out), delay: Math.min(idx, 8) * 0.04 * k }}
          />
          {ETAPAS.map((nome, i) => {
            const feita = emitida || i < o.etapa;
            const atual = !emitida && i === o.etapa;
            return (
              <span key={nome} className={`pc-no${destaque === i ? " pc-no--coluna" : ""}`}>
                {feita ? (
                  <span className="pc-no-feito">
                    <Check size={10} strokeWidth={3} />
                  </span>
                ) : atual ? (
                  <span className={`pc-no-atual pc-no-atual--${o.tom}`}>
                    {o.tom === "nexo" && <span className="pc-no-pulso" />}
                  </span>
                ) : (
                  <span className="pc-no-futuro" />
                )}
              </span>
            );
          })}
        </span>

        <span className="pc-col-fim">
          {emitida ? <Selo tom="ok">Emitida</Selo> : <span className="pc-dias ds-num">{o.diasNaEtapa === 0 ? "hoje" : `${o.diasNaEtapa} d`}</span>}
          <Avatar iniciais={o.responsavel} pequeno />
        </span>
      </div>

      <AnimatePresence initial={false}>
        {aberta && (
          <motion.div
            className="pc-obra-corpo"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: dur("layout"), ease: ease(CURVA.out) }}
          >
            <div className="pc-obra-detalhe">
              <div>
                <span className="pc-nota">{emitida ? "Concluída" : `Em ${ETAPAS[o.etapa]} há ${o.diasNaEtapa === 0 ? "menos de um dia" : `${o.diasNaEtapa} dias`}`}</span>
                <b>{o.trava}</b>
              </div>
              <div className="pc-obra-acoes">
                {!emitida && (
                  <Botao variante="ghost" tamanho="sm">
                    {PROXIMO[o.etapa]}
                  </Botao>
                )}
                <Botao variante="quiet" tamanho="sm">
                  Atribuir
                </Botao>
                <Botao variante="quiet" tamanho="sm">
                  Abrir projeto
                  <ChevronRight />
                </Botao>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
