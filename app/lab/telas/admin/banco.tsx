"use client";

import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, Search, Trash2 } from "lucide-react";
import { Fragment, useState } from "react";

import { Botao } from "@/components/ds/basicos";
import { BarraEmbutida } from "@/components/ds/medidas";
import { useTempo } from "@/lib/ds/tempo";

import { RITMO, SUAVE } from "../conversa/turnos";
import {
  AUDITORIAS_GUARDADAS,
  CONFIRMA_EXCLUSAO,
  LDS_GUARDADAS,
  megas,
  OBRAS_GUARDADAS,
  plural,
  PREVIA_088,
} from "./dados-pessoas-banco";
import "./pessoas-banco.css";

/*
 * DADOS: o que ficou gravado no servidor. O expurgo vem primeiro (é a
 * pergunta que traz alguém aqui), depois as duas listas de consulta. Apagar é
 * permanente e alcança as máquinas que montaram; por isso a prévia conta o
 * que VAI e o que FICA com o mesmo peso, e a confirmação pede a palavra.
 * Excluir auditorias e LDs, que no app abre o diálogo do navegador, confirma
 * aqui na tela, com a mesma frase.
 */

export type VarianteBanco = "normal" | "expurgo" | "excluir";

/** pareceConfirmado do app: sem acento, sem caixa, sem espaço repetido. */
const limpar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

function PainelDoExpurgo({ rotulo, palavra, onCancelar, digitado: inicial }: { rotulo: string; palavra: string; onCancelar: () => void; digitado: string }) {
  const { k } = useTempo();
  const [digitado, setDigitado] = useState(inicial);
  const ok = limpar(digitado) === limpar(palavra);
  const p = PREVIA_088;
  return (
    <motion.section
      className="pb-expurgo"
      aria-label={`Expurgar ${rotulo}`}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: RITMO.troca * k, ease: SUAVE }}
    >
      <div className="pb-expurgo-dentro">
        <p className="pb-expurgo-tit">
          <Trash2 size={15} aria-hidden /> Expurgar {rotulo}
        </p>
        <div className="pb-expurgo-colunas">
          <div>
            <p className="pb-rotulo pb-rotulo--vai">vai embora</p>
            <ul>
              <li>{plural(p.conversas, "conversa", "conversas")}</li>
              <li>{plural(p.auditorias, "auditoria", "auditorias")}</li>
              <li>{plural(p.achados, "achado", "achados")}</li>
              <li>{plural(p.mensagensDeAchado, "mensagem de achado", "mensagens de achado")}</li>
              <li>{plural(p.lds, "LD", "LDs")}</li>
              <li>{plural(p.artefatos, "artefato", "artefatos")}</li>
              <li>
                {plural(p.arquivos, "arquivo guardado", "arquivos guardados")} ({megas(p.bytes)})
              </li>
            </ul>
          </div>
          <div>
            <p className="pb-rotulo pb-rotulo--fica">fica</p>
            <ul>
              <li>
                {plural(p.preservado.eventosDeConsumo, "evento de consumo", "eventos de consumo")} (US$ {p.preservado.custoUsd.toFixed(2).replace(".", ",")})
              </li>
            </ul>
            <p className="pb-nota">O custo por obra vai passar a listar isto como “conversa removida”.</p>
            {p.donos > 0 && <p className="pb-nota">{plural(p.donos, "dono vai receber", "donos vão receber")} a lápide: as máquinas deles apagam a cópia local no próximo carregamento do Nexo.</p>}
          </div>
        </div>
        <label className="pb-palavra">
          <span>
            Para confirmar, digite <b className="mp-mono">{palavra}</b>
          </span>
          <input className="pb-campo pb-campo--mono" value={digitado} onChange={(e) => setDigitado(e.target.value)} aria-label="Palavra de confirmação" autoComplete="off" />
        </label>
        <div className="pb-expurgo-acoes">
          <Botao variante="primary" tamanho="sm" className="pb-perigo" disabled={!ok}>
            <Trash2 size={13} /> Expurgar permanentemente
          </Botao>
          <Botao variante="ghost" tamanho="sm" onClick={onCancelar}>
            Cancelar
          </Botao>
          {!ok && digitado && <span className="pb-ainda">ainda não confere</span>}
        </div>
      </div>
    </motion.section>
  );
}

function ConfirmaExclusao({ texto, onCancelar }: { texto: string | null; onCancelar: () => void }) {
  const { k } = useTempo();
  return (
    <AnimatePresence initial={false}>
      {texto && (
        <motion.div className="pb-confirma pb-confirma--perigo" role="alertdialog" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
          <div className="pb-confirma-dentro">
            <CircleAlert size={15} aria-hidden />
            <p>{texto}</p>
            <Botao variante="ghost" tamanho="sm" onClick={onCancelar}>
              Cancelar
            </Botao>
            <Botao variante="primary" tamanho="sm" className="pb-perigo" onClick={onCancelar}>
              Excluir permanentemente
            </Botao>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Banco({ variante }: { variante: VarianteBanco }) {
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [expurgo, setExpurgo] = useState<{ chave: string; rotulo: string; palavra: string } | null>(
    variante === "expurgo" ? { chave: "088-25", rotulo: "a obra 088-25", palavra: "088-25 · Criciúma, escola do Pinheirinho (entregue)" } : null,
  );
  const [audMarcadas, setAudMarcadas] = useState<Set<string>>(new Set(variante === "excluir" ? ["g3", "g6"] : []));
  const [confAud, setConfAud] = useState<string | null>(variante === "excluir" ? CONFIRMA_EXCLUSAO.auditorias(2) : null);
  const [ldMarcadas, setLdMarcadas] = useState<Set<string>>(new Set());
  const [confLd, setConfLd] = useState<string | null>(null);
  const maxBytes = Math.max(...OBRAS_GUARDADAS.map((o) => o.bytes));
  const total = OBRAS_GUARDADAS.reduce((a, o) => a + o.bytes, 0);
  const alterna = (set: Set<string>, id: string) => { const n = new Set(set); if (n.has(id)) n.delete(id); else n.add(id); return n; };

  return (
    <>
      <section className="adm-bloco" aria-labelledby="pb-conv">
        <header>
          <h2 id="pb-conv">Conversas e expurgo</h2>
          <span className="adm-fraco ds-num">
            {OBRAS_GUARDADAS.reduce((a, o) => a + o.conversas.length, 0)} conversas · {megas(total)} guardados
          </span>
        </header>
        <p className="din-lede">As conversas do Nexo agrupadas por obra. Apagar aqui é permanente e alcança as máquinas que montaram — não só o banco.</p>
        <AnimatePresence initial={false}>{expurgo && <PainelDoExpurgo key={expurgo.chave} rotulo={expurgo.rotulo} palavra={expurgo.palavra} digitado={variante === "expurgo" ? "088-25 · criciuma" : ""} onCancelar={() => setExpurgo(null)} />}</AnimatePresence>
        <div className="adm-tabela pb-conversas">
          {OBRAS_GUARDADAS.map((o) => {
            const todas = o.conversas.every((c) => marcadas.has(c.id));
            return (
              <Fragment key={o.chave}>
                <div className="adm-linha pb-obra">
                  <span>
                    <input
                      type="checkbox"
                      className="pb-check"
                      checked={todas}
                      onChange={() => setMarcadas((m) => { const n = new Set(m); o.conversas.forEach((c) => (todas ? n.delete(c.id) : n.add(c.id))); return n; })}
                      aria-label={`Selecionar todas as conversas da obra ${o.rotulo}`}
                    />
                  </span>
                  <span className="adm-tit">
                    <b>{o.rotulo}</b>
                    <small className="ds-num">{plural(o.conversas.length, "conversa", "conversas")}</small>
                  </span>
                  <BarraEmbutida valor={o.bytes} maximo={maxBytes} />
                  <span className="ds-num din-direita adm-fraco">{megas(o.bytes)}</span>
                  <Botao variante="quiet" tamanho="sm" className="pb-acao-obra" onClick={() => setExpurgo({ chave: o.chave, rotulo: `a obra ${o.chave}`, palavra: o.rotulo })}>
                    Expurgar obra
                  </Botao>
                </div>
                {o.conversas.map((c) => (
                  <div key={c.id} className={`adm-linha pb-conversa${marcadas.has(c.id) ? " pb-pessoa--marcada" : ""}`}>
                    <span>
                      <input type="checkbox" className="pb-check" checked={marcadas.has(c.id)} onChange={() => setMarcadas((m) => alterna(m, c.id))} aria-label={`Selecionar ${c.titulo}`} />
                    </span>
                    <span>{c.titulo}</span>
                    <span className="adm-fraco">{c.tipo}</span>
                    <span className="mp-mono adm-fraco">{c.dono}</span>
                    <span className="ds-num adm-fraco din-direita">{c.atualizada}</span>
                  </div>
                ))}
              </Fragment>
            );
          })}
        </div>
        <div className="pb-rodape-acoes">
          <Botao variante="ghost" tamanho="sm" disabled={marcadas.size === 0} onClick={() => setExpurgo({ chave: "selecao", rotulo: plural(marcadas.size, "conversa selecionada", "conversas selecionadas"), palavra: "EXPURGAR SELECAO" })}>
            Expurgar seleção{marcadas.size ? ` (${marcadas.size})` : ""}
          </Botao>
          <Botao variante="quiet" tamanho="sm" className="pb-zerar" onClick={() => setExpurgo({ chave: "tudo", rotulo: "tudo", palavra: "ZERAR TUDO" })}>
            Zerar tudo
          </Botao>
        </div>
      </section>

      <section className="adm-bloco" aria-labelledby="pb-aud">
        <header>
          <h2 id="pb-aud">Histórico de auditorias</h2>
        </header>
        <p className="din-lede">Acompanhe auditorias persistidas e filtre por projeto, status, modo e responsável.</p>
        <form className="pb-linha-form pb-filtros" onSubmit={(e) => e.preventDefault()}>
          <label className="pb-busca">
            <Search size={14} aria-hidden />
            <input placeholder="Buscar projeto, título ou arquivo" aria-label="Buscar auditoria" />
          </label>
          <select className="pb-campo pb-select" aria-label="Status" defaultValue="all">
            <option value="all">Todos status</option>
            <option value="COMPLETED">Concluídas</option>
            <option value="PROCESSING">Processando</option>
            <option value="FAILED">Falhas</option>
            <option value="CANCELED">Canceladas</option>
          </select>
          <select className="pb-campo pb-select" aria-label="Modo" defaultValue="all">
            <option value="all">Todos modos</option>
            <option value="memorial">Memorial</option>
            <option value="volume">Volume</option>
          </select>
          <input className="pb-campo" placeholder="Usuário" aria-label="Usuário" />
          <Botao variante="ghost" tamanho="sm" type="submit">
            Filtrar
          </Botao>
          <Botao variante="quiet" tamanho="sm" className="pb-perigo-texto" disabled={audMarcadas.size === 0} onClick={() => setConfAud(CONFIRMA_EXCLUSAO.auditorias(audMarcadas.size))}>
            <Trash2 size={13} /> Excluir permanentemente
          </Botao>
        </form>
        <ConfirmaExclusao texto={confAud} onCancelar={() => setConfAud(null)} />
        <div className="adm-tabela pb-auditorias">
          <div className="adm-linha din-cab">
            <span />
            <span>Auditoria</span>
            <span>Projeto</span>
            <span>Status</span>
            <span>Modo</span>
            <span>Nível</span>
            <span className="din-direita">PDFs</span>
            <span className="din-direita">Achados</span>
            <span className="din-direita">Tempo</span>
            <span>Usuário</span>
            <span>Criada em</span>
          </div>
          {AUDITORIAS_GUARDADAS.map((a) => (
            <div key={a.id} className={`adm-linha${audMarcadas.has(a.id) ? " pb-pessoa--marcada" : ""}`}>
              <span>
                <input type="checkbox" className="pb-check" checked={audMarcadas.has(a.id)} onChange={() => setAudMarcadas((m) => alterna(m, a.id))} aria-label={`Selecionar ${a.titulo}`} />
              </span>
              <span className="pb-corta">{a.titulo}</span>
              <span className="mp-mono adm-fraco">{a.projeto}</span>
              <span className={`mot-estado ${a.status === "Concluída" ? "mot-estado--pronto" : a.status === "Falha" ? "mot-estado--sem-chave" : a.status === "Processando" ? "mot-estado--reservado" : "mot-estado--nada"}`}>
                <i aria-hidden />
                {a.status}
              </span>
              <span className="adm-fraco">{a.modo}</span>
              <span className="adm-fraco">{a.nivel}</span>
              <span className="ds-num din-direita adm-fraco">{a.pdfs}</span>
              <span className="ds-num din-direita">{a.achados}</span>
              <span className="ds-num din-direita adm-fraco">{a.tempo}</span>
              <span className="mp-mono adm-fraco pb-corta">{a.usuario}</span>
              <span className="ds-num adm-fraco">{a.criada}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="adm-bloco" aria-labelledby="pb-ld">
        <header>
          <h2 id="pb-ld">Operação de LDs</h2>
        </header>
        <p className="din-lede">As LDs geradas, por usuário — é o registro do servidor, o mesmo que o Nexo alimenta. PDFs anexados não são armazenados.</p>
        <form className="pb-linha-form pb-filtros" onSubmit={(e) => e.preventDefault()}>
          <label className="pb-busca">
            <Search size={14} aria-hidden />
            <input placeholder="Código, obra ou usuário" aria-label="Buscar LD" />
          </label>
          <select className="pb-campo pb-select" aria-label="Status" defaultValue="all">
            <option value="all">Todos status</option>
            <option value="DRAFT">Rascunho</option>
            <option value="GENERATED">Gerada</option>
            <option value="ARCHIVED">Arquivada</option>
          </select>
          <Botao variante="ghost" tamanho="sm" type="submit">
            Filtrar
          </Botao>
          <Botao variante="quiet" tamanho="sm" className="pb-perigo-texto" disabled={ldMarcadas.size === 0} onClick={() => setConfLd(CONFIRMA_EXCLUSAO.lds(ldMarcadas.size))}>
            <Trash2 size={13} /> Excluir permanentemente
          </Botao>
        </form>
        <ConfirmaExclusao texto={confLd} onCancelar={() => setConfLd(null)} />
        <div className="adm-tabela pb-lds">
          <div className="adm-linha din-cab">
            <span>
              <input type="checkbox" className="pb-check" aria-label="Selecionar todas as LDs listadas" checked={ldMarcadas.size === LDS_GUARDADAS.length} onChange={() => setLdMarcadas(ldMarcadas.size === LDS_GUARDADAS.length ? new Set() : new Set(LDS_GUARDADAS.map((l) => l.id)))} />
            </span>
            <span>Projeto / obra</span>
            <span>Status</span>
            <span>Usuário</span>
            <span className="din-direita">Pranchas</span>
            <span className="din-direita">PDFs</span>
            <span className="din-direita">Tomos</span>
            <span className="din-direita">Eventos</span>
            <span>Atualizada</span>
          </div>
          {LDS_GUARDADAS.map((l) => (
            <div key={l.id} className={`adm-linha${ldMarcadas.has(l.id) ? " pb-pessoa--marcada" : ""}`}>
              <span>
                <input type="checkbox" className="pb-check" checked={ldMarcadas.has(l.id)} onChange={() => setLdMarcadas((m) => alterna(m, l.id))} aria-label={`Selecionar LD ${l.codigo}`} />
              </span>
              <span className="adm-tit">
                <b className="mp-mono">{l.codigo}</b>
                <small>{l.obra}</small>
              </span>
              <span className={`mot-estado ${l.status === "Gerada" ? "mot-estado--pronto" : l.status === "Arquivada" ? "mot-estado--nada" : "mot-estado--nada"}`}>
                <i aria-hidden />
                {l.status}
              </span>
              <span className="mp-mono adm-fraco pb-corta">{l.usuario}</span>
              <span className="ds-num din-direita">{l.pranchas}</span>
              <span className="ds-num din-direita adm-fraco">{l.pdfs}</span>
              <span className="ds-num din-direita adm-fraco">{l.tomos}</span>
              <span className="ds-num din-direita adm-fraco">{l.eventos}</span>
              <span className="ds-num adm-fraco">{l.atualizada}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
