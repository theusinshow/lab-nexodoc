"use client";

import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { DISCIPLINA } from "../resultado-e/dados";
import type { Distancia } from "./cartoes";
import { FOLHAS, TOMOS, type Documento } from "./dados";
import { dd } from "./lado";

/*
 * O QUE O NEXO VAI GERAR, EM PAPEL. Capa, separatrizes, LD e volume aparecem
 * como a folha que vai sair: papel claro, retrato, com o texto que o modelo da
 * prefeitura imprime (órgão, obra em duas linhas, fase, volume, tomo, mês e
 * código). Não é pré-visualização fiel (fonte e brasão são do ODT); é a
 * ESTRUTURA, como o FrameDoDocumento do app.
 *
 * "A gerar" é o papel fantasma, tracejado: ainda não existe. Gerado é papel
 * sólido. Corrigido ou desatualizado ganham o contorno âmbar.
 */

export type EstadoDoDoc = "a-gerar" | "gerado" | "corrigido" | "desatualizado" | "sobra";

export const LARGURA_DO_PAPEL = 112;
export const ALTURA_DO_PAPEL = 158;
/** O título do papel fica EM CIMA dele (nome e estado), e faz parte do nó. */
export const ALTURA_DO_TITULO = 44;
export const ALTURA_DO_DOC = ALTURA_DO_PAPEL + ALTURA_DO_TITULO;

const NOME_DO_ESTADO: Record<EstadoDoDoc, string> = {
  "a-gerar": "a gerar",
  gerado: "gerado",
  corrigido: "corrigida",
  desatualizado: "desatualizado",
  sobra: "sem volume",
};

const OBRA = ["UBS DA RUA SÃO FRANCISCO", "DE ASSIS"];

function Capa({ tomo }: { tomo: number | null }) {
  const t = TOMOS.find((x) => x.n === tomo);
  return (
    <div className="pp-capa">
      <MarcaDaPrefeitura prefeitura="Criciúma" forma="chapa" />
      <p className="pp-orgao">PREFEITURA MUNICIPAL DE CRICIÚMA</p>
      <div className="pp-obra">
        {OBRA.map((l) => (
          <p key={l}>{l}</p>
        ))}
        <p className="pp-bairro">BAIRRO SÃO LUIZ</p>
      </div>
      <p className="pp-fase">PROJETO EXECUTIVO</p>
      <div className="pp-volume">
        <p>VOLUME 1</p>
        {t ? <p className="pp-itens">{t.disciplinas.map((d) => DISCIPLINA[d].nome.toUpperCase()).join(" E ")}</p> : <p className="pp-itens">VOLUME ÚNICO</p>}
        {t && <p>(TOMO {dd(t.n)})</p>}
      </div>
      <div className="pp-pe">
        <p>SETEMBRO 2026</p>
        <p className="pp-mono">117-25</p>
      </div>
    </div>
  );
}

function Separatriz({ tomo }: { tomo: number }) {
  const t = TOMOS.find((x) => x.n === tomo)!;
  return (
    <div className="pp-separatriz">
      <p className="pp-orgao">117-25</p>
      <p className="pp-disciplina">{DISCIPLINA[t.disciplinas[0]].nome.toUpperCase()}</p>
      <p className="pp-orgao">{DISCIPLINA[t.disciplinas[0]].sigla}</p>
    </div>
  );
}

function ListaDeDocumentos({ tomo }: { tomo: number | null }) {
  const t = TOMOS.find((x) => x.n === tomo);
  const fs = t ? FOLHAS.filter((f) => t.disciplinas.includes(f.disc)) : FOLHAS;
  return (
    <div className="pp-ld">
      <p className="pp-ld-titulo">LISTA DE DOCUMENTOS</p>
      <p className="pp-ld-obra">117-25, UBS DA RUA SÃO FRANCISCO DE ASSIS{t ? `, TOMO ${dd(t.n)}` : ""}</p>
      <div className="pp-ld-tabela">
        <p className="pp-ld-cab">
          <span>CÓDIGO</span>
          <span>DESCRIÇÃO</span>
          <span>REV.</span>
        </p>
        {fs.slice(0, 13).map((f) => (
          <p key={f.id} className={f.numero == null ? "pp-ld-falta" : undefined}>
            <span>{f.id}</span>
            <span>{f.titulo}</span>
            <span>{f.revisao}</span>
          </p>
        ))}
      </div>
      <p className="pp-ld-pagina">1 / {t ? (t.n === 1 ? 3 : 2) : 4}</p>
    </div>
  );
}

function Volume({ tomo }: { tomo: number }) {
  const t = TOMOS.find((x) => x.n === tomo)!;
  return (
    <div className="pp-volume-livro">
      <p className="pp-orgao">117-25</p>
      <p className="pp-disciplina">
        VOLUME 1<br />
        TOMO {dd(t.n)}
      </p>
      <p className="pp-orgao">{t.paginas} PÁGINAS</p>
    </div>
  );
}

/** O documento como papel, com a legenda do que ele é e do estado dele embaixo. */
export function PapelDoDocumento({ d, estado, tomo, distancia }: { d: Documento; estado: EstadoDoDoc; tomo: number | null; distancia: Distancia }) {
  const conteudo =
    distancia === "longe" ? null : d.tipo === "capa" ? (
      <Capa tomo={tomo} />
    ) : d.tipo === "separatriz" ? (
      <Separatriz tomo={tomo ?? 1} />
    ) : d.tipo === "ld" ? (
      <ListaDeDocumentos tomo={tomo} />
    ) : (
      <Volume tomo={tomo ?? 1} />
    );
  const quantas = d.tipo === "separatriz" && tomo ? TOMOS.find((x) => x.n === tomo)!.disciplinas.length : d.tipo === "volume" ? 3 : 1;
  return (
    <div className={`pp pp--${estado} pp--${d.tipo} pp--${distancia}`}>
      <div className="pp-pilha" style={{ ["--pp-n" as string]: quantas - 1 }}>
        {Array.from({ length: quantas - 1 }, (_, i) => (
          <i key={i} className="pp-atras" style={{ ["--pp-i" as string]: quantas - 1 - i }} aria-hidden />
        ))}
        <div className="pp-papel">{conteudo ?? <span className="pp-longe">{d.tipo === "ld" ? "LD" : d.tipo === "capa" ? "Capa" : d.tipo === "volume" ? "Vol." : "Sep."}</span>}</div>
      </div>
      <p className="pp-legenda">
        <span>{d.tipo === "separatriz" && quantas > 1 ? `${quantas} separatrizes` : d.tipo === "volume" ? `Volume, tomo ${dd(tomo ?? 1)}` : d.nome}</span>
        <em className={`pp-estado pp-estado--${estado}`}>{NOME_DO_ESTADO[estado]}</em>
      </p>
    </div>
  );
}
