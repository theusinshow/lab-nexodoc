-- A identidade guardada do projeto (09/10/2026). Ver lib/identidade-do-projeto.ts.
ALTER TABLE "Project" ADD COLUMN "identidade" JSONB NOT NULL DEFAULT '{}';
