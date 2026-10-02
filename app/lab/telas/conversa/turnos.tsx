"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Check, ChevronDown, Copy, Download, FileText, RotateCcw } from "lucide-react";
import { Children, createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { Orbe, Tecla } from "@/components/ds/basicos";
import { Cronometro, Trelica } from "@/components/ds/micro";
import { useTempo } from "@/lib/ds/tempo";

import { useAvisar, useIr, type AvisoDoPrototipo, type IdTela } from "../_comum/prototipo";

/*
 * O MOVIMENTO DA CONVERSA. Cada gesto responde a uma pergunta só:
 * - a resposta do Nexo entra EM ORDEM de leitura, e não de uma vez;
 * - o visto da linha de estado SE DESENHA; o giro vira visto quando acaba;
 * - a lacuna troca de valor DESLIZANDO: o olho vê o que mudou;
 * - a peça gerada NASCE com um brilho que passa uma vez;
 * - a linha que sai da lista SE RISCA na frente de quem lê.
 *
 * O RITMO. Uma curva só (sai rápido, pousa devagar) e poucas durações. Nada
 * que entra ou sai dura menos de 0,35 s: abaixo disso, com deslocamento, o
 * olho lê piscada em vez de movimento. Trocas são CROSSFADE (os dois
 * sobrepostos), nunca "sai um, depois entra o outro", que deixa um vazio.
 */
export const SUAVE = [0.22, 1, 0.36, 1] as [number, number, number, number];
export const RITMO = { entra: 0.5, troca: 0.38, toque: 0.2, escada: 0.12 };

/** Avisa a tela que a resposta acabou: o Parar do campo volta a ser Enviar. */
export const FimDaResposta = createContext<() => void>(() => {});

/** Troca um conteúdo por outro no mesmo lugar: os dois sobrepostos enquanto um some e o outro aparece. */
export function Troca({ chave, children, y = 0, className }: { chave: string; children: ReactNode; y?: number; className?: string }) {
  const { k } = useTempo();
  return (
    <span className={`cx-troca${className ? ` ${className}` : ""}`}>
      <AnimatePresence initial={false}>
        <motion.span key={chave} initial={{ opacity: 0, y }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -y }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export interface Arquivo {
  nome: string;
  paginas: number;
  lendo?: boolean;
}

/** O visto que se desenha. */
export function Visto({ tamanho = 13, atraso = 0 }: { tamanho?: number; atraso?: number }) {
  const { k } = useTempo();
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 16 16" className="cx-visto" aria-hidden>
      <motion.path d="M3.5 8.5 L6.8 11.5 L12.5 4.8" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.55 * k, delay: atraso * k, ease: SUAVE }} />
    </svg>
  );
}

/** O arquivo como peça. Gerado agora (nova), ele nasce com um brilho que passa uma vez. */
export function PecaDeArquivo({ a, gerado, nova, atraso = 0 }: { a: Arquivo; gerado?: boolean; nova?: boolean; atraso?: number }) {
  const { k } = useTempo();
  return (
    <motion.span
      className={`cx-peca${gerado ? " cx-peca--gerada" : ""}${a.lendo ? " cx-peca--lendo" : ""}${nova ? " cx-peca--nova" : ""}`}
      initial={nova ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: RITMO.entra * k, delay: atraso * k, ease: SUAVE }}
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

/** O que você manda: um bloco suave à direita. Sobe um pouco, de onde saiu. */
export function DeVoce({ texto, arquivos, atraso = 0 }: { texto: string; arquivos?: Arquivo[]; atraso?: number }) {
  const { k } = useTempo();
  return (
    <motion.div className="cx-voce" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: RITMO.entra * k, delay: atraso * k, ease: SUAVE }}>
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
 * leitura, em escada. Com `copiar`, a resposta ganha Copiar ao passar o mouse.
 */
export function DoNexo({ children, atraso = 0, copiar }: { children: ReactNode; atraso?: number; copiar?: boolean }) {
  const { k } = useTempo();
  const [copiado, setCopiado] = useState(false);
  const partes = Children.toArray(children);
  return (
    <div className="cx-nexo">
      <motion.span className="cx-nexo-marca" aria-hidden initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: RITMO.entra * k, delay: atraso * k, ease: SUAVE }}>
        <Orbe tamanho={16} />
      </motion.span>
      <div className="cx-nexo-corpo">
        {partes.map((p, i) => (
          <motion.div key={i} className="cx-parte" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: RITMO.entra * k, delay: (atraso + 0.08 + i * RITMO.escada) * k, ease: SUAVE }}>
            {p}
          </motion.div>
        ))}
        {copiar && (
          <motion.div className="cx-parte cx-nexo-acoes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: RITMO.entra * k, delay: 0.2 * k }}>
            <button
              type="button"
              onClick={() => {
                setCopiado(true);
                setTimeout(() => setCopiado(false), 1800);
              }}
            >
              <Troca chave={copiado ? "ok" : "c"}>
                {copiado ? <Check size={13} /> : <Copy size={13} />}
                {copiado ? "Copiado" : "Copiar resposta"}
              </Troca>
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/** O que o Nexo fez ou está fazendo, numa linha. Em curso: o orbe trabalha ao lado. Feito: o visto se desenha. */
export function Passo({ texto, emCurso, aviso }: { texto: string; emCurso?: boolean; aviso?: boolean }) {
  return (
    <span className={`cx-passo${emCurso ? " cx-passo--curso" : ""}${aviso ? " cx-passo--aviso" : ""}`}>
      <Troca chave={emCurso ? "roda" : aviso ? "aviso" : "visto"} className="cx-passo-icone">
        {emCurso ? <Orbe tamanho={11} estado="trabalhando" /> : aviso ? <i className="cx-passo-aviso" aria-hidden /> : <Visto atraso={0.1} />}
      </Troca>
      <Troca chave={texto} className="cx-passo-texto">
        {texto}
      </Troca>
    </span>
  );
}

/** UM CAMPO EDITÁVEL NO MEIO DA FRASE. Trocar o valor faz ele deslizar e o sublinhado acender. */
export function Lacuna({ valor, opcoes, vazio, mono }: { valor: string | null; opcoes?: string[]; vazio?: string; mono?: boolean }) {
  const [v, setV] = useState(valor);
  const [aberto, setAberto] = useState(false);
  const [trocou, setTrocou] = useState(0);
  const { k } = useTempo();
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
        <Troca chave={v ?? "vazio"} y={6} className="cx-lacuna-valor">
          {v ?? vazio}
        </Troca>
        {opcoes && (
          <motion.span animate={{ rotate: aberto ? 180 : 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }} style={{ display: "inline-flex" }}>
            <ChevronDown size={12} />
          </motion.span>
        )}
        {trocou > 0 && <motion.i key={trocou} className="cx-lacuna-acende" aria-hidden initial={{ scaleX: 0, opacity: 1 }} animate={{ scaleX: 1, opacity: 0 }} transition={{ duration: 0.9 * k, ease: SUAVE }} />}
      </button>
      <AnimatePresence>
        {aberto && opcoes && (
          <motion.span
            className="cx-lacuna-menu"
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2, transition: { duration: RITMO.toque * k } }}
            transition={{ duration: RITMO.troca * k, ease: SUAVE }}
          >
            {opcoes.map((o) => (
              <button
                key={o}
                type="button"
                role="option"
                aria-selected={o === v}
                onClick={() => {
                  if (o !== v) setTrocou((n) => n + 1);
                  setV(o);
                  setAberto(false);
                }}
              >
                <span className="cx-lacuna-marca">{o === v && <Check size={12} />}</span>
                {o}
              </button>
            ))}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/** As saídas: entram em escada curta, afundam de leve ao clicar, cada uma com a sua tecla. */
/** As saídas do chat que levam a outra tela (no protótipo). */
const SAIDA_LEVA: Record<string, [IdTela, string]> = {
  "Abrir o resultado": ["nexo-auditoria", "pronta"],
  "Auditar de novo (nova rodada)": ["nexo-auditoria", "rodando"],
  "Montar o volume": ["nexo", "soltou"],
  "Abrir a ELE-04": ["mapa", "folha-aberta"],
  // montar o volume: a conversa anda pelas situações do palco
  "Dividir assim": ["nexo", "dividido"],
  Desfazer: ["nexo", "lido"],
  "Pode gerar": ["nexo", "gerando"],
  "Restaurar a ARQ-12": ["nexo", "dividido"],
  "Monta os volumes": ["nexo", "montado"],
  "Remontar e baixar": ["nexo", "montado"],
};

/** As saídas que, no app, terminam fora da tela (um download, uma decisão que só fica registrada). */
const SAIDA_AVISA: Record<string, AvisoDoPrototipo> = {
  "Baixar os editáveis (ZIP)": { tom: "ok", titulo: "117_25_editaveis.zip baixado.", texto: "Capa, LD e separatriz em .odt, com o nome do escritório." },
  "Baixar os 2 (ZIP)": { tom: "ok", titulo: "Volume_117-25.zip baixado.", texto: "TOMO-01 e TOMO-02, 412 páginas." },
  "Deixar como está": { tom: "ok", titulo: "O volume fica como está.", texto: "O mapa continua marcado como desatualizado até você remontar." },
  "Um tomo só": { tom: "ok", titulo: "Um tomo só, com as 412 páginas.", texto: "No protótipo, só a divisão em 2 tomos tem tela desenhada." },
};

export function Saidas({ itens, onEscolher }: { itens: { texto: string; principal?: boolean }[]; onEscolher?: (texto: string) => void }) {
  const { k } = useTempo();
  const ir = useIr();
  const avisar = useAvisar();
  const escolher = (texto: string) => {
    if (SAIDA_LEVA[texto]) ir(...SAIDA_LEVA[texto]);
    else if (onEscolher) onEscolher(texto);
    else avisar(SAIDA_AVISA[texto] ?? { tom: "ok", titulo: `“${texto}”`, texto: "No protótipo, esta resposta não leva a outra tela." });
  };
  return (
    <div className="cx-saidas">
      {itens.map((it, i) => (
        <motion.button
          key={it.texto}
          type="button"
          className={`cx-saida${it.principal ? " cx-saida--principal" : ""}`}
          onClick={() => escolher(it.texto)}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98, transition: { duration: RITMO.toque * k } }}
          transition={{ duration: RITMO.entra * k, delay: i * 0.06 * k, ease: SUAVE }}
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
      <div className="cx-frases">
        <p className="cx-frase">
          Capa da prefeitura de <Lacuna valor={semPrefeitura ? null : "Criciúma"} vazio="escolher" opcoes={["Criciúma", "Siderópolis", "Içara", "Forquilhinha"]} />, título{" "}
          <Lacuna valor="UBS da Rua São Francisco de Assis" />, código <Lacuna valor="117-25" mono />, em <Lacuna valor="1 tomo" opcoes={["1 tomo", "2 tomos", "3 tomos"]} />.
        </p>
        <p className="cx-frase">
          Endereço <Lacuna valor="Rua São Francisco de Assis, 410" />, centro de custo <Lacuna valor="117" mono />, data <Lacuna valor="setembro de 2026" opcoes={["agosto de 2026", "setembro de 2026", "outubro de 2026"]} />.
        </p>
        <p className="cx-fonte">A obra foi lida do carimbo das pranchas, uma fonte independente do memorial.</p>
      </div>
    </div>
  );
}

/** Gerando, peça por peça: cada linha troca em crossfade, da fila para o giro, do giro para o arquivo. */
export function Gerando({ itens }: { itens: { id: string; fazendo: string; feito: Arquivo }[] }) {
  const { k } = useTempo();
  const [prontos, setProntos] = useState(1);
  useEffect(() => {
    if (prontos >= itens.length) return;
    const t = setTimeout(() => setProntos((n) => n + 1), 1800 * k);
    return () => clearTimeout(t);
  }, [prontos, itens.length, k]);
  return (
    <div className="cx-pecas cx-pecas--coluna">
      {itens.map((it, i) => (
        <Troca key={it.id} chave={i < prontos ? "feito" : i === prontos ? "agora" : "fila"} className="cx-gerando-linha">
          {i < prontos ? <PecaDeArquivo gerado nova a={it.feito} /> : i === prontos ? <Passo texto={`${it.fazendo}…`} emCurso /> : <span className="cx-fila">{it.fazendo}, na fila</span>}
        </Troca>
      ))}
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
              <Visto atraso={0.6 + i * 0.18} /> consistente
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
  const [n, setN] = useState(reduzido ? palavras.length : 1);
  const fim = useRef(onFim);
  fim.current = onFim;
  useEffect(() => {
    if (n >= palavras.length) {
      fim.current?.();
      return;
    }
    const t = setTimeout(() => setN((x) => x + 1), 55 * k);
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

/** Pensando: antes da primeira palavra, a treliça varrendo e o tempo contando. */
export function Pensando({ desde }: { desde?: number }) {
  const [inicio] = useState(() => desde ?? Date.now());
  return (
    <span className="cx-pensando" role="status" aria-label="O Nexo está pensando">
      <Trelica />
      <span>Pensando</span>
      <Cronometro desde={inicio} />
    </span>
  );
}

/**
 * A LINHA DO PENSAMENTO (ref.: Thought Line). Enquanto pensa, os passos
 * aparecem um a um: o feito ganha visto, o da vez fica claro. Quando a
 * resposta começa, tudo recolhe numa linha só, "Pensou por 1,6 s", que abre
 * de novo no clique para quem quer saber o que o Nexo consultou.
 */
export function LinhaDoPensamento({ passos, pensando, segundos }: { passos: string[]; pensando: boolean; segundos?: number }) {
  const { k } = useTempo();
  const [vistos, setVistos] = useState(1);
  const [aberta, setAberta] = useState(false);
  const [inicio] = useState(() => Date.now());
  useEffect(() => {
    if (!pensando || vistos >= passos.length) return;
    const t = setTimeout(() => setVistos((n) => n + 1), 480 * k);
    return () => clearTimeout(t);
  }, [pensando, vistos, passos.length, k]);
  const mostrar = pensando ? passos.slice(0, vistos) : aberta ? passos : [];
  return (
    <div className="cx-pensamento">
      {pensando ? (
        <Pensando desde={inicio} />
      ) : (
        <button type="button" className="cx-pensou" aria-expanded={aberta} onClick={() => setAberta((a) => !a)}>
          <Check size={13} />
          Pensou por <span className="ds-num">{(segundos ?? 0).toFixed(1).replace(".", ",")} s</span>
          <motion.span className="cx-pensou-seta" animate={{ rotate: aberta ? 180 : 0 }} transition={{ duration: RITMO.toque * k }}>
            <ChevronDown size={13} />
          </motion.span>
        </button>
      )}
      <AnimatePresence initial={false}>
        {mostrar.length > 0 && (
          <motion.ol className="cx-pensamento-passos" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
            {mostrar.map((p, i) => {
              const daVez = pensando && i === vistos - 1;
              return (
                <motion.li key={p} data-da-vez={daVez || undefined} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: RITMO.toque * k }}>
                  {daVez ? <i aria-hidden /> : <Check size={12} />}
                  {p}
                </motion.li>
              );
            })}
          </motion.ol>
        )}
      </AnimatePresence>
    </div>
  );
}

const PASSOS_DA_PERGUNTA = ["Lendo a pergunta", "Consultando o parecer da revisão A", "Conferindo as páginas citadas"];

/**
 * Respondendo em tempo de verdade: pensa (a treliça e os passos aparecendo,
 * com o tempo correndo), escreve (os passos recolhem em "Pensou por…"), e no
 * fim aparece Copiar resposta.
 */
export function Respondendo({ texto, passos = PASSOS_DA_PERGUNTA }: { texto: string; passos?: string[] }) {
  const { k } = useTempo();
  const [fase, setFase] = useState<"pensando" | "escrevendo" | "fim">("pensando");
  const [segundos, setSegundos] = useState(0);
  const [inicio] = useState(() => Date.now());
  const avisar = useContext(FimDaResposta);
  useEffect(() => {
    if (fase !== "pensando") return;
    const t = setTimeout(() => {
      setSegundos((Date.now() - inicio) / 1000);
      setFase("escrevendo");
    }, 480 * passos.length * k + 300 * k);
    return () => clearTimeout(t);
  }, [fase, k, inicio, passos.length]);
  return (
    <DoNexo atraso={0.3} copiar={fase === "fim"}>
      <LinhaDoPensamento passos={passos} pensando={fase === "pensando"} segundos={segundos} />
      {fase !== "pensando" && (
        <Escrevendo
          texto={texto}
          onFim={() => {
            setFase("fim");
            avisar();
          }}
        />
      )}
    </DoNexo>
  );
}

export function Erro() {
  return (
    <p className="cx-erro">
      A resposta não chegou: o modelo não respondeu a tempo. Nada foi gerado nem gasto.
      <motion.button type="button" className="cx-erro-botao" whileTap={{ scale: 0.97 }}>
        <RotateCcw size={13} /> Tentar de novo
      </motion.button>
    </p>
  );
}

/** A primeira pergunta de uma conversa nova: entra em três tempos, pergunta, campo, atalhos. */
export function Vazio({ campo }: { campo: ReactNode }) {
  const { k } = useTempo();
  const entra = (i: number) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6 * k, delay: i * 0.1 * k, ease: SUAVE } });
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
          <motion.button key={t} type="button" whileTap={{ scale: 0.97 }}>
            {t}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
