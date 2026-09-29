"use client";

import type { Slide } from "../palco";
import { Entra, Leitura, Linhas, MONO } from "../pecas";

/**
 * FOLHA 08 — O MESMO ERRO, EM OBRAS DIFERENTES. Entrou em 28/09/2026, depois
 * das auditorias profundas de cinco memoriais em produção.
 *
 * É a PROVA da frase da direita da folha 07 ("o modelo-padrão leva o mesmo
 * defeito para todos os projetos"). A 07 mostra um memorial; esta mostra o
 * mesmo texto defeituoso aparecendo em obras, contratos e até cidades
 * diferentes — "Prefeitura Municipal de Chapecó" como proprietária de duas UBS
 * de Criciúma, "postes de aço de 60x40m" em quatro memoriais.
 *
 * DE ONDE SAI CADA CASA. Uma casa acesa quer dizer duas coisas, e as duas
 * foram conferidas: o Nexo APONTOU aquele erro naquele memorial (está no
 * parecer gravado), e o trecho ESTÁ na página indicada (conferido contra o
 * texto da página guardado com o parecer, não contra a paráfrase do achado).
 * Casa vazia não prova ausência — só que a auditoria daquele memorial não o
 * apontou. Por isso o rodapé diz isso com todas as letras.
 *
 * Os pareceres (produção): 117-25 `e893f218`, 118-25 `27c74e4a`, 025-24
 * `53dce197`, 027-24 `5cb5b3b2` (e a reexecução `849c9e8a`), 129-24
 * `cfe160ff`. Nenhum achado destes tinha julgamento humano registrado quando a
 * folha foi feita: por isso só entraram erros que se provam lendo o trecho.
 *
 * SEM DATA NA TELA, como o resto do deck.
 */

type Tom = "critico" | "tecnico" | "editorial";

const COR: Record<Tom, string> = {
  critico: "var(--status-critical)",
  tecnico: "var(--status-warning)",
  editorial: "var(--muted-foreground)",
};

/** As cinco obras, na ordem das colunas. */
const OBRAS = [
  { codigo: "117-25", cidade: "Criciúma" },
  { codigo: "118-25", cidade: "Criciúma" },
  { codigo: "025-24", cidade: "São José" },
  { codigo: "027-24", cidade: "São José" },
  { codigo: "129-24", cidade: "Florianópolis" },
] as const;

type Codigo = (typeof OBRAS)[number]["codigo"];

type Linha = {
  tipo: string;
  tom: Tom;
  /** O trecho de exemplo, transcrito, e de qual obra ele é. */
  trechos: readonly string[];
  de: string;
  /** Página por obra onde o Nexo apontou o erro. */
  paginas: Partial<Record<Codigo, number>>;
};

const LINHAS: readonly Linha[] = [
  {
    tipo: "Nome de outra obra",
    tom: "critico",
    trechos: ["…para as instalações da nova UBS Renascer – Porte 2"],
    de: "118-25",
    paginas: { "117-25": 14, "118-25": 119 },
  },
  {
    tipo: "Prefeitura de outra cidade",
    tom: "critico",
    trechos: ["Proprietário: Prefeitura Municipal de Chapecó;"],
    de: "117-25 e 118-25",
    paginas: { "117-25": 99, "118-25": 153 },
  },
  {
    tipo: "O nome da própria obra, errado",
    tom: "critico",
    trechos: ["Projeto de Engenharia para a USB Vila Francesa"],
    de: "118-25",
    paginas: { "117-25": 29, "118-25": 29, "027-24": 43 },
  },
  {
    tipo: "Erro de grafia",
    tom: "editorial",
    trechos: ["Protóripo comercial", "escava de aço"],
    de: "117, 118, 027, 129",
    paginas: {
      "117-25": 66,
      "118-25": 74,
      "025-24": 47,
      "027-24": 127,
      "129-24": 42,
    },
  },
  {
    tipo: "Unidade trocada",
    tom: "tecnico",
    trechos: ["postes de aço de 60x40m"],
    de: "seção em metros",
    paginas: { "117-25": 47, "118-25": 52, "025-24": 38, "027-24": 54 },
  },
  {
    tipo: "Texto de rodovia em UBS, praça e skate",
    tom: "tecnico",
    trechos: ["implantação do corpo estradal"],
    de: "as cinco",
    paginas: {
      "117-25": 29,
      "118-25": 29,
      "025-24": 15,
      "027-24": 28,
      "129-24": 21,
    },
  },
];

/** Largura de cada coluna de obra. 5 × 148 + o rótulo = a largura útil. */
const COLUNA = 148;
const GRADE = `1fr repeat(${OBRAS.length}, ${COLUNA}px)`;

function Matriz({ atraso }: { atraso: number }) {
  return (
    <div role="table" aria-label="Erros apontados por obra">
      {/* Cabeçalho: código da obra sobre a cidade. */}
      <Entra atraso={atraso}>
        <div
          role="row"
          style={{
            display: "grid",
            gridTemplateColumns: GRADE,
            alignItems: "end",
            paddingBottom: 12,
          }}
        >
          <span role="columnheader" className="ap-mono-rotulo">
            O que o Nexo apontou
          </span>
          {OBRAS.map((o) => (
            <span
              key={o.codigo}
              role="columnheader"
              style={{ fontFamily: MONO, textAlign: "center" }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: 22,
                  color: "var(--foreground)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {o.codigo}
              </span>
              <span
                style={{
                  display: "block",
                  marginTop: 4,
                  fontSize: 16,
                  letterSpacing: "0.06em",
                  color: "var(--muted-foreground)",
                }}
              >
                {o.cidade}
              </span>
            </span>
          ))}
        </div>
      </Entra>

      {LINHAS.map((linha, i) => {
        const entra = atraso + 240 + i * 180;
        return (
          <div
            key={linha.tipo}
            role="row"
            style={{
              display: "grid",
              gridTemplateColumns: GRADE,
              alignItems: "center",
              minHeight: 84,
              borderTop: "1px solid var(--border)",
            }}
          >
            <div role="rowheader" style={{ paddingRight: 32 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontWeight: 500,
                  lineHeight: 1.2,
                  letterSpacing: "-0.012em",
                  color: "var(--foreground)",
                }}
              >
                <Linhas linhas={[linha.tipo]} atraso={entra} />
              </p>
              <Entra atraso={entra + 120} style={{ marginTop: 6 }}>
                <p
                  style={{
                    margin: 0,
                    fontFamily: MONO,
                    fontSize: 20,
                    lineHeight: 1.35,
                    color: "var(--muted-foreground)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {linha.trechos.map((t, j) => (
                    <span key={t}>
                      {j > 0 ? " · " : ""}
                      <span style={{ color: "var(--foreground)" }}>“{t}”</span>
                    </span>
                  ))}
                  <span> — {linha.de}</span>
                </p>
              </Entra>
            </div>

            {OBRAS.map((o, j) => {
              const pagina = linha.paginas[o.codigo];
              return (
                <div
                  key={o.codigo}
                  role="cell"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    fontFamily: MONO,
                    fontSize: 20,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {pagina ? (
                    <>
                      {/*
                        A casa ACENDE, como a página no mapa da folha 05: a
                        mesma grafia (uma marca na cor da gravidade), da
                        esquerda para a direita, depois que a linha foi lida.
                      */}
                      <span
                        aria-hidden="true"
                        className="ap-acende"
                        style={{
                          width: 14,
                          height: 14,
                          flex: "none",
                          background: COR[linha.tom],
                          animationDelay: `${entra + 260 + j * 90}ms`,
                        }}
                      />
                      <span
                        className="ap-entra"
                        style={{
                          color: "var(--foreground)",
                          animationDelay: `${entra + 300 + j * 90}ms`,
                        }}
                      >
                        p. {pagina}
                      </span>
                    </>
                  ) : (
                    <span
                      aria-label="não apontado"
                      style={{
                        width: 14,
                        height: 1,
                        background: "var(--border)",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
      <div style={{ borderTop: "1px solid var(--border)" }} />
    </div>
  );
}

export const O_MESMO_ERRO: Slide = {
  rotulo: "O mesmo erro",
  numero: "08",
  bloco: "O problema",
  titulo: "O mesmo erro, em obras diferentes",
  subtitulo: "cinco memoriais auditados — trechos transcritos das páginas",
  notas:
    "É A PROVA DA FOLHA ANTERIOR. A 07 disse que o modelo-padrão leva o mesmo defeito para todos os projetos; aqui ele aparece, casa por casa. Cada linha é um tipo de erro, cada coluna é um memorial auditado, e cada casa acesa traz a página onde o Nexo apontou.\n\nLER UMA LINHA SÓ, e escolher a do Chapecó: duas UBS de Criciúma, dois memoriais diferentes, e nos dois a proprietária é a Prefeitura de Chapecó. Ninguém escreveu isso duas vezes — veio do mesmo texto-base. Depois, apontar a última linha com a mão: 'corpo estradal', texto de rodovia, nas cinco obras — UBS, orla e skatepark.\n\nOS DEMAIS EXEMPLOS, se perguntarem: 'Bairro Vila Francesa' no 117-25 (p. 14) — o nome da outra UBS — e 'UBS Renascer' no 118-25 (p. 119); 'USB' no lugar de UBS nos dois; 'Beiram Mar' na orla de São José; 'Protóripo', 'padrõa', 'inos' repetidos igual no 117 e no 118; 'escava de aço' na orla e no skatepark; poste com seção de 60x40 METROS em quatro memoriais.\n\nCASA VAZIA NÃO É 'NÃO TEM'. É 'a auditoria daquele memorial não apontou'. O rodapé diz isso; se perguntarem, dizer igual.\n\nNINGUÉM JULGOU ESTES ACHADOS AINDA dentro do sistema. Por isso só entraram erros que se provam lendo o trecho — grafia, nome, cidade, unidade. Cada trecho foi conferido contra o texto da página.\n\nNÃO DIZER DE QUAL PROJETO veio o texto reaproveitado. O documento não diz, e o deck não sabe.",
  corpo: (
    <>
      <div style={{ marginTop: 28 }}>
        <Matriz atraso={200} />
      </div>
      <Entra atraso={1700}>
        <p className="ap-fonte" style={{ margin: "16px 0 0", fontSize: 18 }}>
          Casa acesa: o Nexo apontou naquele memorial, e o trecho está na página
          indicada. Casa vazia: a auditoria daquele memorial não apontou.
        </p>
      </Entra>
      <Leitura
        atraso={1900}
        linhas={[
          { texto: "Não é descuido de uma obra." },
          { texto: "É o mesmo texto passando de uma para a outra.", chave: true },
        ]}
      />
    </>
  ),
};
