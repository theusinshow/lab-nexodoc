"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, FileSpreadsheet, FileText, RotateCcw, ScrollText } from "lucide-react";
import { useEffect, useState } from "react";

import { Botao } from "@/components/ds/basicos";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";

import { DESFECHO_NOME, IMPACTOS, type Achado } from "./dados";
import { estadoDaEmissao } from "./resumo";

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];

export type EstadoDoPdf = "pronto" | "gerando" | "erro";

const VEREDITO_NO_PAPEL = {
  incompleto: { titulo: "Análise parcial: não use para emitir", tom: "block" },
  nao_emitir: { titulo: "Não emitir", tom: "block" },
  revisar: { titulo: "Revisar antes de emitir", tom: "decide" },
  liberado_com_ressalvas: { titulo: "Liberado com ressalvas de texto", tom: "ok" },
  liberado: { titulo: "Liberado", tom: "ok" },
} as const;

/**
 * O PARECER: o documento que sai para o cliente, mostrado como papel — claro,
 * no meio do escuro, porque é isso que ele vai ser. Ao lado, o que se faz com
 * ele: exportar, e três escolhas que mudam o papel na hora (o que entra e o
 * que é só do escritório).
 */
export function Parecer({ achados, parcial, revisao, pdfInicial }: { achados: Achado[]; parcial: boolean; revisao: string; pdfInicial: EstadoDoPdf }) {
  const { dur, k, mola } = useTempo();
  const [tratados, setTratados] = useState(true);
  const [motivos, setMotivos] = useState(true);
  const [responsaveis, setResponsaveis] = useState(false);
  const [pdf, setPdf] = useState<EstadoDoPdf>(pdfInicial);
  const estado = estadoDaEmissao(achados, parcial);
  const v = VEREDITO_NO_PAPEL[estado];
  const visiveis = achados.filter((a) => tratados || !a.desfecho);
  let n = 0;

  useEffect(() => {
    if (pdf !== "gerando" || pdfInicial === "gerando") return;
    const t = setTimeout(() => setPdf("pronto"), 2400 * k);
    return () => clearTimeout(t);
  }, [pdf, pdfInicial, k]);

  const chave = (rotulo: string, valor: boolean, trocar: (v: boolean) => void, dica: string) => (
    <label className="pc-opcao">
      <button type="button" role="switch" aria-checked={valor} className="pc-chave" onClick={() => trocar(!valor)}>
        <motion.span animate={{ x: valor ? 14 : 0 }} transition={mola("snappy")} />
      </button>
      <span>
        {rotulo}
        <small>{dica}</small>
      </span>
    </label>
  );

  return (
    <div className="pc">
      {/* ================= o papel ================= */}
      <div className="pc-mesa">
        <article className="pc-papel" aria-label="Parecer de auditoria">
          <header className="pc-papel-cabeca">
            <div>
              <small>Parecer de auditoria do memorial</small>
              <h1>UBS da Rua São Francisco de Assis</h1>
              <p>Obra 117-25, Prefeitura Municipal de Criciúma</p>
            </div>
            <dl>
              <div>
                <dt>Documento</dt>
                <dd>Memorial geral, revisão {revisao}</dd>
              </div>
              <div>
                <dt>Data</dt>
                <dd>30/09/2026</dd>
              </div>
              <div>
                <dt>Responsável</dt>
                <dd>Victor, Prosul</dd>
              </div>
            </dl>
          </header>

          <section className={`pc-veredito pc-veredito--${v.tom}`}>
            <b>{v.titulo}</b>
            <p>
              {estado === "nao_emitir"
                ? `${achados.filter((a) => a.impacto === "block").length} inconsistências impedem a emissão desta revisão.`
                : estado === "revisar"
                  ? "Há pontos técnicos que precisam de aceite do responsável antes da execução."
                  : estado === "incompleto"
                    ? "A leitura não chegou ao fim. Os achados abaixo valem, mas a ausência de outros não significa que não existam."
                    : "Não foram identificadas inconsistências confirmadas no escopo analisado."}
            </p>
            <span>Escopo: 1 arquivo, 42 páginas; {parcial ? "9 de 12 trechos lidos" : "leitura completa"}; desenhos não avaliados, por ser análise do texto.</span>
          </section>

          {IMPACTOS.map((imp) => {
            const doNivel = visiveis.filter((a) => a.impacto === imp.id);
            if (!doNivel.length) return null;
            return (
              <section key={imp.id} className={`pc-secao pc-secao--${imp.id}`}>
                <h2>
                  {imp.nome}
                  <span>{imp.dica}</span>
                </h2>
                <AnimatePresence initial={false}>
                  {doNivel.map((a) => {
                    n += 1;
                    return (
                      <motion.div
                        key={a.id}
                        layout="position"
                        className="pc-item"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: dur("layout"), ease: ease(CURVA.out) }}
                      >
                        <div className="pc-item-dentro">
                          <span className="pc-n">{n}.</span>
                          <div>
                            <h3>{a.titulo}</h3>
                            <p className="pc-onde">
                              Página {a.pagina}, {a.disciplina}. Ref. {a.id}
                              {responsaveis && a.responsavel ? `. Com ${a.responsavel}` : ""}
                            </p>
                            <blockquote>{a.evidencia.trecho}</blockquote>
                            <p>
                              <b>Ação recomendada:</b> {a.fazer}
                            </p>
                            <p className={`pc-situacao${a.desfecho ? " pc-situacao--feita" : ""}`}>
                              <b>Situação:</b> {a.desfecho ? DESFECHO_NOME[a.desfecho.tipo] : "Pendente"}
                              {a.desfecho?.tipo === "decisao" && motivos && a.desfecho.motivo ? `. ${a.desfecho.motivo}` : ""}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </section>
            );
          })}

          <footer className="pc-papel-pe">
            Gerado pelo Nexo em 30/09/2026, às 21:13. Os achados valem para a revisão {revisao} do memorial; outra revisão pede outra auditoria.
          </footer>
        </article>
      </div>

      {/* ================= o que se faz com ele ================= */}
      <aside className="pc-lado">
        <section className="rc-cartao">
          <h3>Exportar</h3>
          <AnimatePresence mode="wait" initial={false}>
            {pdf === "gerando" ? (
              <motion.div key="gerando" className="pc-gerando" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur("feedback") }}>
                <span className="pc-gerando-barra">
                  <i />
                </span>
                <span>Gerando o parecer em PDF…</span>
              </motion.div>
            ) : pdf === "erro" ? (
              <motion.div key="erro" className="pc-erro" role="alert" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: dur("enter") }}>
                <AlertTriangle size={15} />
                <span>
                  <b>Não foi possível gerar o parecer em PDF.</b> O servidor não devolveu o arquivo. O texto está salvo; tentar de novo não refaz a auditoria.
                </span>
                <Botao variante="primary" tamanho="sm" onClick={() => setPdf("gerando")}>
                  <RotateCcw /> Tentar de novo
                </Botao>
              </motion.div>
            ) : (
              <motion.div key="pronto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur("feedback") }}>
                <Botao variante="primary" className="pc-principal" onClick={() => setPdf("gerando")}>
                  <FileText /> Parecer em PDF
                </Botao>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="pc-outros">
            <button type="button">
              <ScrollText size={14} />
              <span>
                Relatório da auditoria<small>Texto corrido, para colar num e-mail</small>
              </span>
            </button>
            <button type="button">
              <FileSpreadsheet size={14} />
              <span>
                Matriz de achados<small>Planilha, um achado por linha</small>
              </span>
            </button>
          </div>
        </section>

        <section className="rc-cartao">
          <h3>O que entra no papel</h3>
          {chave("Achados já tratados", tratados, setTratados, "Com a situação de cada um")}
          {chave("Motivo das decisões técnicas", motivos, setMotivos, "O que o responsável escreveu")}
          {chave("Quem cuida de cada achado", responsaveis, setResponsaveis, "Só para uso interno")}
        </section>

        <p className="rc-lido">
          O veredito é da revisão {revisao}. Tratar os achados muda a situação no papel, não o veredito.
        </p>
      </aside>
    </div>
  );
}
