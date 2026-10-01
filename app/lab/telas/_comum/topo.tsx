"use client";

import { AnimatePresence, motion } from "motion/react";
import { Bell, ChevronDown, Keyboard, LogOut, Search } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState } from "react";

import { Avatar, Botao, Orbe, Tecla } from "@/components/ds/basicos";
import { USUARIO } from "@/lib/design-lab/amostras";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";

import "../painel/painel.css";
import "./topo.css";

/**
 * Quem está em volta da tela (a vitrine das peças) liga o Topo sem que cada
 * tela precise repassar props: Ctrl K, atalhos e o menu já aberto.
 */
export const ControleDoTopo = createContext<{ onBusca?: () => void; onAtalhos?: () => void; menuAbertoInicial?: boolean }>({});

const DESTINOS = ["Painel", "Projetos", "Montar volumes", "Achados", "Ajuda", "Administração"] as const;

/**
 * A barra de cima das páginas (fora do Nexo). Uma só, para as telas não divergirem.
 * `busca={false}` onde a própria tela já é a busca (a home com a barra de comando).
 *
 * ELA SE MEDE PELA CAIXA, NÃO PELA JANELA (container query em `.pn-topo-caixa`):
 * abaixo de 1280px a navegação vai para o menu da conta, que é a regra do app
 * (`barra-do-topo.tsx`); abaixo de 900 a busca vira o ícone com o Ctrl K; abaixo
 * de 600 fica só o avatar. Nada quebra linha, nada passa por baixo de nada.
 */
export function Topo({
  atual,
  trabalhando = false,
  aviso = true,
  busca = true,
  onBusca,
  onAtalhos,
  menuAbertoInicial,
}: {
  atual: (typeof DESTINOS)[number] | null;
  trabalhando?: boolean;
  aviso?: boolean;
  busca?: boolean;
  onBusca?: () => void;
  onAtalhos?: () => void;
  menuAbertoInicial?: boolean;
}) {
  const ctx = useContext(ControleDoTopo);
  onBusca ??= ctx.onBusca;
  onAtalhos ??= ctx.onAtalhos;
  const menuAberto = menuAbertoInicial ?? ctx.menuAbertoInicial ?? false;
  return (
    <div className="pn-topo-caixa">
      <header className="pn-topo">
        <div className="pn-marca">
          <Orbe tamanho={22} estado={trabalhando ? "trabalhando" : "repouso"} />
          <span className="pn-marca-nome">Nexo</span>
        </div>
        <nav className="pn-nav" aria-label="Principal">
          {DESTINOS.map((n) => (
            <a key={n} aria-current={n === atual ? "page" : undefined}>
              {n}
            </a>
          ))}
        </nav>
        {busca ? (
          <button type="button" className="pn-busca" onClick={onBusca} aria-label="Buscar obra, código ou ação (Ctrl K)">
            <Search size={15} />
            <span className="pn-busca-texto">Buscar obra, código ou ação</span>
            <Tecla>Ctrl K</Tecla>
          </button>
        ) : (
          <span style={{ marginLeft: "auto" }} />
        )}
        <Botao variante="quiet" icone aria-label="Avisos" className="pn-sino">
          <Bell />
          {aviso && <i />}
        </Botao>
        <MenuDaConta atual={atual} onAtalhos={onAtalhos} abertoInicial={menuAberto} />
      </header>
    </div>
  );
}

/**
 * O MENU DA CONTA: quem você é, para onde ir quando a barra não cabe, os
 * atalhos e a saída. Os destinos só aparecem aqui quando a navegação saiu da
 * barra (a mesma container query), para nenhum destino ser oferecido duas vezes.
 */
function MenuDaConta({ atual, onAtalhos, abertoInicial }: { atual: (typeof DESTINOS)[number] | null; onAtalhos?: () => void; abertoInicial: boolean }) {
  const [aberto, setAberto] = useState(abertoInicial);
  const ref = useRef<HTMLDivElement>(null);
  const { dur } = useTempo();

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc, true);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc, true);
    };
  }, [aberto]);

  return (
    <div ref={ref} className="pn-conta">
      <button type="button" className="pn-quem" aria-haspopup="menu" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
        <Avatar iniciais={USUARIO.iniciais} />
        <span className="pn-quem-texto">
          {USUARIO.nome}
          <small>
            {USUARIO.escritorio}, {USUARIO.papel}
          </small>
        </span>
        <motion.span className="pn-quem-seta" animate={{ rotate: aberto ? 180 : 0 }} transition={{ duration: dur("state"), ease: [...CURVA.out] }}>
          <ChevronDown size={14} />
        </motion.span>
      </button>
      <AnimatePresence>
        {aberto && (
          <motion.div
            role="menu"
            aria-label="Conta"
            className="pn-menu"
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: dur("feedback"), ease: [...CURVA.exit] } }}
            transition={{ duration: dur("enter"), ease: [...CURVA.out] }}
          >
            <div className="pn-menu-quem">
              <Avatar iniciais={USUARIO.iniciais} />
              <span>
                <b>{USUARIO.nome}</b>
                <small className="mp-mono">victor@prosul.com.br</small>
              </span>
              <span className="pn-menu-alcada">
                PROSUL
                {USUARIO.papel === "admin" && <em>Admin</em>}
              </span>
            </div>
            <div className="pn-menu-destinos" role="group" aria-label="Ir para">
              {DESTINOS.map((d) => (
                <button key={d} type="button" role="menuitem" aria-current={d === atual ? "page" : undefined} onClick={() => setAberto(false)}>
                  {d}
                </button>
              ))}
            </div>
            <div className="pn-menu-grupo">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAberto(false);
                  onAtalhos?.();
                }}
              >
                <Keyboard size={15} aria-hidden />
                Atalhos de teclado
                <Tecla>?</Tecla>
              </button>
              <button type="button" role="menuitem" className="pn-menu-sair" onClick={() => setAberto(false)}>
                <LogOut size={15} aria-hidden />
                Sair
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
