/**
 * O PESO DO VOLUME — Parte 9 do desenho da montagem (implementada 09/10/2026).
 *
 * Duas passadas, de naturezas diferentes:
 *
 * 1. SEM PERDA, sempre: blocos repetidos (mesmo dicionário e mesmo conteúdo)
 *    viram um só. Juntar pranchas copia a mesma fonte em cada uma; no 040-26
 *    vol. 5 isso eram 2,5 MB de repetição (22,2 → 20,4 MB). Nada no desenho
 *    muda: são os mesmos bytes, apontados de mais de um lugar.
 *
 * 2. COM PERDA, só quando pedida: as imagens JPEG (`/DCTDecode`, puro ou
 *    depois de `/FlateDecode`) são recomprimidas com qualidade 60 (mozjpeg),
 *    no mesmo tamanho em pixels. Texto, vetor e carimbo não são tocados — o
 *    carimbo do escritório é texto e linha. No 040-26 vol. 5 (88% JPEG):
 *    20,4 → 14,1 MB; à mão, o escritório chegava a 15,3. Só RGB e cinza sem
 *    `/Decode`: CMYK e espaços com paleta ficam como estão (recomprimir mudaria
 *    a cor). Imagem que não rende pelo menos 5% fica a original.
 *
 * Ghostscript fica de fora de propósito: regrava o PDF inteiro e não está no
 * container.
 */
import crypto from "node:crypto";
import zlib from "node:zlib";

import { PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, PDFRawStream, PDFRef } from "pdf-lib";

export interface PdfOtimizado {
  bytes: Uint8Array;
  antes: number;
  depois: number;
  /** Bytes em imagem JPEG no PDF ANTES de comprimir — a base da estimativa. */
  emJpeg: number;
  duplicados: number;
  imagensComprimidas: number;
}

const QUALIDADE = 60;

function filtros(d: PDFDict): string[] {
  const f = d.get(PDFName.of("Filter"));
  if (f instanceof PDFArray) return f.asArray().map(String);
  return f ? [String(f)] : [];
}

function ehJpeg(obj: PDFRawStream): boolean {
  if (obj.dict.get(PDFName.of("Subtype")) !== PDFName.of("Image")) return false;
  const f = filtros(obj.dict);
  return f[f.length - 1] === "/DCTDecode";
}

/** Bytes em JPEG — para a estimativa de quanto comprimir pode render. */
export function bytesEmJpeg(doc: PDFDocument): number {
  let total = 0;
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFRawStream && ehJpeg(obj)) total += obj.contents.length;
  }
  return total;
}

async function comprimirImagens(doc: PDFDocument): Promise<number> {
  const { default: sharp } = await import("sharp");
  const ctx = doc.context;
  let trocadas = 0;
  for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream) || !ehJpeg(obj)) continue;
    const d = obj.dict;
    if (d.get(PDFName.of("Decode"))) continue;
    const cs = d.get(PDFName.of("ColorSpace"));
    const espaco = cs instanceof PDFName ? cs.asString() : "";
    if (espaco !== "/DeviceRGB" && espaco !== "/DeviceGray") continue;
    const f = filtros(d);
    let jpeg: Buffer;
    if (f.length === 1) jpeg = Buffer.from(obj.contents);
    else if (f.length === 2 && f[0] === "/FlateDecode") jpeg = zlib.inflateSync(Buffer.from(obj.contents));
    else continue;
    try {
      let p = sharp(jpeg);
      if (espaco === "/DeviceGray") p = p.toColourspace("b-w");
      const novo = await p.jpeg({ quality: QUALIDADE, mozjpeg: true }).toBuffer();
      if (novo.length >= obj.contents.length * 0.95) continue;
      const nd = d.clone(ctx);
      nd.set(PDFName.of("Filter"), PDFName.of("DCTDecode"));
      nd.delete(PDFName.of("DecodeParms"));
      nd.set(PDFName.of("Length"), PDFNumber.of(novo.length));
      ctx.assign(ref, PDFRawStream.of(nd, new Uint8Array(novo)));
      trocadas++;
    } catch {
      // Imagem que o decodificador não abre fica como está: melhor pesada do que quebrada.
    }
  }
  return trocadas;
}

/** Une blocos idênticos (dicionário + conteúdo) e reaponta as referências. */
function semRepeticao(doc: PDFDocument): number {
  const ctx = doc.context;
  const primeiro = new Map<string, PDFRef>();
  const troca = new Map<string, PDFRef>();
  for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const chave = crypto.createHash("sha1").update(obj.dict.toString()).update(obj.contents).digest("hex");
    const ja = primeiro.get(chave);
    if (ja) troca.set(ref.tag, ja);
    else primeiro.set(chave, ref);
  }
  if (troca.size === 0) return 0;
  const reapontar = (o: unknown): void => {
    if (o instanceof PDFDict) {
      for (const [k, v] of o.entries()) {
        if (v instanceof PDFRef && troca.has(v.tag)) o.set(k, troca.get(v.tag)!);
        else reapontar(v);
      }
    } else if (o instanceof PDFArray) {
      for (let i = 0; i < o.size(); i++) {
        const v = o.get(i);
        if (v instanceof PDFRef && troca.has(v.tag)) o.set(i, troca.get(v.tag)!);
        else reapontar(v);
      }
    } else if (o instanceof PDFRawStream) {
      reapontar(o.dict);
    }
  };
  for (const [, obj] of ctx.enumerateIndirectObjects()) reapontar(obj);
  reapontar(ctx.trailerInfo.Root);
  for (const [ref] of [...ctx.enumerateIndirectObjects()]) if (troca.has(ref.tag)) ctx.delete(ref);
  return troca.size;
}

export async function otimizarPdf(
  bytes: Uint8Array,
  opcoes: { comprimirImagens: boolean },
): Promise<PdfOtimizado> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const emJpeg = bytesEmJpeg(doc);
  const imagensComprimidas = opcoes.comprimirImagens ? await comprimirImagens(doc) : 0;
  const duplicados = semRepeticao(doc);
  const saida = await doc.save({ useObjectStreams: true });
  // Nunca devolve maior do que entrou: a otimização que não rende é descartada.
  const melhor = saida.length < bytes.length ? saida : bytes;
  return {
    bytes: melhor,
    antes: bytes.length,
    depois: melhor.length,
    emJpeg,
    duplicados,
    imagensComprimidas,
  };
}
