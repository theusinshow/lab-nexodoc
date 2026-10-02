"use client";

import { motion } from "motion/react";
import { BarChart3, Database, Gauge, KeyRound, RefreshCcw, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { useAdminToken } from "@/components/admin/admin-token";
import { Botao, Girando, Tecla } from "@/components/ds/basicos";
import { useTempo } from "@/lib/ds/tempo";
import { formatarHora } from "@/lib/fuso-de-brasilia";

import { RITMO, SUAVE } from "../comum/ritmo";
import "../mapa/mapa.css";
import "./admin.css";

/*
 * O CENTRO DE CONTROLE no sistema novo. Cinco destinos agrupados pela pergunta
 * que se faz, o veredito sempre à vista no trilho e o token pedido uma vez, no
 * pé dele. A lógica é a do painel de antes (o token é do painel, não da tela —
 * `components/admin/admin-token.tsx`); muda a pele.
 */

export const DESTINOS_DO_ADMIN = [
  { href: "/admin", nome: "Cockpit", pergunta: "está tudo de pé?", icone: Gauge },
  { href: "/admin/dinheiro", nome: "Dinheiro", pergunta: "quanto custou?", icone: BarChart3 },
  { href: "/admin/motor", nome: "Motor", pergunta: "está melhorando?", icone: ShieldCheck },
  { href: "/admin/pessoas", nome: "Pessoas", pergunta: "quem entra?", icone: UsersRound },
  { href: "/admin/dados", nome: "Dados", pergunta: "o que o banco guarda?", icone: Database },
] as const;

/** O que a tela aberta conta ao cabeçalho: de quando são os dados e o que mais vai lá (o período do Dinheiro). */
type Cabeca = { atualizadoEm?: string | null; carregando?: boolean; extra?: ReactNode };
const ContextoDaCasca = createContext<(c: Cabeca) => void>(() => {});

/** Cada destino diz ao cabeçalho de quando são os dados que mostra. */
export function useCabecaDoAdmin(c: Cabeca) {
  const definir = useContext(ContextoDaCasca);
  useEffect(() => {
    definir(c);
  }, [definir, c.atualizadoEm, c.carregando, c.extra]); // eslint-disable-line react-hooks/exhaustive-deps
}

function digitando(alvo: EventTarget | null) {
  return !!(alvo as HTMLElement | null)?.closest?.("input, textarea, select, [contenteditable=true]");
}

export function CascaDoAdmin({ children }: { children: ReactNode }) {
  const caminho = usePathname();
  const router = useRouter();
  const { aceito, recarregar } = useAdminToken();
  const [cabeca, setCabeca] = useState<Cabeca>({});
  // IGUALDADE EXATA: "/admin" é prefixo dos outros quatro
  const atual = DESTINOS_DO_ADMIN.find((d) => d.href === caminho) ?? DESTINOS_DO_ADMIN[0];

  // 1–5 trocam de destino; R relê os dados
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || digitando(e.target)) return;
      const i = Number(e.key) - 1;
      if (i >= 0 && i < DESTINOS_DO_ADMIN.length) {
        e.preventDefault();
        router.push(DESTINOS_DO_ADMIN[i].href);
      } else if (e.key.toLowerCase() === "r" && aceito) {
        e.preventDefault();
        recarregar();
      }
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [router, aceito, recarregar]);

  return (
    <ContextoDaCasca.Provider value={setCabeca}>
      <div className="mp adm">
        <header className="mp-cabeca">
          <div>
            <p className="mp-trilha">
              <span>Centro de controle</span>
            </p>
            <h1>{atual.nome}</h1>
          </div>
          {aceito && (
            <div className="adm-atualizado">
              {cabeca.extra}
              {cabeca.atualizadoEm && <span className="ds-num">dados de {formatarHora(cabeca.atualizadoEm)}</span>}
              <Botao variante="quiet" tamanho="sm" onClick={recarregar} aria-busy={cabeca.carregando}>
                {cabeca.carregando ? <Girando tamanho={13} /> : <RefreshCcw size={13} />} Atualizar <Tecla>R</Tecla>
              </Botao>
            </div>
          )}
        </header>
        <div className="adm-corpo">
          <TrilhoDoAdmin atual={atual.href} />
          <div className="adm-conteudo">{children}</div>
        </div>
      </div>
    </ContextoDaCasca.Provider>
  );
}

type Status = { veredito: "operacional" | "degradado" | "parado"; linha: string; motivo?: string };

function TrilhoDoAdmin({ atual }: { atual: string }) {
  const { k } = useTempo();
  const { token, restaurado, recarga, aceito, recusado, definirToken, recarregar, sair } = useAdminToken();
  const [status, setStatus] = useState<Status | null>(null);
  const [editando, setEditando] = useState(false);

  // O veredito vem de /api/admin/status: quatro contagens, não a visão geral inteira.
  useEffect(() => {
    const limpo = token.trim();
    if (!restaurado || !limpo) return;
    const controlador = new AbortController();
    fetch("/api/admin/status", { cache: "no-store", signal: controlador.signal, headers: { Authorization: `Bearer ${limpo}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((corpo) => !controlador.signal.aborted && setStatus(corpo?.status ?? null))
      // Silêncio aqui é certo: quem diz que o token falhou é a tela, com a frase dela.
      .catch(() => !controlador.signal.aborted && setStatus(null));
    return () => controlador.abort();
  }, [token, restaurado, recarga]);

  const mostrarStatus = token.trim() ? status : null;
  const recolhido = token && aceito && !editando;
  const [titulo, ...resto] = (mostrarStatus?.linha ?? "").split(" · ");

  return (
    <nav className="adm-trilho" aria-label="Navegação administrativa">
      <p className={`adm-veredito${mostrarStatus ? ` adm-veredito--${mostrarStatus.veredito}` : ""}`}>
        {mostrarStatus ? (
          <>
            <i aria-hidden />
            <span>
              <b>{titulo}</b>
              {resto.join(" · ")}
            </span>
          </>
        ) : (
          <span>{aceito ? "veredito indisponível" : "aguardando token"}</span>
        )}
      </p>
      {mostrarStatus?.motivo && mostrarStatus.veredito !== "operacional" && <p className="adm-motivo">{mostrarStatus.motivo}</p>}

      <div className="adm-destinos">
        {DESTINOS_DO_ADMIN.map((d, i) => {
          const Icone = d.icone;
          return (
            <Link key={d.href} href={d.href} aria-current={atual === d.href ? "page" : undefined} className="adm-destino">
              {atual === d.href && <motion.i layoutId="adm-destino" className="adm-destino-fundo" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
              <Icone size={15} aria-hidden />
              <span className="adm-destino-texto">
                <b>{d.nome}</b>
                <small>{d.pergunta}</small>
              </span>
              <Tecla>{i + 1}</Tecla>
            </Link>
          );
        })}
      </div>

      <div className="adm-token">
        {recolhido ? (
          <>
            <p className="adm-token-rotulo">
              <KeyRound size={13} aria-hidden /> sessão admin
            </p>
            <p className="adm-token-acoes">
              <button type="button" onClick={recarregar}>
                atualizar
              </button>
              <span aria-hidden>·</span>
              <button type="button" onClick={() => setEditando(true)}>
                trocar
              </button>
              <span aria-hidden>·</span>
              {/* sair esquece o token desta aba: o painel volta a pedir */}
              <button type="button" onClick={sair}>
                sair
              </button>
            </p>
          </>
        ) : (
          <form
            className="adm-token-form"
            onSubmit={(e) => {
              e.preventDefault();
              setEditando(false);
              recarregar();
            }}
          >
            <label htmlFor="adm-token">Token de administração</label>
            <input
              id="adm-token"
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => {
                // digitar é editar: sem isto o campo se recolheria na primeira tecla
                setEditando(true);
                definirToken(e.target.value);
              }}
              aria-invalid={recusado}
              placeholder="NEXODOC_ADMIN_TOKEN"
            />
            {recusado && <p className="adm-token-erro">O servidor recusou este token.</p>}
            <Botao variante="ghost" tamanho="sm" type="submit">
              Entrar
            </Botao>
            <p className="adm-token-nota">Fica só nesta aba do navegador.</p>
          </form>
        )}
      </div>
    </nav>
  );
}
