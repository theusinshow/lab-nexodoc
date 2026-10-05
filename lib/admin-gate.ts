/**
 * A REGRA DE ENTRADA DE `/api/admin/*`, num lugar só.
 *
 * Ela morava copiada em sete rotas — sete cópias do mesmo `getBearerToken` e da
 * mesma comparação. Sete cópias é a forma exata que deixa a oitava sair errada,
 * e "errada" aqui significa painel administrativo aberto.
 *
 * A SESSÃO precisa ser de administrador de plataforma — e-mail da lista do
 * ambiente ou `role: ADMIN` no cadastro. É a mesma regra das páginas de
 * `/admin` (`app/admin/layout.tsx`).
 *
 * O TOKEN SAIU (05/10/2026, a pedido): era um segundo fator digitado à mão no
 * pé do trilho, e quem é administrador no cadastro tinha que pedi-lo a alguém
 * para usar o próprio painel. Agora ser admin basta.
 *
 * Devolve um resultado em vez de uma `Response` porque as rotas formatam erro de
 * jeitos diferentes — algumas embrulham CORS, outras não. Impor um formato aqui
 * mudaria silenciosamente o contrato de metade delas.
 */
import { requirePlatformAdmin } from "@/lib/access-control";
import { AccessDenied } from "@/lib/actor";
import { isDatabaseConfigured } from "@/lib/db";

export type AdminGateResult =
  | { ok: true; email: string }
  | { ok: false; status: number; message: string };

// `request` fica na assinatura: as rotas já a passam, e a regra pode voltar a
// olhar o pedido sem mexer em todas elas.
export async function checkAdminRequest(_request: Request): Promise<AdminGateResult> {
  /*
   * A sessão primeiro. Se a pessoa não é administrador, dizer "token inválido"
   * a ensinaria que existe um token a adivinhar.
   */
  let email: string;
  try {
    const admin = await requirePlatformAdmin();
    email = admin.email;
  } catch (err) {
    if (err instanceof AccessDenied) {
      return { ok: false, status: err.status, message: err.message };
    }
    throw err;
  }

  if (!isDatabaseConfigured()) {
    return { ok: false, status: 500, message: "DATABASE_URL não configurada." };
  }

  return { ok: true, email };
}
