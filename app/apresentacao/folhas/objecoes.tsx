"use client";

import { Check, FileArchive, FileText, ScrollText } from "lucide-react";

import type { Slide } from "../palco";
import { Entra, MONO, Papel } from "../pecas";

/**
 * CAPÍTULO 4 — AS OBJEÇÕES QUE MERECEM TELA (folhas 15 e 16): por que não só o
 * ChatGPT, e o que não depende de confiança. A pergunta do comprador aparece
 * na bolha de quem escreve no chat do Nexo; a resposta é uma peça, não um
 * parágrafo.
 */

const BLOCO = "Objeções";

/* ══════════════════════════════════════════ folha 15: a comparação */

type Celula = true | false | string;

/**
 * A COMPARAÇÃO, honesta. A primeira linha dá o ponto ao chat de propósito: ele
 * lê o PDF e responde, e negar isso custaria a credibilidade das outras
 * linhas. O que separa os dois é o resto — e o resto são os dois argumentos da
 * folha, como grupos da tabela.
 */
const GRUPOS: ReadonlyArray<{
  grupo: string;
  linhas: ReadonlyArray<readonly [string, Celula, Celula]>;
}> = [
  {
    grupo: "O modelo é uma peça, não é o processo.",
    linhas: [
      ["Lê o documento e responde", true, true],
      ["Cada achado com a página e a transcrição", "se alguém pedir", true],
      ["Regras verificáveis, que a IA não apaga", false, true],
      ["Segunda passada que derruba o que não se sustenta", false, true],
      ["Resultado registrado por obra", false, true],
    ],
  },
  {
    grupo: "Metade do trabalho não é conversa.",
    linhas: [["Lista de documentos, tomos, ODT, PDF e ZIP", false, true]],
  },
];

function Marca({ valor }: { valor: Celula }) {
  if (valor === true)
    return <Check aria-label="sim" size={26} strokeWidth={2.25} style={{ color: "var(--ds-text-primary)" }} />;
  if (valor === false)
    return <span aria-label="não" style={{ color: "var(--ds-text-tertiary)", opacity: 0.6 }}>—</span>;
  return <span style={{ fontSize: 19, color: "var(--ds-text-tertiary)" }}>{valor}</span>;
}

/** As colunas da comparação: o critério, o chat, o NexoDoc. */
const COLUNAS = "minmax(0, 1fr) 240px 200px";
/** A coluna do NexoDoc é um trilho só, de cima a baixo: o fundo não se parte entre os grupos. */
const TRILHO = "rgb(255 255 255 / 0.04)";

/**
 * A COMPARAÇÃO como grade, e não como <table>: a célula centra o visto de
 * verdade (o ícone é bloco, e `text-align` não o movia), e a coluna do NexoDoc
 * vira uma faixa contínua com os cantos arredondados no topo e no pé.
 */
function Comparacao({ atraso }: { atraso: number }) {
  const linhas = GRUPOS.flatMap((g) => [
    { tipo: "grupo" as const, texto: g.grupo },
    ...g.linhas.map(([rotulo, chat, nexo]) => ({ tipo: "linha" as const, rotulo, chat, nexo })),
  ]);
  let n = 0;
  const centro = { display: "flex", alignItems: "center", justifyContent: "center" } as const;
  return (
    <div role="table" aria-label="Um chat com o PDF e o NexoDoc" className="ap-surge" style={{ display: "grid", gridTemplateColumns: COLUNAS, animationDelay: `${atraso}ms` }}>
      <span role="columnheader" />
      <span role="columnheader" style={{ ...centro, padding: "18px 0 14px", fontSize: 17, fontWeight: 500, color: "var(--ds-text-tertiary)" }}>
        Um chat com o PDF
      </span>
      <span role="columnheader" style={{ ...centro, padding: "18px 0 14px", fontSize: 17, fontWeight: 600, background: TRILHO, borderRadius: "16px 16px 0 0" }}>
        NexoDoc
      </span>
      {linhas.map((l, i) => {
        const ultima = i === linhas.length - 1;
        if (l.tipo === "grupo") {
          return (
            <div key={l.texto} role="row" style={{ display: "contents" }}>
              <span style={{ gridColumn: "1 / span 2", padding: "22px 0 10px", fontSize: 22, fontWeight: 500 }}>{l.texto}</span>
              <span style={{ background: TRILHO }} />
            </div>
          );
        }
        const a = atraso + 200 + n++ * 150;
        const celula = { boxShadow: "inset 0 1px 0 var(--ds-line-subtle)", padding: "14px 0", animationDelay: `${a}ms` };
        return (
          <div key={l.rotulo} role="row" style={{ display: "contents" }}>
            <span role="cell" className="ap-entra" style={{ ...celula, fontSize: 21, color: "var(--ds-text-secondary)" }}>{l.rotulo}</span>
            <span role="cell" className="ap-entra" style={{ ...celula, ...centro }}><Marca valor={l.chat} /></span>
            <span role="cell" className="ap-entra" style={{ ...celula, ...centro, background: TRILHO, borderRadius: ultima ? "0 0 16px 16px" : undefined }}>
              <Marca valor={l.nexo} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════ folha 16: o que fica */

const ARQUIVOS = ["Parecer", "Lista de documentos", "Capa", "Volume", "ODT", "PDF", "ZIP"];
const CLAUSULAS = ["Prazo de resposta", "Vigência", "Suporte", "Encerramento"];

/* ══════════════════════════════════════════════════════════════ AS FOLHAS */

export const OBJECOES: readonly Slide[] = [
  {
    rotulo: "Por que não o ChatGPT",
    numero: "15",
    bloco: BLOCO,
    titulo: "Por que não só o ChatGPT",
    manchete: [
      { texto: "Quando o modelo melhora, ele melhora aqui dentro.", fraca: true },
      "O que vocês compram é o processo ao redor dele.",
    ],
    notas:
      "ESTA É UMA DAS DUAS OBJEÇÕES QUE MERECEM TELA. Não brigar com o ChatGPT: ele está dentro do sistema. Começar pela primeira linha da tabela, que dá o ponto ao chat — ele lê e responde. O resto da tabela é a diferença.\n\nOS DOIS GRUPOS SÃO OS DOIS ARGUMENTOS: o modelo é uma peça, não o processo (página e trecho, regras verificáveis, validação, registro por obra); e metade do trabalho não é conversa (lista, tomos, ODT, PDF e ZIP são montagem de arquivo).\n\nSE VIER 'o modelo vai melhorar e tornar isto obsoleto': melhor modelo melhora o NexoDoc por dentro. O que permanece é página, evidência, regra, validação, histórico, freios e arquivo final.\n\nSE VIER 'então me venda só as regras': regras sozinhas encontram menos e não têm a segunda passada que contesta o que não se sustenta.",
    corpo: (
      <div className="ap-grade" style={{ alignItems: "center" }}>
        <div style={{ gridColumn: "1 / span 4" }}>
          <Entra atraso={300}>
            <span className="ap-rotulo">A pergunta</span>
          </Entra>
          <Entra atraso={420} style={{ marginTop: 18 }}>
            <p
              style={{
                margin: 0,
                padding: "26px 30px 28px",
                borderRadius: "30px 30px 10px 30px",
                background: "var(--ds-surface-raised)",
                fontSize: 30,
                lineHeight: 1.4,
                letterSpacing: "-0.01em",
                textWrap: "pretty",
              }}
            >
              Por que não assinamos o ChatGPT e mandamos alguém jogar o PDF lá?
            </p>
          </Entra>
        </div>
        <div style={{ gridColumn: "6 / span 7" }}>
          <Comparacao atraso={700} />
        </div>
      </div>
    ),
  },

  {
    rotulo: "Continuidade",
    numero: "16",
    bloco: BLOCO,
    titulo: "O que não depende de confiança",
    manchete: [
      { texto: "Continuidade não é acreditar em uma pessoa.", fraca: true },
      "É saber o que fica com a empresa.",
    ],
    notas:
      "A SEGUNDA OBJEÇÃO QUE MERECE TELA É CONTINUIDADE. Responder com artefato e contrato, não com promessa pessoal.\n\nÀ ESQUERDA, OS ARQUIVOS: pertencem à PROSUL e continuam utilizáveis fora do sistema. O histórico preserva dados, linhas, tomos e eventos; os PDFs originais não são armazenados e precisam ser reenviados para reprocessar — essa limitação já foi dita na segurança.\n\nÀ DIREITA, O CONTRATO: prazo de resposta, vigência, suporte e encerramento são condições escritas — não boa vontade. Os termos de cada uma se combinam na proposta.\n\nEMBAIXO, A AUTORIA: a propriedade aparece aqui, em uma frase, antes do fechamento comercial. A custódia do código continua disponível apenas numa relação de prazo longo. Não oferecê-la por desconto.",
    corpo: (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "start" }}>
          <div>
            <Entra atraso={300}>
              <p style={{ margin: 0, fontSize: 30, fontWeight: 500, letterSpacing: "-0.02em" }}>
                Os arquivos ficam com vocês
              </p>
              <p className="ap-texto" style={{ marginTop: 6, fontSize: 21 }}>
                Utilizáveis fora do sistema, sem depender dele.
              </p>
            </Entra>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14, marginTop: 26 }}>
              {ARQUIVOS.map((a, i) => (
                <span
                  key={a}
                  className="ap-assenta"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 12,
                    gridColumn: i < 4 ? "span 3" : "span 2",
                    height: 92,
                    padding: "0 24px",
                    borderRadius: 14,
                    background: "var(--ds-p-paper)",
                    color: "var(--ds-text-on-paper)",
                    fontSize: 21,
                    fontWeight: 500,
                    boxShadow: "0 24px 40px -24px rgb(0 0 0 / 0.9)",
                    animationDelay: `${520 + i * 110}ms`,
                  }}
                >
                  {i < 4 ? <FileText size={21} strokeWidth={1.75} /> : <FileArchive size={21} strokeWidth={1.75} />}
                  {a}
                </span>
              ))}
            </div>
          </div>
          <div>
            <Entra atraso={900}>
              <p style={{ margin: 0, fontSize: 30, fontWeight: 500, letterSpacing: "-0.02em" }}>
                A operação fica no contrato
              </p>
              <p className="ap-texto" style={{ marginTop: 6, fontSize: 21 }}>
                Condições escritas, não boa vontade.
              </p>
            </Entra>
            <Papel arquivo="Contrato do piloto" atraso={1100} style={{ marginTop: 26 }}>
              {CLAUSULAS.map((c, i) => (
                <p
                  key={c}
                  className="ap-entra"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "48px 1fr",
                    margin: 0,
                    padding: "12px 0",
                    boxShadow: i ? "inset 0 1px 0 rgb(10 11 13 / 0.08)" : undefined,
                    animationDelay: `${1300 + i * 160}ms`,
                  }}
                >
                  <span style={{ fontFamily: MONO, fontSize: 15, color: "var(--ds-text-on-paper-muted)", paddingTop: 4 }}>
                    {i + 1}.
                  </span>
                  <b style={{ fontSize: 22, fontWeight: 600 }}>{c}</b>
                </p>
              ))}
            </Papel>
          </div>
        </div>
        <Entra
          atraso={2100}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            marginTop: 32,
            paddingTop: 24,
            boxShadow: "inset 0 1px 0 var(--ds-line-subtle)",
          }}
        >
          <ScrollText aria-hidden="true" size={28} strokeWidth={1.5} style={{ flex: "none", color: "var(--ds-text-tertiary)" }} />
          <p className="ap-texto" style={{ fontSize: 22 }}>
            <b style={{ fontWeight: 500, color: "var(--ds-text-primary)" }}>
              Autoria e licença não se confundem.
            </b>{" "}
            O NexoDoc é propriedade de Matheus Mendes. O piloto compra licença de
            uso e acompanhamento; custódia de código é negociação de longo prazo.
          </p>
        </Entra>
      </>
    ),
  },
];
