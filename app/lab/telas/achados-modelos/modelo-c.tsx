"use client";

/**
 * MODELO C — "Documento primeiro".
 *
 * O memorial no centro, grande, com o trecho grifado. À esquerda as PÁGINAS
 * que têm achado (com os pontos de gravidade); à direita os achados daquela
 * página e o aberto, com as ações. Para quem revisa o documento folha a folha,
 * na ordem em que ele vai ser corrigido.
 */
import { ChevronLeft, ChevronRight, Expand, Minus, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { Botao } from "@/components/ds/basicos";
import { candidatosDoGrifo } from "@/lib/grifo-do-achado";
import { NIVEIS } from "@/lib/nivel-do-achado";

import {
  AbasDoAchado,
  AcoesDoAchado,
  BarraDeSelecao,
  BotaoDeExibicao,
  Busca,
  CabecaDoAchado,
  FaixasDoAchado,
  Faltou,
  LinhaDoAchado,
  Notificar,
  PainelDeExibicao,
  Partes,
  Responsavel,
  SituacaoNoSeletor,
  SugestoesDaIA,
} from "@/components/telas/resultado/fila-a/pecas";
import type { Fila } from "@/components/telas/resultado/fila-a/use-fila";

const AuditPdfViewer = dynamic(() => import("@/components/audit-pdf-viewer-internal"), {
  ssr: false,
  loading: () => <div className="am-c-carregando">Abrindo o memorial…</div>,
});

const ZOOMS = [1, 1.25, 1.5, 1.75];

export function ModeloC({ f }: { f: Fila }) {
  const [exibicao, setExibicao] = useState(false);
  const [zoom, setZoom] = useState(1.25);
  // A página escolhida na régua; sem escolha (ou trocou o achado), a do achado aberto.
  const [escolhida, setEscolhida] = useState<{ pagina: number; doAchado: string | null } | null>(null);
  const a = f.atual;
  const pagina = escolhida && escolhida.doAchado === (a?.chave ?? null) ? escolhida.pagina : (a?.paginas[0] ?? 1);

  const { visiveis, meusCorrigidos } = f;
  const paginas = useMemo(() => {
    const mapa = new Map<number, typeof visiveis>();
    for (const x of [...visiveis, ...meusCorrigidos]) for (const p of x.paginas) mapa.set(p, [...(mapa.get(p) ?? []), x]);
    return [...mapa.entries()].sort((x, y) => x[0] - y[0]);
  }, [visiveis, meusCorrigidos]);
  const daPagina = paginas.find(([p]) => p === pagina)?.[1] ?? [];
  const fonte = a ? f.fonteDe(a) : null;
  const url = fonte?.tipo === "arquivo" ? fonte.fonte.url : null;

  const irParaPagina = (p: number) => {
    const doP = paginas.find(([n]) => n === p)?.[1] ?? [];
    const alvo = doP.find((x) => !x.desfecho) ?? doP[0];
    if (alvo && alvo.chave !== a?.chave) f.abrir(alvo.chave);
    setEscolhida({ pagina: p, doAchado: alvo?.chave ?? a?.chave ?? null });
  };
  const vizinha = (passo: number) => {
    const i = paginas.findIndex(([p]) => p === pagina);
    const prox = paginas[(i < 0 ? 0 : i + passo + paginas.length) % paginas.length];
    if (prox) irParaPagina(prox[0]);
  };

  return (
    <div className="am-c">
      <aside className="am-c-paginas" aria-label="Páginas com achados">
        <Busca f={f} />
        <SituacaoNoSeletor f={f} />
        <BotaoDeExibicao f={f} aberto={exibicao} onTroca={() => setExibicao(!exibicao)} />
        <PainelDeExibicao f={f} aberto={exibicao} />
        <div className="am-rolagem am-c-regua">
          {paginas.map(([p, xs]) => (
            <button key={p} type="button" className="am-c-pagina" aria-current={p === pagina ? "page" : undefined} onClick={() => irParaPagina(p)}>
              <span className="ds-num">p. {p}</span>
              <span className="am-c-pontos">
                {xs.map((x) => (
                  <i key={x.chave} className={`rs-ponto rs-ponto--${x.nivel}${x.desfecho ? " am-c-ponto-feito" : ""}`} title={`${x.id} — ${NIVEIS.find((n) => n.id === x.nivel)?.nome}`} />
                ))}
              </span>
            </button>
          ))}
          {paginas.length === 0 && <p className="rs-nota">Nenhuma página com achado nesse filtro.</p>}
          <SugestoesDaIA f={f} />
        </div>
        <Notificar f={f} compacto />
        <Faltou f={f} />
      </aside>

      <section className="am-c-documento" aria-label="O memorial">
        <div className="am-c-barra">
          <Botao variante="quiet" tamanho="sm" icone aria-label="Página com achado anterior" onClick={() => vizinha(-1)}>
            <ChevronLeft />
          </Botao>
          <span className="ds-num">Página {pagina}</span>
          <Botao variante="quiet" tamanho="sm" icone aria-label="Próxima página com achado" onClick={() => vizinha(1)}>
            <ChevronRight />
          </Botao>
          <span className="am-c-barra-meio" />
          <Botao variante="quiet" tamanho="sm" icone aria-label="Diminuir" disabled={zoom === ZOOMS[0]} onClick={() => setZoom(ZOOMS[Math.max(0, ZOOMS.indexOf(zoom) - 1)])}>
            <Minus />
          </Botao>
          <span className="ds-num">{Math.round(zoom * 100)}%</span>
          <Botao variante="quiet" tamanho="sm" icone aria-label="Aumentar" disabled={zoom === ZOOMS[ZOOMS.length - 1]} onClick={() => setZoom(ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(zoom) + 1)])}>
            <Plus />
          </Botao>
          {a && (
            <Botao variante="ghost" tamanho="sm" onClick={() => f.onVerNoMemorial(a.chave, pagina)}>
              <Expand /> Tela cheia
            </Botao>
          )}
        </div>
        <div className="am-c-folha">
          {url && a ? <AuditPdfViewer url={url} page={pagina} highlight={candidatosDoGrifo(a.bruto, pagina)} zoom={zoom} /> : <p className="rs-nota">Sem o arquivo do memorial neste ambiente.</p>}
        </div>
      </section>

      <section className="am-c-lado" aria-label="Achados da página">
        <h3 className="am-c-titulo">
          Na p. {pagina} · {daPagina.length === 1 ? "1 achado" : `${daPagina.length} achados`}
        </h3>
        <div className="am-c-dapagina">
          {daPagina.map((x) => (
            <LinhaDoAchado key={x.chave} f={f} a={x} onAbrir={() => (f.abrir(x.chave), setEscolhida({ pagina, doAchado: x.chave }))} />
          ))}
        </div>
        <BarraDeSelecao f={f} flutuante={false} />
        {a && (
          <div className="am-rolagem am-c-detalhe" key={a.chave}>
            <CabecaDoAchado f={f} a={a} />
            <h2>{a.titulo}</h2>
            <FaixasDoAchado f={f} a={a} compacta />
            <Responsavel f={f} a={a} verNoMemorial={false} />
            <Partes f={f} a={a} />
            <AbasDoAchado f={f} a={a} />
          </div>
        )}
        {a && (
          <footer className="am-c-acoes">
            <AcoesDoAchado f={f} a={a} compacta />
          </footer>
        )}
      </section>
    </div>
  );
}
