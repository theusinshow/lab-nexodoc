/**
 * Descoberta de candidatos a partir do contexto do projeto, somada às suspeitas
 * das passadas de leitura. Candidato é suspeita verificável com premissas
 * explícitas — não achado.
 *
 * Nada aqui recebe gabarito, IDs de caso ou lista de "problemas conhecidos": a
 * entrada é só o corpus autorizado (via fatos e relações) e o que as passadas
 * suspeitaram. Limite de candidatos produz aviso de saturação com os escopos
 * pendentes, nunca silêncio; revisão sem suspeita continua listada.
 */
import { stableHash, type Candidate, type CandidateOrigin, type EvidenceRef, type Fact, type Premise } from "./contracts.ts";
import { confirmationBlockers, expectedProduct, type ProjectContext, type Relation } from "./relations.ts";

export type DiscoveryOptions = { maxCandidates: number; relativeTolerance: number };
export const DEFAULT_DISCOVERY: DiscoveryOptions = { maxCandidates: 40, relativeTolerance: 0.005 };

export type DiscoveryResult = {
  candidates: Candidate[];
  /** Candidatos equivalentes consolidados: a linhagem fica, a duplicata sai. */
  merges: Array<{ kept: string; absorbed: string[] }>;
  saturated: boolean;
  /** O que não virou candidato por teto: relações e revisões ainda por examinar. */
  pending: { relationIds: string[]; readingCandidateIds: string[] };
  /** Por revisão, inclusive as que não geraram nenhuma suspeita. */
  byRevision: Array<{ revisionId: string; facts: number; candidates: number }>;
};

const candId = (parts: unknown[]) => `cand-${stableHash(parts).slice(0, 16)}`;
const factsById = (ctx: ProjectContext) => new Map(ctx.facts.map(f => [f.id, f]));
const describeScope = (f: Fact) => {
  const parts = Object.entries(f.scope).filter(([k]) => k !== "clause").map(([k, v]) => `${k}=${v}`);
  return parts.length ? parts.join(", ") : "escopo não identificado";
};
const premise = (id: string, statement: string): Premise => ({ id, statement });

/** Onde procurar o que derrubaria a suspeita. Sempre os dois lados. */
const COMPARISON_COUNTER = [
  "exceção ou ressalva aplicável a qualquer dos lados",
  "revisão que substitua uma das fontes",
  "escopo diferente (ambiente, sistema, fase, total × parcela)",
  "precedência documental declarada",
];

function fromRelation(r: Relation, ctx: ProjectContext, opts: DiscoveryOptions): Candidate | null {
  const facts = factsById(ctx);
  const origin: CandidateOrigin = { kind: "relation", relationId: r.id };
  const blockers = confirmationBlockers(r, ctx);

  if (r.kind === "same_attribute") {
    if (r.values === "equal" || blockers.includes("superseded_revision") || blockers.includes("example_context")) return null;
    // Escopo só de um lado, no MESMO documento: sinal fraco demais para gastar investigação
    // (no 117: "espessura" sem escopo × "espessura das juntas"). Entre documentos, segue.
    if (r.entityMatch === "ambiguous" && r.revisionLink === "same_revision") return null;
    const [a, b] = r.factIds.map(id => facts.get(id)!);
    const premises = [
      premise("p1", `A fonte 1 declara ${a.attribute} = ${a.literal} (${describeScope(a)}).`),
      premise("p2", `A fonte 2 declara ${b.attribute} = ${b.literal} (${describeScope(b)}).`),
      premise("p3", "As duas declarações tratam da mesma entidade, no mesmo escopo e condição."),
    ];
    if (r.revisionLink === "undeclared_revisions") premises.push(premise("p4", "Nenhuma das duas revisões substitui a outra."));
    return {
      id: candId(["same", r.id]), kind: "comparison", proposition: `Valores divergentes para "${a.attribute}": ${a.literal} × ${b.literal}.`,
      origin, factIds: [a.id, b.id], refs: [...a.refs, ...b.refs], premises,
      claimScope: `${describeScope(a)} | ${describeScope(b)}`, counterEvidenceToSeek: COMPARISON_COUNTER,
    };
  }
  if (r.kind === "identity_mentions") {
    const group = r.factIds.map(id => facts.get(id)!).filter(f => !f.conditions.includes("citado como exemplo"));
    const values = [...new Set(group.map(f => String(f.normalized)))];
    if (values.length < 2) return null;
    // Representante = a grafia mais repetida do valor (empate: a mais curta). A primeira
    // ocorrência pode ser captura suja ("Criciúma em") quando há grafia limpa noutras páginas.
    const representatives = values.map(v => {
      const same = group.filter(f => String(f.normalized) === v);
      const freq = (lit: string) => same.filter(f => f.literal === lit).length;
      return [...same].sort((a, b) => freq(b.literal) - freq(a.literal) || a.literal.length - b.literal.length)[0];
    });
    const key = r.attribute.replace("identidade.", "");
    const field = ({ municipio: "municípios", orgao: "órgãos", endereco: "endereços", bairro: "bairros", obra: "obras" } as Record<string, string>)[key] ?? key;
    return {
      id: candId(["identity", r.id]), kind: "identity",
      proposition: `O documento associa este projeto a ${field} diferentes: ${representatives.map(f => `"${f.literal}"`).join(" × ")}.`,
      origin, factIds: representatives.map(f => f.id), refs: representatives.flatMap(f => f.refs),
      premises: [
        ...representatives.map((f, i) => premise(`p${i + 1}`,
          // Sem número de página no texto: o portão literal exige que todo número da premissa
          // esteja na citação, e "p.19" bloqueava a confirmação. A página já vai na referência.
          `"${f.literal}" é um dado DESTE projeto (local da obra, proprietário, contratante, órgão ou nome do empreendimento).`)),
        premise(`p${representatives.length + 1}`, "Os valores não são compatíveis entre si para o mesmo projeto (não são grafias do mesmo nome nem partes complementares)."),
      ],
      claimScope: "identidade do projeto",
      // Contraprova é o que tira a menção DESTE projeto — não o fato de ela estar num campo
      // diferente (proprietário, contratante): dado do projeto com outra cidade/órgão É a divergência.
      counterEvidenceToSeek: ["trecho de exemplo, modelo ou norma citada", "menção explícita a OUTRO empreendimento (não a um dado deste)", "revisão ou errata, entre os documentos fornecidos, que corrige"],
    };
  }
  if (r.kind === "premise_calculation") {
    const expected = expectedProduct(r, ctx.facts);
    const out = facts.get(r.output)!;
    const [a, b] = r.inputs.map(id => facts.get(id)!);
    if (expected === null || typeof out.normalized !== "number" || blockers.includes("example_context")) return null;
    const diff = Math.abs(out.normalized - expected) / Math.max(Math.abs(expected), 1e-12);
    if (diff <= opts.relativeTolerance) return null;
    return {
      id: candId(["calc", r.id]), kind: "calculation",
      proposition: `${out.attribute} declarado (${out.literal}) difere de ${a.attribute} × ${b.attribute} (${a.literal} × ${b.literal} = ${round(expected)} ${out.unit}).`,
      origin, factIds: [a.id, b.id, out.id], refs: [...a.refs, ...b.refs, ...out.refs],
      premises: [
        premise("p1", `Premissa declarada: ${a.attribute} = ${a.literal}.`),
        premise("p2", `Premissa declarada: ${b.attribute} = ${b.literal}.`),
        premise("p3", `Valor declarado: ${out.attribute} = ${out.literal}.`),
        premise("p4", "O valor declarado deveria resultar do produto simples, sem fator, reserva ou parcela adicional documentada."),
        premise("p5", "As três grandezas se referem ao mesmo ambiente/sistema."),
      ],
      claimScope: describeScope(out),
      counterEvidenceToSeek: ["fator ou coeficiente declarado (reserva, simultaneidade, perdas)", "nota de rodapé ou premissa adicional", "parcela somada ao produto"],
    };
  }
  if (r.kind === "reference" && r.resolution === "unresolved") {
    const f = facts.get(r.factId)!;
    return {
      id: candId(["ref", r.id]), kind: "reference",
      proposition: `Remissão a "${f.literal}" não localizada no escopo examinado.`,
      origin, factIds: [f.id], refs: f.refs,
      premises: [premise("p1", `O texto remete a "${f.literal}".`), premise("p2", "O alvo não existe em nenhum documento aplicável do projeto.")],
      claimScope: "documentos autorizados desta auditoria",
      counterEvidenceToSeek: ["alvo com rótulo diferente (item × artigo × seção)", "documento externo ou norma não fornecido"],
    };
  }
  return null;
}

const round = (n: number) => Number(n.toPrecision(10));

const overlaps = (a: EvidenceRef, b: EvidenceRef) =>
  a.revisionId === b.revisionId && a.page === b.page && a.start < b.end && b.start < a.end;

/**
 * Equivalentes: mesmas fontes (cada referência de um sobrepõe alguma do outro,
 * nos dois sentidos) e mesmo tipo de origem-alvo. Dois problemas diferentes
 * de identidade (município × obra) não compartilham fontes e não se fundem.
 */
export function equivalent(a: Candidate, b: Candidate): boolean {
  if (!a.refs.length || !b.refs.length) return false;
  const covers = (x: Candidate, y: Candidate) => x.refs.every(r => y.refs.some(s => overlaps(r, s)));
  return covers(a, b) && covers(b, a);
}

export function discoverCandidates(
  ctx: ProjectContext,
  revisionIds: string[],
  readingCandidates: Candidate[] = [],
  options: Partial<DiscoveryOptions> = {},
): DiscoveryResult {
  const opts = { ...DEFAULT_DISCOVERY, ...options };
  const deterministic: Array<{ candidate: Candidate; relationId: string }> = [];
  for (const r of ctx.relations) {
    const c = fromRelation(r, ctx, opts);
    if (c) deterministic.push({ candidate: c, relationId: r.id });
  }

  // Consolida sem colapsar: o determinístico fica, a suspeita equivalente vira linhagem.
  const all: Candidate[] = [];
  const merges = new Map<string, string[]>();
  for (const c of [...deterministic.map(d => d.candidate), ...readingCandidates]) {
    const twin = all.find(k => equivalent(k, c));
    if (twin) merges.set(twin.id, [...(merges.get(twin.id) ?? []), c.id]);
    else all.push(c);
  }

  const kept = all.slice(0, opts.maxCandidates);
  const dropped = all.slice(opts.maxCandidates);
  const relationOf = new Map(deterministic.map(d => [d.candidate.id, d.relationId]));
  const facts = factsById(ctx);
  const revisionsOf = (c: Candidate) => new Set([...c.refs.map(r => r.revisionId), ...c.factIds.map(id => facts.get(id)?.revisionId ?? "")]);

  return {
    candidates: kept,
    merges: [...merges].filter(([id]) => kept.some(c => c.id === id)).map(([keptId, absorbed]) => ({ kept: keptId, absorbed })),
    saturated: dropped.length > 0 || ctx.saturated,
    pending: {
      relationIds: dropped.map(c => relationOf.get(c.id)).filter((x): x is string => !!x),
      readingCandidateIds: dropped.filter(c => !relationOf.has(c.id)).map(c => c.id),
    },
    byRevision: revisionIds.map(revisionId => ({
      revisionId,
      facts: ctx.facts.filter(f => f.revisionId === revisionId).length,
      candidates: kept.filter(c => revisionsOf(c).has(revisionId)).length,
    })),
  };
}

/**
 * Fatos do contexto que podem DERRUBAR o candidato: exceções que miram a
 * cláusula de uma premissa, orações com ressalva no mesmo escopo, fatores
 * declarados na mesma revisão e revisões declaradas que substituem uma das fontes. O investigador precisa olhar
 * estes antes de confirmar.
 */
export function refutationLeads(c: Candidate, ctx: ProjectContext): { factIds: string[]; relationIds: string[] } {
  const facts = factsById(ctx);
  const mine = c.factIds.map(id => facts.get(id)).filter((f): f is Fact => !!f);
  const clauses = new Set(mine.map(f => f.scope.clause).filter(Boolean));
  const revisions = new Set(mine.map(f => f.revisionId));
  const relationIds: string[] = [];
  const factIds = new Set<string>();
  for (const r of ctx.relations) {
    if (r.kind === "rule_exception" && (r.ruleFactIds.some(id => c.factIds.includes(id)) || clauses.has(r.target))) {
      relationIds.push(r.id);
      factIds.add(r.exceptionFactId);
    }
    if (r.kind === "supersedes" && (revisions.has(r.from) || revisions.has(r.to))) relationIds.push(r.id);
  }
  for (const f of ctx.facts) {
    if (c.factIds.includes(f.id)) continue;
    // Fator declarado na mesma revisão pode explicar uma conta que "não fecha" — só conta.
    // (Oferecê-lo a qualquer candidato criava dependência falsa na página da nota.)
    if (f.attribute.startsWith("fator")) {
      if ((c.kind === "calculation" || c.kind === undefined) && mine.some(m => m.revisionId === f.revisionId)) factIds.add(f.id);
      continue;
    }
    if (!f.conditions.includes("oração contém exceção")) continue;
    // Exceção só é pista se fala do MESMO assunto: mesmo atributo ou unidade na mesma
    // revisão, ou o mesmo local. "Mesma revisão" sozinha fazia qualquer "salvo..." do
    // documento (no 117-25, um diâmetro de 75 mm) virar contraprova de identidade.
    const sameSubject = (m: Fact) => (!!m.attribute && m.attribute === f.attribute) || (!!m.unit && m.unit === f.unit);
    if (mine.some(m => (m.revisionId === f.revisionId && sameSubject(m)) || (m.scope.location && m.scope.location === f.scope.location))) factIds.add(f.id);
  }
  return { factIds: [...factIds], relationIds };
}
