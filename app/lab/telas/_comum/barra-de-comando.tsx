"use client";

import { AnimatePresence, motion } from "motion/react";
import { Building2, Clock, CornerDownRight, FileSearch, FileText, Layers, ListChecks, ScanLine, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";

import { Orbe, Tecla } from "@/components/ds/basicos";
import { OBRAS_CMD, RECENTES_CMD, TAREFAS_CMD, normal, type Detalhe, type ObraCmd } from "@/lib/design-lab/comando";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { useIr, useNoPrototipo, type IdTela } from "./prototipo";
import "../inicio-f/inicio-f.css";

const ICONE_DA_TAREFA: Record<string, ComponentType<{ size?: number }>> = { auditar: FileSearch, ld: ListChecks, volume: Layers, conferir: ScanLine };

type Entrada =
  | { tipo: "grupo"; nome: string }
  | { tipo: "vazio"; texto: string }
  | { tipo: "item"; id: string; titulo: ReactNode; sub?: string; direita?: ReactNode; icone: ReactNode; recuo?: boolean; detalhe: Detalhe; obra?: ObraCmd; nexo?: boolean };

const ARQUIVO = "117_25_md_geral_a.pdf";

/** No protótipo, o item escolhido leva a uma tela depois do "começando…". */
function destinoDoItem(id: string): [IdTela, string] {
  if (id === "arq-auditar" || id === "arq-comparar") return ["auditoria", "enviando"];
  if (id === "arq-guardar") return ["projeto", "com-registros"];
  if (id === "nexo") return ["conversa", "respondendo"];
  if (id === "tar-auditar") return ["inicio", "tarefa-escolhida"];
  if (id === "tar-volume") return ["nexo", "soltou"];
  if (id.startsWith("tar-")) return ["mapa", "lendo-selos"];
  if (id.startsWith("rec-")) return ["resultado", "nao-emitir"];
  return ["projeto", "com-registros"];
}
const ease = (c: readonly number[]) => [...c] as [number, number, number, number];

function montar(q: string, arquivo: boolean, primeiro: boolean): Entrada[] {
  const t = normal(q.trim());
  const out: Entrada[] = [];
  const obraItem = (o: ObraCmd, destaque: boolean): Entrada => ({
    tipo: "item",
    id: `obra-${o.codigo}`,
    titulo: o.nome,
    sub: o.cidade,
    direita: <span className="ds-code">{o.codigo}</span>,
    icone: <MarcaDaPrefeitura prefeitura={o.cidade} forma="sinal" />,
    obra: o,
    detalhe: {
      titulo: o.nome,
      linhas: [
        ["Código", o.codigo],
        ["Município", o.cidade],
        ["Documentos", o.documentos],
        ["Último parecer", o.ultimo],
        ["Volume", o.volume],
      ],
      enter: destaque ? "Abrir o projeto" : "Abrir o projeto",
    },
  });

  if (arquivo) {
    out.push({ tipo: "grupo", nome: "Com este arquivo" });
    out.push(
      {
        tipo: "item",
        id: "arq-auditar",
        titulo: "Auditar o memorial",
        sub: "memorial descritivo de 117-25, rev. A",
        icone: <FileSearch size={16} />,
        direita: <Tecla>↵</Tecla>,
        detalhe: {
          titulo: "Auditar o memorial",
          linhas: [
            ["Arquivo", ARQUIVO],
            ["O Nexo leu", "memorial descritivo, 42 páginas"],
            ["Obra", "117-25, UBS da Rua São Francisco de Assis"],
            ["Revisão", "A, de 12/09/2026"],
            ["Tempo e custo", "cerca de 6 min, R$ 1,80"],
          ],
          nota: "A obra já tem um parecer de 29/09 sobre a revisão B. Esta é a revisão A: confira se é o arquivo certo.",
          enter: "Auditar",
        },
      },
      {
        tipo: "item",
        id: "arq-comparar",
        titulo: "Comparar com o parecer de 29/09",
        sub: "mostra o que mudou entre as revisões",
        icone: <CornerDownRight size={16} />,
        detalhe: { titulo: "Comparar com o parecer de 29/09", linhas: [["Anterior", "rev. B, 2 bloqueios"], ["Este arquivo", "rev. A"]], enter: "Comparar" },
      },
      {
        tipo: "item",
        id: "arq-guardar",
        titulo: "Guardar no projeto 117-25 sem auditar",
        icone: <FileText size={16} />,
        detalhe: { titulo: "Guardar sem auditar", linhas: [["Projeto", "117-25"], ["Custo", "nenhum"]], enter: "Guardar" },
      },
    );
    return out;
  }

  if (!t) {
    if (!primeiro) {
      out.push({ tipo: "grupo", nome: "Recentes" });
      for (const r of RECENTES_CMD)
        out.push({
          tipo: "item",
          id: `rec-${r.obra}`,
          titulo: r.titulo,
          sub: `${r.tipo}, ${r.estado}`,
          direita: <span className="cf-quando">{r.quando}</span>,
          icone: <Clock size={16} />,
          detalhe: { titulo: r.titulo, linhas: [["Tarefa", r.tipo], ["Estado", r.estado], ["Obra", r.obra], ["Quando", r.quando]], enter: "Continuar" },
        });
    }
    out.push({ tipo: "grupo", nome: "Tarefas" });
    for (const tf of TAREFAS_CMD) {
      const I = ICONE_DA_TAREFA[tf.id];
      out.push({ tipo: "item", id: `tar-${tf.id}`, titulo: tf.nome, icone: <I size={16} />, direita: <Tecla>{tf.atalho}</Tecla>, detalhe: tf.detalhe });
    }
    if (!primeiro) {
      out.push({ tipo: "grupo", nome: "Obras" });
      for (const o of OBRAS_CMD.slice(0, 4)) out.push(obraItem(o, false));
    }
    return out;
  }

  const obras = OBRAS_CMD.filter((o) => normal(`${o.codigo} ${o.nome} ${o.cidade}`).includes(t) || t.split(/\s+/).some((p) => p.length >= 3 && normal(o.codigo).includes(p)));
  const tarefas = TAREFAS_CMD.filter((tf) => [tf.nome, ...tf.sinonimos].some((s) => normal(s).includes(t) || t.split(/\s+/).some((p) => p.length >= 2 && normal(s).startsWith(p))));
  const recentes = RECENTES_CMD.filter((r) => normal(`${r.titulo} ${r.obra} ${r.tipo}`).includes(t));
  const frase = t.split(/\s+/).length >= 4;

  const nexo: Entrada = {
    tipo: "item",
    id: "nexo",
    nexo: true,
    titulo: (
      <>
        Perguntar ao Nexo: <span className="cf-citacao">“{q.trim()}”</span>
      </>
    ),
    icone: <Orbe tamanho={14} />,
    direita: <Tecla>↵</Tecla>,
    detalhe: {
      titulo: "Perguntar ao Nexo",
      linhas: [["Pedido", q.trim()], ...(obras[0] ? ([["Obra reconhecida", `${obras[0].codigo}, ${obras[0].nome}`]] as [string, string][]) : [])],
      nota: "O Nexo entende o pedido e mostra o que vai fazer antes de gastar qualquer coisa.",
      enter: "Enviar ao Nexo",
    },
  };

  if (frase) out.push({ tipo: "grupo", nome: "Nexo" }, nexo);

  if (obras.length) {
    out.push({ tipo: "grupo", nome: "Obras" });
    obras.forEach((o, i) => {
      out.push(obraItem(o, i === 0));
      // A obra mais provável já abre com as ações dela: um Enter a menos.
      if (i === 0)
        o.acoes.forEach((a, j) =>
          out.push({
            tipo: "item",
            id: `acao-${o.codigo}-${j}`,
            recuo: true,
            titulo: a.nome,
            icone: <CornerDownRight size={15} />,
            detalhe: { titulo: a.nome, linhas: [["Obra", `${o.codigo}, ${o.nome}`], ["O que usa", a.detalhe]], enter: "Começar" },
          }),
        );
    });
  }
  if (tarefas.length) {
    out.push({ tipo: "grupo", nome: "Tarefas" });
    for (const tf of tarefas) {
      const I = ICONE_DA_TAREFA[tf.id];
      out.push({ tipo: "item", id: `tar-${tf.id}`, titulo: tf.nome, icone: <I size={16} />, direita: <Tecla>{tf.atalho}</Tecla>, detalhe: tf.detalhe });
    }
  }
  if (recentes.length) {
    out.push({ tipo: "grupo", nome: "Recentes" });
    for (const r of recentes)
      out.push({
        tipo: "item",
        id: `rec-${r.obra}`,
        titulo: r.titulo,
        sub: `${r.tipo}, ${r.estado}`,
        icone: <Clock size={16} />,
        direita: <span className="cf-quando">{r.quando}</span>,
        detalhe: { titulo: r.titulo, linhas: [["Tarefa", r.tipo], ["Estado", r.estado], ["Quando", r.quando]], enter: "Continuar" },
      });
  }
  if (!obras.length && !tarefas.length && !recentes.length) out.push({ tipo: "vazio", texto: `Nenhuma obra, tarefa ou trabalho com “${q.trim()}”.` });
  if (!frase) out.push({ tipo: "grupo", nome: "Nexo" }, nexo);
  return out;
}


/**
 * A BARRA DE COMANDO — um componente, dois modos.
 *  - "fixa": a lista e o detalhe ficam sempre abertos (a home inteira do F).
 *  - "suspensa": só a entrada aparece; a lista abre POR CIMA do conteúdo quando
 *    há foco com texto, arquivo ou seta para baixo, e fecha com Esc ou clique
 *    fora. É assim que ela mora dentro de outra tela (o Início D, ou o Ctrl K
 *    em qualquer página).
 *
 * O movimento é curto de propósito: o destaque DESLIZA entre as linhas e o
 * detalhe troca em 120 ms. Nada aqui pode ser mais lento que a digitação.
 */
export function BarraDeComando({
  modo = "fixa",
  inicialQ = "",
  primeiro = false,
  executandoInicial = false,
  arquivo: arquivoControlado,
  onArquivo,
  autoFoco = true,
  abertaInicial = false,
}: {
  modo?: "fixa" | "suspensa";
  inicialQ?: string;
  primeiro?: boolean;
  executandoInicial?: boolean;
  arquivo?: boolean;
  onArquivo?: (v: boolean) => void;
  autoFoco?: boolean;
  abertaInicial?: boolean;
}) {
  const { dur, mola } = useTempo();
  const [q, setQ] = useState(inicialQ);
  const [arquivoLocal, setArquivoLocal] = useState(false);
  const arquivo = arquivoControlado ?? arquivoLocal;
  const setArquivo = (v: boolean) => (onArquivo ? onArquivo(v) : setArquivoLocal(v));
  const [indice, setIndice] = useState(executandoInicial ? 1 : 0);
  const [executando, setExecutando] = useState<string | null>(null);
  const [aberta, setAberta] = useState(modo === "fixa" || abertaInicial);
  const entrada = useRef<HTMLInputElement>(null);
  const raiz = useRef<HTMLDivElement>(null);
  const ir = useIr();
  const proto = useNoPrototipo();
  useEffect(() => {
    if (!proto || !executando) return;
    const id = setTimeout(() => ir(...destinoDoItem(executando)), 650);
    return () => clearTimeout(id);
  }, [proto, executando, ir]);

  const lista = useMemo(() => montar(q, arquivo, primeiro), [q, arquivo, primeiro]);
  const itens = lista.filter((e): e is Extract<Entrada, { tipo: "item" }> => e.tipo === "item");
  const sel = itens[Math.min(indice, itens.length - 1)];
  const mostrarLista = modo === "fixa" || aberta;

  useEffect(() => {
    if (autoFoco) entrada.current?.focus();
  }, [autoFoco]);
  useEffect(() => {
    if (executandoInicial && sel) setExecutando(sel.id);
    // só na montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (arquivo) {
      setAberta(true);
      setIndice(0);
      entrada.current?.focus();
    }
  }, [arquivo]);
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

  function teclado(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      mover(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      mover(-1);
    } else if (e.key === "Enter" && sel && mostrarLista) {
      e.preventDefault();
      setExecutando(sel.id);
    } else if (e.key === "Escape") {
      // O Esc que a barra USA fica marcado como tratado (preventDefault), e
      // atalho global ignora evento tratado. `stopPropagation` não serve: no
      // Next o React escuta no próprio document, o mesmo nó dos atalhos globais.
      // Barra vazia e fechada deixa o Esc livre para quem está em volta.
      if (executando || arquivo || q || (modo === "suspensa" && aberta)) e.preventDefault();
      else return;
      if (executando) setExecutando(null);
      else if (arquivo) setArquivo(false);
      else if (q) setQ("");
      else if (modo === "suspensa") {
        setAberta(false);
        entrada.current?.blur();
      }
      setIndice(0);
    } else if (e.ctrlKey && /^[1-4]$/.test(e.key)) {
      e.preventDefault();
      setAberta(true);
      setExecutando(`tar-${TAREFAS_CMD[Number(e.key) - 1].id}`);
    } else if (e.key === "Backspace" && !q && arquivo) {
      setArquivo(false);
    }
  }

  const corpo = (
    <>
      <div className="cf-corpo">
        <ul className="cf-lista" id={`cf-lista-${modo}`} role="listbox">
          {(() => {
            let n = -1;
            return lista.map((e, i) => {
              if (e.tipo === "grupo")
                return (
                  <li key={`g-${e.nome}-${i}`} className="cf-grupo" role="presentation">
                    {e.nome}
                  </li>
                );
              if (e.tipo === "vazio")
                return (
                  <li key="vazio" className="cf-vazio" role="presentation">
                    {e.texto}
                  </li>
                );
              n += 1;
              const meu = n;
              const ativo = sel?.id === e.id;
              return (
                <li
                  key={e.id}
                  id={`cf-${modo}-${e.id}`}
                  role="option"
                  aria-selected={ativo}
                  className={`cf-item${e.recuo ? " cf-item--recuo" : ""}${e.nexo ? " cf-item--nexo" : ""}`}
                  onMouseMove={() => indice !== meu && setIndice(meu)}
                  onClick={() => setExecutando(e.id)}
                >
                  {ativo && <motion.span layoutId={`cf-destaque-${modo}`} className="cf-destaque" transition={mola("snappy")} />}
                  <span className="cf-item-icone">{e.icone}</span>
                  <span className="cf-item-titulo">{e.titulo}</span>
                  {e.sub && <span className="cf-item-sub">{e.sub}</span>}
                  <span className="cf-item-direita">{executando === e.id ? <span className="cf-comecando">começando…</span> : e.direita}</span>
                </li>
              );
            });
          })()}
        </ul>

        <aside className="cf-detalhe" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            {sel && (
              <motion.div
                key={sel.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: dur("feedback"), ease: ease(CURVA.out) }}
              >
                {sel.obra && <MarcaDaPrefeitura prefeitura={sel.obra.cidade} forma="selo" />}
                <h3>{sel.detalhe.titulo}</h3>
                <dl>
                  {sel.detalhe.linhas.map(([r, v]) => (
                    <div key={r}>
                      <dt>{r}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                {sel.detalhe.nota && <p className="cf-nota">{sel.detalhe.nota}</p>}
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
          <Tecla>↵</Tecla> {executando ? "começando…" : sel?.detalhe.enter.toLowerCase()}
        </span>
        <span>
          <Tecla>Esc</Tecla> {executando ? "cancelar" : modo === "suspensa" && !q && !arquivo ? "fechar" : "limpar"}
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
      <Orbe tamanho={18} estado={executando ? "trabalhando" : "repouso"} />
      <AnimatePresence initial={false}>
        {arquivo && (
          <motion.span
            className="cf-arquivo"
            initial={{ opacity: 0, scale: 0.9, x: -6 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={mola("snappy")}
          >
            <FileText size={13} />
            {ARQUIVO}
            <button type="button" aria-label="Tirar o arquivo" onClick={() => setArquivo(false)}>
              <X size={12} />
            </button>
          </motion.span>
        )}
      </AnimatePresence>
      <input
        ref={entrada}
        aria-label="Obra, tarefa ou pedido"
        placeholder={arquivo ? "O que fazer com este arquivo?" : "Buscar obra, tarefa ou pedir ao Nexo: 117-25, auditar, “refaz a LD da 063-26”"}
        value={q}
        onFocus={() => (q || arquivo) && setAberta(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setIndice(0);
          setExecutando(null);
          setAberta(true);
        }}
        onKeyDown={teclado}
        role="combobox"
        aria-expanded={mostrarLista}
        aria-controls={`cf-lista-${modo}`}
        aria-activedescendant={sel && mostrarLista ? `cf-${modo}-${sel.id}` : undefined}
      />
      {q || arquivo ? <Tecla>Esc</Tecla> : modo === "suspensa" ? <Tecla>Ctrl K</Tecla> : null}
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
    <div ref={raiz} className={`cf-suspensa${aberta ? " cf-suspensa--aberta" : ""}`}>
      {linhaDeEntrada}
      <AnimatePresence>
        {aberta && (
          <motion.div
            className="cf-suspensa-painel"
            initial={{ opacity: 0, y: -6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, transition: { duration: dur("feedback"), ease: ease(CURVA.exit) } }}
            transition={{ duration: dur("enter"), ease: ease(CURVA.out) }}
          >
            {corpo}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
