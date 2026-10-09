/**
 * AS REGRAS DA ENTRADA das pranchas guardadas (09/10/2026), puras: sem `@/`,
 * sem Prisma, testadas em node cru por `scripts/test-pranchas.ts`.
 *
 * Moram fora da rota porque a rota é o lugar onde um `early return` novo
 * escorrega por baixo de uma checagem. Aqui cada portão é uma função com teste.
 */

import { LIMITE_DO_ARQUIVO_BYTES } from "../limite-do-anexo.ts";

/** O mesmo teto dos anexos ([[lib/limite-do-anexo.ts]]): uma régua só. */
export const TETO_DA_PRANCHA_BYTES = LIMITE_DO_ARQUIVO_BYTES;

/**
 * A trava por projeto. O 084-25 inteiro tem ~180 MB de pranchas; 2 GB é dez
 * vezes isso — só um bug em laço ou um abuso chega lá.
 */
export const COTA_DO_PROJETO_BYTES = 2 * 1024 ** 3;

export const CHECKSUM = /^[a-f0-9]{64}$/;

const ASSINATURA = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

/**
 * É PDF pelo conteúdo, não pela extensão. O cabeçalho pode vir depois de um
 * pouco de lixo (até 1 KB) — o pdf.js aceita, e prancha exportada por plotter
 * às vezes vem assim. A abertura pela pdf-lib, na rota, é o segundo portão.
 */
export function ehPdf(bytes: Uint8Array): boolean {
  const limite = Math.min(bytes.length - ASSINATURA.length, 1024);
  for (let i = 0; i <= limite; i++) {
    let casa = true;
    for (let j = 0; j < ASSINATURA.length; j++) {
      if (bytes[i + j] !== ASSINATURA[j]) {
        casa = false;
        break;
      }
    }
    if (casa) return true;
  }
  return false;
}

/**
 * Lê o corpo contando. Passou do teto, PARA de ler e recusa: o servidor nunca
 * segura mais que `teto` bytes de um pedido, diga o `Content-Length` o que
 * disser.
 */
export async function lerComTeto(
  corpo: ReadableStream<Uint8Array> | null,
  teto: number,
): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; motivo: "vazio" | "grande-demais" }> {
  if (!corpo) return { ok: false, motivo: "vazio" };
  const leitor = corpo.getReader();
  const pedacos: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > teto) {
      await leitor.cancel().catch(() => {});
      return { ok: false, motivo: "grande-demais" };
    }
    pedacos.push(value);
  }
  if (total === 0) return { ok: false, motivo: "vazio" };
  const bytes = new Uint8Array(total);
  let pos = 0;
  for (const p of pedacos) {
    bytes.set(p, pos);
    pos += p.byteLength;
  }
  return { ok: true, bytes };
}

export function cabeNaCota(usado: number, novo: number, cota = COTA_DO_PROJETO_BYTES): boolean {
  return usado + novo <= cota;
}

/**
 * O nome que vira chave da ficha. Sem barra nenhuma: o nome é identidade dentro
 * do projeto, nunca caminho — e é o que o cartão mostra.
 */
export function nomeDePrancha(bruto: string | null): string | null {
  const nome = bruto?.trim() ?? "";
  if (!nome || nome.length > 255) return null;
  if (/[\\/]/.test(nome)) return null;
  if (!/\.pdf$/i.test(nome)) return null;
  return nome;
}

/** Os NOMES pedidos na montagem cujo checksum não tem ficha no projeto. */
export function faltantes(
  pedidas: readonly { checksum: string; nome: string }[],
  guardadas: Iterable<string>,
): string[] {
  const tem = new Set(guardadas);
  const nomes = new Set<string>();
  for (const p of pedidas) if (!tem.has(p.checksum)) nomes.add(p.nome);
  return [...nomes];
}
