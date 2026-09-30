"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowUp, ChevronDown, MessageSquarePlus, Paperclip, Square, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import { Conferencia, DeVoce, FimDaResposta, RITMO, SUAVE, Diferenca, DoNexo, Erro, Gerando, Lacuna, Passo, PecaDeArquivo, Plano, Respondendo, Saidas, Vazio, type Arquivo } from "./turnos";
import "./conversa.css";

export type SituacaoConversa =
  | "nova"
  | "anexando"
  | "confirmar-auditoria"
  | "escolher-projeto"
  | "arquivo-sem-selo"
  | "auditoria-pronta"
  | "plano-de-geracao"
  | "capa-sem-prefeitura"
  | "gerando"
  | "alteracao-pendente"
  | "montar-volume"
  | "volume-montado"
  | "conferir-selo"
  | "respondendo"
  | "erro-resposta";

const MEMORIAL: Arquivo[] = [{ nome: "117_25_md_geral_a.pdf", paginas: 42 }];
const PRANCHAS: Arquivo[] = [
  { nome: "117_25_ARQ_rev-B.pdf", paginas: 12 },
  { nome: "117_25_EST_rev-A.pdf", paginas: 8 },
  { nome: "117_25_HID_rev-A.pdf", paginas: 6 },
  { nome: "117_25_ELE_rev-A.pdf", paginas: 7 },
];
const GERADOS = [
  { id: "ld", fazendo: "Montando a lista de documentos", feito: { nome: "LD_117-25_rev-A.pdf", paginas: 3 } },
  { id: "capa", fazendo: "Desenhando a capa", feito: { nome: "Capa_117-25_tomo-01.pdf", paginas: 1 } },
  { id: "sep", fazendo: "Gerando as 4 separatrizes", feito: { nome: "Separatrizes_117-25.pdf", paginas: 4 } },
];

/**
 * O CAMPO: os arquivos em cima, o texto, e embaixo o que se anexa, o modo e
 * enviar. Os arquivos entram e saem com layout (os vizinhos escorregam para o
 * lugar); enviar vira Parar girando, e acende quando há o que mandar.
 */
function Campo({ arquivos: iniciais, respondendo, texto: inicial = "", modo }: { arquivos?: Arquivo[]; respondendo?: boolean; texto?: string; modo?: boolean }) {
  const { k } = useTempo();
  const [texto, setTexto] = useState(inicial);
  const [arquivos, setArquivos] = useState(iniciais ?? []);
  const pode = !!texto.trim() || arquivos.length > 0;
  return (
    <form className="cx-campo" onSubmit={(e) => e.preventDefault()}>
      <AnimatePresence initial={false}>
        {arquivos.length > 0 && (
          <motion.div className="cx-campo-arquivos" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0, paddingBottom: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
            <AnimatePresence mode="popLayout">
              {arquivos.map((a, i) => (
                <motion.span
                  key={a.nome}
                  layout
                  className="cx-campo-peca"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: RITMO.toque * k } }}
                  transition={{ duration: RITMO.entra * k, delay: i * 0.1 * k, ease: SUAVE }}
                >
                  <PecaDeArquivo a={a} />
                  <button type="button" aria-label={`Tirar ${a.nome}`} onClick={() => setArquivos((l) => l.filter((x) => x.nome !== a.nome))}>
                    <X size={12} />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      <textarea rows={1} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={respondendo ? "O Nexo está respondendo" : "Peça em texto: “cria a LD e a capa dessas pranchas”, ou solte os PDFs"} aria-label="Mensagem para o Nexo" />
      <div className="cx-campo-pe">
        <motion.button type="button" className="cx-campo-botao" aria-label="Anexar PDFs" title="Anexar PDFs" whileTap={{ scale: 0.94 }}>
          <Paperclip size={16} />
        </motion.button>
        {modo && (
          <button type="button" className="cx-modo" title="Como o Nexo audita">
            Análise profunda <ChevronDown size={13} />
          </button>
        )}
        <span className="cx-enviar-caixa">
        <AnimatePresence initial={false}>
          {respondendo ? (
            <motion.button key="parar" type="button" className="cx-enviar cx-enviar--parar" aria-label="Parar" initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }} whileTap={{ scale: 0.94 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
              <Square size={11} fill="currentColor" />
            </motion.button>
          ) : (
            <motion.button key="enviar" type="submit" className="cx-enviar" aria-label="Enviar (Enter)" disabled={!pode} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }} whileTap={pode ? { scale: 0.94 } : undefined} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
              <ArrowUp size={16} />
            </motion.button>
          )}
        </AnimatePresence>
        </span>
      </div>
    </form>
  );
}

/** Os turnos de cada situação. */
function Fio({ situacao }: { situacao: SituacaoConversa }): ReactNode {
  switch (situacao) {
    case "confirmar-auditoria":
      return (
        <>
          <DeVoce arquivos={MEMORIAL} texto="audita esse memorial, é o da UBS" />
          <DoNexo atraso={0.3}>
            <Passo texto="Li o memorial: 42 páginas com texto, revisão A" />
            <p className="cx-texto">
              É o memorial geral da <b>UBS da Rua São Francisco de Assis</b>, obra <span className="cx-mono">117-25</span>, prefeitura de Criciúma. Casou com o projeto que você já tem.
            </p>
            <p className="cx-frase">
              Faço a análise <Lacuna valor="profunda" opcoes={["profunda", "rápida"]} />: capítulo a capítulo, com um segundo modelo revisando cada achado. Leva uns 4 minutos, e você pode fechar a aba.
            </p>
            <Saidas itens={[{ texto: "Auditar", principal: true }, { texto: "É outra obra" }, { texto: "Agora não" }]} />
          </DoNexo>
        </>
      );
    case "escolher-projeto":
      return (
        <>
          <DeVoce arquivos={[{ nome: "118_25_md_geral_a.pdf", paginas: 36 }]} texto="audita" />
          <DoNexo atraso={0.3}>
            <Passo texto="Li o memorial: 36 páginas, revisão A" />
            <p className="cx-texto">
              A capa diz <span className="cx-mono">118-25</span>, Ginásio Poliesportivo do Bairro Pinheirinho, e esse código não está nos seus projetos. Onde eu guardo?
            </p>
            <Saidas itens={[{ texto: "Criar o projeto 118-25", principal: true }, { texto: "Guardar na SIM118-25, Ginásio do Pinheirinho (Siderópolis)" }, { texto: "Escolher outro projeto" }]} />
          </DoNexo>
        </>
      );
    case "arquivo-sem-selo":
      return (
        <>
          <DeVoce arquivos={[...MEMORIAL, { nome: "117_25_detalhes_esquadrias.pdf", paginas: 3 }]} texto="audita e confere com a prancha de esquadrias" />
          <DoNexo atraso={0.3}>
            <Passo texto="Li o memorial: 42 páginas, revisão A" />
            <Passo texto="O carimbo não pôde ser lido em 117_25_detalhes_esquadrias.pdf" aviso />
            <p className="cx-texto">São 3 páginas sem carimbo onde as pranchas o têm. Se for prancha, eu leio o selo de outro jeito; se não, a obra fica lida só do próprio memorial, sem prancha para confrontar.</p>
            <Saidas itens={[{ texto: "Tratar este PDF como prancha (ler o selo)", principal: true }, { texto: "Auditar só o memorial" }, { texto: "Tirar este arquivo" }]} />
          </DoNexo>
        </>
      );
    case "auditoria-pronta":
      return (
        <>
          <DeVoce arquivos={MEMORIAL} texto="audita esse memorial, é o da UBS" />
          <DoNexo atraso={0.3}>
            <Passo texto="Auditei o memorial geral, revisão A, em 4 min 12 s" />
            <p className="cx-texto">
              <b>14 achados.</b> 3 impedem a entrega, 6 pedem uma decisão sua e 5 são de texto. O mais sério é a NBR 5626 citada na edição de 1998, no capítulo 6.
            </p>
            <Saidas itens={[{ texto: "Abrir o resultado", principal: true }, { texto: "Perguntar sobre um achado" }, { texto: "Auditar de novo (nova rodada)" }]} />
          </DoNexo>
        </>
      );
    case "plano-de-geracao":
    case "capa-sem-prefeitura": {
      const falta = situacao === "capa-sem-prefeitura";
      return (
        <>
          <DeVoce arquivos={PRANCHAS} texto="gera a LD e a capa do volume" />
          <DoNexo atraso={0.3}>
            <Passo texto="Li 4 arquivos, 33 folhas em 4 disciplinas" />
            <p className="cx-texto">{falta ? "Os carimbos não dizem a prefeitura, e sem ela a capa não sai. Escolha na frase abaixo." : "Vou gerar estes três. Não usa IA: sai em segundos."}</p>
            <Plano semPrefeitura={falta} />
            {falta ? <p className="cx-aviso">Falta a prefeitura da capa. A LD e as separatrizes já podem sair sem ela.</p> : null}
            <Saidas itens={falta ? [{ texto: "Gerar só a LD e as separatrizes", principal: true }, { texto: "Ver como sai" }] : [{ texto: "Gerar", principal: true }, { texto: "Ver como sai" }, { texto: "Só a LD" }]} />
          </DoNexo>
        </>
      );
    }
    case "gerando":
      return (
        <>
          <DeVoce arquivos={PRANCHAS} texto="gera a LD e a capa do volume" />
          <DoNexo atraso={0.3}>
            <Passo texto="Li 4 arquivos, 33 folhas em 4 disciplinas" />
            <Gerando itens={GERADOS} />
            <Saidas itens={[{ texto: "Montar o volume", principal: true }, { texto: "Baixar os editáveis (ZIP)" }]} />
          </DoNexo>
        </>
      );
    case "alteracao-pendente":
      return (
        <>
          <DoNexo>
            <Passo texto="Gerados: LD, capa e 4 separatrizes" />
            <div className="cx-pecas cx-pecas--coluna">
              {GERADOS.map((g) => (
                <PecaDeArquivo key={g.id} gerado a={g.feito} />
              ))}
            </div>
          </DoNexo>
          <DeVoce texto="tira a ARQ-12 da LD, a folha foi cancelada" atraso={0.25} />
          <DoNexo atraso={0.55}>
            <p className="cx-texto">Fica assim: sai uma folha, continuam 32. A capa e as separatrizes não mudam.</p>
            <Diferenca />
            <Saidas itens={[{ texto: "Aplicar", principal: true }, { texto: "Descartar" }]} />
          </DoNexo>
        </>
      );
    case "montar-volume":
      return (
        <>
          <DeVoce texto="monta o volume com tudo" />
          <DoNexo atraso={0.3}>
            <Passo texto="Juntei memorial, LD, capa, 4 separatrizes e 33 pranchas: 412 páginas" />
            <p className="cx-texto">Passa do que um tomo costuma aguentar na encadernação da prefeitura.</p>
            <p className="cx-frase">
              Divido em <Lacuna valor="2 tomos" opcoes={["1 tomo", "2 tomos", "3 tomos"]} />, com o tomo 02 começando em{" "}
              <Lacuna valor="HID-01, Instalações hidráulicas" opcoes={["EST-01, Locação e cargas", "HID-01, Instalações hidráulicas", "ELE-01, Entrada de energia"]} />.
            </p>
            <Saidas itens={[{ texto: "Montar os 2 volumes", principal: true }, { texto: "Ver a divisão" }, { texto: "Um tomo só" }]} />
          </DoNexo>
        </>
      );
    case "volume-montado":
      return (
        <>
          <DeVoce texto="monta o volume com tudo" />
          <DoNexo atraso={0.3}>
            <Passo texto="Volume montado: 2 tomos, 412 páginas" />
            <div className="cx-pecas cx-pecas--coluna">
              <PecaDeArquivo gerado nova a={{ nome: "Volume_117-25_TOMO-01.pdf", paginas: 238 }} atraso={0.45} />
              <PecaDeArquivo gerado nova a={{ nome: "Volume_117-25_TOMO-02.pdf", paginas: 174 }} atraso={0.6} />
            </div>
            <Passo texto="O volume foi montado, mas a conferência não pôde rodar: a ELE-04 não tem selo legível" aviso />
            <Saidas itens={[{ texto: "Conferir de novo", principal: true }, { texto: "Abrir a ELE-04" }, { texto: "Baixar os editáveis (ZIP)" }]} />
          </DoNexo>
        </>
      );
    case "conferir-selo":
      return (
        <>
          <DeVoce arquivos={PRANCHAS} texto="confere o selo das pranchas com o memorial" />
          <DoNexo atraso={0.3}>
            <Passo texto="Li os selos de 33 pranchas" />
            <Conferencia />
            <p className="cx-fonte">A obra foi lida do carimbo das pranchas, uma fonte independente do memorial.</p>
            <Saidas itens={[{ texto: "Abrir ARQ-03 e ARQ-07", principal: true }, { texto: "Auditar o memorial" }]} />
          </DoNexo>
        </>
      );
    case "respondendo":
      return (
        <>
          <DeVoce texto="por que a NBR 5626 de 1998 é problema se o dimensionamento está certo?" />
          <Respondendo texto="Porque a vistoria da prefeitura confere o memorial contra a norma vigente, e a edição de 2020 substituiu a de 1998. Se o dimensionamento continua válido pela 2020, basta atualizar a citação no capítulo 6. No ACH-004, a Carla já registrou que conferiu pela 2020, então é só a citação." />
        </>
      );
    case "erro-resposta":
      return (
        <>
          <DeVoce texto="resume os bloqueios em duas linhas pra mandar pro cliente" />
          <DoNexo atraso={0.3}>
            <Erro />
          </DoNexo>
        </>
      );
    default:
      return null;
  }
}

const TITULO: Record<SituacaoConversa, string> = {
  nova: "Conversa nova",
  anexando: "Conversa nova",
  "confirmar-auditoria": "Auditar o memorial",
  "escolher-projeto": "Auditar o memorial",
  "arquivo-sem-selo": "Auditar o memorial",
  "auditoria-pronta": "Auditar o memorial",
  "plano-de-geracao": "LD, capa e separatrizes",
  "capa-sem-prefeitura": "LD, capa e separatrizes",
  gerando: "LD, capa e separatrizes",
  "alteracao-pendente": "LD, capa e separatrizes",
  "montar-volume": "Montar o volume",
  "volume-montado": "Montar o volume",
  "conferir-selo": "Conferir o selo",
  respondendo: "Perguntas sobre a auditoria",
  "erro-resposta": "Perguntas sobre a auditoria",
};

/** Sobe até o primeiro ancestral que rola: é nele que se mede a distância do fim. */
function rolador(el: HTMLElement | null): HTMLElement | Window {
  for (let p = el?.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === "auto" || o === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return window;
}

/** Longe do fim, aparece "Ir para as últimas mensagens" em cima do campo. */
function useLongeDoFim(ref: React.RefObject<HTMLElement | null>) {
  const [longe, setLonge] = useState(false);
  useEffect(() => {
    const r = rolador(ref.current);
    const medir = () => {
      const falta = r instanceof Window ? document.documentElement.scrollHeight - (window.scrollY + window.innerHeight) : r.scrollHeight - (r.scrollTop + r.clientHeight);
      setLonge(falta > 240);
    };
    medir();
    r.addEventListener("scroll", medir, { passive: true });
    return () => r.removeEventListener("scroll", medir);
  }, [ref]);
  const descer = () => {
    const r = rolador(ref.current);
    if (r instanceof Window) window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
    else r.scrollTo({ top: r.scrollHeight, behavior: "smooth" });
  };
  return { longe, descer };
}

/**
 * A CONVERSA COM O NEXO. Uma coluna só, centrada, sem nada disputando: o que
 * você manda é um bloco suave à direita; o que o Nexo responde é texto limpo,
 * com o que ele fez numa linha de estado e as saídas empilhadas embaixo, cada
 * uma com a sua tecla. As decisões moram na frase ("capa da prefeitura de
 * [Criciúma]"), não num formulário. O que ele gera aparece como peça, ali.
 */
export function TelaConversa({ situacao }: { situacao: SituacaoConversa }) {
  const { k } = useTempo();
  const ref = useRef<HTMLDivElement>(null);
  const { longe, descer } = useLongeDoFim(ref);
  const nova = situacao === "nova" || situacao === "anexando";
  const [respondendo, setRespondendo] = useState(situacao === "respondendo");
  const campo = (
    <Campo
      arquivos={situacao === "anexando" ? [{ nome: "117_25_md_geral_a.pdf", paginas: 42 }, { nome: "117_25_ARQ_rev-B.pdf", paginas: 12, lendo: true }] : undefined}
      respondendo={respondendo}
      texto={situacao === "erro-resposta" ? "resume os bloqueios em duas linhas pra mandar pro cliente" : situacao === "anexando" ? "audita o memorial e confere as pranchas de arquitetura" : ""}
      modo={nova}
    />
  );

  return (
    <div className="cx" ref={ref}>
      <Topo atual="Painel" />
      <header className="cx-cabeca">
        <span className="cx-cabeca-obra">
          <MarcaDaPrefeitura prefeitura="Criciúma" forma="sinal" />
          <span className="cx-mono">{situacao === "escolher-projeto" ? "sem projeto" : "117-25"}</span>
        </span>
        <span className="cx-cabeca-titulo">{TITULO[situacao]}</span>
        <Botao variante="quiet" tamanho="sm" className="cx-nova">
          <MessageSquarePlus /> Nova conversa <Tecla>N</Tecla>
        </Botao>
      </header>

      {nova ? (
        <main className="cx-fio cx-fio--vazio">
          <Vazio campo={campo} />
        </main>
      ) : (
        <>
          <main className="cx-fio">
            <FimDaResposta.Provider value={() => setRespondendo(false)}>
              <Fio situacao={situacao} />
            </FimDaResposta.Provider>
          </main>
          <div className="cx-rodape">
            <div className="cx-rodape-dentro">
              <AnimatePresence>
                {longe && (
                  <motion.button
                    type="button"
                    className="cx-descer"
                    onClick={descer}
                    initial={{ opacity: 0, y: 6, x: "-50%" }}
                    animate={{ opacity: 1, y: 0, x: "-50%" }}
                    exit={{ opacity: 0, y: 6, x: "-50%" }}
                    transition={{ duration: RITMO.troca * k, ease: SUAVE }}
                  >
                    <ArrowDown size={13} /> Ir para as últimas mensagens
                  </motion.button>
                )}
              </AnimatePresence>
              {campo}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
