"use client";

/**
 * ONDE AS LDs FICAM NA REDE (08/10/2026).
 *
 * O rodapé de toda LD do escritório traz o caminho do próprio `.odt`
 * (`P:\cad\pmcriciuma\116_25\eletrico\documentos\1_emissão inicial_out-25\…`).
 * Tudo nele é deduzido menos a pasta da EMISSÃO, que cada um escreve do seu
 * jeito e que varia até entre disciplinas do mesmo volume. Então:
 *
 * - fechada por padrão, já com a sugestão — quem não liga não clica;
 * - o campo do topo vale para todas; cada linha pode ter a sua ("própria");
 * - colar o endereço do Explorer em qualquer campo vence a dedução.
 *
 * Opcional: nunca trava o Gerar. Spec: 2026-10-08-caminho-da-rede-na-ld-design.
 */
import { Check, ClipboardPaste, FolderTree, Pencil, Undo2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import {
  aplicarColado,
  baseDeduzida,
  caminhoDaLd,
  separarCaminhoColado,
  sugerirEmissao,
  type RedeDaLd,
} from "@/lib/ld/caminho-da-rede";
import { CURVA, DURACAO } from "@/lib/ds/movimento";

/** `P:\cad\pmcriciuma\116_25\eletrico\documentos` → `…\116_25\eletrico\documentos\` */
function fimDaBase(base: string, partes = 3): string {
  const segs = base.split("\\").filter(Boolean);
  const fim = segs.slice(-partes).join("\\");
  return `${segs.length > partes ? "…\\" : ""}${fim}\\`;
}

/** Um campo de emissão que aceita colar um caminho inteiro. */
function CampoDaEmissao({
  id,
  rotulo,
  inicial,
  onConfirmar,
  onColar,
  autoFocus,
}: {
  id: string;
  rotulo: string;
  inicial: string;
  onConfirmar: (v: string) => void;
  /** Devolve `true` quando o texto colado era um caminho (e já foi aplicado). */
  onColar: (texto: string) => boolean;
  autoFocus?: boolean;
}) {
  const [valor, setValor] = useState(inicial);
  return (
    <input
      id={id}
      aria-label={rotulo}
      value={valor}
      autoFocus={autoFocus}
      autoComplete="off"
      spellCheck={false}
      onChange={(e) => setValor(e.target.value)}
      onPaste={(e) => {
        if (onColar(e.clipboardData.getData("text"))) e.preventDefault();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onConfirmar(valor.trim());
        }
        if (e.key === "Escape") onConfirmar(inicial);
      }}
      onBlur={() => onConfirmar(valor.trim())}
      className="h-9 min-w-0 flex-1 rounded-md border border-border bg-[var(--nexodoc-recessed)] px-2.5 font-mono text-[13px] outline-none transition-[border-color,box-shadow] duration-[var(--duration-base)] focus:border-[var(--ds-nexo)] focus:shadow-[0_0_0_3px_rgb(139_124_246/0.18)]"
    />
  );
}

export function PerguntaDaRede({
  cliente,
  codigo,
  revisao,
  mes,
  ano,
  disciplinas,
  rede,
  onMudar,
}: {
  /** O id do modelo da capa (`pmcriciuma`) — a pasta do cliente. "" = sem modelo. */
  cliente: string;
  codigo: string;
  revisao: string;
  mes?: string;
  ano?: string;
  /** As siglas das disciplinas que geram LD, na ordem do volume. */
  disciplinas: string[];
  /** A decisão guardada (sem mês/ano). */
  rede: RedeDaLd;
  onMudar: (rede: RedeDaLd) => void;
}) {
  const reduzido = useReducedMotion();
  const [aberta, setAberta] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);

  const varias = disciplinas.length > 1;
  const sugestao = sugerirEmissao(revisao, mes, ano);
  const emissaoDoTopo = rede.emissao ?? sugestao;
  const comData: RedeDaLd = { ...rede, mes, ano };
  const clienteEfetivo = rede.cliente?.trim() || cliente;
  const proprias = Object.keys(rede.porDisciplina ?? {}).filter((d) => disciplinas.includes(d));

  const linhas = disciplinas.map((d) => {
    const ajuste = rede.porDisciplina?.[d];
    const base = ajuste?.base?.trim() || baseDeduzida({ cliente: clienteEfetivo, codigo, disciplina: d });
    const emissao = ajuste?.emissao ?? emissaoDoTopo;
    const completo = caminhoDaLd({ cliente, codigo, disciplina: d, revisao, rede: comData });
    return { d, base, emissao, completo, propria: Boolean(ajuste) };
  });
  const semCliente = linhas.every((l) => !l.base);

  const mudar = (proxima: RedeDaLd) => {
    // Guardar a sugestão como decisão a congelaria: mudar o mês da capa
    // deixaria de mudar a pasta. Igual à sugestão = não decidido.
    const limpa: RedeDaLd = { ...proxima };
    if (limpa.emissao === sugestao) delete limpa.emissao;
    onMudar(limpa);
  };

  const colar = (texto: string, alvo?: string): boolean => {
    const colado = separarCaminhoColado(texto);
    if (!colado) return false;
    mudar(aplicarColado(rede, colado, disciplinas, alvo));
    setEditando(null);
    return true;
  };

  const definirEmissaoDaLinha = (d: string, v: string) => {
    setEditando(null);
    if (!varias) return mudar({ ...rede, emissao: v });
    if (v === emissaoDoTopo && !rede.porDisciplina?.[d]?.base) return voltar(d);
    const por = { ...(rede.porDisciplina ?? {}) };
    por[d] = { ...por[d], emissao: v };
    mudar({ ...rede, porDisciplina: por });
  };

  const voltar = (d: string) => {
    const por = { ...(rede.porDisciplina ?? {}) };
    delete por[d];
    mudar({ ...rede, porDisciplina: Object.keys(por).length > 0 ? por : undefined });
  };

  const resumo = semCliente
    ? "Na rede: falta a pasta do cliente"
    : `Na rede: ${fimDaBase(linhas[0].base, 1)}${emissaoDoTopo ? `${emissaoDoTopo}\\` : ""}`;

  return (
    <section
      className="flex flex-col gap-3 rounded-xl border border-border p-4"
      aria-label="Onde as LDs ficam na rede"
      data-prova="pergunta-da-rede"
    >
      {!aberta ? (
        <div className="flex items-center gap-2 text-sm">
          {semCliente ? (
            <FolderTree className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <Check className="h-4 w-4 shrink-0 text-[var(--status-ok)]" aria-hidden />
          )}
          <span className="min-w-0 truncate font-mono text-[13px]" title={linhas.map((l) => l.completo).filter(Boolean).join("\n")}>
            {resumo}
          </span>
          {varias && (
            <span className="shrink-0 text-xs text-muted-foreground">
              · {disciplinas.length} disciplinas{proprias.length > 0 ? ` · ${proprias.length} própria${proprias.length > 1 ? "s" : ""}` : ""}
            </span>
          )}
          <button
            type="button"
            onClick={() => setAberta(true)}
            className="ml-auto inline-flex min-h-8 shrink-0 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
          >
            <Pencil className="h-3 w-3" aria-hidden />
            mudar
          </button>
        </div>
      ) : (
        <AnimatePresence initial={!reduzido}>
          <motion.div
            key="aberta"
            initial={reduzido ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURACAO.enter, ease: CURVA.out }}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1">
              <p className="text-[15px] font-medium leading-snug">Onde as LDs ficam na rede?</p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ClipboardPaste className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Cole o endereço da pasta (do Explorer) ou escreva o nome da pasta desta emissão.
              </p>
            </div>

            {varias && (
              <div className="flex items-center gap-2">
                <label htmlFor="rede-emissao-topo" className="shrink-0 text-xs text-muted-foreground">
                  Pasta desta emissão
                </label>
                <CampoDaEmissao
                  key={`topo:${emissaoDoTopo}`}
                  id="rede-emissao-topo"
                  rotulo="Pasta desta emissão, para todas as disciplinas"
                  inicial={emissaoDoTopo}
                  onConfirmar={(v) => mudar({ ...rede, emissao: v })}
                  onColar={(t) => colar(t)}
                />
              </div>
            )}

            <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {linhas.map((l) => (
                <li key={l.d || "sem-disciplina"} className="flex min-h-11 items-center gap-2 px-3 py-1.5" title={l.completo || undefined}>
                  <span className="w-10 shrink-0 font-mono text-[11px] font-medium uppercase tracking-[0.07em]">
                    {l.d || "LD"}
                  </span>
                  {editando === l.d ? (
                    <CampoDaEmissao
                      id={`rede-emissao-${l.d}`}
                      rotulo={`Pasta da emissão de ${l.d.toUpperCase()}`}
                      inicial={l.emissao}
                      autoFocus
                      onConfirmar={(v) => definirEmissaoDaLinha(l.d, v)}
                      onColar={(t) => colar(t, l.d)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditando(l.d)}
                      className="flex min-w-0 flex-1 items-baseline gap-0.5 rounded-md px-1 py-1 text-left font-mono text-[13px] hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
                    >
                      {l.base ? (
                        <>
                          <span className="min-w-0 truncate text-muted-foreground">{fimDaBase(l.base)}</span>
                          <span className="shrink-0 text-foreground">{l.emissao || "—"}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">sem pasta do cliente — cole o caminho aqui</span>
                      )}
                    </button>
                  )}
                  {varias && l.propria && editando !== l.d && (
                    <button
                      type="button"
                      onClick={() => voltar(l.d)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
                      title="Voltar a seguir a pasta desta emissão"
                    >
                      própria · <Undo2 className="h-3 w-3" aria-hidden /> voltar
                    </button>
                  )}
                </li>
              ))}
            </ul>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setEditando(null);
                  setAberta(false);
                }}
                className="inline-flex min-h-8 items-center gap-1 rounded-md px-3 text-xs font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
                Pronto
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </section>
  );
}
