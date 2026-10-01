"use client";

import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, Trash2 } from "lucide-react";
import { useState } from "react";

import { Botao } from "@/components/ds/basicos";
import { useTempo } from "@/lib/ds/tempo";

import { OBRAS_GUARDADAS, PREVIA_088, megas } from "../admin/dados-pessoas-banco";
import { RITMO, SUAVE } from "../conversa/turnos";

/*
 * A CONFIRMAÇÃO DESTRUTIVA, como regra e não como um componente só. O app
 * usava `window.confirm` (excluir projeto, auditorias, LDs) — o diálogo do
 * navegador não sabe o nome da obra, não diz o que fica, e cobre a tela que
 * explicava o que se estava apagando. O redesenho confirma NA TELA, ao lado do
 * botão, e o peso da confirmação cresce com o que se perde:
 *
 *   1. some das listas, fica no histórico        → uma frase e o verbo;
 *   2. apaga de verdade                          → faixa vermelha e o verbo inteiro;
 *   3. apaga muito, de vez, e além deste banco   → o que vai e o que fica, e a palavra.
 *
 * Em todos: o botão repete o verbo ("Excluir", nunca "OK"), a saída é a ação
 * mais fácil, e o Esc desiste.
 */

const sem = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

function Nivel({ n, titulo, quando, children }: { n: number; titulo: string; quando: string; children: React.ReactNode }) {
  return (
    <section className="pc-nivel" aria-labelledby={`pc-nivel-${n}`}>
      <header>
        <span className="pc-nivel-n ds-num">{n}</span>
        <div>
          <h3 id={`pc-nivel-${n}`}>{titulo}</h3>
          <p>{quando}</p>
        </div>
      </header>
      <div className="pc-nivel-exemplo">{children}</div>
    </section>
  );
}

function Abre({ aberto, children }: { aberto: boolean; children: React.ReactNode }) {
  const { k } = useTempo();
  return (
    <AnimatePresence initial={false}>
      {aberto && (
        <motion.div className="pc-abre" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Confirmacoes() {
  const [um, setUm] = useState(true);
  const [dois, setDois] = useState(true);
  const [tres, setTres] = useState(true);
  const [palavra, setPalavra] = useState("");
  // A palavra é o rótulo da obra, como em lib/expurgo.ts (palavraDeConfirmacao).
  const alvo = OBRAS_GUARDADAS[2].rotulo;
  const confere = sem(palavra) === sem(alvo);

  return (
    <div className="pc-confirmacoes">
      <header className="pc-confirmacoes-cabeca">
        <h2>Confirmar antes de apagar</h2>
        <p>Na tela, ao lado do botão, nunca num diálogo do navegador. O peso cresce com o que se perde; o botão repete o verbo, e desistir é sempre o gesto mais fácil.</p>
      </header>

      <Nivel n={1} titulo="Some das listas, fica no histórico" quando="Excluir um projeto, arquivar, tirar alguém do escritório.">
        {!um && (
          <button type="button" className="mp-acao mp-acao--perigo" onClick={() => setUm(true)}>
            <Trash2 size={14} /> Excluir o projeto
          </button>
        )}
        <Abre aberto={um}>
          <div className="pc-conf pc-conf--leve">
            <p>Excluir a 117-25? Documentos, gerados e eventos ficam guardados no histórico, mas a obra some das listas.</p>
            <Botao variante="ghost" tamanho="sm" className="pc-verbo" onClick={() => setUm(false)}>
              Excluir
            </Botao>
            <Botao variante="quiet" tamanho="sm" onClick={() => setUm(false)}>
              Manter
            </Botao>
          </div>
        </Abre>
      </Nivel>

      <Nivel n={2} titulo="Apaga de verdade" quando="Excluir auditorias ou LDs no centro de controle: os arquivos e os vínculos vão junto.">
        {!dois && (
          <Botao variante="quiet" tamanho="sm" className="pb-perigo-texto pc-sem-margem" onClick={() => setDois(true)}>
            <Trash2 size={14} /> Excluir permanentemente
          </Botao>
        )}
        <Abre aberto={dois}>
          <div className="pc-conf pc-conf--perigo">
            <CircleAlert size={15} aria-hidden />
            <p>Excluir permanentemente 2 auditorias selecionadas? Esta ação remove todos os arquivos e feedbacks vinculados.</p>
            <Botao variante="ghost" tamanho="sm" onClick={() => setDois(false)}>
              Cancelar
            </Botao>
            <Botao variante="primary" tamanho="sm" className="pb-perigo" onClick={() => setDois(false)}>
              Excluir permanentemente
            </Botao>
          </div>
        </Abre>
      </Nivel>

      <Nivel n={3} titulo="Apaga muito, de vez, e além deste banco" quando="O expurgo: conversas de uma obra inteira, e a cópia nas máquinas que a montaram.">
        {!tres && (
          <Botao variante="quiet" tamanho="sm" className="pb-perigo-texto pc-sem-margem" onClick={() => setTres(true)}>
            <Trash2 size={14} /> Expurgar obra
          </Botao>
        )}
        <Abre aberto={tres}>
          <div className="pc-conf pc-conf--pesado">
            <div className="pc-vai-fica">
              <div>
                <p className="pb-rotulo pb-rotulo--vai">Vai embora</p>
                <p>
                  {PREVIA_088.conversas} conversas, {PREVIA_088.auditorias} auditorias, {PREVIA_088.achados} achados, {PREVIA_088.arquivos} arquivos ({megas(PREVIA_088.bytes)})
                </p>
              </div>
              <div>
                <p className="pb-rotulo pb-rotulo--fica">Fica</p>
                <p>
                  {PREVIA_088.preservado.eventosDeConsumo} eventos de consumo (US$ {PREVIA_088.preservado.custoUsd.toFixed(2).replace(".", ",")}), listados como “conversa removida”
                </p>
              </div>
            </div>
            <label className="pb-palavra">
              <span>
                Para confirmar, digite <b className="mp-mono">{alvo}</b>
              </span>
              <input className="pb-campo pb-campo--mono" value={palavra} onChange={(e) => setPalavra(e.target.value)} placeholder={alvo} aria-label={`Digite ${alvo} para confirmar`} autoComplete="off" />
            </label>
            <div className="pb-expurgo-acoes">
              <Botao variante="primary" tamanho="sm" className="pb-perigo" disabled={!confere} onClick={() => (setTres(false), setPalavra(""))}>
                <Trash2 size={14} /> Expurgar permanentemente
              </Botao>
              <Botao variante="ghost" tamanho="sm" onClick={() => (setTres(false), setPalavra(""))}>
                Cancelar
              </Botao>
              {!confere && palavra && <span className="pb-ainda">ainda não confere</span>}
            </div>
          </div>
        </Abre>
      </Nivel>
    </div>
  );
}
