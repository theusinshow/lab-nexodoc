"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Orbe } from "@/components/ds/basicos";

import { Linhas } from "./pecas";

import "./palco.css";

/** Uma linha da manchete. `fraca` vai um degrau de cinza abaixo: é o contexto, não a afirmação. */
export type LinhaDaManchete = string | { texto: string; fraca: true };

export interface Slide {
  /** Rótulo curto, para as notas. */
  rotulo: string;
  /** O que aparece na contagem: "01".."20" no deck, "A".."F" no anexo. */
  numero: string;
  /** O capítulo a que a folha pertence. Vazio na capa — e aí a moldura some. */
  bloco?: string;
  /** O assunto da folha, pequeno, acima da manchete. */
  titulo?: string;
  /**
   * A MANCHETE: a conclusão da folha, dita primeiro. Cada item é uma linha
   * deliberada — a quebra é decisão editorial, e o palco tem largura fixa.
   */
  manchete?: readonly LinhaDaManchete[];
  /** Uma frase de apoio sob a manchete (o arquivo, a fonte, o porquê). */
  lead?: string;
  /** O que o apresentador fala e o slide NÃO mostra. */
  notas: string;
  corpo: ReactNode;
}

/** Largura do painel de notas. Precisa bater com `.ap-notas` no CSS. */
const LARGURA_DAS_NOTAS = 460;

/** Os capítulos, na ordem em que aparecem: grupos de folhas seguidas com o mesmo bloco. */
function capitulos(folhas: readonly Slide[]) {
  const lista: { nome: string; de: number; ate: number }[] = [];
  folhas.forEach((f, i) => {
    if (!f.bloco) return;
    const ultimo = lista[lista.length - 1];
    if (ultimo && ultimo.nome === f.bloco && ultimo.ate === i - 1) ultimo.ate = i;
    else lista.push({ nome: f.bloco, de: i, ate: i });
  });
  return lista;
}

/**
 * A MOLDURA — o que é igual em toda folha e NÃO participa da troca: a barra do
 * topo (marca, capítulo, contagem) e o progresso por capítulo no pé. Mora no
 * palco, fora da <section>: o conteúdo se dissolve e a moldura fica, só o
 * capítulo e o preenchimento mudam. Na capa ela se recolhe.
 *
 * O nome `ap-trilho` e o `ap-trilho__indice--atual` ficam por contrato com o
 * gerador da cópia offline, que lê o número da folha dali e clona a moldura
 * para dentro de cada folha.
 *
 * `aria-hidden` porque é o mesmo dado que a régua de controle já anuncia.
 */
function Trilho({
  folhas,
  indice,
}: {
  folhas: readonly Slide[];
  indice: number;
}) {
  const atual = folhas[indice];
  const caps = capitulos(folhas);
  return (
    <div
      className={atual.bloco ? "ap-trilho" : "ap-trilho ap-trilho--recolhido"}
      aria-hidden="true"
    >
      <div className="ap-trilho__topo">
        <span className="ap-trilho__marca">
          <Orbe tamanho={22} />
          NexoDoc
        </span>
        <span className="ap-trilho__capitulo">{atual.bloco ?? ""}</span>
        <span className="ap-trilho__conta">
          <span className="ap-trilho__indice ap-trilho__indice--atual">
            {atual.numero}
          </span>
          <span className="ap-trilho__total">
            {folhas[folhas.length - 1].numero}
          </span>
        </span>
      </div>
      <div className="ap-trilho__progresso">
        {caps.map((c) => {
          const total = c.ate - c.de + 1;
          const feito =
            indice > c.ate ? 1 : indice < c.de ? 0 : (indice - c.de + 1) / total;
          return (
            <span
              key={`${c.nome}-${c.de}`}
              className="ap-trilho__parte"
              style={{ flexGrow: total }}
            >
              <i style={{ transform: `scaleX(${feito})` }} />
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** O topo da folha: assunto, manchete e apoio, na ordem em que se lê. */
function Cabeca({ folha }: { folha: Slide }) {
  if (!folha.titulo) return null;
  const linhas = folha.manchete ?? [];
  return (
    <header className="ap-cabeca">
      <p className="ap-assunto ap-entra">{folha.titulo}</p>
      {linhas.length ? (
        <h1 className="ap-manchete">
          {linhas.map((l, i) => {
            const texto = typeof l === "string" ? l : l.texto;
            return (
              <span
                key={texto}
                className={
                  typeof l === "string" ? undefined : "ap-manchete__fraca"
                }
                style={{ display: "block" }}
              >
                <Linhas linhas={[texto]} atraso={80 + i * 120} />
              </span>
            );
          })}
        </h1>
      ) : null}
      {folha.lead ? (
        <p
          className="ap-lead ap-entra"
          style={{ animationDelay: `${180 + linhas.length * 120}ms` }}
        >
          {folha.lead}
        </p>
      ) : null}
    </header>
  );
}

/**
 * O MOTOR DE SLIDES. Teclado primeiro, porque é assim que se apresenta: a mão
 * fica no controle remoto ou na seta, nunca no mouse.
 *
 * `Espaço` e `PageDown` avançam junto com a seta porque é o que os apresentadores
 * remotos de sala emitem — um controle Logitech manda PageUp/PageDown, não setas,
 * e um deck que só ouve seta trava na mão de quem usa o controle da empresa.
 */
export function Palco({ slides }: { slides: readonly Slide[] }) {
  const [indice, setIndice] = useState(0);
  /*
   * A FOLHA QUE SAI. Fica montada por uma saída curta, por cima da que entra,
   * e depois some. Sem isto a troca é um corte seco — e um corte seco no meio de
   * uma fala parece falha de projetor, não decisão.
   */
  const [saindo, setSaindo] = useState<Slide | null>(null);
  const indiceAtual = useRef(0);
  const [notasAbertas, setNotasAbertas] = useState(false);
  const [ponteiroParado, setPonteiroParado] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const moldura = useRef<HTMLDivElement>(null);
  const palco = useRef<HTMLDivElement>(null);

  const atual = slides[indice];

  const mostra = useCallback(
    (alvo: number) => {
      const de = indiceAtual.current;
      const para = Math.min(slides.length - 1, Math.max(0, alvo));
      if (para === de) return;
      indiceAtual.current = para;
      setIndice(para);
      if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        setSaindo(slides[de]);
      }
    },
    [slides],
  );

  const vai = useCallback(
    (passo: number) => mostra(indiceAtual.current + passo),
    [mostra],
  );

  /* A saída dura `--ap-curta`; o mesmo número mora em palco.css. */
  useEffect(() => {
    if (!saindo) return;
    const relogio = setTimeout(() => setSaindo(null), 260);
    return () => clearTimeout(relogio);
  }, [saindo]);

  /*
   * A ESCALA. `transform: scale()` no palco inteiro, calculada a cada resize e
   * uma vez no monte. Vale a MENOR das duas razões (largura e altura).
   */
  useEffect(() => {
    function ajusta() {
      const alvo = palco.current;
      if (!alvo) return;
      /* As notas ROUBAM LARGURA do palco, e não podem cobri-lo. */
      const largura =
        window.innerWidth - (notasAbertas ? LARGURA_DAS_NOTAS : 0);
      const escala = Math.min(largura / 1920, window.innerHeight / 1080);
      alvo.style.transform = `scale(${escala})`;
      // A moldura assume o tamanho já escalado — ver o comentário em palco.css.
      if (moldura.current) {
        moldura.current.style.width = `${1920 * escala}px`;
        moldura.current.style.height = `${1080 * escala}px`;
      }
    }

    ajusta();
    window.addEventListener("resize", ajusta);
    return () => window.removeEventListener("resize", ajusta);
  }, [notasAbertas]);

  useEffect(() => {
    function tecla(evento: KeyboardEvent) {
      // Modificador pressionado é atalho do navegador, não do deck.
      if (evento.metaKey || evento.ctrlKey || evento.altKey) return;

      switch (evento.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          evento.preventDefault();
          vai(1);
          break;
        case "ArrowLeft":
        case "PageUp":
          evento.preventDefault();
          vai(-1);
          break;
        case "Home":
          evento.preventDefault();
          mostra(0);
          break;
        case "End":
          evento.preventDefault();
          mostra(slides.length - 1);
          break;
        case "n":
        case "N":
          setNotasAbertas((v) => !v);
          break;
        case "f":
        case "F":
          if (document.fullscreenElement) {
            void document.exitFullscreen();
          } else {
            void raiz.current?.requestFullscreen?.();
          }
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [slides.length, vai, mostra]);

  /* A régua some quando o ponteiro para. Três segundos: tempo de uma frase. */
  useEffect(() => {
    let relogio: ReturnType<typeof setTimeout>;

    function acorda() {
      setPonteiroParado(false);
      clearTimeout(relogio);
      relogio = setTimeout(() => setPonteiroParado(true), 3000);
    }

    acorda();
    window.addEventListener("mousemove", acorda);
    return () => {
      window.removeEventListener("mousemove", acorda);
      clearTimeout(relogio);
    };
  }, []);

  return (
    <div className="ap-raiz ds" data-notas={notasAbertas} ref={raiz}>
      <div className="ap-moldura" ref={moldura}>
        <div className="ap-palco" ref={palco}>
          <Trilho folhas={slides} indice={indice} />
          {(saindo && saindo !== atual ? [saindo, atual] : [atual]).map(
            (folha) => (
              <section
                key={folha.numero}
                aria-hidden={folha !== atual || undefined}
                aria-label={`${folha.numero} de ${slides.length}: ${folha.titulo ?? folha.rotulo}`}
                aria-roledescription="slide"
                className={[
                  "ap-folha",
                  folha.bloco ? "" : "ap-folha--capa",
                  folha !== atual ? "ap-folha--sai" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <Cabeca folha={folha} />
                <div className="ap-corpo">{folha.corpo}</div>
              </section>
            ),
          )}
        </div>
      </div>

      {notasAbertas ? (
        <aside className="ap-notas">
          <p className="ap-notas-rotulo">
            {atual.numero} · {atual.rotulo}
          </p>
          <h2>Notas do apresentador</h2>
          {/*
            AS NOTAS QUEBRAM EM PARÁGRAFOS: elas carregam as RÉPLICAS — o que o
            comprador diz quando a resposta não o satisfaz —, e num `<p>` único
            viram uma parede de texto que ninguém acha no meio de uma frase.
          */}
          {atual.notas.split("\n\n").map((paragrafo) => (
            <p key={paragrafo}>{paragrafo}</p>
          ))}
        </aside>
      ) : null}

      <span className="sr-only" aria-live="polite">
        Folha {indice + 1} de {slides.length}: {atual.titulo ?? atual.rotulo}
      </span>

      <div className="ap-regua" data-oculta={ponteiroParado}>
        <span className="ap-posicao">
          {indice + 1}/{slides.length}
        </span>
        <span>
          <kbd>←</kbd> <kbd>→</kbd> navegar
        </span>
        <span>
          <kbd>N</kbd> notas
        </span>
        <span>
          <kbd>F</kbd> tela cheia
        </span>
      </div>
    </div>
  );
}
