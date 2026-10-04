-- O acesso de cada pessoa, um dia por linha, e as recusas de acesso (03/10/2026).
CREATE TABLE "AcessoDiario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dia" TEXT NOT NULL,
    "primeiro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "marcas" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AcessoDiario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecusaDeAcesso" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecusaDeAcesso_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AcessoDiario_email_dia_key" ON "AcessoDiario"("email", "dia");
CREATE INDEX "AcessoDiario_dia_idx" ON "AcessoDiario"("dia");
CREATE INDEX "AcessoDiario_email_ultimo_idx" ON "AcessoDiario"("email", "ultimo");
CREATE INDEX "RecusaDeAcesso_createdAt_idx" ON "RecusaDeAcesso"("createdAt");
CREATE INDEX "RecusaDeAcesso_email_createdAt_idx" ON "RecusaDeAcesso"("email", "createdAt");
