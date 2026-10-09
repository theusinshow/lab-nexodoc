/**
 * A CIFRA DO COFRE — os bytes saem do Nexo já cifrados (08/10/2026).
 *
 * Memorial, LD, capa e volume de obra pública ainda não publicada são o que o
 * escritório não pode deixar vazar. O provedor do banco e o do bucket cifram o
 * disco deles; isto cifra ANTES, com uma chave que só o servidor do Nexo tem.
 * Um dump do banco, um backup copiado, uma chave do bucket que escapou: em
 * todos, o que sai é ruído sem a `NEXODOC_COFRE_CHAVE`.
 *
 * Formato: "NXC1" (4 bytes) | iv (12) | tag (16) | texto cifrado. AES-256-GCM:
 * a tag faz um byte trocado no bucket virar erro, e não um PDF adulterado.
 *
 * O checksum do arquivo continua sendo o do TEXTO CLARO — é ele que endereça o
 * arquivo e que a auditoria grava. O iv é aleatório a cada gravação.
 *
 * PERDER A CHAVE É PERDER OS ARQUIVOS. Ela vai para o cofre de senhas do
 * Matheus, não só para a variável do Railway.
 *
 * NÃO TROQUE `NEXODOC_COFRE_CHAVE` NUMA RODADA DE TROCA DE CHAVES. As chaves de
 * API (OpenAI, Resend…) podem ser trocadas a qualquer hora; esta não. Tudo o
 * que está no cofre — memoriais, volumes, prints e pranchas — foi cifrado com
 * ela, e uma chave nova deixa cada arquivo ilegível, em silêncio, até alguém
 * tentar abrir. Trocar exige recifrar todos os objetos antes.
 *
 * Puro: só `node:crypto`, testado em `scripts/test-cofre-cifra.ts`.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const MARCA = Buffer.from("NXC1", "ascii");
const IV = 12;
const TAG = 16;

/** A chave em base64 (32 bytes). `null` quando não há chave configurada. */
export function chaveDoCofre(valor: string | null | undefined): Buffer | null {
  const texto = valor?.trim();
  if (!texto) return null;
  const chave = Buffer.from(texto, "base64");
  if (chave.length !== 32) {
    throw new Error("NEXODOC_COFRE_CHAVE precisa ter 32 bytes em base64 (gere com: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\").");
  }
  return chave;
}

export function estaCifrado(bytes: Uint8Array): boolean {
  return bytes.length >= MARCA.length + IV + TAG && Buffer.from(bytes.subarray(0, MARCA.length)).equals(MARCA);
}

export function cifrar(claro: Uint8Array, chave: Buffer): Buffer {
  const iv = randomBytes(IV);
  const cifra = createCipheriv("aes-256-gcm", chave, iv);
  const corpo = Buffer.concat([cifra.update(claro), cifra.final()]);
  return Buffer.concat([MARCA, iv, cifra.getAuthTag(), corpo]);
}

export function decifrar(cifrado: Uint8Array, chave: Buffer): Buffer {
  if (!estaCifrado(cifrado)) throw new Error("Arquivo do cofre sem a marca de cifra.");
  const b = Buffer.from(cifrado);
  const iv = b.subarray(MARCA.length, MARCA.length + IV);
  const tag = b.subarray(MARCA.length + IV, MARCA.length + IV + TAG);
  const decifra = createDecipheriv("aes-256-gcm", chave, iv);
  decifra.setAuthTag(tag);
  return Buffer.concat([decifra.update(b.subarray(MARCA.length + IV + TAG)), decifra.final()]);
}
