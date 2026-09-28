/**
 * ONDE A MESA DE MONTAGEM FICA GUARDADA — auditoria UX/UI, V02/V10 (T04/T05).
 *
 * NESTE DISPOSITIVO, e a tela diz isso com essas palavras. Não há cópia no
 * servidor: o rascunho é o manifesto (`EstadoDaMontagem`) mais os BYTES de
 * cada PDF importado, no IndexedDB deste navegador. Guardar só os nomes não
 * recuperaria nada — por isso os arquivos vão junto, como `Blob`.
 *
 * BANCO PRÓPRIO (`nexodoc-mesa`), longe do `nexo` das conversas: são dois
 * produtos com ciclos de vida diferentes, e uma migração de um não pode
 * derrubar o outro.
 *
 * ESCOPO: e-mail da sessão + projeto (ou "independente"). Duas pessoas no mesmo
 * navegador não veem o rascunho uma da outra, e trocar de projeto troca de mesa.
 *
 * DUAS ABAS: cada gravação confere a revisão que a aba conhece (compare-and-set
 * na mesma transação). Se outra aba gravou depois, a gravação é RECUSADA com
 * `conflito` — a tela oferece carregar a versão mais nova, em vez de uma aba
 * velha sobrescrever a nova em silêncio.
 *
 * FALHAS são resultado, não exceção: `quota` (disco cheio), `bloqueado` (modo
 * privado/armazenamento negado) e `erro`. A tela nunca diz "salvo" sem `ok`.
 */

import type { EstadoDaMontagem } from "./mesa";

const BANCO = "nexodoc-mesa";
const VERSAO_DO_BANCO = 1;
export const VERSAO_DO_RASCUNHO = 1;

export type Escopo = { email: string; projetoId: string | null };

export function chaveDoEscopo(e: Escopo): string {
  return `${e.email.trim().toLowerCase()}::${e.projetoId ?? "independente"}`;
}

export type RascunhoGuardado<C = unknown> = {
  chave: string;
  versao: number;
  escopo: Escopo;
  estado: EstadoDaMontagem;
  conferencia: C | null;
  revisao: number;
  abaId: string;
  salvoEm: number;
};

type ArquivoGuardado = { id: string; chave: string; nome: string; tipo: string; blob: Blob };

export type FalhaDeGravacao = "quota" | "bloqueado" | "erro";

export type ResultadoDaGravacao<C = unknown> =
  | { ok: true; revisao: number; salvoEm: number }
  | { ok: false; motivo: "conflito"; remoto: RascunhoGuardado<C> }
  | { ok: false; motivo: FalhaDeGravacao; mensagem: string };

function classificar(err: unknown): { motivo: FalhaDeGravacao; mensagem: string } {
  const nome = (err as { name?: string } | null)?.name ?? "";
  if (nome === "QuotaExceededError" || /quota/i.test(String(err))) {
    return {
      motivo: "quota",
      mensagem: "O espaço de armazenamento deste navegador acabou. A montagem continua aberta nesta aba, mas não está salva.",
    };
  }
  if (nome === "SecurityError" || nome === "InvalidStateError" || nome === "NotAllowedError") {
    return {
      motivo: "bloqueado",
      mensagem: "Este navegador não permite guardar dados (modo privado ou armazenamento bloqueado). A montagem vive só nesta aba.",
    };
  }
  return { motivo: "erro", mensagem: `Não foi possível salvar neste dispositivo (${nome || "erro"}).` };
}

let aberto: Promise<IDBDatabase> | null = null;

function abrir(): Promise<IDBDatabase> {
  if (aberto) return aberto;
  aberto = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(Object.assign(new Error("IndexedDB indisponível"), { name: "NotAllowedError" }));
      return;
    }
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(BANCO, VERSAO_DO_BANCO);
    } catch (err) {
      reject(err);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("rascunhos")) db.createObjectStore("rascunhos", { keyPath: "chave" });
      if (!db.objectStoreNames.contains("arquivos")) {
        const s = db.createObjectStore("arquivos", { keyPath: "id" });
        s.createIndex("porChave", "chave", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(Object.assign(new Error("banco bloqueado por outra aba"), { name: "InvalidStateError" }));
  }).catch((err) => {
    aberto = null; // a próxima tentativa abre de novo
    throw err;
  });
  return aberto;
}

function pedido<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function lerRascunho<C = unknown>(chave: string): Promise<RascunhoGuardado<C> | null> {
  const db = await abrir();
  const tx = db.transaction("rascunhos", "readonly");
  const r = (await pedido(tx.objectStore("rascunhos").get(chave))) as RascunhoGuardado<C> | undefined;
  return r && r.versao === VERSAO_DO_RASCUNHO ? r : null;
}

/** Os bytes guardados; ids sem blob simplesmente não voltam (a tela avisa). */
export async function lerArquivos(ids: readonly string[]): Promise<Map<string, File>> {
  const db = await abrir();
  const tx = db.transaction("arquivos", "readonly");
  const store = tx.objectStore("arquivos");
  const out = new Map<string, File>();
  for (const id of ids) {
    const a = (await pedido(store.get(id))) as ArquivoGuardado | undefined;
    if (a?.blob) out.set(id, new File([a.blob], a.nome, { type: a.tipo || "application/pdf" }));
  }
  return out;
}

/**
 * GRAVA manifesto + bytes novos, e solta os bytes que nada mais referencia.
 *
 * `revisaoBase` é a revisão que esta aba conhece. Outra aba gravou depois →
 * `conflito`, e nada é escrito. `referenciados` inclui o histórico de desfazer:
 * um arquivo removido continua guardado enquanto o "Desfazer" puder trazê-lo.
 */
export async function salvarRascunho<C = unknown>(args: {
  escopo: Escopo;
  estado: EstadoDaMontagem;
  conferencia: C | null;
  revisaoBase: number;
  abaId: string;
  bytes: ReadonlyMap<string, File>;
  referenciados: ReadonlySet<string>;
}): Promise<ResultadoDaGravacao<C>> {
  let db: IDBDatabase;
  try {
    db = await abrir();
  } catch (err) {
    return { ok: false, ...classificar(err) };
  }
  const chave = chaveDoEscopo(args.escopo);
  return new Promise<ResultadoDaGravacao<C>>((resolve) => {
    let resultado: ResultadoDaGravacao<C> | null = null;
    let tx: IDBTransaction;
    try {
      tx = db.transaction(["rascunhos", "arquivos"], "readwrite");
    } catch (err) {
      resolve({ ok: false, ...classificar(err) });
      return;
    }
    const rascunhos = tx.objectStore("rascunhos");
    const arquivos = tx.objectStore("arquivos");
    const salvoEm = Date.now();
    /*
     * O ERRO ORIGINAL. Uma escrita que lança dentro do handler aborta a
     * transação, e o `tx.error` chega como `AbortError` genérico — a tela diria
     * "erro" onde o motivo era "disco cheio". Guardamos o que foi lançado.
     */
    let lancado: unknown = null;
    const escrever = (fn: () => void) => {
      try {
        fn();
      } catch (err) {
        lancado = err;
        try {
          tx.abort();
        } catch {
          /* já abortada */
        }
      }
    };

    const lido = rascunhos.get(chave);
    lido.onsuccess = () => {
      const atual = lido.result as RascunhoGuardado<C> | undefined;
      if (atual && atual.revisao !== args.revisaoBase && atual.abaId !== args.abaId) {
        resultado = { ok: false, motivo: "conflito", remoto: atual };
        tx.abort();
        return;
      }
      const revisao = (atual?.revisao ?? 0) + 1;
      const registro: RascunhoGuardado<C> = {
        chave,
        versao: VERSAO_DO_RASCUNHO,
        escopo: args.escopo,
        estado: args.estado,
        conferencia: args.conferencia,
        revisao,
        abaId: args.abaId,
        salvoEm,
      };
      escrever(() => rascunhos.put(registro));
      if (lancado) return;

      const existentes = arquivos.index("porChave").getAllKeys(chave);
      existentes.onsuccess = () => {
        const jaGuardados = new Set(existentes.result as string[]);
        for (const [id, file] of args.bytes) {
          if (!args.referenciados.has(id) || jaGuardados.has(id)) continue;
          escrever(() => arquivos.put({ id, chave, nome: file.name, tipo: file.type, blob: file } satisfies ArquivoGuardado));
          if (lancado) return;
        }
        for (const id of jaGuardados) {
          if (!args.referenciados.has(id)) escrever(() => arquivos.delete(id));
        }
      };
      resultado = { ok: true, revisao, salvoEm };
    };

    tx.oncomplete = () => resolve(resultado ?? { ok: false, motivo: "erro", mensagem: "Gravação sem resultado." });
    tx.onabort = () => {
      if (resultado && !resultado.ok && resultado.motivo === "conflito") resolve(resultado);
      else resolve({ ok: false, ...classificar(lancado ?? tx.error) });
    };
    tx.onerror = (ev) => {
      // O `abort` vem a seguir; só evita que o erro suba como não tratado.
      ev.preventDefault();
    };
  });
}

/** Apaga o rascunho e os bytes do escopo — o "Descartar" explícito. */
export async function descartarRascunho(escopo: Escopo): Promise<void> {
  const db = await abrir();
  const chave = chaveDoEscopo(escopo);
  const tx = db.transaction(["rascunhos", "arquivos"], "readwrite");
  tx.objectStore("rascunhos").delete(chave);
  const idx = tx.objectStore("arquivos").index("porChave");
  const ids = (await pedido(idx.getAllKeys(chave))) as string[];
  for (const id of ids) tx.objectStore("arquivos").delete(id);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * VINCULAR A PROJETO SEM PERDER A MONTAGEM (V10): o rascunho e os bytes mudam
 * de escopo numa transação só. Se já havia rascunho no escopo de destino, ele
 * NÃO é sobrescrito — quem chama recebe `false` e pergunta.
 */
export async function moverRascunho(de: Escopo, para: Escopo): Promise<boolean> {
  const db = await abrir();
  const chaveDe = chaveDoEscopo(de);
  const chavePara = chaveDoEscopo(para);
  const tx = db.transaction(["rascunhos", "arquivos"], "readwrite");
  const rascunhos = tx.objectStore("rascunhos");
  const arquivos = tx.objectStore("arquivos");
  const destino = await pedido(rascunhos.get(chavePara));
  if (destino) {
    tx.abort();
    return false;
  }
  const origem = (await pedido(rascunhos.get(chaveDe))) as RascunhoGuardado | undefined;
  if (origem) {
    rascunhos.put({ ...origem, chave: chavePara, escopo: para });
    rascunhos.delete(chaveDe);
  }
  const ids = (await pedido(arquivos.index("porChave").getAllKeys(chaveDe))) as string[];
  for (const id of ids) {
    const a = (await pedido(arquivos.get(id))) as ArquivoGuardado | undefined;
    if (a) arquivos.put({ ...a, chave: chavePara });
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return true;
}

/** Aviso entre abas: "gravei a revisão N desta chave". */
export const CANAL_DA_MESA = "nexodoc-mesa";
export type AvisoDaMesa = { chave: string; revisao: number; abaId: string };
