/**
 * A FICHA DO MEMORIAL — o que o Nexo leu da capa, em linhas, cada uma corrigível.
 *
 * Era uma frase só ("é o memorial descritivo — UBS VILA MANAUS · PREFEITURA… ·
 * código 117-25 · OUTUBRO/2025"): difícil de conferir campo a campo, e a única
 * saída para um campo errado era "A obra está errada", que mandava texto ao
 * agente. O agente não tem ação de corrigir a identidade, e a régua da
 * auditoria sai do `dossie` — a correção não chegava a ela (02/10/2026).
 *
 * Aqui a correção é determinística: muda a linha da ficha e o campo do dossiê,
 * que é o que a auditoria lê. Guardada JÁ MONTADA na mensagem, como a ficha das
 * pranchas: a conversa preserva o que foi mostrado.
 *
 * Módulo puro (sem React, imports relativos): os testes rodam em node cru.
 */
import type { OrigemNaFicha } from "../../../lib/escada-da-identidade.ts";
import type { NexoDossieDraft } from "../types";

/** Os campos que a capa do memorial traz, na ordem da capa. */
export const CAMPOS_DO_MEMORIAL = ["obra", "orgao", "secretaria", "bairro", "municipio", "codigo", "mesAno"] as const;
export type CampoDoMemorial = (typeof CAMPOS_DO_MEMORIAL)[number];

export const ROTULOS_DO_MEMORIAL: Record<CampoDoMemorial, string> = {
  obra: "Obra",
  orgao: "Órgão",
  secretaria: "Secretaria",
  bairro: "Bairro",
  municipio: "Município",
  codigo: "Código",
  mesAno: "Data",
};

/** Com artigo, para a frase do Nexo ("Corrigi a obra", "Corrigi o código"). */
export const COM_ARTIGO: Record<CampoDoMemorial, string> = {
  obra: "a obra",
  orgao: "o órgão",
  secretaria: "a secretaria",
  bairro: "o bairro",
  municipio: "o município",
  codigo: "o código",
  mesAno: "a data",
};

export interface LinhaDoMemorial {
  campo: CampoDoMemorial;
  /** `null` = a capa não trouxe (ou o Nexo não leu). */
  valor: string | null;
  /** Corrigido à mão nesta conversa — a ficha diz isso na linha. */
  corrigido?: boolean;
  /** De onde veio o valor (09/10/2026). Ausente em fichas gravadas antes. */
  origem?: OrigemNaFicha;
  /** O arquivo que provou, quando a origem é o projeto. */
  fonte?: string;
}

export interface FichaDoMemorial {
  arquivo: string;
  linhas: LinhaDoMemorial[];
  /** Código da capa × nome do arquivo, quando divergem. */
  divergencia?: string;
  /** O memorial não tinha capa (disciplina): a linha vazia convida a preencher. */
  semCapa?: true;
}

/** O valor de cada campo no dossiê. O bairro é o da CAPA (ver NexoWorkspace). */
function valorNoDossie(d: NexoDossieDraft | null | undefined, campo: CampoDoMemorial): string | null {
  if (!d) return null;
  const v = campo === "bairro" ? (d.capa?.bairro ?? d.bairro) : d[campo];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function fichaDoMemorial(
  dossie: NexoDossieDraft | null | undefined,
  arquivo: string,
  divergencia?: string | null,
): FichaDoMemorial {
  return {
    arquivo,
    linhas: CAMPOS_DO_MEMORIAL.map((campo) => {
      const o = dossie?.origens?.[campo];
      return {
        campo,
        valor: valorNoDossie(dossie, campo),
        ...(o ? { origem: o.origem, ...(o.fonte ? { fonte: o.fonte } : {}) } : {}),
      };
    }),
    ...(dossie && !dossie.capa ? { semCapa: true as const } : {}),
    ...(divergencia ? { divergencia } : {}),
  };
}

/** A ficha com um campo corrigido. Valor vazio não corrige (a linha fica como estava). */
export function corrigirFicha(ficha: FichaDoMemorial, campo: CampoDoMemorial, valor: string): FichaDoMemorial {
  const limpo = valor.trim();
  if (!limpo) return ficha;
  return {
    ...ficha,
    linhas: ficha.linhas.map((l) => (l.campo === campo ? { campo, valor: limpo, corrigido: true, origem: "usuario" as const } : l)),
  };
}

/**
 * O dossiê com o campo corrigido — é ele que vira a régua da auditoria
 * (`memorialFatos` → gabarito) e o que volta com o memorial depois do F5.
 * O bairro vai para a capa também: a identidade lê o bairro SÓ de lá.
 */
export function corrigirDossie(
  dossie: NexoDossieDraft | null | undefined,
  campo: CampoDoMemorial,
  valor: string,
): NexoDossieDraft | null {
  const limpo = valor.trim();
  if (!dossie || !limpo) return dossie ?? null;
  const proximo: NexoDossieDraft = {
    ...dossie,
    [campo]: limpo,
    // O cartão da auditoria diz "preenchida por você" a partir daqui.
    origens: { ...dossie.origens, [campo]: { origem: "usuario" } },
  };
  if (campo === "bairro" && dossie.capa) proximo.capa = { ...dossie.capa, bairro: limpo };
  return proximo;
}

/** Os campos que também são da identidade do projeto (capa, LD, pasta). */
export function patchDaIdentidade(campo: CampoDoMemorial, valor: string): Record<string, string> | null {
  const limpo = valor.trim();
  if (!limpo) return null;
  if (campo === "obra" || campo === "orgao" || campo === "secretaria" || campo === "bairro" || campo === "codigo") {
    return { [campo]: limpo };
  }
  return null;
}
