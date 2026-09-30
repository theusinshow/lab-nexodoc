"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowLeft, FileSearch, FileSpreadsheet, FileText, LayoutList, ListChecks, MessageSquareWarning, RotateCcw, ScrollText } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Botao, Esqueleto, Tecla } from "@/components/ds/basicos";
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
import "./trilho.css";
import { NoDocumento } from "./documento";
import "./documento.css";

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
  | "por-disciplina"
  | "documento"
  | "doc-mudas"
  | "doc-remoto";

type Aba = "resumo" | "achados" | "parecer" | "documento";

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];

/** O porquê do veredito, numa linha sob o título: substitui o card do veredito. */
const PORQUE: Record<EstadoEmissao, (a: Achado[]) => string> = {
  incompleto: () => "3 de 12 blocos não foram lidos: os achados valem, mas não dá para liberar.",
  nao_emitir: (a) => {
    const n = a.filter((x) => x.impacto === "block").length;
    return `${n} ${n === 1 ? "achado bloqueia" : "achados bloqueiam"} a emissão. Tratar não muda o veredito desta revisão; auditar a corrigida, sim.`;
  },
  revisar: (a) => {
    const n = a.filter((x) => x.impacto === "decide").length;
    return `${n} ${n === 1 ? "ponto técnico precisa" : "pontos técnicos precisam"} de aceite do responsável antes de executar.`;
  },
  liberado_com_ressalvas: () => "Só ajustes de texto, sem impacto documental.",
  liberado: () => "Nenhum achado no escopo analisado.",
};

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
    case "documento":
    case "doc-mudas":
    case "doc-remoto":
      return { ...base, aba: "documento" as Aba };
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
  const { dur, mola } = useTempo();
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
      const n = ["1", "2", "3", "4"].indexOf(e.key);
      if (n >= 0) setAba((["resumo", "achados", "parecer", "documento"] as Aba[])[n]);
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
      <div className="rs rd">
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

  // A NAVEGAÇÃO mora na coluna da direita: as quatro visões, com número e tecla.
  const visoes: { id: Aba; rotulo: string; icone: ReactNode; conta?: string; tecla: string }[] = [
    { id: "resumo", rotulo: "Resumo", icone: <LayoutList />, tecla: "1" },
    { id: "achados", rotulo: "Achados", icone: <ListChecks />, conta: pendentes ? `${pendentes}` : undefined, tecla: "2" },
    { id: "parecer", rotulo: "Relatório", icone: <ScrollText />, tecla: "3" },
    { id: "documento", rotulo: "No documento", icone: <FileSearch />, tecla: "4" },
  ];
  // Na fila e no documento o conteúdo precisa de largura: a coluna vira só ícones.
  const compacto = aba === "achados" || aba === "documento";

  return (
    <div className="rs rd re">
      <Topo atual="Painel" />
      {/* o título fica fora da grade: a coluna da direita começa na mesma linha do conteúdo */}
      <div className="re-titulo">
        <header className="re-cabeca">
          <div className="rs-obra">
            <MarcaDaPrefeitura prefeitura="Criciúma" forma="sinal" />
            <span className="ds-code">117-25</span>
            <span>UBS da Rua São Francisco de Assis</span>
          </div>
          <h1>Memorial geral, revisão {revisao}</h1>
          <p className="rs-arquivo">
            <span>117_25_md_geral_{revisao.toLowerCase()}.pdf, 42 páginas</span>
            <span className="rs-sep" />
            <span>Auditada hoje às 21:13 por Victor</span>
            <span className="rs-sep" />
            <span>levou 4:21</span>
          </p>
        </header>
      </div>
      <div className={`re-corpo${compacto ? " re-corpo--compacto" : ""}`}>
        <main className="re-principal">

          {carregando ? (
            <div className="rs-abrindo" aria-busy>
              <p>Buscando o parecer no servidor…</p>
              <Esqueleto largura="100%" altura={320} raio={16} />
              <Esqueleto largura="100%" altura={180} raio={16} />
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
                {aba === "resumo" && (
                  <ResumoC
                    achados={achados}
                    parcial={p.parcial}
                    comparado={p.comparado}
                    onAbrir={abrir}
                    onMudar={(id, d) => mudar(id, d)}
                    onVerNoMemorial={(id) => setVisor({ aberto: true, achado: id })}
                    onAbrirDisciplina={(d) => {
                      setFilaInicial({ selecionado: achados.find((a) => a.disc === d && !a.desfecho)?.id ?? achados.find((a) => a.disc === d)!.id, discs: [d], painel: true });
                      setAba("achados");
                    }}
                  />
                )}
                {aba === "achados" && <Fila key={filaInicial.selecionado} achados={achados} onMudar={mudar} inicial={filaInicial} onAbrirPagina={(id) => setVisor({ aberto: true, achado: id })} />}
                {aba === "parecer" && <Relatorio achados={achados} parcial={p.parcial} revisao={revisao} />}
                {aba === "documento" && (
                  <NoDocumento
                    achados={achados}
                    modo={situacao === "doc-mudas" ? "mudas" : situacao === "doc-remoto" ? "remoto" : "normal"}
                    onVerNoMemorial={(id) => setVisor({ aberto: true, achado: id })}
                    onAbrir={(id) => abrir(id)}
                    onMudar={(id, d) => mudar(id, d)}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        {/* ================= a coluna da direita: estado, navegação, ações ================= */}
        <aside className={`re-trilho re-trilho--${SELO[estado].tom}`} aria-label="Resultado">
          <section className="re-estado">
            <span className="rs-selo" title={`Lido: 42 páginas, ${p.parcial ? "9 de 12" : "12 de 12"} blocos, 38 regras locais`}>
              <i />
              {!compacto && SELO[estado].rotulo}
            </span>
            <AnimatePresence initial={false}>
              {!compacto && (
                <motion.p className="re-porque" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: dur("state") }}>
                  {PORQUE[estado](achados)}
                </motion.p>
              )}
            </AnimatePresence>
            <button type="button" className="re-tratado" onClick={() => setAba("achados")} title={`${tratados} de ${achados.length} tratados`}>
              <Anel fracao={carregando ? null : tratados / Math.max(1, achados.length)} completo={!pendentes} />
              {!compacto && (
                <span>
                  <b className="ds-num">
                    {tratados} <small>de {achados.length}</small>
                  </b>
                  <small>{!pendentes ? "tudo tratado" : bloqueiosAbertos ? `${bloqueiosAbertos} ${bloqueiosAbertos === 1 ? "bloqueio pendente" : "bloqueios pendentes"}` : `${pendentes} pendentes`}</small>
                </span>
              )}
            </button>
          </section>

          <nav className="re-nav" aria-label="Visões do resultado">
            {visoes.map((v) => (
              <button key={v.id} type="button" aria-current={aba === v.id ? "page" : undefined} title={compacto ? `${v.rotulo} (${v.tecla})` : undefined} onClick={() => setAba(v.id)}>
                {aba === v.id && <motion.span layoutId="re-nav-ativa" className="re-nav-fundo" transition={mola("snappy")} />}
                {v.icone}
                {!compacto && <span className="re-nav-rotulo">{v.rotulo}</span>}
                {v.conta && <em className="ds-num">{v.conta}</em>}
                {!compacto && <Tecla>{v.tecla}</Tecla>}
              </button>
            ))}
          </nav>

          <section className="re-acoes" aria-label="Levar adiante">
            {!compacto && <h3>Levar adiante</h3>}
            {p.parcial && (
              <button type="button" className="re-acao re-acao--principal" title="Auditar de novo">
                <RotateCcw />
                {!compacto && "Auditar de novo"}
              </button>
            )}
            <button type="button" className="re-acao" title="Parecer em PDF: monta o parecer para a prefeitura e abre numa aba nova" onClick={() => setPdf("abrindo")}>
              <FileText />
              {!compacto && (
                <span>
                  Parecer em PDF<small>abre numa aba nova</small>
                </span>
              )}
            </button>
            <button type="button" className="re-acao" title="Matriz de achados, em planilha">
              <FileSpreadsheet />
              {!compacto && (
                <span>
                  Matriz de achados<small>planilha, um por linha</small>
                </span>
              )}
            </button>
            <button type="button" className="re-acao re-acao--discreta" title="O Nexo deixou passar algo? Registrar erro ausente">
              <MessageSquareWarning />
              {!compacto && "O Nexo deixou passar algo?"}
            </button>
          </section>
        </aside>
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
