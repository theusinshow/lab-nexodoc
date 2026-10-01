"use client";

import { Esqueleto as E } from "@/components/ds/basicos";

import type { IdTela } from "./prototipo";
import { Topo } from "./topo";
import "../mapa/mapa.css";
import "./esqueletos.css";

/*
 * OS ESQUELETOS DAS TELAS. Quando o servidor está trazendo os dados, a tela
 * mostra a FORMA do que vem: a barra de cima já é a de verdade (ela não
 * depende de dado nenhum) e o resto são blocos nas mesmas medidas da tela
 * pronta, para nada pular quando o conteúdo chega.
 *
 * Regras do carregamento (DESIGN, 01/10/2026): quem espera decide o sinal.
 *  - servidor trazendo dados: esqueleto com a forma (aqui);
 *  - ação curta esperando o servidor: o anel fino no próprio botão (`Girando`);
 *  - o Nexo trabalhando: o orbe;
 *  - progresso conhecido: a contagem ("14 de 33 folhas"), nunca um anel.
 * O esqueleto só aparece depois de 120 ms (carga rápida não pisca) e a luz
 * que passa é uma só para a tela inteira, não uma por bloco.
 */

const ABA: Partial<Record<IdTela, "Painel" | "Projetos" | "Montar volumes" | "Achados" | "Ajuda" | "Administração" | null>> = {
  inicio: "Painel",
  projetos: "Projetos",
  projeto: "Projetos",
  achados: "Achados",
  nexo: "Montar volumes",
  mapa: "Montar volumes",
  ajuda: "Ajuda",
  admin: "Administração",
  conversa: null,
  auditoria: null,
  resultado: null,
};

const LARGURAS = [62, 48, 71, 55, 66, 44, 58, 69, 51, 63];

/** Linhas de uma tabela: as colunas têm larguras fixas, o texto varia por linha. */
function Linhas({ n, colunas }: { n: number; colunas: (number | "texto")[] }) {
  return (
    <div className="sk-linhas">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="sk-linha" style={{ gridTemplateColumns: colunas.map((c) => (c === "texto" ? "minmax(0, 1fr)" : `${c}px`)).join(" ") }}>
          {colunas.map((c, j) => (
            <E key={j} largura={c === "texto" ? `${LARGURAS[(i + j) % LARGURAS.length]}%` : Math.round(c * (0.55 + ((i + j) % 4) * 0.12))} altura={10} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Cabeca({ trilha = 180, titulo = 260, acao = true }: { trilha?: number; titulo?: number; acao?: boolean }) {
  return (
    <header className="mp-cabeca">
      <div className="sk-pilha" style={{ gap: 12 }}>
        <E largura={trilha} altura={10} />
        <E largura={titulo} altura={22} />
      </div>
      {acao && <E largura={128} altura={30} raio={999} />}
    </header>
  );
}

function Lado() {
  return (
    <aside className="mp-lado">
      <div className="mp-lado-bloco">
        <E largura={140} altura={12} />
        <E largura="88%" altura={10} />
        <E largura="64%" altura={10} />
        <div className="sk-pilha" style={{ gap: 14, marginTop: 8 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="sk-pilha" style={{ gap: 7 }}>
              <E largura={`${[70, 58, 76][i]}%`} altura={10} />
              <E largura={`${[46, 52, 40][i]}%`} altura={8} />
            </div>
          ))}
        </div>
        <E largura="100%" altura={36} raio={10} />
      </div>
    </aside>
  );
}

function Tiles({ n, larg = 260 }: { n: number; larg?: number }) {
  return (
    <div className="mp-tiles">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="sk-tile" style={{ flexBasis: larg }}>
          <E largura={90} altura={10} />
          <E largura={70} altura={22} />
          <E largura={130} altura={8} />
        </div>
      ))}
    </div>
  );
}

/** As páginas de tabela (Projetos, Projeto, Achados): cabeça, painel, tabela e lado. */
function PaginaDeTabela({ tiles = 0, linhas = 9 }: { tiles?: number; linhas?: number }) {
  return (
    <div className="mp">
      <Cabeca />
      <section className="mp-painel">
        {tiles > 0 && <Tiles n={tiles} />}
        <div className="mp-miolo">
          <div className="mp-principal">
            <div className="mp-ferramentas">
              <div className="sk-fila" style={{ gap: 20 }}>
                <E largura={74} altura={10} />
                <E largura={64} altura={10} />
                <E largura={82} altura={10} />
              </div>
              <E largura={260} altura={32} raio={8} />
            </div>
            <Linhas n={linhas} colunas={[24, 86, "texto", 120, 60]} />
          </div>
          <Lado />
        </div>
      </section>
    </div>
  );
}

function Inicio() {
  return (
    <div className="sk-inicio">
      <div className="sk-fila" style={{ gap: 12 }}>
        <E largura={26} altura={26} raio={999} />
        <E largura={230} altura={24} />
      </div>
      <E largura="100%" altura={44} raio={12} />
      <div className="sk-grade4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="sk-cartao sk-fila" style={{ gap: 12, padding: 14 }}>
            <E largura={30} altura={30} raio={8} />
            <div className="sk-pilha" style={{ gap: 7, flex: 1 }}>
              <E largura="70%" altura={10} />
              <E largura="52%" altura={8} />
            </div>
          </div>
        ))}
      </div>
      <div className="sk-colunas">
        <div className="sk-cartao" style={{ padding: 16 }}>
          <E largura={80} altura={12} />
          <Linhas n={4} colunas={[74, "texto", 120, 44]} />
        </div>
        <div className="sk-cartao" style={{ padding: 16 }}>
          <E largura={90} altura={12} />
          <div className="sk-pilha" style={{ gap: 16, marginTop: 16 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="sk-pilha" style={{ gap: 7 }}>
                <E largura={`${[86, 72, 90][i]}%`} altura={10} />
                <E largura="44%" altura={8} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="sk-cartao sk-grade4" style={{ padding: 16 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="sk-pilha" style={{ gap: 8 }}>
            <E largura={44} altura={20} />
            <E largura="70%" altura={8} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** O miolo do resultado (a coluna da esquerda): o que tratar e os dois quadros. */
export function MioloDoResultado() {
  return (
    <div className="sk-pilha" style={{ gap: 12 }}>
      <div className="sk-cartao" style={{ padding: 16 }}>
        <E largura={120} altura={12} />
        <Linhas n={8} colunas={[4, "texto", 40, 22]} />
      </div>
      <div className="sk-colunas">
        <E largura="100%" altura={170} raio={16} />
        <E largura="100%" altura={170} raio={16} />
      </div>
    </div>
  );
}

function Resultado() {
  return (
    <div className="sk-resultado">
      <div className="sk-pilha" style={{ gap: 12 }}>
        <E largura={260} altura={10} />
        <E largura={300} altura={24} />
        <E largura={380} altura={10} />
      </div>
      <div className="sk-resultado-grade">
        <MioloDoResultado />
        <div className="sk-cartao sk-pilha" style={{ gap: 14, padding: 14 }}>
          <E largura={84} altura={20} raio={999} />
          <E largura="90%" altura={10} />
          <E largura="70%" altura={10} />
          <E largura={44} altura={44} raio={999} />
          {[0, 1, 2, 3].map((i) => (
            <E key={i} largura="100%" altura={28} raio={8} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Auditoria() {
  return (
    <div className="sk-auditoria">
      <div className="sk-cartao sk-fila" style={{ justifyContent: "space-between", padding: 20 }}>
        <div className="sk-pilha" style={{ gap: 10 }}>
          <E largura={300} altura={10} />
          <E largura={260} altura={24} />
          <E largura={360} altura={10} />
        </div>
        <E largura={48} altura={48} raio={999} />
      </div>
      <div className="sk-cartao" style={{ padding: 18 }}>
        <E largura={110} altura={12} />
        <Linhas n={7} colunas={[150, "texto", 44]} />
      </div>
      <div className="sk-colunas">
        <E largura="100%" altura={190} raio={16} />
        <E largura="100%" altura={190} raio={16} />
      </div>
    </div>
  );
}

function Admin() {
  return (
    <div className="mp">
      <Cabeca trilha={110} titulo={140} acao={false} />
      <div className="adm-corpo sk-admin">
        <div className="sk-cartao sk-pilha" style={{ gap: 10, padding: 16, minHeight: 560 }}>
          <E largura="80%" altura={10} />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="sk-fila" style={{ gap: 10, padding: "8px 0" }}>
              <E largura={16} altura={16} raio={4} />
              <div className="sk-pilha" style={{ gap: 6, flex: 1 }}>
                <E largura="60%" altura={10} />
                <E largura="44%" altura={8} />
              </div>
            </div>
          ))}
        </div>
        <div className="sk-pilha" style={{ gap: 12 }}>
          <div className="sk-grade5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="sk-cartao sk-pilha" style={{ gap: 10, padding: 14 }}>
                <E largura="60%" altura={10} />
                <E largura={40} altura={20} />
                <E largura="80%" altura={8} />
              </div>
            ))}
          </div>
          <div className="sk-colunas">
            <E largura="100%" altura={180} raio={16} />
            <E largura="100%" altura={180} raio={16} />
          </div>
          <E largura="100%" altura={130} raio={16} />
        </div>
      </div>
    </div>
  );
}

function Ajuda() {
  return (
    <div className="mp">
      <Cabeca trilha={160} titulo={90} acao={false} />
      <section className="mp-painel">
        <div className="mp-miolo">
          <div className="mp-principal">
            <div className="mp-ferramentas">
              <div className="sk-fila" style={{ gap: 20 }}>
                <E largura={66} altura={10} />
                <E largura={78} altura={10} />
                <E largura={74} altura={10} />
              </div>
              <E largura={260} altura={32} raio={8} />
            </div>
            <Linhas n={6} colunas={[24, "texto", 200, 90]} />
          </div>
          <Lado />
        </div>
      </section>
    </div>
  );
}

function Mapa() {
  return (
    <div className="mp">
      <Cabeca trilha={260} titulo={190} />
      <section className="mp-painel">
        <Tiles n={2} />
        <div className="mp-miolo">
          <div className="mp-principal sk-canvas">
            {[0, 1].map((t) => (
              <div key={t} className="sk-fila" style={{ gap: 26, padding: "28px 24px" }}>
                <div className="sk-pilha" style={{ gap: 8, width: 70 }}>
                  <E largura={56} altura={12} />
                  <E largura={70} altura={8} />
                </div>
                {[0, 1, 2].map((i) => (
                  <E key={i} largura={54} altura={74} raio={3} />
                ))}
                <E largura={150} altura={74} raio={6} />
              </div>
            ))}
          </div>
          <Lado />
        </div>
      </section>
    </div>
  );
}

function Nexo() {
  return (
    <div className="sk-nexo">
      <aside className="sk-pilha" style={{ gap: 12, padding: 12 }}>
        <E largura="100%" altura={28} raio={8} />
        <E largura="100%" altura={30} raio={8} />
        {[0, 1, 2].map((i) => (
          <div key={i} className="sk-pilha" style={{ gap: 6, padding: "6px 4px" }}>
            <E largura={`${[78, 64, 70][i]}%`} altura={10} />
            <E largura="40%" altura={8} />
          </div>
        ))}
      </aside>
      <div className="sk-canvas">
        <div className="sk-fila" style={{ gap: 14, padding: "120px 32px" }}>
          {[0, 1, 2].map((i) => (
            <E key={i} largura={46} altura={62} raio={3} />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <E key={`f${i}`} largura={42} altura={42} raio={6} />
          ))}
        </div>
      </div>
      <aside className="sk-pilha" style={{ gap: 12, padding: 16 }}>
        <E largura={120} altura={12} />
        {[0, 1, 2, 3].map((i) => (
          <E key={i} largura={`${[70, 62, 66, 58][i]}%`} altura={24} raio={8} />
        ))}
        <E largura="80%" altura={10} />
        <E largura="64%" altura={10} />
      </aside>
    </div>
  );
}

function Conversa() {
  return (
    <div className="sk-conversa">
      <E largura={300} altura={22} />
      <E largura="100%" altura={96} raio={22} />
      <div className="sk-fila" style={{ gap: 8, justifyContent: "center" }}>
        {[120, 104, 112, 100, 150].map((l, i) => (
          <E key={i} largura={l} altura={28} raio={999} />
        ))}
      </div>
    </div>
  );
}

/** A tela carregando: a barra de cima de verdade e a forma do conteúdo. */
export function EsqueletoDaTela({ tela, semTopo = false }: { tela: IdTela; semTopo?: boolean }) {
  const corpo =
    tela === "inicio" ? <Inicio />
    : tela === "projetos" ? <PaginaDeTabela linhas={10} />
    : tela === "projeto" ? <PaginaDeTabela tiles={4} />
    : tela === "achados" ? <PaginaDeTabela tiles={2} />
    : tela === "resultado" ? <Resultado />
    : tela === "auditoria" ? <Auditoria />
    : tela === "admin" ? <Admin />
    : tela === "ajuda" ? <Ajuda />
    : tela === "mapa" ? <Mapa />
    : tela === "nexo" ? <Nexo />
    : <Conversa />;
  return (
    <div className="sk" aria-busy="true" aria-label="Carregando">
      {!semTopo && <Topo atual={ABA[tela] ?? null} busca={tela !== "inicio"} aviso={false} />}
      {corpo}
    </div>
  );
}
