// Rotas simuladas de um parecer com fila de achados (auditoria "ux-t11"):
// feedback com estados variados, membros, conversa, envolvidos, atribuir e
// avisar. Nada toca o banco; nenhum e-mail sai. Usado por prova-achados e
// prova-leitura-estreita.
import { montarFixtures } from "./fixtures.mjs";

const fx = await montarFixtures();
const corpoOk = { status: "COMPLETED", report: fx.report, result: "", arquivos: fx.arquivos };
const EU = "ux@nexodoc.local";
export const MILTON = "milton@ux.local";
const agora = new Date("2026-09-28T13:00:00Z").toISOString();
const feedback = [
  { id: "f1", findingId: "INC-001", verdict: null, resolvedAt: null, note: "", assigneeEmail: EU, assigneeName: "UX Teste", resolutionKind: null, resolvedByName: null, comentarios: 0, assignedAt: agora },
  { id: "f2", findingId: "INC-002", verdict: null, resolvedAt: null, note: "", assigneeEmail: MILTON, assigneeName: "Milton Teste", resolutionKind: null, resolvedByName: null, comentarios: 3, assignedAt: agora },
  { id: "f3", findingId: "INC-003", verdict: null, resolvedAt: agora, note: "", assigneeEmail: null, assigneeName: null, resolutionKind: "FIXED_IN_DOC", resolvedByName: "Carla Teste", comentarios: 0 },
  { id: "f4", findingId: "INC-004", verdict: null, resolvedAt: agora, note: "aprovado pelo CBM em 12/08", assigneeEmail: null, assigneeName: null, resolutionKind: "ACCEPTED_RISK", resolvedByName: "Carla Teste", comentarios: 0 },
  { id: "f5", findingId: "INC-005", verdict: "CONFIRMED", resolvedAt: null, note: "", assigneeEmail: null, assigneeName: null, resolutionKind: null, resolvedByName: null, comentarios: 0 },
];
const membros = [
  { email: MILTON, name: "Milton Teste", status: "ACTIVE", grupo: null },
  { email: EU, name: "UX Teste", status: "ACTIVE", grupo: null },
];
export const linha = (quem, body, t) => ({ kind: "comentario", quem, frase: "", body, createdAt: t, ehEvento: false });
export const conversa = [linha("Milton Teste", "vou olhar amanhã", 1), linha("UX Teste", "obrigado", 2), linha("Milton Teste", "é a página 14", 3)];

export const registro = { conversaGet: 0, postsComentario: [], envolvidos: 0, atribuir: [], feedbackPost: [], avisarPost: 0 };
export const controle = { falharComentario: true };

export async function simular(page) {
  await page.route(/\/api\/audits\/ux-[a-z0-9-]+$/, (r) => r.fulfill({ json: corpoOk }));
  await page.route(`**/api/arquivos/${fx.mem.sha}`, (r) => r.fulfill({ body: fx.mem.bytes, contentType: "application/pdf" }));
  await page.route(`**/api/arquivos/${fx.orc.sha}`, (r) => r.fulfill({ body: fx.orc.bytes, contentType: "application/pdf" }));
  await page.route("**/api/organizacao/membros", (r) => r.fulfill({ json: { membros } }));
  await page.route("**/api/audits/ux-t11/feedback", async (r) => {
    if (r.request().method() === "POST") {
      registro.feedbackPost.push(r.request().postDataJSON());
      return r.fulfill({ json: { feedback: {} } });
    }
    return r.fulfill({ json: { feedback, euSou: EU } });
  });
  await page.route("**/api/audits/ux-t11/avisar", async (r) => {
    if (r.request().method() === "POST") {
      registro.avisarPost++;
      return r.fulfill({ json: { estado: "gravado", avisados: [{ email: MILTON, nome: "Milton Teste", quantidade: 1, convidado: false }], falharam: [] } });
    }
    return r.fulfill({ json: { pendentes: registro.avisarPost ? [] : [{ email: MILTON, nome: "Milton Teste", quantidade: 1, convidado: false }] } });
  });
  await page.route("**/api/audits/ux-t11/atribuir", async (r) => {
    const corpo = r.request().postDataJSON();
    registro.atribuir.push(corpo);
    return r.fulfill({ status: 201, json: { atribuidos: corpo.findingIds.length } });
  });
  await page.route(/\/api\/audits\/ux-t11\/achados\/[^/]+\/conversa$/, async (r) => {
    if (r.request().method() === "POST") {
      registro.postsComentario.push(r.request().postDataJSON());
      if (controle.falharComentario) return r.fulfill({ status: 500, json: { error: "Falha simulada do servidor" } });
      conversa.push(linha("UX Teste", r.request().postDataJSON().body, 9));
      return r.fulfill({ status: 201, json: { ok: true } });
    }
    registro.conversaGet++;
    return r.fulfill({ json: { linhas: conversa, envolvidos: [] } });
  });
  await page.route(/\/api\/audits\/ux-t11\/achados\/[^/]+\/envolvidos$/, async (r) => {
    registro.envolvidos++;
    return r.fulfill({ status: 403, json: { error: "Você não pode mexer em quem acompanha este achado" } });
  });
}

export { fx };
