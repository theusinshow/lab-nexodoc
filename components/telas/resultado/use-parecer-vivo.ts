"use client";

/**
 * O PARECER VIVO: os achados do parecer gravado mais o que o escritório já fez
 * com cada um — desfecho, com quem está, conversa, validade —, e as ações que
 * gravam isso. É a camada de dados do Resultado no desenho do lab (02/10/2026),
 * separada da tela antiga (`components/audit-result.tsx`), que guardava tudo
 * dentro de um componente de seis mil linhas.
 *
 * Fonte de verdade: a rota de feedback da auditoria (`/api/audits/<id>/feedback`),
 * a mesma linha do banco para veredito, desfecho e atribuição. As ações atualizam
 * a tela na hora e relêem o servidor para confirmar.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getFeedbackEndpoint,
  reportFindingToStructured,
  type FeedbackVerdict,
  type SavedFeedback,
  type StructuredFinding,
} from "@/components/audit-result";
import { classifyFindingTier, type AuditFinding, type AuditReport, type FindingDiscipline } from "@/lib/audit-report";
import type { Desfecho } from "@/lib/desfecho-do-achado";
import { disciplinaDoAchado, nivelDoAchado, type Nivel } from "@/lib/nivel-do-achado";
import { paginasDoAchado } from "@/lib/paginas-do-achado";
import { rotuloDoAchado } from "@/lib/rotulo-do-achado";

export type Membro = { email: string; name?: string | null; status?: string };

export interface DesfechoDaTela {
  tipo: Desfecho;
  /** Quem encerrou; nulo = você, na sessão (o servidor ainda não respondeu). */
  por: string | null;
  quando: string | null;
  nota: string | null;
}

export interface AchadoDaTela {
  /** O id GRAVADO (INC-014): chave de feedback, link e fila. */
  chave: string;
  /** O que se lê (ACH-014) — ver lib/rotulo-do-achado.ts. */
  id: string;
  titulo: string;
  nivel: Nivel;
  disc: FindingDiscipline;
  paginas: number[];
  /** O campo de página como veio ("8, 60"). */
  pagina: string | null;
  origem: AuditFinding["origem"];
  /** Confirmado ou sugestão da IA (lib/camada-do-achado.ts). */
  confirmado: boolean;
  bruto: AuditFinding;
  estruturado: StructuredFinding;
  responsavel: { email: string; nome: string; souEu: boolean } | null;
  desfecho: DesfechoDaTela | null;
  validade: FeedbackVerdict | null;
  comentarios: number;
  linha: SavedFeedback | null;
}

export type AvisoDoParecer = { tom: "ok" | "falha"; texto: string } | null;

function montarAchado(f: AuditFinding, linha: SavedFeedback | undefined, euSou: string): AchadoDaTela {
  const resolvido = Boolean(linha?.resolvedAt);
  return {
    chave: f.id,
    id: rotuloDoAchado(f.id),
    titulo: reportFindingToStructured(f).title,
    nivel: nivelDoAchado(f),
    disc: disciplinaDoAchado(f),
    paginas: paginasDoAchado({ pagina: f.pagina, referencia: f.referencia_comparada }),
    pagina: f.pagina || null,
    origem: f.origem,
    confirmado: classifyFindingTier(f) === "principal",
    bruto: f,
    estruturado: reportFindingToStructured(f),
    responsavel:
      linha?.assigneeEmail && !resolvido
        ? { email: linha.assigneeEmail, nome: linha.assigneeName ?? linha.assigneeEmail, souEu: Boolean(euSou) && linha.assigneeEmail.toLowerCase() === euSou }
        : null,
    // Reaberto = resolvedAt nulo, mesmo com o tipo gravado: o desfecho só vale encerrado.
    desfecho: resolvido
      ? { tipo: (linha!.resolutionKind ?? "FIXED_IN_DOC") as Desfecho, por: linha!.resolvedByName, quando: linha!.resolvedAt, nota: linha!.note || null }
      : null,
    validade: linha?.verdict ?? null,
    comentarios: linha?.comentarios ?? 0,
    linha: linha ?? null,
  };
}

export function useParecerVivo({
  auditId,
  report,
  aoMudarResolvido,
}: {
  auditId?: string | null;
  report: AuditReport | null;
  /** Avisa a conversa (anel do trilho, cartão do chat) quando um achado fecha ou reabre. */
  aoMudarResolvido?: (chave: string, resolvido: boolean) => void;
}) {
  const [linhas, setLinhas] = useState<SavedFeedback[]>([]);
  const [euSou, setEuSou] = useState("");
  const [membros, setMembros] = useState<Membro[]>([]);
  const [releituras, setReleituras] = useState(0);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<AvisoDoParecer>(null);

  useEffect(() => {
    if (!auditId) return;
    let vivo = true;
    fetch(getFeedbackEndpoint(auditId), { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: { feedback?: SavedFeedback[]; euSou?: string } | null) => {
        if (!vivo || !p) return;
        setLinhas((p.feedback ?? []).filter((x) => x.findingId));
        if (p.euSou) setEuSou(p.euSou.toLowerCase());
      })
      .catch(() => {
        /* o parecer continua legível sem o que o escritório fez com ele */
      });
    return () => {
      vivo = false;
    };
  }, [auditId, releituras]);

  useEffect(() => {
    let vivo = true;
    fetch("/api/organizacao/membros")
      .then((r) => (r.ok ? r.json() : { membros: [] }))
      .then((d: { membros?: Membro[] }) => {
        // Quem foi desligado não recebe trabalho (o servidor também recusa).
        if (vivo) setMembros((d.membros ?? []).filter((m) => m.status !== "DISABLED"));
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  const porChave = useMemo(() => new Map(linhas.map((l) => [l.findingId as string, l])), [linhas]);
  const achados = useMemo(
    () => (report?.incongruencias ?? []).map((f) => montarAchado(f, porChave.get(f.id), euSou)),
    [report, porChave, euSou],
  );

  const reler = useCallback(() => setReleituras((n) => n + 1), []);

  /** A linha local, mexida antes da resposta: a tela não espera a rede para mudar. */
  const mexerNaLinha = useCallback((chave: string, patch: Partial<SavedFeedback>) => {
    setLinhas((atuais) => {
      const i = atuais.findIndex((l) => l.findingId === chave);
      if (i < 0)
        return [
          ...atuais,
          { id: `local-${chave}`, findingId: chave, verdict: null, resolvedAt: null, note: "", assigneeEmail: null, assigneeName: null, resolutionKind: null, resolvedByName: null, ...patch },
        ];
      return atuais.map((l, j) => (j === i ? { ...l, ...patch } : l));
    });
  }, []);

  const postar = useCallback(
    async (corpo: Record<string, unknown>, falha: string) => {
      if (!auditId) throw new Error("Este parecer não está gravado no servidor.");
      const r = await fetch(getFeedbackEndpoint(auditId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      if (!r.ok) {
        const p = (await r.json().catch(() => null)) as { error?: string } | null;
        throw new Error(p?.error ?? falha);
      }
    },
    [auditId],
  );

  const encerrar = useCallback(
    async (a: AchadoDaTela, tipo: Desfecho, nota?: string) => {
      setSalvando(a.chave);
      setAviso(null);
      const antes = a.linha;
      mexerNaLinha(a.chave, { resolvedAt: new Date().toISOString(), resolutionKind: tipo, resolvedByName: null, note: nota ?? antes?.note ?? "", ...(tipo === "FALSE_POSITIVE" ? { verdict: "FALSE_POSITIVE" as FeedbackVerdict } : {}) });
      try {
        await postar({ findingId: a.chave, findingLabel: a.titulo, page: a.pagina ?? undefined, resolutionKind: tipo, note: nota }, "Não foi possível registrar o desfecho.");
        aoMudarResolvido?.(a.chave, true);
        reler();
        return true;
      } catch (e) {
        if (antes) mexerNaLinha(a.chave, antes);
        else setLinhas((atuais) => atuais.filter((l) => l.findingId !== a.chave));
        setAviso({ tom: "falha", texto: e instanceof Error ? e.message : "Não foi possível registrar o desfecho." });
        return false;
      } finally {
        setSalvando(null);
      }
    },
    [mexerNaLinha, postar, reler, aoMudarResolvido],
  );

  const reabrir = useCallback(
    async (a: AchadoDaTela) => {
      setSalvando(a.chave);
      setAviso(null);
      const antes = a.linha;
      mexerNaLinha(a.chave, { resolvedAt: null });
      try {
        await postar({ findingId: a.chave, findingLabel: a.titulo, page: a.pagina ?? undefined, resolved: false }, "Não foi possível reabrir o achado.");
        aoMudarResolvido?.(a.chave, false);
        reler();
      } catch (e) {
        if (antes) mexerNaLinha(a.chave, antes);
        setAviso({ tom: "falha", texto: e instanceof Error ? e.message : "Não foi possível reabrir o achado." });
      } finally {
        setSalvando(null);
      }
    },
    [mexerNaLinha, postar, reler, aoMudarResolvido],
  );

  /** Validade para o benchmark (procede, gravidade errada) — não encerra o achado. */
  const julgar = useCallback(
    async (a: AchadoDaTela, validade: FeedbackVerdict) => {
      setSalvando(a.chave);
      setAviso(null);
      try {
        await postar({ findingId: a.chave, findingLabel: a.titulo, page: a.pagina ?? undefined, verdict: validade }, "Não foi possível salvar a avaliação.");
        mexerNaLinha(a.chave, { verdict: validade });
        setAviso({ tom: "ok", texto: validade === "WRONG_SEVERITY" ? "Avisei o motor: a gravidade está errada." : "Anotado: o achado procede." });
      } catch (e) {
        setAviso({ tom: "falha", texto: e instanceof Error ? e.message : "Não foi possível salvar a avaliação." });
      } finally {
        setSalvando(null);
      }
    },
    [mexerNaLinha, postar],
  );

  const atribuir = useCallback(
    async (chaves: string[], email: string, recado = "") => {
      if (!auditId || chaves.length === 0) return false;
      const nome = membros.find((m) => m.email === email)?.name ?? "";
      setAviso(null);
      for (const c of chaves) mexerNaLinha(c, { assigneeEmail: email, assigneeName: nome || email });
      try {
        const r = await fetch(`/api/audits/${encodeURIComponent(auditId)}/atribuir`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ findingIds: chaves, assigneeEmail: email, assigneeNome: nome, recado }),
        });
        const p = (await r.json().catch(() => null)) as { error?: string } | null;
        if (!r.ok) throw new Error(p?.error ?? "Não foi possível atribuir.");
        setAviso({ tom: "ok", texto: `${chaves.length === 1 ? "Achado" : `${chaves.length} achados`} com ${nome || email}.` });
        return true;
      } catch (e) {
        setAviso({ tom: "falha", texto: e instanceof Error ? e.message : "Não foi possível atribuir." });
        return false;
      } finally {
        reler();
      }
    },
    [auditId, membros, mexerNaLinha, reler],
  );

  /** O que a auditoria NÃO apontou e devia — vai para o benchmark. */
  const faltou = useCallback(
    async (nota: string) => {
      try {
        await postar({ verdict: "MISSING_FINDING", note: nota }, "Não foi possível registrar.");
        setAviso({ tom: "ok", texto: "Anotado: o motor vai aprender com o que faltou." });
        return true;
      } catch (e) {
        setAviso({ tom: "falha", texto: e instanceof Error ? e.message : "Não foi possível registrar." });
        return false;
      }
    },
    [postar],
  );

  return { achados, membros, euSou, salvando, aviso, setAviso, encerrar, reabrir, julgar, atribuir, faltou, reler };
}

export type ParecerVivo = ReturnType<typeof useParecerVivo>;
