"use client";

import {
  FileText,
  Inbox,
  PenLine,
  ScanSearch,
  UserRoundCheck,
} from "lucide-react";
import type { ReactNode } from "react";

import type { Slide } from "../palco";
import {
  Diagrama,
  Entra,
  Fio,
  Grifo,
  Linhas,
  MONO,
  No,
  Particula,
  Selo,
} from "../pecas";
import { O_MESMO_ERRO } from "./o-mesmo-erro";

/**
 * CAPÍTULO 2 — O PROBLEMA (folhas 06 a 09). Textos e notas de 09/09/2026; a 07
 * ganhou em 14/09/2026 os trechos do 117_25 que provam cada causa. Desde
 * 02/10/2026 cada folha é manchete e peça: o processo de hoje com o buraco no
 * lugar do controle, os trechos grifados no próprio papel, a matriz das obras
 * e a conta desenhada hora a hora.
 */

const BLOCO = "O problema";

/* ═══════════════════════════════════════════ folha 06: o processo de hoje */

const Y = 180;
const ARCO = `M 630 ${Y} C 690 ${Y} 690 60 750 60 L 950 60 C 1010 60 1010 ${Y} 1070 ${Y}`;

/* ═══════════════════════════════════════════════ folha 07: os trechos */

type Trecho = {
  pagina: number;
  antes: string;
  grifo: string;
  depois: string;
  tom: "block" | "decide" | "note";
};

/**
 * TRECHOS TRANSCRITOS, com a página. Cada um foi conferido contra o texto da
 * própria página guardado com o parecer `34e41ba2` (117_25, 14/09/2026) — é a
 * frase do documento, e não a paráfrase do achado. O grifo marca o erro, na cor
 * do nível que o parecer deu àquela página.
 */
function TrechosNoPapel({
  itens,
  atraso,
}: {
  itens: readonly Trecho[];
  atraso: number;
}) {
  return (
    <div className="ap-papel ap-entra" style={{ animationDelay: `${atraso}ms` }}>
      <div className="ap-papel__cabeca">
        <span>117_25_md_geral_a.pdf</span>
        <span>{itens.length} trechos</span>
      </div>
      {itens.map((t, i) => (
        <p
          key={t.pagina}
          style={{
            display: "grid",
            gridTemplateColumns: "84px 1fr",
            alignItems: "baseline",
            margin: 0,
            padding: "12px 0",
            boxShadow: i ? "inset 0 1px 0 rgb(10 11 13 / 0.08)" : undefined,
            fontSize: 21,
            lineHeight: 1.45,
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 15,
              color: "var(--ds-text-on-paper-muted)",
            }}
          >
            p. {t.pagina}
          </span>
          <span>
            {t.antes}
            <Grifo tom={t.tom} atraso={atraso + 500 + i * 260}>
              {t.grifo}
            </Grifo>
            {t.depois}
          </span>
        </p>
      ))}
    </div>
  );
}

function Causa({
  titulo,
  texto,
  trechos,
  consequencia,
  atraso,
}: {
  titulo: string;
  texto: string;
  trechos: readonly Trecho[];
  consequencia: ReactNode;
  atraso: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <Entra atraso={atraso}>
        <p
          style={{
            margin: 0,
            fontSize: 30,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--ds-text-primary)",
          }}
        >
          {titulo}
        </p>
        <p className="ap-texto" style={{ marginTop: 8, fontSize: 21 }}>
          {texto}
        </p>
      </Entra>
      <TrechosNoPapel itens={trechos} atraso={atraso + 200} />
      <Entra atraso={atraso + 1400}>{consequencia}</Entra>
    </div>
  );
}

/** A frase que fecha cada lado: o ponto de estado do app — coral é a consequência, verde a saída. */
function Consequencia({ tom, children }: { tom: "block" | "ok"; children: string }) {
  const cor = tom === "block" ? "var(--ds-sev-block)" : "var(--ds-state-ok)";
  return (
    <p
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 14,
        margin: 0,
        fontSize: 25,
        lineHeight: 1.35,
        color: cor,
      }}
    >
      <i
        aria-hidden="true"
        style={{
          flex: "none",
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: cor,
          transform: "translateY(-3px)",
        }}
      />
      {children}
    </p>
  );
}

/* ══════════════════════════════════════════ folha 09: a conta, hora a hora */

const DIAS = 3;
const HORAS = 8;
const PESSOAS = ["Responsável 1", "Responsável 2", "Responsável 3"];

/**
 * AS 72 HORAS, uma por quadrado: três pessoas, três dias, oito horas. O dia
 * enche coluna a coluna — o tempo passando para os três ao mesmo tempo — e só
 * depois a conta é escrita. A soma está acontecendo na frente da sala.
 */
function HorasParadas({ atraso }: { atraso: number }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "190px repeat(3, 1fr)", gap: 22 }}>
        <span />
        {Array.from({ length: DIAS }, (_, d) => (
          <span
            key={d}
            className="ap-entra"
            style={{ fontSize: 17, color: "var(--ds-text-tertiary)", animationDelay: `${atraso + d * 520}ms` }}
          >
            Dia {d + 1}
          </span>
        ))}
      </div>
      {PESSOAS.map((p, pi) => (
        <div
          key={p}
          style={{
            display: "grid",
            gridTemplateColumns: "190px repeat(3, 1fr)",
            gap: 22,
            alignItems: "center",
          }}
        >
          <span
            className="ap-entra"
            style={{ fontSize: 19, color: "var(--ds-text-secondary)", animationDelay: `${atraso + pi * 80}ms` }}
          >
            {p}
          </span>
          {Array.from({ length: DIAS }, (_, d) => (
            <span key={d} style={{ display: "flex", gap: 4 }}>
              {Array.from({ length: HORAS }, (_, h) => (
                <i
                  key={h}
                  aria-hidden="true"
                  style={{
                    position: "relative",
                    flex: 1,
                    height: 30,
                    borderRadius: 5,
                    boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.07)",
                  }}
                >
                  <i
                    className="ap-acende"
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 5,
                      background: "#c9ccd4",
                      animationDelay: `${atraso + d * 520 + h * 55}ms`,
                    }}
                  />
                </i>
              ))}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

const NAO_ENTRA = [
  [
    "O desgaste com o cliente",
    "A entrega seguinte chega a uma mesa que já desconfia da anterior.",
  ],
  [
    "A posição de quem apresentou",
    "Quem levou o projeto à reunião respondeu por um erro que não era só dele.",
  ],
  [
    "A reputação que fica",
    "Dentro e fora da empresa, e por muito mais tempo do que os três dias.",
  ],
] as const;

/* ══════════════════════════════════════════════════════════════ AS FOLHAS */

export const O_PROBLEMA: readonly Slide[] = [
  {
    rotulo: "Conferência hoje",
    numero: "06",
    bloco: BLOCO,
    titulo: "Como a conferência acontece hoje",
    manchete: [
      { texto: "Isto não é um processo caro para substituir.", fraca: true },
      "É um controle que hoje não existe.",
    ],
    notas:
      "A manchete é o eixo da apresentação: ela impede que a conversa vire 'quantas horas você economiza', discussão que não interessa travar. O que se propõe é um controle que hoje não existe, não um processo mais barato.\n\nACOMPANHAR O DESENHO: o projeto passa pela autoconferência — cada projetista confere o próprio, sem tempo dedicado, uma a duas horas quando de fato acontece — e o caminho SALTA por cima do lugar tracejado. Ali deveria estar a conferência independente. O ponto chega ao cliente sem ter passado por ela.\n\nDizer cada fato quando ele aparece — e não os três de uma vez.",
    corpo: (
      <Diagrama
        largura={1680}
        altura={470}
        fios={
          <>
            <Fio d={`M 260 ${Y} L 330 ${Y}`} atraso={500} seta={{ x: 330, y: Y, dir: "direita" }} />
            <Fio d={ARCO} atraso={1100} seta={{ x: 1070, y: Y, dir: "direita" }} />
            <Fio d={`M 1330 ${Y} L 1400 ${Y}`} atraso={1700} seta={{ x: 1400, y: Y, dir: "direita" }} />
          </>
        }
      >
        <Particula d={`M 130 ${Y} L 330 ${Y} L 630 ${Y} ${ARCO.slice(ARCO.indexOf("C"))} L 1540 ${Y}`} atraso={2400} duracao={2600} tom="block" />
        <No x={0} y={Y - 60} largura={260} altura={120} atraso={300}
          icone={<PenLine size={22} strokeWidth={1.75} />} titulo="Projeto e memorial"
          texto="quem projeta escreve" />
        <No x={330} y={Y - 60} largura={300} altura={120} atraso={600}
          icone={<UserRoundCheck size={22} strokeWidth={1.75} />} titulo="Autoconferência"
          texto="cada projetista confere o próprio projeto" />
        <No x={700} y={Y - 60} largura={300} altura={120} atraso={1300} variante="vazio"
          icone={<ScanSearch size={22} strokeWidth={1.75} />} titulo="Conferência independente"
          texto="não existe hoje" />
        <No x={1070} y={Y - 60} largura={260} altura={120} atraso={1600}
          icone={<FileText size={22} strokeWidth={1.75} />} titulo="Entrega ao cliente" />
        <No x={1400} y={Y - 60} largura={280} altura={120} atraso={1900}
          icone={<Inbox size={22} strokeWidth={1.75} />} titulo="O cliente lê"
          texto="a primeira revisão de verdade" />

        <Entra atraso={900} style={{ position: "absolute", left: 330, top: 290, width: 330 }}>
          <span style={{ display: "block", fontSize: 64, fontWeight: 400, letterSpacing: "-0.045em", lineHeight: 1 }}>
            1 a 2 h
          </span>
          <span className="ap-texto" style={{ display: "block", marginTop: 12, fontSize: 20, color: "var(--ds-text-tertiary)" }}>
            quando de fato acontece — sem tempo dedicado, a conferência disputa
            espaço com a entrega
          </span>
        </Entra>
        <Entra atraso={1500} style={{ position: "absolute", left: 700, top: 300, width: 300 }}>
          <span style={{ fontSize: 22, color: "var(--ds-sev-block)" }}>
            o controle que falta
          </span>
        </Entra>
        <Entra atraso={2100} style={{ position: "absolute", left: 1400, top: 300, width: 280 }}>
          <span style={{ fontSize: 20, color: "var(--ds-text-tertiary)" }}>
            quando o erro aparece, quem revisa é quem contratou
          </span>
        </Entra>
      </Diagrama>
    ),
  },

  {
    rotulo: "Por que escapa",
    numero: "07",
    bloco: BLOCO,
    titulo: "Por que escapa",
    manchete: [
      "Quem escreveu relê o que quis dizer,",
      { texto: "e o modelo-padrão leva o defeito a todos os projetos.", fraca: true },
    ],
    notas:
      "A primeira causa desarma qualquer leitura de incompetência — e é importante dizê-la assim, porque quem está na sala assina esses projetos. A segunda mostra que o problema é do processo, não das pessoas.\n\nOS TRECHOS SÃO DO 117_25, A MESMA CORRIDA DA FOLHA 05, e cada um foi conferido contra o texto da página. O grifo é o erro, na cor do nível que o parecer deu. À esquerda, o que quem escreveu leu como queria: 'USB' no lugar de UBS, a seção de um cabo em metros quadrados, 'ambulânciua'. À direita, o que veio de outra obra e ninguém tirou: outro bairro, outra prefeitura, um shopping — num memorial de UBS em Criciúma. Ler UM de cada lado, não os seis.\n\nNÃO DIZER DE QUAL PROJETO veio o texto reaproveitado. O documento não diz, e o deck não sabe.\n\nAs duas frases coloridas chegam por último, uma de cada lado: a vermelha é a consequência, a verde é a saída. Não ler as duas emendadas.",
    corpo: (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56 }}>
        <Causa
          atraso={420}
          titulo="Lido como se queria"
          texto="Não é falta de competência: é como a leitura funciona. Na prática, a primeira revisão de verdade só acontece quando o projeto já está na mão do cliente."
          trechos={[
            { pagina: 29, antes: "Projeto de Engenharia para a ", grifo: "USB", depois: " Vila Manaus (117-25)", tom: "decide" },
            { pagina: 113, antes: "Ramal de ligação aéreo: Alumínio multiplexado de ", grifo: "# 35m²", depois: "", tom: "block" },
            { pagina: 38, antes: "estacionamento com vagas (", grifo: "ambulânciua", depois: ", PCD e idoso)", tom: "note" },
          ]}
          consequencia={
            <Consequencia tom="block">
              Quando isso acontece, quem revisa é quem contratou.
            </Consequencia>
          }
        />
        <Causa
          atraso={760}
          titulo="Texto de outra obra"
          texto="O texto-base é reaproveitado de um projeto para o outro. Um erro nele não erra um projeto: erra todos, até que alguém finalmente o encontre."
          trechos={[
            { pagina: 14, antes: "…construção da Unidade Básica de Saúde Bairro ", grifo: "Vila Francesa", depois: "", tom: "block" },
            { pagina: 99, antes: "Proprietário: ", grifo: "Prefeitura Municipal de Chapecó", depois: ";", tom: "block" },
            { pagina: 211, antes: "Por exigência do ", grifo: "Shopping", depois: ", todos os sistemas que atendem a loja…", tom: "block" },
          ]}
          consequencia={
            <Consequencia tom="ok">
              Achado uma vez, corrigido uma vez, resolvido em todos.
            </Consequencia>
          }
        />
      </div>
    ),
  },

  // Folha 08: a prova, em cinco obras, do que a 07 afirma. Mora no próprio arquivo.
  { ...O_MESMO_ERRO, bloco: BLOCO },

  {
    rotulo: "A conta",
    numero: "09",
    bloco: BLOCO,
    titulo: "O que um erro desses custa",
    manchete: [
      { texto: "Três pessoas paradas por três dias:", fraca: true },
      "a conta das horas é só o começo.",
    ],
    notas:
      "É AQUI que o episódio é narrado: projeto devolvido, procuradoria acionada, três responsáveis parados três dias. Contar ANTES de avançar — o quadro enche dia a dia, e cada fator é uma frase da história: três pessoas, três dias, oito horas. Só depois o total.\n\nA palavra estimativa fica visível na tela. DE ONDE SAI A FAIXA (atualizada em 28/09/2026): é o custo da hora para a empresa, salário mais encargos. Ponta de baixo: salário médio de engenheiro civil em SC, R$ 7.340,80 por 38 h semanais (salario.com.br), cerca de R$ 44 por hora, com 53% de encargos (SINAPI, mensalista SC com desoneração) — R$ 70. Ponta de cima: piso legal da engenharia, 8,5 salários mínimos, R$ 14.589 por 220 h (Lei 4.950-A/66, mínimo de R$ 1.621), cerca de R$ 66 por hora, com 70% de encargos — R$ 110. 72 horas × R$ 70 = R$ 5.040; × R$ 110 = R$ 7.920. Se perguntarem, é conta de custo, não de honorário: um projetista sênior custa mais que isso.\n\nA coluna da direita chega por último e é o que fecha o slide: ler devagar e não insistir.",
    corpo: (
      <div className="ap-grade" style={{ alignItems: "stretch" }}>
        <div style={{ gridColumn: "1 / span 7", display: "flex", flexDirection: "column", gap: 28 }}>
          <HorasParadas atraso={500} />
          <Entra atraso={2300}>
            <p style={{ margin: 0, fontSize: 30, letterSpacing: "-0.02em", color: "var(--ds-text-secondary)", fontVariantNumeric: "tabular-nums" }}>
              3 responsáveis × 3 dias × 8 horas ={" "}
              <b style={{ fontWeight: 500, color: "var(--ds-text-primary)" }}>72 horas</b>
            </p>
            <p className="ap-texto" style={{ marginTop: 8, fontSize: 22 }}>
              × hora de engenheiro ou arquiteto{" "}
              <span className="ap-premissa">(estimativa: R$ 70 a R$ 110)</span>
            </p>
          </Entra>
          <div className="ap-painel ap-entra" style={{ padding: "26px 34px 30px", animationDelay: "2700ms" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span className="ap-rotulo">Só de horas paradas</span>
              <Selo tom="decide">estimativa</Selo>
            </div>
            <div style={{ fontSize: 80, fontWeight: 400, letterSpacing: "-0.045em", lineHeight: 1, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
              <Linhas linhas={["R$ 5.040 a R$ 7.920"]} atraso={2850} />
            </div>
          </div>
        </div>
        <div style={{ gridColumn: "9 / span 4", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <Entra atraso={3500}>
            <Selo tom="block">O que não entra nessa conta</Selo>
          </Entra>
          <ul style={{ margin: "20px 0 0", padding: 0, listStyle: "none" }}>
            {NAO_ENTRA.map(([t, x], i) => (
              <li
                key={t}
                className="ap-entra"
                style={{ padding: "20px 0", boxShadow: "inset 0 1px 0 var(--ds-line-subtle)", animationDelay: `${3700 + i * 200}ms` }}
              >
                <p style={{ margin: 0, fontSize: 26, fontWeight: 500, letterSpacing: "-0.012em" }}>{t}</p>
                <p className="ap-texto" style={{ marginTop: 6, fontSize: 21 }}>{x}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    ),
  },
];
