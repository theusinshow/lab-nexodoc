/**
 * Orçamento ÚNICO de uma execução do Audit: toda tentativa de chamada paga —
 * descoberta, leitura, coerência, investigação, triagem, especialista,
 * validação, refutação, visão, retry, sombra — reserva e acerta no MESMO
 * ledger. Não existe saldo "do especialista" ou "do visual".
 *
 * Funções puras sobre um estado imutável; a serialização e a concorrência entre
 * processos são do store (memória em teste, banco em P7).
 *
 *   exposição = custo conhecido + reservas ativas + reservas de custo incerto
 *   nova reserva só cabe se exposição + reserva <= limite (e demais limites)
 *
 * Isto controla exposição por ESTIMATIVA; não garante a fatura do provedor.
 * Dinheiro em micro-dólares inteiros (1 USD = 1_000_000) para não acumular erro
 * de ponto flutuante. Preço vem de `lib/ai-precos.ts` — a tabela única.
 */
import { estimateOpenAiCostUsd, isModelPriceKnown } from "../ai-precos.ts";

export type Micros = number;
export const toMicros = (usd: number): Micros => {
  if (!Number.isFinite(usd) || usd < 0) throw new Error("invalid_usd");
  // Arredonda para CIMA: estimativa de custo erra para o lado de gastar menos.
  return Math.ceil(Number((usd * 1_000_000).toFixed(6)));
};
export const fromMicros = (m: Micros) => m / 1_000_000;

export type CallPurpose =
  | "discovery" | "reading_local" | "reading_global" | "coherence" | "investigation" | "triage"
  | "specialist" | "validation" | "refutation" | "visual" | "shadow";

/** Inventário do caminho novo. Chamada com propósito fora desta lista é falha de integração. */
export const CALL_PURPOSES: readonly CallPurpose[] = [
  "discovery", "reading_local", "reading_global", "coherence", "investigation", "triage",
  "specialist", "validation", "refutation", "visual", "shadow",
];

export type UnknownPricePolicy =
  | { kind: "block" }
  /** Explícita e registrada no snapshot: usar o preço de outro modelo como teto. */
  | { kind: "conservative"; assumeModel: string };

export type BudgetSnapshot = {
  runId: string;
  currency: "USD";
  limitMicros: Micros;
  maxCalls: number;
  maxToolOps: number;
  maxPages: number;
  maxWallMs: number;
  maxConcurrency: number;
  /** Margem sobre a reserva, em pontos-base (1500 = 15%). */
  marginBp: number;
  /** Tokens por imagem enviada à visão, para reserva. */
  imageTokenAllowance: number;
  unknownPrice: UnknownPricePolicy;
  priceSource: "lib/ai-precos.ts";
  startedAt: number;
};

export type AttemptState = "reserved" | "sent" | "settled" | "unknown" | "released";
export type Usage = { inputTokens: number; cachedTokens: number; outputTokens: number };

export type Attempt = {
  attemptId: string;
  purpose: CallPurpose;
  model: string;
  retryOf: string | null;
  state: AttemptState;
  reservedMicros: Micros;
  knownMicros: Micros | null;
  usage: Usage | null;
};

export type LedgerState = {
  snapshot: BudgetSnapshot;
  attempts: Record<string, Attempt>;
  toolOps: number;
  pages: number;
  /** Uso real acima da reserva: registrado e trava novas reservas. */
  overrun: { micros: Micros; attemptIds: string[] };
};

export type LedgerError =
  | "budget_exhausted" | "price_unknown" | "call_limit" | "tool_op_limit" | "page_limit" | "time_limit"
  | "concurrency_limit" | "attempt_conflict" | "unknown_attempt" | "cannot_release_sent" | "invalid_state"
  | "usage_conflict" | "halted_by_overrun" | "invalid_purpose" | "invalid_request";

export type Result<T> = { ok: true; state: LedgerState; value: T } | { ok: false; state: LedgerState; error: LedgerError };
const ok = <T>(state: LedgerState, value: T): Result<T> => ({ ok: true, state, value });
const err = <T>(state: LedgerState, error: LedgerError): Result<T> => ({ ok: false, state, error });

export function newLedger(snapshot: BudgetSnapshot): LedgerState {
  for (const k of ["limitMicros", "maxCalls", "maxToolOps", "maxPages", "maxWallMs", "maxConcurrency", "marginBp", "imageTokenAllowance"] as const) {
    if (!Number.isSafeInteger(snapshot[k]) || snapshot[k] < 0) throw new Error(`invalid_snapshot:${k}`);
  }
  return { snapshot: Object.freeze({ ...snapshot }), attempts: {}, toolOps: 0, pages: 0, overrun: { micros: 0, attemptIds: [] } };
}

export function exposure(state: LedgerState) {
  let known = 0, active = 0, uncertain = 0, inFlight = 0;
  for (const a of Object.values(state.attempts)) {
    if (a.state === "settled") known += a.knownMicros ?? 0;
    else if (a.state === "reserved" || a.state === "sent") { active += a.reservedMicros; inFlight++; }
    else if (a.state === "unknown") uncertain += a.reservedMicros;
  }
  return { knownMicros: known, activeMicros: active, uncertainMicros: uncertain, totalMicros: known + active + uncertain, inFlight };
}

export type ReserveRequest = {
  attemptId: string;
  purpose: CallPurpose;
  model: string;
  retryOf?: string | null;
  /** Bytes UTF-8 do pedido serializado: 1 token por byte é teto, nunca chars/4. */
  requestBytes: number;
  images?: number;
  maxOutputTokens: number;
  now: number;
};

/**
 * Teto de custo de uma chamada: toda a entrada sem cache, saída máxima, faixa
 * de contexto longo quando couber (a função de preço decide), mais margem.
 */
export function reservationMicros(s: BudgetSnapshot, req: Pick<ReserveRequest, "model" | "requestBytes" | "images" | "maxOutputTokens">): { micros: Micros; pricedAs: string } | null {
  const pricedAs = isModelPriceKnown(req.model) ? req.model : s.unknownPrice.kind === "conservative" ? s.unknownPrice.assumeModel : null;
  if (!pricedAs || !isModelPriceKnown(pricedAs)) return null;
  const inputTokens = req.requestBytes + 8192 + (req.images ?? 0) * s.imageTokenAllowance;
  const usd = estimateOpenAiCostUsd(pricedAs, { inputTokens, cachedTokens: 0, outputTokens: req.maxOutputTokens });
  if (usd === null) return null;
  const base = toMicros(usd);
  return { micros: base + Math.ceil((base * s.marginBp) / 10_000), pricedAs };
}

export function reserve(state: LedgerState, req: ReserveRequest): Result<Attempt> {
  if (!CALL_PURPOSES.includes(req.purpose)) return err(state, "invalid_purpose");
  if (!req.attemptId || !Number.isSafeInteger(req.requestBytes) || req.requestBytes < 0 ||
    !Number.isSafeInteger(req.maxOutputTokens) || req.maxOutputTokens < 1 || !Number.isSafeInteger(req.images ?? 0)) {
    return err(state, "invalid_request");
  }
  const existing = state.attempts[req.attemptId];
  if (existing) {
    // Idempotente: repetir a MESMA reserva devolve a mesma tentativa.
    return existing.purpose === req.purpose && existing.model === req.model ? ok(state, existing) : err(state, "attempt_conflict");
  }
  const s = state.snapshot;
  if (state.overrun.micros > 0) return err(state, "halted_by_overrun");
  if (req.now - s.startedAt > s.maxWallMs) return err(state, "time_limit");
  if (Object.keys(state.attempts).length >= s.maxCalls) return err(state, "call_limit");
  const exp = exposure(state);
  if (exp.inFlight >= s.maxConcurrency) return err(state, "concurrency_limit");
  const priced = reservationMicros(s, req);
  if (!priced) return err(state, "price_unknown");
  if (exp.totalMicros + priced.micros > s.limitMicros) return err(state, "budget_exhausted");
  const attempt: Attempt = {
    attemptId: req.attemptId, purpose: req.purpose, model: req.model, retryOf: req.retryOf ?? null,
    state: "reserved", reservedMicros: priced.micros, knownMicros: null, usage: null,
  };
  return ok({ ...state, attempts: { ...state.attempts, [req.attemptId]: attempt } }, attempt);
}

function update(state: LedgerState, id: string, patch: Partial<Attempt>): LedgerState {
  return { ...state, attempts: { ...state.attempts, [id]: { ...state.attempts[id], ...patch } } };
}

/** O pedido saiu do processo. A partir daqui a reserva não pode ser liberada como "não enviada". */
export function markSent(state: LedgerState, id: string): Result<Attempt> {
  const a = state.attempts[id];
  if (!a) return err(state, "unknown_attempt");
  if (a.state === "sent") return ok(state, a);
  if (a.state !== "reserved") return err(state, "invalid_state");
  const next = update(state, id, { state: "sent" });
  return ok(next, next.attempts[id]);
}

/** Libera só o que comprovadamente não foi enviado (cancelamento antes do envio). */
export function releaseUnsent(state: LedgerState, id: string): Result<Attempt> {
  const a = state.attempts[id];
  if (!a) return err(state, "unknown_attempt");
  if (a.state === "released") return ok(state, a);
  if (a.state !== "reserved") return err(state, "cannot_release_sent");
  const next = update(state, id, { state: "released" });
  return ok(next, next.attempts[id]);
}

/** Enviado e sem resposta (timeout, conexão caída): custo incerto, a reserva continua exposta. */
export function markUnknown(state: LedgerState, id: string): Result<Attempt> {
  const a = state.attempts[id];
  if (!a) return err(state, "unknown_attempt");
  if (a.state === "unknown") return ok(state, a);
  if (a.state !== "sent") return err(state, "invalid_state");
  const next = update(state, id, { state: "unknown" });
  return ok(next, next.attempts[id]);
}

const sameUsage = (a: Usage, b: Usage) => a.inputTokens === b.inputTokens && a.cachedTokens === b.cachedTokens && a.outputTokens === b.outputTokens;

/**
 * Uso conhecido — de resposta completa, incompleta ou de erro que trouxe
 * tokens. Idempotente para o mesmo uso; uso diferente para a mesma tentativa é
 * conflito (fica o primeiro). Uso acima da reserva é estouro registrado.
 * Também reconcilia uma tentativa `unknown` quando o uso aparece depois.
 */
export function settle(state: LedgerState, id: string, usage: Usage): Result<Attempt> {
  const a = state.attempts[id];
  if (!a) return err(state, "unknown_attempt");
  if (![usage.inputTokens, usage.cachedTokens, usage.outputTokens].every(n => Number.isSafeInteger(n) && n >= 0) || usage.cachedTokens > usage.inputTokens) {
    return err(state, "invalid_request");
  }
  if (a.state === "settled") return a.usage && sameUsage(a.usage, usage) ? ok(state, a) : err(state, "usage_conflict");
  if (a.state !== "sent" && a.state !== "unknown") return err(state, "invalid_state");
  const s = state.snapshot;
  const pricedAs = isModelPriceKnown(a.model) ? a.model : s.unknownPrice.kind === "conservative" ? s.unknownPrice.assumeModel : a.model;
  const usd = estimateOpenAiCostUsd(pricedAs, usage);
  // Sem preço não há acerto honesto: a reserva fica como custo incerto.
  if (usd === null) {
    const uncertain = update(state, id, { state: "unknown", usage });
    return ok(uncertain, uncertain.attempts[id]);
  }
  const known = toMicros(usd);
  let next = update(state, id, { state: "settled", knownMicros: known, usage });
  if (known > a.reservedMicros) {
    next = { ...next, overrun: { micros: next.overrun.micros + (known - a.reservedMicros), attemptIds: [...next.overrun.attemptIds, id] } };
  }
  return ok(next, next.attempts[id]);
}

/** Operação de ferramenta e página lida também têm teto: loop barato também é loop. */
export function recordToolOp(state: LedgerState, pages = 0, now = state.snapshot.startedAt): Result<{ toolOps: number; pages: number }> {
  const s = state.snapshot;
  if (now - s.startedAt > s.maxWallMs) return err(state, "time_limit");
  if (state.toolOps + 1 > s.maxToolOps) return err(state, "tool_op_limit");
  if (state.pages + pages > s.maxPages) return err(state, "page_limit");
  const next = { ...state, toolOps: state.toolOps + 1, pages: state.pages + pages };
  return ok(next, { toolOps: next.toolOps, pages: next.pages });
}

export function ledgerReport(state: LedgerState) {
  const exp = exposure(state);
  const byPurpose: Record<string, { attempts: number; knownMicros: Micros; uncertainMicros: Micros }> = {};
  for (const a of Object.values(state.attempts)) {
    const row = byPurpose[a.purpose] ?? { attempts: 0, knownMicros: 0, uncertainMicros: 0 };
    row.attempts++;
    if (a.state === "settled") row.knownMicros += a.knownMicros ?? 0;
    if (a.state === "unknown") row.uncertainMicros += a.reservedMicros;
    byPurpose[a.purpose] = row;
  }
  return {
    runId: state.snapshot.runId, limitMicros: state.snapshot.limitMicros, ...exp,
    retries: Object.values(state.attempts).filter(a => a.retryOf).length,
    unknownAttempts: Object.values(state.attempts).filter(a => a.state === "unknown").map(a => a.attemptId),
    overrun: state.overrun, toolOps: state.toolOps, pages: state.pages, byPurpose,
    caveat: "Estimativa pela tabela de lib/ai-precos.ts; não é a fatura do provedor.",
  };
}

// ---------------------------------------------------------------- ator e teto mensal

export type Actor = { userId: string | null; email: string | null };
export type UsageOwner = { userId: string | null; userEmail: string | null };

/**
 * Atribuição canônica: `userId` quando existe; e-mail (minúsculo) para os
 * registros legados gravados só por e-mail. Um evento conta para o ator se casar
 * por QUALQUER das duas chaves — uma vez só, mesmo tendo as duas.
 */
export function ownsUsage(actor: Actor, owner: UsageOwner): boolean {
  if (actor.userId && owner.userId && actor.userId === owner.userId) return true;
  const email = actor.email?.trim().toLowerCase();
  return !!email && owner.userEmail?.trim().toLowerCase() === email;
}

/**
 * Teto mensal com reservas: o gasto já registrado + as exposições ATIVAS de
 * outras execuções do mesmo ator + esta reserva precisam caber. Sem isto, duas
 * auditorias simultâneas no último saldo passariam as duas.
 */
export function monthlyAllows(args: {
  limitMicros: Micros | null;
  recordedMicros: Micros;
  otherRunsExposureMicros: Micros;
  thisRunExposureMicros: Micros;
  reservationMicros: Micros;
}): boolean {
  if (args.limitMicros === null) return true;
  return args.recordedMicros + args.otherRunsExposureMicros + args.thisRunExposureMicros + args.reservationMicros <= args.limitMicros;
}
