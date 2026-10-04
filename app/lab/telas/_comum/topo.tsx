"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ArrowRight, Bell, ChevronDown, FolderOpen, Keyboard, LayoutGrid, LifeBuoy, ListChecks, LogOut, MessageSquare, Repeat2, Search, ShieldCheck } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type KeyboardEvent as KE, type ReactNode, type RefObject } from "react";

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
export const ControleDoTopo = createContext<{
  onBusca?: () => void;
  onAtalhos?: () => void;
  aberto?: "menu" | "sino" | null;
  pularVisivel?: boolean;
  /** "pilula": a barra solta, em cápsula (ref.: Navbar Interaction, 03/10/2026). Em comparação; o padrão segue "faixa". */
  estilo?: "faixa" | "pilula";
}>({});

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
  const pilula = ctx.estilo === "pilula";
  return (
    <div className={`pn-topo-caixa${pilula ? " pn-topo-caixa--pilula" : ""}`}>
      <a href="#conteudo" className={`pn-pular${ctx.pularVisivel ? " pn-pular--visivel" : ""}`}>
        Pular para o conteúdo
        <Tecla>↵</Tecla>
      </a>
      <header className="pn-topo">
        {/* larga: a marca leva ao Painel; estreita (abaixo de 1280): a marca abre o cartão de navegação */}
        <a className="pn-marca pn-marca--link" href="#inicio" onClick={(e) => (e.preventDefault(), ir("inicio"))}>
          <span className="pn-marca-circulo">
            <Orbe tamanho={22} estado={trabalhando ? "trabalhando" : "repouso"} />
          </span>
          <span className="pn-marca-nome">Nexo</span>
        </a>
        <CartaoDeNavegacao atual={atual} trabalhando={trabalhando} />
        {pilula ? (
          <NavComRealce atual={atual} />
        ) : (
          <nav className="pn-nav" aria-label="Principal">
            {DESTINOS.map((n) => (
              <a key={n} href={`#${DESTINO_DA_BARRA[n][0]}`} aria-current={n === atual ? "page" : undefined} onClick={(e) => (e.preventDefault(), ir(...DESTINO_DA_BARRA[n]))}>
                {n}
              </a>
            ))}
          </nav>
        )}
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

/*
 * OS DESTINOS COM REALCE (barra em pílula, 03/10/2026). Uma cápsula clara mora
 * no destino atual e desliza para onde o mouse ou o foco está; ao sair, volta
 * para o atual. Só se move em resposta ao gesto, nunca sozinha. O `LayoutGroup`
 * com id próprio impede que duas barras na mesma página (a tela estreita mostra
 * quatro) troquem o realce entre si.
 */
function NavComRealce({ atual }: { atual: Destino | null }) {
  const ir = useIr();
  const { dur } = useTempo();
  const grupo = useId();
  const [sob, setSob] = useState<Destino | null>(null);
  const realce = sob ?? atual;
  return (
    <LayoutGroup id={grupo}>
      <nav className="pn-nav" aria-label="Principal" onPointerLeave={() => setSob(null)}>
        {DESTINOS.map((n) => (
          <a
            key={n}
            href={`#${DESTINO_DA_BARRA[n][0]}`}
            aria-current={n === atual ? "page" : undefined}
            onPointerEnter={() => setSob(n)}
            onFocus={() => setSob(n)}
            onBlur={() => setSob(null)}
            onClick={(e) => (e.preventDefault(), ir(...DESTINO_DA_BARRA[n]))}
          >
            {n === realce && <motion.span layoutId="pn-realce" className="pn-realce" transition={{ duration: dur("state"), ease: [...CURVA.out] }} aria-hidden />}
            <span className="pn-nav-texto">{n}</span>
          </a>
        ))}
      </nav>
    </LayoutGroup>
  );
}

/*
 * O CARTÃO DE NAVEGAÇÃO (ref.: Card Nav, 01/10/2026). Abaixo de 1280 os
 * destinos não cabem na barra; em vez de irem morar no menu da conta (que é
 * da conta, não do app), a marca vira o botão que abre um cartão com os seis
 * destinos, cada um com uma linha do que tem lá agora. Sem painéis coloridos:
 * a cor fica para o sinal (o vermelho de quem bloqueia). Acima de 1280, a
 * barra continua inteira, que é o mais rápido de ler.
 */
const ICONE_DO_DESTINO: Record<Destino, ReactNode> = {
  Painel: <LayoutGrid size={16} />,
  Nexo: <MessageSquare size={16} />,
  Projetos: <FolderOpen size={16} />,
  Achados: <ListChecks size={16} />,
  Ajuda: <LifeBuoy size={16} />,
  Administração: <ShieldCheck size={16} />,
};

function CartaoDeNavegacao({ atual, trabalhando }: { atual: Destino | null; trabalhando: boolean }) {
  const { dur, k } = useTempo();
  const p = usePainel(false);
  const ir = useIr();
  const comVoce = COM_VOCE.reduce((n, c) => n + c.achados.length, 0);
  const bloqueiam = COM_VOCE.reduce((n, c) => n + c.achados.filter((a) => a.impacto === "block").length, 0);
  const LINHA: Record<Destino, ReactNode> = {
    Painel: "Tarefas e o que retomar",
    Nexo: (
      <>
        <span className="ds-code">117-25</span> auditar o memorial geral
      </>
    ),
    Projetos: <span className="ds-num">9 obras abertas</span>,
    Achados: (
      <span className="pn-cartao-sinal">
        <span className="ds-num">{comVoce}</span> com você
        {bloqueiam > 0 && (
          <em>
            <i aria-hidden /> {bloqueiam} bloqueiam
          </em>
        )}
      </span>
    ),
    Ajuda: "Tarefas, lugares e palavras",
    Administração: "Centro de controle",
  };
  return (
    <div ref={p.raiz} className="pn-conta pn-marca-raiz">
      <button type="button" className="pn-marca pn-marca--botao" aria-haspopup="menu" aria-label="Navegação" {...p.gatilho}>
        <span className="pn-marca-circulo">
          <Orbe tamanho={22} estado={trabalhando ? "trabalhando" : "repouso"} />
        </span>
        <span className="pn-marca-nome">Nexo</span>
        <motion.span className="pn-quem-seta" animate={{ rotate: p.aberto ? 180 : 0 }} transition={{ duration: dur("state"), ease: [...CURVA.out] }}>
          <ChevronDown size={14} />
        </motion.span>
      </button>
      <AnimatePresence>
        {p.aberto && (
          <Painel painel={p.painel} andar={p.andar} rotulo="Navegação" classe="pn-cartao-nav">
            <div className="pn-cartao-grade">
              {DESTINOS.map((d, i) => (
                <motion.button
                  key={d}
                  type="button"
                  role="menuitem"
                  aria-current={d === atual ? "page" : undefined}
                  className="pn-cartao-destino"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: dur("enter"), delay: (0.04 + i * 0.03) * k, ease: [...CURVA.out] }}
                  onClick={() => (p.fechar(false), ir(...DESTINO_DA_BARRA[d]))}
                >
                  <span className="pn-cartao-icone">{ICONE_DO_DESTINO[d]}</span>
                  <b>{d}</b>
                  <span className="pn-cartao-linha">{LINHA[d]}</span>
                </motion.button>
              ))}
            </div>
          </Painel>
        )}
      </AnimatePresence>
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
 * Pessoas: centro de controle e escritório), os atalhos e as duas saídas do
 * app (Sair, e Entrar com outra conta, que é o `signOut` para /login da tela
 * Sem acesso). Só a conta: os destinos, quando não cabem na barra, vão para o
 * cartão de navegação da marca, e não para cá.
 */
function MenuDaConta({ atual, onAtalhos, abertoInicial }: { atual: Destino | null; onAtalhos?: () => void; abertoInicial: boolean }) {
  const { dur } = useTempo();
  const p = usePainel(abertoInicial);
  const ir = useIr();
  return (
    <div ref={p.raiz} className="pn-conta">
      <button
        type="button"
        className="pn-quem"
        aria-haspopup="menu"
        {...p.gatilho}
        // O brilho da barra em pílula segue o ponteiro (só existe lá; na faixa o CSS não o desenha).
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
          e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
        }}
      >
        <span className="pn-quem-brilho" aria-hidden />
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
                <small className="mp-mono">victor@exemplo.com.br</small>
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
