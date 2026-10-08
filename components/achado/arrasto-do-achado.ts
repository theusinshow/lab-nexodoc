"use client";

/**
 * O ACHADO ARRASTADO ATÉ O CHAT, COM A FENDA (08/10/2026; referência: o
 * Shredder do React Bits, sem o picote — picotar diria "apagou", e o achado
 * continua na fila).
 *
 * O arrasto NATIVO do navegador não deixa animar a fantasma que segue o mouse,
 * então este é por ponteiro: a linha vira um cartão solto que acompanha o
 * cursor; solto no chat, ele é alimentado por uma fenda e sai do outro lado já
 * como o chip da pergunta. Solto fora, volta para a linha.
 *
 * A coreografia mora toda aqui (cartão, fenda e chip), e não metade em cada
 * componente: os tempos de um dependem dos do outro. O chat só registra o alvo
 * e devolve o elemento do chip quando o recebe.
 *
 * Só `transform`, `opacity` e `clip-path` animam (DESIGN.md / lib/ds/movimento).
 */
import { CURVA, DURACAO } from "@/lib/ds/movimento";
import type { AchadoArrastado } from "@/lib/pergunta-sobre-achado";

export interface AlvoDoAchado {
  el: HTMLElement;
  /** O cartão está por cima (true) ou saiu (false). */
  sobrevoar: (sobre: boolean) => void;
  /** Põe o chip no lugar (ainda invisível) e devolve o elemento, depois do layout. */
  receber: (achado: AchadoArrastado) => Promise<HTMLElement | null>;
  /** A coreografia terminou (ou não houve): o chip pode ficar visível por conta própria. */
  chegou: () => void;
}

let alvo: AlvoDoAchado | null = null;

/** O chat se registra como o lugar onde o achado pode cair. */
export function registrarAlvoDoAchado(a: AlvoDoAchado): () => void {
  alvo = a;
  return () => {
    if (alvo === a) alvo = null;
  };
}

const LIMIAR = 6; // px antes de virar arrasto: abaixo disto é clique.
const ms = (s: number) => Math.round(s * 1000);
const curva = (c: readonly number[]) => `cubic-bezier(${c.join(",")})`;
const semMovimento = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Liga o arrasto numa linha. Chamar no `onPointerDown` dela; ignora o aperto
 * em botões de dentro que não são o corpo (checkbox, ações rápidas).
 */
export function comecarArrasto(e: React.PointerEvent<HTMLElement>, achado: AchadoArrastado): void {
  if (e.button !== 0 || e.pointerType === "touch") return;
  const linha = e.currentTarget;
  const aperto = e.target as HTMLElement;
  if (aperto.closest("[data-sem-arrasto]")) return;

  const x0 = e.clientX;
  const y0 = e.clientY;
  let cartao: HTMLElement | null = null;
  let origem: DOMRect | null = null;
  let z = 1;
  let sobre = false;

  const mover = (ev: PointerEvent) => {
    if (!cartao) {
      if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < LIMIAR) return;
      origem = linha.getBoundingClientRect();
      cartao = criarCartao(linha, origem);
      z = zoomDe(cartao);
      linha.classList.add("rs-linha--arrastando");
      document.documentElement.classList.add("nx-arrastando-achado");
    }
    ev.preventDefault();
    const dx = ev.clientX - x0;
    const dy = ev.clientY - y0;
    // Inclina um pouco na direção do movimento: o cartão "tem peso", sem quique.
    const giro = Math.max(-4, Math.min(4, dx / 60));
    cartao.style.transform = `translate(${dx / z}px, ${dy / z}px) rotate(${giro}deg) scale(1.02)`;

    const agora = Boolean(alvo && alvo.el.contains(document.elementFromPoint(ev.clientX, ev.clientY)));
    if (agora !== sobre) {
      sobre = agora;
      alvo?.sobrevoar(sobre);
    }
  };

  const soltar = (ev: PointerEvent) => {
    window.removeEventListener("pointermove", mover);
    window.removeEventListener("pointerup", soltar);
    window.removeEventListener("pointercancel", soltar);
    if (!cartao || !origem) return;
    // O clique que vem logo depois do soltar abriria o achado: engolido.
    // Se o soltar foi fora da linha, não vem clique nenhum: a trava sai no próximo quadro.
    const engolir = (c: MouseEvent) => {
      c.stopPropagation();
      c.preventDefault();
    };
    window.addEventListener("click", engolir, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", engolir, true), 0);
    document.documentElement.classList.remove("nx-arrastando-achado");

    const c = cartao;
    const destino = sobre && ev.type === "pointerup" ? alvo : null;
    if (destino) {
      destino.sobrevoar(false);
      void alimentar(c, destino, achado).finally(() => linha.classList.remove("rs-linha--arrastando"));
    } else {
      voltar(c).finally(() => linha.classList.remove("rs-linha--arrastando"));
    }
  };
  window.addEventListener("pointermove", mover, { passive: false });
  window.addEventListener("pointerup", soltar);
  window.addEventListener("pointercancel", soltar);
}

/*
 * O ZOOM DO `.ds`. Em tela larga o `.ds` tem `zoom: 1.125` (app/ds.css), e o
 * invólucro do cartão é `.ds` para herdar o desenho — então tudo o que vem do
 * mouse e do `getBoundingClientRect` (pixels da janela) precisa ser dividido
 * por ele antes de virar `left`/`translate` lá dentro. Sem isto o cartão
 * andava 12,5% a mais que o cursor e caía fora da tela.
 */
function zoomDe(el: HTMLElement): number {
  const casca = el.closest(".nx-casca-do-arrasto");
  const zoom = casca ? Number.parseFloat(getComputedStyle(casca).zoom) : 1;
  return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
}

/** A fantasma: uma cópia da linha, solta no `body`, no mesmo lugar dela. */
function criarCartao(linha: HTMLElement, r: DOMRect): HTMLElement {
  const c = linha.cloneNode(true) as HTMLElement;
  c.classList.add("nx-cartao-arrastado");
  c.removeAttribute("id");
  c.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
  c.setAttribute("aria-hidden", "true");
  Object.assign(c.style, {
    position: "fixed",
    margin: "0",
    zIndex: "1000",
    pointerEvents: "none",
    transformOrigin: "50% 50%",
  });
  // As regras da linha são `.ds .re.re--embutido …` e `.ds .am-a-linhas …`: o
  // `.ds` precisa ser ANCESTRAL. Três níveis, como na tela (resultado.tsx).
  const casca = document.createElement("div");
  casca.className = "ds nx-casca-do-arrasto";
  const tela = document.createElement("div");
  tela.className = "rs rd re re--embutido";
  const lista = document.createElement("div");
  lista.className = "am-a-linhas";
  lista.appendChild(c);
  tela.appendChild(lista);
  casca.appendChild(tela);
  document.body.appendChild(casca);
  const z = zoomDe(c);
  Object.assign(c.style, { left: `${r.left / z}px`, top: `${r.top / z}px`, width: `${r.width / z}px`, height: `${r.height / z}px` });
  return c;
}

function remover(c: HTMLElement) {
  (c.closest(".nx-casca-do-arrasto") ?? c).remove();
}

/** Solto fora: volta para a linha e some nela. */
async function voltar(c: HTMLElement) {
  if (semMovimento()) return remover(c);
  await c.animate([{ transform: c.style.transform }, { transform: "translate(0, 0) rotate(0) scale(1)", opacity: 0.6 }], {
    duration: ms(DURACAO.layout),
    easing: curva(CURVA.move),
    fill: "forwards",
  }).finished.catch(() => {});
  remover(c);
}

/**
 * Solto no chat: o cartão para em cima da fenda, entra por ela, e o chip sai
 * por baixo no mesmo ritmo — o que some de um lado é o que aparece do outro.
 */
async function alimentar(c: HTMLElement, destino: AlvoDoAchado, achado: AchadoArrastado) {
  const chip = await destino.receber(achado);
  if (!chip || semMovimento()) {
    remover(c);
    destino.chegou();
    return;
  }
  const z = zoomDe(c);
  const janela = chip.getBoundingClientRect();
  // A fenda e o cartão vivem no invólucro (com zoom); o chip, na coluna (com o mesmo zoom).
  const r = { left: janela.left / z, top: janela.top / z, width: janela.width / z, height: chip.offsetHeight };
  const base = { left: parseFloat(c.style.left), top: parseFloat(c.style.top), w: parseFloat(c.style.width), h: parseFloat(c.style.height) };

  const fenda = document.createElement("div");
  fenda.className = "nx-fenda";
  Object.assign(fenda.style, { left: `${r.left - 6}px`, top: `${r.top - 1}px`, width: `${r.width + 12}px` });
  c.closest(".nx-casca-do-arrasto")?.appendChild(fenda);
  const acender = fenda.animate([{ opacity: 0, transform: "scaleX(0.4)" }, { opacity: 1, transform: "scaleX(1)" }], {
    duration: ms(DURACAO.state),
    easing: curva(CURVA.out),
    fill: "forwards",
  });

  // 1. Alinhar: o pé do cartão encosta na fenda, já na largura dela, reto.
  const sx = r.width / base.w;
  const alinhado = `translate(${r.left - base.left + (r.width - base.w) / 2}px, ${r.top - base.top - base.h}px) rotate(0deg) scaleX(${sx})`;
  await c.animate([{ transform: c.style.transform }, { transform: alinhado }], {
    duration: ms(DURACAO.layout),
    easing: curva(CURVA.move),
    fill: "forwards",
  }).finished.catch(() => {});

  // 2. Alimentar: o cartão desce pela fenda (cortado nela) e o chip sai por baixo.
  const alimentacao = Math.round(ms(DURACAO.layout) * 1.6);
  const desce = c.animate(
    [
      { transform: alinhado, clipPath: "inset(0 0 0 0)" },
      { transform: `${alinhado} translateY(${base.h}px)`, clipPath: `inset(0 0 ${base.h}px 0)` },
    ],
    { duration: alimentacao, easing: curva(CURVA.out), fill: "forwards" },
  );
  const sai = chip.animate(
    [
      { transform: `translateY(${-r.height}px)`, clipPath: `inset(${r.height}px 0 0 0)` },
      { transform: "translateY(0)", clipPath: "inset(0 0 0 0)" },
    ],
    { duration: alimentacao, easing: curva(CURVA.out), fill: "forwards" },
  );
  await Promise.all([desce.finished, sai.finished]).catch(() => {});
  // `sai` fica preso no estado final (igual ao repouso): cancelar antes do React
  // tirar a classe `--chegando` esconderia o chip por um quadro.
  destino.chegou();
  c.remove();

  acender.cancel();
  await fenda.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(DURACAO.state), easing: curva(CURVA.exit), fill: "forwards" }).finished.catch(() => {});
  remover(fenda);
}
