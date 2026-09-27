/**
 * Fatos com proveniência, extraídos deterministicamente do texto canônico.
 *
 * Não é inventário de palavras: só as famílias que o Audit já trata —
 * identidade (via as mesmas regras de `lib/cross-document-audit.ts`),
 * quantidades com unidade conhecida, células de tabela com cabeçalho e unidade,
 * remissões e exceções. Cada fato guarda o literal, a referência exata e o
 * escopo que foi possível ler; o que não foi lido fica AUSENTE, nunca adivinhado.
 *
 * Nada aqui escolhe "o valor do projeto". Isso é trabalho de relação e de
 * decisão, com conflito aberto quando não há precedência declarada.
 */
import { collectIdentityMentionSpans } from "../cross-document-audit.ts";
import type { ExtractedPdf } from "../pdf-text.ts";
import { stableHash, type EvidenceRef, type Fact, type RevisionText } from "./contracts.ts";
import { refAt } from "./evidence.ts";

// ---------------------------------------------------------------- números e unidades

export type Dimension =
  | "area" | "volume" | "flow" | "power" | "voltage" | "length" | "power_density"
  | "pressure_head" | "count" | "volume_per_person";

type UnitInfo = { canonical: string; dimension: Dimension; toBase: number };

/**
 * Só unidades cuja leitura é inequívoca no contexto. "A" (ampère) ficou de fora
 * de propósito: em português é artigo. Unidade fora da lista não vira fato
 * quantitativo — fica desconhecida, não é convertida.
 */
const UNITS: Array<[RegExp, UnitInfo]> = [
  [/^(?:w\/m²|w\/m2)/i, { canonical: "W/m²", dimension: "power_density", toBase: 1 }],
  [/^(?:l\/s)/i, { canonical: "L/s", dimension: "flow", toBase: 0.001 }],
  [/^(?:l\s*(?:\/|por)\s*(?:pessoa|usu[aá]rio|habitante))/i, { canonical: "L/pessoa", dimension: "volume_per_person", toBase: 0.001 }],
  [/^(?:m²|m2)(?![\p{L}\d])/iu, { canonical: "m²", dimension: "area", toBase: 1 }],
  [/^(?:m³|m3)(?![\p{L}\d])/iu, { canonical: "m³", dimension: "volume", toBase: 1 }],
  [/^kw(?![\p{L}\d])/iu, { canonical: "kW", dimension: "power", toBase: 1000 }],
  [/^w(?![\p{L}\d/])/iu, { canonical: "W", dimension: "power", toBase: 1 }],
  [/^V(?![\p{L}\d])/u, { canonical: "V", dimension: "voltage", toBase: 1 }],
  [/^mca(?![\p{L}\d])/iu, { canonical: "mca", dimension: "pressure_head", toBase: 1 }],
  [/^mm(?![\p{L}\d])/iu, { canonical: "mm", dimension: "length", toBase: 0.001 }],
  [/^cm(?![\p{L}\d])/iu, { canonical: "cm", dimension: "length", toBase: 0.01 }],
  [/^m(?![\p{L}\d²³])/u, { canonical: "m", dimension: "length", toBase: 1 }],
  [/^l(?![\p{L}\d/])/iu, { canonical: "L", dimension: "volume", toBase: 0.001 }],
  [/^(?:pessoas|usu[aá]rios|habitantes)(?![\p{L}])/iu, { canonical: "pessoas", dimension: "count", toBase: 1 }],
];

export function unitInfo(canonical: string): UnitInfo | null {
  return UNITS.map(([, u]) => u).find(u => u.canonical === canonical) ?? null;
}

/** Converte só entre unidades da tabela e de mesma dimensão. */
export function convert(value: number, from: string, to: string): number | null {
  const a = unitInfo(from);
  const b = unitInfo(to);
  if (!a || !b || a.dimension !== b.dimension) return null;
  return (value * a.toBase) / b.toBase;
}

/**
 * pt-BR primeiro: vírgula é decimal, ponto é milhar. Ponto sozinho seguido de
 * três dígitos ("1.800") é LIDO como milhar e ANOTADO — em memorial brasileiro
 * quase sempre é, mas não sempre. Ponto com outra contagem de dígitos
 * ("14.38") é lido como decimal, também anotado.
 */
export function parseNumber(literal: string): { value: number; note: string | null } | null {
  const s = literal.replace(/−/g, "-").trim();
  let value: number;
  let note: string | null = null;
  if (/^-?\d{1,3}(?:\.\d{3})*,\d+$/.test(s) || /^-?\d+,\d+$/.test(s)) value = Number(s.replace(/\./g, "").replace(",", "."));
  else if (/^-?\d{1,3}(?:\.\d{3})+$/.test(s)) { value = Number(s.replace(/\./g, "")); note = "ponto lido como separador de milhar (pt-BR)"; }
  else if (/^-?\d+\.\d+$/.test(s)) { value = Number(s); note = "ponto lido como separador decimal"; }
  else if (/^-?\d+$/.test(s)) value = Number(s);
  else return null;
  return Number.isFinite(value) ? { value, note } : null;
}

// ---------------------------------------------------------------- escopo

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

const LOCATION = /\b(sanit[aá]rio|sala|bloco|pavimento|ambiente|reservat[oó]rio|ramal|circuito|quadro|torre)\s+((?:t[eé]cnica|superior|inferior|norte|sul|leste|oeste|t[eé]rreo|[A-Z0-9][\w-]*)(?:\s+(?:t[eé]cnica|superior|inferior))?)/u;
const LOCATION_I = new RegExp(LOCATION.source, "iu");
const AGGREGATE = /\b(?:total|do pr[eé]dio|da edifica[cç][aã]o|geral|de todo o)\b/iu;
const SYSTEM = /\bsistema\s+de\s+([\p{L} ]{3,40}?)(?=\s*[:.,;\n]|$)/giu;
const EXAMPLE = /\b(?:exemplo|modelo de preenchimento|ex\.:|hipot[eé]tic[oa]|ilustrativ[oa])/iu;
const EXCEPTION_WORDS = /\b(?:excet|salvo|ressalvad|exceto)/iu;

type Clause = { start: number; end: number; text: string };

/** "Art. 2º", "Fig. 3", "nº. 12": ponto de abreviação não encerra oração. */
const ABBREVIATION = /(?:^|[^\p{L}])(?:art|arts|fig|ex|cf|n|nº|item|tab|p|pág|pag|obs|eng|sr|sra|prof)$/iu;
const sentenceDot = (text: string, i: number) =>
  text[i] === "." && /\s/.test(text[i + 1] ?? "") && !ABBREVIATION.test(text.slice(Math.max(0, i - 6), i));

/** Oração em volta de uma posição: corta em quebra de linha, `;`, `|` ou ponto seguido de espaço. */
function clauseAround(text: string, at: number, endAt = at): Clause {
  let start = 0;
  for (let i = at - 1; i >= 0; i--) {
    const c = text[i];
    if (c === "\n" || c === ";" || c === "|" || sentenceDot(text, i)) { start = i + 1; break; }
  }
  let end = text.length;
  for (let i = endAt; i < text.length; i++) {
    const c = text[i];
    if (c === "\n" || c === ";" || c === "|" || sentenceDot(text, i) || (c === "." && i + 1 === text.length)) { end = i; break; }
  }
  return { start, end, text: text.slice(start, end) };
}

/** Sistema em vigor: a última menção "Sistema de X" antes da posição, na mesma página. */
function systemAt(text: string, at: number): string | null {
  let found: string | null = null;
  SYSTEM.lastIndex = 0;
  for (const m of text.matchAll(SYSTEM)) {
    if ((m.index ?? 0) > at) break;
    found = strip(m[1]);
  }
  return found;
}

/** Rótulo no início da oração: "Art. 2º", "Item 3.2". Vira `scope.clause` ("art 2"). */
const CLAUSE_LABEL = /^\s*((?:art\.?|artigo|item)\s*\d+[º°]?(?:\.\d+)*)[\s:.-]*/iu;

function scopeOf(pageText: string, clause: Clause, at: number): Record<string, string> {
  const scope: Record<string, string> = {};
  const label = clause.text.match(CLAUSE_LABEL);
  if (label) scope.clause = targetKey(label[1]);
  const loc = clause.text.match(LOCATION_I);
  if (loc) scope.location = strip(`${loc[1]} ${loc[2]}`);
  if (AGGREGATE.test(clause.text)) scope.aggregate = "total";
  const system = systemAt(pageText, at);
  if (system) scope.system = system;
  return scope;
}

function conditionsOf(clause: Clause): string[] {
  const out: string[] = [];
  if (EXAMPLE.test(clause.text)) out.push("citado como exemplo");
  if (EXCEPTION_WORDS.test(clause.text)) out.push("oração contém exceção");
  return out;
}

const FILLER = /\b(?:adotad[oa]s?|declarad[oa]s?|previst[oa]s?|de projeto|m[aá]xim[oa]|m[ií]nim[oa])\b/giu;

const ASSIGNING_VERB = /\b(?:ter[aã]o|ter[aá]|ser[aã]o|ser[aá]|possui|possuem|possuir[aã]o|dever[aã]o\s+ter|dever[aá]\s+ter|poder[aã]o\s+ter|poder[aá]\s+ter)(?![\p{L}])/giu;
const ARTICLES = /^(?:tod[oa]s\s+)?(?:[oa]s?|um|uma)\s+/iu;

/**
 * Atributo: o sintagma antes do número, sem o local e sem conectivos de borda.
 * Com verbo de atribuição ("as tubulações de esgoto terão diâmetro"), o que
 * vem antes é o SUJEITO — vai para o escopo, não para o atributo.
 */
function attributeOf(before: string, scope: Record<string, string>): string {
  let s = before;
  let verbEnd = -1;
  let verbAt = -1;
  ASSIGNING_VERB.lastIndex = 0;
  for (const m of before.matchAll(ASSIGNING_VERB)) { verbAt = m.index ?? 0; verbEnd = verbAt + m[0].length; }
  if (verbAt >= 0) {
    const subjectParts = before.slice(0, verbAt).split(/[:,]/u).map(x => x.trim()).filter(x => x && !/^que(?![\p{L}])/iu.test(x));
    const subject = strip((subjectParts.at(-1) ?? "")
      .replace(CLAUSE_LABEL, "")
      .replace(/^excetua(?:m)?-se\s+d[oa]s?\s+(?:art\.?|artigo|item)\s*[\wº°]+(?:\.\w+)*\s*/iu, "")
      .replace(ARTICLES, ""));
    if (subject) scope.subject = subject;
    s = before.slice(verbEnd);
  }
  s = s.split(/[:,]|\bcom\b|=/u).map(x => x.trim()).filter(Boolean).at(-1) ?? "";
  const loc = s.match(LOCATION_I);
  if (loc) s = s.replace(loc[0], " ");
  s = s.replace(new RegExp(AGGREGATE.source, "giu"), " ").trim().replace(ARTICLES, "");
  s = s.replace(FILLER, " ").replace(/\s+/g, " ").trim();
  s = s.replace(/(?:\s+|^)(?:d[eoa]s?|em|n[oa]s?|para|por|total)$/iu, "").trim();
  return strip(s);
}

const factId = (revisionId: string, page: number, start: number, end: number, attribute: string) =>
  `fact-${stableHash([revisionId, page, start, end, attribute]).slice(0, 16)}`;

// ---------------------------------------------------------------- extratores

const NUMBER = /(?<![\d.,\p{L}])[-−]?(?:\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+,\d+|\d+\.\d+|\d+)(?![\d])/gu;

export function quantityFacts(rt: RevisionText): Fact[] {
  const facts: Fact[] = [];
  rt.pages.forEach((pageText, i) => {
    const page = i + 1;
    const prose = pageText.split("[TABELA]")[0];
    NUMBER.lastIndex = 0;
    for (const m of prose.matchAll(NUMBER)) {
      const numStart = m.index ?? 0;
      const numEnd = numStart + m[0].length;
      const rest = prose.slice(numEnd).replace(/^\s?/, "");
      const gap = prose.slice(numEnd).length - rest.length;
      const unitHit = UNITS.find(([re]) => re.test(rest));
      if (!unitHit) continue;
      const unitLen = rest.match(unitHit[0])![0].length;
      const parsed = parseNumber(m[0]);
      if (!parsed) continue;
      const end = numEnd + gap + unitLen;
      const clause = clauseAround(prose, numStart, end);
      const before = prose.slice(clause.start, numStart);
      const scope = scopeOf(pageText, clause, numStart);
      const attribute = attributeOf(before, scope);
      const conditions = conditionsOf(clause);
      // Atributo implícito ("poderão ter 50 mm") fica vazio e declarado, não é adivinhado.
      if (!attribute) conditions.push("atributo não identificado");
      const refStart = clause.start + (before.length - before.trimStart().length);
      facts.push({
        id: factId(rt.revision.revisionId, page, refStart, end, attribute),
        entity: scope.location ?? scope.system ?? "",
        attribute,
        literal: prose.slice(numStart, end),
        normalized: parsed.value,
        normalizationNote: parsed.note,
        unit: unitHit[1].canonical,
        scope,
        conditions,
        revisionId: rt.revision.revisionId,
        basis: "explicit",
        refs: [refAt(rt, page, refStart, end)],
      });
    }
  });
  return facts;
}

export type TableWarning = { revisionId: string; page: number; tableIndex: number; row: number; reason: "cell_count_mismatch" | "no_header" };

/**
 * Tabelas na grade de `textoDaPaginaParaIA` (`[TABELA]` … `[/TABELA]`). Célula
 * só vira fato quando a linha tem exatamente as colunas do cabeçalho e o
 * cabeçalho declara unidade conhecida; linha deslocada vira aviso, nunca fato
 * atribuído à coluna errada.
 */
export function tableFacts(rt: RevisionText): { facts: Fact[]; warnings: TableWarning[] } {
  const facts: Fact[] = [];
  const warnings: TableWarning[] = [];
  rt.pages.forEach((pageText, i) => {
    const page = i + 1;
    let tableIndex = 0;
    for (let open = pageText.indexOf("[TABELA]"); open >= 0; open = pageText.indexOf("[TABELA]", open + 1)) {
      const close = pageText.indexOf("[/TABELA]", open);
      if (close < 0) break;
      const bodyStart = open + "[TABELA]".length + 1;
      const lines: Array<{ start: number; text: string }> = [];
      let cursor = bodyStart;
      for (const line of pageText.slice(bodyStart, close).split("\n")) {
        if (line.trim()) lines.push({ start: cursor, text: line });
        cursor += line.length + 1;
      }
      const tableId = `${rt.revision.revisionId}:p${page}:t${tableIndex}`;
      if (lines.length < 2) { warnings.push({ revisionId: rt.revision.revisionId, page, tableIndex, row: 0, reason: "no_header" }); tableIndex++; continue; }
      const headers = lines[0].text.split(" | ").map(h => h.trim());
      lines.slice(1).forEach((line, r) => {
        const cells = line.text.split(" | ");
        if (cells.length !== headers.length) {
          warnings.push({ revisionId: rt.revision.revisionId, page, tableIndex, row: r + 1, reason: "cell_count_mismatch" });
          return;
        }
        let offset = line.start;
        const spans = cells.map(c => { const s = offset; offset += c.length + 3; return { s, e: s + c.length, c }; });
        const rowLabel = strip(cells[0]);
        spans.forEach(({ s, e, c }, col) => {
          if (col === 0) return;
          const unitMatch = headers[col].match(/\(([^)]+)\)\s*$/);
          const unit = unitMatch ? UNITS.find(([re]) => re.test(unitMatch[1]))?.[1] : undefined;
          const parsed = parseNumber(c.trim());
          if (!unit || !parsed) return;
          const lead = c.length - c.trimStart().length;
          const ref: EvidenceRef = { ...refAt(rt, page, s + lead, s + lead + c.trim().length), table: { tableId, row: r + 1, column: col, headers } };
          const attribute = strip(headers[col].replace(/\(([^)]+)\)\s*$/, ""));
          facts.push({
            id: factId(rt.revision.revisionId, page, ref.start, ref.end, attribute),
            entity: rowLabel, attribute, literal: ref.quote, normalized: parsed.value,
            normalizationNote: parsed.note, unit: unit.canonical,
            scope: { location: strip(`${headers[0]} ${cells[0]}`) }, conditions: [],
            revisionId: rt.revision.revisionId, basis: "explicit", refs: [ref],
          });
        });
      });
      tableIndex++;
      open = close;
    }
  });
  return { facts, warnings };
}

const TRAILING_STOP = /(?:\s+(?:em|de|do|da|dos|das|no|na|e|o|a))+$/u;

/**
 * Chave de comparação de identidade: sem acento, caixa, pontuação nem palavra
 * de ligação solta na borda ("Criciúma/SC" = "Criciúma - SC"; "Criciúma em" =
 * "CRICIÚMA"). O literal e a referência continuam exatos no fato.
 */
export function identityKey(value: string): string {
  return strip(value).replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim().replace(TRAILING_STOP, "").trim();
}

/**
 * Captura que claramente não é identidade: marcador de lista, medida, ou texto
 * curto demais num campo TEXTUAL (código e revisão são curtos por natureza: "R2").
 */
function doubtfulIdentity(literal: string, key: string): boolean {
  const t = literal.trim();
  const textual = !["codigo", "revisao"].includes(key);
  return /^[•·▪\-–*]/u.test(t) || /\d+(?:[.,]\d+)?\s*(?:m²|m2|m³|m3|cm|mm|kW|W|L)(?![\p{L}\d])/u.test(t) ||
    (textual && identityKey(t).length < 3);
}

/** Menções de identidade: cada uma é um fato. Nenhuma é "a" identidade do projeto. */
export function identityFacts(rt: RevisionText): Fact[] {
  const extracted = { pages: rt.pages.map((text, i) => ({ page: i + 1, text })), text: rt.pages.join("\n") } as ExtractedPdf;
  return collectIdentityMentionSpans({ fileName: rt.revision.displayName, fileType: rt.revision.declaredType ?? "outro", extracted })
    .map(span => {
      const text = rt.pages[span.page - 1];
      const clause = clauseAround(text, span.start, span.end);
      const attribute = `identidade.${span.key}`;
      return {
        id: factId(rt.revision.revisionId, span.page, span.start, span.end, attribute),
        entity: "projeto", attribute, literal: text.slice(span.start, span.end),
        normalized: identityKey(span.canonical), normalizationNote: null, unit: null, scope: {},
        conditions: [...conditionsOf(clause), ...(doubtfulIdentity(text.slice(span.start, span.end), span.key) ? ["captura duvidosa"] : [])],
        revisionId: rt.revision.revisionId, basis: "explicit" as const, refs: [refAt(rt, span.page, span.start, span.end)],
      };
    });
}

// O alvo precisa de número ou código ("item 7.3", "prancha 001", "art. 2º"):
// "ver detalhe em…" não é remissão verificável.
const REF_TARGET = String.raw`((?:item|art\.?|artigo|se[cç][aã]o|anexo|detalhe|prancha|tabela|nota)\s*(?=[\wº°.-]*\d)[\wº°]+(?:[.-]\w+)*)`;
const CROSS_REF = new RegExp(String.raw`\b(?:ver|conforme|vide|cf\.|segundo|consultar)\s+(?:o\s+|a\s+)?` + REF_TARGET, "giu");
const EXCEPTION_REF = new RegExp(String.raw`\bexcetua(?:m)?-se\s+d[oa]s?\s+` + REF_TARGET, "giu");

/** Chave de alvo comparável: "Art. 2º" e "artigo 2" viram "art 2". */
export function targetKey(label: string): string {
  return strip(label).replace(/^artigo\b/, "art").replace(/^secao\b/, "secao").replace(/[º°.]/g, " ").replace(/\s+/g, " ").trim();
}

export function referenceFacts(rt: RevisionText): Fact[] {
  const facts: Fact[] = [];
  rt.pages.forEach((text, i) => {
    const page = i + 1;
    for (const [re, attribute] of [[CROSS_REF, "remissao"], [EXCEPTION_REF, "excecao_a"]] as const) {
      re.lastIndex = 0;
      for (const m of text.matchAll(re)) {
        const start = m.index ?? 0;
        const end = start + m[0].length;
        const clause = clauseAround(text, start, end);
        facts.push({
          id: factId(rt.revision.revisionId, page, start, end, attribute),
          entity: "", attribute, literal: m[1], normalized: targetKey(m[1]), normalizationNote: null, unit: null,
          scope: scopeOf(text, clause, start), conditions: conditionsOf(clause),
          revisionId: rt.revision.revisionId, basis: "explicit", refs: [refAt(rt, page, start, end)],
        });
      }
    }
  });
  return facts;
}

const FACTOR = /\b(fator|coeficiente)\s+(?:de\s+)?([\p{L} ]{0,40}?)\s*(?:de|=|:|igual a)?\s*(\d+(?:,\d+)?|\d+\.\d+)(?![\d,.]\d)/giu;

/**
 * Fatores declarados ("fator de simultaneidade de 0,8", "coeficiente de
 * reserva = 1,25"). Adimensionais: não entram em comparação de atributos, mas
 * são o primeiro lugar onde procurar quando uma conta "não fecha".
 */
export function factorFacts(rt: RevisionText): Fact[] {
  const facts: Fact[] = [];
  rt.pages.forEach((text, i) => {
    const page = i + 1;
    FACTOR.lastIndex = 0;
    for (const m of text.matchAll(FACTOR)) {
      const parsed = parseNumber(m[3]);
      if (!parsed) continue;
      const start = m.index ?? 0;
      const end = start + m[0].length;
      const clause = clauseAround(text, start, end);
      const attribute = strip(`${m[1]} ${m[2]}`.replace(/\s+de$/iu, ""));
      facts.push({
        id: factId(rt.revision.revisionId, page, start, end, attribute),
        entity: "", attribute: attribute.replace(/^coeficiente/, "fator"), literal: m[3], normalized: parsed.value,
        normalizationNote: parsed.note, unit: null, scope: scopeOf(text, clause, start), conditions: conditionsOf(clause),
        revisionId: rt.revision.revisionId, basis: "explicit", refs: [refAt(rt, page, start, end)],
      });
    }
  });
  return facts;
}

const LABEL_AT_START = /(?:^|\n|[.;]\s+)\s*((?:art\.?|artigo|item)\s*\d+[º°]?(?:\.\d+)*)(?=[\s:.-])/giu;

/**
 * Rótulos de cláusula ("Art. 2º", "Item 7.3") no início de linha ou de oração.
 * São o alvo de remissões e exceções: sem eles, uma remissão a uma seção que só
 * tem texto (sem número com unidade) pareceria sem alvo.
 */
export function labelFacts(rt: RevisionText): Fact[] {
  const facts: Fact[] = [];
  rt.pages.forEach((text, i) => {
    const page = i + 1;
    LABEL_AT_START.lastIndex = 0;
    for (const m of text.matchAll(LABEL_AT_START)) {
      const start = (m.index ?? 0) + m[0].indexOf(m[1]);
      const end = start + m[1].length;
      const key = targetKey(m[1]);
      facts.push({
        id: factId(rt.revision.revisionId, page, start, end, "rotulo"), entity: "", attribute: "rotulo", literal: m[1],
        normalized: key, normalizationNote: null, unit: null, scope: { clause: key }, conditions: [],
        revisionId: rt.revision.revisionId, basis: "explicit", refs: [refAt(rt, page, start, end)],
      });
    }
  });
  return facts;
}

export function extractFacts(rt: RevisionText): { facts: Fact[]; warnings: TableWarning[] } {
  const table = tableFacts(rt);
  return {
    facts: [...identityFacts(rt), ...quantityFacts(rt), ...table.facts, ...referenceFacts(rt), ...factorFacts(rt), ...labelFacts(rt)],
    warnings: table.warnings,
  };
}
