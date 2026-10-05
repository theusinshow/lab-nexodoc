-- A gravidade que quem revisa sugere quando vota "gravidade errada" (05/10/2026).
-- "MAIS_GRAVE" | "MENOS_GRAVE"; nulo = sem sugestão. Só acrescenta: nada existente muda.
ALTER TABLE "AuditFeedback" ADD COLUMN "severidadeSugerida" TEXT;
