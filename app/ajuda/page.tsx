import { Moldura } from "@/components/moldura/moldura";
import { TelaAjuda } from "@/components/telas/ajuda/tela-ajuda";
import { carregarMoldura } from "@/lib/moldura";

/**
 * AJUDA no sistema novo: tarefas ("como faço"), onde fica cada função e o que
 * cada palavra quer dizer. O conteúdo é o do lab, conferido nas telas novas
 * (`components/telas/ajuda/dados.ts`).
 *
 * "Abrir o último parecer" leva à auditoria mais recente de quem lê — a mesma
 * que a busca (Ctrl K) mostra em "Recentes".
 */
export default async function AjudaPage() {
  const dados = await carregarMoldura("/ajuda");

  return (
    <Moldura dados={dados} atual="Ajuda">
      <TelaAjuda ultimoParecer={dados.recentes[0]?.auditId ?? null} />
    </Moldura>
  );
}
