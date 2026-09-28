import { redirect } from "next/navigation";

import { lerContextoDaUrl, linkDoNexo } from "@/lib/contexto-da-url";

/**
 * `/audit` foi APOSENTADA — a auditoria mora no Nexo.
 *
 * Durante um tempo houve duas telas para o mesmo motor, e elas divergiram: a de
 * cá nunca ganhou progresso real, cancelar, gabarito completo nem retomada
 * depois de um F5. Manter as duas significava que metade dos clientes veria a
 * versão pior por acidente de link antigo.
 *
 * O redirecionamento preserva o projeto (`?project=` ou `?projeto=`): quem chegar por um link salvo cai no
 * lugar certo em vez de numa página que some. O HISTÓRICO não se perde — as
 * auditorias continuam no banco, e o painel administrativo (`/admin/audits`)
 * segue listando tudo.
 *
 * O componente de relatório (`components/audit-result`) NÃO era exclusivo desta
 * página: é o mesmo que o palco do Nexo monta. Por isso aposentar aqui não custa
 * o visor de PDF, a matriz por disciplina nem as camadas de confiança.
 */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  /*
   * O redirecionamento ia para `/nexo?project=`, que o Nexo não lia: o link
   * "Auditar documentos" do projeto chegava à saudação genérica (auditoria
   * UX/UI, G03). Agora vai no contrato canônico, com a intenção de auditar.
   */
  const { projeto } = lerContextoDaUrl({
    get: (nome) => {
      const v = params[nome];
      return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
    },
  });
  redirect(linkDoNexo({ projeto, intencao: "auditar" }));
}
