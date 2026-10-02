"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";
import type { ObraNaMoldura, RecenteNaMoldura } from "@/lib/moldura";

import { BarraDeComando } from "./barra-de-comando";
import "./sobreposicoes.css";

/*
 * O QUE APARECE POR CIMA DE QUALQUER TELA. Três formas, cada uma com o seu
 * peso: a paleta e os atalhos escurecem a tela e prendem o foco (são um
 * desvio pedido pela pessoa); o aviso não escurece nada e não rouba foco (é
 * uma notícia sobre o que ela acabou de fazer).
 */

type Atalho = { teclas: string[]; texto: string };
type GrupoDeAtalhos = { nome: string; onde?: string; atalhos: Atalho[] };

export const ATALHOS: GrupoDeAtalhos[] = [
  {
    nome: "Em qualquer tela",
    atalhos: [
      { teclas: ["Ctrl", "K"], texto: "Buscar obra, código ou ação" },
      { teclas: ["?"], texto: "Mostrar estes atalhos" },
      { teclas: ["Esc"], texto: "Fechar o que estiver aberto" },
    ],
  },
  {
    // G e depois a letra, como no Linear e no GitHub: Ctrl A e Ctrl L, os de
    // antes, são "selecionar tudo" e a barra de endereço do navegador.
    nome: "Ir para",
    onde: "G e depois a letra",
    atalhos: [
      { teclas: ["G", "P"], texto: "Painel" },
      { teclas: ["G", "N"], texto: "Nexo" },
      { teclas: ["G", "O"], texto: "Projetos (obras)" },
      { teclas: ["G", "A"], texto: "Achados" },
      { teclas: ["G", "J"], texto: "Ajuda" },
      { teclas: ["G", "D"], texto: "Administração" },
    ],
  },
  {
    nome: "Nas listas",
    onde: "Projetos, Projeto, Achados",
    atalhos: [
      { teclas: ["J"], texto: "Próximo item" },
      { teclas: ["K"], texto: "Item anterior" },
      { teclas: ["/"], texto: "Buscar na lista" },
      { teclas: ["N"], texto: "Novo projeto (em Projetos)" },
    ],
  },
  {
    nome: "No parecer",
    onde: "a fila de achados",
    atalhos: [
      { teclas: ["J"], texto: "Próximo achado" },
      { teclas: ["K"], texto: "Achado anterior" },
      { teclas: ["C"], texto: "Marcar corrigido" },
      { teclas: ["D"], texto: "Decisão técnica" },
      { teclas: ["F"], texto: "Falso positivo" },
      { teclas: ["M"], texto: "Ver no memorial" },
    ],
  },
];

/** O véu e a caixa: escurece, centra no terço de cima, fecha com Esc e com clique fora. */
export function Camada({ aberta, onFechar, rotulo, largura, children }: { aberta: boolean; onFechar: () => void; rotulo: string; largura: number; children: ReactNode }) {
  const { dur } = useTempo();
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberta) return;
    const antes = document.activeElement as HTMLElement | null;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      onFechar();
    };
    document.addEventListener("keydown", esc);
    // Sem nada focável lá dentro (os atalhos), o foco vai para a própria caixa.
    requestAnimationFrame(() => {
      if (!caixa.current?.contains(document.activeElement)) caixa.current?.focus();
    });
    return () => {
      document.removeEventListener("keydown", esc);
      antes?.focus?.();
    };
  }, [aberta, onFechar]);

  return (
    <AnimatePresence>
      {aberta && (
        <motion.div
          className="pc-veu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: dur("feedback") } }}
          transition={{ duration: dur("enter") }}
          onMouseDown={(e) => e.target === e.currentTarget && onFechar()}
        >
          <motion.div
            ref={caixa}
            role="dialog"
            aria-modal="true"
            aria-label={rotulo}
            tabIndex={-1}
            className="pc-caixa"
            style={{ width: `min(${largura}px, 100% - 32px)` }}
            initial={{ opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99, transition: { duration: dur("feedback"), ease: [...CURVA.exit] } }}
            transition={{ duration: dur("enter"), ease: [...CURVA.out] }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Paleta({ aberta, onFechar, obras, recentes, inicialQ = "" }: { aberta: boolean; onFechar: () => void; obras: ObraNaMoldura[]; recentes: RecenteNaMoldura[]; inicialQ?: string }) {
  return (
    <Camada aberta={aberta} onFechar={onFechar} rotulo="Buscar obra, código ou ação" largura={880}>
      <div className="pc-paleta">
        <BarraDeComando modo="fixa" obras={obras} recentes={recentes} onIr={onFechar} inicialQ={inicialQ} />
      </div>
    </Camada>
  );
}

export function Atalhos({ aberta, onFechar }: { aberta: boolean; onFechar: () => void }) {
  return (
    <Camada aberta={aberta} onFechar={onFechar} rotulo="Atalhos de teclado" largura={720}>
      <header className="pc-atalhos-cabeca">
        <h2>Atalhos de teclado</h2>
        <Botao variante="quiet" icone aria-label="Fechar" onClick={onFechar}>
          <X />
        </Botao>
      </header>
      <div className="pc-atalhos">
        {ATALHOS.map((g) => (
          <section key={g.nome} className="pc-atalhos-grupo" aria-label={g.nome}>
            <h3>
              {g.nome}
              {g.onde && <small>{g.onde}</small>}
            </h3>
            <dl>
              {g.atalhos.map((a) => (
                <div key={a.texto}>
                  <dt>{a.texto}</dt>
                  <dd>
                    {a.teclas.map((t, i) => (
                      <Tecla key={i}>{t}</Tecla>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <p className="pc-rodape pc-rodape--texto">As teclas de letra ficam caladas enquanto você digita num campo.</p>
    </Camada>
  );
}

/**
 * O AVISO PASSAGEIRO:
 *  - sucesso some sozinho em 6 s, falha espera alguém fechar;
 *  - o relógio PARA enquanto o mouse ou o foco estão no aviso;
 *  - o que aconteceu em negrito, o que fazer embaixo, a ação ao lado;
 *  - o mesmo aviso repetido não empilha: ganha "2×";
 *  - no máximo três à vista: os sucessos mais velhos esperam em "mais N";
 *  - Esc com o foco no aviso fecha só ele.
 */
export type Aviso = { id: number; tom: "ok" | "falha"; titulo: string; texto?: string; acao?: string; link?: string; vezes?: number };

export function juntarAviso(lista: Aviso[], novo: Omit<Aviso, "id">): Aviso[] {
  const igual = lista.find((a) => a.titulo === novo.titulo && a.texto === novo.texto);
  if (igual) return [...lista.filter((a) => a !== igual), { ...igual, id: Date.now(), vezes: (igual.vezes ?? 1) + 1 }];
  return [...lista, { ...novo, id: Date.now() }];
}

function UmAviso({ a, onFechar, onAcao }: { a: Aviso; onFechar: (id: number) => void; onAcao?: (a: Aviso) => void }) {
  const [parado, setParado] = useState(false);
  const resta = useRef(6000);
  useEffect(() => {
    resta.current = 6000;
  }, [a.id]);
  useEffect(() => {
    if (a.tom !== "ok" || parado) return;
    const comeco = performance.now();
    const t = setTimeout(() => onFechar(a.id), resta.current);
    return () => {
      clearTimeout(t);
      resta.current = Math.max(800, resta.current - (performance.now() - comeco));
    };
  }, [a.id, a.tom, parado, onFechar]);
  const Icone = a.tom === "ok" ? Check : TriangleAlert;
  return (
    <div
      className={`pc-aviso pc-aviso--${a.tom}`}
      role={a.tom === "falha" ? "alert" : "status"}
      onMouseEnter={() => setParado(true)}
      onMouseLeave={() => setParado(false)}
      onFocus={() => setParado(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setParado(false)}
      onKeyDown={(e) => e.key === "Escape" && (e.preventDefault(), onFechar(a.id))}
    >
      <span className="pc-aviso-icone">
        <Icone size={14} aria-hidden />
      </span>
      <div className="pc-aviso-corpo">
        <p className="pc-aviso-titulo">
          {a.titulo}
          {a.vezes && a.vezes > 1 && <span className="pc-aviso-vezes ds-num">{a.vezes}×</span>}
        </p>
        {a.texto && <p className="pc-aviso-texto">{a.texto}</p>}
        {a.link && <input className="pc-aviso-link mp-mono" readOnly value={a.link} aria-label="Link" onFocus={(e) => e.currentTarget.select()} />}
      </div>
      {a.acao && (
        <Botao variante="ghost" tamanho="sm" className="pc-aviso-acao" onClick={() => onAcao?.(a)}>
          {a.acao}
        </Botao>
      )}
      <button type="button" className="pc-aviso-fechar" aria-label="Fechar aviso" onClick={() => onFechar(a.id)}>
        <X size={15} aria-hidden />
      </button>
    </div>
  );
}

export function Avisos({ avisos, onFechar, onAcao }: { avisos: Aviso[]; onFechar: (id: number) => void; onAcao?: (a: Aviso) => void }) {
  const { dur } = useTempo();
  const [todosPedido, setTodos] = useState(false);
  // "mostrar todos" vale enquanto há o que esconder; voltando a três ou menos, desliga sozinho
  const todos = todosPedido && avisos.length > 3;
  // Passando de três, esperam os sucessos mais velhos: o mais novo e as falhas ficam sempre à vista.
  const guardados = new Set<number>();
  if (!todos)
    for (const a of avisos) {
      if (avisos.length - guardados.size <= 3) break;
      if (a.tom === "ok" && a !== avisos[avisos.length - 1]) guardados.add(a.id);
    }
  const escondidos = guardados.size;
  const vistos = avisos.filter((a) => !guardados.has(a.id));
  return (
    <section className="pc-avisos" aria-label="Avisos" aria-live="polite">
      <AnimatePresence initial={false}>
        {escondidos > 0 && (
          <motion.button key="mais" type="button" className="pc-avisos-mais" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setTodos(true)}>
            mais {escondidos} {escondidos === 1 ? "aviso" : "avisos"}
          </motion.button>
        )}
        {vistos.map((a) => (
          <motion.div
            key={a.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6, transition: { duration: dur("feedback") } }}
            transition={{ duration: dur("enter"), ease: [...CURVA.out] }}
          >
            <UmAviso a={a} onFechar={onFechar} onAcao={onAcao} />
          </motion.div>
        ))}
        {avisos.length > 1 && (
          <motion.button key="limpar" type="button" className="pc-avisos-limpar" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => avisos.forEach((a) => onFechar(a.id))}>
            fechar todos
          </motion.button>
        )}
      </AnimatePresence>
    </section>
  );
}
