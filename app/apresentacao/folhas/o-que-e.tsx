"use client";

import { FileText } from "lucide-react";
import type { CSSProperties } from "react";

import { Orbe } from "@/components/ds/basicos";
import { AgentOrb } from "@/modules/nexo/components/agent-orb/AgentOrb";

import type { Slide } from "../palco";
import {
  Contador,
  Entra,
  EscalaHorizontal,
  Linhas,
  MONO,
  Mostrador,
  Selo,
} from "../pecas";

/**
 * BLOCO 1 — O QUE É (folhas 01 a 05). Texto e notas são os de 09/09/2026; o que
 * este arquivo decide é a composição. Desde 02/10/2026 ela é a do sistema novo:
 * o orbe violeta, os painéis do app, os passos com anel, a peça de arquivo da
 * conversa, o mapa das páginas e os níveis em faixa do Resultado.
 */

/** A largura do conteúdo: 1920 − 224 (trilho + margem) − 80. */
export const LARGURA_UTIL = 1616;

/* ─────────────────────────────────────────────── o motor: colchete e ramos */

/**
 * METADE DO COLCHETE que sai do motor: a aresta horizontal até o ramo, mais o
 * pedaço de espinha que alcança a outra metade. Cada metade acompanha o
 * próprio ramo, e a aresta nasce no centro dele por construção.
 *
 * A espinha invade a lacuna entre as metades (`-16px`) para as duas se
 * encontrarem no meio — sem isso a linha ficaria partida no vão.
 */
function MetadeDoColchete({
  paraBaixo,
  atraso,
}: {
  paraBaixo: boolean;
  atraso: number;
}) {
  const cor = "var(--ds-line-strong)";
  return (
    <div aria-hidden="true" style={{ flex: 1, position: "relative" }}>
      <div
        className="ap-risca"
        style={{
          animationDelay: `${atraso}ms`,
          position: "absolute",
          left: 0,
          top: "50%",
          width: "100%",
          height: 1,
          background: cor,
        }}
      />
      <div
        className="ap-desce"
        style={{
          animationDelay: `${atraso - 80}ms`,
          position: "absolute",
          left: 0,
          top: paraBaixo ? "50%" : -16,
          bottom: paraBaixo ? -16 : "50%",
          width: 1,
          background: cor,
        }}
      />
    </div>
  );
}

/**
 * Um ramo do motor, como um painel do app: o título, as etapas como passos
 * numerados num fio, e a saída como a PEÇA DE ARQUIVO da conversa — o papel
 * claro que o Nexo entrega. O documento atravessa o fio uma vez, em violeta:
 * é o único lugar da folha em que o Nexo está trabalhando.
 */
function Ramo({
  titulo,
  passos,
  saida,
  atrasoBase,
}: {
  titulo: string;
  passos: readonly string[];
  saida: string;
  atrasoBase: number;
}) {
  const colunas = passos.length + 1;
  /* O fio vai do centro do primeiro anel ao centro da coluna da saída. */
  const meiaColuna = `calc((100% - ${(colunas - 1) * 28}px) / ${colunas * 2})`;
  return (
    <div
      className="ap-painel ap-surge"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 26,
        padding: "28px 36px 32px",
        animationDelay: `${atrasoBase}ms`,
      }}
    >
      <Entra atraso={atrasoBase + 80}>
        <span
          style={{
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: "-0.015em",
            color: "var(--ds-text-primary)",
          }}
        >
          {titulo}
        </span>
      </Entra>
      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))`,
          gap: 28,
        }}
      >
        <span
          aria-hidden="true"
          className="ap-risca"
          style={{
            position: "absolute",
            top: 18,
            left: 18,
            right: meiaColuna,
            height: 1,
            background: "var(--ds-line-default)",
            animationDelay: `${atrasoBase + 200}ms`,
          }}
        />
        {/*
          O DOCUMENTO ATRAVESSA O RAMO. O viajante tem a largura do fio e anda
          a própria largura: o ponto, preso na borda esquerda dele, sai do
          primeiro anel e chega à saída sem número mágico de percurso.
        */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 13,
            left: 13,
            right: meiaColuna,
            height: 10,
            pointerEvents: "none",
          }}
        >
          <span
            className="ap-viaja"
            style={{
              position: "absolute",
              inset: 0,
              animationDelay: `${atrasoBase + 320 + colunas * 160 + 600}ms`,
            }}
          >
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "var(--ds-nexo)",
                boxShadow:
                  "0 0 0 4px color-mix(in srgb, var(--ds-nexo) 22%, transparent)",
              }}
            />
          </span>
        </span>
        {passos.map((p, i) => (
          <Entra
            key={p}
            atraso={atrasoBase + 320 + i * 160}
            style={{ position: "relative", minWidth: 0 }}
          >
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--ds-surface-card)",
                boxShadow: "inset 0 0 0 1px var(--ds-line-strong)",
                fontFamily: MONO,
                fontSize: 15,
                color: "var(--ds-text-secondary)",
              }}
            >
              {i + 1}
            </span>
            <p
              style={{
                margin: "16px 0 0",
                fontSize: 22,
                lineHeight: 1.35,
                color: "var(--ds-text-secondary)",
                textWrap: "pretty",
              }}
            >
              {p}
            </p>
          </Entra>
        ))}
        <Entra
          atraso={atrasoBase + 320 + passos.length * 160}
          style={{ position: "relative", minWidth: 0 }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "14px 18px 16px",
              borderRadius: 16,
              background: "var(--ds-action-bg)",
              color: "var(--ds-action-fg)",
              fontSize: 21,
              fontWeight: 500,
              lineHeight: 1.3,
            }}
          >
            <FileText
              aria-hidden="true"
              size={22}
              strokeWidth={1.75}
              style={{ flex: "none", marginTop: 2 }}
            />
            {saida}
          </span>
        </Entra>
      </div>
    </div>
  );
}

/* ──────────────────────────────── o memorial lido, página a página (folha 05) */

/**
 * AS PÁGINAS COM ACHADO DE UMA EXECUÇÃO REAL — o parecer `34e41ba2` do
 * `117_25_md_geral_a` (memorial geral da UBS Vila Manaus, 218 páginas), leitura
 * profunda, gravado no banco em 14/09/2026 com 56 achados. É a MÉTRICA do deck
 * inteiro: os mostradores desta folha, os trechos da 07, a pergunta da 14 e o
 * custo por execução do anexo saem da mesma corrida.
 *
 * Página e gravidade, lidas de lá; nada inventado. Achado citado em faixa de
 * páginas ("159-200") acende o início e o fim, não o miolo — acender 41 páginas
 * por um achado de memória de cálculo diria que há 41 problemas. Onde duas
 * gravidades caem na mesma página, vale a maior.
 *
 * O MAPA É O PARECER COMO ELE SAIU, contestações incluídas: p. 1 e p. 215 são
 * regras que a validação contestou (o nome citado era o certo). Tirá-las daqui
 * faria o mapa discordar do "56" ao lado. Os exemplos das folhas não as usam.
 *
 * As cores são as dos níveis do sistema novo: coral impede emitir, âmbar pede
 * decisão técnica, ardósia é revisão — as mesmas do Resultado da auditoria.
 */
type Gravidade = "critico" | "tecnico" | "editorial";

const PAGINAS_POR_GRAVIDADE: Record<Gravidade, readonly number[]> = {
  critico: [1, 14, 25, 92, 99, 113, 115, 159, 200, 211, 215, 217],
  tecnico: [
    12, 15, 17, 21, 26, 29, 30, 31, 35, 39, 47, 57, 60, 66, 72, 74, 81, 83, 85,
    95, 100, 101, 103, 105, 107, 109, 110, 120, 121, 150, 160, 195, 201, 202,
    203,
  ],
  editorial: [13, 38, 42, 43, 46, 62, 63, 64, 128, 206],
};

const PAGINAS_COM_ACHADO = new Map<number, Gravidade>(
  (
    Object.entries(PAGINAS_POR_GRAVIDADE) as [Gravidade, readonly number[]][]
  ).flatMap(([gravidade, paginas]) =>
    paginas.map((p) => [p, gravidade] as const),
  ),
);

/** Os 56 do parecer, pela gravidade que o próprio parecer atribuiu. */
const ACHADOS_POR_GRAVIDADE: ReadonlyArray<
  readonly [Gravidade, number, string, string]
> = [
  ["critico", 11, "Impedem emitir", "corrigir antes de entregar"],
  ["tecnico", 32, "Técnicos ou contratuais", "pedem decisão de quem projeta"],
  ["editorial", 13, "Editoriais", "redação, grafia, referência"],
];

const COR_DA_GRAVIDADE: Record<Gravidade, string> = {
  critico: "var(--ds-sev-block)",
  tecnico: "var(--ds-sev-decide)",
  editorial: "var(--ds-sev-note)",
};

/** O mapa tem 37 colunas: 6 linhas de 37 cobrem as 218 páginas. */
const COLUNAS_DO_MAPA = 37;
/** A página do exemplar — a do achado aberto ao lado. */
const PAGINA_DO_EXEMPLAR = 25;

/**
 * O MAPA DAS PÁGINAS, como o Resultado o desenha: um quadrado por página, na
 * ordem de leitura. A leitura acende linha a linha; página lida e limpa fica
 * num cinza quieto, página com achado fica na cor do nível. A página do
 * exemplar ganha um anel quando o achado aberto chega — é o fio entre os dois.
 */
function MapaDasPaginas({
  paginas,
  atraso,
  duracao,
  anelEm,
}: {
  paginas: number;
  atraso: number;
  duracao: number;
  anelEm: number;
}) {
  const passo = duracao / paginas;
  return (
    <div
      aria-hidden="true"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${COLUNAS_DO_MAPA}, 1fr)`,
        gap: 5,
      }}
    >
      {Array.from({ length: paginas }, (_, i) => {
        const n = i + 1;
        const gravidade = PAGINAS_COM_ACHADO.get(n);
        return (
          <span
            key={n}
            style={{
              position: "relative",
              aspectRatio: "1",
              borderRadius: 4,
              boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.06)",
            }}
          >
            <span
              className="ap-acende"
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 4,
                background: gravidade
                  ? COR_DA_GRAVIDADE[gravidade]
                  : "rgb(255 255 255 / 0.09)",
                animationDelay: `${atraso + i * passo}ms`,
              }}
            />
            {n === PAGINA_DO_EXEMPLAR ? (
              <span
                className="ap-surge"
                style={{
                  position: "absolute",
                  inset: -5,
                  borderRadius: 7,
                  boxShadow: "inset 0 0 0 2px var(--ds-text-primary)",
                  animationDelay: `${anelEm}ms`,
                }}
              />
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

/**
 * OS NÍVEIS EM FAIXA, do Resumo do Resultado: uma faixa só, dividida pelo peso
 * de cada nível, e embaixo uma linha por nível com uma pílula por achado e a
 * contagem. Escrito aqui na escala do palco, com as mesmas regras.
 */
function NiveisEmFaixa({ atraso }: { atraso: number }) {
  const total = ACHADOS_POR_GRAVIDADE.reduce((s, [, n]) => s + n, 0);
  return (
    <div>
      <div style={{ display: "flex", gap: 5, height: 12 }}>
        {ACHADOS_POR_GRAVIDADE.map(([g, n], i) => (
          <span
            key={g}
            className="ap-risca"
            style={{
              flexGrow: n,
              flexBasis: 0,
              borderRadius: 999,
              background: COR_DA_GRAVIDADE[g],
              animationDelay: `${atraso + i * 120}ms`,
            }}
          />
        ))}
      </div>
      <ul style={{ margin: "18px 0 0", padding: 0, listStyle: "none" }}>
        {ACHADOS_POR_GRAVIDADE.map(([g, n, rotulo, dica], gi) => (
          <li
            key={g}
            className="ap-surge"
            style={{
              display: "grid",
              gridTemplateColumns: "5px minmax(0, 1fr) auto 92px",
              alignItems: "center",
              gap: 20,
              padding: "14px 0",
              boxShadow: "inset 0 1px 0 var(--ds-line-subtle)",
              animationDelay: `${atraso + 200 + gi * 140}ms`,
            }}
          >
            <i
              style={{
                alignSelf: "stretch",
                borderRadius: 999,
                background: COR_DA_GRAVIDADE[g],
              }}
            />
            <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
              <b
                style={{
                  fontSize: 22,
                  fontWeight: 500,
                  color: "var(--ds-text-primary)",
                }}
              >
                {rotulo}
              </b>
              <small style={{ fontSize: 17, color: "var(--ds-text-tertiary)" }}>
                {dica}
              </small>
            </span>
            <span
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
                maxWidth: 340,
                justifyContent: "flex-end",
              }}
            >
              {Array.from({ length: n }, (_, i) => (
                <i
                  key={i}
                  className="ap-acende"
                  style={{
                    width: 6,
                    height: 20,
                    borderRadius: 999,
                    background: COR_DA_GRAVIDADE[g],
                    animationDelay: `${atraso + 320 + gi * 140 + i * 18}ms`,
                  }}
                />
              ))}
            </span>
            <span
              style={{
                display: "grid",
                justifyItems: "end",
                lineHeight: 1.05,
              }}
            >
              <b
                style={{
                  fontSize: 32,
                  fontWeight: 400,
                  letterSpacing: "-0.03em",
                  color: "var(--ds-text-primary)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {n}
              </b>
              <small
                style={{
                  fontSize: 15,
                  color: "var(--ds-text-tertiary)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {Math.round((n / total) * 100)}%
              </small>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Uma linha que não é transcrição: a página em volta do trecho, sem inventar palavra. */
function LinhaDaPagina({ largura }: { largura: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "block",
        width: largura,
        height: 9,
        margin: "9px 0",
        borderRadius: 999,
        background: "rgb(10 11 13 / 0.1)",
      }}
    />
  );
}

/**
 * UM ACHADO ABERTO, como a Fila o mostra: o nível, o título, e o trecho
 * GRIFADO no próprio memorial — o "Ver no memorial" do Resultado, com a página
 * em papel claro. Em volta do trecho, a página aparece como linhas cinzas: o
 * deck só transcreve o que conferiu, e o resto da página não foi conferido.
 */
function AchadoAberto({
  tipo,
  antes,
  grifo,
  depois,
  arquivo,
  pagina,
  atraso,
  style,
}: {
  tipo: string;
  antes: string;
  grifo: string;
  depois: string;
  arquivo: string;
  pagina: number;
  atraso: number;
  style?: CSSProperties;
}) {
  return (
    <div
      className="ap-painel ap-entra"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        padding: "28px 32px 32px",
        animationDelay: `${atraso}ms`,
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Selo tom="block">Impede emitir</Selo>
        <span className="ap-codigo" style={{ fontSize: 18 }}>
          p. {pagina}
        </span>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 30,
          fontWeight: 500,
          lineHeight: 1.2,
          letterSpacing: "-0.018em",
          color: "var(--ds-text-primary)",
          textWrap: "pretty",
        }}
      >
        {tipo}
      </p>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          padding: "20px 26px 22px",
          borderRadius: 14,
          background: "var(--ds-p-paper)",
          color: "var(--ds-text-on-paper)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingBottom: 12,
            marginBottom: 6,
            boxShadow: "inset 0 -1px 0 rgb(10 11 13 / 0.12)",
            fontFamily: MONO,
            fontSize: 14,
            color: "var(--ds-text-on-paper-muted)",
          }}
        >
          <span>{arquivo}</span>
          <span>p. {pagina}</span>
        </div>
        <LinhaDaPagina largura="92%" />
        <LinhaDaPagina largura="78%" />
        <p
          style={{
            margin: "12px 0",
            fontSize: 22,
            lineHeight: 1.55,
            textWrap: "pretty",
          }}
        >
          {antes}
          <mark
            style={{
              padding: "1px 3px",
              borderRadius: 4,
              background: "rgb(255 125 110 / 0.24)",
              boxShadow: "inset 0 -2px 0 var(--ds-sev-block)",
              color: "inherit",
            }}
          >
            {grifo}
          </mark>
          {depois}
        </p>
        {["86%", "94%", "71%", "90%", "82%", "58%"].map((l, i) => (
          <LinhaDaPagina key={`${i}-${l}`} largura={l} />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ AS FOLHAS */

export const O_QUE_E: readonly Slide[] = [
  {
    rotulo: "Capa",
    numero: "01",
    notas:
      "Abrir sem preâmbulo. Deixar o orbe respirar dois segundos antes de falar — ele é o produto se apresentando sozinho. Nome, o que é, quem fez. Não explicar a capa.",
    corpo: (
      <>
        {/*
          A CAPA nasce na grade, e não no centro. O orbe ocupa as colunas 1 a 5;
          o nome e a linha, da 6 em diante. O rodapé fica sobre o fio — o único
          fio da capa.

          O ORBE VIVO, o mesmo da porta do Nexo: violeta para coral, com a
          respiração aprovada em 01/10. É o único elemento do sistema que se
          move sozinho. SEM `transform: scale()`: o canvas mede a si mesmo para
          dimensionar o buffer do WebGL e a medição enxerga a caixa JÁ
          TRANSFORMADA — aparecia cortado. `hero` é o tamanho para o qual o
          componente foi ajustado.
        */}
        <div
          className="ap-grade"
          style={{ flex: 1, alignItems: "center", paddingBottom: 40 }}
        >
          <div
            className="ap-surge"
            style={{
              gridColumn: "1 / span 5",
              position: "relative",
              display: "grid",
              placeItems: "center",
              height: 420,
            }}
          >
            {/* Atmosfera parada, na cor do aro: profundidade sem competir com o orbe. */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, color-mix(in srgb, var(--ds-nexo) 16%, transparent), transparent 64%)",
                filter: "blur(32px)",
              }}
            />
            <div style={{ position: "relative" }}>
              <AgentOrb size="hero" state="idle" />
            </div>
          </div>
          <div style={{ gridColumn: "6 / span 7" }}>
            <h1
              style={{
                margin: 0,
                fontSize: 136,
                fontWeight: 500,
                letterSpacing: "-0.05em",
                lineHeight: 1,
                color: "var(--ds-text-primary)",
              }}
            >
              <Linhas linhas={["NexoDoc"]} atraso={260} />
            </h1>
            <p
              style={{
                margin: "32px 0 0",
                fontSize: 44,
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
                color: "var(--ds-text-secondary)",
              }}
            >
              <Linhas
                linhas={[
                  "Conferência e montagem documental",
                  "para projetos de engenharia",
                ]}
                atraso={520}
                passo={90}
              />
            </p>
          </div>
        </div>
        <Entra
          atraso={620}
          style={{
            flex: "none",
            paddingTop: 28,
            boxShadow: "inset 0 1px 0 var(--ds-line-subtle)",
            display: "flex",
            gap: 20,
            fontFamily: MONO,
            fontSize: 19,
            color: "var(--ds-text-tertiary)",
          }}
        >
          <span>Apresentação de software</span>
          <span>·</span>
          <span>2026</span>
          <span>·</span>
          <span className="ap-neon" data-texto="Coded by M">
            Coded by M
          </span>
        </Entra>
      </>
    ),
  },

  {
    rotulo: "O que é",
    numero: "02",
    bloco: "O que é",
    titulo: "O que é",
    notas:
      "Ler a frase central devagar. Os dois verbos embaixo são os dois caminhos da próxima folha, na mesma ordem: primeiro confere, depois monta.",
    corpo: (
      <>
        {/*
          SÓ O QUE ELE É. A frase ocupa a largura inteira, em duas linhas, e o
          que ela promete desce para uma régua de dois fatos — confere e monta,
          na ordem dos dois ramos da folha 03, para a próxima folha ler como
          ampliação desta e não como assunto novo.
        */}
        <p
          style={{
            margin: "48px 0 0",
            fontSize: 76,
            fontWeight: 500,
            letterSpacing: "-0.035em",
            lineHeight: 1.08,
            color: "var(--ds-text-primary)",
          }}
        >
          <Linhas
            linhas={[
              "Um sistema para organizar",
              "e documentar projetos de engenharia.",
            ]}
            atraso={80}
          />
        </p>
        <EscalaHorizontal
          atraso={420}
          style={{ marginTop: 112 }}
          fatos={[
            {
              titulo: ["Confere"],
              texto:
                "Lê o que já está escrito nos memoriais e aponta o que não fecha.",
            },
            {
              titulo: ["Monta"],
              texto:
                "Os documentos que acompanham o projeto: listas de documentos, capas e volumes.",
            },
          ]}
        />
      </>
    ),
  },

  {
    rotulo: "O motor",
    numero: "03",
    bloco: "O que é",
    titulo: "Um motor, dois caminhos",
    subtitulo:
      "O documento entra, o sistema lê, e o caminho se decide pelo que ele é.",
    notas:
      "Acompanhar os passos conforme aparecem, um ramo de cada vez. O ponto que vale repetir: os dois caminhos saem do MESMO motor — é o mesmo sistema lendo o mesmo tipo de documento, e por isso o que ele aprende de um lado serve do outro.",
    corpo: (
      <>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "stretch",
            paddingTop: 8,
            paddingBottom: 28,
          }}
        >
          <div
            className="ap-surge"
            style={{
              flex: "none",
              width: 168,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: 18,
              animationDelay: "160ms",
            }}
          >
            <Orbe tamanho={104} />
            <span className="ap-mono-rotulo" style={{ textAlign: "center" }}>
              O motor
            </span>
          </div>
          <div
            style={{
              flex: "none",
              width: 48,
              display: "flex",
              flexDirection: "column",
              gap: 32,
              alignSelf: "stretch",
            }}
          >
            <MetadeDoColchete paraBaixo atraso={300} />
            <MetadeDoColchete paraBaixo={false} atraso={1100} />
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 32,
            }}
          >
            <Ramo
              titulo="Memorial descritivo → conferência"
              atrasoBase={300}
              passos={[
                "Extrai o texto e mapeia cada página",
                "Aplica as regras determinísticas",
                "Lê o documento com o modelo de IA",
                "Valida cada achado e descarta o que não se sustenta",
              ]}
              saida="Parecer com página e transcrição"
            />
            <Ramo
              titulo="Pranchas e projeto → montagem"
              atrasoBase={1100}
              passos={[
                "Lê os selos das pranchas",
                "Reconhece a identidade do projeto",
                "Acusa folha faltante e duplicada",
                "Monta a lista, a capa e os volumes",
              ]}
              saida="ODT, PDF e ZIP prontos"
            />
          </div>
        </div>
        <Entra
          atraso={2000}
          style={{
            flex: "none",
            paddingTop: 22,
            boxShadow: "inset 0 1px 0 var(--ds-line-subtle)",
          }}
        >
          <p className="ap-fonte" style={{ margin: 0, maxWidth: "110ch" }}>
            Regra determinística é conta e comparação: não inventa, e a IA não
            pode apagá-la. A IA lê o que regra nenhuma alcança. A validação é a
            etapa que remove o achado sem sustentação.
          </p>
        </Entra>
      </>
    ),
  },

  {
    rotulo: "Ele revisa a si mesmo",
    numero: "04",
    bloco: "O que é",
    titulo: "Ele revisa a si mesmo",
    notas:
      "Este slide responde antes da pergunta 'e se ele inventar?'. O caso real, para narrar: uma regra minha acusava marca fechada; a validação leu o documento inteiro e achou, quarenta páginas adiante, a cláusula que derrubava a acusação. Eu tinha lido aquelas ocorrências uma a uma e não vi.",
    corpo: (
      <>
        <Entra atraso={100}>
          <p
            className="ap-texto"
            style={{ fontSize: 34, lineHeight: 1.35, maxWidth: "70ch" }}
          >
            A primeira leitura levanta. A segunda existe para derrubar o que a
            primeira afirmou sem sustentação.
          </p>
        </Entra>
        <EscalaHorizontal
          atraso={400}
          style={{ marginTop: 64 }}
          fatos={[
            {
              titulo: ["Cada achado volta", "ao documento"],
              texto:
                "Uma segunda passada relê o texto procurando o que contradiz o que foi apontado. O que não se sustenta é descartado antes de chegar à sua tela.",
            },
            {
              titulo: ["Ele contesta", "as minhas regras"],
              texto:
                "Quando a validação discorda de uma regra do sistema, a discordância fica registrada. A mesma regra contestada várias vezes pelo mesmo motivo é defeito meu — e vira correção.",
            },
            {
              titulo: ["E aprende com", "o próprio erro"],
              texto:
                "Falso positivo e gravidade errada viram caso de teste. Foi assim que uma regra inteira foi aposentada por estar errada, e o total de achados do acervo caiu quase pela metade.",
            },
          ]}
        />
      </>
    ),
  },

  {
    rotulo: "O resultado",
    numero: "05",
    bloco: "O que é",
    titulo: "Um memorial inteiro, conferido",
    subtitulo: "117_25_md_geral_a.pdf — memorial geral de uma UBS",
    notas:
      "É A DEMONSTRAÇÃO. O mapa é o memorial página a página, como o Resultado da auditoria o desenha; a leitura passa, e onde há achado a página fica na cor do nível. Deixar o mapa terminar antes de falar: são dois segundos e meio, e a sala acompanha sozinha.\n\nTUDO NESTA FOLHA É UMA CORRIDA SÓ: o 117_25 em leitura profunda, gravado no banco em 14/09/2026. 218 páginas, 56 achados, 5,4 minutos, US$ 1,61 somados do registro de uso (leitura, validação e as 14 páginas sem texto que precisaram ser transcritas). Se perguntarem por que a corrida de agosto deu 28: aquela foi no nível padrão, com outro modelo — não é a mesma leitura, e não serve de comparação.\n\nOS NÍVEIS SÃO O PARECER, SEM ARREDONDAR: 11 impedem emitir, 32 são técnicos ou contratuais, 13 editoriais. Ler só o 11.\n\nO ACHADO ABERTO É O QUE A SALA VAI VER NO PRODUTO: o trecho grifado na própria página. Ler o trecho em voz alta: um memorial da UBS Vila Manaus, na Rua São Francisco de Assis, mandando fazer a limpeza e a microdrenagem de outras ruas — Rua Bento Goiá e Av. Engenheiro Max de Souza —, na página 25. As linhas cinzas em volta são a página, não texto: o deck só transcreve o que conferiu. Não dizer de onde são essas ruas: o documento não diz. Na mesma corrida ele achou outra prefeitura como proprietária (Chapecó, p. 99) e a exigência de um shopping numa UBS (p. 211) — guardar esses dois para a folha 07, que os mostra.\n\nLer os números sem adjetivo — eles não precisam de ajuda.",
    corpo: (
      <>
        {/*
          A ORDEM DO TEMPO É A ORDEM DO ARGUMENTO. As páginas contam junto com o
          mapa (a leitura está acontecendo), o 56 assenta quando a leitura
          termina, e só então o custo e o tempo entram — baixos, depois do
          tamanho do trabalho. O achado aberto é o último a chegar: primeiro o
          todo, depois um exemplar.

          O ACHADO EM DESTAQUE ERA O DA p. 92 (UBS Paraíso, no capítulo de
          estrutura). Trocado em 28/09/2026: quem apresenta é da equipe de
          estrutura, e o exemplar da demonstração não pode ser da própria
          disciplina. O da p. 25 é crítico, da mesma corrida, e não aparece em
          nenhuma outra folha. Sem disciplina no parecer, sai sem sigla.
        */}
        <div
          className="ap-regua-num ap-surge"
          style={{ animationDelay: "200ms" }}
        >
          <Mostrador
            rotuloDo="páginas"
            atraso={520}
            valor={<Contador ate={218} atraso={520} duracao={2300} />}
          />
          <Mostrador
            rotuloDo="achados"
            atraso={2700}
            valor={<Contador ate={56} atraso={2700} duracao={720} />}
          />
          <Mostrador rotuloDo="tempo de leitura" atraso={3200} valor="5,4 min" />
          <Mostrador
            rotuloDo="custo da execução"
            atraso={3340}
            valor="US$ 1,61"
          />
        </div>

        <div
          className="ap-grade"
          style={{
            flex: 1,
            minHeight: 0,
            marginTop: 24,
            alignItems: "stretch",
          }}
        >
          <div
            className="ap-painel ap-surge"
            style={{
              gridColumn: "1 / span 7",
              display: "flex",
              flexDirection: "column",
              gap: 22,
              padding: "26px 34px 28px",
              animationDelay: "320ms",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <span
                className="ap-mono-rotulo"
                style={{ color: "var(--ds-text-primary)" }}
              >
                Páginas do memorial
              </span>
              <span style={{ fontSize: 17, color: "var(--ds-text-tertiary)" }}>
                um quadrado por página, na ordem de leitura
              </span>
            </div>
            <MapaDasPaginas
              paginas={218}
              atraso={520}
              duracao={2300}
              anelEm={3950}
            />
            <div style={{ marginTop: "auto" }}>
              <NiveisEmFaixa atraso={2900} />
            </div>
          </div>
          <AchadoAberto
            tipo="Endereços de frente de serviço divergentes"
            antes="…realizar a limpeza e microdrenagem da "
            grifo="Rua Bento Goiá e Av. Engenheiro Max de Souza"
            depois="."
            arquivo="117_25_md_geral_a.pdf"
            pagina={PAGINA_DO_EXEMPLAR}
            atraso={3950}
            style={{ gridColumn: "8 / span 5" }}
          />
        </div>
        <Entra atraso={4300} style={{ flex: "none" }}>
          <p className="ap-fonte" style={{ margin: "18px 0 0" }}>
            Custo lido do registro de uso do próprio sistema, não estimado. O
            tempo varia com o tamanho do documento.
          </p>
        </Entra>
      </>
    ),
  },
];
