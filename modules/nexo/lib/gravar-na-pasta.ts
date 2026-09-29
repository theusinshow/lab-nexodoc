"use client";

/**
 * Gravar arquivos DIRETO numa pasta que o usuário escolhe (File System Access
 * API, Chrome/Edge). É o que faz o editável chegar na pasta do projeto em vez
 * de cair em Downloads — ver `editaveis-no-projeto.ts`.
 *
 * A pasta escolhida fica lembrada por projeto: o `FileSystemDirectoryHandle`
 * sobrevive no IndexedDB (clone estruturado), e da segunda vez basta o
 * navegador reconfirmar a permissão. Banco próprio, e não o `nexo-db`, para não
 * mexer na versão do esquema das conversas por causa de uma chave só.
 */

import { nomeLivre } from "./editaveis-no-projeto";

/** Tipos da API que o lib.dom do TS ainda não traz inteiros. */
type ModoDePermissao = { mode: "readwrite" };
interface PastaComPermissao extends FileSystemDirectoryHandle {
  queryPermission?: (d: ModoDePermissao) => Promise<PermissionState>;
  requestPermission?: (d: ModoDePermissao) => Promise<PermissionState>;
  values?: () => AsyncIterableIterator<FileSystemHandle>;
}
type JanelaComSeletor = Window & {
  showDirectoryPicker?: (o?: { id?: string; mode?: "readwrite" }) => Promise<FileSystemDirectoryHandle>;
};

/** O navegador sabe abrir o seletor de pasta? (Firefox e Safari não.) */
export function suportaGravarEmPasta(): boolean {
  return typeof window !== "undefined" && typeof (window as JanelaComSeletor).showDirectoryPicker === "function";
}

/** Cancelar o seletor não é erro — é o usuário desistindo. */
export function foiCancelado(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

export async function escolherPasta(): Promise<FileSystemDirectoryHandle> {
  const abrir = (window as JanelaComSeletor).showDirectoryPicker;
  if (!abrir) throw new Error("Este navegador não sabe gravar em pasta. Use o Chrome ou o Edge.");
  return abrir({ id: "nexodoc-editaveis", mode: "readwrite" });
}

/**
 * Garante permissão de escrita numa pasta lembrada. Precisa vir de um CLIQUE:
 * o navegador só mostra o pedido com gesto do usuário.
 */
export async function temPermissaoDeEscrita(pasta: FileSystemDirectoryHandle): Promise<boolean> {
  const p = pasta as PastaComPermissao;
  if (!p.queryPermission || !p.requestPermission) return true;
  if ((await p.queryPermission({ mode: "readwrite" })) === "granted") return true;
  return (await p.requestPermission({ mode: "readwrite" })) === "granted";
}

async function nomesNaPasta(pasta: FileSystemDirectoryHandle): Promise<Set<string>> {
  const nomes = new Set<string>();
  const valores = (pasta as PastaComPermissao).values;
  if (!valores) return nomes;
  for await (const h of valores.call(pasta)) if (h.kind === "file") nomes.add(h.name);
  return nomes;
}

export type DecisaoDeConflito = "substituir" | "manter" | "pular";

export interface ResultadoDaGravacao {
  /** Nomes como ficaram NA PASTA (com o "(2)" quando manteve os dois). */
  gravados: string[];
  /** O usuário escolheu pular — o arquivo dele já estava lá. */
  pulados: string[];
}

/**
 * Grava cada arquivo, perguntando quando o nome já existe, e RELÊ o que gravou.
 *
 * A releitura compara o tamanho: uma gravação que "deu certo" e deixou 0 byte
 * no disco de rede é exatamente o sucesso falso que esta trava existe para não
 * aceitar. Falhou a conferência, lança — e nada é liberado.
 */
export async function gravarNaPasta(
  pasta: FileSystemDirectoryHandle,
  arquivos: readonly { nome: string; blob: Blob }[],
  decidir: (nome: string) => Promise<DecisaoDeConflito>,
): Promise<ResultadoDaGravacao> {
  const existentes = await nomesNaPasta(pasta);
  const gravados: string[] = [];
  const pulados: string[] = [];

  for (const a of arquivos) {
    let nome = a.nome;
    const colide = [...existentes].some((n) => n.toLowerCase() === nome.toLowerCase());
    if (colide) {
      const decisao = await decidir(nome);
      if (decisao === "pular") {
        pulados.push(nome);
        continue;
      }
      if (decisao === "manter") nome = nomeLivre(nome, existentes);
    }
    const handle = await pasta.getFileHandle(nome, { create: true });
    const escrita = await handle.createWritable();
    await escrita.write(a.blob);
    await escrita.close();

    const relido = await (await pasta.getFileHandle(nome)).getFile();
    if (relido.size !== a.blob.size) {
      throw new Error(
        `"${nome}" foi gravado com ${relido.size} bytes em vez de ${a.blob.size}. Nada foi liberado; tente de novo.`,
      );
    }
    existentes.add(nome);
    gravados.push(nome);
  }
  return { gravados, pulados };
}

/* ------------------------------------------------- A pasta lembrada ---- */

const BANCO = "nexodoc-pastas";
const LOJA = "pastas";

function abrirBanco(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BANCO, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(LOJA);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** A pasta usada da última vez neste projeto. `null` se nunca houve, ou sem IndexedDB. */
export async function pastaLembrada(chave: string): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await abrirBanco();
    return await new Promise((resolve) => {
      const req = db.transaction(LOJA).objectStore(LOJA).get(chave);
      req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function lembrarPasta(chave: string, pasta: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await abrirBanco();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(LOJA, "readwrite");
      tx.objectStore(LOJA).put(pasta, chave);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Lembrar é conveniência: sem ela, o seletor abre de novo. Não é falha.
  }
}
