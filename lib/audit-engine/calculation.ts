/**
 * Cálculo limitado: parser próprio (sem `eval`, sem `Function`), quatro
 * operações, parênteses e menos unário. Cada identificador precisa estar ligado
 * a um operando com fonte (referência/fato) ou hipótese declarada. Unidades são
 * verificadas por análise dimensional; somar m² com W é erro, não número.
 *
 * Uma conta certa não prova a aplicabilidade da fórmula, a população adotada,
 * um fator implícito ou erro de projeto. `explainDivergence` existe para isso:
 * quando o declarado difere do produto por um fator limpo, a próxima pergunta
 * é "onde esse fator está definido?", não "o projeto errou".
 */
import type { CalculationRecord, Fact } from "./contracts.ts";

// ---------------------------------------------------------------- unidades

type Dims = Record<string, number>;
type UnitDef = { dims: Dims; factor: number };

/**
 * Unidades suportadas, em termos de bases (m, W, V, mca, pessoa, s). Os nomes
 * canônicos são os mesmos de `facts.ts`; o teste garante que as duas tabelas não
 * divirjam.
 */
export const CALC_UNITS: Record<string, UnitDef> = {
  "m": { dims: { m: 1 }, factor: 1 },
  "cm": { dims: { m: 1 }, factor: 0.01 },
  "mm": { dims: { m: 1 }, factor: 0.001 },
  "m²": { dims: { m: 2 }, factor: 1 },
  "m³": { dims: { m: 3 }, factor: 1 },
  "L": { dims: { m: 3 }, factor: 0.001 },
  "L/s": { dims: { m: 3, s: -1 }, factor: 0.001 },
  "L/pessoa": { dims: { m: 3, pessoa: -1 }, factor: 0.001 },
  "W": { dims: { W: 1 }, factor: 1 },
  "kW": { dims: { W: 1 }, factor: 1000 },
  "W/m²": { dims: { W: 1, m: -2 }, factor: 1 },
  "V": { dims: { V: 1 }, factor: 1 },
  "mca": { dims: { mca: 1 }, factor: 1 },
  "pessoas": { dims: { pessoa: 1 }, factor: 1 },
};

const clean = (d: Dims): Dims => Object.fromEntries(Object.entries(d).filter(([, e]) => e !== 0).sort(([a], [b]) => a.localeCompare(b)));
const combine = (a: Dims, b: Dims, sign: 1 | -1): Dims => {
  const out: Dims = { ...a };
  for (const [k, e] of Object.entries(b)) out[k] = (out[k] ?? 0) + sign * e;
  return clean(out);
};
const sameDims = (a: Dims, b: Dims) => JSON.stringify(clean(a)) === JSON.stringify(clean(b));

function unitDef(unit: string | null): UnitDef | null {
  if (unit === null || unit === "") return { dims: {}, factor: 1 };
  return CALC_UNITS[unit] ?? null;
}

// ---------------------------------------------------------------- parser

export const CALC_LIMITS = { maxChars: 200, maxTokens: 64, maxDepth: 12, maxOperands: 16, maxMagnitude: 1e15 };

type Token = { t: "num"; v: number } | { t: "id"; v: string } | { t: "op"; v: "+" | "-" | "*" | "/" | "(" | ")" };
export type Node =
  | { k: "num"; v: number }
  | { k: "id"; name: string }
  | { k: "neg"; x: Node }
  | { k: "bin"; op: "+" | "-" | "*" | "/"; a: Node; b: Node };

export type CalcError =
  | "too_complex" | "parse_error" | "unbound_identifier" | "missing_source" | "invalid_operand"
  | "unknown_unit" | "incompatible_units" | "division_by_zero" | "non_finite" | "magnitude"
  | "result_unit_mismatch";

class CalcFailure extends Error {
  readonly code: CalcError;
  constructor(code: CalcError) { super(code); this.code = code; }
}

function tokenize(src: string): Token[] {
  if (src.length > CALC_LIMITS.maxChars) throw new CalcFailure("too_complex");
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if ("+-*/()".includes(c)) { out.push({ t: "op", v: c as "+" }); i++; continue; }
    const num = /^\d+(?:\.\d+)?/.exec(src.slice(i));
    if (num) { out.push({ t: "num", v: Number(num[0]) }); i += num[0].length; continue; }
    const id = /^[A-Za-z_][A-Za-z0-9_]{0,31}/.exec(src.slice(i));
    if (id) { out.push({ t: "id", v: id[0] }); i += id[0].length; continue; }
    throw new CalcFailure("parse_error");
  }
  if (out.length > CALC_LIMITS.maxTokens) throw new CalcFailure("too_complex");
  return out;
}

/** Descida recursiva: expr := term (('+'|'-') term)*; term := unary (('*'|'/') unary)*. */
export function parseExpression(src: string): Node {
  const tokens = tokenize(src);
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (v: string) => peek()?.t === "op" && peek()!.v === v;
  const expr = (depth: number): Node => {
    if (depth > CALC_LIMITS.maxDepth) throw new CalcFailure("too_complex");
    let node = term(depth);
    while (isOp("+") || isOp("-")) { const op = tokens[pos++].v as "+" | "-"; node = { k: "bin", op, a: node, b: term(depth) }; }
    return node;
  };
  const term = (depth: number): Node => {
    let node = unary(depth);
    while (isOp("*") || isOp("/")) { const op = tokens[pos++].v as "*" | "/"; node = { k: "bin", op, a: node, b: unary(depth) }; }
    return node;
  };
  const unary = (depth: number): Node => {
    if (isOp("-")) { pos++; return { k: "neg", x: unary(depth + 1) }; }
    const tok = tokens[pos++];
    if (!tok) throw new CalcFailure("parse_error");
    if (tok.t === "num") return { k: "num", v: tok.v };
    if (tok.t === "id") return { k: "id", name: tok.v };
    if (tok.v === "(") {
      const inner = expr(depth + 1);
      if (!isOp(")")) throw new CalcFailure("parse_error");
      pos++;
      return inner;
    }
    throw new CalcFailure("parse_error");
  };
  const tree = expr(0);
  if (pos !== tokens.length) throw new CalcFailure("parse_error");
  return tree;
}

// ---------------------------------------------------------------- avaliação

export type Operand = CalculationRecord["operands"][number];
export type Tolerance = { relative: number; absolute: number };
export const DEFAULT_TOLERANCE: Tolerance = { relative: 0.005, absolute: 1e-9 };

export type CalcOutcome =
  | { ok: true; value: number; unit: string | null; record: CalculationRecord }
  | { ok: false; error: CalcError };

type Q = { v: number; dims: Dims };

/**
 * Avalia em unidades de base e devolve o resultado na unidade pedida.
 * `rounding` é só apresentação: `value` guarda a precisão da conta, e o
 * registro diz qual arredondamento seria aplicado ao exibir.
 */
export function evaluate(
  expression: string,
  operands: Operand[],
  resultUnit: string | null,
  rounding = "exibir com 4 algarismos significativos",
): CalcOutcome {
  try {
    if (operands.length > CALC_LIMITS.maxOperands) throw new CalcFailure("too_complex");
    const bound = new Map<string, Q>();
    for (const op of operands) {
      if (!/^[A-Za-z_][A-Za-z0-9_]{0,31}$/.test(op.name) || bound.has(op.name)) throw new CalcFailure("invalid_operand");
      if (typeof op.value !== "number" || !Number.isFinite(op.value)) throw new CalcFailure("non_finite");
      if (Math.abs(op.value) > CALC_LIMITS.maxMagnitude) throw new CalcFailure("magnitude");
      const src = op.source;
      const sourced = (src.kind === "ref" && Number.isSafeInteger(src.refIndex) && src.refIndex >= 0) ||
        (src.kind === "fact" && typeof src.factId === "string" && src.factId.length > 0) ||
        (src.kind === "hypothesis" && typeof src.note === "string" && src.note.trim().length > 0);
      if (!sourced) throw new CalcFailure("missing_source");
      const def = unitDef(op.unit);
      if (!def) throw new CalcFailure("unknown_unit");
      bound.set(op.name, { v: op.value * def.factor, dims: clean(def.dims) });
    }
    const target = unitDef(resultUnit);
    if (!target) throw new CalcFailure("unknown_unit");

    const run = (n: Node): Q => {
      let out: Q;
      if (n.k === "num") out = { v: n.v, dims: {} };
      else if (n.k === "id") {
        const q = bound.get(n.name);
        if (!q) throw new CalcFailure("unbound_identifier");
        out = q;
      } else if (n.k === "neg") { const x = run(n.x); out = { v: -x.v, dims: x.dims }; }
      else {
        const a = run(n.a);
        const b = run(n.b);
        if (n.op === "+" || n.op === "-") {
          if (!sameDims(a.dims, b.dims)) throw new CalcFailure("incompatible_units");
          out = { v: n.op === "+" ? a.v + b.v : a.v - b.v, dims: a.dims };
        } else if (n.op === "*") out = { v: a.v * b.v, dims: combine(a.dims, b.dims, 1) };
        else {
          if (b.v === 0) throw new CalcFailure("division_by_zero");
          out = { v: a.v / b.v, dims: combine(a.dims, b.dims, -1) };
        }
      }
      if (!Number.isFinite(out.v)) throw new CalcFailure("non_finite");
      if (Math.abs(out.v) > CALC_LIMITS.maxMagnitude) throw new CalcFailure("magnitude");
      return out;
    };
    const result = run(parseExpression(expression));
    if (!sameDims(result.dims, target.dims)) throw new CalcFailure("result_unit_mismatch");
    const value = result.v / target.factor;
    return {
      ok: true, value, unit: resultUnit,
      record: { expression, operands: operands.map(o => ({ ...o })), result: value, unit: resultUnit, rounding },
    };
  } catch (e) {
    if (e instanceof CalcFailure) return { ok: false, error: e.code };
    throw e;
  }
}

/** Operando a partir de um fato: valor e unidade vêm do documento, não do modelo. */
export function operandFromFact(name: string, fact: Fact): Operand | null {
  if (typeof fact.normalized !== "number" || !Number.isFinite(fact.normalized)) return null;
  return { name, value: fact.normalized, unit: fact.unit, source: { kind: "fact", factId: fact.id } };
}

export type Comparison = "matches" | "differs";

export function compareValues(declared: number, computed: number, tol: Tolerance = DEFAULT_TOLERANCE): Comparison {
  const diff = Math.abs(declared - computed);
  return diff <= tol.absolute || diff <= tol.relative * Math.max(Math.abs(declared), Math.abs(computed)) ? "matches" : "differs";
}

/**
 * O que a divergência PODE significar, sem concluir. Razão "limpa" (1,25; 0,8;
 * 1,1...) sugere fator implícito; se um fato de fator declarado explica a razão,
 * ele é devolvido. Nenhum resultado aqui é prova de erro.
 */
export function explainDivergence(
  declared: number,
  computed: number,
  factorFacts: Fact[] = [],
  tol: Tolerance = DEFAULT_TOLERANCE,
): { comparison: Comparison; ratio: number | null; cleanRatio: boolean; explainedBy: string[]; nextQuestion: string } {
  const comparison = compareValues(declared, computed, tol);
  const ratio = computed !== 0 ? declared / computed : null;
  if (comparison === "matches" || ratio === null) {
    return { comparison, ratio, cleanRatio: false, explainedBy: [], nextQuestion: comparison === "matches" ? "Verificar se a fórmula e as premissas se aplicam." : "Produto nulo: revisar premissas." };
  }
  const hundredths = Math.round(ratio * 100);
  const cleanRatio = Math.abs(ratio * 100 - hundredths) < 1e-6 && hundredths > 0 && hundredths <= 1000;
  const explainedBy = factorFacts
    .filter(f => typeof f.normalized === "number" && compareValues(ratio, f.normalized, tol) === "matches")
    .map(f => f.id);
  const nextQuestion = explainedBy.length
    ? "Um fator declarado reproduz a diferença: verificar se ele se aplica a este caso."
    : cleanRatio
      ? `A diferença equivale a um fator ${String(ratio).replace(".", ",")}: procurar a definição desse fator antes de concluir erro.`
      : "Diferença sem fator evidente: verificar premissas, unidades e parcelas adicionais.";
  return { comparison, ratio, cleanRatio, explainedBy, nextQuestion };
}
