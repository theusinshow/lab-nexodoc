/**
 * Suspeitas da LEITURA do caminho atual como candidatos do motor (R07).
 *
 * As passadas de leitura (local/global/coerência) do Audit atual acham o que
 * nenhuma relação determinística acha: conflito de hierarquia, norma errada,
 * linguagem de outra obra. Aqui cada achado delas vira SUSPEITA — nunca
 * conclusão: vai para o investigador e para os mesmos portões de prova.
 *
 * Só vira candidato o achado cujo trecho literal ANCORA numa página declarada
 * do arquivo declarado. O resto é devolvido com o motivo (não some calado).
 * Página não entra no texto da premissa: o portão literal exige que todo número
 * da premissa esteja na citação.
 */
import { stableHash, type Candidate, type EvidenceRef } from "./contracts.ts";
import { locateQuote, type RevisionIndex } from "./evidence.ts";

export type LegacyReadingFinding = {
  id: string; arquivo?: string; pagina: string; tipo: string; descricao: string; evidencia: string;
  conflito: string; termo_busca?: string; origem?: string;
};

export type LegacyConversion = {
  candidates: Candidate[];
  skipped: Array<{ findingId: string; reason: "rule_finding" | "file_unknown" | "no_page" | "quote_not_anchored" }>;
};

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function kindOf(f: LegacyReadingFinding): NonNullable<Candidate["kind"]> {
  const t = strip(`${f.tipo} ${f.descricao}`);
  if (/identidade|nome da obra|municip|endereco|proprietari/.test(t)) return "identity";
  if (/calcul|soma|quantitativ|total|area|volume|conta/.test(t)) return "calculation";
  if (/remiss|referenci|nao localizad|ausent/.test(t)) return "reference";
  if (/diverg|incoer|conflit|contradi|inconsist/.test(t)) return "comparison";
  return "interpretation";
}

function pagesOf(pagina: string, pageCount: number): number[] {
  const out = new Set<number>();
  for (const m of pagina.matchAll(/(\d+)\s*(?:[-–a]\s*(\d+))?/g)) {
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    for (let p = Math.min(a, b); p <= Math.max(a, b) && p - Math.min(a, b) < 10; p++) if (p >= 1 && p <= pageCount) out.add(p);
  }
  return [...out];
}

/** Trechos candidatos a citação: a evidência inteira, suas partes, e o termo de busca. */
function quotesOf(f: LegacyReadingFinding): string[] {
  const parts = f.evidencia.split(/\s*\|\s*|\s*(?:\.\.\.|…)\s*/).map(x => x.replace(/^["“”']+|["“”']+$/g, "").trim());
  return [...new Set([f.evidencia.trim(), ...parts, (f.termo_busca ?? "").trim()])].filter(q => q.length >= 8);
}

export function candidatesFromLegacyReading(findings: LegacyReadingFinding[], corpus: RevisionIndex[]): LegacyConversion {
  const candidates: Candidate[] = [];
  const skipped: LegacyConversion["skipped"] = [];
  for (const f of findings) {
    // Achado de REGRA já é determinístico e tem caminho próprio; aqui só leitura de IA.
    if (f.origem === "regra") { skipped.push({ findingId: f.id, reason: "rule_finding" }); continue; }
    const byName = corpus.filter(c => c.rt.revision.displayName === f.arquivo);
    const targets = byName.length ? byName : corpus.length === 1 ? corpus : [];
    if (!targets.length) { skipped.push({ findingId: f.id, reason: "file_unknown" }); continue; }
    const refs: EvidenceRef[] = [];
    let anyPage = false;
    for (const t of targets) {
      const pages = pagesOf(f.pagina, t.rt.pages.length);
      anyPage ||= pages.length > 0;
      for (const page of pages) {
        for (const quote of quotesOf(f)) {
          const loc = locateQuote(corpus, { documentId: t.rt.revision.documentId, revisionId: t.rt.revision.revisionId, page, quote });
          if (loc.status === "anchored" && !refs.some(r => r.revisionId === loc.ref.revisionId && r.start === loc.ref.start && r.page === loc.ref.page)) refs.push(loc.ref);
          if (refs.length >= 3) break;
        }
      }
    }
    if (!anyPage) { skipped.push({ findingId: f.id, reason: "no_page" }); continue; }
    if (!refs.length) { skipped.push({ findingId: f.id, reason: "quote_not_anchored" }); continue; }
    const proposition = (f.descricao || f.conflito).trim();
    candidates.push({
      id: `cand-${stableHash(["legacy", f.id, proposition, refs.map(r => [r.revisionId, r.page, r.start])]).slice(0, 16)}`,
      kind: kindOf(f), proposition,
      origin: { kind: "legacy_finding", findingId: f.id },
      factIds: [], refs,
      premises: [
        ...refs.map((r, i) => ({ id: `p${i + 1}`, statement: `O documento contém o trecho citado: "${r.quote.slice(0, 200)}".` })),
        { id: `p${refs.length + 1}`, statement: "Os trechos citados configuram o problema da proposição, sem ressalva, definição ou exceção no documento que o afaste." },
      ],
      claimScope: `leitura do caminho atual (${f.tipo || "sem tipo"})`,
      counterEvidenceToSeek: ["exceção, ressalva ou definição em outro trecho", "revisão que substitui o trecho", "o trecho não diz o que a suspeita afirma"],
    });
  }
  return { candidates, skipped };
}
