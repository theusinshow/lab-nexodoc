-- O suporte: chamados (manuais e automáticos) e as mensagens de cada um (08/10/2026).
CREATE TYPE "OrigemDoChamado" AS ENUM ('MANUAL', 'ERRO_CLIENTE', 'ERRO_SERVIDOR');
CREATE TYPE "CategoriaDoChamado" AS ENUM ('ERRO', 'SUGESTAO', 'DUVIDA');
CREATE TYPE "StatusDoChamado" AS ENUM ('ABERTO', 'EM_ANALISE', 'RESOLVIDO');
CREATE TYPE "PapelNoChamado" AS ENUM ('USUARIO', 'DEV');

CREATE TABLE "ChamadoDeSuporte" (
    "id" TEXT NOT NULL,
    "protocolo" SERIAL NOT NULL,
    "origem" "OrigemDoChamado" NOT NULL,
    "categoria" "CategoriaDoChamado" NOT NULL DEFAULT 'ERRO',
    "status" "StatusDoChamado" NOT NULL DEFAULT 'ABERTO',
    "email" TEXT,
    "nome" TEXT,
    "organizationId" TEXT,
    "rota" TEXT NOT NULL,
    "digest" TEXT,
    "impressao" TEXT,
    "ocorrencias" INTEGER NOT NULL DEFAULT 1,
    "ultimaOcorrencia" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contexto" JSONB NOT NULL,
    "printChecksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChamadoDeSuporte_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MensagemDoChamado" (
    "id" TEXT NOT NULL,
    "chamadoId" TEXT NOT NULL,
    "papel" "PapelNoChamado" NOT NULL,
    "autorEmail" TEXT,
    "autorNome" TEXT,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensagemDoChamado_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChamadoDeSuporte_protocolo_key" ON "ChamadoDeSuporte"("protocolo");
CREATE INDEX "ChamadoDeSuporte_impressao_idx" ON "ChamadoDeSuporte"("impressao");
CREATE INDEX "ChamadoDeSuporte_status_ultimaOcorrencia_idx" ON "ChamadoDeSuporte"("status", "ultimaOcorrencia");
CREATE INDEX "ChamadoDeSuporte_email_createdAt_idx" ON "ChamadoDeSuporte"("email", "createdAt");
CREATE INDEX "ChamadoDeSuporte_origem_createdAt_idx" ON "ChamadoDeSuporte"("origem", "createdAt");
CREATE INDEX "MensagemDoChamado_chamadoId_createdAt_idx" ON "MensagemDoChamado"("chamadoId", "createdAt");

ALTER TABLE "MensagemDoChamado" ADD CONSTRAINT "MensagemDoChamado_chamadoId_fkey" FOREIGN KEY ("chamadoId") REFERENCES "ChamadoDeSuporte"("id") ON DELETE CASCADE ON UPDATE CASCADE;
