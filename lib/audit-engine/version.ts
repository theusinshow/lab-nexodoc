/**
 * Versão do motor e chaves de cache em três níveis.
 *
 *   extração     = escopo de acesso + hash dos bytes + extrator + parâmetros/OCR
 *   fatos        = chave da extração + versão das regras de fatos/normalização
 *   investigação = candidato canônico + revisões/extrações + digest do contexto
 *                  do projeto + versão completa do motor
 *
 * Sem ciclos: nada aqui inclui timestamp, runId, custo ou resultado; conjuntos
 * são ordenados antes do hash. O contexto variável de projeto/usuário
 * (precedência declarada, escopo) é digest SEPARADO do hash do motor.
 *
 * Hash igual NÃO autoriza nada: a chave de extração carrega o escopo de acesso,
 * e toda leitura de cache passa pela checagem de acesso do store.
 */
import { stableHash, type Candidate, type DocumentRevision } from "./contracts.ts";

/**
 * Módulos de REGRA (código) têm versão explícita. O teste
 * `test-audit-engine-cache.ts` compara o hash do fonte com o registro em
 * `scripts/audit-engine-fixtures/rule-source-hashes.json`: mudou o código sem
 * subir a versão aqui, o teste falha — é o que impede "mudança material sem miss".
 */
export const RULE_MODULE_VERSIONS = {
  contracts: "contracts-2",
  evidence: "evidence-2",
  coverage: "coverage-1",
  facts: "facts-4",
  relations: "relations-3",
  discovery: "discovery-9",
  calculation: "calculation-1",
  response: "response-1",
  result: "result-2",
  routing: "routing-2",
  reuse: "reuse-2",
  "report-contract": "report-contract-5",
  "legacy-candidates": "legacy-candidates-1",
} as const;

export type ModelChoice = { purpose: string; model: string; effort: string | null; maxOutputTokens: number };

/**
 * Tudo que muda o que o motor faz com o mesmo input. Textos entram por hash
 * (mudança automática = versão nova); regras de código pelas versões acima.
 */
export type EngineComponents = {
  contractVersion: string;
  rules: typeof RULE_MODULE_VERSIONS | Record<string, string>;
  prompts: Record<string, string>;
  schemas: Record<string, unknown>;
  tools: unknown[];
  routingVersion: string;
  models: ModelChoice[];
  limits: Record<string, number>;
};

export function engineVersion(c: EngineComponents): string {
  return `engine-${stableHash({
    contractVersion: c.contractVersion,
    rules: c.rules,
    prompts: Object.fromEntries(Object.entries(c.prompts).map(([k, v]) => [k, stableHash(v)])),
    schemas: stableHash(c.schemas),
    tools: stableHash(c.tools),
    routingVersion: c.routingVersion,
    models: [...c.models].sort((a, b) => a.purpose.localeCompare(b.purpose)),
    limits: c.limits,
  }).slice(0, 20)}`;
}

/** Quem pode ver. Organização e projeto; auditoria legada sem projeto é escopo próprio. */
export type AccessScope = { organizationId: string | null; projectId: string | null; auditId: string };

export function extractionKey(a: { scope: AccessScope; bytesHash: string; extractorVersion: string; params: Record<string, unknown> }): string {
  return `ext-${stableHash({ scope: { org: a.scope.organizationId, project: a.scope.projectId, audit: a.scope.projectId ? null : a.scope.auditId },
    bytes: a.bytesHash, extractor: a.extractorVersion, params: a.params })}`;
}

export function factsKey(extraction: string): string {
  return `facts-${stableHash({ extraction, facts: RULE_MODULE_VERSIONS.facts, relations: RULE_MODULE_VERSIONS.relations, evidence: RULE_MODULE_VERSIONS.evidence })}`;
}

/** Forma canônica do candidato: sem id nem textos de apresentação; conjuntos ordenados. */
export function canonicalCandidate(c: Candidate) {
  return {
    kind: c.kind ?? null,
    proposition: c.proposition.trim().replace(/\s+/g, " "),
    originKind: c.origin.kind,
    premises: c.premises.map(p => ({ id: p.id, statement: p.statement.trim() })).sort((a, b) => a.id.localeCompare(b.id)),
    refs: c.refs.map(r => ({ revisionId: r.revisionId, page: r.page, start: r.start, end: r.end, pageTextHash: r.pageTextHash }))
      .sort((a, b) => a.revisionId.localeCompare(b.revisionId) || a.page - b.page || a.start - b.start),
    factIds: [...c.factIds].sort(),
    claimScope: c.claimScope.trim(),
  };
}

/**
 * Contexto variável do projeto que muda a conclusão sem mudar arquivo nem motor:
 * precedência declarada entre revisões, definições do usuário. Entra na chave
 * da investigação, fora do hash do motor.
 */
export function projectContextDigest(revisions: DocumentRevision[], userDefinitions: Record<string, unknown> = {}): string {
  // Só a precedência DECLARADA entra: a revisão de um documento sem vínculo mudar
  // não é mudança de contexto (isso já está nas dependências de trecho).
  const precedence = revisions
    .filter(r => r.supersedes)
    .map(r => ({ revisionId: r.revisionId, supersedes: r.supersedes }))
    .sort((a, b) => a.revisionId.localeCompare(b.revisionId));
  return `ctx-${stableHash({ precedence, userDefinitions })}`;
}

export function investigationKey(a: {
  candidate: Candidate;
  revisions: DocumentRevision[];
  contextDigest: string;
  engine: string;
  scope: AccessScope;
}): string {
  const revisions = a.revisions.map(r => ({ revisionId: r.revisionId, bytesHash: r.bytesHash, extractionHash: r.extractionHash, extractor: r.extractorVersion }))
    .sort((x, y) => x.revisionId.localeCompare(y.revisionId));
  return `inv-${stableHash({ candidate: canonicalCandidate(a.candidate), revisions, context: a.contextDigest, engine: a.engine,
    scope: { org: a.scope.organizationId, project: a.scope.projectId, audit: a.scope.projectId ? null : a.scope.auditId } })}`;
}
