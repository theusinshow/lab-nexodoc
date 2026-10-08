"use client";

import { Check, ImageOff, Pencil, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Botao, Segmento } from "@/components/ds/basicos";
import { contextoAtual, enviarChamado, type PedidoDeAbertura } from "@/lib/suporte/cliente";
import { CATEGORIAS, formatarProtocolo, NOME_DA_CATEGORIA, type Categoria } from "@/lib/suporte/comum";

import { EditorDoPrint } from "./editor-do-print";

/*
 * A GAVETA "REPORTAR UM PROBLEMA". A pessoa escreve uma frase; o resto vai
 * junto sozinho — e ela VÊ o que vai ("O que vai junto"), inclusive a trilha.
 * Aberta por um erro (`pedido.chamadoId`), o relato complementa aquele chamado.
 */
export function GavetaDeSuporte({ pedido, printInicial, onFechar }: { pedido: PedidoDeAbertura; printInicial: string | null; onFechar: () => void }) {
  const [categoria, setCategoria] = useState<Categoria>(pedido.categoria ?? "ERRO");
  const [texto, setTexto] = useState("");
  const [print, setPrint] = useState<string | null>(printInicial);
  const [editando, setEditando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [feito, setFeito] = useState<number | null>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const contexto = useMemo(() => contextoAtual(), []);

  useEffect(() => {
    if (!editando) campo.current?.focus();
  }, [editando]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !editando && onFechar();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [editando, onFechar]);

  async function enviar() {
    if (texto.trim().length < 3) {
      setErro("Conte em uma frase o que aconteceu.");
      campo.current?.focus();
      return;
    }
    setEnviando(true);
    setErro("");
    const r = await enviarChamado({ categoria, texto: texto.trim(), print, chamadoId: pedido.chamadoId });
    setEnviando(false);
    if (r.ok) setFeito(r.chamado.protocolo);
    else setErro(r.erro);
  }

  if (editando && print) {
    return <EditorDoPrint src={print} onCancelar={() => setEditando(false)} onPronto={(p) => (setPrint(p), setEditando(false))} />;
  }

  return (
    <>
      <div className="sp-veu" onClick={onFechar} aria-hidden data-suporte-fora="1" />
      <aside className="sp-gaveta" role="dialog" aria-modal="true" aria-labelledby="sp-titulo" data-suporte-fora="1">
        <header className="sp-cabeca">
          <h2 id="sp-titulo">{pedido.chamadoId ? "Contar o que aconteceu" : "Reportar um problema"}</h2>
          <Botao variante="quiet" icone aria-label="Fechar" onClick={onFechar}>
            <X size={16} />
          </Botao>
        </header>

        {feito !== null ? (
          <div className="sp-feito" role="status">
            <Check size={20} aria-hidden />
            <p>
              Recebido. Protocolo <strong>{formatarProtocolo(feito)}</strong>.
            </p>
            <p className="sp-sub">Você recebe um e-mail quando houver resposta. Os seus chamados ficam em Ajuda.</p>
            <Botao variante="primary" onClick={onFechar}>
              Fechar
            </Botao>
          </div>
        ) : (
          <div className="sp-corpo">
            {pedido.protocolo !== undefined && (
              <p className="sp-sub">Este erro já foi registrado ({formatarProtocolo(pedido.protocolo)}). O que você contar entra nele.</p>
            )}

            <div className="sp-print">
              {print ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URL local, sem otimização possível */}
                  <img src={print} alt="Print da tela no momento do relato" />
                  <div className="sp-print-acoes">
                    <Botao variante="ghost" tamanho="sm" onClick={() => setEditando(true)}>
                      <Pencil size={13} aria-hidden /> Riscar ou borrar
                    </Botao>
                    <Botao variante="quiet" tamanho="sm" onClick={() => setPrint(null)}>
                      <ImageOff size={13} aria-hidden /> Tirar print
                    </Botao>
                  </div>
                </>
              ) : (
                <p className="sp-sub">Sem print.</p>
              )}
            </div>

            <Segmento<Categoria> rotulo="Categoria" valor={categoria} onTroca={setCategoria} opcoes={CATEGORIAS.map((c) => ({ valor: c, rotulo: NOME_DA_CATEGORIA[c] }))} />

            <label className="sp-campo">
              <span>O que você estava fazendo?</span>
              <textarea
                ref={campo}
                rows={4}
                value={texto}
                maxLength={4000}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") void enviar();
                }}
                placeholder="Ex.: cliquei em Montar volume e a tela ficou parada."
              />
            </label>

            <details className="sp-junto">
              <summary>O que vai junto</summary>
              <dl>
                <div>
                  <dt>Página</dt>
                  <dd>{contexto.pagina}</dd>
                </div>
                <div>
                  <dt>Navegador</dt>
                  <dd>{contexto.navegador}</dd>
                </div>
                <div>
                  <dt>Tela</dt>
                  <dd>{contexto.viewport}</dd>
                </div>
              </dl>
              <ol className="sp-trilha">
                {contexto.trilha.map((p, i) => (
                  <li key={i}>
                    <span className="sp-trilha-tipo">{p.tipo}</span> {p.texto}
                    {p.status !== undefined && <span className="sp-trilha-status"> · {p.status}</span>}
                  </li>
                ))}
              </ol>
            </details>

            {erro && (
              <p className="sp-erro" role="alert">
                {erro}
              </p>
            )}

            <footer className="sp-rodape">
              <Botao variante="ghost" onClick={onFechar}>
                Cancelar
              </Botao>
              <Botao variante="primary" onClick={() => void enviar()} disabled={enviando}>
                {enviando ? "Enviando…" : "Enviar"}
              </Botao>
            </footer>
          </div>
        )}
      </aside>
    </>
  );
}
