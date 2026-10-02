import type { Metadata } from "next";

import "@/app/ds.css";
import "@/components/moldura/moldura.css";
import { Moldura } from "@/components/moldura/moldura";
import { PaginaQueNaoExiste } from "@/components/moldura/paginas-especiais";
import { FONTES_DS } from "@/lib/ds/fontes";
import { tentarMoldura } from "@/lib/moldura";

export const metadata: Metadata = { title: "Página não encontrada - Nexo" };

/*
 * A 404 do app inteiro (era a página branca do Next, em inglês). Logado, ela
 * vem com o Topo e a busca; sem sessão, só o recado e a porta de entrada.
 */
export default async function NaoEncontrada() {
  const dados = await tentarMoldura();
  if (!dados)
    return (
      <div className={`ds ${FONTES_DS} md-raiz`}>
        <main id="conteudo">
          <PaginaQueNaoExiste logado={false} />
        </main>
      </div>
    );
  return (
    <Moldura dados={dados} atual={null}>
      <PaginaQueNaoExiste logado />
    </Moldura>
  );
}
