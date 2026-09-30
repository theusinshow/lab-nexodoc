"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, ChevronDown, MessageSquarePlus, Paperclip, RotateCcw, Square, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import { DeVoce, Diferenca, DoNexo, Escrevendo, Lacuna, Passo, PecaDeArquivo, Plano, Saidas, Vazio, type Arquivo } from "./turnos";
import "./conversa.css";

export type SituacaoConversa =
  | "nova"
  | "anexando"
  | "confirmar-auditoria"
  | "escolher-projeto"
  | "plano-de-geracao"
  | "capa-sem-prefeitura"
  | "alteracao-pendente"
  | "respondendo"
  | "erro-resposta";

const MEMORIAL: Arquivo[] = [{ nome: "117_25_md_geral_a.pdf", paginas: 42 }];
const PRANCHAS: Arquivo[] = [
  { nome: "117_25_ARQ_rev-B.pdf", paginas: 12 },
  { nome: "117_25_EST_rev-A.pdf", paginas: 8 },
  { nome: "117_25_HID_rev-A.pdf", paginas: 6 },
  { nome: "117_25_ELE_rev-A.pdf", paginas: 7 },
];

/** O CAMPO: os arquivos em cima, o texto, e embaixo o que se anexa, o modo e enviar (ou parar). */
function Campo({ arquivos, respondendo, texto: inicial = "", modo }: { arquivos?: Arquivo[]; respondendo?: boolean; texto?: string; modo?: boolean }) {
  const { dur } = useTempo();
  const [texto, setTexto] = useState(inicial);
  const pode = !!texto.trim() || !!arquivos?.length;
  return (
    <form className="cx-campo" onSubmit={(e) => e.preventDefault()}>
      {arquivos && arquivos.length > 0 && (
        <div className="cx-campo-arquivos">
          {arquivos.map((a) => (
            <span key={a.nome} className="cx-campo-peca">
              <PecaDeArquivo a={a} />
              <button type="button" aria-label={`Tirar ${a.nome}`}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <textarea rows={1} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={respondendo ? "O Nexo está respondendo" : "Peça, pergunte ou solte os PDFs"} aria-label="Mensagem para o Nexo" />
      <div className="cx-campo-pe">
        <button type="button" className="cx-campo-botao" aria-label="Anexar PDFs" title="Anexar PDFs">
          <Paperclip size={16} />
        </button>
        {modo && (
          <button type="button" className="cx-modo" title="Como o Nexo audita">
            Análise profunda <ChevronDown size={13} />
          </button>
        )}
        <AnimatePresence mode="wait" initial={false}>
          {respondendo ? (
            <motion.button key="parar" type="button" className="cx-enviar cx-enviar--parar" aria-label="Parar" initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }} transition={{ duration: dur("feedback") }}>
              <Square size={11} fill="currentColor" />
            </motion.button>
          ) : (
            <motion.button key="enviar" type="submit" className="cx-enviar" aria-label="Enviar (Enter)" disabled={!pode} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }} transition={{ duration: dur("feedback") }}>
              <ArrowUp size={16} />
            </motion.button>
          )}
        </AnimatePresence>
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
          <DoNexo atraso={0.15}>
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
          <DoNexo atraso={0.15}>
            <Passo texto="Li o memorial: 36 páginas, revisão A" />
            <p className="cx-texto">
              A capa diz <span className="cx-mono">118-25</span>, Ginásio Poliesportivo do Bairro Pinheirinho, e esse código não está nos seus projetos. Onde eu guardo?
            </p>
            <Saidas
              itens={[
                { texto: "Criar o projeto 118-25", principal: true },
                { texto: "Guardar na SIM118-25, Ginásio do Pinheirinho (Siderópolis)" },
                { texto: "Escolher outro projeto" },
              ]}
            />
          </DoNexo>
        </>
      );
    case "plano-de-geracao":
    case "capa-sem-prefeitura": {
      const falta = situacao === "capa-sem-prefeitura";
      return (
        <>
          <DeVoce arquivos={PRANCHAS} texto="gera a LD e a capa do volume" />
          <DoNexo atraso={0.15}>
            <Passo texto="Li 4 arquivos, 33 folhas em 4 disciplinas" />
            <p className="cx-texto">{falta ? "Os carimbos não dizem a prefeitura, e sem ela a capa não sai. Escolha na frase abaixo." : "Vou gerar estes três. Não usa IA: sai em segundos."}</p>
            <Plano semPrefeitura={falta} />
            {falta ? (
              <p className="cx-aviso">Falta a prefeitura da capa. A LD e as separatrizes já podem sair sem ela.</p>
            ) : null}
            <Saidas itens={falta ? [{ texto: "Gerar só a LD e as separatrizes", principal: true }, { texto: "Ver como sai" }] : [{ texto: "Gerar", principal: true }, { texto: "Ver como sai" }, { texto: "Só a LD" }]} />
          </DoNexo>
        </>
      );
    }
    case "alteracao-pendente":
      return (
        <>
          <DoNexo>
            <Passo texto="Gerados: LD, capa e 4 separatrizes" />
            <div className="cx-pecas">
              <PecaDeArquivo gerado a={{ nome: "LD_117-25_rev-A.pdf", paginas: 3 }} />
              <PecaDeArquivo gerado a={{ nome: "Capa_117-25_tomo-1.pdf", paginas: 1 }} />
              <PecaDeArquivo gerado a={{ nome: "Separatrizes_117-25.pdf", paginas: 4 }} />
            </div>
          </DoNexo>
          <DeVoce texto="tira a ARQ-12 da LD, a folha foi cancelada" atraso={0.1} />
          <DoNexo atraso={0.25}>
            <p className="cx-texto">Fica assim: sai uma folha, continuam 32. A capa e as separatrizes não mudam.</p>
            <Diferenca />
            <Saidas itens={[{ texto: "Aplicar", principal: true }, { texto: "Descartar" }]} />
          </DoNexo>
        </>
      );
    case "respondendo":
      return (
        <>
          <DeVoce texto="por que a NBR 5626 de 1998 é problema se o dimensionamento está certo?" />
          <DoNexo atraso={0.1}>
            <Passo texto="Consultando o parecer da revisão A" emCurso />
            <Escrevendo texto="Porque a vistoria da prefeitura confere o memorial contra a norma vigente, e a edição de 2020 substituiu a de 1998. Se o dimensionamento continua válido pela 2020, basta atualizar a citação no capítulo 6. No ACH-004, a Carla já registrou que conferiu pela 2020, então é só a citação." />
          </DoNexo>
        </>
      );
    case "erro-resposta":
      return (
        <>
          <DeVoce texto="resume os bloqueios em duas linhas pra mandar pro cliente" />
          <DoNexo atraso={0.1}>
            <p className="cx-erro">
              A resposta não chegou: o modelo não respondeu a tempo. Nada foi gerado nem gasto.
              <button type="button" className="cx-erro-botao">
                <RotateCcw size={13} /> Tentar de novo
              </button>
            </p>
          </DoNexo>
        </>
      );
    default:
      return null;
  }
}

/**
 * A CONVERSA COM O NEXO. Uma coluna só, centrada, sem nada disputando: o que
 * você manda é um bloco suave à direita; o que o Nexo responde é texto limpo,
 * com o que ele fez numa linha de estado e as saídas empilhadas embaixo, cada
 * uma com a sua tecla. As decisões moram na frase ("capa da prefeitura de
 * [Criciúma]"), não num formulário. O que ele gera aparece como peça, ali.
 */
export function TelaConversa({ situacao }: { situacao: SituacaoConversa }) {
  const nova = situacao === "nova" || situacao === "anexando";
  const titulo =
    situacao === "nova" || situacao === "anexando"
      ? "Conversa nova"
      : situacao === "respondendo" || situacao === "erro-resposta"
        ? "Perguntas sobre a auditoria"
        : situacao === "confirmar-auditoria" || situacao === "escolher-projeto"
          ? "Auditar o memorial"
          : "LD, capa e separatrizes";
  const campo = (
    <Campo
      arquivos={situacao === "anexando" ? [{ nome: "117_25_md_geral_a.pdf", paginas: 42 }, { nome: "117_25_ARQ_rev-B.pdf", paginas: 12, lendo: true }] : undefined}
      respondendo={situacao === "respondendo"}
      texto={situacao === "erro-resposta" ? "resume os bloqueios em duas linhas pra mandar pro cliente" : situacao === "anexando" ? "audita o memorial e confere as pranchas de arquitetura" : ""}
      modo={nova}
    />
  );

  return (
    <div className="cx">
      <Topo atual="Painel" />
      <header className="cx-cabeca">
        <span className="cx-cabeca-obra">
          <MarcaDaPrefeitura prefeitura="Criciúma" forma="sinal" />
          <span className="cx-mono">{situacao === "escolher-projeto" ? "sem projeto" : "117-25"}</span>
        </span>
        <span className="cx-cabeca-titulo">{titulo}</span>
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
            <Fio situacao={situacao} />
          </main>
          <div className="cx-rodape">{campo}</div>
        </>
      )}
    </div>
  );
}
