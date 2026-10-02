"use client";

import { AnimatePresence, motion } from "motion/react";
import { Clock, FileSearch, Layers, ListChecks, ScanLine } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";

import { Orbe, Tecla } from "@/components/ds/basicos";
import { linkDoNexo, type IntencaoDeLink } from "@/lib/contexto-da-url";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";
import { formatarEmBrasilia } from "@/lib/fuso-de-brasilia";
import type { ObraNaMoldura, RecenteNaMoldura } from "@/lib/moldura";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import "./barra-de-comando.css";

/*
 * A BARRA DE COMANDO — a busca do topo (Ctrl K) e, na home, a própria tela.
 * Três tipos de coisa se buscam pela mesma barra: tarefas, obras e trabalhos
 * recentes. O que não casa com nada vira mensagem ao Nexo, que chega ESCRITA
 * no chat (`/nexo?mensagem=`) e só sai quando a pessoa aperta Enter lá.
 *
 * O movimento é curto de propósito: o destaque desliza entre as linhas e o
 * detalhe troca em 120 ms. Nada aqui pode ser mais lento que a digitação.
 */

type Linha = [rotulo: string, valor: string];
type Detalhe = {
  titulo: string;
  linhas: Linha[];
  nota?: string;
  enter: string;
};

type Tarefa = {
  id: string;
  intencao: IntencaoDeLink;
  nome: string;
  atalho: string;
  sinonimos: string[];
  icone: ComponentType<{ size?: number }>;
  detalhe: Detalhe;
};

/* As quatro tarefas, com o que cada uma pede e faz — sem tempo nem custo
   estimado: o número certo depende do documento, e a conversa diz antes de gastar. */
const TAREFAS: Tarefa[] = [
  {
    id: "auditar",
    intencao: "auditar",
    nome: "Auditar um memorial",
    atalho: "Ctrl 1",
    sinonimos: ["auditoria", "memorial", "parecer", "revisar"],
    icone: FileSearch,
    detalhe: {
      titulo: "Auditar um memorial",
      linhas: [
        ["Precisa de", "memorial descritivo em PDF"],
        ["Confere", "identidade, quadro de áreas, normas, capítulos"],
      ],
      nota: "O Nexo lê a capa e o carimbo e acha a obra sozinho.",
      enter: "Abrir no Nexo",
    },
  },
  {
    id: "ld",
    intencao: "ld",
    nome: "Gerar LD e capa",
    atalho: "Ctrl 2",
    sinonimos: [
      "ld",
      "lista",
      "documentos",
      "capa",
      "carimbo",
      "selo",
      "separatriz",
    ],
    icone: ListChecks,
    detalhe: {
      titulo: "Gerar LD e capa",
      linhas: [
        ["Precisa de", "pranchas em PDF"],
        ["Gera", "lista de documentos, capa da prefeitura, separatrizes"],
      ],
      nota: "Folhas sem carimbo ficam para você conferir no mapa.",
      enter: "Abrir no Nexo",
    },
  },
  {
    id: "volume",
    intencao: "montar",
    nome: "Montar um volume",
    atalho: "Ctrl 3",
    sinonimos: ["volume", "montar", "tomo", "exportar", "zip"],
    icone: Layers,
    detalhe: {
      titulo: "Montar um volume",
      linhas: [
        ["Precisa de", "as pranchas em PDF"],
        ["Faz", "divide em tomos, gera capa, LD e separatrizes, junta o PDF"],
      ],
      enter: "Abrir no Nexo",
    },
  },
  {
    id: "conferir",
    intencao: "conferir",
    nome: "Conferir as folhas",
    atalho: "Ctrl 4",
    sinonimos: ["conferir", "carimbo", "revisao", "folhas", "pranchas"],
    icone: ScanLine,
    detalhe: {
      titulo: "Conferir as folhas",
      linhas: [
        ["Precisa de", "pranchas em PDF"],
        ["Confere", "código, revisão e disciplina de cada carimbo"],
      ],
      enter: "Abrir no Nexo",
    },
  },
];

/** Sem acento e em minúscula: "criciuma" acha "Criciúma". */
const normal = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const STATUS: Record<string, string> = {
  PROCESSING: "rodando",
  COMPLETED: "concluída",
  FAILED: "falhou",
  CANCELED: "cancelada",
};
const quando = (iso: string) =>
  formatarEmBrasilia(iso, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

type Item = {
  tipo: "item";
  id: string;
  href: string;
  titulo: ReactNode;
  sub?: string;
  direita?: ReactNode;
  icone: ReactNode;
  detalhe: Detalhe;
  cliente?: string;
  nexo?: boolean;
};
type Entrada =
  { tipo: "grupo"; nome: string } | { tipo: "vazio"; texto: string } | Item;

function montar(
  q: string,
  obras: ObraNaMoldura[],
  recentes: RecenteNaMoldura[],
): Entrada[] {
  const t = normal(q.trim());
  const out: Entrada[] = [];
  const obraItem = (o: ObraNaMoldura): Item => ({
    tipo: "item",
    id: `obra-${o.id}`,
    href: `/projetos/${o.id}`,
    titulo: o.nome,
    sub: o.cliente || undefined,
    direita: <span className="ds-code">{o.codigo}</span>,
    icone: <MarcaDaPrefeitura prefeitura={o.cliente} forma="sinal" />,
    cliente: o.cliente,
    detalhe: {
      titulo: o.nome,
      linhas: [
        ["Código", o.codigo],
        ...(o.cliente ? ([["Cliente", o.cliente]] as Linha[]) : []),
        ["Atualizado", quando(o.atualizadoEm)],
      ],
      enter: "Abrir o projeto",
    },
  });
  const recenteItem = (r: RecenteNaMoldura): Item => ({
    tipo: "item",
    id: `rec-${r.auditId}`,
    href: linkDoNexo({ auditoria: r.auditId }),
    titulo: r.titulo,
    sub: [r.codigo, STATUS[r.status] ?? r.status].filter(Boolean).join(", "),
    direita: <span className="cf-quando">{quando(r.criadoEm)}</span>,
    icone: <Clock size={16} />,
    detalhe: {
      titulo: r.titulo,
      linhas: [
        ["Tarefa", "auditoria"],
        ["Estado", STATUS[r.status] ?? r.status],
        ...(r.codigo ? ([["Obra", r.codigo]] as Linha[]) : []),
        ["Quando", quando(r.criadoEm)],
      ],
      enter: "Abrir o parecer",
    },
  });
  const tarefaItem = (tf: Tarefa): Item => {
    const I = tf.icone;
    return {
      tipo: "item",
      id: `tar-${tf.id}`,
      href: linkDoNexo({ intencao: tf.intencao }),
      titulo: tf.nome,
      icone: <I size={16} />,
      direita: <Tecla>{tf.atalho}</Tecla>,
      detalhe: tf.detalhe,
    };
  };

  if (!t) {
    if (recentes.length) {
      out.push({ tipo: "grupo", nome: "Recentes" });
      recentes.forEach((r) => out.push(recenteItem(r)));
    }
    out.push({ tipo: "grupo", nome: "Tarefas" });
    TAREFAS.forEach((tf) => out.push(tarefaItem(tf)));
    if (obras.length) {
      out.push({ tipo: "grupo", nome: "Obras" });
      obras.slice(0, 4).forEach((o) => out.push(obraItem(o)));
    }
    return out;
  }

  const achadas = obras
    .filter(
      (o) =>
        normal(`${o.codigo} ${o.nome} ${o.cliente}`).includes(t) ||
        t
          .split(/\s+/)
          .some((p) => p.length >= 3 && normal(o.codigo).includes(p)),
    )
    .slice(0, 8);
  const tarefas = TAREFAS.filter((tf) =>
    [tf.nome, ...tf.sinonimos].some(
      (s) =>
        normal(s).includes(t) ||
        t.split(/\s+/).some((p) => p.length >= 2 && normal(s).startsWith(p)),
    ),
  );
  const rec = recentes.filter((r) =>
    normal(`${r.titulo} ${r.codigo ?? ""}`).includes(t),
  );
  const frase = t.split(/\s+/).length >= 4;

  const nexo: Item = {
    tipo: "item",
    id: "nexo",
    nexo: true,
    href: linkDoNexo({ mensagem: q.trim() }),
    titulo: (
      <>
        Perguntar ao Nexo: <span className="cf-citacao">“{q.trim()}”</span>
      </>
    ),
    icone: <Orbe tamanho={14} />,
    direita: <Tecla>↵</Tecla>,
    detalhe: {
      titulo: "Perguntar ao Nexo",
      linhas: [["Mensagem", q.trim()]],
      nota: "Chega escrita no chat; o Nexo só começa quando você enviar.",
      enter: "Levar ao Nexo",
    },
  };

  if (frase) out.push({ tipo: "grupo", nome: "Nexo" }, nexo);
  if (achadas.length) {
    out.push({ tipo: "grupo", nome: "Obras" });
    achadas.forEach((o) => out.push(obraItem(o)));
  }
  if (tarefas.length) {
    out.push({ tipo: "grupo", nome: "Tarefas" });
    tarefas.forEach((tf) => out.push(tarefaItem(tf)));
  }
  if (rec.length) {
    out.push({ tipo: "grupo", nome: "Recentes" });
    rec.forEach((r) => out.push(recenteItem(r)));
  }
  if (!achadas.length && !tarefas.length && !rec.length)
    out.push({
      tipo: "vazio",
      texto: `Nenhuma obra, tarefa ou trabalho com “${q.trim()}”.`,
    });
  if (!frase) out.push({ tipo: "grupo", nome: "Nexo" }, nexo);
  return out;
}

const ease = (c: readonly number[]) =>
  [...c] as [number, number, number, number];

/**
 * Dois modos:
 *  - "fixa": lista e detalhe sempre abertos (a paleta do Ctrl K);
 *  - "suspensa": só a entrada aparece; a lista abre POR CIMA do conteúdo com
 *    foco e texto ou seta para baixo, e fecha com Esc ou clique fora (a home).
 */
export function BarraDeComando({
  modo = "fixa",
  obras,
  recentes,
  autoFoco = true,
  inicialQ = "",
  onIr,
}: {
  modo?: "fixa" | "suspensa";
  obras: ObraNaMoldura[];
  recentes: RecenteNaMoldura[];
  autoFoco?: boolean;
  inicialQ?: string;
  /** Chamado ao escolher (a paleta fecha). */
  onIr?: () => void;
}) {
  const { dur, mola } = useTempo();
  const router = useRouter();
  const [q, setQ] = useState(inicialQ);
  const [indice, setIndice] = useState(0);
  const [indo, setIndo] = useState<string | null>(null);
  const [aberta, setAberta] = useState(modo === "fixa");
  const entrada = useRef<HTMLInputElement>(null);
  const raiz = useRef<HTMLDivElement>(null);

  const lista = useMemo(() => montar(q, obras, recentes), [q, obras, recentes]);
  const itens = lista.filter((e): e is Item => e.tipo === "item");
  const posicao = new Map(itens.map((e, i) => [e.id, i]));
  const sel = itens[Math.min(indice, itens.length - 1)];
  const mostrarLista = modo === "fixa" || aberta;

  const ir = (it: Item) => {
    setIndo(it.id);
    router.push(it.href);
    onIr?.();
  };

  useEffect(() => {
    if (autoFoco) entrada.current?.focus();
  }, [autoFoco]);
  // Suspensa: é a busca da própria tela, então o Ctrl K põe o foco nela.
  useEffect(() => {
    if (modo !== "suspensa") return;
    const tecla = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "k") return;
      e.preventDefault();
      entrada.current?.focus();
      setAberta(true);
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [modo]);
  // Suspensa: clique fora fecha.
  useEffect(() => {
    if (modo !== "suspensa" || !aberta) return;
    const fora = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberta(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [modo, aberta]);

  function mover(d: number) {
    setAberta(true);
    setIndice((i) => (i + d + itens.length) % itens.length);
  }

  function teclado(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      mover(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      mover(-1);
    } else if (e.key === "Enter" && sel && mostrarLista) {
      e.preventDefault();
      ir(sel);
    } else if (e.key === "Escape") {
      // O Esc que a barra USA fica marcado como tratado: a camada em volta só
      // fecha com a barra já vazia.
      if (q || (modo === "suspensa" && aberta)) e.preventDefault();
      else return;
      if (q) setQ("");
      else if (modo === "suspensa") {
        setAberta(false);
        entrada.current?.blur();
      }
      setIndice(0);
    } else if (e.ctrlKey && /^[1-4]$/.test(e.key)) {
      e.preventDefault();
      const tf = TAREFAS[Number(e.key) - 1];
      router.push(linkDoNexo({ intencao: tf.intencao }));
      onIr?.();
    }
  }

  const corpo = (
    <>
      <div className="cf-corpo">
        <ul
          className="cf-lista"
          id={`cf-lista-${modo}`}
          role="listbox"
          aria-label="Resultados"
        >
          {lista.map((e, i) => {
            if (e.tipo === "grupo")
              return (
                <li
                  key={`g-${e.nome}-${i}`}
                  className="cf-grupo"
                  role="presentation"
                >
                  {e.nome}
                </li>
              );
            if (e.tipo === "vazio")
              return (
                <li key="vazio" className="cf-vazio" role="presentation">
                  {e.texto}
                </li>
              );
            const meu = posicao.get(e.id) ?? 0;
            const ativo = sel?.id === e.id;
            return (
              <li
                key={e.id}
                id={`cf-${modo}-${e.id}`}
                role="option"
                aria-selected={ativo}
                className={`cf-item${e.nexo ? " cf-item--nexo" : ""}`}
                onMouseMove={() => indice !== meu && setIndice(meu)}
                onClick={() => ir(e)}
              >
                {ativo && (
                  <motion.span
                    layoutId={`cf-destaque-${modo}`}
                    className="cf-destaque"
                    transition={mola("snappy")}
                  />
                )}
                <span className="cf-item-icone">{e.icone}</span>
                <span className="cf-item-titulo">{e.titulo}</span>
                {e.sub && <span className="cf-item-sub">{e.sub}</span>}
                <span className="cf-item-direita">
                  {indo === e.id ? (
                    <span className="cf-comecando">abrindo…</span>
                  ) : (
                    e.direita
                  )}
                </span>
              </li>
            );
          })}
        </ul>

        <aside className="cf-detalhe" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            {sel && (
              <motion.div
                key={sel.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: dur("feedback"),
                  ease: ease(CURVA.out),
                }}
              >
                {sel.cliente && (
                  <MarcaDaPrefeitura prefeitura={sel.cliente} forma="selo" />
                )}
                <h3>{sel.detalhe.titulo}</h3>
                <dl>
                  {sel.detalhe.linhas.map(([r, v]) => (
                    <div key={r}>
                      <dt>{r}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                {sel.detalhe.nota && (
                  <p className="cf-nota">{sel.detalhe.nota}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>

      <div className="cf-rodape">
        <span>
          <Tecla>↑</Tecla>
          <Tecla>↓</Tecla> navegar
        </span>
        <span>
          <Tecla>↵</Tecla> {sel?.detalhe.enter.toLowerCase()}
        </span>
        <span>
          <Tecla>Esc</Tecla>{" "}
          {modo === "suspensa" && !q ? "fechar" : q ? "limpar" : "fechar"}
        </span>
        <span className="cf-rodape-dir">
          <Tecla>Ctrl</Tecla>
          <Tecla>1–4</Tecla> tarefas
        </span>
      </div>
    </>
  );

  const linhaDeEntrada = (
    <div className="cf-entrada">
      <Orbe tamanho={18} estado={indo ? "trabalhando" : "repouso"} />
      <input
        ref={entrada}
        aria-label="Obra, tarefa ou pedido"
        placeholder="Buscar obra, tarefa ou pedir ao Nexo: 117-25, auditar, “refaz a LD da 063-26”"
        value={q}
        onFocus={() => q && setAberta(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setIndice(0);
          setAberta(true);
        }}
        onKeyDown={teclado}
        role="combobox"
        aria-expanded={mostrarLista}
        aria-controls={`cf-lista-${modo}`}
        aria-activedescendant={
          sel && mostrarLista ? `cf-${modo}-${sel.id}` : undefined
        }
      />
      {q ? (
        <Tecla>Esc</Tecla>
      ) : modo === "suspensa" ? (
        <Tecla>Ctrl K</Tecla>
      ) : null}
    </div>
  );

  if (modo === "fixa") {
    return (
      <div ref={raiz} className="cf-painel">
        {linhaDeEntrada}
        {corpo}
      </div>
    );
  }

  return (
    <div
      ref={raiz}
      className={`cf-suspensa${aberta ? " cf-suspensa--aberta" : ""}`}
    >
      {linhaDeEntrada}
      <AnimatePresence>
        {aberta && (
          <motion.div
            className="cf-suspensa-painel"
            initial={{ opacity: 0, y: -6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: -4,
              transition: { duration: dur("feedback"), ease: ease(CURVA.exit) },
            }}
            transition={{ duration: dur("enter"), ease: ease(CURVA.out) }}
          >
            {corpo}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
