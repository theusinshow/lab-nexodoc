import { redirect } from "next/navigation";

import { Moldura } from "@/components/moldura/moldura";
import { TelaAchados } from "@/components/telas/achados/tela-achados";
import { comVoce, queVocePassou, type ParecerEmAberto } from "@/lib/achados-em-aberto";
import { AccessDenied } from "@/lib/actor";
import { requireActor } from "@/lib/access-control";
import { carregarMoldura } from "@/lib/moldura";

/**
 * ACHADOS no sistema novo: o que está com você e o que você passou a alguém,
 * por parecer, com o nível de cada achado. Não é uma segunda fila: são as
 * mesmas linhas de `AuditFeedback` da home e do sino
 * ([[lib/achados-em-aberto.ts]]). Abrir leva ao parecer no Nexo.
 */
export default async function AchadosPage() {
  const dados = await carregarMoldura("/achados");

  let recebidos: ParecerEmAberto[] = [];
  let passados: ParecerEmAberto[] = [];
  if (!dados.semBanco) {
    try {
      const actor = await requireActor();
      [recebidos, passados] = await Promise.all([comVoce(actor.email, actor.userId, actor.organizationId), queVocePassou(actor.userId, actor.organizationId)]);
    } catch (err) {
      if (err instanceof AccessDenied) redirect("/sem-acesso");
      throw err;
    }
  }

  return (
    <Moldura dados={dados} atual="Achados">
      <TelaAchados comVoce={recebidos} passou={passados} semBanco={dados.semBanco} />
    </Moldura>
  );
}
