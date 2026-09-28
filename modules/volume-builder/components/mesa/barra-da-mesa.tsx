"use client";

/**
 * A BARRA DA MESA — o que se precisa ver o tempo todo, numa linha só
 * (auditoria UX/UI, V02/V04/V05/V10):
 *
 * - de QUAL projeto é a montagem (ou "Independente"), trocável aqui mesmo;
 * - se ela está GUARDADA, e com a garantia verdadeira: "salvo neste
 *   dispositivo", nunca "sincronizado";
 * - Desfazer/Refazer com o nome da operação;
 * - o aviso da última operação (região viva para leitor de tela).
 */

import { useEffect, useState } from "react";
import { AlertTriangle, Check, CloudOff, FolderKanban, Loader2, Redo2, RotateCw, Undo2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatarEmBrasilia } from "@/lib/fuso-de-brasilia";
import type { Mesa } from "../use-mesa";

type ProjetoDaLista = { id: string; code: string; name: string };

export function BarraDaMesa({ mesa, projetoInicial }: { mesa: Mesa; projetoInicial: ProjetoDaLista | null }) {
  const [projetos, setProjetos] = useState<ProjetoDaLista[] | null>(projetoInicial ? [projetoInicial] : null);
  const [erroProjetos, setErroProjetos] = useState<string | null>(null);
  const [trocando, setTrocando] = useState(false);

  /*
   * A LISTA DE PROJETOS vem da mesma rota de /projetos. Só se busca quando a
   * pessoa abre o seletor: a mesa independente não deve pagar uma consulta
   * por uma escolha que talvez nunca faça.
   */
  async function carregarProjetos() {
    if (projetos && projetos.length > 1) return;
    try {
      const r = await fetch("/api/projects", { cache: "no-store" });
      const corpo = (await r.json().catch(() => null)) as { projects?: ProjetoDaLista[]; error?: string } | null;
      if (!r.ok || !corpo?.projects) throw new Error(corpo?.error ?? `HTTP ${r.status}`);
      const lista = corpo.projects;
      if (projetoInicial && !lista.some((p) => p.id === projetoInicial.id)) lista.unshift(projetoInicial);
      setProjetos(lista);
      setErroProjetos(null);
    } catch (e) {
      setErroProjetos(`Não foi possível listar os projetos (${e instanceof Error ? e.message : "erro"}).`);
    }
  }

  async function trocarProjeto(id: string) {
    setTrocando(true);
    const novo = id ? (projetos ?? []).find((p) => p.id === id) ?? null : null;
    const ok = await mesa.vincularProjeto(novo ? { id: novo.id, codigo: novo.code, nome: novo.name } : null);
    if (ok) {
      try {
        const url = new URL(window.location.href);
        if (novo) url.searchParams.set("project", novo.id);
        else url.searchParams.delete("project");
        window.history.replaceState(window.history.state, "", url.toString());
      } catch {
        /* a URL só serve para o F5 voltar ao mesmo escopo */
      }
    }
    setTrocando(false);
  }

  // Atalhos de teclado: Ctrl+Z / Ctrl+Shift+Z (Ctrl+Y) fora de campos de texto.
  const { desfazer, refazer } = mesa;
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA" || alvo.isContentEditable)) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        desfazer();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        refazer();
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [desfazer, refazer]);

  const g = mesa.gravacao;

  return (
    <div className="sticky top-0 z-20 -mx-1 flex flex-col gap-2 border-b bg-background/95 px-1 pb-2 pt-1 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-0 items-center gap-2" htmlFor="mesa-projeto">
          <FolderKanban className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Projeto</span>
        </label>
        <Select
          id="mesa-projeto"
          value={mesa.projetoId ?? ""}
          disabled={trocando}
          onFocus={() => void carregarProjetos()}
          onMouseDown={() => void carregarProjetos()}
          onChange={(e) => void trocarProjeto(e.target.value)}
          className="h-9 min-w-[12rem] max-w-[22rem] flex-1 sm:flex-none"
          aria-describedby="mesa-projeto-efeito"
        >
          <option value="">Independente (sem projeto)</option>
          {(projetos ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} · {p.name}
            </option>
          ))}
        </Select>

        <EstadoDaGravacao gravacao={g} onTentar={() => void mesa.salvarAgora()} />

        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!mesa.podeDesfazer}
            onClick={mesa.desfazer}
            aria-label={mesa.rotuloDesfazer ? `Desfazer: ${mesa.rotuloDesfazer}` : "Desfazer (nada a desfazer)"}
            title={mesa.rotuloDesfazer ?? undefined}
          >
            <Undo2 aria-hidden />
            Desfazer
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!mesa.podeRefazer}
            onClick={mesa.refazer}
            aria-label={mesa.rotuloRefazer ? `Refazer: ${mesa.rotuloRefazer}` : "Refazer (nada a refazer)"}
            title={mesa.rotuloRefazer ?? undefined}
          >
            <Redo2 aria-hidden />
            Refazer
          </Button>
        </div>
      </div>

      <p id="mesa-projeto-efeito" className="text-xs text-muted-foreground">
        {mesa.projetoId
          ? "Rascunho salvo só neste dispositivo. Ao exportar, os PDFs e o relatório entram no projeto."
          : "Modo independente: o rascunho fica neste dispositivo e exportar não registra nada em projeto."}
        {erroProjetos ? <span className="ml-1 text-[var(--status-warning)]">{erroProjetos}</span> : null}
      </p>

      {g.fase === "conflito" ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 border border-[var(--status-warning)]/40 bg-[var(--status-warning-bg)] px-3 py-2 text-sm"
        >
          <AlertTriangle className="size-4 shrink-0 text-[var(--status-warning)]" aria-hidden />
          <span className="min-w-0 flex-1">
            Esta montagem foi alterada em outra aba. Para não sobrescrever o trabalho de lá, esta aba parou de salvar.
          </span>
          <Button type="button" size="sm" onClick={mesa.carregarVersaoMaisNova}>
            Carregar a versão mais nova
          </Button>
        </div>
      ) : null}

      <div aria-live="polite" role="status" className="min-h-0">
        {mesa.aviso ? (
          <div
            key={mesa.aviso.id}
            data-aviso-da-mesa
            className="flex flex-wrap items-center gap-2 border border-border bg-card px-3 py-1.5 text-sm"
          >
            <span className="min-w-0 flex-1">{mesa.aviso.frase}</span>
            {mesa.aviso.podeDesfazer && mesa.podeDesfazer ? (
              <Button type="button" size="sm" variant="ghost" onClick={mesa.desfazer}>
                <Undo2 aria-hidden />
                Desfazer
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="ghost" onClick={mesa.fecharAviso} aria-label="Fechar aviso">
              <X aria-hidden />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EstadoDaGravacao({ gravacao, onTentar }: { gravacao: Mesa["gravacao"]; onTentar: () => void }) {
  const base = "inline-flex items-center gap-1.5 font-mono text-[11px]";
  switch (gravacao.fase) {
    case "carregando":
      return (
        <span className={`${base} text-muted-foreground`} data-gravacao="carregando">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          procurando rascunho neste dispositivo…
        </span>
      );
    case "vazia":
      return (
        <span className={`${base} text-muted-foreground`} data-gravacao="vazia">
          nada a salvar ainda
        </span>
      );
    case "pendente":
    case "salvando":
      return (
        <span className={`${base} text-muted-foreground`} data-gravacao="salvando">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          salvando neste dispositivo…
        </span>
      );
    case "salvo":
      return (
        <span className={`${base} text-[var(--status-ok)]`} data-gravacao="salvo">
          <Check className="size-3.5" aria-hidden />
          salvo neste dispositivo às {formatarEmBrasilia(new Date(gravacao.em).toISOString(), { timeStyle: "short" })}
        </span>
      );
    case "conflito":
      return (
        <span className={`${base} text-[var(--status-warning)]`} data-gravacao="conflito">
          <AlertTriangle className="size-3.5" aria-hidden />
          não salvo — alterado em outra aba
        </span>
      );
    case "falha":
      return (
        <span className={`${base} flex-wrap text-[var(--status-critical)]`} data-gravacao="falha" role="alert">
          <CloudOff className="size-3.5" aria-hidden />
          não salvo: {gravacao.mensagem}
          <Button type="button" size="sm" variant="outline" onClick={onTentar}>
            <RotateCw aria-hidden />
            Tentar salvar de novo
          </Button>
        </span>
      );
  }
}
