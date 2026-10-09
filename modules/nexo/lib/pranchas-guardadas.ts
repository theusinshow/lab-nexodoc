/**
 * AS PRANCHAS GUARDADAS, do lado do navegador (09/10/2026).
 *
 * `pranchaFiles: File[]` continua sendo "os bytes que ESTA aba tem". As fichas
 * vêm do servidor e sobrevivem ao F5. `juntarPranchas` soma os dois num tipo
 * só, `PranchaNaSessao`, que é o que desce para os cartões: quem só precisa do
 * nome ou da contagem lê `name`; quem precisa dos bytes usa `file` ou baixa
 * pelo `checksum`.
 *
 * Sem `@/` de propósito: testado em node cru (`scripts/test-pranchas-na-sessao.ts`).
 */
import { LIMITE_DO_ARQUIVO_BYTES } from "../../../lib/limite-do-anexo.ts";

export type FichaDePrancha = {
  fileName: string;
  checksum: string;
  paginas: number;
  sizeBytes: number;
  atualizadaEm: string;
};

export type EstadoDoEnvio = "subindo" | "falhou";

export interface PranchaNaSessao {
  name: string;
  /** Os bytes, quando esta aba os tem. Depois do F5, `null`. */
  file: File | null;
  /** A impressão digital no cofre, quando guardada. */
  checksum: string | null;
  /**
   * `na-memoria`: conversa sem projeto, nada a guardar ainda.
   * `subindo` / `falhou`: o envio desta aba.
   * `guardada`: tem ficha no projeto — monta por referência.
   */
  estado: "na-memoria" | "subindo" | "guardada" | "falhou";
}

export function juntarPranchas(
  files: File[],
  fichas: FichaDePrancha[],
  envio: ReadonlyMap<string, EstadoDoEnvio>,
): PranchaNaSessao[] {
  const porNome = new Map(fichas.map((f) => [f.fileName, f]));
  const vistos = new Set<string>();
  const saida: PranchaNaSessao[] = [];

  for (const file of files) {
    if (vistos.has(file.name)) continue;
    vistos.add(file.name);
    const estadoDoEnvio = envio.get(file.name);
    const guardada = porNome.get(file.name);
    if (estadoDoEnvio) {
      // O arquivo desta aba ainda não é o da ficha (ou a ficha nem existe).
      saida.push({ name: file.name, file, checksum: null, estado: estadoDoEnvio });
    } else if (guardada) {
      saida.push({ name: file.name, file, checksum: guardada.checksum, estado: "guardada" });
    } else {
      saida.push({ name: file.name, file, checksum: null, estado: "na-memoria" });
    }
  }
  for (const f of fichas) {
    if (vistos.has(f.fileName)) continue;
    vistos.add(f.fileName);
    saida.push({ name: f.fileName, file: null, checksum: f.checksum, estado: "guardada" });
  }
  return saida;
}

export function resumoDoEnvio(pranchas: PranchaNaSessao[]): {
  subindo: number;
  total: number;
  falharam: string[];
} {
  return {
    subindo: pranchas.filter((p) => p.estado === "subindo").length,
    total: pranchas.length,
    falharam: pranchas.filter((p) => p.estado === "falhou").map((p) => p.name),
  };
}

/** Resposta 4xx do servidor: repetir não muda nada. */
export class EnvioRecusado extends Error {
  readonly status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.name = "EnvioRecusado";
    this.status = status;
  }
}

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** 3 tentativas, esperando 1 s e 2 s entre elas. Recusa (4xx) não repete. */
export async function comTentativas<T>(
  fn: () => Promise<T>,
  opts: {
    tentativas?: number;
    espera?: (ms: number) => Promise<void>;
    deveRepetir?: (err: unknown) => boolean;
  } = {},
): Promise<T> {
  const tentativas = opts.tentativas ?? 3;
  const espera = opts.espera ?? esperar;
  const deveRepetir = opts.deveRepetir ?? ((err) => !(err instanceof EnvioRecusado));
  let ultimo: unknown;
  for (let i = 0; i < tentativas; i++) {
    try {
      return await fn();
    } catch (err) {
      ultimo = err;
      if (!deveRepetir(err) || i === tentativas - 1) break;
      await espera(1000 * 2 ** i);
    }
  }
  throw ultimo;
}

export async function emParalelo<T>(
  itens: T[],
  limite: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let proximo = 0;
  const trabalhador = async () => {
    while (proximo < itens.length) {
      const item = itens[proximo++];
      await fn(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
}

async function erroDe(res: Response): Promise<Error> {
  const corpo = (await res.json().catch(() => null)) as { error?: string } | null;
  const mensagem = corpo?.error ?? `HTTP ${res.status}`;
  return res.status >= 400 && res.status < 500 ? new EnvioRecusado(res.status, mensagem) : new Error(mensagem);
}

const qs = (p: Record<string, string>) => new URLSearchParams(p).toString();

export async function listarFichas(projeto: string): Promise<FichaDePrancha[]> {
  const res = await fetch(`/api/pranchas?${qs({ projeto })}`, { cache: "no-store" });
  if (!res.ok) throw await erroDe(res);
  return ((await res.json()) as { pranchas: FichaDePrancha[] }).pranchas;
}


export function enviarPrancha(projeto: string, file: File): Promise<FichaDePrancha> {
  /*
   * GRANDE DEMAIS NÃO SAI DAQUI: subir 41 MB para ouvir "não cabe" é pagar a
   * viagem inteira por uma resposta que já se sabe. E é recusa, não falha de
   * rede — `comTentativas` não repete.
   */
  // O mesmo teto do servidor ([[lib/limite-do-anexo.ts]]); aqui ele poupa a viagem.
  if (file.size > LIMITE_DO_ARQUIVO_BYTES) {
    return Promise.reject(new EnvioRecusado(413, `${file.name} passa de 40 MB e não pode ser guardada.`));
  }
  return comTentativas(async () => {
    const res = await fetch(`/api/pranchas?${qs({ projeto, nome: file.name })}`, {
      method: "POST",
      headers: { "Content-Type": "application/pdf" },
      body: file,
    });
    if (!res.ok) throw await erroDe(res);
    return ((await res.json()) as { prancha: FichaDePrancha }).prancha;
  });
}

/** Os bytes de uma prancha guardada, como `File` — para o visor, a releitura e a conferência. */
export async function baixarPrancha(ficha: { name: string; checksum: string }): Promise<File> {
  const res = await fetch(`/api/arquivos/${ficha.checksum}`);
  if (!res.ok) throw new Error(`Não consegui abrir ${ficha.name} do servidor.`);
  return new File([await res.blob()], ficha.name, { type: "application/pdf" });
}

export async function removerFicha(projeto: string, nome: string): Promise<void> {
  const res = await fetch(`/api/pranchas?${qs({ projeto, nome })}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw await erroDe(res);
}
