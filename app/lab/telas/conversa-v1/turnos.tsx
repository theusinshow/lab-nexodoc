"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Check, FileText, Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Avatar, Botao, Orbe, Segmento, Seletor, Tecla } from "@/components/ds/basicos";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];

/**
 * UM TURNO: o autor na margem, o conteúdo ao lado. Sem balão — a conversa lê
 * como um registro, de cima para baixo, e o que o Nexo pede para conferir é um
 * objeto (ficha, plano, diferença), não um parágrafo.
 */
export function Turno({ autor, hora, children, atraso = 0 }: { autor: "voce" | "nexo"; hora: string; children: ReactNode; atraso?: number }) {
  const { dur, k } = useTempo();
  return (
    <motion.article
      className={`cv-turno cv-turno--${autor}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur("enter"), delay: atraso * k, ease: ease(CURVA.out) }}
    >
      <div className="cv-autor">
        {autor === "nexo" ? <Orbe tamanho={18} /> : <Avatar iniciais="VI" pequeno />}
        <span>{autor === "nexo" ? "Nexo" : "Você"}</span>
        <time>{hora}</time>
      </div>
      <div className="cv-conteudo">{children}</div>
    </motion.article>
  );
}

/** Os arquivos que o engenheiro anexou: nome em mono, o tipo que o Nexo leu e as páginas. */
export function Anexos({ arquivos }: { arquivos: { nome: string; tipo: string; paginas: number }[] }) {
  return (
    <ul className="cv-anexos">
      {arquivos.map((a) => (
        <li key={a.nome}>
          <FileText size={14} />
          <span className="cv-anexo-nome">{a.nome}</span>
          <span className="cv-anexo-tipo">{a.tipo}</span>
          <span className="ds-num">{a.paginas} p.</span>
        </li>
      ))}
    </ul>
  );
}

/** A FICHA: o que o Nexo leu do arquivo, campo a campo, para conferir antes de gastar tempo. */
export function Ficha({ linhas, rodape }: { linhas: { rotulo: string; valor: ReactNode; ok?: boolean }[]; rodape?: ReactNode }) {
  return (
    <div className="cv-ficha">
      <dl>
        {linhas.map((l) => (
          <div key={l.rotulo}>
            <dt>{l.rotulo}</dt>
            <dd>
              {l.valor}
              {l.ok && <Check size={13} className="cv-ok" aria-label="conferido" />}
            </dd>
          </div>
        ))}
      </dl>
      {rodape && <div className="cv-ficha-pe">{rodape}</div>}
    </div>
  );
}

export function EscolhaDeAnalise() {
  const [nivel, setNivel] = useState<"rapida" | "profunda">("profunda");
  return (
    <span className="cv-analise">
      <Segmento
        rotulo="Tipo de análise"
        valor={nivel}
        onTroca={setNivel}
        opcoes={[
          { valor: "rapida", rotulo: "Rápida" },
          { valor: "profunda", rotulo: "Profunda" },
        ]}
      />
      <small>{nivel === "profunda" ? "capítulo a capítulo e segundo modelo, uns 4 minutos" : "leitura global só, uns 90 segundos"}</small>
    </span>
  );
}

/** A ESCOLHA DO PROJETO: quando a obra lida não casa com nenhum projeto. */
export function EscolhaDeProjeto() {
  const [escolha, setEscolha] = useState("criar");
  const opcoes = [
    { id: "criar", titulo: "Criar o projeto 118-25", sub: "Ginásio Poliesportivo do Bairro Pinheirinho, Criciúma" },
    { id: "SIM118-25", titulo: "SIM118-25", sub: "Ginásio do Pinheirinho, Siderópolis: código parecido, outra prefeitura" },
    { id: "117-25", titulo: "117-25", sub: "UBS da Rua São Francisco de Assis, Criciúma" },
  ];
  return (
    <div className="cv-escolha" role="radiogroup" aria-label="Em qual projeto guardar">
      {opcoes.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={escolha === o.id} className="cv-opcao" onClick={() => setEscolha(o.id)}>
          <span className="cv-radio">{escolha === o.id && <motion.i layoutId="cv-radio" />}</span>
          <span>
            <b className={o.id === "criar" ? undefined : "cv-mono"}>{o.titulo}</b>
            <small>{o.sub}</small>
          </span>
        </button>
      ))}
    </div>
  );
}

export interface ItemDoPlano {
  id: string;
  nome: string;
  detalhe: string;
  falta?: string;
}

/**
 * O PLANO: tudo o que o Nexo vai gerar neste turno, com as decisões à vista e
 * UM botão (PlanoDeGeracao.tsx). Não gasta IA — capa, LD e separatriz saem de
 * regra —, então a confirmação existe para conferir as decisões.
 */
export function Plano({ itens, semPrefeitura }: { itens: ItemDoPlano[]; semPrefeitura?: boolean }) {
  const [prefeitura, setPrefeitura] = useState(semPrefeitura ? "escolher" : "Criciúma");
  const [tomos, setTomos] = useState(1);
  const falta = prefeitura === "escolher";
  return (
    <div className="cv-plano">
      <ol>
        {itens.map((it) => {
          const bloqueado = it.id === "capa" && falta;
          return (
            <li key={it.id} className={bloqueado ? "cv-plano--falta" : undefined}>
              <span className="cv-plano-nome">{it.nome}</span>
              <span className="cv-plano-detalhe">{bloqueado ? "precisa da prefeitura para o brasão e o cabeçalho" : it.detalhe}</span>
            </li>
          );
        })}
      </ol>
      <div className="cv-decisoes">
        <label>
          <span>Prefeitura</span>
          {falta ? (
            <Seletor
              valor={prefeitura}
              onTroca={setPrefeitura}
              opcoes={[
                { valor: "escolher", rotulo: "Escolher…" },
                { valor: "Criciúma", rotulo: "Criciúma" },
                { valor: "Siderópolis", rotulo: "Siderópolis" },
                { valor: "Içara", rotulo: "Içara" },
              ]}
            />
          ) : (
            <span className="cv-decisao-valor">
              <MarcaDaPrefeitura prefeitura={prefeitura} forma="sinal" /> {prefeitura}
              <button type="button" className="rs-link" onClick={() => setPrefeitura("escolher")}>
                trocar
              </button>
            </span>
          )}
        </label>
        <label>
          <span>Título</span>
          <span className="cv-decisao-valor">UBS da Rua São Francisco de Assis</span>
        </label>
        <label>
          <span>Código</span>
          <span className="cv-decisao-valor cv-mono">117-25</span>
        </label>
        <label>
          <span>Nº de tomos</span>
          <span className="cv-decisao-valor cv-contador">
            <button type="button" aria-label="Menos um tomo" disabled={tomos === 1} onClick={() => setTomos((t) => t - 1)}>
              <Minus size={12} />
            </button>
            <b className="ds-num">{tomos}</b>
            <button type="button" aria-label="Mais um tomo" disabled={tomos === 4} onClick={() => setTomos((t) => t + 1)}>
              <Plus size={12} />
            </button>
          </span>
        </label>
      </div>
      <div className="cv-plano-pe">
        {falta ? <span className="cv-falta">Falta a prefeitura da capa.</span> : <span className="rs-nota">Não usa IA: sai em segundos. O volume vem depois, com confirmação própria.</span>}
        <Botao variante="ghost" tamanho="sm">
          Ver como sai
        </Botao>
        <Botao variante="primary" tamanho="sm" disabled={falta}>
          Confirmar e gerar <Tecla>↵</Tecla>
        </Botao>
      </div>
    </div>
  );
}

/** A DIFERENÇA: o que muda num documento já gerado, linha por linha, antes de aplicar. */
export function Diferenca() {
  return (
    <div className="cv-diff">
      <div className="cv-diff-cabeca">
        <span className="cv-mono">LD_117-25_rev-A.pdf</span>
        <span className="rs-nota">1 folha sai, 32 continuam</span>
      </div>
      <ol>
        <li>
          <span className="cv-mono">ARQ-11</span> Planta de cobertura <small>rev. B</small>
        </li>
        <li className="cv-diff--sai">
          <span className="cv-mono">ARQ-12</span> Detalhes de esquadrias <small>rev. B, cancelada</small>
        </li>
        <li>
          <span className="cv-mono">EST-01</span> Locação e cargas <small>rev. A</small>
        </li>
      </ol>
      <div className="cv-plano-pe">
        <span className="rs-nota">A capa e as separatrizes não mudam.</span>
        <Botao variante="ghost" tamanho="sm">
          Descartar
        </Botao>
        <Botao variante="primary" tamanho="sm">
          Aplicar alteração <Tecla>↵</Tecla>
        </Botao>
      </div>
    </div>
  );
}

/** O Nexo respondendo: o texto chega palavra por palavra, e o cursor diz que ainda vem mais. */
export function Escrevendo({ texto }: { texto: string }) {
  const { k } = useTempo();
  const palavras = texto.split(" ");
  const [n, setN] = useState(3);
  useEffect(() => {
    if (n >= palavras.length) return;
    const t = setTimeout(() => setN((x) => x + 1), 90 * k);
    return () => clearTimeout(t);
  }, [n, palavras.length, k]);
  return (
    <p className="cv-texto">
      {palavras.slice(0, n).join(" ")}
      {n < palavras.length && <span className="cv-cursor" aria-hidden />}
    </p>
  );
}

export function ErroDeResposta() {
  return (
    <div className="cv-erro" role="alert">
      <AlertTriangle size={15} />
      <span>
        <b>A resposta não chegou.</b> O modelo não respondeu a tempo; nada foi gerado nem gasto. A pergunta está no campo, pronta para mandar de novo.
      </span>
      <Botao variante="ghost" tamanho="sm">
        <RotateCcw /> Tentar de novo
      </Botao>
    </div>
  );
}

/** As respostas rápidas: o que o Nexo espera ouvir, com a tecla de cada uma. */
export function RespostasRapidas() {
  const { dur } = useTempo();
  return (
    <AnimatePresence>
      <motion.div className="cv-rapidas" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: dur("enter"), delay: 0.3 }}>
        <button type="button" className="cv-rapida cv-rapida--sim">
          Sim, pode gerar <Tecla>↵</Tecla>
        </button>
        <button type="button" className="cv-rapida">
          Agora não <Tecla>Esc</Tecla>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
