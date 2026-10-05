"use client";

/**
 * O QUE FLUTUA SEM SER CORTADO — menu e popover numa camada própria.
 *
 * O `Menu` do sistema abre `position: absolute` dentro do próprio botão. Em
 * painel com `overflow: hidden` (todo cartão do ds) ou em área que rola (a
 * lista), ele é RECORTADO: foi o "dropdown com problema" do modelo A. Aqui o
 * conteúdo vai num portal na raiz `.ds`, `position: fixed`, ancorado no botão
 * pelo retângulo dele — o mesmo jeito da `Dica`. Fecha no clique fora, no Esc
 * e quando a página rola (a âncora saiu do lugar).
 */
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Botao } from "@/components/ds/basicos";

type Lado = "baixo" | "cima";

/** A raiz `.ds` mais de fora — onde o que flutua é desenhado (a mesma regra da `Dica`). */
function raizDoSistema(el: HTMLElement | null) {
  let raiz: HTMLElement | null = null;
  for (let no = el; no; no = no.parentElement) if (no.classList.contains("ds")) raiz = no;
  return raiz;
}

function zoomDe(el: HTMLElement | null) {
  const z = el ? parseFloat(getComputedStyle(el).zoom || "1") : 1;
  return Number.isFinite(z) && z > 0 ? z : 1;
}
type Alinhar = "esquerda" | "direita";

export function Flutuante({
  gatilho,
  children,
  lado = "baixo",
  alinhar = "esquerda",
  largura,
  className = "",
}: {
  /** Recebe se está aberto e como alternar — devolve o botão. */
  gatilho: (aberto: boolean, alternar: (e: { currentTarget: EventTarget }) => void) => ReactNode;
  /** Recebe como fechar. */
  children: (fechar: () => void) => ReactNode;
  lado?: Lado;
  alinhar?: Alinhar;
  largura?: number;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  // Onde desenhar: achado no clique que abre (evento), e não no render.
  const [raiz, setRaiz] = useState<HTMLElement | null>(null);
  const alternar = (e: { currentTarget: EventTarget }) => {
    setRaiz(raizDoSistema(e.currentTarget as HTMLElement) ?? document.querySelector<HTMLElement>(".ds"));
    setAberto((a) => !a);
  };
  const [pos, setPos] = useState<React.CSSProperties>({});
  const ancora = useRef<HTMLSpanElement>(null);
  const caixa = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!aberto) return;
    const posicionar = () => {
    const r = ancora.current?.getBoundingClientRect();
    if (!r) return;
    // A raiz `.ds` tem `zoom` em tela larga (1,125 a partir de 2300px): o que se
    // mede na janela se divide por ele antes de virar `top`/`right` lá dentro.
    const z = zoomDe(raizDoSistema(ancora.current));
    /*
     * O LADO SE DECIDE PELO ESPAÇO: pedido "baixo" perto do pé da janela abre
     * para cima (e vice-versa), e a altura nunca passa do que sobra — um menu
     * com todo o escritório não pode vazar pela borda.
     */
    const embaixo = window.innerHeight - r.bottom - 12;
    const emcima = r.top - 12;
    const desce = lado === "baixo" ? embaixo >= 240 || embaixo >= emcima : !(emcima >= 240 || emcima >= embaixo);
    const vertical = desce ? { top: (r.bottom + 6) / z } : { bottom: (window.innerHeight - r.top + 6) / z };
    const horizontal = alinhar === "esquerda" ? { left: Math.max(8, r.left) / z } : { right: Math.max(8, window.innerWidth - r.right) / z };
    setPos({ position: "fixed", boxSizing: "border-box", ...vertical, ...horizontal, maxHeight: Math.max(160, desce ? embaixo : emcima) / z, overflowY: "auto", ...(largura ? { width: largura } : {}) });
    };
    posicionar();
    // De novo depois que o layout assenta: a âncora pode ter andado (lista rolando, painel abrindo).
    const quadro = requestAnimationFrame(posicionar);
    return () => cancelAnimationFrame(quadro);
  }, [aberto, lado, alinhar, largura]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (ancora.current?.contains(alvo) || caixa.current?.contains(alvo)) return;
      setAberto(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setAberto(false);
    };
    const rolou = (e: Event) => {
      if (caixa.current?.contains(e.target as Node)) return;
      setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc, true);
    window.addEventListener("scroll", rolou, true);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc, true);
      window.removeEventListener("scroll", rolou, true);
    };
  }, [aberto]);


  return (
    <>
      <span ref={ancora} className="am-ancora">
        {gatilho(aberto, alternar)}
      </span>
      {raiz &&
        createPortal(
          <AnimatePresence>
            {aberto && (
              <motion.div
                ref={caixa}
                className={`am-flutuante ${className}`}
                style={{ ...pos, zIndex: 80, transformOrigin: `${lado === "baixo" ? "top" : "bottom"} ${alinhar === "esquerda" ? "left" : "right"}` }}
                initial={{ opacity: 0, scale: 0.97, y: lado === "baixo" ? -4 : 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1 } }}
                transition={{ duration: 0.16 }}
              >
                {children(() => setAberto(false))}
              </motion.div>
            )}
          </AnimatePresence>,
          raiz,
        )}
    </>
  );
}

/** Um menu de ações que não é cortado. Mesmo contrato de itens do `Menu`. */
export function MenuSolto({
  rotulo,
  itens,
  variante = "ghost",
  icone,
  lado,
  alinhar,
  titulo,
}: {
  rotulo: ReactNode;
  itens: { rotulo: string; dica?: string; icone?: ReactNode; onClick?: () => void }[];
  variante?: "primary" | "ghost" | "quiet";
  /** Botão só com ícone (sem a seta). */
  icone?: boolean;
  lado?: Lado;
  alinhar?: Alinhar;
  titulo?: string;
}) {
  return (
    <Flutuante
      lado={lado}
      alinhar={alinhar}
      className="ds-menu ds-menu--acoes am-menu-solto"
      gatilho={(aberto, alternar) => (
        <Botao variante={variante} tamanho="sm" icone={icone} aria-haspopup="menu" aria-expanded={aberto} title={titulo} aria-label={titulo} onClick={alternar}>
          {rotulo}
          {!icone && <ChevronDown style={{ transform: aberto ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} />}
        </Botao>
      )}
    >
      {(fechar) =>
        itens.length ? (
          itens.map((i) => (
            <button
              key={i.rotulo}
              type="button"
              role="menuitem"
              onClick={() => {
                i.onClick?.();
                fechar();
              }}
            >
              <span style={{ width: 16, display: "inline-flex" }}>{i.icone}</span>
              <span className="ds-menu-texto">
                {i.rotulo}
                {i.dica && <small>{i.dica}</small>}
              </span>
            </button>
          ))
        ) : (
          <p className="am-menu-vazio">Ninguém no escritório para atribuir.</p>
        )
      }
    </Flutuante>
  );
}
