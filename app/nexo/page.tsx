import { redirect } from "next/navigation";

import { Moldura } from "@/components/moldura/moldura";

import { auth } from "@/auth";
import { getUserAccess } from "@/lib/access-control";
import { buildCallbackPath, redirectToLogin } from "@/lib/auth-redirect";
import { lerContextoDaUrl } from "@/lib/contexto-da-url";
import { isDatabaseConfigured } from "@/lib/db";
import { isNexoEnabled } from "@/lib/feature-flags";
import { carregarMoldura } from "@/lib/moldura";
import { assertProjectAccess, getUserActor, normalizeEmail } from "@/lib/project-store";
import type { ProjetoPedido } from "@/modules/nexo/lib/projeto-pedido";
import { NexoWorkspace } from "@/modules/nexo";
import { EVENTO_ABRIR_PALETA } from "@/modules/nexo/lib/evento-da-paleta";

export default async function NexoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Kill-switch: com a flag desligada, a rota nem existe pro usuario.
  if (!isNexoEnabled()) {
    redirect("/");
  }

  const params = await searchParams;
  const session = await auth();

  if (!session?.user) {
    /*
     * O DESTINO INTEIRO, e não só `/nexo`.
     *
     * Esta linha era `redirectToLogin("/nexo")`, e a query morria no caminho:
     * quem chegava em `/nexo?auditoria=xyz` sem sessão voltava do login no Nexo
     * GENÉRICO, sem o parecer que foi buscar. Ninguém notava, porque quem já
     * estava logado nunca passava por aqui.
     *
     * Passou a importar quando o aviso por e-mail ([[lib/aviso-de-achados]])
     * começou a mandar exatamente esse endereço para gente que NUNCA ENTROU no
     * sistema — a pessoa para quem o link é a única forma de encontrar o
     * trabalho é justamente a que sempre cai no login primeiro. O e-mail
     * prometia um parecer e entregava uma tela vazia.
     *
     * `buildCallbackPath` é o que o `/volumes` já usava para o mesmo problema.
     */
    redirectToLogin(buildCallbackPath("/nexo", params));
  }

  const access = await getUserAccess(session.user.email, session.user.name);

  if (!access.isActive) {
    redirect("/sem-acesso");
  }

  // O NexoWorkspace gerencia o próprio layout de 3 colunas (sidebar | stage |
  // copiloto) na altura que a moldura deixa embaixo do Topo.
  // O nome vem da SESSÃO (servidor): a saudação da entrada usa o primeiro, e o
  // bloco da conta (rodapé da barra lateral) usa nome + e-mail.
  const projetoPedido = await resolverProjetoPedido(params, session.user.email, session.user.name);
  const contexto = lerContextoDaUrl({
    get: (k) => {
      const v = params[k];
      return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
    },
  });

  const dados = await carregarMoldura(buildCallbackPath("/nexo", params));

  /*
   * A MOLDURA DO SISTEMA NOVO (migração, passo 5): o Topo em cima, o Nexo
   * embaixo na altura que sobra (`.nx-mesa`).
   *
   * A BUSCA DO TOPO ABRE A PALETA DO NEXO (as ações dentro da conversa,
   * "onde fica"), por evento; o Ctrl K também é dela. Duas paletas no mesmo
   * atalho abririam juntas.
   */
  return (
    <Moldura dados={dados} atual="Nexo" buscaPorEvento={EVENTO_ABRIR_PALETA}>
      <div className="nx-mesa">
        <NexoWorkspace
          projetoPedido={projetoPedido}
          contexto={contexto}
          isAdmin={access.isAdmin}
          nome={session.user.name}
          email={session.user.email}
        />
      </div>
    </Moldura>
  );
}

/**
 * O PROJETO QUE O LINK PEDE, conferido AQUI — auditoria UX/UI, G03.
 *
 * Query string não é autorização: `?projeto=<id>` só vira "Trabalhando no
 * projeto X" depois de o servidor confirmar que o projeto existe, não foi
 * excluído e pertence a uma organização em que a pessoa é membro ativo — a
 * mesma regra de `/projetos/[id]`. Projeto inacessível e inexistente dão a
 * MESMA resposta, para não confirmar a existência de um id alheio.
 */
async function resolverProjetoPedido(
  params: Record<string, string | string[] | undefined>,
  email: string | null | undefined,
  nome: string | null | undefined,
): Promise<ProjetoPedido | null> {
  const { projeto } = lerContextoDaUrl({
    get: (k) => {
      const v = params[k];
      return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
    },
  });
  if (!projeto) return null;
  if (!isDatabaseConfigured() || !email) return { id: projeto, estado: "indisponivel" };
  try {
    const actor = await getUserActor(normalizeEmail(email), nome);
    const p = await assertProjectAccess(projeto, actor);
    return {
      id: p.id,
      estado: "ok",
      codigo: p.code,
      nome: p.name,
      arquivado: p.status === "ARCHIVED",
    };
  } catch (err) {
    // `findFirstOrThrow` sem linha = P2025. Outra falha (rede, banco) não é
    // "sem acesso": dizer isso mandaria a pessoa pedir permissão que ela tem.
    const codigo = (err as { code?: string } | null)?.code;
    return { id: projeto, estado: codigo === "P2025" ? "sem-acesso" : "indisponivel" };
  }
}
