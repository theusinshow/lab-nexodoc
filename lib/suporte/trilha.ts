/**
 * A TRILHA — os últimos passos antes do problema, em texto.
 *
 * Um anel de 30 posições que vive na memória da aba e só é lido no envio. Não
 * é replay: não guarda tela, não guarda o que foi digitado. Um clique vira o
 * RÓTULO do botão ("botão: Enviar"), nunca o valor de um campo — campo de texto
 * não gera passo nenhum.
 *
 * Puro de propósito: o teste roda com `node`, sem navegador.
 */
export type Passo = { t: number; tipo: "rota" | "clique" | "requisicao" | "erro"; texto: string; status?: number; ms?: number };

export const LIMITE_DA_TRILHA = 30;
export const TETO_DO_TEXTO = 300;

export function criarTrilha(limite = LIMITE_DA_TRILHA) {
  const passos: Passo[] = [];
  return {
    registrar(p: Omit<Passo, "t"> & { t?: number }) {
      passos.push({ ...p, t: p.t ?? Date.now(), texto: String(p.texto).slice(0, TETO_DO_TEXTO) });
      if (passos.length > limite) passos.splice(0, passos.length - limite);
    },
    ler(): Passo[] {
      return passos.map((p) => ({ ...p }));
    },
  };
}

/** O mínimo de um elemento do DOM que o rótulo precisa — para o teste não precisar de DOM. */
export type ElementoParaRotulo = {
  tagName: string;
  textContent: string | null;
  getAttribute(nome: string): string | null;
  closest(seletor: string): ElementoParaRotulo | null;
};

const enxuto = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 80);

/** "botão: Enviar" / "link: Projetos", ou null quando o alvo não é coisa clicável. */
export function rotuloDoClique(alvo: ElementoParaRotulo | null): string | null {
  const el = alvo?.closest?.('button, a, [role="button"], [role="menuitem"], [role="tab"]') ?? null;
  if (!el) return null;
  const nome = enxuto(el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent || "");
  if (!nome) return null;
  return `${el.tagName === "A" ? "link" : "botão"}: ${nome}`;
}
