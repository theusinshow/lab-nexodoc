/**
 * O SUPORTE NO NAVEGADOR: instala a trilha (rotas, cliques, requisições,
 * console), reporta erro sozinho e envia o chamado da gaveta.
 *
 * Instala UMA vez (o `Reportador` do layout raiz chama). O `fetch` original é
 * guardado e é ele que fala com `/api/suporte*` — o reportador não passa pela
 * própria instrumentação, e um 5xx dele nunca gera outro relato.
 */
import { caminhoMesmaOrigem, normalizarRota, projetoDaRota, type Categoria, type ContextoDoChamado } from "./comum";
import { guardarPendente, tirarPendentes, type Armazem } from "./fila-local";
import { criarTrilha, rotuloDoClique, type ElementoParaRotulo } from "./trilha";

export const EVENTO_ABRIR = "nexo:suporte:abrir";
export type PedidoDeAbertura = { chamadoId?: string; protocolo?: number; categoria?: Categoria };
export type ChamadoCurto = { id: string; protocolo: number };

const trilha = criarTrilha();
let instalado = false;
let fetchOriginal: typeof fetch | null = null;
let ultimoAviso = 0;

const AVISO_A_CADA_MS = 30_000;

export function abrirSuporte(p: PedidoDeAbertura = {}) {
  window.dispatchEvent(new CustomEvent<PedidoDeAbertura>(EVENTO_ABRIR, { detail: p }));
}

export function contextoAtual(): ContextoDoChamado {
  const projeto = projetoDaRota(location.pathname);
  return {
    trilha: trilha.ler(),
    pagina: normalizarRota(location.pathname),
    navegador: navigator.userAgent,
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    ...(projeto && { projeto }),
  };
}

function armazem(): Armazem | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

async function postar(rota: string, corpo: unknown): Promise<Response | null> {
  try {
    return await (fetchOriginal ?? fetch)(rota, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  } catch {
    return null;
  }
}

export async function reportarErro(e: { nome: string; mensagem: string; digest?: string; http?: boolean; rota?: string }): Promise<ChamadoCurto | null> {
  const corpo = { ...e, rota: e.rota ?? location.pathname, contexto: contextoAtual() };
  const r = await postar("/api/suporte/erro", corpo);
  if (!r) {
    guardarPendente(armazem(), { rota: "/api/suporte/erro", corpo, em: Date.now() });
    return null;
  }
  const j = (await r.json().catch(() => null)) as { chamado?: ChamadoCurto | null } | null;
  return j?.chamado ?? null;
}

export async function enviarChamado(c: { categoria: Categoria; texto: string; print: string | null; chamadoId?: string }) {
  const corpo = { ...c, rota: location.pathname, contexto: contextoAtual() };
  const r = await postar("/api/suporte", corpo);
  if (!r) {
    // sem rede: o texto espera na fila; o print não (é grande demais para o localStorage)
    guardarPendente(armazem(), { rota: "/api/suporte", corpo: { ...corpo, print: null }, em: Date.now() });
    return { ok: false as const, erro: "Sem conexão. O relato foi guardado e será enviado quando a conexão voltar." };
  }
  const j = (await r.json().catch(() => null)) as { chamado?: ChamadoCurto; error?: string } | null;
  if (!r.ok || !j?.chamado) return { ok: false as const, erro: j?.error ?? "Não foi possível enviar. Tente de novo." };
  return { ok: true as const, chamado: j.chamado };
}

async function esvaziarFila() {
  for (const p of tirarPendentes(armazem())) {
    const r = await postar(p.rota, p.corpo);
    if (!r) guardarPendente(armazem(), p);
  }
}

function textoDe(v: unknown): string {
  if (v instanceof Error) return `${v.name}: ${v.message}`;
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function instalarSuporte(aoFalhar: (c: ChamadoCurto | null) => void) {
  if (instalado) return;
  instalado = true;
  const original = window.fetch.bind(window);
  fetchOriginal = original;

  // rotas: o Next navega por history.pushState/replaceState
  let ultima = "";
  const verRota = () => {
    const r = normalizarRota(location.pathname);
    if (r !== ultima) trilha.registrar({ tipo: "rota", texto: (ultima = r) });
  };
  verRota();
  for (const m of ["pushState", "replaceState"] as const) {
    const o = history[m].bind(history);
    history[m] = ((...a: Parameters<History["pushState"]>) => {
      o(...a);
      verRota();
    }) as History[typeof m];
  }
  window.addEventListener("popstate", verRota);

  // cliques: só o rótulo do que é clicável
  document.addEventListener(
    "click",
    (e) => {
      const r = rotuloDoClique(e.target instanceof Element ? (e.target as unknown as ElementoParaRotulo) : null);
      if (r) trilha.registrar({ tipo: "clique", texto: r });
    },
    true,
  );

  // console.error e o que escapou
  const ce = console.error.bind(console);
  console.error = (...a: unknown[]) => {
    try {
      trilha.registrar({ tipo: "erro", texto: a.map(textoDe).join(" ") });
    } catch {
      /* a trilha nunca derruba o console */
    }
    ce(...a);
  };
  window.addEventListener("error", (e) => trilha.registrar({ tipo: "erro", texto: e.message || "erro de script" }));
  window.addEventListener("unhandledrejection", (e) => trilha.registrar({ tipo: "erro", texto: `promessa: ${textoDe(e.reason)}` }));

  /*
   * requisições: só as da NOSSA API entram na trilha (e, em 5xx, reportam).
   * Medido em 08/10: o próprio print baixa as fontes (`/_next/static/...`) pelo
   * fetch, e sem este filtro as 30 posições viravam 30 arquivos .woff2.
   */
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const inicio = performance.now();
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const metodo = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const mesmaOrigem = caminhoMesmaOrigem(url, location.origin);
    const caminho = mesmaOrigem?.startsWith("/api/") ? mesmaOrigem : null;
    try {
      const r = await original(input, init);
      if (caminho) {
        trilha.registrar({ tipo: "requisicao", texto: `${metodo} ${normalizarRota(caminho)}`, status: r.status, ms: Math.round(performance.now() - inicio) });
        if (r.status >= 500 && !caminho.startsWith("/api/suporte")) {
          void reportarErro({ nome: `HTTP ${r.status}`, mensagem: `${metodo} ${normalizarRota(caminho)}`, http: true, rota: caminho }).then((c) => {
            if (Date.now() - ultimoAviso < AVISO_A_CADA_MS) return;
            ultimoAviso = Date.now();
            aoFalhar(c);
          });
        }
      }
      return r;
    } catch (err) {
      if (caminho) trilha.registrar({ tipo: "requisicao", texto: `${metodo} ${normalizarRota(caminho)}`, status: 0 });
      throw err;
    }
  };

  void esvaziarFila();
}
