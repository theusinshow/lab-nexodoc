/**
 * O que cliente e servidor do suporte dividem. Puro e sem `node:` — entra no
 * pacote do navegador.
 */
import { LIMITE_DA_TRILHA, TETO_DO_TEXTO, type Passo } from "./trilha.ts";

export const CATEGORIAS = ["ERRO", "SUGESTAO", "DUVIDA"] as const;
export type Categoria = (typeof CATEGORIAS)[number];
export const ehCategoria = (v: unknown): v is Categoria => CATEGORIAS.includes(v as Categoria);

export const STATUS = ["ABERTO", "EM_ANALISE", "RESOLVIDO"] as const;
export type StatusDoChamado = (typeof STATUS)[number];
export const ehStatus = (v: unknown): v is StatusDoChamado => STATUS.includes(v as StatusDoChamado);

export const NOME_DA_CATEGORIA: Record<Categoria, string> = { ERRO: "Erro", SUGESTAO: "Sugestão", DUVIDA: "Dúvida" };
export const NOME_DO_STATUS: Record<StatusDoChamado, string> = { ABERTO: "Aberto", EM_ANALISE: "Em análise", RESOLVIDO: "Resolvido" };

/** 1,5 MB: o print em WebP de uma tela inteira fica bem abaixo disso. */
export const TETO_DO_PRINT = 1_572_864;

// cuid (c + 24), uuid, hex longo (checksum), número puro
const ID = /^(?:c[a-z0-9]{20,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{24,}|\d+)$/i;

/**
 * A rota sem query, sem hash e com cada id trocado por `:id`. É o que torna
 * "o mesmo erro em projetos diferentes" o mesmo erro.
 */
export function normalizarRota(rota: string): string {
  let caminho = String(rota || "/");
  if (/^https?:\/\//i.test(caminho)) {
    try {
      caminho = new URL(caminho).pathname;
    } catch {
      caminho = "/";
    }
  }
  caminho = caminho.split(/[?#]/)[0] || "/";
  const r = caminho
    .split("/")
    .map((p) => (ID.test(p) ? ":id" : p))
    .join("/")
    .replace(/\/+$/, "");
  return r || "/";
}

/** O caminho de uma URL da MESMA origem; null para terceiros (não entram na trilha). */
export function caminhoMesmaOrigem(url: string, origem: string): string | null {
  try {
    const u = new URL(url, origem);
    return u.origin === origem ? u.pathname : null;
  } catch {
    return null;
  }
}

export function projetoDaRota(caminho: string): string | null {
  return /^\/projetos\/([^/?#]+)/.exec(caminho)?.[1] ?? null;
}

export const formatarProtocolo = (n: number) => `#${String(n).padStart(4, "0")}`;

export type ContextoDoChamado = { trilha: Passo[]; pagina?: string; navegador?: string; viewport?: string; projeto?: string };

const TIPOS = new Set(["rota", "clique", "requisicao", "erro"]);
const texto = (v: unknown, teto = TETO_DO_TEXTO) => (typeof v === "string" ? v.slice(0, teto) : undefined);
const numero = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** O contexto que veio do navegador, só com o que se espera e no tamanho que se espera. */
export function limparContexto(c: unknown): ContextoDoChamado {
  const o = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
  const trilha: Passo[] = (Array.isArray(o.trilha) ? o.trilha : [])
    .filter((p): p is Record<string, unknown> => !!p && typeof p === "object" && TIPOS.has((p as Record<string, unknown>).tipo as string))
    .slice(-LIMITE_DA_TRILHA)
    .map((p) => {
      const passo: Passo = { t: numero(p.t) ?? 0, tipo: p.tipo as Passo["tipo"], texto: texto(p.texto) ?? "" };
      const status = numero(p.status);
      const ms = numero(p.ms);
      if (status !== undefined) passo.status = status;
      if (ms !== undefined) passo.ms = ms;
      return passo;
    });
  const limpo: ContextoDoChamado = { trilha };
  const pagina = texto(o.pagina, 300);
  const navegador = texto(o.navegador);
  const viewport = texto(o.viewport, 40);
  const projeto = texto(o.projeto, 100);
  if (pagina) limpo.pagina = pagina;
  if (navegador) limpo.navegador = navegador;
  if (viewport) limpo.viewport = viewport;
  if (projeto) limpo.projeto = projeto;
  return limpo;
}
