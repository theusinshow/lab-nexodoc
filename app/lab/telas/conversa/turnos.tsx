"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Check, ChevronDown, Download, FileText } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Orbe, Tecla } from "@/components/ds/basicos";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];

function useEntrada(atraso = 0) {
  const { dur, k } = useTempo();
  return { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: dur("enter"), delay: atraso * k, ease: ease(CURVA.out) } };
}

export interface Arquivo {
  nome: string;
  paginas: number;
  lendo?: boolean;
}

/** O arquivo como peça: nome em mono e as páginas. Na mensagem de quem manda e no que o Nexo gera. */
export function PecaDeArquivo({ a, gerado }: { a: Arquivo; gerado?: boolean }) {
  return (
    <span className={`cx-peca${gerado ? " cx-peca--gerada" : ""}${a.lendo ? " cx-peca--lendo" : ""}`}>
      <FileText size={14} />
      <span className="cx-peca-nome">{a.nome}</span>
      <span className="cx-peca-pag ds-num">{a.lendo ? "lendo…" : `${a.paginas} p.`}</span>
      {gerado && (
        <span className="cx-peca-acoes">
          <button type="button" aria-label={`Abrir ${a.nome}`}>
            <ArrowUpRight size={13} />
          </button>
          <button type="button" aria-label={`Baixar ${a.nome}`}>
            <Download size={13} />
          </button>
        </span>
      )}
    </span>
  );
}

/** O que você manda: um bloco suave à direita, os arquivos em cima do texto. */
export function DeVoce({ texto, arquivos, atraso = 0 }: { texto: string; arquivos?: Arquivo[]; atraso?: number }) {
  return (
    <motion.div className="cx-voce" {...useEntrada(atraso)}>
      {arquivos && (
        <div className="cx-voce-arquivos">
          {arquivos.map((a) => (
            <PecaDeArquivo key={a.nome} a={a} />
          ))}
        </div>
      )}
      <p>{texto}</p>
    </motion.div>
  );
}

/** O que o Nexo responde: texto limpo, sem caixa; o orbe marca onde a resposta começa. */
export function DoNexo({ children, atraso = 0 }: { children: ReactNode; atraso?: number }) {
  return (
    <motion.div className="cx-nexo" {...useEntrada(atraso)}>
      <span className="cx-nexo-marca" aria-hidden>
        <Orbe tamanho={16} />
      </span>
      <div className="cx-nexo-corpo">{children}</div>
    </motion.div>
  );
}

/** O que o Nexo fez ou está fazendo, numa linha: feito leva o visto, em curso brilha. */
export function Passo({ texto, emCurso }: { texto: string; emCurso?: boolean }) {
  return (
    <span className={`cx-passo${emCurso ? " cx-passo--curso" : ""}`}>
      {emCurso ? <i className="cx-passo-roda" aria-hidden /> : <Check size={13} />}
      <span>{texto}</span>
    </span>
  );
}

/**
 * UM CAMPO EDITÁVEL NO MEIO DA FRASE. A decisão fica onde ela é lida —
 * "capa da prefeitura de [Criciúma]" —, e não num formulário ao lado.
 */
export function Lacuna({ valor, opcoes, vazio, mono }: { valor: string | null; opcoes?: string[]; vazio?: string; mono?: boolean }) {
  const [v, setV] = useState(valor);
  const [aberto, setAberto] = useState(false);
  const { dur } = useTempo();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setAberto(false);
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);
  return (
    <span ref={ref} className="cx-lacuna-caixa">
      <button type="button" className={`cx-lacuna${v ? "" : " cx-lacuna--vazia"}${mono ? " cx-mono" : ""}`} onClick={() => opcoes && setAberto((a) => !a)} aria-haspopup={opcoes ? "listbox" : undefined}>
        {v ?? vazio}
        {opcoes && <ChevronDown size={12} />}
      </button>
      <AnimatePresence>
        {aberto && opcoes && (
          <motion.span
            className="cx-lacuna-menu"
            role="listbox"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: dur("feedback") } }}
            transition={{ duration: dur("enter"), ease: ease(CURVA.out) }}
          >
            {opcoes.map((o) => (
              <button
                key={o}
                type="button"
                role="option"
                aria-selected={o === v}
                onClick={() => {
                  setV(o);
                  setAberto(false);
                }}
              >
                {o}
              </button>
            ))}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/** As saídas possíveis depois de uma resposta, empilhadas, cada uma com o seu número. */
export function Saidas({ itens }: { itens: { texto: string; principal?: boolean }[] }) {
  return (
    <div className="cx-saidas">
      {itens.map((it, i) => (
        <button key={it.texto} type="button" className={`cx-saida${it.principal ? " cx-saida--principal" : ""}`}>
          <span>{it.texto}</span>
          <Tecla>{it.principal ? "↵" : String(i + 1)}</Tecla>
        </button>
      ))}
    </div>
  );
}

/** O plano do que vai sair: o que é, numa lista curta, e o que está decidido, numa frase. */
export function Plano({ semPrefeitura }: { semPrefeitura?: boolean }) {
  return (
    <div className="cx-plano">
      <ol>
        <li>
          <b>Lista de documentos</b>
          <span>33 folhas, lidas dos carimbos</span>
        </li>
        <li className={semPrefeitura ? "cx-plano--falta" : undefined}>
          <b>Capa</b>
          <span>{semPrefeitura ? "falta a prefeitura" : "com o brasão da prefeitura"}</span>
        </li>
        <li>
          <b>Separatrizes</b>
          <span>ARQ, EST, HID e ELE</span>
        </li>
      </ol>
      <p className="cx-frase">
        Capa da prefeitura de{" "}
        <Lacuna valor={semPrefeitura ? null : "Criciúma"} vazio="escolher" opcoes={["Criciúma", "Siderópolis", "Içara", "Forquilhinha"]} />, título{" "}
        <Lacuna valor="UBS da Rua São Francisco de Assis" />, código <Lacuna valor="117-25" mono />, em <Lacuna valor="1 tomo" opcoes={["1 tomo", "2 tomos", "3 tomos"]} />.
      </p>
    </div>
  );
}

/** A diferença de um documento já gerado: a linha que sai, riscada, entre as que ficam. */
export function Diferenca() {
  return (
    <div className="cx-diff">
      <span className="cx-diff-arquivo cx-mono">LD_117-25_rev-A.pdf</span>
      <ol>
        <li>
          <span className="cx-mono">ARQ-11</span> Planta de cobertura
        </li>
        <li className="cx-diff--sai">
          <span className="cx-mono">ARQ-12</span> Detalhes de esquadrias
        </li>
        <li>
          <span className="cx-mono">EST-01</span> Locação e cargas
        </li>
      </ol>
    </div>
  );
}

/** A resposta chegando palavra por palavra; o cursor diz que ainda vem mais. */
export function Escrevendo({ texto }: { texto: string }) {
  const { k } = useTempo();
  const palavras = texto.split(" ");
  const [n, setN] = useState(4);
  useEffect(() => {
    if (n >= palavras.length) return;
    const t = setTimeout(() => setN((x) => x + 1), 85 * k);
    return () => clearTimeout(t);
  }, [n, palavras.length, k]);
  return (
    <p className="cx-texto">
      {palavras.slice(0, n).join(" ")}
      {n < palavras.length && <span className="cx-cursor" aria-hidden />}
    </p>
  );
}

/** A primeira pergunta de uma conversa nova: o campo no centro e os atalhos do que se faz aqui. */
export function Vazio({ campo }: { campo: ReactNode }) {
  const entrada = useEntrada(0);
  return (
    <motion.div className="cx-vazio" {...entrada}>
      <h2>
        O que fazemos na <span className="cx-mono">117-25</span>?
      </h2>
      {campo}
      <div className="cx-atalhos">
        {["Auditar um memorial", "Gerar LD e capa", "Montar o volume", "Perguntar sobre a auditoria"].map((t) => (
          <button key={t} type="button">
            {t}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
