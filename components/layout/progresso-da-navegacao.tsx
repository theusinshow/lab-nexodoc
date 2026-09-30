"use client";

/**
 * O CLIQUE RESPONDE NA HORA — 29/09/2026.
 *
 * Toda página daqui é renderizada no servidor com consulta ao banco, e o App
 * Router segura a página velha na tela até a nova chegar inteira. Medido no
 * build de produção: 200 a 670ms entre o clique num link e a primeira mudança
 * visível. Nesse intervalo nada dizia que o clique tinha pegado, e é isso que
 * se sente como "o software está travado".
 *
 * `loading.tsx` não servia: a navegação mora DENTRO de cada página (no
 * `PageHeader`), então um esqueleto trocaria a barra inteira e ela piscaria a
 * cada clique. Aqui a página atual fica, e duas coisas acendem:
 *
 * - uma linha fina no topo que avança enquanto a próxima página não chega;
 * - o próprio link clicado, marcado com `data-navegando` (o CSS o destaca).
 *
 * As duas só aparecem depois de ~80ms (atraso no CSS): navegação que já estava
 * pré-carregada troca antes disso e não deve piscar nada.
 */
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Fase = "parado" | "indo" | "chegando";

/** Navegação que não chega em 10s não prende a linha na tela para sempre. */
const DESISTE_EM_MS = 10_000;

function destinoInterno(evento: MouseEvent): HTMLAnchorElement | null {
  /*
   * `defaultPrevented` NÃO filtra: o `<Link>` do Next sempre o chama (é assim
   * que ele troca a navegação do navegador pela do cliente). Filtrar por ele
   * descartava justamente todos os cliques que interessam.
   */
  if (evento.button !== 0) return null;
  if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return null;
  const alvo = evento.target instanceof Element ? evento.target.closest("a[href]") : null;
  if (!(alvo instanceof HTMLAnchorElement)) return null;
  if (alvo.target && alvo.target !== "_self") return null;
  if (alvo.hasAttribute("download")) return null;
  const url = new URL(alvo.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  // Mesma página (ou só a âncora): não há navegação para esperar.
  if (url.pathname === window.location.pathname && url.search === window.location.search) {
    return null;
  }
  return alvo;
}

function chaveDe(caminho: string | null, busca: string): string {
  return `${caminho ?? ""}?${busca.replace(/^\?/, "")}`;
}

export function ProgressoDaNavegacao() {
  const caminho = usePathname();
  const busca = useSearchParams();
  const chave = chaveDe(caminho, busca?.toString() ?? "");

  /*
   * A IDA guarda de onde se saiu. A fase é DERIVADA: se a chave da URL já não
   * é a da partida, a página nova chegou. Marcar "chegou" num efeito seria
   * escrever estado de forma síncrona ali, e a renderização já sabe.
   */
  const [ida, setIda] = useState<{ de: string } | null>(null);
  const fase: Fase = ida === null ? "parado" : ida.de === chave ? "indo" : "chegando";
  const linkPendente = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    /*
     * No `document`: pega todo link do app, sem cada tela precisar avisar. Um
     * link que intercepta o clique e NÃO navega deixaria a linha acesa — por
     * isso a desistência em `DESISTE_EM_MS`.
     */
    const aoClicar = (evento: MouseEvent) => {
      const alvo = destinoInterno(evento);
      if (!alvo) return;
      linkPendente.current?.removeAttribute("data-navegando");
      alvo.setAttribute("data-navegando", "");
      linkPendente.current = alvo;
      setIda({ de: chaveDe(window.location.pathname, window.location.search) });
    };
    document.addEventListener("click", aoClicar);
    return () => document.removeEventListener("click", aoClicar);
  }, []);

  useEffect(() => {
    if (fase === "parado") return;
    if (fase === "chegando") {
      linkPendente.current?.removeAttribute("data-navegando");
      linkPendente.current = null;
    }
    // Chegando: o tempo de a linha completar e apagar. Indo: a desistência.
    const t = window.setTimeout(
      () => {
        linkPendente.current?.removeAttribute("data-navegando");
        linkPendente.current = null;
        setIda(null);
      },
      fase === "chegando" ? 260 : DESISTE_EM_MS,
    );
    return () => window.clearTimeout(t);
  }, [fase]);

  return <div aria-hidden className="nx-progresso" data-fase={fase} />;
}
