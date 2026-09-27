/**
 * Cobertura como RASTREAMENTO de processamento, não garantia de compreensão.
 *
 * Os estados são separados e só avançam com evidência do passo: texto extraído
 * não é texto submetido; submetido não é concluído (a chamada pode falhar ou
 * truncar); concluído não é sintetizado. Busca e cálculo não entram aqui — não
 * são leitura do arquivo. Visual é dimensão própria: página com texto pode ter
 * desenho não examinado, e página transcrita não é desenho auditado.
 *
 * Todas as contagens são sobre intervalos unidos e recortados ao planejado, de
 * modo que releitura não infla e nada ultrapassa o total.
 */
import type { Coverage, FailedInterval, Interval, PageRef, RevisionText } from "./contracts.ts";

type Span = { page: number; start: number; end: number };

/** União de intervalos por chave e página. Genérica para o piloto reaproveitar. */
export function unionIntervals<T extends Span>(items: T[], key: (item: T) => string): T[] {
  const sorted = items.filter(u => u.end > u.start).map(u => ({ ...u })).sort((a, b) =>
    key(a).localeCompare(key(b)) || a.page - b.page || a.start - b.start);
  const result: T[] = [];
  for (const u of sorted) {
    const last = result.at(-1);
    if (last && key(last) === key(u) && last.page === u.page && u.start <= last.end) {
      last.end = Math.max(last.end, u.end);
    } else result.push(u);
  }
  return result;
}

const byRevision = (i: Interval) => i.revisionId;
export const union = (items: Interval[]) =>
  unionIntervals(items.map(({ revisionId, page, start, end }) => ({ revisionId, page, start, end })), byRevision);

/** Interseção de dois conjuntos já unidos (ou não: une antes). */
export function intersect(a: Interval[], b: Interval[]): Interval[] {
  const ua = union(a);
  const ub = union(b);
  const out: Interval[] = [];
  for (const x of ua) for (const y of ub) {
    if (x.revisionId !== y.revisionId || x.page !== y.page) continue;
    const start = Math.max(x.start, y.start);
    const end = Math.min(x.end, y.end);
    if (end > start) out.push({ revisionId: x.revisionId, page: x.page, start, end });
  }
  return union(out);
}

export function subtract(a: Interval[], b: Interval[]): Interval[] {
  const ub = union(b);
  const out: Interval[] = [];
  for (const x of union(a)) {
    let pieces: Interval[] = [x];
    for (const y of ub) {
      if (y.revisionId !== x.revisionId || y.page !== x.page) continue;
      pieces = pieces.flatMap(p => {
        if (y.end <= p.start || y.start >= p.end) return [p];
        const rest: Interval[] = [];
        if (y.start > p.start) rest.push({ ...p, end: y.start });
        if (y.end < p.end) rest.push({ ...p, start: y.end });
        return rest;
      });
    }
    out.push(...pieces);
  }
  return union(out);
}

export const totalChars = (items: Interval[]) => union(items).reduce((n, i) => n + i.end - i.start, 0);

export type IntervalError = "revision_unknown" | "page_out_of_range" | "offsets_out_of_range";

/** Intervalo fora do texto da revisão é erro, nunca é recortado em silêncio. */
export function checkIntervals(items: Interval[], corpus: RevisionText[]): IntervalError[] {
  const errors = new Set<IntervalError>();
  for (const i of items) {
    const rt = corpus.find(c => c.revision.revisionId === i.revisionId);
    if (!rt) { errors.add("revision_unknown"); continue; }
    const text = rt.pages[i.page - 1];
    if (!Number.isSafeInteger(i.page) || text === undefined) { errors.add("page_out_of_range"); continue; }
    if (!Number.isSafeInteger(i.start) || !Number.isSafeInteger(i.end) || i.start < 0 || i.end > text.length || i.end < i.start) {
      errors.add("offsets_out_of_range");
    }
  }
  return [...errors];
}

function assertIntervals(items: Interval[], corpus: RevisionText[]) {
  const errors = checkIntervals(items, corpus);
  if (errors.length) throw new Error(`invalid_intervals:${errors.join(",")}`);
}

const wholePages = (rt: RevisionText, pages?: number[]): Interval[] =>
  rt.pages.map((text, i) => ({ revisionId: rt.revision.revisionId, page: i + 1, start: 0, end: text.length }))
    .filter(i => !pages || pages.includes(i.page));

const keyOf = (p: PageRef) => `${p.revisionId}\u0000${p.page}`;
const uniquePages = (pages: PageRef[]) =>
  [...new Map(pages.map(p => [keyOf(p), { revisionId: p.revisionId, page: p.page }])).values()];

/**
 * Escopo planejado de uma passada. `visualRequired` são páginas cujo conteúdo
 * decisivo não está (ou não está confiável) no texto — página muda, desenho,
 * tabela quebrada. Elas entram como pendência visual até alguém avaliá-las.
 */
export function planCoverage(
  scope: string,
  corpus: RevisionText[],
  options: { pages?: Record<string, number[]>; visualRequired?: PageRef[] } = {},
): Coverage {
  const planned = corpus.flatMap(rt => wholePages(rt, options.pages?.[rt.revision.revisionId]));
  const pages = planned.map(({ revisionId, page }) => ({ revisionId, page }));
  const inScope = new Set(pages.map(keyOf));
  const visual = uniquePages(options.visualRequired ?? []);
  if (visual.some(p => !inScope.has(keyOf(p)))) throw new Error("visual_page_out_of_scope");
  return {
    scope, pages, planned: union(planned), extracted: union(planned), submitted: [], completed: [], failed: [],
    synthesized: false, visual: { assessed: [], requiredNotAssessed: visual },
    inherited: [],
  };
}

export function recordSubmitted(c: Coverage, items: Interval[], corpus: RevisionText[]): Coverage {
  assertIntervals(items, corpus);
  return { ...c, submitted: intersect([...c.submitted, ...items], c.planned) };
}

/**
 * Só o que foi submetido pode ser concluído. Concluir algo nunca submetido é
 * erro do chamador, e o excedente é descartado — não conta.
 */
export function recordCompleted(c: Coverage, items: Interval[], corpus: RevisionText[]): Coverage {
  assertIntervals(items, corpus);
  return { ...c, completed: intersect([...c.completed, ...items], c.submitted) };
}

export function recordFailed(
  c: Coverage, items: Interval[], reason: FailedInterval["reason"], corpus: RevisionText[],
): Coverage {
  assertIntervals(items, corpus);
  const failed = intersect(items, c.planned).map(i => ({ ...i, reason }));
  return { ...c, failed: [...c.failed, ...failed] };
}

/** Herança de reuso (etapa 4): campo à parte, nunca somado ao concluído. */
export function recordInherited(c: Coverage, items: Interval[], corpus: RevisionText[]): Coverage {
  assertIntervals(items, corpus);
  return { ...c, inherited: intersect([...c.inherited, ...items], c.planned) };
}

export function recordVisualAssessed(c: Coverage, pages: PageRef[]): Coverage {
  const assessed = uniquePages([...c.visual.assessed, ...pages]);
  const done = new Set(assessed.map(keyOf));
  return { ...c, visual: { assessed, requiredNotAssessed: c.visual.requiredNotAssessed.filter(p => !done.has(keyOf(p))) } };
}

export const markSynthesized = (c: Coverage): Coverage => ({ ...c, synthesized: true });

export type CoverageStatus =
  /** Nada a examinar (zero páginas/caracteres). Não é "100%". */
  | "empty"
  | "not_started"
  | "partial"
  /** Todo texto planejado concluído nesta corrida, síntese feita, nada visual pendente. */
  | "complete"
  /** Idem, mas parte do texto veio de reuso: a UI precisa dizer isso. */
  | "complete_with_inherited";

export type RevisionCoverageReport = {
  revisionId: string;
  pages: number;
  plannedChars: number;
  submittedChars: number;
  completedChars: number;
  inheritedChars: number;
  failedOutstandingChars: number;
  failedReasons: FailedInterval["reason"][];
  pagesWithoutText: number[];
  visualPending: number[];
  visualAssessed: number[];
};

export type CoverageReport = {
  scope: string;
  status: CoverageStatus;
  synthesized: boolean;
  /**
   * Páginas com texto extraído / páginas no escopo. Extração, não auditoria:
   * 1 aqui convive com qualquer `completedRatio`.
   */
  pagesWithTextRatio: number | null;
  /** Caracteres concluídos nesta corrida / planejados. `null` sem texto planejado. */
  completedRatio: number | null;
  revisions: RevisionCoverageReport[];
};

const sortNum = (xs: number[]) => [...xs].sort((a, b) => a - b);

export function coverageReport(c: Coverage): CoverageReport {
  const revisionIds = [...new Set(c.pages.map(p => p.revisionId))].sort();
  const revisions = revisionIds.map((revisionId): RevisionCoverageReport => {
    const only = (items: Interval[]) => items.filter(i => i.revisionId === revisionId);
    const pages = c.pages.filter(p => p.revisionId === revisionId).map(p => p.page);
    const withText = new Set(only(c.extracted).map(i => i.page));
    const covered = union([...only(c.completed), ...only(c.inherited)]);
    const outstanding = subtract(only(c.failed), covered);
    const reasons = c.failed.filter(f => f.revisionId === revisionId &&
      outstanding.some(o => o.page === f.page && o.start < f.end && f.start < o.end)).map(f => f.reason);
    return {
      revisionId,
      pages: pages.length,
      plannedChars: totalChars(only(c.planned)),
      submittedChars: totalChars(only(c.submitted)),
      completedChars: totalChars(only(c.completed)),
      inheritedChars: totalChars(subtract(only(c.inherited), only(c.completed))),
      failedOutstandingChars: totalChars(outstanding),
      failedReasons: [...new Set(reasons)].sort(),
      pagesWithoutText: sortNum(pages.filter(p => !withText.has(p))),
      visualPending: sortNum(c.visual.requiredNotAssessed.filter(p => p.revisionId === revisionId).map(p => p.page)),
      visualAssessed: sortNum(c.visual.assessed.filter(p => p.revisionId === revisionId).map(p => p.page)),
    };
  });
  const sum = (f: (r: RevisionCoverageReport) => number) => revisions.reduce((n, r) => n + f(r), 0);
  const pages = sum(r => r.pages);
  const planned = sum(r => r.plannedChars);
  const completed = sum(r => r.completedChars);
  const inherited = sum(r => r.inheritedChars);
  const visualPending = revisions.some(r => r.visualPending.length > 0);
  // Página sem texto e sem avaliação visual é leitura que não aconteceu.
  const blindPages = revisions.some(r => r.pagesWithoutText.some(p => !r.visualAssessed.includes(p)));

  let status: CoverageStatus;
  if (pages === 0) status = "empty";
  else if (completed === 0 && inherited === 0 && c.visual.assessed.length === 0) status = "not_started";
  else if (completed + inherited < planned || visualPending || blindPages || !c.synthesized) status = "partial";
  else status = inherited > 0 ? "complete_with_inherited" : "complete";

  return {
    scope: c.scope, status, synthesized: c.synthesized,
    pagesWithTextRatio: pages ? sum(r => r.pages - r.pagesWithoutText.length) / pages : null,
    completedRatio: planned ? completed / planned : null,
    revisions,
  };
}
