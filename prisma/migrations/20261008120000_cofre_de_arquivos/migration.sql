-- O cofre de arquivos: bytes podem morar num bucket privado, e passam a ser cifrados pelo Nexo.
ALTER TABLE "StoredFile" ALTER COLUMN "bytes" DROP NOT NULL;
ALTER TABLE "StoredFile" ADD COLUMN "onde" TEXT NOT NULL DEFAULT 'postgres';
ALTER TABLE "StoredFile" ADD COLUMN "cifrado" BOOLEAN NOT NULL DEFAULT false;
