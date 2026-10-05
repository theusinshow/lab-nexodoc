"use client";
/// <reference types="react/canary" />

/**
 * A TRANSIÇÃO ENTRE PÁGINAS — 29/09/2026.
 *
 * Trocar de página era um corte seco: a página velha parada até a nova chegar
 * (ver [[progresso-da-navegacao.tsx]]) e, no instante da troca, tudo mudava de
 * uma vez. Agora a velha sai e a nova entra num crossfade curto, feito pelo
 * navegador (View Transitions) através do `<ViewTransition>` do React.
 *
 * MONTADO PELO `app/template.tsx`, e não pelo layout: o template é recriado a
 * cada troca de seção (e só nela), e é essa troca de instância que o React lê
 * como "saiu uma, entrou outra". Layouts compartilhados — o do admin — não são
 * recriados ao andar dentro deles, então não piscam.
 *
 * `update="none"`: dentro da mesma página, nada anima por aqui. Filtro que
 * refaz a lista, `router.refresh`, a troca de conversa do Nexo (que tem a
 * própria transição, `runShellTransition`) — tudo isso segue como era.
 *
 * O TOPO FICA (04/10/2026): ele tem nome próprio (`nx-topo`) e não entra no
 * snapshot da página — só o conteúdo troca. No admin, os cinco destinos trocam
 * pelo mesmo gesto, dentro da casca (`app/admin/template.tsx`).
 *
 * Navegador sem View Transitions troca sem animação, como antes. Movimento
 * reduzido: corte seco, por regra própria em globals.css (o reset global não
 * alcança os pseudo-elementos da transição).
 */
import { ViewTransition } from "react";

export function TransicaoDePagina({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      default="none"
      update="none"
      enter="nx-pagina-entra"
      exit="nx-pagina-sai"
    >
      {children}
    </ViewTransition>
  );
}
