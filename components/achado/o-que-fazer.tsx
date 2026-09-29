"use client";

/**
 * O BLOCO "O QUE FAZER" — e, dentro dele, o texto corrigido.
 *
 * Era escrito duas vezes (cartão do motor e cartão legado, idênticos). Virou um
 * componente só porque ganhou comportamento: o botão pequeno "texto corrigido"
 * no cabeçalho, e a caixa que abre EMBAIXO, dentro do próprio bloco.
 *
 * Embaixo, e não flutuando, por três motivos combinados com o Matheus em
 * 29/09/2026: o painel do achado é estreito e um balão cobriria a Evidência —
 * que é o que a pessoa compara; o conteúdo são dois textos e dois botões; e a
 * caixa precisa continuar aberta enquanto a pessoa vai ao ODT e volta.
 *
 * O botão só aparece quando `podeGerarTextoCorrigido` deixa (1 ou 2 citações).
 * Achado que já tem o texto gravado abre na hora, sem chamada.
 */
import { useId, useState } from "react";
import { Check, Copy, Sparkles, Wrench } from "lucide-react";

import {
  diferencaPorPalavra,
  podeGerarTextoCorrigido,
  textoAindaVale,
  type TextoCorrigido,
  type Trecho,
} from "@/lib/texto-corrigido";
import { cn } from "@/lib/utils";

export type CorretorDoAchado = {
  auditId?: string;
  findingId: string;
  achado: {
    evidencia?: string | null;
    descricao?: string | null;
    conflito?: string | null;
    sugestao_correcao?: string | null;
  };
  /** O texto já gravado no achado, quando alguém pediu antes. */
  inicial?: TextoCorrigido;
  /** Para o dono do parecer fundir o texto no IndexedDB. */
  aoGerar?: (findingId: string, texto: TextoCorrigido) => void;
};

type Fase =
  | { fase: "ocioso" }
  | { fase: "gerando" }
  | { fase: "pronto"; texto: TextoCorrigido }
  | { fase: "falha"; erro: string };

const LINK =
  "inline-flex w-fit items-center gap-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--nexodoc-accent)] underline-offset-2 outline-none hover:underline focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function Grifado({ trechos, lado }: { trechos: Trecho[]; lado: "antes" | "depois" }) {
  return (
    <>
      {trechos.map((t, i) =>
        t.mudou ? (
          lado === "antes" ? (
            <del key={i} className="bg-[var(--status-critical-bg)] text-[var(--status-critical)] decoration-[var(--status-critical)]">
              {t.texto}
            </del>
          ) : (
            <ins key={i} className="bg-[var(--status-ok-bg)] font-semibold text-[var(--status-ok)] no-underline">
              {t.texto}
            </ins>
          )
        ) : (
          <span key={i}>{t.texto}</span>
        ),
      )}
    </>
  );
}

export function OQueFazer({ acao, corretor }: { acao: string; corretor?: CorretorDoAchado }) {
  const idDaCaixa = useId();
  const elegivel = Boolean(corretor && podeGerarTextoCorrigido(corretor.achado));
  const [aberto, setAberto] = useState(false);
  const [estado, setEstado] = useState<Fase>(() =>
    textoAindaVale(corretor?.inicial) ? { fase: "pronto", texto: corretor!.inicial! } : { fase: "ocioso" },
  );
  const [copiado, setCopiado] = useState<"procure" | "substitua" | null>(null);

  async function gerar() {
    if (!corretor) return;
    setEstado({ fase: "gerando" });
    try {
      const resposta = await fetch("/api/audit/texto-corrigido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditId: corretor.auditId,
          findingId: corretor.findingId,
          achado: corretor.achado,
        }),
      });
      const corpo = (await resposta.json().catch(() => ({}))) as {
        texto?: TextoCorrigido;
        error?: string;
      };
      if (!resposta.ok || !corpo.texto) {
        setEstado({ fase: "falha", erro: corpo.error || "Não foi possível gerar agora." });
        return;
      }
      setEstado({ fase: "pronto", texto: corpo.texto });
      corretor.aoGerar?.(corretor.findingId, corpo.texto);
    } catch {
      setEstado({ fase: "falha", erro: "Sem conexão com o servidor." });
    }
  }

  function alternar() {
    const abrir = !aberto;
    setAberto(abrir);
    if (abrir && estado.fase === "ocioso") void gerar();
  }

  async function copiar(qual: "procure" | "substitua", texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(qual);
      window.setTimeout(() => setCopiado((atual) => (atual === qual ? null : atual)), 2000);
    } catch {
      setCopiado(null);
    }
  }

  const troca = estado.fase === "pronto" && estado.texto.tipo === "troca" ? estado.texto : null;
  const grifo = troca ? diferencaPorPalavra(troca.procure_por, troca.substitua_por) : null;

  return (
    <section className="nx-cut-6 bg-[var(--status-warning-bg)]/70 p-3">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-[var(--status-warning)]">
          <Wrench className="size-4" aria-hidden />
          <h4 className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em]">O que fazer</h4>
        </div>
        {elegivel ? (
          <button
            type="button"
            onClick={alternar}
            aria-expanded={aberto}
            aria-controls={idDaCaixa}
            className={cn(LINK, "ml-auto")}
          >
            <Sparkles className="size-3.5" aria-hidden />
            Texto corrigido
          </button>
        ) : null}
      </div>
      <p className="max-w-[68ch] text-sm leading-6 text-[var(--status-warning)]">{acao}</p>

      {elegivel && aberto ? (
        <div id={idDaCaixa} className="nx-cut-5 mt-3 grid gap-3 bg-card p-3">
          {estado.fase === "gerando" || estado.fase === "ocioso" ? (
            <p className="text-sm text-muted-foreground" role="status">
              Gerando texto corrigido…
            </p>
          ) : null}

          {estado.fase === "falha" ? (
            <div className="grid gap-2">
              <p className="text-sm text-foreground" role="alert">
                {estado.erro}
              </p>
              <button type="button" onClick={() => void gerar()} className={LINK}>
                Tentar de novo
              </button>
            </div>
          ) : null}

          {estado.fase === "pronto" && estado.texto.tipo === "sem-troca" ? (
            <p className="text-sm text-muted-foreground">{estado.texto.motivo}</p>
          ) : null}

          {troca && grifo ? (
            <>
              <div className="grid gap-1">
                <div className="flex items-center gap-2">
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Procure por <span className="normal-case tracking-normal">(Ctrl+F no ODT)</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => void copiar("procure", troca.procure_por)}
                    className={cn(LINK, "ml-auto")}
                    aria-label="Copiar o trecho a procurar"
                  >
                    {copiado === "procure" ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                    {copiado === "procure" ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <p className="max-w-[70ch] text-sm leading-6 text-foreground">
                  <Grifado trechos={grifo.antes} lado="antes" />
                </p>
              </div>

              <div className="grid gap-1">
                <div className="flex items-center gap-2">
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Substitua por
                  </p>
                  <button
                    type="button"
                    onClick={() => void copiar("substitua", troca.substitua_por)}
                    className={cn(LINK, "ml-auto")}
                    aria-label="Copiar o texto corrigido"
                  >
                    {copiado === "substitua" ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                    {copiado === "substitua" ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <p className="max-w-[70ch] text-sm leading-6 text-foreground">
                  <Grifado trechos={grifo.depois} lado="depois" />
                </p>
              </div>

              <p className="text-xs text-muted-foreground">Gerado por IA — confira antes de colar.</p>
            </>
          ) : null}

          <span className="sr-only" aria-live="polite">
            {copiado === "procure"
              ? "Trecho a procurar copiado."
              : copiado === "substitua"
                ? "Texto corrigido copiado."
                : ""}
          </span>
        </div>
      ) : null}
    </section>
  );
}
