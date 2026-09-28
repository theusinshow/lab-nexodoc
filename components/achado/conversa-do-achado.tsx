"use client";

/**
 * A CONVERSA DE UM ACHADO — a lista, o campo de escrever e os envolvidos.
 *
 * Arquivo PRÓPRIO, e não mais trezentas linhas em `audit-result.tsx`.
 *
 * Auditoria UX/UI, A08 (28/09/2026):
 * - CARREGA SÓ QUANDO ABERTA. Monta dentro da aba "Conversa" do detalhe; a
 *   fila mostra a contagem que vem do feedback, sem abrir 52 conversas.
 * - ATUALIZA quando a janela volta ao foco e pelo botão "Atualizar", e diz de
 *   quando é o que está na tela. Sem polling: o defeito era não haver canal de
 *   volta, e voltar à aba é o momento em que a pessoa quer o dado novo.
 * - FALHA É FALHA. Incluir/tirar envolvido não conferia `response.ok` — um 403
 *   parecia sucesso. Agora cada ação diz o que aconteceu, e o rascunho do
 *   comentário sobrevive a erro e à troca de achado (mora em quem chama).
 */
import { useCallback, useEffect, useState } from "react";
import { RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatarEmBrasilia } from "@/lib/fuso-de-brasilia";
import type { LinhaLegivel } from "@/lib/conversa-do-achado";

import { LinhaDaConversa } from "./linha-da-conversa";

type Envolvido = { email: string; nome: string };
type Membro = { email: string; name?: string | null };

async function motivo(r: Response, padrao: string) {
  const p = (await r.json().catch(() => null)) as { error?: string } | null;
  return `${p?.error ?? padrao} (HTTP ${r.status})`;
}

export function ConversaDoAchado({
  auditId,
  findingId,
  membros,
  rascunho,
  onRascunho,
  onPublicado,
}: {
  auditId: string;
  findingId: string;
  membros: readonly Membro[];
  /** O texto em edição, guardado por quem chama (sobrevive à troca de achado). */
  rascunho?: string;
  onRascunho?: (texto: string) => void;
  /** Avisa quem chama para atualizar a contagem da fila. */
  onPublicado?: () => void;
}) {
  const [linhas, setLinhas] = useState<LinhaLegivel[]>([]);
  const [envolvidos, setEnvolvidos] = useState<Envolvido[]>([]);
  const [textoLocal, setTextoLocal] = useState("");
  const texto = rascunho ?? textoLocal;
  const setTexto = onRascunho ?? setTextoLocal;
  const [ocupado, setOcupado] = useState(false);
  const [erroDaCarga, setErroDaCarga] = useState<string | null>(null);
  const [erroDaAcao, setErroDaAcao] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);
  const [carregadoEm, setCarregadoEm] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [releituras, setReleituras] = useState(0);
  const atualizar = useCallback(() => setReleituras((n) => n + 1), []);

  const base = `/api/audits/${encodeURIComponent(auditId)}/achados/${encodeURIComponent(findingId)}`;

  useEffect(() => {
    let vivo = true;
    async function carregar() {
      setCarregando(true);
      try {
        const r = await fetch(`${base}/conversa`, { cache: "no-store" });
        if (!r.ok) throw new Error(await motivo(r, "Não deu para carregar a conversa"));
        const p = (await r.json()) as { linhas?: LinhaLegivel[]; envolvidos?: Envolvido[] };
        if (!vivo) return;
        setLinhas(p.linhas ?? []);
        setEnvolvidos(p.envolvidos ?? []);
        setErroDaCarga(null);
        setCarregadoEm(Date.now());
      } catch (e) {
        // A conversa é acessória ao parecer: diz o que houve e deixa o resto de pé.
        if (vivo) setErroDaCarga(e instanceof Error ? e.message : "Não deu para carregar a conversa.");
      } finally {
        if (vivo) setCarregando(false);
      }
    }
    queueMicrotask(() => void carregar());
    return () => {
      vivo = false;
    };
  }, [base, releituras]);

  // Voltou para a janela: relê — é quando outra pessoa pode ter respondido.
  useEffect(() => {
    const aoVoltar = () => {
      if (document.visibilityState === "visible") atualizar();
    };
    window.addEventListener("focus", aoVoltar);
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      window.removeEventListener("focus", aoVoltar);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [atualizar]);

  async function publicar() {
    const corpo = texto.trim();
    if (!corpo || ocupado) return;
    setOcupado(true);
    setErroDaAcao(null);
    setFeito(null);
    try {
      const r = await fetch(`${base}/conversa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: corpo }),
      });
      if (!r.ok) throw new Error(await motivo(r, "O comentário não foi publicado"));
      setTexto("");
      setFeito("Comentário publicado. Ninguém recebeu e-mail por isso.");
      onPublicado?.();
      atualizar();
    } catch (e) {
      // O RASCUNHO FICA: falhou, e o texto continua no campo para tentar de novo.
      setErroDaAcao(e instanceof Error ? e.message : "O comentário não foi publicado.");
    } finally {
      setOcupado(false);
    }
  }

  async function mexerNoEnvolvido(email: string, nome: string, entra: boolean) {
    setOcupado(true);
    setErroDaAcao(null);
    setFeito(null);
    try {
      const r = await fetch(`${base}/envolvidos`, {
        method: entra ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, nome }),
      });
      if (!r.ok) {
        throw new Error(
          await motivo(r, entra ? `Não deu para incluir ${nome || email}` : `Não deu para tirar ${nome || email}`),
        );
      }
      setFeito(
        entra
          ? `${nome || email} passa a acompanhar este achado (sem e-mail automático).`
          : `${nome || email} deixou de acompanhar este achado.`,
      );
      atualizar();
    } catch (e) {
      setErroDaAcao(e instanceof Error ? e.message : "A alteração não foi feita.");
    } finally {
      setOcupado(false);
    }
  }

  const disponiveis = membros.filter((m) => !envolvidos.some((e) => e.email === m.email.toLowerCase()));

  return (
    <section className="flex flex-col gap-3" aria-label="Conversa do achado" data-conversa-do-achado={findingId}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span aria-live="polite">
          {carregando
            ? "Carregando a conversa…"
            : carregadoEm
              ? `Atualizada às ${formatarEmBrasilia(new Date(carregadoEm).toISOString(), { timeStyle: "short" })}`
              : null}
        </span>
        <Button type="button" size="sm" variant="ghost" onClick={atualizar} disabled={carregando} aria-label="Atualizar a conversa">
          <RotateCw aria-hidden />
          Atualizar
        </Button>
      </div>

      {erroDaCarga ? (
        <p role="alert" className="text-sm text-[var(--status-critical)]" data-erro-da-conversa>
          {erroDaCarga}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Acompanham</span>
        {envolvidos.length === 0 ? (
          <span className="text-xs text-muted-foreground">ninguém ainda</span>
        ) : (
          envolvidos.map((e) => (
            <button
              key={e.email}
              type="button"
              disabled={ocupado}
              onClick={() => void mexerNoEnvolvido(e.email, e.nome, false)}
              className="nx-edge-6 px-2 py-0.5 text-xs [--nx-edge:var(--border)] hover:[--nx-fill:var(--accent)] disabled:opacity-50"
              aria-label={`Tirar ${e.nome} de quem acompanha este achado`}
            >
              {e.nome} ×
            </button>
          ))
        )}
        {disponiveis.length > 0 ? (
          <Select
            className="h-8 w-48"
            value=""
            disabled={ocupado}
            aria-label="Incluir alguém para acompanhar este achado"
            onChange={(ev) => {
              const m = disponiveis.find((x) => x.email === ev.target.value);
              if (m) void mexerNoEnvolvido(m.email, m.name ?? "", true);
            }}
          >
            <option value="">+ incluir quem acompanha</option>
            {disponiveis.map((m) => (
              <option key={m.email} value={m.email}>
                {m.name || m.email}
              </option>
            ))}
          </Select>
        ) : null}
      </div>

      {linhas.length === 0 && !carregando && !erroDaCarga ? (
        <p className="m-0 text-xs text-muted-foreground">Nada dito ainda sobre este achado.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {linhas.map((l, i) => (
            <LinhaDaConversa key={`${l.createdAt}-${i}`} linha={l} />
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor={`comentario-${findingId}`} className="sr-only">
          Comentário sobre este achado
        </label>
        <Textarea
          id={`comentario-${findingId}`}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva para quem está neste achado…"
          rows={2}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="min-w-0 text-xs" aria-live="polite">
            {erroDaAcao ? (
              <span role="alert" className="text-[var(--status-critical)]" data-erro-da-acao>
                {erroDaAcao}
              </span>
            ) : feito ? (
              <span className="text-[var(--status-ok)]">{feito}</span>
            ) : texto.trim() ? (
              <span className="text-muted-foreground">Rascunho guardado enquanto você navega pelos achados.</span>
            ) : null}
          </span>
          <Button onClick={() => void publicar()} disabled={ocupado || !texto.trim()}>
            Publicar comentário
          </Button>
        </div>
      </div>
    </section>
  );
}
