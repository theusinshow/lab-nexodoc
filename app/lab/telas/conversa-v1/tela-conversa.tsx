"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Check, Download, FileText, MessageSquarePlus, Paperclip, ShieldCheck, Square } from "lucide-react";
import { useState } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import "../resultado-e/resultado.css";
import "../resultado-e/trilho.css";
import { Anexos, Diferenca, EscolhaDeAnalise, EscolhaDeProjeto, ErroDeResposta, Escrevendo, Ficha, Plano, RespostasRapidas, Turno, type ItemDoPlano } from "./turnos";
import "./conversa.css";

export type SituacaoConversa =
  | "confirmar-auditoria"
  | "escolher-projeto"
  | "plano-de-geracao"
  | "capa-sem-prefeitura"
  | "alteracao-pendente"
  | "respondendo"
  | "erro-resposta"
  | "respostas-rapidas";

const PRANCHAS = [
  { nome: "117_25_ARQ_rev-B.pdf", tipo: "pranchas ARQ", paginas: 12 },
  { nome: "117_25_EST_rev-A.pdf", tipo: "pranchas EST", paginas: 8 },
  { nome: "117_25_HID_rev-A.pdf", tipo: "pranchas HID", paginas: 6 },
  { nome: "117_25_ELE_rev-A.pdf", tipo: "pranchas ELE", paginas: 7 },
];
const PLANO: ItemDoPlano[] = [
  { id: "ld", nome: "Lista de documentos", detalhe: "33 folhas em 4 disciplinas, lidas dos carimbos" },
  { id: "capa", nome: "Capa", detalhe: "Prefeitura de Criciúma, tomo 1 de 1" },
  { id: "sep", nome: "Separatrizes", detalhe: "4: ARQ, EST, HID e ELE" },
];

/** Os turnos de cada situação: o que já foi dito e o que o Nexo pede agora. */
function Turnos({ situacao }: { situacao: SituacaoConversa }) {
  const memorial = [{ nome: "117_25_md_geral_a.pdf", tipo: "memorial", paginas: 42 }];
  switch (situacao) {
    case "confirmar-auditoria":
      return (
        <>
          <Turno autor="voce" hora="21:07">
            <Anexos arquivos={memorial} />
            <p className="cv-texto">audita esse memorial, é o da UBS</p>
          </Turno>
          <Turno autor="nexo" hora="21:07" atraso={0.15}>
            <p className="cv-texto">Li o arquivo. Confere antes de eu começar:</p>
            <Ficha
              linhas={[
                { rotulo: "Documento", valor: "Memorial descritivo geral, 42 páginas com texto", ok: true },
                { rotulo: "Obra", valor: <>117-25, UBS da Rua São Francisco de Assis <span className="cv-nota-campo">casou com o projeto</span></>, ok: true },
                { rotulo: "Prefeitura", valor: <><MarcaDaPrefeitura prefeitura="Criciúma" forma="sinal" /> Criciúma</>, ok: true },
                { rotulo: "Revisão", valor: "A, emissão inicial, 12/09/2026" },
                { rotulo: "Análise", valor: <EscolhaDeAnalise /> },
              ]}
              rodape={
                <>
                  <Botao variante="ghost" tamanho="sm">
                    Agora não
                  </Botao>
                  <Botao variante="primary" tamanho="sm">
                    Auditar <Tecla>↵</Tecla>
                  </Botao>
                </>
              }
            />
          </Turno>
        </>
      );
    case "escolher-projeto":
      return (
        <>
          <Turno autor="voce" hora="21:12">
            <Anexos arquivos={[{ nome: "118_25_md_geral_a.pdf", tipo: "memorial", paginas: 36 }]} />
            <p className="cv-texto">audita</p>
          </Turno>
          <Turno autor="nexo" hora="21:12" atraso={0.15}>
            <p className="cv-texto">
              A capa diz <b className="cv-mono">118-25</b>, Ginásio Poliesportivo do Bairro Pinheirinho, e esse código não está nos seus projetos. Onde eu guardo esta auditoria?
            </p>
            <EscolhaDeProjeto />
            <div className="cv-acoes">
              <Botao variante="primary" tamanho="sm">
                Guardar e auditar <Tecla>↵</Tecla>
              </Botao>
            </div>
          </Turno>
        </>
      );
    case "plano-de-geracao":
    case "capa-sem-prefeitura":
    case "respostas-rapidas":
      return (
        <>
          <Turno autor="voce" hora="21:20">
            <Anexos arquivos={PRANCHAS} />
            <p className="cv-texto">gera a LD e a capa do volume</p>
          </Turno>
          <Turno autor="nexo" hora="21:20" atraso={0.15}>
            <p className="cv-texto">{situacao === "capa-sem-prefeitura" ? "Li os 4 arquivos, 33 folhas. Os carimbos não dizem a prefeitura; sem ela a capa não sai." : "Li os 4 arquivos, 33 folhas. Vou gerar isto:"}</p>
            <Plano itens={PLANO} semPrefeitura={situacao === "capa-sem-prefeitura"} />
          </Turno>
        </>
      );
    case "alteracao-pendente":
      return (
        <>
          <Turno autor="nexo" hora="21:22">
            <p className="cv-texto">
              Gerados: a lista de documentos, a capa e 4 separatrizes. <button type="button" className="rs-link">Abrir a LD</button>
            </p>
          </Turno>
          <Turno autor="voce" hora="21:31" atraso={0.1}>
            <p className="cv-texto">tira a ARQ-12 da LD, a folha foi cancelada</p>
          </Turno>
          <Turno autor="nexo" hora="21:31" atraso={0.25}>
            <p className="cv-texto">Fica assim:</p>
            <Diferenca />
          </Turno>
        </>
      );
    case "respondendo":
      return (
        <>
          <Turno autor="voce" hora="21:40">
            <p className="cv-texto">por que a NBR 5626 de 1998 é problema se o dimensionamento está certo?</p>
          </Turno>
          <Turno autor="nexo" hora="21:40" atraso={0.1}>
            <Escrevendo texto="Porque a vistoria da prefeitura confere o memorial contra a norma vigente, e a edição de 2020 substituiu a de 1998. Se o dimensionamento continua válido pela 2020, basta atualizar a citação no cap. 6; se mudou, o quadro de pressões também precisa ser revisto. No ACH-004, a Carla já registrou que o dimensionamento foi conferido pela 2020, então é só a citação." />
          </Turno>
        </>
      );
    case "erro-resposta":
      return (
        <>
          <Turno autor="voce" hora="21:44">
            <p className="cv-texto">resume os bloqueios em duas linhas pra mandar pro cliente</p>
          </Turno>
          <Turno autor="nexo" hora="21:44" atraso={0.1}>
            <ErroDeResposta />
          </Turno>
        </>
      );
  }
}

/**
 * A CONVERSA COM O NEXO. A mesma estrutura do Resultado: o conteúdo à
 * esquerda, a coluna fixa à direita com o que existe nesta conversa (arquivos,
 * o que já foi gerado, as ações). O campo de escrever fica no pé da conversa;
 * enquanto o Nexo responde, o botão de enviar vira Parar.
 */
export function TelaConversa({ situacao }: { situacao: SituacaoConversa }) {
  const { dur } = useTempo();
  const [texto, setTexto] = useState(situacao === "erro-resposta" ? "resume os bloqueios em duas linhas pra mandar pro cliente" : "");
  const respondendo = situacao === "respondendo";
  const gerados = situacao === "alteracao-pendente";
  const arquivos =
    situacao === "confirmar-auditoria" || situacao === "respondendo" || situacao === "erro-resposta"
      ? [{ nome: "117_25_md_geral_a.pdf", tipo: "memorial" }]
      : situacao === "escolher-projeto"
        ? [{ nome: "118_25_md_geral_a.pdf", tipo: "memorial" }]
        : PRANCHAS.map((p) => ({ nome: p.nome, tipo: p.tipo }));

  return (
    <div className="rs rd re cv">
      <Topo atual="Painel" />
      <div className="re-titulo">
        <header className="re-cabeca">
          <div className="rs-obra">
            <MarcaDaPrefeitura prefeitura="Criciúma" forma="sinal" />
            <span className="ds-code">{situacao === "escolher-projeto" ? "sem projeto" : "117-25"}</span>
            <span>{situacao === "escolher-projeto" ? "a obra lida ainda não tem projeto" : "UBS da Rua São Francisco de Assis"}</span>
          </div>
          <h1>{situacao === "respondendo" || situacao === "erro-resposta" ? "Perguntas sobre a auditoria" : situacao === "confirmar-auditoria" || situacao === "escolher-projeto" ? "Auditar o memorial" : "LD, capa e separatrizes"}</h1>
        </header>
      </div>

      <div className="re-corpo">
        <main className="re-principal cv-principal">
          <div className="cv-turnos">
            <Turnos situacao={situacao} />
          </div>

          {situacao === "respostas-rapidas" && <RespostasRapidas />}

          {/* o campo de escrever: anexar, o texto, e enviar (ou parar) */}
          <form className="cv-campo" onSubmit={(e) => e.preventDefault()}>
            <button type="button" className="cv-anexar" aria-label="Anexar PDFs" title="Anexar PDFs (ou solte na tela)">
              <Paperclip size={16} />
            </button>
            <textarea rows={1} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={respondendo ? "O Nexo está respondendo…" : "Peça, pergunte ou solte os PDFs aqui"} />
            <AnimatePresence mode="wait" initial={false}>
              {respondendo ? (
                <motion.button key="parar" type="button" className="cv-enviar cv-enviar--parar" aria-label="Parar" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: dur("feedback") }}>
                  <Square size={12} fill="currentColor" />
                </motion.button>
              ) : (
                <motion.button key="enviar" type="submit" className="cv-enviar" aria-label="Enviar (Enter)" disabled={!texto.trim()} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: dur("feedback") }}>
                  <ArrowUp size={16} />
                </motion.button>
              )}
            </AnimatePresence>
          </form>
          <p className="cv-dica">
            <Tecla>↵</Tecla> envia, <Tecla>Shift</Tecla> <Tecla>↵</Tecla> quebra a linha. O Nexo não gera nada sem você confirmar.
          </p>
        </main>

        {/* ================= a coluna: o que existe nesta conversa ================= */}
        <aside className="re-trilho cv-trilho" aria-label="Nesta conversa">
          <section className="cv-bloco">
            <h3>Arquivos</h3>
            <ul className="cv-lista">
              {arquivos.map((a) => (
                <li key={a.nome}>
                  <FileText size={13} />
                  <span className="cv-mono">{a.nome}</span>
                  <small>{a.tipo}</small>
                </li>
              ))}
            </ul>
          </section>
          <section className="cv-bloco">
            <h3>Gerados</h3>
            {gerados ? (
              <ul className="cv-lista">
                {["Lista de documentos", "Capa", "Separatrizes, 4"].map((g) => (
                  <li key={g}>
                    <Check size={13} className="cv-ok" />
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rs-nota">Nada ainda. O que o Nexo gerar aparece aqui.</p>
            )}
          </section>
          <section className="re-acoes">
            <button type="button" className="re-acao" disabled={!gerados}>
              <Download />
              <span>
                Baixar os editáveis<small>ZIP com os .docx e .xlsx</small>
              </span>
            </button>
            <button type="button" className="re-acao" disabled={!gerados}>
              <ShieldCheck />
              <span>
                Conferir o selo<small>o carimbo de cada folha</small>
              </span>
            </button>
            <button type="button" className="re-acao re-acao--discreta">
              <MessageSquarePlus />
              Nova conversa
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
