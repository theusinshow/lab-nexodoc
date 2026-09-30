"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowLeft, Download, FileSpreadsheet, FileText, ScrollText } from "lucide-react";
import { useEffect, useState } from "react";

import { Botao, Esqueleto, Menu, Segmento } from "@/components/ds/basicos";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import { ACHADOS, type Achado, type Disciplina } from "./dados";
import { Fila, type Filtro, type InicialDaFila } from "./fila";
import { estadoDaEmissao, type EstadoEmissao } from "./resumo";
import { ResumoC } from "./resumo-c";
import "./resultado-c.css";
import "./resultado.css";
import { VisorDoMemorial } from "./visor";
import "./visor.css";
import { Relatorio } from "./relatorio";
import "./relatorio.css";

export type SituacaoRes =
  | "nao-emitir"
  | "revisar"
  | "liberado"
  | "parcial"
  | "comparado"
  | "abrindo"
  | "nao-abriu"
  | "fila"
  | "decisao"
  | "selecionando"
  | "vazio-filtro"
  | "encerrado"
  | "parecer"
  | "parecer-gerando"
  | "parecer-erro"
  | "memorial"
  | "filtros"
  | "por-disciplina";

type Aba = "resumo" | "achados" | "parecer" | "documento";

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];

/** O selo do painel: o veredito numa palavra, na cor dele. */
const SELO: Record<EstadoEmissao, { rotulo: string; tom: "block" | "decide" | "ok" }> = {
  incompleto: { rotulo: "Análise parcial", tom: "block" },
  nao_emitir: { rotulo: "Não emitir", tom: "block" },
  revisar: { rotulo: "Revisar antes de emitir", tom: "decide" },
  liberado_com_ressalvas: { rotulo: "Liberado com ressalvas", tom: "ok" },
  liberado: { rotulo: "Liberado", tom: "ok" },
};

/** O anel do tratamento — o mesmo gesto do relógio da auditoria. */
function Anel({ fracao, completo }: { fracao: number | null; completo: boolean }) {
  const { dur } = useTempo();
  return (
    <svg className={`rs-anel${completo ? " rs-anel--completo" : ""}`} viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r="27" className="rs-anel-trilho" />
      {fracao !== null && (
        <motion.circle
          cx="32"
          cy="32"
          r="27"
          className="rs-anel-arco"
          transform="rotate(-90 32 32)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.max(0.001, fracao) }}
          transition={{ duration: dur("layout") * 3, ease: ease(CURVA.out) }}
        />
      )}
    </svg>
  );
}

/** O ponto de partida de cada situação: que achados, que aba, o que já vem aberto. */
function partida(s: SituacaoRes) {
  const base = { achados: ACHADOS, aba: "resumo" as Aba, parcial: false, comparado: false, fila: { selecionado: "ACH-002" } as InicialDaFila };
  switch (s) {
    case "revisar":
      // outra revisão: os bloqueios não existem mais
      return { ...base, achados: ACHADOS.filter((a) => a.impacto !== "block") };
    case "liberado":
      return { ...base, achados: ACHADOS.filter((a) => a.impacto === "note") };
    case "parcial":
      return { ...base, parcial: true };
    case "comparado":
      return { ...base, comparado: true };
    case "fila":
      return { ...base, aba: "achados" as Aba };
    case "decisao":
      return { ...base, aba: "achados" as Aba, fila: { selecionado: "ACH-005", decisao: true } };
    case "selecionando":
      return { ...base, aba: "achados" as Aba, fila: { selecionado: "ACH-005", filtro: "pendentes" as Filtro, marcados: ["ACH-005", "ACH-008", "ACH-009"] } };
    case "vazio-filtro":
      return { ...base, aba: "achados" as Aba, fila: { selecionado: "ACH-002", busca: "piso vinílico" } };
    case "parecer":
    case "parecer-gerando":
    case "parecer-erro":
      return { ...base, aba: "parecer" as Aba };
    case "filtros":
      return { ...base, aba: "achados" as Aba, fila: { selecionado: "ACH-003", discs: ["arquitetura"] as Disciplina[], painel: true } };
    case "por-disciplina":
      return { ...base, aba: "achados" as Aba, fila: { selecionado: "ACH-002", agrupar: "disciplina" as const } };
    case "encerrado":
      return { ...base, aba: "achados" as Aba, fila: { selecionado: "ACH-004" } };
    default:
      return base;
  }
}

/**
 * RESULTADO DA AUDITORIA. Duas perguntas, nesta ordem: posso emitir? e o que
 * falta tratar? O Resumo responde a primeira numa leitura (veredito como
 * posição numa faixa) e leva à segunda; a Fila trata um achado por vez, pelo
 * teclado: J e K andam, C corrige, D decide, F descarta.
 */
export function TelaResultado({ situacao }: { situacao: SituacaoRes }) {
  const { dur } = useTempo();
  const p = partida(situacao);
  const [achados, setAchados] = useState<Achado[]>(p.achados);
  const [aba, setAba] = useState<Aba>(p.aba);
  const [filaInicial, setFilaInicial] = useState(p.fila);
  const [carregando, setCarregando] = useState(situacao === "abrindo");
  const [visor, setVisor] = useState<{ aberto: boolean; achado: string | null }>({ aberto: situacao === ("memorial" as SituacaoRes), achado: situacao === ("memorial" as SituacaoRes) ? "ACH-002" : null });
  const [pdf, setPdf] = useState<"nada" | "abrindo" | "erro">(situacao === ("parecer-gerando" as SituacaoRes) ? "abrindo" : situacao === ("parecer-erro" as SituacaoRes) ? "erro" : "nada");
  useEffect(() => {
    if (pdf !== "abrindo" || situacao === ("parecer-gerando" as SituacaoRes)) return;
    const t = setTimeout(() => setPdf("nada"), 2200);
    return () => clearTimeout(t);
  }, [pdf, situacao]);

  useEffect(() => {
    if (!carregando) return;
    const t = setTimeout(() => setCarregando(false), 2600);
    return () => clearTimeout(t);
  }, [carregando]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea") || e.ctrlKey || e.metaKey || e.altKey) return;
      if (aba === "resumo" && e.key.toLowerCase() === "a") setAba("achados");
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aba]);

  const mudar = (id: string, desfecho: Achado["desfecho"] | undefined, responsavel?: string | null) =>
    setAchados((lista) => lista.map((a) => (a.id === id ? { ...a, desfecho, responsavel: responsavel === undefined ? a.responsavel : responsavel } : a)));

  const abrir = (id?: string) => {
    if (id) setFilaInicial({ selecionado: id });
    setAba("achados");
  };

  const pendentes = achados.filter((a) => !a.desfecho).length;
  const tratados = achados.length - pendentes;
  const bloqueiosAbertos = achados.filter((a) => a.impacto === "block" && !a.desfecho).length;
  const estado = estadoDaEmissao(achados, p.parcial);
  const revisao = situacao === "revisar" || situacao === "liberado" ? "B" : "A";

  if (situacao === "nao-abriu") {
    return (
      <div className="rs">
        <Topo atual="Painel" />
        <div className="rs-corpo rs-erro">
          <AlertTriangle size={20} />
          <h1>Não deu para abrir esta auditoria</h1>
          <p>O parecer não foi encontrado no servidor. Pode ter sido apagado junto com o projeto, ou o link veio de outra conta.</p>
          <div>
            <Botao variante="primary">
              <ArrowLeft /> Voltar ao painel
            </Botao>
            <Botao variante="ghost">Procurar em Projetos</Botao>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rs">
      <Topo atual="Painel" />
      <div className="rs-corpo">
        <header className={`rs-painel rs-painel--${SELO[estado].tom}`}>
          <div className="rs-painel-topo">
            <div className="rs-painel-texto">
              <div className="rs-painel-linha">
                <span className="rs-selo">
                  <i />
                  {SELO[estado].rotulo}
                </span>
                <span className="rs-obra">
                  <MarcaDaPrefeitura prefeitura="Criciúma" forma="sinal" />
                  <span className="ds-code">117-25</span>
                  <span>UBS da Rua São Francisco de Assis</span>
                </span>
              </div>
              <h1>Memorial geral, revisão {revisao}</h1>
              <p className="rs-arquivo">
                <span>117_25_md_geral_{revisao.toLowerCase()}.pdf, 42 páginas</span>
                <span className="rs-sep" />
                <span>Auditada hoje às 21:13 por Victor</span>
                <span className="rs-sep" />
                <span>levou 4:21</span>
              </p>
            </div>

            {/* o tratamento, no mesmo anel do relógio da auditoria: lá era tempo, aqui é trabalho */}
            <button type="button" className="rs-tratado" onClick={() => setAba("achados")} disabled={carregando}>
              <Anel fracao={carregando ? null : tratados / Math.max(1, achados.length)} completo={!pendentes} />
              <span className="rs-tratado-texto">
                <span className="rs-tratado-numero">
                  <b className="ds-num">
                    {tratados}
                    <small> de {achados.length}</small>
                  </b>
                  <small>tratados</small>
                </span>
                <span className="rs-tratado-falta">
                  {!pendentes ? "tudo tratado" : bloqueiosAbertos ? `${bloqueiosAbertos} ${bloqueiosAbertos === 1 ? "bloqueio pendente" : "bloqueios pendentes"}` : `${pendentes} pendentes`}
                </span>
              </span>
            </button>


          </div>
          <div className="rs-painel-abas">
            <Segmento
              rotulo="Visão do resultado"
              valor={aba}
              onTroca={setAba}
              opcoes={[
                { valor: "resumo", rotulo: "Resumo" },
                { valor: "achados", rotulo: <>Achados <em>{pendentes ? `${pendentes} pendentes` : "tudo tratado"}</em></> },
                { valor: "parecer", rotulo: "Relatório" },
                { valor: "documento", rotulo: "No documento" },
              ]}
            />
            <div className="rs-exportar">
              <Menu
                rotulo={
                  <>
                    <Download /> Exportar
                  </>
                }
                variante="quiet"
                itens={[
                  { rotulo: "Parecer em PDF", dica: "Monta o parecer para a prefeitura e abre numa aba nova", icone: <FileText size={14} />, onClick: () => setPdf("abrindo") },
                  { rotulo: "Relatório da auditoria", dica: "Texto corrido, todos os achados", icone: <ScrollText size={14} /> },
                  { rotulo: "Matriz de achados", dica: "Planilha, um achado por linha", icone: <FileSpreadsheet size={14} /> },
                ]}
              />
            </div>
          </div>
        </header>

        {carregando ? (
          <div className="rs-abrindo" aria-busy>
            <p>Buscando o parecer no servidor…</p>
            <Esqueleto largura="100%" altura={148} raio={18} />
            <Esqueleto largura="100%" altura={64} raio={16} />
            <div className="rs-abrindo-grade">
              <Esqueleto largura="100%" altura={190} raio={16} />
              <Esqueleto largura="100%" altura={190} raio={16} />
              <Esqueleto largura="100%" altura={190} raio={16} />
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={aba}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: dur("feedback") } }}
              transition={{ duration: dur("enter"), ease: ease(CURVA.out) }}
            >
              {aba === "resumo" && <ResumoC achados={achados} parcial={p.parcial} comparado={p.comparado} onAbrir={abrir} onMudar={(id, d) => mudar(id, d)} onVerNoMemorial={(id) => setVisor({ aberto: true, achado: id })}
                  onAbrirDisciplina={(d) => {
                    setFilaInicial({ selecionado: achados.find((a) => a.disc === d && !a.desfecho)?.id ?? achados.find((a) => a.disc === d)!.id, discs: [d], painel: true });
                    setAba("achados");
                  }}
                />}
              {aba === "achados" && <Fila key={filaInicial.selecionado} achados={achados} onMudar={mudar} inicial={filaInicial} onAbrirPagina={(id) => setVisor({ aberto: true, achado: id })} />}
              {aba === "parecer" && <Relatorio achados={achados} parcial={p.parcial} revisao={revisao} onPdf={() => setPdf("abrindo")} />}
              {aba === "documento" && (
                <div className="rs-depois">
                  O documento com os achados no lugar é a próxima tela do laboratório.
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
      <VisorDoMemorial
        achados={achados}
        inicial={visor.achado}
        aberto={visor.aberto}
        onFechar={() => setVisor((v) => ({ ...v, aberto: false }))}
        onIrParaAchado={(id) => {
          setVisor({ aberto: false, achado: null });
          abrir(id);
        }}
      />
      <AnimatePresence>
        {pdf !== "nada" && (
          <motion.div
            className="rs-aviso-pdf"
            role="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: dur("enter"), ease: ease(CURVA.out) }}
          >
            {pdf === "abrindo" ? (
              <>
                <i /> Gerando o parecer; ele abre numa aba nova para você conferir.
              </>
            ) : (
              <>
                Não foi possível gerar o parecer em PDF.
                <Botao variante="quiet" tamanho="sm" onClick={() => setPdf("abrindo")}>
                  Tentar de novo
                </Botao>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
