"use client";

import {
  Check,
  Cloud,
  FileText,
  Gauge,
  History,
  KeyRound,
  ListChecks,
  ListOrdered,
  MessageSquareText,
  ScanText,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import type { ReactNode } from "react";

import { Orbe } from "@/components/ds/basicos";

import type { Slide } from "../palco";
import {
  Diagrama,
  Entra,
  Fio,
  MONO,
  No,
  Particula,
  Selo,
  type TomDoSelo,
} from "../pecas";

/**
 * CAPÍTULO 3 — MATURIDADE (folhas 10 a 14): o que ele não faz bem, o que
 * protege o documento, o que já existe, a prova da montagem e as duas provas.
 * Cada folha mostra o ESTADO de alguma coisa — e estado, no sistema, é selo,
 * tabela e escala, não parágrafo.
 */

const BLOCO = "Maturidade";

const icone = (I: typeof Check) => <I size={22} strokeWidth={1.75} />;

/* ════════════════════════════════════════════════ folha 10: os limites */

const LIMITES: ReadonlyArray<readonly [TomDoSelo, string, string, string]> = [
  [
    "decide",
    "Por desenho",
    "Peca pelo excesso.",
    "Prefere apontar demais a deixar passar, e parte do que levanta você vai descartar. Achado a mais custa um minuto de leitura; achado a menos custa o que custou naquele projeto.",
  ],
  [
    "neutro",
    "Conhecido",
    "A lista varia entre execuções.",
    "Rodando o mesmo documento duas vezes, o total fica estável, mas os achados de borda entram e saem.",
  ],
  [
    "linha",
    "Em aberto",
    "A precisão ainda não foi julgada por quem projeta.",
    "É a única medida em aberto, e depende do veredito de vocês. É exatamente isso que estou pedindo no piloto.",
  ],
  [
    "neutro",
    "Fora do alvo",
    "Não audita prancha.",
    "Hoje o alvo é o memorial descritivo e a documentação de identidade do projeto.",
  ],
];

/* ══════════════════════════════════════════════ folha 12: duas janelas */

/** Uma janela do app em miniatura: a barra com o orbe e o nome da tela. */
function Janela({
  tela,
  atraso,
  children,
}: {
  tela: string;
  atraso: number;
  children: ReactNode;
}) {
  return (
    <div
      className="ap-assenta"
      style={{
        borderRadius: 18,
        background: "var(--ds-surface-sunken)",
        boxShadow: "var(--ds-edge-strong), 0 40px 80px -40px rgb(0 0 0 / 0.9)",
        overflow: "hidden",
        animationDelay: `${atraso}ms`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          height: 46,
          padding: "0 18px",
          boxShadow: "inset 0 -1px 0 var(--ds-line-subtle)",
          fontSize: 16,
          color: "var(--ds-text-secondary)",
        }}
      >
        <Orbe tamanho={16} />
        <b style={{ fontWeight: 600, color: "var(--ds-text-primary)" }}>Nexo</b>
        <span style={{ color: "var(--ds-text-tertiary)" }}>{tela}</span>
      </div>
      <div style={{ padding: "18px 22px 20px", height: 196, boxSizing: "border-box" }}>
        {children}
      </div>
    </div>
  );
}

const NIVEL = {
  critico: "var(--ds-sev-block)",
  tecnico: "var(--ds-sev-decide)",
  editorial: "var(--ds-sev-note)",
} as const;

/** O Resultado em miniatura, com os achados do 117-25 (a corrida da folha 05). */
function MiniResultado({ atraso }: { atraso: number }) {
  const linhas: [keyof typeof NIVEL, string, string][] = [
    ["critico", "Endereços de frente de serviço divergentes", "p. 25"],
    ["critico", "Proprietário: prefeitura de outra cidade", "p. 99"],
    ["editorial", "“ambulânciua”", "p. 38"],
  ];
  return (
    <>
      <div style={{ display: "flex", gap: 4, height: 8, marginBottom: 12 }}>
        {(
          [
            ["critico", 11],
            ["tecnico", 32],
            ["editorial", 13],
          ] as const
        ).map(([n, v], i) => (
          <span
            key={n}
            className="ap-risca"
            style={{ flexGrow: v, flexBasis: 0, borderRadius: 999, background: NIVEL[n], animationDelay: `${atraso + i * 100}ms` }}
          />
        ))}
      </div>
      {linhas.map(([n, t, p], i) => (
        <div
          key={p}
          className="ap-entra"
          style={{
            display: "grid",
            gridTemplateColumns: "16px 1fr auto",
            alignItems: "center",
            gap: 10,
            padding: "10px 0",
            boxShadow: "inset 0 1px 0 var(--ds-line-subtle)",
            animationDelay: `${atraso + 200 + i * 140}ms`,
          }}
        >
          <i style={{ width: 9, height: 9, borderRadius: "50%", background: NIVEL[n] }} />
          <span style={{ fontSize: 17, color: "var(--ds-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {t}
          </span>
          <span className="ap-codigo" style={{ fontSize: 13 }}>{p}</span>
        </div>
      ))}
    </>
  );
}

/**
 * O Mapa do volume em miniatura: capa, lista e pranchas na fileira, com o freio
 * aceso numa folha. É desenho da tela, não dado de obra: as folhas não têm nome.
 */
function MiniMapa({ atraso }: { atraso: number }) {
  const pecas: { w: number; h: number; freio?: boolean }[] = [
    { w: 58, h: 80 },
    { w: 58, h: 80 },
    { w: 80, h: 58 },
    { w: 80, h: 58, freio: true },
    { w: 80, h: 58 },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
        {pecas.map((p, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {i ? <i style={{ width: 14, height: 1.5, background: "var(--ds-line-strong)" }} /> : null}
            <span
              className="ap-assenta"
              style={{
                width: p.w,
                height: p.h,
                borderRadius: 5,
                background: "var(--ds-p-paper)",
                boxShadow: p.freio ? "0 0 0 2.5px var(--ds-sev-decide)" : undefined,
                animationDelay: `${atraso + i * 120}ms`,
              }}
            />
          </span>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Entra atraso={atraso + 800}>
          <Selo tom="decide">folha faltante na lista</Selo>
        </Entra>
        <Entra atraso={atraso + 950}>
          <span style={{ display: "inline-flex", alignItems: "center", height: 38, padding: "0 18px", borderRadius: 999, background: "var(--ds-action-bg)", color: "var(--ds-action-fg)", fontSize: 16, fontWeight: 500 }}>
            Gerar ODT, PDF e ZIP
          </span>
        </Entra>
      </div>
    </div>
  );
}

function ListaDeVistos({ itens, atraso }: { itens: readonly string[]; atraso: number }) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
      {itens.map((l, i) => (
        <li
          key={l}
          className="ap-entra"
          style={{
            display: "grid",
            gridTemplateColumns: "36px 1fr",
            alignItems: "baseline",
            padding: "11px 0",
            boxShadow: "inset 0 1px 0 var(--ds-line-subtle)",
            fontSize: 22,
            lineHeight: 1.35,
            color: "var(--ds-text-secondary)",
            animationDelay: `${atraso + i * 120}ms`,
          }}
        >
          <Check aria-hidden="true" size={20} strokeWidth={2} style={{ color: "var(--ds-text-tertiary)", transform: "translateY(3px)" }} />
          {l}
        </li>
      ))}
    </ul>
  );
}

/* ═════════════════════════════════════════ folha 14: escala de maturidade */

const ESTAGIOS = [
  "O fluxo existe e roda",
  "Medido num projeto real",
  "Medido no uso do escritório",
  "Julgado por quem usa",
];

function Trilha({
  nome,
  ate,
  selo,
  detalhe,
  atraso,
}: {
  nome: string;
  /** Quantos estágios a capacidade já cumpriu. */
  ate: number;
  selo: { tom: TomDoSelo; texto: string };
  detalhe: string;
  atraso: number;
}) {
  const fim = `${(ate / ESTAGIOS.length) * 100}%`;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", alignItems: "center", minHeight: 150, boxShadow: "inset 0 1px 0 var(--ds-line-subtle)" }}>
      <Entra atraso={atraso}>
        <p style={{ margin: 0, fontSize: 34, fontWeight: 500, letterSpacing: "-0.025em" }}>{nome}</p>
      </Entra>
      <div style={{ position: "relative", height: 150 }}>
        {/* o caminho todo, tracejado: aonde a capacidade ainda pode chegar */}
        <span
          aria-hidden="true"
          className="ap-surge"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 46,
            height: 0,
            borderTop: "2px dashed rgb(255 255 255 / 0.14)",
            animationDelay: `${atraso}ms`,
          }}
        />
        {/* o que já foi cumprido, cheio */}
        <span
          aria-hidden="true"
          className="ap-risca"
          style={{
            position: "absolute",
            left: 0,
            width: fim,
            top: 40,
            height: 14,
            borderRadius: 999,
            background: "#c9ccd4",
            animationDelay: `${atraso + 200}ms`,
          }}
        />
        <span
          aria-hidden="true"
          className="ap-assenta"
          style={{
            position: "absolute",
            left: `calc(${fim} - 13px)`,
            top: 34,
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "var(--ds-text-primary)",
            boxShadow: "0 0 0 6px var(--ds-surface-page)",
            animationDelay: `${atraso + 900}ms`,
          }}
        />
        <Entra
          atraso={atraso + 1000}
          style={{ position: "absolute", left: 0, top: 78, display: "flex", alignItems: "center", gap: 16 }}
        >
          <Selo tom={selo.tom}>{selo.texto}</Selo>
          <span style={{ fontSize: 18, color: "var(--ds-text-tertiary)", whiteSpace: "nowrap" }}>{detalhe}</span>
        </Entra>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ AS FOLHAS */

export const MATURIDADE: readonly Slide[] = [
  {
    rotulo: "Limites",
    numero: "10",
    bloco: BLOCO,
    titulo: "Limites",
    manchete: [
      { texto: "Dito antes de perguntarem:", fraca: true },
      "o que ele ainda não faz bem.",
    ],
    notas:
      "Dito por você, antes de perguntarem. Este slide compra mais credibilidade que qualquer outro do deck. Não amaciar nenhum item — principalmente o do excesso, que é o que o usuário vai sentir no primeiro dia.\n\nOS SELOS DIZEM O ESTADO de cada limite: o excesso é por desenho, a variação é conhecida, a precisão está em aberto — e é a que o piloto mede —, a prancha está fora do alvo.\n\nO EXCESSO, NO 117_25 (a corrida da folha 05), para quem pedir exemplo: a própria validação contestou 5 regras e as deixou registradas no parecer — uma delas acusava de divergente o nome CERTO da obra (p. 215). E 2 dos 56 o parecer já descreve como não sendo erro (p. 38, 'terminologia aceitável'; p. 62, 'falso positivo de escopo'). É isso que o 'você vai descartar parte' quer dizer.\n\nSE PERGUNTAREM DA VARIAÇÃO com número: a corrida de agosto do mesmo memorial deu 28, mas no nível padrão e com outro modelo. Não é a mesma leitura repetida, e NÃO serve de prova deste item — dizer que a medida de variação vem de rodar o mesmo nível duas vezes.",
    corpo: (
      <table className="ap-tabela ap-surge" style={{ animationDelay: "300ms" }}>
        <thead>
          <tr>
            <th style={{ width: 230 }}>Estado</th>
            <th style={{ width: 560 }}>Limite</th>
            <th>O que isso quer dizer</th>
          </tr>
        </thead>
        <tbody>
          {LIMITES.map(([tom, estado, limite, texto], i) => (
            <tr key={limite} className="ap-entra" style={{ animationDelay: `${480 + i * 180}ms` }}>
              <td>
                <Selo tom={tom}>{estado}</Selo>
              </td>
              <td>
                <b style={{ fontSize: 26, letterSpacing: "-0.012em" }}>{limite}</b>
              </td>
              <td style={{ fontSize: 21 }}>{texto}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
  },

  {
    rotulo: "Segurança",
    numero: "11",
    bloco: BLOCO,
    titulo: "O que protege o documento",
    manchete: [
      "O documento é lido e esquecido.",
      { texto: "O que ensina o sistema fica na PROSUL.", fraca: true },
    ],
    notas:
      "O slide que responde 'e se vazar?'. Acompanhar o desenho: o PDF entra, é lido e descartado — não é armazenado, decisão de projeto e não limitação. O texto vai ao provedor do modelo e volta como resposta; pela política da API usada, não alimenta treinamento.\n\nSobre 'a IA aprende com os nossos projetos?': separar as duas coisas na fala. O modelo NÃO aprende — ele vem pronto de fora. O que aprende é o sistema, e só pelo que vocês corrigirem: falso positivo, gravidade errada e achado que faltou viram medida de qualidade e ajuste de regra dentro da nossa base, sem sair para o provedor. É o fio que sobe do feedback para a leitura.\n\nCUIDADO — ESTA É A FOLHA QUE CONVIDA 'mostra esse painel de custo aí'. A demonstração sai de produção, e a tela de uso de IA de lá lista modelos sem preço, onde hoje aparece uma chave antiga em texto puro. Ou limpar essas linhas antes do dia, ou abrir o custo POR OBRA e não a tela de uso por modelo.",
    corpo: (
      <Diagrama
        largura={1680}
        altura={600}
        fios={
          <>
            <Fio d="M 250 145 L 400 145" atraso={700} seta={{ x: 400, y: 145, dir: "direita" }} />
            <Fio d="M 125 195 L 125 330" atraso={1000} tom="block" seta={{ x: 125, y: 330, dir: "baixo" }} />
            <Fio d="M 740 120 L 1300 120" atraso={1500} seta={{ x: 1300, y: 120, dir: "direita" }} />
            <Fio d="M 1300 172 L 740 172" atraso={2000} seta={{ x: 740, y: 172, dir: "esquerda" }} />
            <Fio d="M 570 330 L 570 215" atraso={2600} tom="ok" seta={{ x: 570, y: 215, dir: "cima" }} />
          </>
        }
      >
        {/* a fronteira: tudo aqui dentro é do NexoDoc, na PROSUL */}
        <div
          className="ap-surge"
          style={{
            position: "absolute",
            left: 340,
            top: 0,
            width: 820,
            height: 600,
            borderRadius: 26,
            background: "rgb(255 255 255 / 0.018)",
            outline: "1.5px dashed var(--ds-line-strong)",
            outlineOffset: -1.5,
            animationDelay: "200ms",
          }}
        >
          <span style={{ position: "absolute", left: 28, top: 20, fontSize: 18, fontWeight: 500, color: "var(--ds-text-tertiary)" }}>
            Dentro do NexoDoc, na PROSUL
          </span>
        </div>
        <Particula d="M 250 145 L 400 145 L 740 120 L 1300 120" atraso={3000} duracao={1800} />
        <Particula d="M 1300 172 L 740 172" atraso={4500} duracao={1100} />

        <No x={0} y={95} largura={250} altura={100} atraso={400} icone={icone(FileText)} titulo="PDF do memorial" />
        <No x={0} y={330} largura={250} altura={150} atraso={1100} icone={<Trash2 size={22} strokeWidth={1.75} style={{ color: "var(--ds-sev-block)" }} />}
          titulo="Descartado" texto="não é armazenado; para reprocessar, o arquivo é reenviado" />
        <No x={400} y={70} largura={340} altura={145} atraso={800} variante="nexo" icone={icone(ScanText)}
          titulo="Leitura" texto="o memorial é lido, respondido e esquecido" />
        <No x={400} y={330} largura={340} altura={170} atraso={2400} icone={icone(MessageSquareText)}
          titulo="Feedback de quem projeta" texto="falso positivo e o que faltou viram medida de qualidade e ajuste de regra" />
        <No x={1300} y={60} largura={380} altura={180} atraso={1300} icone={icone(Cloud)}
          titulo="Provedor do modelo" texto="a inteligência vem pronta de fora; pela política da API, o conteúdo não alimenta treinamento" />

        <Entra atraso={1500} style={{ position: "absolute", left: 860, top: 84, fontSize: 17, color: "var(--ds-text-tertiary)" }}>
          texto para leitura
        </Entra>
        <Entra atraso={2000} style={{ position: "absolute", left: 860, top: 184, fontSize: 17, color: "var(--ds-text-tertiary)" }}>
          resposta
        </Entra>

        <div style={{ position: "absolute", left: 790, top: 260, width: 340 }}>
          {(
            [
              [KeyRound, "Acesso nominal", "login corporativo; desativar alguém corta o acesso na hora"],
              [ListChecks, "Tudo registrado", "provedor, modelo, duração e custo de cada execução, por obra"],
              [Gauge, "Teto de gasto mensal", "atingido, o sistema recusa a chamada em vez de gastar"],
            ] as const
          ).map(([I, t, x], i) => (
            <div
              key={t}
              className="ap-entra"
              style={{ padding: "16px 0", boxShadow: i ? "inset 0 1px 0 var(--ds-line-subtle)" : undefined, animationDelay: `${3000 + i * 180}ms` }}
            >
              <p className="ap-no__titulo" style={{ fontSize: 21 }}>
                <I size={20} strokeWidth={1.75} />
                {t}
              </p>
              <p className="ap-no__texto" style={{ marginTop: 4, fontSize: 17 }}>{x}</p>
            </div>
          ))}
        </div>
      </Diagrama>
    ),
  },

  {
    rotulo: "O que existe hoje",
    numero: "12",
    bloco: BLOCO,
    titulo: "O que já existe e funciona",
    manchete: [
      "Os dois caminhos já funcionam,",
      { texto: "com maturidades diferentes.", fraca: true },
    ],
    notas:
      "DOIS CAMINHOS, DUAS PROVAS. A conferência já foi medida num memorial real; a montagem já prova o fluxo operacional, mas ainda precisa de uso real para medir tempo, estabilidade e aceitação. Não nivelar as duas maturidades — dizer a diferença aumenta a credibilidade.\n\nAS JANELAS SÃO AS TELAS DO PRODUTO em miniatura. À esquerda, o Resultado com achados reais do 117-25. À direita, o mapa do volume com um freio aceso — é o desenho da tela, não uma obra: as folhas ali não têm nome.\n\nOs selos dizem a maturidade com as cores do produto: verde é medido, o contorno é o que ainda espera medida. A folha seguinte abre a prova operacional da montagem sem repetir a demonstração da conferência.",
    corpo: (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56 }}>
        {(
          [
            {
              nome: "Conferência de memorial descritivo",
              tela: "Resultado da auditoria",
              selo: { tom: "ok", texto: "Medido em projeto real" },
              mini: (a: number) => <MiniResultado atraso={a} />,
              itens: [
                "Lê o memorial inteiro e aponta o que não fecha",
                "Cada achado com a página e a transcrição do trecho",
                "Separa o que impede emitir do que é decisão técnica",
                "Compara documentos entre si",
              ],
            },
            {
              nome: "Montagem de LDs, capas e volumes",
              tela: "Mapa do volume",
              selo: { tom: "linha", texto: "Prova operacional" },
              mini: (a: number) => <MiniMapa atraso={a} />,
              itens: [
                "Lê os selos das pranchas e monta a lista de documentos",
                "Acusa folha faltante, duplicada e divergência de total",
                "Preserva rascunho, tomos e a trilha de eventos",
                "Gera ODT, PDF e ZIP para conferência",
              ],
            },
          ] as const
        ).map((c, i) => {
          const a = 400 + i * 300;
          return (
            <div key={c.nome} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <Janela tela={c.tela} atraso={a}>
                {c.mini(a + 300)}
              </Janela>
              <Entra atraso={a + 500} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <span style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em" }}>{c.nome}</span>
                <Selo tom={c.selo.tom}>{c.selo.texto}</Selo>
              </Entra>
              <ListaDeVistos itens={c.itens} atraso={a + 700} />
            </div>
          );
        })}
      </div>
    ),
  },

  {
    rotulo: "Prova da montagem",
    numero: "13",
    bloco: BLOCO,
    titulo: "Montagem: a prova operacional",
    manchete: [
      "O fluxo da montagem está provado.",
      { texto: "O uso real ainda não — é o que o piloto mede.", fraca: true },
    ],
    notas:
      "ESTA É A PROVA DA SEGUNDA CAPACIDADE, SEPARADA DA CONFERÊNCIA. Não chamar de prova de campo: o que existe hoje é prova operacional do fluxo, sustentada pelo produto, pelos testes e pela trilha de rascunho e eventos.\n\nO QUE JÁ ESTÁ PROVADO é a coluna da esquerda: ler selos, organizar linhas e tomos, acusar faltas e divergências, preservar o rascunho e gerar os arquivos finais. O checklist do banco piloto registrou um rascunho e dezessete eventos; isso prova rastreabilidade, não adoção.\n\nO QUE AINDA NÃO ESTÁ PROVADO é a coluna da direita: tempo real devolvido, estabilidade no uso contínuo e aceitação dos arquivos por quem monta. Não preencher essa lacuna com a conta das dezesseis horas; ela era hipótese de processo, não medição de uso.",
    corpo: (
      <>
        <Diagrama
          largura={1680}
          altura={170}
          fios={
            <>
              {[292, 639, 986, 1333].map((x, i) => (
                <Fio key={x} d={`M ${x} 75 L ${x + 55} 75`} atraso={500 + i * 220} seta={{ x: x + 55, y: 75, dir: "direita" }} />
              ))}
            </>
          }
        >
          <No x={0} y={20} largura={292} altura={110} atraso={300} icone={icone(ScanText)} titulo="Selos das pranchas" texto="lê os campos de cada folha" />
          <No x={347} y={20} largura={292} altura={110} atraso={520} icone={icone(ListOrdered)} titulo="Lista e tomos" texto="com a origem de cada valor" />
          <No x={694} y={20} largura={292} altura={110} atraso={740} icone={<TriangleAlert size={22} strokeWidth={1.75} style={{ color: "var(--ds-sev-decide)" }} />} titulo="Freios" texto="faltante, duplicada, total divergente" />
          <No x={1041} y={20} largura={292} altura={110} atraso={960} icone={icone(History)} titulo="Rascunho e eventos" texto="o trabalho não se perde" />
          <No x={1388} y={20} largura={292} altura={110} atraso={1180} variante="claro" icone={icone(FileText)} titulo="Arquivos finais" texto="ODT, PDF e ZIP" />
          <Particula d="M 146 75 L 1534 75" atraso={1600} duracao={2400} />
        </Diagrama>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, marginTop: 48 }}>
          <div>
            <Entra atraso={1800}><Selo tom="ok">Já provado</Selo></Entra>
            <div style={{ marginTop: 16 }}>
              <ListaDeVistos
                atraso={1900}
                itens={[
                  "Ler selos e organizar linhas e tomos",
                  "Acusar faltas e divergências antes de fechar a lista",
                  "Preservar o rascunho e a trilha de eventos",
                  "Gerar os arquivos finais",
                ]}
              />
            </div>
          </div>
          <div>
            <Entra atraso={2400}><Selo tom="linha">O piloto precisa medir</Selo></Entra>
            <ul style={{ margin: "16px 0 0", padding: 0, listStyle: "none" }}>
              {["Tempo real devolvido a quem monta", "Estabilidade no uso contínuo", "Aceitação dos arquivos por quem entrega"].map((l, i) => (
                <li
                  key={l}
                  className="ap-entra"
                  style={{ display: "grid", gridTemplateColumns: "36px 1fr", alignItems: "center", padding: "11px 0", boxShadow: "inset 0 1px 0 var(--ds-line-subtle)", fontSize: 22, color: "var(--ds-text-secondary)", animationDelay: `${2500 + i * 120}ms` }}
                >
                  <i aria-hidden="true" style={{ width: 16, height: 16, borderRadius: "50%", outline: "1.5px dashed var(--ds-text-tertiary)", outlineOffset: -1.5 }} />
                  {l}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </>
    ),
  },

  {
    rotulo: "Duas provas",
    numero: "14",
    bloco: BLOCO,
    titulo: "Duas capacidades, duas provas",
    manchete: [
      { texto: "O piloto não prova que o produto existe.", fraca: true },
      "Prova se ele merece ficar.",
    ],
    notas:
      "ESTA FOLHA CORRIGE A PRINCIPAL AMBIGUIDADE DO DECK. A conferência tem prova de campo; a montagem tem prova operacional. Nenhuma das duas recebe uma maturidade que ainda não conquistou — a escala mostra exatamente onde cada uma está.\n\nNA CONFERÊNCIA, os números são de uma única corrida profunda do 117_25, gravada em 14/09/2026; 11 dos 56 candidatos foram classificados como impeditivos de emissão. O piloto não precisa provar que o sistema encontra texto: precisa medir a precisão do julgamento por disciplina.\n\nNA MONTAGEM, o fluxo e as saídas existem. O piloto precisa medir se o trabalho real fica mais rápido, se o rascunho permanece estável e se os arquivos finais são aceitos.\n\nAPONTAR A CAIXA TRACEJADA: os dois últimos degraus são o que o piloto mede, para as duas. Dizer a manchete devagar: a proposta compra a produção da evidência que só o uso do escritório pode dar.",
    corpo: (
      <div style={{ position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr" }}>
          <span />
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${ESTAGIOS.length}, 1fr)` }}>
            {ESTAGIOS.map((e, i) => (
              <Entra key={e} atraso={300 + i * 120} style={{ padding: "0 16px 18px", boxShadow: "inset 1px 0 0 var(--ds-line-subtle)" }}>
                <span style={{ fontFamily: MONO, fontSize: 15, color: "var(--ds-text-tertiary)" }}>{i + 1}</span>
                <p style={{ margin: "6px 0 0", fontSize: 21, fontWeight: 500, color: "var(--ds-text-secondary)" }}>{e}</p>
              </Entra>
            ))}
          </div>
        </div>
        <Trilha
          nome="Conferência"
          ate={2}
          selo={{ tom: "ok", texto: "Prova de campo" }}
          detalhe="218 páginas, 56 candidatos, 5,4 min, US$ 1,61"
          atraso={900}
        />
        <Trilha
          nome="Montagem"
          ate={1}
          selo={{ tom: "linha", texto: "Prova operacional" }}
          detalhe="ODT, PDF, ZIP, tomos e histórico de eventos"
          atraso={1500}
        />
        {/* o que o piloto mede: os dois últimos degraus, nas duas trilhas */}
        <div
          className="ap-surge"
          style={{
            position: "absolute",
            left: `calc(260px + (100% - 260px) / 2 + 8px)`,
            right: -8,
            top: 0,
            bottom: -16,
            borderRadius: 22,
            outline: "1.5px dashed rgb(255 255 255 / 0.32)",
            outlineOffset: -1.5,
            animationDelay: "2600ms",
          }}
        >
          <span style={{ position: "absolute", right: 22, bottom: 16, fontSize: 19, fontWeight: 500, color: "var(--ds-text-primary)" }}>
            o que o piloto mede
          </span>
        </div>
      </div>
    ),
  },
];
