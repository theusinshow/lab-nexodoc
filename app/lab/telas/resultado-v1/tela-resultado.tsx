"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowLeft, Download, FileSpreadsheet, FileText, ScrollText } from "lucide-react";
import { useEffect, useState } from "react";

import { Botao, Esqueleto, Menu, Segmento } from "@/components/ds/basicos";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import { ACHADOS, type Achado } from "./dados";
import { Fila, type Filtro } from "./fila";
import { Resumo } from "./resumo";
import "./resultado.css";

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
  | "encerrado";

type Aba = "resumo" | "achados" | "parecer" | "documento";

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];

/** O ponto de partida de cada situação: que achados, que aba, o que já vem aberto. */
function partida(s: SituacaoRes) {
  const base = { achados: ACHADOS, aba: "resumo" as Aba, parcial: false, comparado: false, fila: { selecionado: "ACH-002" } as { selecionado: string; filtro?: Filtro; busca?: string; decisao?: boolean; marcados?: string[] } };
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
        <header className="rs-cabeca">
          <div className="rs-obra">
            <MarcaDaPrefeitura prefeitura="Criciúma" forma="sinal" />
            <span className="ds-code">117-25</span>
            <span>UBS da Rua São Francisco de Assis</span>
          </div>
          <div className="rs-titulo">
            <h1>Auditoria do memorial geral</h1>
            <Menu
              rotulo={
                <>
                  <Download /> Exportar
                </>
              }
              itens={[
                { rotulo: "Parecer em PDF", dica: "O documento que vai para o cliente", icone: <FileText size={14} /> },
                { rotulo: "Relatório da auditoria", dica: "Texto corrido, todos os achados", icone: <ScrollText size={14} /> },
                { rotulo: "Matriz de achados", dica: "Planilha, um achado por linha", icone: <FileSpreadsheet size={14} /> },
              ]}
            />
          </div>
          <p className="rs-arquivo">
            117_25_md_geral_{revisao.toLowerCase()}.pdf, revisão {revisao}, 42 páginas. Auditada hoje às 21:13 por Victor.
          </p>
          <div className="rs-abas">
            <Segmento
              rotulo="Visão do resultado"
              valor={aba}
              onTroca={setAba}
              opcoes={[
                { valor: "resumo", rotulo: "Resumo" },
                { valor: "achados", rotulo: <>Achados <em>{pendentes ? `${pendentes} pendentes` : "tudo tratado"}</em></> },
                { valor: "parecer", rotulo: "Parecer" },
                { valor: "documento", rotulo: "No documento" },
              ]}
            />
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
              {aba === "resumo" && <Resumo achados={achados} parcial={p.parcial} comparado={p.comparado} revisao={revisao} onAbrir={abrir} />}
              {aba === "achados" && <Fila key={filaInicial.selecionado} achados={achados} onMudar={mudar} inicial={filaInicial} />}
              {(aba === "parecer" || aba === "documento") && (
                <div className="rs-depois">
                  {aba === "parecer" ? "O parecer" : "O documento com os achados no lugar"} é a próxima tela do laboratório.
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
