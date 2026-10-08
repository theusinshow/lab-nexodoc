/**
 * PASSA O COFRE A LIMPO: cifra o que foi guardado antes da chave existir e,
 * com bucket configurado, muda os bytes do Postgres para lá (08/10/2026).
 *
 * Uso (com as variáveis do ambiente ALVO — em produção, as do Railway):
 *   node scripts/cofre-cifrar.ts            # só mostra o que faria
 *   node scripts/cofre-cifrar.ts --aplicar  # faz
 *
 * Idempotente: linha já cifrada (e já no lugar certo) é pulada. Uma linha por
 * vez, cada uma confirmada lendo de volta antes de apagar a cópia antiga.
 */
import { existsSync, readFileSync } from "node:fs";

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

import { chaveDoCofre, cifrar, decifrar, estaCifrado } from "../lib/cofre-cifra.ts";

if (existsSync(".env.local")) {
  for (const linha of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(linha.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const aplicar = process.argv.includes("--aplicar");
const chave = chaveDoCofre(process.env.NEXODOC_COFRE_CHAVE);
if (!chave) {
  console.error("Sem NEXODOC_COFRE_CHAVE: não há com que cifrar. Gere uma e configure antes.");
  process.exit(1);
}
const paraBucket = process.env.NEXODOC_STORAGE_PROVIDER?.trim() === "s3";
const bucket = process.env.NEXODOC_S3_BUCKET?.trim() ?? "";
const s3 = paraBucket
  ? new S3Client({
      endpoint: process.env.NEXODOC_S3_ENDPOINT,
      region: process.env.NEXODOC_S3_REGION?.trim() || "auto",
      credentials: { accessKeyId: process.env.NEXODOC_S3_ACCESS_KEY_ID ?? "", secretAccessKey: process.env.NEXODOC_S3_SECRET_ACCESS_KEY ?? "" },
      forcePathStyle: true,
    })
  : null;

const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })) });

const pendentes = await prisma.storedFile.findMany({
  where: paraBucket ? { OR: [{ cifrado: false }, { onde: "postgres" }] } : { cifrado: false, onde: "postgres" },
  select: { checksumSha256: true, organizationId: true, sizeBytes: true, onde: true, cifrado: true },
});
const mb = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;
console.log(`${pendentes.length} arquivo(s), ${mb(pendentes.reduce((s, p) => s + p.sizeBytes, 0))} — ${paraBucket ? "cifrar e mover para o bucket" : "cifrar no Postgres"}${aplicar ? "" : " (simulação; use --aplicar)"}`);

let feitos = 0;
for (const p of pendentes) {
  if (!aplicar) continue;
  if (p.onde === "s3" && !paraBucket) continue;
  const linha = await prisma.storedFile.findUniqueOrThrow({ where: { checksumSha256: p.checksumSha256 }, select: { bytes: true } });
  let atual: Buffer;
  if (p.onde === "s3") {
    const r = await s3!.send(new GetObjectCommand({ Bucket: bucket, Key: `${p.organizationId}/${p.checksumSha256}` }));
    atual = Buffer.from(await r.Body!.transformToByteArray());
  } else {
    atual = Buffer.from(linha.bytes!);
  }
  const claro = estaCifrado(atual) ? decifrar(atual, chave) : atual;
  const cifrado = estaCifrado(atual) ? atual : cifrar(claro, chave);
  // Confere antes de trocar: o que vai ser gravado tem que voltar igual.
  if (!decifrar(cifrado, chave).equals(claro)) throw new Error(`conferência falhou em ${p.checksumSha256}`);

  if (paraBucket) {
    await s3!.send(new PutObjectCommand({ Bucket: bucket, Key: `${p.organizationId}/${p.checksumSha256}`, Body: cifrado, ContentType: "application/octet-stream" }));
    await prisma.storedFile.update({ where: { checksumSha256: p.checksumSha256 }, data: { onde: "s3", cifrado: true, bytes: null } });
    await prisma.documentArtifact.updateMany({ where: { storageKey: p.checksumSha256, storageProvider: "postgres" }, data: { storageProvider: "s3" } });
    await prisma.projectUpload.updateMany({ where: { storageKey: p.checksumSha256, storageProvider: "postgres" }, data: { storageProvider: "s3" } });
  } else {
    await prisma.storedFile.update({ where: { checksumSha256: p.checksumSha256 }, data: { cifrado: true, bytes: new Uint8Array(cifrado) } });
  }
  feitos++;
  console.log(`  ok  ${p.checksumSha256.slice(0, 12)}… ${mb(p.sizeBytes)}`);
}

if (aplicar) console.log(`\n${feitos} arquivo(s) passados a limpo.`);
await prisma.$disconnect();
