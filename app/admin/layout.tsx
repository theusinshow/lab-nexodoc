import { redirect } from "next/navigation";

import { AdminTokenProvider } from "@/components/admin/admin-token";
import { Moldura } from "@/components/moldura/moldura";
import { CascaDoAdmin } from "@/components/telas/admin/casca";
import { carregarMoldura } from "@/lib/moldura";

/*
 * O CENTRO DE CONTROLE no sistema novo: a moldura (Topo, busca, avisos) e,
 * dentro dela, a casca do admin — cabeçalho, trilho com o veredito e o token, e
 * o destino aberto.
 *
 * O PORTÃO DE TELA LARGA SAIU daqui: abaixo de 1024 px quem avisa é a moldura,
 * com a mesma regra para o app inteiro (e a saída "continuar assim mesmo").
 *
 * O PROVEDOR DO TOKEN embrulha a casca e os destinos: o token é do painel, não
 * da tela (ver [[components/admin/admin-token.tsx]]).
 */
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const dados = await carregarMoldura("/admin");
  if (!dados.usuario.ehAdmin) redirect("/");

  return (
    <Moldura dados={dados} atual="Administração">
      <AdminTokenProvider>
        <CascaDoAdmin>{children}</CascaDoAdmin>
      </AdminTokenProvider>
    </Moldura>
  );
}
