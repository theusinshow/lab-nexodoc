"use client";

/**
 * ANTES DE GERAR, EM PERGUNTAS (06/10/2026). Editar o número do volume dentro
 * da folha da capa não era evidente — o campo âmbar passava despercebido. O
 * plano agora PERGUNTA, em destaque, o que só o engenheiro sabe:
 *
 * 1. "Esses documentos são de qual volume?" — obrigatório (é a trava do Gerar);
 * 2. o bairro, só quando o modelo o imprime (Criciúma, abaixo do título) —
 *    opcional, com "Não tem bairro" como resposta.
 *
 * Respondida, a pergunta encolhe numa linha ("Volume 3 · mudar"). A folha
 * continua embaixo como prévia, já com a resposta no lugar.
 */
import { Check, CircleHelp, Pencil } from "lucide-react";
import { useState } from "react";

const VOLUMES = ["1", "2", "3", "4", "5", "6"];

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
  /** O modelo da prefeitura imprime `{{BAIRRO}}`. */
  temBairro: boolean;
  bairro: string;
  onVolume: (v: string) => void;
  onBairro: (v: string) => void;
}) {
  const [mudandoVolume, setMudandoVolume] = useState(false);
  const [outro, setOutro] = useState("");
  // "Não tem bairro" é uma RESPOSTA: sem isto, a pergunta voltaria a cada render.
  const [semBairro, setSemBairro] = useState(false);
  const [mudandoBairro, setMudandoBairro] = useState(false);
  const [rascunhoBairro, setRascunhoBairro] = useState(bairro);

  const volumeRespondido = !faltaVolume && volume.trim() !== "" && !mudandoVolume;
  const bairroRespondido = (bairro.trim() !== "" || semBairro) && !mudandoBairro;
  const pendente = !volumeRespondido || (temBairro && !bairroRespondido);

  const escolherVolume = (v: string) => {
    const limpo = v.trim();
    if (!limpo) return;
    onVolume(limpo);
    setMudandoVolume(false);
    setOutro("");
  };
  const confirmarBairro = (v: string) => {
    onBairro(v.trim());
    setSemBairro(v.trim() === "");
    setMudandoBairro(false);
  };

  return (
    <section
      className={`flex flex-col gap-3 rounded-md border p-3 ${pendente ? "border-[var(--status-warning)]/60 bg-[var(--status-warning)]/[0.06]" : "border-border"}`}
      aria-label="Antes de gerar"
      data-prova="perguntas-antes-de-gerar"
    >
      {pendente && (
        <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--status-warning)]">
          <CircleHelp className="h-3.5 w-3.5" aria-hidden />
          Antes de gerar
        </span>
      )}

      {volumeRespondido ? (
        <Respondida texto={`Volume ${volume}`} onMudar={() => setMudandoVolume(true)} />
      ) : (
        <div className="flex flex-col gap-2" role="group" aria-labelledby="pergunta-volume">
          <p id="pergunta-volume" className="text-sm font-medium">
            Esses documentos são de qual volume?
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {VOLUMES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => escolherVolume(v)}
                aria-pressed={volume === v}
                className="min-h-9 min-w-9 rounded-md border border-border px-2 font-mono text-sm hover:border-[var(--ds-nexo)] hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 aria-pressed:border-[var(--ds-nexo)]"
              >
                {v}
              </button>
            ))}
            <form
              className="flex items-center gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                escolherVolume(outro);
              }}
            >
              <input
                value={outro}
                onChange={(e) => setOutro(e.target.value)}
                placeholder="outro"
                aria-label="Outro número de volume"
                className="h-9 w-20 rounded-md border border-border bg-transparent px-2 text-sm outline-none focus:border-[var(--ds-nexo)]"
              />
              {outro.trim() && (
                <button type="submit" className="h-9 rounded-md border border-border px-2 text-xs hover:bg-accent">
                  Usar
                </button>
              )}
            </form>
          </div>
          <p className="text-xs text-muted-foreground">Sai na capa como “VOLUME N”. Sem ele, o Gerar não libera.</p>
        </div>
      )}

      {temBairro &&
        (bairroRespondido ? (
          <Respondida texto={bairro.trim() ? `Bairro: ${bairro.trim()}` : "Sem bairro na capa"} onMudar={() => setMudandoBairro(true)} />
        ) : (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              confirmarBairro(rascunhoBairro);
            }}
          >
            <label htmlFor="pergunta-bairro" className="text-sm font-medium">
              A capa traz o bairro abaixo do nome da obra. Qual é o bairro?
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                id="pergunta-bairro"
                value={rascunhoBairro}
                onChange={(e) => setRascunhoBairro(e.target.value)}
                placeholder="ex.: Bairro Jardim Maristela"
                className="h-9 min-w-0 flex-1 rounded-md border border-border bg-transparent px-2 text-sm outline-none focus:border-[var(--ds-nexo)]"
              />
              <button type="submit" disabled={!rascunhoBairro.trim()} className="h-9 rounded-md border border-border px-3 text-xs hover:bg-accent disabled:opacity-40">
                Usar
              </button>
              <button type="button" onClick={() => confirmarBairro("")} className="h-9 rounded-md px-3 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
                Não tem bairro
              </button>
            </div>
          </form>
        ))}
    </section>
  );
}
