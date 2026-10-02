"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, FileSearch, Layers, ListChecks, ScanLine, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Orbe } from "@/components/ds/basicos";
import { BarraDeComando } from "@/components/moldura/barra-de-comando";
import { linkDoNexo, type IntencaoDeLink } from "@/lib/contexto-da-url";
import { useTempo } from "@/lib/ds/tempo";
import { entregarAoNexo } from "@/lib/entrega-ao-nexo";
import type { ObraNaMoldura, RecenteNaMoldura } from "@/lib/moldura";
import type { Nivel } from "@/lib/nivel-do-achado";
import type { DiaDoEscritorio } from "@/lib/resumo-do-escritorio";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { quandoNaLinha } from "../comum/quando";
import { ResumoDoEscritorio } from "./resumo-do-escritorio";
import "./painel.css";

export type IdTarefa = "auditar" | "volume" | "ld" | "conferir";

type Tarefa = { id: IdTarefa; nome: string; precisa: string; curto: string; soltar: string; intencao: IntencaoDeLink; Icone: LucideIcon };

/*
 * "Montar um volume" pedia "capas, LDs, pranchas e anexos já prontos": era a
 * montagem manual, que saiu (/volumes, 01/10/2026). No Nexo o volume nasce
 * das pranchas, e a frase diz isso.
 */
const TAREFAS: Tarefa[] = [
  { id: "auditar", nome: "Auditar um memorial", precisa: "O memorial descritivo em PDF.", curto: "Precisa de memorial em PDF", soltar: "Solte o memorial para auditar", intencao: "auditar", Icone: FileSearch },
  { id: "volume", nome: "Montar um volume", precisa: "As pranchas em PDF. Capa, LD e separatrizes saem delas.", curto: "Precisa das pranchas em PDF", soltar: "Solte as pranchas para montar", intencao: "montar", Icone: Layers },
  { id: "ld", nome: "Gerar LD e capa", precisa: "As pranchas em PDF. O Nexo lê os carimbos.", curto: "Precisa de pranchas em PDF", soltar: "Solte as pranchas para gerar", intencao: "ld", Icone: ListChecks },
  { id: "conferir", nome: "Conferir as folhas", precisa: "As pranchas, para conferir carimbo, código e revisão.", curto: "Precisa de pranchas em PDF", soltar: "Solte as pranchas para conferir", intencao: "conferir", Icone: ScanLine },
];

export type TrabalhoParaContinuar = {
  conversaId: string;
  codigo: string | null;
  cliente: string;
  trabalho: string;
  estado: string;
  tom: "block" | "decide" | "ok" | null;
  quando: string;
};

export type AchadoComVoce = { auditId: string; chave: string; titulo: string; codigo: string; nivel: Nivel | null; pagina: string | null; de: string | null };


/**
 * O PAINEL (veio do lab: app/lab/telas/inicio-d2). O que fazer e o que ter em
 * mãos: a barra de comando no topo, as quatro tarefas numa fileira, e duas
 * colunas curtas — o que retomar e o que está com você. Nada de
 * acompanhamento diário: o Nexo é aberto para uma tarefa e fechado.
 *
 * O ARQUIVO VAI PARA O NEXO. Soltar (na tarefa ou em qualquer lugar) ou
 * escolher no computador entrega o arquivo ao Nexo
 * ([[lib/entrega-ao-nexo.ts]]), que lê e oferece o passo seguinte. A ficha
 * "o Nexo leu a capa" do lab é a do próprio Nexo: ler aqui seria ler duas vezes.
 */
export function TelaPainel({
  nome,
  saudacao,
  tarefaInicial,
  obras,
  recentes,
  continuar,
  comVoce,
  totalComVoce,
  resumo,
}: {
  nome: string;
  saudacao: string;
  tarefaInicial: IdTarefa | null;
  obras: ObraNaMoldura[];
  recentes: RecenteNaMoldura[];
  continuar: TrabalhoParaContinuar[];
  comVoce: AchadoComVoce[];
  totalComVoce: number;
  resumo: DiaDoEscritorio[];
}) {
  const { dur, mola } = useTempo();
  const router = useRouter();
  const [escolhida, setEscolhida] = useState<IdTarefa | null>(tarefaInicial);
  const [arrastando, setArrastando] = useState(false);
  const [alvo, setAlvo] = useState<IdTarefa | null>(null);
  const [indo, setIndo] = useState(false);
  const primeiro = continuar.length === 0 && totalComVoce === 0 && resumo.length === 0;

  /*
   * O CLIQUE ABRE O CHAT PREPARADO (02/10/2026, decisão do Matheus). Antes ele
   * abria aqui uma área de soltar — um passo a mais, e uma segunda zona de
   * soltar além da do Nexo. Agora a conversa nova já chega dizendo o que
   * precisa (partidas.ts → tela); arrastar o arquivo para cima da tarefa
   * continua sendo o atalho (`receber`).
   */
  function abrir(id: IdTarefa) {
    setEscolhida(id);
    setIndo(true);
    router.push(linkDoNexo({ intencao: TAREFAS.find((t) => t.id === id)!.intencao }));
  }

  function receber(id: IdTarefa, arquivos: File[]) {
    setArrastando(false);
    setAlvo(null);
    if (!arquivos.length) return;
    setEscolhida(id);
    setIndo(true);
    entregarAoNexo(arquivos);
    router.push(linkDoNexo({ intencao: TAREFAS.find((t) => t.id === id)!.intencao }));
  }

  return (
    <div
      className="d2"
      onDragEnter={(e) => {
        if (!Array.from(e.dataTransfer.types).includes("Files")) return;
        e.preventDefault();
        setArrastando(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setArrastando(false);
          setAlvo(null);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        receber(alvo ?? escolhida ?? "auditar", Array.from(e.dataTransfer.files));
      }}
    >
      <div className="d2-centro">
        <div className="d2-cabeca">
          <Orbe tamanho={26} estado={indo ? "trabalhando" : "repouso"} />
          <h1>{arrastando ? "Para que é este arquivo?" : `${saudacao}, ${nome}.`}</h1>
        </div>

        <BarraDeComando modo="suspensa" obras={obras} recentes={recentes} autoFoco={false} />

        {/* ---------- tarefas, compactas ---------- */}
        <div className="d2-tarefas" role="group" aria-label="Tarefas">
          {TAREFAS.map((t) => {
            const ativa = escolhida === t.id;
            return (
              <button
                key={t.id}
                type="button"
                data-tarefa={t.id}
                className={`d2-tarefa${ativa ? " d2-tarefa--ativa" : ""}${arrastando ? " d2-tarefa--alvo" : ""}${alvo === t.id ? " d2-tarefa--sobre" : ""}`}
                aria-pressed={ativa}
                onClick={() => abrir(t.id)}
                onDragEnter={() => setAlvo(t.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (alvo !== t.id) setAlvo(t.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  receber(t.id, Array.from(e.dataTransfer.files));
                }}
              >
                {ativa && <motion.span layoutId="d2-tarefa-ativa" className="d2-tarefa-fundo" transition={mola("snappy")} />}
                <span className="d2-tarefa-icone">
                  <t.Icone size={16} />
                </span>
                <span className="d2-tarefa-texto">
                  <b>{t.nome}</b>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span key={alvo === t.id ? "s" : "p"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur("feedback") }}>
                      {alvo === t.id ? t.soltar : t.curto}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </button>
            );
          })}
        </div>

        {/* ---------- retomar e com você ---------- */}
        <motion.div layout="position" transition={mola("smooth")} className="d2-colunas">
          <section className="d2-bloco">
            <h2>Continuar</h2>
            {continuar.length === 0 ? (
              <p className="d2-vazio">Os trabalhos que você começar aparecem aqui, com o estado de cada um.</p>
            ) : (
              <table className="d2-tabela">
                <thead>
                  <tr>
                    <th>Obra</th>
                    <th>Trabalho</th>
                    <th>Estado</th>
                    <th className="d2-dir">Quando</th>
                    <th aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {continuar.map((c) => {
                    const ir = () => router.push(linkDoNexo({ conversa: c.conversaId }));
                    return (
                      <tr key={c.conversaId} tabIndex={0} onClick={ir} onKeyDown={(e) => e.key === "Enter" && ir()}>
                        <td>
                          <span className="d2-obra">
                            <MarcaDaPrefeitura prefeitura={c.cliente} forma="sinal" />
                            {c.codigo ? <span className="ds-code">{c.codigo}</span> : <span className="d2-quando">sem obra</span>}
                          </span>
                        </td>
                        <td className="d2-trabalho">{c.trabalho}</td>
                        <td className={`d2-estado${c.tom ? ` d2-estado--${c.tom}` : ""}`}>{c.estado}</td>
                        <td className="d2-dir d2-quando">{quandoNaLinha(c.quando)}</td>
                        <td className="d2-seta">
                          <ChevronRight size={14} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          <section className="d2-bloco">
            <h2>
              Com você {totalComVoce > 0 && <span className="ds-num d2-conta">{totalComVoce}</span>}
            </h2>
            {comVoce.length === 0 ? (
              <p className="d2-vazio">{primeiro ? "Achados atribuídos a você aparecem aqui." : "Nenhum achado atribuído a você."}</p>
            ) : (
              <>
                <ul className="d2-achados">
                  {comVoce.map((a) => {
                    const ir = () => router.push(`/nexo?auditoria=${encodeURIComponent(a.auditId)}`);
                    return (
                      <li key={a.chave} tabIndex={0} onClick={ir} onKeyDown={(e) => e.key === "Enter" && ir()}>
                        <i className={`d2-grav${a.nivel ? ` d2-grav--${a.nivel}` : ""}`} aria-hidden />
                        <span className="d2-achado-texto">
                          <b>{a.titulo}</b>
                          <span>
                            <span className="ds-code">{a.codigo}</span>
                            {[a.pagina && `p. ${a.pagina}`, a.de && `de ${a.de}`].filter(Boolean).join(", ")}
                          </span>
                        </span>
                        <span className="d2-abrir">Abrir</span>
                      </li>
                    );
                  })}
                </ul>
                <button type="button" className="d2-todos" onClick={() => router.push("/achados")}>
                  Ver todos os achados <ChevronRight size={13} />
                </button>
              </>
            )}
          </section>
        </motion.div>

        {/* O que o Nexo já fez: some no primeiro acesso, onde tudo seria zero. */}
        {resumo.length > 0 && (
          <motion.div layout="position" transition={mola("smooth")}>
            <ResumoDoEscritorio dias={resumo} />
          </motion.div>
        )}
      </div>
    </div>
  );
}
