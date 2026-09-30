"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";

import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";

/*
 * GRÁFICOS do sistema novo, no idioma da Matos UI (referência do Matheus):
 * monocromáticos, barras em pílula sobre trilho com textura, marcador fino, e
 * a animação que REVELA o dado em vez de enfeitá-lo. Escritos aqui com os
 * tokens --ds-* e o motion do projeto — não copiados de lá.
 */

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];

function mmss(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export interface PassoDaLinha {
  id: string;
  rotulo: string;
  /** Início, em segundos desde o começo. */
  inicio: number;
  /** Duração real (feitos) ou decorrida (atual). */
  duracao: number;
  /** Duração prevista — para o atual e os que faltam. */
  previsto: number;
  estado: "feito" | "atual" | "futuro" | "erro";
}

/**
 * LINHA DO TEMPO (waterfall). Cada passo é uma pílula no eixo do tempo,
 * começando onde começou. Os que faltam aparecem TRACEJADOS na posição
 * prevista — a tela mostra o futuro como estimativa, não como promessa. Um
 * marcador vertical diz "agora". O passo mais lento entre os feitos ganha o
 * tom claro; o atual que passou do previsto, o âmbar.
 */
export function LinhaDoTempo({ passos, agora, total }: { passos: PassoDaLinha[]; agora: number | null; total: number }) {
  const { dur, k } = useTempo();
  const [foco, setFoco] = useState<string | null>(null);
  const escala = (s: number) => `${(s / total) * 100}%`;
  const feitos = passos.filter((p) => p.estado === "feito");
  const maisLento = feitos.length > 1 ? feitos.reduce((a, b) => (b.duracao > a.duracao ? b : a)).id : null;
  const marcas = Array.from({ length: Math.floor(total / 60) + 1 }, (_, i) => i * 60);

  return (
    <div className="gr-linha" onMouseLeave={() => setFoco(null)}>
      {passos.map((p, i) => {
        const passou = p.estado === "atual" && p.duracao > p.previsto;
        const largura = p.estado === "futuro" ? p.previsto : Math.max(p.duracao, 2);
        return (
          <div
            key={p.id}
            className={`gr-passo gr-passo--${p.estado}${foco && foco !== p.id ? " gr-passo--fora" : ""}`}
            onMouseEnter={() => setFoco(p.id)}
          >
            <span className="gr-passo-rotulo">{p.rotulo}</span>
            <span className="gr-trilho">
              <motion.span
                className={`gr-pilula${p.id === maisLento ? " gr-pilula--lenta" : ""}${passou ? " gr-pilula--passou" : ""}`}
                style={{ left: escala(p.inicio) }}
                initial={{ width: 0 }}
                animate={{ width: escala(largura) }}
                transition={{ duration: p.estado === "atual" ? dur("layout") : dur("layout") * 2, ease: ease(CURVA.out), delay: p.estado === "atual" ? 0 : i * 0.05 * k }}
              >
                {p.estado !== "futuro" && largura / total > 0.07 && <span className="gr-pilula-valor">{mmss(p.duracao)}</span>}
              </motion.span>
              {/* o previsto do passo atual: um contorno onde ele deveria terminar */}
              {p.estado === "atual" && !passou && <span className="gr-previsto" style={{ left: escala(p.inicio), width: escala(p.previsto) }} />}
            </span>
            <span className="gr-passo-tempo">
              {p.estado === "futuro" ? `~${mmss(p.previsto)}` : p.estado === "erro" ? "parou" : mmss(p.duracao)}
            </span>
          </div>
        );
      })}

      {/* eixo e marcador de agora */}
      <div className="gr-eixo">
        <span />
        <span className="gr-eixo-marcas">
          {marcas.filter((m) => agora === null || Math.abs(m - agora) > total * 0.05).map((m) => (
            <i key={m} style={{ left: escala(m) }}>
              {mmss(m)}
            </i>
          ))}
          {agora !== null && (
            <motion.b
              className="gr-agora"
              initial={false}
              animate={{ left: escala(Math.min(agora, total)) }}
              transition={{ duration: 0.9 * k, ease: "linear" }}
            >
              agora
            </motion.b>
          )}
        </span>
        <span />
      </div>
      {agora !== null && (
        <div className="gr-agora-linha-wrap" aria-hidden>
          <span />
          <span className="gr-agora-trilho">
            <motion.i initial={false} animate={{ left: escala(Math.min(agora, total)) }} transition={{ duration: 0.9 * k, ease: "linear" }} />
          </span>
          <span />
        </div>
      )}
    </div>
  );
}

/**
 * MAPA DAS PÁGINAS (heatmap). Um quadrado por página do documento; o tom é
 * quantos pontos o Nexo marcou nela — mostra ONDE os problemas se juntam
 * enquanto a leitura anda. As páginas do bloco atual pulsam; as não lidas
 * ficam só no contorno.
 */
export function MapaDasPaginas({
  paginas,
  lidas,
  atuais,
}: {
  paginas: number[];
  /** Quantas páginas já foram lidas (as primeiras N). */
  lidas: number;
  /** Páginas do bloco em leitura (1-based). */
  atuais: number[];
}) {
  const { dur, k } = useTempo();
  const [sobre, setSobre] = useState<number | null>(null);
  const maximo = Math.max(1, ...paginas);
  const colunas = 14;

  return (
    <div className="gr-mapa">
      <div className="gr-mapa-grade" style={{ gridTemplateColumns: `repeat(${colunas}, 1fr)` }} onMouseLeave={() => setSobre(null)}>
        {paginas.map((pontos, i) => {
          const n = i + 1;
          const lida = i < lidas;
          const atual = atuais.includes(n);
          const tom = lida && pontos > 0 ? 0.18 + (pontos / maximo) * 0.72 : 0;
          const linha = Math.floor(i / colunas);
          const coluna = i % colunas;
          return (
            <motion.span
              key={n}
              className={`gr-pagina${lida ? " gr-pagina--lida" : ""}${atual ? " gr-pagina--atual" : ""}`}
              style={{ ["--tom" as string]: tom }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              // revelação na diagonal, como a grade chega
              transition={{ duration: dur("enter"), delay: (linha + coluna) * 0.025 * k, ease: ease(CURVA.out) }}
              onMouseEnter={() => setSobre(n)}
              aria-label={`Página ${n}: ${lida ? `${pontos} pontos` : "ainda não lida"}`}
            />
          );
        })}
      </div>
      <div className="gr-mapa-rodape">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={sobre ?? "legenda"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur("feedback") }}>
            {sobre === null ? (
              <>
                Tom da página = pontos marcados nela. <span className="gr-mapa-escala" aria-hidden><i /><i /><i /><i /></span>
              </>
            ) : sobre <= lidas ? (
              <>
                <b>p. {sobre}</b>: {paginas[sobre - 1] === 0 ? "nenhum ponto" : `${paginas[sobre - 1]} ${paginas[sobre - 1] === 1 ? "ponto" : "pontos"}`}
              </>
            ) : (
              <>
                <b>p. {sobre}</b>: ainda não lida
              </>
            )}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * FAIXA DE VEREDITO (threshold band). As três faixas do parecer lado a lado e
 * um losango que DESLIZA até onde o documento caiu. Serve ao Resultado: o
 * veredito lido como posição, não só como palavra.
 */
export function FaixaDeVeredito({ posicao, faixas }: { posicao: number; faixas: { rotulo: string; tom: "ok" | "decide" | "block"; ate: number }[] }) {
  const { mola } = useTempo();
  let inicio = 0;
  return (
    <div className="gr-faixa">
      <div className="gr-faixa-trilho">
        {faixas.map((f) => {
          const de = inicio;
          inicio = f.ate;
          const ativa = posicao >= de && posicao <= f.ate;
          return (
            <span key={f.rotulo} className={`gr-faixa-seg gr-faixa-seg--${f.tom}${ativa ? " gr-faixa-seg--ativa" : ""}`} style={{ left: `${de}%`, width: `${f.ate - de}%` }}>
              <em>{f.rotulo}</em>
            </span>
          );
        })}
        <motion.i className="gr-losango" initial={{ left: "0%" }} animate={{ left: `${posicao}%` }} transition={mola("gentle")} />
      </div>
    </div>
  );
}

export interface Coluna {
  /** Texto do rodapé quando o mouse está sobre a coluna. */
  rotulo: ReactNode;
  /** Rótulo do eixo; só as colunas marcadas mostram. */
  eixo?: string;
  valor: number;
  /** Parte do valor em tom claro (ex.: resolvidos dentro dos encontrados). */
  parte?: number;
}

/**
 * COLUNAS EM PÍLULA. Uma pílula por dia ou semana sobre o trilho com
 * textura; a parte (resolvidos) sobe por dentro do total em tom claro. A
 * última coluna é "agora" e ganha o iris. Sem eixo Y: o número que importa
 * está escrito acima do gráfico, e o mouse lê cada coluna.
 */
export function ColunasEmPilula({
  colunas,
  altura = 112,
  compacto = false,
  padrao,
}: {
  colunas: Coluna[];
  altura?: number;
  compacto?: boolean;
  /** Rodapé quando o mouse não está sobre nenhuma coluna. */
  padrao?: ReactNode;
}) {
  const { dur, k } = useTempo();
  const [sobre, setSobre] = useState<number | null>(null);
  const maximo = Math.max(1, ...colunas.map((c) => c.valor));
  const pct = (v: number) => `${(v / maximo) * 100}%`;
  const crescer = (atraso: number) => ({ duration: dur("layout") * 1.6, delay: atraso, ease: ease(CURVA.out) });

  return (
    <div className={`gr-colunas${compacto ? " gr-colunas--compacto" : ""}`}>
      <div className={`gr-colunas-area${sobre !== null ? " gr-colunas--foco" : ""}`} style={{ height: altura }} onMouseLeave={() => setSobre(null)}>
        {colunas.map((c, i) => (
          <span
            key={i}
            className={`gr-coluna${i === colunas.length - 1 ? " gr-coluna--hoje" : ""}${sobre === i ? " gr-coluna--sobre" : ""}`}
            onMouseEnter={compacto ? undefined : () => setSobre(i)}
          >
            {c.valor > 0 && (
              <motion.i className="gr-coluna-total" style={{ height: pct(c.valor) }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={crescer(i * 0.012 * k)} />
            )}
            {!!c.parte && (
              <motion.i className="gr-coluna-parte" style={{ height: pct(c.parte) }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={crescer(0.12 * k + i * 0.012 * k)} />
            )}
          </span>
        ))}
      </div>
      {!compacto && (
        <>
          <div className="gr-colunas-eixo" aria-hidden>
            {colunas.map((c, i) => (
              <span key={i}>{c.eixo}</span>
            ))}
          </div>
          <div className="gr-mapa-rodape">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={sobre ?? "padrao"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur("feedback") }}>
                {sobre === null ? padrao : colunas[sobre]?.rotulo}
              </motion.span>
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}

export interface DiaDeUso {
  data: Date;
  valor: number;
  /** Fora do período escolhido: fica apagado, mas o desenho não muda. */
  fora?: boolean;
}

export const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/**
 * MAPA DE ATIVIDADE (heatmap por dia). Semanas em colunas, segunda a
 * domingo nas linhas; o tom é quanto o Nexo trabalhou no dia. Trocar o
 * período não redesenha: apaga o que ficou de fora, para o olho não perder
 * o lugar.
 */
export function MapaDeAtividade({ dias, unidade }: { dias: DiaDeUso[]; unidade: [string, string] }) {
  const { dur, k } = useTempo();
  const [sobre, setSobre] = useState<number | null>(null);
  const maximo = Math.max(1, ...dias.map((d) => d.valor));
  // segunda = 0
  const deslocamento = dias.length ? (dias[0].data.getDay() + 6) % 7 : 0;
  const semanas = Math.ceil((dias.length + deslocamento) / 7);
  const meses: { coluna: number; nome: string }[] = [];
  dias.forEach((d, i) => {
    if (d.data.getDate() === 1 || i === 0) meses.push({ coluna: Math.floor((i + deslocamento) / 7), nome: MESES[d.data.getMonth()] });
  });
  const ativos = dias.filter((d) => !d.fora && d.valor > 0).length;
  const d = sobre !== null ? dias[sobre] : null;
  const grade = { gridTemplateColumns: `repeat(${semanas}, minmax(0, 1fr))` };

  return (
    <div className="gr-atividade">
      <div className="gr-atividade-meses" style={grade} aria-hidden>
        {meses.map((m) => (
          <span key={m.nome} style={{ gridColumn: `${m.coluna + 1} / span 3` }}>
            {m.nome}
          </span>
        ))}
      </div>
      <div className="gr-atividade-grade" style={grade} onMouseLeave={() => setSobre(null)}>
        {dias.map((dia, i) => {
          const pos = i + deslocamento;
          const coluna = Math.floor(pos / 7);
          const linha = pos % 7;
          return (
            <motion.span
              key={i}
              className={`gr-dia${dia.valor > 0 ? " gr-dia--uso" : ""}${dia.fora ? " gr-dia--fora" : ""}${i === dias.length - 1 ? " gr-dia--hoje" : ""}`}
              style={{ gridColumn: coluna + 1, gridRow: linha + 1, ["--tom" as string]: dia.valor > 0 ? 0.2 + (dia.valor / maximo) * 0.7 : 0 }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: dia.fora ? 0.22 : 1, scale: 1 }}
              transition={{ duration: dur("enter"), delay: (coluna + linha) * 0.018 * k, ease: ease(CURVA.out) }}
              onMouseEnter={() => setSobre(i)}
            />
          );
        })}
      </div>
      <div className="gr-mapa-rodape">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={sobre ?? "padrao"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur("feedback") }}>
            {d ? (
              <>
                <b>
                  {SEMANA[d.data.getDay()]}, {d.data.getDate()} {MESES[d.data.getMonth()]}
                </b>
                : {d.valor === 0 ? "sem uso" : `${d.valor} ${d.valor === 1 ? unidade[0] : unidade[1]}`}
              </>
            ) : (
              <>
                <span className="ds-num">{ativos}</span> dias com o Nexo em uso{" "}
                <span className="gr-mapa-escala" aria-hidden>
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
              </>
            )}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
