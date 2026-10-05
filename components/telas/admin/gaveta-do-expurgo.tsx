"use client";

import { AnimatePresence, motion } from "motion/react";
import { Trash2 } from "lucide-react";
import { useState } from "react";

import { Botao, Girando } from "@/components/ds/basicos";
import { confirmacaoConfere, palavraDeConfirmacao, type Alcance } from "@/lib/expurgo";
import { useTempo } from "@/lib/ds/tempo";
import { plural } from "@/lib/plural";

import { RITMO, SUAVE } from "../comum/ritmo";

/*
 * A GAVETA DO EXPURGO — a prévia, a palavra e o botão, num lugar só.
 *
 * Morava dentro de "Conversas e expurgo" (Dados). A aba Projetos (05/10/2026)
 * apaga pelo MESMO expurgo, e duas cópias da gaveta seriam duas regras de
 * confirmação: a que esquece de mostrar o que fica é a que alguém usa no dia
 * errado.
 */

export const megas = (b: number) =>
  b <= 0 ? "0 MB" : b < 0.1 * 1048576 ? "menos de 0,1 MB" : `${(b / 1048576).toFixed(1).replace(".", ",")} MB`;

export type Previa = {
  projetos?: number;
  documentos?: number;
  conversas: number;
  auditorias: number;
  achados: number;
  mensagensDeAchado: number;
  lds: number;
  artefatos: number;
  arquivos: number;
  bytes: number;
  donos: number;
  preservado: { eventosDeConsumo: number; custoUsd: number };
};

type Pendente = { alcance: Alcance; rotulo: string; titulo: string; previa: Previa | null };

/** Pedir a prévia, executar, e o que dizer depois. `aoTerminar` recarrega a lista de quem chamou. */
export function useExpurgo(aoTerminar: () => void | Promise<void>) {
  const [pendente, setPendente] = useState<Pendente | null>(null);
  const [digitado, setDigitado] = useState("");
  const [executando, setExecutando] = useState(false);
  const [erro, setErro] = useState("");
  const [feito, setFeito] = useState("");

  /** A prévia conta o que VAI e o que FICA antes de qualquer coisa ser apagada. */
  async function pedirPrevia(alcance: Alcance, rotulo: string, titulo: string) {
    setPendente({ alcance, rotulo, titulo, previa: null });
    setDigitado("");
    setErro("");
    setFeito("");
    try {
      const r = await fetch("/api/admin/dados/previa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alcance }) });
      const corpo = (await r.json().catch(() => null)) as { previa?: Previa; error?: string } | null;
      if (!r.ok || !corpo?.previa) throw new Error(corpo?.error ?? "Não foi possível contar o que seria apagado.");
      setPendente({ alcance, rotulo, titulo, previa: corpo.previa });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível contar o que seria apagado.");
      setPendente(null);
    }
  }

  async function executar() {
    if (!pendente) return;
    setExecutando(true);
    setErro("");
    try {
      const r = await fetch("/api/admin/dados/expurgo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alcance: pendente.alcance, rotulo: pendente.rotulo, confirmacao: digitado }),
      });
      const corpo = (await r.json().catch(() => null)) as { apagado?: Previa; error?: string } | null;
      if (!r.ok) throw new Error(corpo?.error ?? "Não foi possível expurgar.");
      const a = corpo?.apagado;
      setFeito(
        a
          ? `Expurgado: ${a.projetos ? "o projeto, " : ""}${plural(a.conversas, "conversa", "conversas")}, ${plural(a.auditorias, "auditoria", "auditorias")}, ${plural(a.lds, "LD", "LDs")} e ${megas(a.bytes)} de arquivos.${a.donos ? ` ${plural(a.donos, "dono vai receber", "donos vão receber")} a lápide.` : ""}`
          : "Expurgado.",
      );
      setPendente(null);
      setDigitado("");
      await aoTerminar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível expurgar.");
    } finally {
      setExecutando(false);
    }
  }

  return {
    pendente,
    digitado,
    setDigitado,
    executando,
    erro,
    feito,
    pedirPrevia,
    executar,
    cancelar: () => (setPendente(null), setDigitado("")),
  };
}

export function GavetaDoExpurgo({ expurgo }: { expurgo: ReturnType<typeof useExpurgo> }) {
  const { k } = useTempo();
  const { pendente, digitado, setDigitado, executando, executar, cancelar } = expurgo;
  const esperado = pendente ? palavraDeConfirmacao(pendente.alcance, pendente.rotulo) : "";
  const confere = pendente ? confirmacaoConfere(digitado, esperado) : false;
  const p = pendente?.previa;

  return (
    <AnimatePresence initial={false}>
      {pendente && (
        <motion.section className="pb-expurgo" aria-label={`Expurgar ${pendente.titulo}`} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
          <div className="pb-expurgo-dentro">
            <p className="pb-expurgo-tit">
              <Trash2 size={15} aria-hidden /> Expurgar {pendente.titulo}
            </p>
            {!p ? (
              <p className="pb-nota">
                <Girando tamanho={12} /> Contando o que seria apagado…
              </p>
            ) : (
              <div className="pb-expurgo-colunas">
                <div>
                  <p className="pb-rotulo pb-rotulo--vai">vai embora</p>
                  <ul>
                    {Boolean(p.projetos) && <li>o projeto (some da home e das listas)</li>}
                    <li>{plural(p.conversas, "conversa", "conversas")}</li>
                    <li>{plural(p.auditorias, "auditoria", "auditorias")}</li>
                    <li>{plural(p.achados, "achado", "achados")}</li>
                    <li>{plural(p.mensagensDeAchado, "mensagem de achado", "mensagens de achado")}</li>
                    <li>{plural(p.lds, "LD", "LDs")}</li>
                    <li>{plural(p.artefatos, "artefato", "artefatos")}</li>
                    {Boolean(p.documentos) && <li>{plural(p.documentos ?? 0, "documento do projeto", "documentos do projeto")}</li>}
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
            )}
            <label className="pb-palavra">
              <span>
                Para confirmar, digite <b className="mp-mono">{esperado}</b>
              </span>
              <input className="pb-campo pb-campo--mono" value={digitado} onChange={(e) => setDigitado(e.target.value)} aria-label="Palavra de confirmação" autoComplete="off" disabled={!p || executando} />
            </label>
            <div className="pb-expurgo-acoes">
              <Botao variante="primary" tamanho="sm" className="pb-perigo" disabled={!p || !confere || executando} onClick={() => void executar()}>
                {executando ? <Girando tamanho={12} /> : <Trash2 size={13} />} Expurgar permanentemente
              </Botao>
              <Botao variante="ghost" tamanho="sm" onClick={cancelar}>
                Cancelar
              </Botao>
              {!confere && digitado && <span className="pb-ainda">ainda não confere</span>}
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
