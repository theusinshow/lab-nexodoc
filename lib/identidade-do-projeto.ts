/**
 * A IDENTIDADE GUARDADA DO PROJETO — o que se sabe da obra, campo a campo, e
 * DE ONDE veio cada valor (09/10/2026). Mora em `Project.identidade`.
 *
 * Existe pelo memorial de disciplina sem capa: a capa mora no memorial GERAL,
 * que chega depois ou nunca. Ver
 * `docs/superpowers/specs/2026-10-09-memorial-sem-capa-design.md`.
 *
 * A regra de escrita: a CAPA é documento oficial e vence tudo, registrando a
 * divergência com o que havia; o que o USUÁRIO digitou vence o SELO; nada
 * vence a capa a não ser outra capa. O CORPO do memorial não é origem
 * guardável: no 040-26 ele trazia a obra e o código de outro projeto.
 *
 * PURO.
 */
import { mesmaObra } from "./cross-document-audit.ts";

export const CAMPOS_DA_IDENTIDADE = ["obra", "orgao", "secretaria", "bairro", "municipio", "codigo", "mesAno"] as const;
export type CampoDaIdentidade = (typeof CAMPOS_DA_IDENTIDADE)[number];
export type OrigemGuardada = "capa" | "selo" | "usuario";
export type CampoGuardado = { valor: string; origem: OrigemGuardada; fonte: string; em: string; por?: string };
export type Divergencia = { campo: CampoDaIdentidade; anterior: CampoGuardado; nova: CampoGuardado; em: string };
export type ConferenciaDaAuditoria = {
  estado: "confere" | "diverge";
  obraDaAuditoria: string;
  obraDaCapa: string;
  em: string;
};
export type IdentidadeDoProjeto = {
  campos: Partial<Record<CampoDaIdentidade, CampoGuardado>>;
  divergencias: Divergencia[];
  conferencias: Record<string, ConferenciaDaAuditoria>;
};

const ORIGENS: readonly OrigemGuardada[] = ["capa", "selo", "usuario"];
/** Quem pode sobrescrever quem. A capa só perde para outra capa. */
const FORCA: Record<OrigemGuardada, number> = { selo: 1, usuario: 2, capa: 3 };

function ehCampoGuardado(v: unknown): v is CampoGuardado {
  const c = v as Partial<CampoGuardado> | null;
  return (
    Boolean(c) &&
    typeof c!.valor === "string" &&
    c!.valor.trim() !== "" &&
    ORIGENS.includes(c!.origem as OrigemGuardada) &&
    typeof c!.fonte === "string" &&
    typeof c!.em === "string"
  );
}

/** JSON do banco → identidade. Tudo o que não tiver a forma certa é descartado. */
export function lerIdentidadeDoProjeto(json: unknown): IdentidadeDoProjeto {
  const bruto = (json && typeof json === "object" ? json : {}) as Record<string, unknown>;
  const campos: IdentidadeDoProjeto["campos"] = {};
  const c = (bruto.campos && typeof bruto.campos === "object" ? bruto.campos : {}) as Record<string, unknown>;
  for (const campo of CAMPOS_DA_IDENTIDADE) {
    const v = c[campo];
    if (ehCampoGuardado(v)) campos[campo] = v;
  }
  const divergencias = Array.isArray(bruto.divergencias) ? (bruto.divergencias as Divergencia[]) : [];
  const conferencias =
    bruto.conferencias && typeof bruto.conferencias === "object"
      ? (bruto.conferencias as Record<string, ConferenciaDaAuditoria>)
      : {};
  return { campos, divergencias, conferencias };
}

function chave(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function mesmoValor(campo: CampoDaIdentidade, a: string, b: string): boolean {
  return chave(a) === chave(b) || (campo === "obra" && mesmaObra(a, b));
}

export function gravarIdentidade(
  atual: IdentidadeDoProjeto,
  campo: CampoDaIdentidade,
  novo: CampoGuardado,
): { identidade: IdentidadeDoProjeto; mudou: boolean; divergencia?: Divergencia } {
  const valor = novo.valor.trim();
  if (!valor) return { identidade: atual, mudou: false };
  const anterior = atual.campos[campo];
  if (anterior && FORCA[novo.origem] < FORCA[anterior.origem]) return { identidade: atual, mudou: false };
  if (anterior && anterior.valor === valor && anterior.origem === novo.origem) {
    return { identidade: atual, mudou: false };
  }

  const gravado: CampoGuardado = { ...novo, valor };
  const divergencia: Divergencia | undefined =
    anterior && novo.origem === "capa" && anterior.origem !== "capa" && !mesmoValor(campo, anterior.valor, valor)
      ? { campo, anterior, nova: gravado, em: novo.em }
      : undefined;

  return {
    identidade: {
      ...atual,
      campos: { ...atual.campos, [campo]: gravado },
      divergencias: divergencia ? [...atual.divergencias, divergencia] : atual.divergencias,
    },
    mudou: true,
    ...(divergencia ? { divergencia } : {}),
  };
}

export type Gravacao = {
  origem: OrigemGuardada;
  fonte: string;
  em: string;
  por?: string;
  campos: Partial<Record<CampoDaIdentidade, string>>;
};

/** Vários campos de uma vez (uma capa, uma correção). */
export function aplicarGravacao(
  atual: IdentidadeDoProjeto,
  g: Gravacao,
): { identidade: IdentidadeDoProjeto; divergencias: Divergencia[]; obraDaCapa: string | null } {
  let identidade = atual;
  const divergencias: Divergencia[] = [];
  for (const campo of CAMPOS_DA_IDENTIDADE) {
    const valor = g.campos[campo]?.trim();
    if (!valor) continue;
    const r = gravarIdentidade(identidade, campo, {
      valor,
      origem: g.origem,
      fonte: g.fonte,
      em: g.em,
      ...(g.por ? { por: g.por } : {}),
    });
    identidade = r.identidade;
    if (r.divergencia) divergencias.push(r.divergencia);
  }
  const obra = identidade.campos.obra;
  const obraDaCapa = g.origem === "capa" && g.campos.obra?.trim() && obra?.origem === "capa" ? obra.valor : null;
  return { identidade, divergencias, obraDaCapa };
}

/** A obra com que uma auditoria rodou × a capa do geral. Sem IA. */
export function conferirAuditoria(obraDaAuditoria: string, obraDaCapa: string, em: string): ConferenciaDaAuditoria {
  return {
    estado: mesmoValor("obra", obraDaAuditoria, obraDaCapa) ? "confere" : "diverge",
    obraDaAuditoria,
    obraDaCapa,
    em,
  };
}
