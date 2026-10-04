"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Botao } from "@/components/ds/basicos";
import { useTempo } from "@/lib/ds/tempo";

import { DESFECHO_NOME, IMPACTOS, type Achado } from "./dados";
import { estadoDaEmissao } from "./resumo";

const VEREDITO = {
  incompleto: "Análise parcial: não use para emitir",
  nao_emitir: "Não emitir",
  revisar: "Revisar antes de emitir",
  liberado_com_ressalvas: "Liberado com ressalvas de texto",
  liberado: "Liberado",
} as const;

/**
 * RELATÓRIO: o parecer em texto corrido, como a aba Relatório de hoje
 * (components/audit-result.tsx, view "report"). É o texto que se lê na tela e
 * se cola num e-mail, na ordem de decisão: projeto, veredito, e os achados do
 * que impede emitir ao que é só texto. O papel continua no Parecer em PDF.
 */
export function Relatorio({ achados, parcial, revisao }: { achados: Achado[]; parcial: boolean; revisao: string; onPdf?: () => void }) {
  const { dur } = useTempo();
  const [copiado, setCopiado] = useState(false);
  const estado = estadoDaEmissao(achados, parcial);
  let n = 0;

  const copiar = () => {
    const texto = document.querySelector(".rl-texto")?.textContent ?? "";
    navigator.clipboard?.writeText(texto).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  };

  return (
    <div className="rl">
      <article className="rl-folha">
        <header className="rl-barra">
          <h2>Relatório da auditoria</h2>
          <Botao variante="quiet" tamanho="sm" onClick={copiar}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={copiado ? "ok" : "copiar"} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: dur("feedback") }} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {copiado ? <Check /> : <Copy />}
                {copiado ? "Copiado" : "Copiar o texto"}
              </motion.span>
            </AnimatePresence>
          </Botao>
        </header>

        <div className="rl-texto">
          <section>
            <h3>Projeto</h3>
            <dl>
              <dt>Arquivo</dt>
              <dd>117_25_md_geral_{revisao.toLowerCase()}.pdf</dd>
              <dt>Obra</dt>
              <dd>UBS da Rua São Francisco de Assis</dd>
              <dt>Projeto</dt>
              <dd>117-25</dd>
              <dt>Documento</dt>
              <dd>Memorial descritivo geral, revisão {revisao}</dd>
              <dt>Órgão</dt>
              <dd>Prefeitura Municipal de Criciúma</dd>
            </dl>
          </section>

          <section>
            <h3>Status</h3>
            <p className={`rl-veredito rl-veredito--${estado}`}>{VEREDITO[estado]}</p>
            <p>
              Escopo: 1 arquivo, 42 páginas; {parcial ? "9 de 12 trechos lidos" : "leitura completa"}; desenhos não avaliados, por ser análise do texto.
            </p>
          </section>

          {IMPACTOS.map((imp) => {
            const doNivel = achados.filter((a) => a.impacto === imp.id);
            if (!doNivel.length) return null;
            return (
              <section key={imp.id} className={`rl-secao rl--${imp.id}`}>
                <h3>
                  {imp.nome}
                  <span>{imp.dica}</span>
                </h3>
                {doNivel.map((a) => {
                  n += 1;
                  return (
                    <div key={a.id} className="rl-achado">
                      <p className="rl-achado-titulo">
                        {n}. {a.titulo}
                      </p>
                      <dl>
                        <dt>Página</dt>
                        <dd>{a.pagina}</dd>
                        <dt>Referência</dt>
                        <dd>{a.id}</dd>
                        <dt>Evidência</dt>
                        <dd className="rl-evidencia">{a.evidencia.trecho}</dd>
                        {a.comparada && (
                          <>
                            <dt>Conflito</dt>
                            <dd className="rl-evidencia">
                              {a.comparada.onde}: {a.comparada.trecho}
                            </dd>
                          </>
                        )}
                        <dt>Ação recomendada</dt>
                        <dd>{a.fazer}</dd>
                        <dt>Categoria</dt>
                        <dd>{a.disciplina}</dd>
                        {a.desfecho && (
                          <>
                            <dt>Situação</dt>
                            <dd className="rl-situacao">
                              {DESFECHO_NOME[a.desfecho.tipo]}
                              {a.desfecho.motivo ? `. ${a.desfecho.motivo}` : ""}
                            </dd>
                          </>
                        )}
                      </dl>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      </article>

    </div>
  );
}
