"use client";

/**
 * ANTES DE GERAR, EM PERGUNTAS (06/10/2026). Editar o número do volume dentro
 * da folha da capa não era evidente — o campo âmbar passava despercebido. O
 * plano agora PERGUNTA, num campo só e em destaque, o que só o engenheiro sabe:
 *
 * 1. "Esses documentos são de qual volume?" — obrigatório (é a trava do Gerar);
 * 2. o bairro, só quando o modelo o imprime (Criciúma, abaixo da obra) —
 *    opcional, com "Não tem bairro" como resposta.
 *
 * Respondida (Enter ou sair do campo), a pergunta encolhe numa linha
 * ("Volume 3 · mudar"). A folha continua embaixo como prévia.
 */
import { Check, CornerDownLeft, Pencil } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { CURVA, DURACAO, MOLA } from "@/lib/ds/movimento";

function Respondida({ texto, onMudar }: { texto: string; onMudar: () => void }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Check className="h-4 w-4 shrink-0 text-[var(--status-ok)]" aria-hidden />
      <span className="min-w-0 truncate">{texto}</span>
      <button
        type="button"
        onClick={onMudar}
        className="ml-auto inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
      >
        <Pencil className="h-3 w-3" aria-hidden />
        mudar
      </button>
    </div>
  );
}

/** Um campo de pergunta: rótulo grande, campo largo com brilho no foco, Enter confirma. */
function CampoDaPergunta({
  id,
  pergunta,
  ajuda,
  placeholder,
  inicial,
  inputMode,
  obrigatoria,
  onConfirmar,
  extra,
}: {
  id: string;
  pergunta: string;
  ajuda: string;
  placeholder: string;
  inicial: string;
  inputMode?: "numeric" | "text";
  obrigatoria?: boolean;
  onConfirmar: (v: string) => void;
  extra?: React.ReactNode;
}) {
  const [valor, setValor] = useState(inicial);
  const confirmar = () => {
    if (obrigatoria && !valor.trim()) return;
    if (valor.trim()) onConfirmar(valor.trim());
  };
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        confirmar();
      }}
    >
      <label htmlFor={id} className="text-[15px] font-medium leading-snug">
        {pergunta}
      </label>
      <div className="group relative flex items-center">
        <input
          id={id}
          value={valor}
          autoComplete="off"
          inputMode={inputMode}
          placeholder={placeholder}
          onChange={(e) => setValor(e.target.value)}
          onBlur={confirmar}
          className="h-12 w-full rounded-lg border border-[var(--status-warning)]/50 bg-[var(--nexodoc-recessed)] px-4 pr-12 text-lg font-medium tracking-wide outline-none transition-[border-color,box-shadow] duration-[var(--duration-base)] placeholder:text-base placeholder:font-normal placeholder:text-muted-foreground/60 focus:border-[var(--ds-nexo)] focus:shadow-[0_0_0_4px_rgb(139_124_246/0.18)]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 inline-flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-[11px] text-muted-foreground opacity-0 transition-opacity group-focus-within:opacity-100"
        >
          <CornerDownLeft className="h-3 w-3" /> Enter
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{ajuda}</span>
        {extra}
      </div>
    </form>
  );
}

export function PerguntasAntesDeGerar({
  volume,
  faltaVolume,
  temBairro,
  bairro,
  onVolume,
  onBairro,
}: {
  /** O número já decidido ("" = ninguém decidiu). */
  volume: string;
  /** O Gerar está travado esperando o volume. */
  faltaVolume: boolean;
  /** O modelo da prefeitura imprime `{{BAIRRO}}` (Criciúma). */
  temBairro: boolean;
  bairro: string;
  onVolume: (v: string) => void;
  onBairro: (v: string) => void;
}) {
  const reduzido = useReducedMotion();
  const [mudandoVolume, setMudandoVolume] = useState(false);
  // "Não tem bairro" é uma RESPOSTA: sem isto, a pergunta voltaria a cada render.
  const [semBairro, setSemBairro] = useState(false);
  const [mudandoBairro, setMudandoBairro] = useState(false);

  const volumeRespondido = !faltaVolume && volume.trim() !== "" && !mudandoVolume;
  const bairroRespondido = (bairro.trim() !== "" || semBairro) && !mudandoBairro;
  const pendente = !volumeRespondido || (temBairro && !bairroRespondido);

  const entrada = reduzido
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 8, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -6, transition: { duration: DURACAO.state, ease: CURVA.exit } },
      };

  return (
    <motion.section
      layout={!reduzido}
      transition={MOLA.smooth}
      className={`flex flex-col gap-4 rounded-xl border p-4 transition-colors duration-[var(--duration-base)] ${
        pendente
          ? "border-[var(--status-warning)]/50 bg-[linear-gradient(180deg,rgb(224_164_58/0.08),transparent)]"
          : "border-border"
      }`}
      aria-label="Antes de gerar"
      data-prova="perguntas-antes-de-gerar"
    >
      <AnimatePresence mode="popLayout" initial={!reduzido}>
        {volumeRespondido ? (
          <motion.div key="volume-ok" {...entrada} transition={{ duration: DURACAO.enter, ease: CURVA.out }}>
            <Respondida texto={`Volume ${volume}`} onMudar={() => setMudandoVolume(true)} />
          </motion.div>
        ) : (
          <motion.div key="volume-pergunta" {...entrada} transition={{ duration: DURACAO.layout, ease: CURVA.out }}>
            <CampoDaPergunta
              id="pergunta-volume"
              pergunta="Esses documentos são de qual volume?"
              ajuda="Sai na capa como “VOLUME N”. Sem ele, o Gerar não libera."
              placeholder="Número do volume — ex.: 3"
              inicial={volume}
              inputMode="numeric"
              obrigatoria
              onConfirmar={(v) => {
                onVolume(v);
                setMudandoVolume(false);
              }}
            />
          </motion.div>
        )}

        {temBairro &&
          (bairroRespondido ? (
            <motion.div key="bairro-ok" {...entrada} transition={{ duration: DURACAO.enter, ease: CURVA.out }}>
              <Respondida
                texto={bairro.trim() ? `Bairro: ${bairro.trim()}` : "Sem bairro na capa"}
                onMudar={() => setMudandoBairro(true)}
              />
            </motion.div>
          ) : (
            <motion.div key="bairro-pergunta" {...entrada} transition={{ duration: DURACAO.layout, ease: CURVA.out, delay: reduzido ? 0 : 0.08 }}>
              <CampoDaPergunta
                id="pergunta-bairro"
                pergunta="Qual é o bairro da obra?"
                ajuda="A capa de Criciúma traz o bairro abaixo do nome da obra."
                placeholder="ex.: Bairro Jardim Maristela"
                inicial={bairro}
                onConfirmar={(v) => {
                  onBairro(v);
                  setSemBairro(false);
                  setMudandoBairro(false);
                }}
                extra={
                  <button
                    type="button"
                    onClick={() => {
                      onBairro("");
                      setSemBairro(true);
                      setMudandoBairro(false);
                    }}
                    className="ml-auto shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-xs text-muted-foreground underline-offset-2 hover:bg-accent hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
                  >
                    Não tem bairro
                  </button>
                }
              />
            </motion.div>
          ))}
      </AnimatePresence>
    </motion.section>
  );
}
