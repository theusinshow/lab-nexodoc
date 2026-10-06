"use client";

/**
 * A VISTA OBRA (06/10/2026, etapa 3 do desenho do canvas da montagem): todos os
 * volumes do projeto, um trilho por volume, cada tomo uma pílula. É para quem
 * monta vários volumes da mesma obra: ver o conjunto de relance e pular para o
 * que falta. Clicar num trilho abre a conversa daquele volume.
 *
 * A conversa ABERTA usa os dados ao vivo (resultados e fases da montagem); as
 * outras, o último estado gravado no servidor.
 */
import { AlertTriangle, CircleCheck, LoaderCircle, RotateCcw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import { CURVA, DURACAO } from "@/lib/ds/movimento";

import { formatarMb, ordenarVolumes, resumoDoVolume, type VolumeDaObra } from "../lib/entrega-do-volume";
import { faseEmCurso } from "../lib/progresso-da-montagem";
import { tomoDoArtefato } from "../lib/results";
import { useConversation } from "../state/conversation-store";
import { useFasesDaMontagem } from "../state/montadores-de-volume";

type Carga = { estado: "carregando" } | { estado: "erro" } | { estado: "pronto"; volumes: VolumeDaObra[] };

function Pilula({ rotulo, estado, ao_vivo }: { rotulo: string; estado: "pronto" | "acima-do-teto" | "nao-montado"; ao_vivo: boolean }) {
  const cor = ao_vivo
    ? "border-[var(--ds-nexo)] bg-[var(--ds-nexo)]/20 text-foreground animate-pulse motion-reduce:animate-none"
    : estado === "pronto"
      ? "border-[var(--status-ok)]/50 bg-[var(--status-ok)]/10 text-[var(--status-ok)]"
      : estado === "acima-do-teto"
        ? "border-[var(--status-warning)]/60 bg-[var(--status-warning)]/10 text-[var(--status-warning)]"
        : "border-border text-muted-foreground";
  const legenda = ao_vivo ? "montando" : estado === "pronto" ? "montado" : estado === "acima-do-teto" ? "acima de 20 MB" : "não montado";
  return (
    <span className={`inline-flex h-6 items-center rounded-md border px-2 font-mono text-[11px] ${cor}`} title={`${rotulo} · ${legenda}`}>
      {rotulo}
    </span>
  );
}

export function VistaDaObra({ onAbrir }: { onAbrir: (conversaId: string) => void }) {
  const { projectId, pastaDaObra, conversationId, results, identidade } = useConversation();
  const { fases } = useFasesDaMontagem();
  const reduzido = useReducedMotion();
  const [carga, setCarga] = useState<Carga>({ estado: "carregando" });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!pastaDaObra && !projectId) return;
    const controle = new AbortController();
    const busca = new URLSearchParams();
    if (pastaDaObra) busca.set("pasta", pastaDaObra);
    if (projectId) busca.set("projeto", projectId);
    fetch(`/api/nexo/obra?${busca}`, { signal: controle.signal })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<{ volumes?: VolumeDaObra[] }>;
      })
      .then((corpo) => setCarga({ estado: "pronto", volumes: corpo.volumes ?? [] }))
      .catch((err: unknown) => {
        if ((err as { name?: string }).name !== "AbortError") setCarga({ estado: "erro" });
      });
    return () => controle.abort();
  }, [pastaDaObra, projectId, tentativa]);

  // A conversa aberta, AO VIVO: o servidor só sabe do que já foi gravado.
  const aoVivo = useMemo(() => resumoDoVolume(conversationId, "", results), [conversationId, results]);
  const tomosMontando = useMemo(() => {
    const s = new Set<number>();
    for (const [id, f] of Object.entries(fases)) if (faseEmCurso(f)) s.add(tomoDoArtefato(id));
    return s;
  }, [fases]);

  const volumes = useMemo(() => {
    if (carga.estado !== "pronto") return [];
    const lista = carga.volumes.map((v) => (v.conversaId === conversationId ? { ...aoVivo, titulo: v.titulo } : v));
    // A conversa recém-criada pode ainda não ter chegado ao servidor: entra ao vivo.
    if (!lista.some((v) => v.conversaId === conversationId) && aoVivo.temDocumentos) lista.push({ ...aoVivo, titulo: "esta" });
    return ordenarVolumes(lista);
  }, [carga, conversationId, aoVivo]);

  if (!pastaDaObra && !projectId) {
    return <p className="p-6 text-sm text-muted-foreground">Esta conversa ainda não tem obra (código do carimbo). Anexe as pranchas para ela se ligar ao projeto.</p>;
  }
  if (carga.estado === "carregando") {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground" role="status">
        <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> Carregando os volumes da obra…
      </div>
    );
  }
  if (carga.estado === "erro") {
    return (
      <div className="flex items-center gap-3 p-6 text-sm" role="alert">
        <AlertTriangle className="h-4 w-4 text-[var(--status-warning)]" aria-hidden />
        Não deu para carregar os volumes.
        <button
          type="button"
          onClick={() => {
            setCarga({ estado: "carregando" });
            setTentativa((n) => n + 1);
          }}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
        >
          <RotateCcw className="h-3 w-3" aria-hidden /> Tentar de novo
        </button>
      </div>
    );
  }

  const montados = volumes.filter((v) => v.planejados > 0 && v.montados >= v.planejados).length;
  /*
   * As conversas SEM NADA GERADO viram uma linha só, no fim: seis "Vol. —
   * nada gerado ainda" iguais empurravam os volumes de verdade para baixo.
   */
  const comDocumentos = volumes.filter((v) => v.temDocumentos || v.conversaId === conversationId);
  const vazias = volumes.filter((v) => !v.temDocumentos && v.conversaId !== conversationId);

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4 pt-24" data-prova="vista-da-obra">
      <header className="flex items-baseline gap-2">
        <h2 className="text-base font-medium">
          {/* O código da obra: da identidade, ou o começo da pasta ("999-26-CRICIUMA" → "999-26"). */}
          Obra {identidade?.codigo ?? (/^\d{3}-\d{2}/.exec(pastaDaObra)?.[0] ?? "")}
        </h2>
        <span className="text-xs text-muted-foreground">
          {volumes.length} {volumes.length === 1 ? "volume" : "volumes"} · {montados} montado{montados === 1 ? "" : "s"}
        </span>
      </header>

      {volumes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum volume desta obra ainda.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {comDocumentos.map((v, i) => {
            const aberta = v.conversaId === conversationId;
            const completo = v.planejados > 0 && v.montados >= v.planejados;
            return (
              <motion.li
                key={v.conversaId}
                initial={reduzido ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DURACAO.enter, ease: CURVA.out, delay: reduzido ? 0 : i * 0.04 }}
              >
                <button
                  type="button"
                  onClick={() => onAbrir(v.conversaId)}
                  aria-current={aberta ? "true" : undefined}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:border-[var(--ds-nexo)]/60 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 ${
                    aberta ? "border-[var(--ds-nexo)]/50 bg-[var(--ds-nexo)]/[0.07]" : "border-border"
                  }`}
                >
                  <span className="w-16 shrink-0 font-mono text-[13px] font-medium">{v.volume ? `Vol. ${v.volume}` : "Vol. —"}</span>
                  <span className="w-14 shrink-0 truncate font-mono text-[11px] uppercase text-muted-foreground">{v.titulo}</span>
                  <span className="flex min-w-0 flex-1 flex-wrap gap-1">
                    {v.tomos.length === 0 ? (
                      <span className="text-xs text-muted-foreground">{v.temDocumentos ? "sem tomos" : "nada gerado ainda"}</span>
                    ) : (
                      v.tomos.map((t) => (
                        <Pilula
                          key={t.numero}
                          rotulo={t.numero > 0 ? `T${String(t.numero).padStart(2, "0")}` : "Vol."}
                          estado={t.estado}
                          ao_vivo={aberta && tomosMontando.has(t.numero)}
                        />
                      ))
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                    {completo && <CircleCheck className="h-3.5 w-3.5 text-[var(--status-ok)]" aria-hidden />}
                    {v.planejados > 0 && `${v.montados}/${v.planejados}`}
                    {v.pesoTotal > 0 && ` · ${formatarMb(v.pesoTotal)}`}
                    {aberta && <span className="ml-1 rounded-sm bg-[var(--ds-nexo)]/15 px-1.5 py-0.5 text-[10px] text-foreground">aberta</span>}
                  </span>
                </button>
              </motion.li>
            );
          })}
          {vazias.length > 0 && (
            <li>
              <details className="group rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                <summary className="cursor-pointer list-none hover:text-foreground">
                  {vazias.length} {vazias.length === 1 ? "conversa" : "conversas"} desta obra sem nada gerado
                  <span className="ml-1 group-open:hidden">· mostrar</span>
                </summary>
                <ul className="mt-2 flex flex-col gap-1">
                  {vazias.map((v) => (
                    <li key={v.conversaId}>
                      <button type="button" onClick={() => onAbrir(v.conversaId)} className="w-full rounded-md px-2 py-1 text-left hover:bg-accent hover:text-foreground">
                        {v.titulo} · abrir
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          )}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">Clique num volume para abri-lo. Só os seus volumes desta obra aparecem.</p>
    </div>
  );
}
