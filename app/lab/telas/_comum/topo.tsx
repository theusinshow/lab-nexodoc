"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Bell, ChevronDown, Keyboard, LogOut, Repeat2, Search } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type KeyboardEvent as KE, type ReactNode, type RefObject } from "react";

import { Avatar, Botao, Orbe, Tecla } from "@/components/ds/basicos";
import { USUARIO } from "@/lib/design-lab/amostras";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";

import { COM_VOCE } from "../achados/dados";
import { DESTINO_DA_BARRA, useIr } from "./prototipo";
import "../painel/painel.css";
import "./topo.css";

/**
 * Quem está em volta da tela (a vitrine das peças) liga o Topo sem que cada
 * tela precise repassar props: Ctrl K, atalhos e um painel já aberto.
 */
export const ControleDoTopo = createContext<{ onBusca?: () => void; onAtalhos?: () => void; aberto?: "menu" | "sino" | null; pularVisivel?: boolean }>({});

const DESTINOS = ["Painel", "Nexo", "Projetos", "Achados", "Ajuda", "Administração"] as const;
type Destino = (typeof DESTINOS)[number];

/**
 * A barra de cima das páginas (fora do Nexo). Uma só, para as telas não divergirem.
 * `busca={false}` onde a própria tela já é a busca (a home com a barra de comando).
 *
 * ELA SE MEDE PELA CAIXA, NÃO PELA JANELA (container query em `.pn-topo-caixa`):
 * abaixo de 1280px a navegação vai para o menu da conta, que é a regra do app
 * (`barra-do-topo.tsx`); abaixo de 900 a busca vira o ícone com o Ctrl K; abaixo
 * de 600 fica só o avatar. Nada quebra linha, nada passa por baixo de nada.
 *
 * O primeiro foco da página é "Pular para o conteúdo" (o mesmo do
 * `app/layout.tsx`): invisível até alguém chegar nele pelo Tab.
 */
export function Topo({
  atual,
  trabalhando = false,
  aviso = true,
  busca = true,
  onBusca,
  onAtalhos,
}: {
  atual: Destino | null;
  trabalhando?: boolean;
  aviso?: boolean;
  busca?: boolean;
  onBusca?: () => void;
  onAtalhos?: () => void;
}) {
  const ctx = useContext(ControleDoTopo);
  const ir = useIr();
  onBusca ??= ctx.onBusca;
  onAtalhos ??= ctx.onAtalhos;
  return (
    <div className="pn-topo-caixa">
      <a href="#conteudo" className={`pn-pular${ctx.pularVisivel ? " pn-pular--visivel" : ""}`}>
        Pular para o conteúdo
        <Tecla>↵</Tecla>
      </a>
      <header className="pn-topo">
        <a className="pn-marca" href="#inicio" onClick={(e) => (e.preventDefault(), ir("inicio"))}>
          <Orbe tamanho={22} estado={trabalhando ? "trabalhando" : "repouso"} />
          <span className="pn-marca-nome">Nexo</span>
        </a>
        <nav className="pn-nav" aria-label="Principal">
          {DESTINOS.map((n) => (
            <a key={n} href={`#${DESTINO_DA_BARRA[n][0]}`} aria-current={n === atual ? "page" : undefined} onClick={(e) => (e.preventDefault(), ir(...DESTINO_DA_BARRA[n]))}>
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
        <Sino ponto={aviso} abertoInicial={ctx.aberto === "sino"} />
        <MenuDaConta atual={atual} onAtalhos={onAtalhos} abertoInicial={ctx.aberto === "menu"} />
      </header>
    </div>
  );
}

/** Os itens que dá para focar agora (os destinos ficam escondidos com a barra larga). */
const visiveis = (raiz: HTMLElement | null) => [...(raiz?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])].filter((el) => el.offsetParent !== null);

/**
 * Um painel que cresce de um botão: fecha com clique fora e com Esc (que
 * devolve o foco ao botão), anda com ↑ ↓ Home End entre os itens, e quando
 * abre pelo teclado já entrega o foco no primeiro item.
 */
function usePainel(abertoInicial: boolean) {
  const [aberto, setAberto] = useState(abertoInicial);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const peloTeclado = useRef(false);

  const fechar = useCallback((devolver = true) => {
    setAberto(false);
    if (devolver) botao.current?.focus();
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      fechar();
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc, true);
    if (peloTeclado.current) requestAnimationFrame(() => visiveis(painel.current)[0]?.focus());
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc, true);
    };
  }, [aberto, fechar]);

  const andar = (e: KE<HTMLDivElement>) => {
    const itens = visiveis(painel.current);
    if (!itens.length) return;
    const i = itens.indexOf(document.activeElement as HTMLElement);
    const ir = (n: number) => (e.preventDefault(), itens[(n + itens.length) % itens.length].focus());
    if (e.key === "ArrowDown") ir(i + 1);
    else if (e.key === "ArrowUp") ir(i < 0 ? itens.length - 1 : i - 1);
    else if (e.key === "Home") ir(0);
    else if (e.key === "End") ir(itens.length - 1);
    else if (e.key === "Tab") setAberto(false);
  };

  const gatilho = {
    ref: botao,
    "aria-expanded": aberto,
    onClick: (e: React.MouseEvent) => {
      peloTeclado.current = e.detail === 0;
      setAberto((a) => !a);
    },
    onKeyDown: (e: KE<HTMLButtonElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        peloTeclado.current = true;
        setAberto(true);
      }
    },
  };
  return { aberto, setAberto, fechar, raiz, painel, andar, gatilho };
}

function Painel({ painel, andar, rotulo, classe, children }: { painel: RefObject<HTMLDivElement | null>; andar: (e: KE<HTMLDivElement>) => void; rotulo: string; classe: string; children: ReactNode }) {
  const { dur } = useTempo();
  return (
    <motion.div
      ref={painel}
      role="menu"
      aria-label={rotulo}
      className={`pn-painel ${classe}`}
      onKeyDown={andar}
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: dur("feedback"), ease: [...CURVA.exit] } }}
      transition={{ duration: dur("enter"), ease: [...CURVA.out] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * O SINO É "COM VOCÊ": os achados que alguém atribuiu a você e ainda não
 * foram resolvidos — o mesmo que a home e a tela de Achados mostram ("aparecem
 * na home de quem recebeu", diz o aviso do parecer). O app não tem caixa de
 * notificações, e esta não inventa uma: não há "lido/não lido", o ponto só
 * diz que a lista não está vazia.
 */
function Sino({ ponto, abertoInicial }: { ponto: boolean; abertoInicial: boolean }) {
  const p = usePainel(abertoInicial);
  const ir = useIr();
  const total = COM_VOCE.reduce((n, c) => n + c.achados.length, 0);
  const temAlgo = ponto && total > 0;
  return (
    <div ref={p.raiz} className="pn-conta">
      <Botao variante="quiet" icone aria-label={temAlgo ? `Com você: ${total} achados` : "Com você: nada"} aria-haspopup="menu" className="pn-sino" {...p.gatilho}>
        <Bell />
        {temAlgo && <i />}
      </Botao>
      <AnimatePresence>
        {p.aberto && (
          <Painel painel={p.painel} andar={p.andar} rotulo="Com você" classe="pn-sino-painel">
            <div className="pn-sino-cabeca">
              <b>Com você</b>
              <span className="ds-num">{total} achados</span>
            </div>
            {temAlgo ? (
              COM_VOCE.map((c) => {
                const bloqueiam = c.achados.filter((a) => a.impacto === "block").length;
                return (
                  <button key={c.id} type="button" role="menuitem" className="pn-sino-item" onClick={() => (p.fechar(false), ir("nexo-auditoria", "achado"))}>
                    <span className="pn-sino-linha">
                      <span className="ds-code">{c.codigo}</span>
                      <b>{c.titulo}</b>
                    </span>
                    <span className="pn-sino-sub">
                      {c.pessoa.startsWith("Nexo") ? "Da sua auditoria" : `Enviado por ${c.pessoa}`}, {c.desde}
                      {c.dias >= 5 && <em className="pn-sino-parado">parado há {c.dias} dias</em>}
                    </span>
                    <span className="pn-sino-conta">
                      <span className="ds-num">{c.achados.length}</span> {c.achados.length === 1 ? "achado" : "achados"}
                      {bloqueiam > 0 && (
                        <span className="pn-sino-bloq">
                          <i aria-hidden /> {bloqueiam} {bloqueiam === 1 ? "impede" : "impedem"} a entrega
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="pn-sino-vazio">Nada com você agora.</p>
            )}
            <div className="pn-painel-pe">
              <button type="button" role="menuitem" onClick={() => (p.fechar(false), ir("achados"))}>
                Abrir Achados <ArrowRight size={14} aria-hidden />
              </button>
            </div>
          </Painel>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * O MENU DA CONTA: quem você é e com que alçada (as mesmas duas chaves de
 * Pessoas: centro de controle e escritório), para onde ir quando a barra não
 * cabe, os atalhos e as duas saídas do app (Sair, e Entrar com outra conta,
 * que é o `signOut` para /login da tela Sem acesso). Os destinos só aparecem
 * aqui quando a navegação saiu da barra, para nenhum ser oferecido duas vezes.
 */
function MenuDaConta({ atual, onAtalhos, abertoInicial }: { atual: Destino | null; onAtalhos?: () => void; abertoInicial: boolean }) {
  const { dur } = useTempo();
  const p = usePainel(abertoInicial);
  const ir = useIr();
  return (
    <div ref={p.raiz} className="pn-conta">
      <button type="button" className="pn-quem" aria-haspopup="menu" {...p.gatilho}>
        <Avatar iniciais={USUARIO.iniciais} />
        <span className="pn-quem-texto">
          {USUARIO.nome}
          <small>
            {USUARIO.escritorio}, {USUARIO.papel}
          </small>
        </span>
        <motion.span className="pn-quem-seta" animate={{ rotate: p.aberto ? 180 : 0 }} transition={{ duration: dur("state"), ease: [...CURVA.out] }}>
          <ChevronDown size={14} />
        </motion.span>
      </button>
      <AnimatePresence>
        {p.aberto && (
          <Painel painel={p.painel} andar={p.andar} rotulo="Conta" classe="pn-menu">
            <div className="pn-menu-quem">
              <span className="pn-menu-avatar" aria-hidden>
                {USUARIO.iniciais}
              </span>
              <span className="pn-menu-nome">
                <b>Victor Alves</b>
                <small className="mp-mono">victor@prosul.com.br</small>
              </span>
            </div>
            <dl className="pn-menu-alcada">
              <div>
                <dt>Centro de controle</dt>
                <dd>{USUARIO.papel === "admin" ? <em>Admin</em> : "Usuário"}</dd>
              </div>
              <div>
                <dt>Escritório</dt>
                <dd>
                  PROSUL <span className="pn-menu-papel">membro</span>
                </dd>
              </div>
            </dl>
            <div className="pn-menu-destinos" role="group" aria-label="Ir para">
              {DESTINOS.map((d) => (
                <button key={d} type="button" role="menuitem" aria-current={d === atual ? "page" : undefined} onClick={() => (p.fechar(false), ir(...DESTINO_DA_BARRA[d]))}>
                  {d}
                </button>
              ))}
            </div>
            <div className="pn-menu-grupo">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  p.fechar(false);
                  onAtalhos?.();
                }}
              >
                <Keyboard size={15} aria-hidden />
                Atalhos de teclado
                <Tecla>?</Tecla>
              </button>
            </div>
            <div className="pn-menu-grupo">
              <button type="button" role="menuitem" onClick={() => (p.fechar(false), ir("entrada", "padrao"))}>
                <Repeat2 size={15} aria-hidden />
                Entrar com outra conta
              </button>
              <button type="button" role="menuitem" className="pn-menu-sair" onClick={() => (p.fechar(false), ir("entrada", "padrao"))}>
                <LogOut size={15} aria-hidden />
                Sair
              </button>
            </div>
            <p className="pn-menu-nota">Conta Google. Sair encerra a sessão só neste navegador.</p>
          </Painel>
        )}
      </AnimatePresence>
    </div>
  );
}
