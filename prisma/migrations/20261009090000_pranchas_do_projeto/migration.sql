-- As pranchas guardadas por projeto (09/10/2026). Os bytes moram no cofre.
CREATE TABLE "PranchaDoProjeto" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "paginas" INTEGER NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "enviadaPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PranchaDoProjeto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PranchaDoProjeto_projectId_fileName_key" ON "PranchaDoProjeto"("projectId", "fileName");
CREATE INDEX "PranchaDoProjeto_checksumSha256_idx" ON "PranchaDoProjeto"("checksumSha256");

ALTER TABLE "PranchaDoProjeto" ADD CONSTRAINT "PranchaDoProjeto_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
