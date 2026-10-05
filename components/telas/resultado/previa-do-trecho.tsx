"use client";

/**
 * A PRÉVIA DO TRECHO, dentro do detalhe do achado (05/10/2026).
 *
 * O pedido era "clicar no achado e já ver o PDF marcado". A primeira tentativa
 * abria o visor por cima da tela — e escondia o achado, que é o que se estava
 * lendo. Aqui a página vem RECORTADA em volta do grifo, no próprio detalhe: o
 * achado continua à vista, e o visor grande fica a um clique.
 *
 * O mesmo visor de PDF do visor grande (`audit-pdf-viewer-internal`), com a
 * rolagem contida na caixa — ver `rolagem="contida"` lá.
 */
import { Expand, FileSearch } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

import { candidatosDoGrifo } from "@/lib/grifo-do-achado";

import type { AchadoDaTela } from "./use-parecer-vivo";

const AuditPdfViewer = dynamic(() => import("@/components/audit-pdf-viewer-internal"), {
  ssr: false,
  loading: () => <div className="rs-previa-carregando">Abrindo a página…</div>,
});

export function PreviaDoTrecho({
  achado,
  url,
  onAmpliar,
}: {
  achado: AchadoDaTela;
  url: string;
  /** Abre o visor grande na página mostrada. */
  onAmpliar: (pagina: number) => void;
}) {
  const paginas = [...new Set(achado.paginas)].sort((a, b) => a - b);
  const [escolhida, setEscolhida] = useState<{ chave: string; pagina: number } | null>(null);
  // Troca de achado volta para a página principal dele.
  const pagina = escolhida?.chave === achado.chave ? escolhida.pagina : (achado.paginas[0] ?? 1);
  const [achou, setAchou] = useState<{ pagina: number; sim: boolean } | null>(null);
  // ESTÁVEL, e só grava quando muda: o visor chama isto num efeito que depende
  // da própria função — uma seta nova a cada render virava um laço infinito.
  const aoGrifo = useCallback((sim: boolean, p: number) => {
    setAchou((atual) => (atual?.pagina === p && atual.sim === sim ? atual : { pagina: p, sim }));
  }, []);
  const semGrifo = achou?.pagina === pagina && !achou.sim;

  return (
    <figure className="rs-previa">
      <figcaption>
        <FileSearch size={14} strokeWidth={1.75} aria-hidden />
        <span>Onde está no memorial</span>
        {paginas.length > 1 ? (
          <span className="rs-previa-paginas" role="tablist" aria-label="Página da prévia">
            {paginas.map((p) => (
              <button key={p} type="button" role="tab" aria-selected={p === pagina} onClick={() => setEscolhida({ chave: achado.chave, pagina: p })}>
                p. {p}
              </button>
            ))}
          </span>
        ) : (
          <span className="rs-previa-pagina ds-num">p. {pagina}</span>
        )}
      </figcaption>
      <div className="rs-previa-moldura">
        <button type="button" className="rs-previa-janela" data-previa onClick={() => onAmpliar(pagina)} title="Ampliar no visor do PDF" aria-label={`Ampliar a página ${pagina} no visor do PDF`}>
          <AuditPdfViewer
            url={url}
            page={pagina}
            highlight={candidatosDoGrifo(achado.bruto, pagina)}
            zoom={1.5}
            rolagem="contida"
            onGrifo={aoGrifo}
          />
        </button>
        <span className="rs-previa-ampliar" aria-hidden>
          <Expand size={13} strokeWidth={1.75} /> Ampliar
        </span>
      </div>
      {semGrifo && <p className="rs-previa-nota">O trecho não foi localizado no texto desta página — amplie para conferir.</p>}
    </figure>
  );
}
