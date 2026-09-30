"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Check, ChevronDown, Copy, Download, FileText, RotateCcw } from "lucide-react";
import { Children, createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { Orbe, Tecla } from "@/components/ds/basicos";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];

/*
 * O MOVIMENTO DA CONVERSA. Cada gesto responde a uma pergunta só:
 * - a resposta do Nexo entra EM ORDEM de leitura (o que fez, o que leu, a
 *   decisão, as saídas), e não de uma vez;
 * - o visto da linha de estado SE DESENHA; o giro vira visto quando acaba;
 * - a lacuna troca de valor DESLIZANDO: o olho vê o que mudou;
 * - a peça gerada NASCE com um brilho que passa uma vez: saiu agora;
 * - a linha que sai da lista SE RISCA na frente de quem lê.
 * Tudo em transform e opacity; nada se repete sozinho, exceto o que está em curso.
 */

/** Avisa a tela que a resposta acabou: o Parar do campo volta a ser Enviar. */
export const FimDaResposta = createContext<() => void>(() => {});

export interface Arquivo {
  nome: string;
  paginas: number;
  lendo?: boolean;
}

/** O visto que se desenha. */
export function Visto({ tamanho = 13, atraso = 0 }: { tamanho?: number; atraso?: number }) {
  const { dur, k } = useTempo();
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 16 16" className="cx-visto" aria-hidden>
      <motion.path d="M3.5 8.5 L6.8 11.5 L12.5 4.8" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: dur("state") * 1.6, delay: atraso * k, ease: ease(CURVA.out) }} />
    </svg>
  );
}

/** O arquivo como peça. Gerado agora (nova), ele nasce com um brilho que passa uma vez. */
export function PecaDeArquivo({ a, gerado, nova, atraso = 0 }: { a: Arquivo; gerado?: boolean; nova?: boolean; atraso?: number }) {
  const { dur, k } = useTempo();
  return (
    <motion.span
      layout="position"
      className={`cx-peca${gerado ? " cx-peca--gerada" : ""}${a.lendo ? " cx-peca--lendo" : ""}${nova ? " cx-peca--nova" : ""}`}
      initial={nova ? { opacity: 0, scale: 0.94, y: 4 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: dur("enter"), delay: atraso * k, ease: ease(CURVA.out) }}
    >
      <FileText size={14} />
      <span className="cx-peca-nome">{a.nome}</span>
      <span className="cx-peca-pag ds-num">{a.lendo ? "lendo…" : `${a.paginas} p.`}</span>
      {a.lendo && <i className="cx-peca-barra" aria-hidden />}
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
    </motion.span>
  );
}

/** O que você manda: um bloco suave à direita. Sobe do campo, de onde saiu. */
export function DeVoce({ texto, arquivos, atraso = 0 }: { texto: string; arquivos?: Arquivo[]; atraso?: number }) {
  const { dur, k } = useTempo();
  return (
    <motion.div
      className="cx-voce"
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: dur("enter") * 1.2, delay: atraso * k, ease: ease(CURVA.out) }}
      style={{ transformOrigin: "bottom right" }}
    >
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

/**
 * O que o Nexo responde: texto limpo, sem caixa. As partes entram em ordem de
 * leitura. Com `copiar`, a resposta ganha Copiar ao passar o mouse.
 */
export function DoNexo({ children, atraso = 0, copiar }: { children: ReactNode; atraso?: number; copiar?: boolean }) {
  const { dur, k } = useTempo();
  const [copiado, setCopiado] = useState(false);
  const partes = Children.toArray(children);
  return (
    <div className="cx-nexo">
      <motion.span className="cx-nexo-marca" aria-hidden initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: dur("enter"), delay: atraso * k, ease: ease(CURVA.out) }}>
        <Orbe tamanho={16} />
      </motion.span>
      <div className="cx-nexo-corpo">
        {partes.map((p, i) => (
          <motion.div
            key={i}
            className="cx-parte"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur("enter"), delay: (atraso + 0.1 + i * 0.1) * k, ease: ease(CURVA.out) }}
          >
            {p}
          </motion.div>
        ))}
        {copiar && (
          <motion.div className="cx-nexo-acoes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: (atraso + 0.1 + partes.length * 0.1) * k }}>
            <button
              type="button"
              onClick={() => {
                setCopiado(true);
                setTimeout(() => setCopiado(false), 1600);
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={copiado ? "ok" : "c"} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: dur("feedback") }}>
                  {copiado ? <Check size={13} /> : <Copy size={13} />}
                  {copiado ? "Copiado" : "Copiar resposta"}
                </motion.span>
              </AnimatePresence>
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/** O que o Nexo fez ou está fazendo, numa linha. Em curso: gira e brilha. Feito: o visto se desenha. */
export function Passo({ texto, emCurso, aviso }: { texto: string; emCurso?: boolean; aviso?: boolean }) {
  const { dur } = useTempo();
  return (
    <span className={`cx-passo${emCurso ? " cx-passo--curso" : ""}${aviso ? " cx-passo--aviso" : ""}`}>
      <AnimatePresence mode="wait" initial={false}>
        {emCurso ? (
          <motion.i key="roda" className="cx-passo-roda" aria-hidden exit={{ opacity: 0, scale: 0.4, transition: { duration: dur("feedback") } }} />
        ) : aviso ? (
          <i key="aviso" className="cx-passo-aviso" aria-hidden />
        ) : (
          <motion.span key="visto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "inline-flex" }}>
            <Visto />
          </motion.span>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={texto} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: dur("feedback") }}>
          {texto}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** UM CAMPO EDITÁVEL NO MEIO DA FRASE. Trocar o valor faz ele deslizar e o sublinhado acender. */
export function Lacuna({ valor, opcoes, vazio, mono }: { valor: string | null; opcoes?: string[]; vazio?: string; mono?: boolean }) {
  const [v, setV] = useState(valor);
  const [aberto, setAberto] = useState(false);
  const [trocou, setTrocou] = useState(0);
  const { dur, k } = useTempo();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setAberto(false);
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
    <span ref={ref} className="cx-lacuna-caixa">
      <button
        type="button"
        className={`cx-lacuna${v ? "" : " cx-lacuna--vazia"}${mono ? " cx-mono" : ""}${aberto ? " cx-lacuna--aberta" : ""}`}
        onClick={() => opcoes && setAberto((a) => !a)}
        aria-haspopup={opcoes ? "listbox" : undefined}
        aria-expanded={opcoes ? aberto : undefined}
      >
        <motion.span layout="size" className="cx-lacuna-valor" transition={{ duration: dur("state"), ease: ease(CURVA.out) }}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={v ?? "vazio"} initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -9 }} transition={{ duration: dur("state"), ease: ease(CURVA.out) }}>
              {v ?? vazio}
            </motion.span>
          </AnimatePresence>
        </motion.span>
        {opcoes && (
          <motion.span animate={{ rotate: aberto ? 180 : 0 }} transition={{ duration: dur("state") }} style={{ display: "inline-flex" }}>
            <ChevronDown size={12} />
          </motion.span>
        )}
        {trocou > 0 && <motion.i key={trocou} className="cx-lacuna-acende" aria-hidden initial={{ scaleX: 0, opacity: 1 }} animate={{ scaleX: 1, opacity: 0 }} transition={{ duration: 0.5 * k, ease: ease(CURVA.out) }} />}
      </button>
      <AnimatePresence>
        {aberto && opcoes && (
          <motion.span
            className="cx-lacuna-menu"
            role="listbox"
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: dur("feedback") } }}
            transition={{ duration: dur("enter"), ease: ease(CURVA.out) }}
          >
            {opcoes.map((o, i) => (
              <motion.button
                key={o}
                type="button"
                role="option"
                aria-selected={o === v}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: dur("enter"), delay: i * 0.025 * k }}
                onClick={() => {
                  if (o !== v) setTrocou((n) => n + 1);
                  setV(o);
                  setAberto(false);
                }}
              >
                <span className="cx-lacuna-marca">{o === v && <Check size={12} />}</span>
                {o}
              </motion.button>
            ))}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/** As saídas: entram em cascata, afundam ao clicar, cada uma com a sua tecla. */
export function Saidas({ itens }: { itens: { texto: string; principal?: boolean }[] }) {
  const { dur, k } = useTempo();
  return (
    <div className="cx-saidas">
      {itens.map((it, i) => (
        <motion.button
          key={it.texto}
          type="button"
          className={`cx-saida${it.principal ? " cx-saida--principal" : ""}`}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          whileTap={{ scale: 0.975 }}
          transition={{ duration: dur("enter"), delay: (0.06 + i * 0.06) * k, ease: ease(CURVA.out) }}
        >
          <span>{it.texto}</span>
          <Tecla>{it.principal ? "↵" : String(i + 1)}</Tecla>
        </motion.button>
      ))}
    </div>
  );
}

/** O plano do que vai sair: o que é, numa lista curta. As decisões ficam na frase, fora daqui. */
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
        Capa da prefeitura de <Lacuna valor={semPrefeitura ? null : "Criciúma"} vazio="escolher" opcoes={["Criciúma", "Siderópolis", "Içara", "Forquilhinha"]} />, título{" "}
        <Lacuna valor="UBS da Rua São Francisco de Assis" />, código <Lacuna valor="117-25" mono />, em <Lacuna valor="1 tomo" opcoes={["1 tomo", "2 tomos", "3 tomos"]} />.
      </p>
      <p className="cx-frase cx-frase--obra">
        Endereço <Lacuna valor="Rua São Francisco de Assis, 410" />, centro de custo <Lacuna valor="117" mono />, data <Lacuna valor="setembro de 2026" opcoes={["agosto de 2026", "setembro de 2026", "outubro de 2026"]} />.
      </p>
      <p className="cx-fonte">A obra foi lida do carimbo das pranchas, uma fonte independente do memorial.</p>
    </div>
  );
}

/** Gerando, peça por peça: a que está sendo feita gira; quando acaba, vira arquivo. */
export function Gerando({ itens }: { itens: { id: string; fazendo: string; feito: Arquivo }[] }) {
  const { k } = useTempo();
  const [prontos, setProntos] = useState(1);
  useEffect(() => {
    if (prontos >= itens.length) return;
    const t = setTimeout(() => setProntos((n) => n + 1), 1600 * k);
    return () => clearTimeout(t);
  }, [prontos, itens.length, k]);
  return (
    <div className="cx-pecas cx-pecas--coluna">
      {itens.map((it, i) =>
        i < prontos ? (
          <PecaDeArquivo key={it.id} gerado nova a={it.feito} />
        ) : i === prontos ? (
          <Passo key={it.id} texto={`${it.fazendo}…`} emCurso />
        ) : (
          <span key={it.id} className="cx-fila">
            {it.fazendo}, na fila
          </span>
        ),
      )}
    </div>
  );
}

/** A conferência do selo: o carimbo das pranchas contra o memorial, uma linha por campo. */
export function Conferencia() {
  const linhas: { rotulo: string; texto: ReactNode; ok: boolean }[] = [
    { rotulo: "Obra", texto: <><span className="cx-mono">117-25</span> nas 33 pranchas e no memorial</>, ok: true },
    { rotulo: "Prefeitura", texto: "Criciúma nas pranchas e no memorial", ok: true },
    { rotulo: "Revisão", texto: <><span className="cx-mono">ARQ-03</span> e <span className="cx-mono">ARQ-07</span> ainda em rev. A; as outras 31 em rev. B</>, ok: false },
  ];
  return (
    <div className="cx-conf">
      {linhas.map((l, i) => (
        <div key={l.rotulo} className={`cx-conf-linha${l.ok ? "" : " cx-conf-linha--revisar"}`}>
          <span className="cx-conf-rotulo">{l.rotulo}</span>
          <span>{l.texto}</span>
          {l.ok ? (
            <span className="cx-conf-ok">
              <Visto atraso={0.45 + i * 0.12} /> consistente
            </span>
          ) : (
            <span className="cx-conf-revisar">revisar</span>
          )}
        </div>
      ))}
    </div>
  );
}

/** A diferença de um documento já gerado: a linha que sai se risca na frente de quem lê. */
export function Diferenca() {
  return (
    <div className="cx-diff">
      <span className="cx-diff-arquivo cx-mono">LD_117-25_rev-A.pdf</span>
      <ol>
        <li>
          <span className="cx-mono">ARQ-11</span> Planta de cobertura
        </li>
        <li className="cx-diff--sai">
          <span className="cx-diff-risco">
            <span className="cx-mono">ARQ-12</span> Detalhes de esquadrias
          </span>
          <small>sai</small>
        </li>
        <li>
          <span className="cx-mono">EST-01</span> Locação e cargas
        </li>
      </ol>
    </div>
  );
}

/** A resposta chegando: cada palavra acende ao entrar; quando acaba, avisa. */
export function Escrevendo({ texto, onFim }: { texto: string; onFim?: () => void }) {
  const { k } = useTempo();
  const reduzido = useReducedMotion();
  const palavras = texto.split(" ");
  const [n, setN] = useState(reduzido ? palavras.length : 3);
  const fim = useRef(onFim);
  fim.current = onFim;
  useEffect(() => {
    if (n >= palavras.length) {
      fim.current?.();
      return;
    }
    const t = setTimeout(() => setN((x) => x + 1), 65 * k);
    return () => clearTimeout(t);
  }, [n, palavras.length, k]);
  return (
    <p className="cx-texto">
      {palavras.slice(0, n).map((p, i) => (
        <span key={i} className="cx-palavra">
          {p}{" "}
        </span>
      ))}
      {n < palavras.length && <span className="cx-cursor" aria-hidden />}
    </p>
  );
}

/** Pensando: antes da primeira palavra, três pontos que respiram. Some quando a resposta começa. */
export function Pensando() {
  return (
    <span className="cx-pensando" role="status" aria-label="O Nexo está pensando">
      <i />
      <i />
      <i />
    </span>
  );
}

/**
 * Respondendo em tempo de verdade: pensa, consulta (o giro), escreve, e no
 * fim o giro vira visto e aparece Copiar resposta.
 */
export function Respondendo({ texto }: { texto: string }) {
  const { k } = useTempo();
  const [fase, setFase] = useState<"pensando" | "escrevendo" | "fim">("pensando");
  const avisar = useContext(FimDaResposta);
  useEffect(() => {
    if (fase !== "pensando") return;
    const t = setTimeout(() => setFase("escrevendo"), 1100 * k);
    return () => clearTimeout(t);
  }, [fase, k]);
  if (fase === "pensando")
    return (
      <DoNexo atraso={0.1}>
        <Pensando />
      </DoNexo>
    );
  return (
    <DoNexo copiar={fase === "fim"}>
      <Passo texto={fase === "fim" ? "Consultei o parecer da revisão A" : "Consultando o parecer da revisão A"} emCurso={fase !== "fim"} />
      <Escrevendo texto={texto} onFim={() => {
          setFase("fim");
          avisar();
        }} />
    </DoNexo>
  );
}

export function Erro() {
  return (
    <p className="cx-erro">
      A resposta não chegou: o modelo não respondeu a tempo. Nada foi gerado nem gasto.
      <motion.button type="button" className="cx-erro-botao" whileTap={{ scale: 0.96 }}>
        <RotateCcw size={13} /> Tentar de novo
      </motion.button>
    </p>
  );
}

/** A primeira pergunta de uma conversa nova: entra em três tempos, pergunta, campo, atalhos. */
export function Vazio({ campo }: { campo: ReactNode }) {
  const { dur, k } = useTempo();
  const entra = (i: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: dur("enter") * 1.4, delay: i * 0.09 * k, ease: ease(CURVA.out) } });
  return (
    <div className="cx-vazio">
      <motion.h2 {...entra(0)}>
        O que fazemos na <span className="cx-mono">117-25</span>?
      </motion.h2>
      <motion.div className="cx-vazio-campo" {...entra(1)}>
        {campo}
      </motion.div>
      <motion.div className="cx-atalhos" {...entra(2)}>
        {["Auditar um memorial", "Gerar LD e capa", "Montar o volume", "Conferir o selo", "Perguntar sobre a auditoria"].map((t) => (
          <motion.button key={t} type="button" whileTap={{ scale: 0.96 }}>
            {t}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
