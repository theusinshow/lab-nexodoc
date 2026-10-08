"use client";

import { Copy, TriangleAlert } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Botao, Girando, Segmento, Selo } from "@/components/ds/basicos";
import { formatarDataHora, formatarHora } from "@/lib/fuso-de-brasilia";
import { formatarProtocolo, NOME_DA_CATEGORIA, NOME_DO_STATUS, STATUS, type Categoria, type StatusDoChamado } from "@/lib/suporte/comum";
import type { Passo } from "@/lib/suporte/trilha";

import { useCabecaDoAdmin } from "./casca";
import "./suporte.css";

/*
 * A CAIXA DE SUPORTE. À esquerda, a fila por atenção (abertos em cima, o que
 * aconteceu por último primeiro); à direita, o chamado inteiro: print, o que
 * a pessoa disse, a trilha, o contexto e o digest para procurar no log da
 * Railway. Responder ou resolver manda e-mail para quem abriu.
 */
type Linha = {
  id: string;
  protocolo: number;
  origem: "MANUAL" | "ERRO_CLIENTE" | "ERRO_SERVIDOR";
  categoria: Categoria;
  status: StatusDoChamado;
  rota: string;
  ocorrencias: number;
  nome: string | null;
  email: string | null;
  ultimaOcorrencia: string;
  _count: { mensagens: number };
};
type Mensagem = { id: string; papel: "USUARIO" | "DEV"; autorNome: string | null; autorEmail: string | null; texto: string; createdAt: string };
type Detalhe = Linha & {
  digest: string | null;
  printChecksum: string | null;
  createdAt: string;
  mensagens: Mensagem[];
  contexto: {
    trilha?: Passo[];
    pagina?: string;
    navegador?: string;
    viewport?: string;
    projeto?: string;
    versao?: string;
    metodo?: string;
    erro?: { nome: string; mensagem: string; stack?: string };
  };
};

type Caixa = { chamados: Linha[]; emailConfigurado: boolean; generatedAt: string | null };

const ORIGEM = { MANUAL: "Relato", ERRO_CLIENTE: "Erro na tela", ERRO_SERVIDOR: "Erro no servidor" } as const;
const TOM = { ABERTO: "decide", EM_ANALISE: "nexo", RESOLVIDO: "ok" } as const;

async function buscarCaixa(): Promise<{ ok: true; caixa: Caixa } | { ok: false; erro: string }> {
  try {
    const r = await fetch("/api/admin/suporte");
    const j = (await r.json().catch(() => null)) as { chamados?: Linha[]; emailConfigurado?: boolean; generatedAt?: string; error?: string } | null;
    if (!r.ok || !j?.chamados) return { ok: false, erro: j?.error ?? "Não foi possível ler os chamados." };
    return { ok: true, caixa: { chamados: j.chamados, emailConfigurado: Boolean(j.emailConfigurado), generatedAt: j.generatedAt ?? null } };
  } catch {
    return { ok: false, erro: "Não foi possível ler os chamados." };
  }
}

async function buscarDetalhe(id: string): Promise<Detalhe | null> {
  try {
    const j = (await (await fetch(`/api/admin/suporte/${id}`)).json()) as { chamado?: Detalhe };
    return j.chamado ?? null;
  } catch {
    return null;
  }
}

/** O campo de resposta. Montado com `key` do chamado: trocar de chamado zera o rascunho. */
function Responder({ chamado, onSalvar }: { chamado: Detalhe; onSalvar: (id: string, m: { texto?: string; status?: StatusDoChamado }) => Promise<boolean> }) {
  const [resposta, setResposta] = useState("");
  const [salvando, setSalvando] = useState(false);
  async function enviar(m: { texto?: string; status?: StatusDoChamado }) {
    setSalvando(true);
    const ok = await onSalvar(chamado.id, m);
    setSalvando(false);
    if (ok) setResposta("");
  }
  return (
    <div className="sa-responder">
      <textarea
        rows={3}
        value={resposta}
        onChange={(e) => setResposta(e.target.value)}
        placeholder={chamado.email ? "Responder (vai por e-mail para quem abriu)" : "Anotação (ninguém para avisar: chamado anônimo)"}
        aria-label="Resposta"
      />
      <div className="sa-responder-acoes">
        <Botao variante="ghost" disabled={salvando || !resposta.trim()} onClick={() => void enviar({ texto: resposta })}>
          Responder
        </Botao>
        <Botao variante="primary" disabled={salvando} onClick={() => void enviar({ texto: resposta.trim() || undefined, status: "RESOLVIDO" })}>
          {resposta.trim() ? "Responder e resolver" : "Resolver"}
        </Botao>
      </div>
    </div>
  );
}

export function CaixaDeSuporte() {
  const params = useSearchParams();
  const router = useRouter();
  const sel = params.get("c");
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  const [lido, setLido] = useState<Detalhe | null>(null);
  const [erro, setErro] = useState("");
  const [versao, setVersao] = useState(0);
  // o detalhe à mostra é o do `?c=`; o lido de outro chamado não aparece enquanto o novo chega
  const detalhe = lido && lido.id === sel ? lido : null;
  const lista = caixa?.chamados ?? null;

  useEffect(() => {
    let vivo = true;
    void buscarCaixa().then((r) => {
      if (!vivo) return;
      if (r.ok) setCaixa(r.caixa);
      else setErro(r.erro);
    });
    return () => {
      vivo = false;
    };
  }, [versao]);
  useCabecaDoAdmin({ atualizadoEm: caixa?.generatedAt ?? null, carregando: caixa === null });

  useEffect(() => {
    if (!sel) return;
    let vivo = true;
    void buscarDetalhe(sel).then((d) => vivo && setLido(d));
    return () => {
      vivo = false;
    };
  }, [sel, versao]);

  /** Grava e relê lista e detalhe. Devolve se deu certo, para a resposta saber se limpa o campo. */
  const salvar = useCallback(async (id: string, m: { texto?: string; status?: StatusDoChamado }) => {
    setErro("");
    const r = await fetch(`/api/admin/suporte/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(m) });
    if (!r.ok) {
      setErro(((await r.json().catch(() => null)) as { error?: string } | null)?.error ?? "Não foi possível salvar.");
      return false;
    }
    setVersao((v) => v + 1);
    return true;
  }, []);

  const trilha = detalhe?.contexto.trilha ?? [];
  const emailOk = caixa?.emailConfigurado ?? true;

  return (
    <div className="sa">
      {!emailOk && (
        <p className="sa-alerta" role="status">
          <TriangleAlert size={14} aria-hidden /> E-mail de suporte não configurado (<code>NEXODOC_SUPORTE_PARA</code>): os chamados chegam só aqui.
        </p>
      )}
      {erro && (
        <p className="sa-alerta" role="alert">
          {erro}
        </p>
      )}
      <div className="sa-grade">
        <ul className="sa-lista mp-painel" aria-label="Chamados">
          {lista === null && (
            <li className="sa-vazio">
              <Girando rotulo="Carregando" />
            </li>
          )}
          {lista?.length === 0 && <li className="sa-vazio">Nenhum chamado. Tudo quieto.</li>}
          {lista?.map((c) => (
            <li key={c.id}>
              <button type="button" className="sa-linha" aria-current={c.id === sel || undefined} onClick={() => router.replace(`/admin/suporte?c=${c.id}`)}>
                <span className="mp-mono">{formatarProtocolo(c.protocolo)}</span>
                <Selo tom={TOM[c.status]} ponto>
                  {NOME_DO_STATUS[c.status]}
                </Selo>
                <span className="sa-linha-titulo">
                  {ORIGEM[c.origem]} · {c.rota}
                </span>
                <span className="sa-linha-meta">
                  {c.ocorrencias > 1 && <strong>×{c.ocorrencias} </strong>}
                  {c.nome ?? c.email ?? "anônimo"} · {formatarDataHora(c.ultimaOcorrencia)}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <section className="sa-detalhe mp-painel" aria-label="Chamado">
          {!sel && <p className="sa-vazio">Escolha um chamado.</p>}
          {sel && !detalhe && (
            <p className="sa-vazio">
              <Girando rotulo="Carregando" />
            </p>
          )}
          {detalhe && (
            <>
              <header className="sa-cabeca">
                <h2>
                  {formatarProtocolo(detalhe.protocolo)} · {ORIGEM[detalhe.origem]} · {NOME_DA_CATEGORIA[detalhe.categoria]}
                </h2>
                <Segmento<StatusDoChamado>
                  rotulo="Status"
                  valor={detalhe.status}
                  onTroca={(s) => void salvar(detalhe.id, { status: s })}
                  opcoes={STATUS.map((s) => ({ valor: s, rotulo: NOME_DO_STATUS[s] }))}
                />
              </header>

              <dl className="sa-ficha">
                <div>
                  <dt>Rota</dt>
                  <dd>{detalhe.rota}</dd>
                </div>
                <div>
                  <dt>Quem</dt>
                  <dd>
                    {detalhe.nome ?? "—"} {detalhe.email && `<${detalhe.email}>`}
                  </dd>
                </div>
                <div>
                  <dt>Ocorrências</dt>
                  <dd>
                    {detalhe.ocorrencias} · última {formatarDataHora(detalhe.ultimaOcorrencia)}
                  </dd>
                </div>
                {detalhe.contexto.versao && (
                  <div>
                    <dt>Versão</dt>
                    <dd className="mp-mono">{detalhe.contexto.versao}</dd>
                  </div>
                )}
                {detalhe.contexto.navegador && (
                  <div>
                    <dt>Navegador</dt>
                    <dd>
                      {detalhe.contexto.navegador} · {detalhe.contexto.viewport}
                    </dd>
                  </div>
                )}
                {detalhe.digest && (
                  <div>
                    <dt>Digest</dt>
                    <dd className="mp-mono">
                      {detalhe.digest}{" "}
                      <Botao variante="quiet" tamanho="sm" icone aria-label="Copiar digest" onClick={() => void navigator.clipboard.writeText(detalhe.digest ?? "")}>
                        <Copy size={12} />
                      </Botao>
                    </dd>
                  </div>
                )}
              </dl>

              {detalhe.contexto.erro && (
                <pre className="sa-erro">
                  {detalhe.contexto.erro.nome}: {detalhe.contexto.erro.mensagem}
                  {detalhe.contexto.erro.stack ? `\n\n${detalhe.contexto.erro.stack}` : ""}
                </pre>
              )}

              {detalhe.printChecksum && (
                <a href={`/api/arquivos/${detalhe.printChecksum}`} target="_blank" rel="noreferrer" className="sa-print">
                  {/* eslint-disable-next-line @next/next/no-img-element -- arquivo do cofre, servido pela rota autenticada */}
                  <img src={`/api/arquivos/${detalhe.printChecksum}`} alt="Print enviado com o chamado" />
                </a>
              )}

              {detalhe.mensagens.length > 0 && (
                <ol className="sa-mensagens">
                  {detalhe.mensagens.map((m) => (
                    <li key={m.id} data-papel={m.papel}>
                      <span className="sa-linha-meta">
                        {m.papel === "DEV" ? "Você" : (m.autorNome ?? m.autorEmail)} · {formatarDataHora(m.createdAt)}
                      </span>
                      <p>{m.texto}</p>
                    </li>
                  ))}
                </ol>
              )}

              {trilha.length > 0 && (
                <details className="sa-trilha" open={detalhe.origem !== "MANUAL"}>
                  <summary>Trilha ({trilha.length} passos)</summary>
                  <ol>
                    {trilha.map((p, i) => (
                      <li key={i}>
                        <span className="mp-mono">{formatarHora(p.t)}</span> <span className="sa-trilha-tipo">{p.tipo}</span> {p.texto}
                        {p.status !== undefined && ` · ${p.status}`}
                        {p.ms !== undefined && ` · ${p.ms} ms`}
                      </li>
                    ))}
                  </ol>
                </details>
              )}

              <Responder key={detalhe.id} chamado={detalhe} onSalvar={salvar} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
