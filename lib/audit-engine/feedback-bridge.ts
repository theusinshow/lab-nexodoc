/**
 * Ponte entre o feedback existente (`AuditFeedback`) e a linhagem do motor.
 * PURA: decide o que acontece com cada linha de feedback quando um parecer novo
 * substitui o anterior; quem grava é a rota, com o controle de acesso atual.
 *
 * - `targetKey` (`finding:INC-014`) é POSICIONAL: nunca é chave de identidade
 *   entre versões. A identidade é a linhagem do motor (`logicalId`) ou, em
 *   parecer anterior ao motor, o `fingerprint` legado (`chaveEntreVersoes`).
 * - Julgamento da IA (`verdict`) e desfecho do trabalho (`resolvedAt`/
 *   `resolutionKind`) são eixos separados: herdar um não herda o outro.
 * - Só HERANÇA comprovada (mesma ocorrência lógica, fontes equivalentes) carrega
 *   o julgamento. Reanálise com a mesma identidade relaciona, pede nova
 *   avaliação e preserva histórico — sem aprovar sozinha.
 * - Achado resolvido que reaparece é REABERTO: "resolvido" não prova que o
 *   motor acertou nem que o documento mudou.
 * - "Achado ausente" vira item de avaliação revisável, nunca instrução de prompt.
 * - Nada aqui envia e-mail ou notificação.
 */
import { parseEngineFinding } from "./report-contract.ts";

export type FeedbackRow = {
  targetKey: string;
  findingId: string | null;
  fingerprint: string | null;
  verdict: "CONFIRMED" | "FALSE_POSITIVE" | "WRONG_SEVERITY" | "MISSING_FINDING" | null;
  resolvedAt: string | null;
  resolutionKind: "FIXED_IN_DOC" | "FALSE_POSITIVE" | "ACCEPTED_RISK" | null;
  assigneeEmail: string | null;
  note: string;
};

/** Forma mínima do achado para a ponte (legado + `motor` opcional). */
export type BridgeFinding = { id: string; tipo: string; evidencia: string; motor?: unknown };

export type Disposition =
  | { kind: "carry"; fromTargetKey: string; toTargetKey: string; inheritVerdict: true; inheritResolution: true; basis: "engine_inherited" | "legacy_same_fingerprint" }
  | { kind: "related_requires_review"; fromTargetKey: string; toTargetKey: string; inheritVerdict: false; inheritResolution: false; keepHistory: true; basis: "engine_reanalyzed" }
  | { kind: "reopened"; fromTargetKey: string; toTargetKey: string; inheritVerdict: false; inheritResolution: false; keepHistory: true; previousResolution: FeedbackRow["resolutionKind"] }
  | { kind: "not_in_current"; fromTargetKey: string }
  | { kind: "evaluation_item"; fromTargetKey: string; note: string }
  | { kind: "scope_mismatch"; fromTargetKey: string };

const norm = (v: string) => (v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Mesma fórmula de `chaveEntreVersoes` (lib/diff-de-pareceres.ts), sem importar o módulo de UI. */
export const legacyFingerprint = (f: BridgeFinding) => `${norm(f.tipo)}|${norm(f.evidencia).slice(0, 120)}`;

function engineOf(f: BridgeFinding) {
  const p = parseEngineFinding(f.motor);
  return p.kind === "engine" ? p.value : null;
}

/** A identidade entre versões que a rota grava em `AuditFeedback.fingerprint`. */
export function identityOf(f: BridgeFinding): string {
  const m = engineOf(f);
  return m?.lineage ? `engine:${m.lineage.logicalId}` : legacyFingerprint(f);
}

export function carryFeedback(args: {
  previous: { scopeKey: string; findings: BridgeFinding[]; feedback: FeedbackRow[] };
  current: { scopeKey: string; findings: BridgeFinding[] };
}): Disposition[] {
  const byId = new Map(args.previous.findings.map(f => [f.id, f]));
  const out: Disposition[] = [];
  for (const row of args.previous.feedback) {
    if (row.verdict === "MISSING_FINDING") {
      out.push({ kind: "evaluation_item", fromTargetKey: row.targetKey, note: row.note });
      continue;
    }
    if (args.previous.scopeKey !== args.current.scopeKey) { out.push({ kind: "scope_mismatch", fromTargetKey: row.targetKey }); continue; }
    const before = row.findingId ? byId.get(row.findingId) : undefined;
    const identity = row.fingerprint ?? (before ? identityOf(before) : null);
    const match = identity ? args.current.findings.find(f => identityOf(f) === identity || (!identity.startsWith("engine:") && legacyFingerprint(f) === identity)) : undefined;
    if (!match) { out.push({ kind: "not_in_current", fromTargetKey: row.targetKey }); continue; }
    const toTargetKey = `finding:${match.id}`;
    const m = engineOf(match);
    const inherited = !!m?.lineage?.inheritedFrom;
    const sameEvidence = before ? legacyFingerprint(before) === legacyFingerprint(match) : false;
    // "Corrigido no documento" e o mesmo trecho continua lá: a correção não aconteceu.
    if (row.resolvedAt && (!inherited || row.resolutionKind === "FIXED_IN_DOC")) {
      out.push({ kind: "reopened", fromTargetKey: row.targetKey, toTargetKey, inheritVerdict: false, inheritResolution: false, keepHistory: true, previousResolution: row.resolutionKind });
    } else if (m && !inherited) {
      out.push({ kind: "related_requires_review", fromTargetKey: row.targetKey, toTargetKey, inheritVerdict: false, inheritResolution: false, keepHistory: true, basis: "engine_reanalyzed" });
    } else if (m && inherited) {
      out.push({ kind: "carry", fromTargetKey: row.targetKey, toTargetKey, inheritVerdict: true, inheritResolution: true, basis: "engine_inherited" });
    } else if (sameEvidence || !before) {
      out.push({ kind: "carry", fromTargetKey: row.targetKey, toTargetKey, inheritVerdict: true, inheritResolution: true, basis: "legacy_same_fingerprint" });
    } else {
      out.push({ kind: "related_requires_review", fromTargetKey: row.targetKey, toTargetKey, inheritVerdict: false, inheritResolution: false, keepHistory: true, basis: "engine_reanalyzed" });
    }
  }
  return out;
}
