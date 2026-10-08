/**
 * O COFRE DE ARQUIVOS DO NEXO — onde moram os bytes de tudo que o escritório
 * produz e envia (08/10/2026).
 *
 * DOIS LUGARES, UMA REGRA DE ACESSO:
 *
 *  - "postgres" (padrão): os bytes numa coluna de `StoredFile`. Bom para
 *    memorial, LD e capa; ruim para volume (média de 17 MB, até 43 MB medidos),
 *    que incha o banco e cada backup dele. Por isso tem teto.
 *  - "s3": um bucket PRIVADO compatível com S3 (Cloudflare R2, Railway Buckets).
 *    Sem acesso público, sem link direto: o bucket só fala com o servidor do
 *    Nexo, com uma chave que só o servidor tem.
 *
 * Nos dois, quem entrega os bytes é SEMPRE uma rota do Nexo que confere o
 * escritório na própria consulta (`/api/arquivos/<checksum>`,
 * `/api/artefatos/<id>`). Não existe URL do bucket que funcione fora dela.
 *
 * E nos dois os bytes vão cifrados quando há `NEXODOC_COFRE_CHAVE`
 * ([[cofre-cifra.ts]]): quem copiar o banco ou o bucket leva ruído.
 *
 * A linha de `StoredFile` existe nos dois casos: é ela que guarda o dono
 * (`organizationId`) e diz onde estão os bytes.
 */
import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { chaveDoCofre, cifrar, decifrar, estaCifrado } from "@/lib/cofre-cifra";
import { getPrisma } from "@/lib/db";
import { getChecksumSha256 } from "@/lib/project-store";

export type OndeNoCofre = "postgres" | "s3";

/** Teto por arquivo em cada lugar. O do Postgres é o mesmo do anexo (40 MiB). */
export const TETO_DO_COFRE: Record<OndeNoCofre, number> = {
  postgres: 40 * 1024 * 1024,
  s3: 300 * 1024 * 1024,
};

function ondeConfigurado(): OndeNoCofre {
  return process.env.NEXODOC_STORAGE_PROVIDER?.trim() === "s3" ? "s3" : "postgres";
}

let avisouSemChave = false;
function chave(): Buffer | null {
  const c = chaveDoCofre(process.env.NEXODOC_COFRE_CHAVE);
  if (!c && !avisouSemChave && process.env.NODE_ENV === "production") {
    avisouSemChave = true;
    console.warn("[cofre] NEXODOC_COFRE_CHAVE ausente: arquivos estão sendo gravados SEM a cifra do Nexo.");
  }
  return c;
}

let cliente: S3Client | null = null;
function s3() {
  const endpoint = process.env.NEXODOC_S3_ENDPOINT?.trim();
  const bucket = process.env.NEXODOC_S3_BUCKET?.trim();
  const accessKeyId = process.env.NEXODOC_S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.NEXODOC_S3_SECRET_ACCESS_KEY?.trim();
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("NEXODOC_STORAGE_PROVIDER=s3 exige NEXODOC_S3_ENDPOINT, NEXODOC_S3_BUCKET, NEXODOC_S3_ACCESS_KEY_ID e NEXODOC_S3_SECRET_ACCESS_KEY.");
  }
  cliente ??= new S3Client({
    endpoint,
    region: process.env.NEXODOC_S3_REGION?.trim() || "auto",
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
  return { cliente, bucket };
}

/** A chave do objeto: o escritório na frente, para o bucket nunca misturar donos. */
const chaveDoObjeto = (organizationId: string, checksum: string) => `${organizationId}/${checksum}`;

export class ArquivoGrandeDemais extends Error {
  readonly sizeBytes: number;
  constructor(sizeBytes: number, onde: OndeNoCofre) {
    super(`Arquivo de ${(sizeBytes / 1024 / 1024).toFixed(1)} MB passa do teto do cofre em ${onde}.`);
    this.name = "ArquivoGrandeDemais";
    this.sizeBytes = sizeBytes;
  }
}

/**
 * Guarda os bytes. Idempotente pelo conteúdo: o mesmo arquivo duas vezes é a
 * mesma linha (e o mesmo objeto).
 */
export async function guardarNoCofre(args: {
  bytes: Uint8Array;
  organizationId: string;
  mimeType: string;
}): Promise<{ checksumSha256: string; sizeBytes: number; onde: OndeNoCofre }> {
  const claro = Buffer.from(args.bytes);
  const checksumSha256 = getChecksumSha256(claro);
  const prisma = getPrisma();

  const existente = await prisma.storedFile.findUnique({ where: { checksumSha256 }, select: { onde: true } });
  if (existente) return { checksumSha256, sizeBytes: claro.byteLength, onde: existente.onde as OndeNoCofre };

  const onde = ondeConfigurado();
  if (claro.byteLength > TETO_DO_COFRE[onde]) throw new ArquivoGrandeDemais(claro.byteLength, onde);

  const k = chave();
  const gravado = k ? cifrar(claro, k) : claro;

  if (onde === "s3") {
    const { cliente: c, bucket } = s3();
    await c.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: chaveDoObjeto(args.organizationId, checksumSha256),
        Body: gravado,
        // O tipo real só existe aqui dentro; para o bucket é um blob opaco.
        ContentType: "application/octet-stream",
      }),
    );
  }

  await prisma.storedFile.upsert({
    where: { checksumSha256 },
    create: {
      checksumSha256,
      organizationId: args.organizationId,
      mimeType: args.mimeType,
      sizeBytes: claro.byteLength,
      bytes: onde === "postgres" ? new Uint8Array(gravado) : null,
      onde,
      cifrado: Boolean(k),
    },
    update: {},
  });

  return { checksumSha256, sizeBytes: claro.byteLength, onde };
}

/**
 * Os bytes em claro, SÓ se o arquivo é do escritório pedido. `null` para
 * inexistente e para alheio — a rota responde 404 aos dois.
 */
export async function lerDoCofre(checksum: string, organizationId: string): Promise<{ bytes: Buffer; mimeType: string } | null> {
  const linha = await getPrisma().storedFile.findFirst({
    where: { checksumSha256: checksum.toLowerCase(), organizationId },
    select: { bytes: true, mimeType: true, onde: true, cifrado: true, checksumSha256: true },
  });
  if (!linha) return null;

  let gravado: Buffer;
  if (linha.onde === "s3") {
    const { cliente: c, bucket } = s3();
    const r = await c.send(new GetObjectCommand({ Bucket: bucket, Key: chaveDoObjeto(organizationId, linha.checksumSha256) }));
    gravado = Buffer.from(await r.Body!.transformToByteArray());
  } else {
    if (!linha.bytes) return null;
    gravado = Buffer.from(linha.bytes);
  }

  if (!linha.cifrado && !estaCifrado(gravado)) return { bytes: gravado, mimeType: linha.mimeType };
  const k = chave();
  if (!k) throw new Error("Arquivo cifrado no cofre, mas NEXODOC_COFRE_CHAVE não está configurada.");
  return { bytes: decifrar(gravado, k), mimeType: linha.mimeType };
}

/** Apaga do bucket os objetos destas linhas (o expurgo apaga as linhas). */
export async function apagarDoBucket(linhas: { checksumSha256: string; organizationId: string; onde: string }[]) {
  const doBucket = linhas.filter((l) => l.onde === "s3");
  if (!doBucket.length) return;
  const { cliente: c, bucket } = s3();
  for (let i = 0; i < doBucket.length; i += 1000) {
    await c.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: doBucket.slice(i, i + 1000).map((l) => ({ Key: chaveDoObjeto(l.organizationId, l.checksumSha256) })) },
      }),
    );
  }
}
