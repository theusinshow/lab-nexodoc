"use client";

import { getViewportForBounds, useReactFlow, useStore, type Node } from "@xyflow/react";
import { useEffect, useMemo, useRef, useState } from "react";

/*
 * O MAPA QUE ANDA. Quando uma mensagem reorganiza o volume, nada pula: as
 * folhas DESLIZAM do lugar antigo para o novo (e as setas vão junto, porque a
 * posição é do React Flow, não um efeito por cima), o que nasce sobe e
 * aparece, o que sai encolhe e some. A câmera vai, no mesmo ritmo, para o
 * trecho que a mensagem mexeu.
 */

/** A mesma curva do resto da tela (sai rápido, pousa devagar). */
const pousa = (t: number) => 1 - Math.pow(1 - t, 4);

/** As posições andam do que está na tela até o alvo. Devolve os nós do quadro atual. */
export function useNosQueAndam(alvo: Node[], duracao: number): Node[] {
  const [nos, setNos] = useState<Node[]>(() => alvo);
  const naTela = useRef<Node[]>(alvo);
  /** O que nasceu nesta tela, com o atraso da escada: a classe fica até a tela sair. */
  const nasceu = useRef(new Map<string, string>());
  const primeira = useRef(true);

  useEffect(() => {
    const vestir = (n: Node, pos: Node["position"]): Node => {
      const atraso = nasceu.current.get(n.id);
      return atraso === undefined ? { ...n, position: pos } : { ...n, position: pos, className: "nw-nasce", style: { ...n.style, ["--atraso" as string]: atraso } };
    };
    if (primeira.current) {
      primeira.current = false;
      naTela.current = alvo;
      setNos(alvo);
      return;
    }

    const antes = new Map(naTela.current.map((n) => [n.id, n]));
    const ficam = new Set(alvo.map((n) => n.id));

    // O que nasce: sobe e aparece, em escada curta, já no lugar novo.
    let i = 0;
    for (const n of alvo) if (!antes.has(n.id) && !nasceu.current.has(n.id)) nasceu.current.set(n.id, `${Math.min(i++ * 0.03, 0.9) * (duracao / 1.1)}s`);
    const alvoMarcado = alvo;

    // O que sai: fica no lugar enquanto encolhe, e depois some.
    const saindo = naTela.current.filter((n) => !ficam.has(n.id)).map((n) => ({ ...n, className: "nw-sai" }));
    let tiraSaindo: ReturnType<typeof setTimeout> | undefined;
    if (saindo.length) tiraSaindo = setTimeout(() => setNos((atual) => atual.filter((n) => n.className !== "nw-sai")), 500 * (duracao / 1.1));

    const de = new Map(alvoMarcado.map((n) => [n.id, antes.get(n.id)?.position ?? n.position]));
    const anda = alvoMarcado.some((n) => {
      const p = de.get(n.id)!;
      return p.x !== n.position.x || p.y !== n.position.y;
    });

    const quadro = (t: number) =>
      alvoMarcado.map((n) => {
        const p = de.get(n.id)!;
        const e = pousa(t);
        return vestir(n, { x: p.x + (n.position.x - p.x) * e, y: p.y + (n.position.y - p.y) * e });
      });

    if (!anda || duracao === 0) {
      const fim = quadro(1);
      naTela.current = fim;
      setNos([...fim, ...saindo]);
      return () => tiraSaindo && clearTimeout(tiraSaindo);
    }

    let raf = 0;
    const inicio = performance.now();
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / (duracao * 1000));
      const q = quadro(t);
      naTela.current = q;
      setNos(t < 1 ? [...q, ...saindo] : q);
      if (t < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => {
      cancelAnimationFrame(raf);
      if (tiraSaindo) clearTimeout(tiraSaindo);
    };
  }, [alvo, duracao]);

  return nos;
}

const TAMANHO_PADRAO = { width: 140, height: 50 };

/** A caixa que contém os nós do foco (ou todos), nas posições de DESTINO. */
function caixaDe(nos: Node[], foco?: string[]) {
  const escolhidos = foco?.length ? nos.filter((n) => foco.includes(n.id)) : nos.filter((n) => n.type === "folha" || n.type === "doc" || n.type === "rotulo");
  if (!escolhidos.length) return null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const n of escolhidos) {
    const w = n.width ?? TAMANHO_PADRAO.width;
    const h = n.height ?? TAMANHO_PADRAO.height;
    x0 = Math.min(x0, n.position.x);
    y0 = Math.min(y0, n.position.y);
    x1 = Math.max(x1, n.position.x + w);
    y1 = Math.max(y1, n.position.y + h);
  }
  return { x: Math.round(x0), y: Math.round(y0), width: Math.round(x1 - x0), height: Math.round(y1 - y0) };
}

/**
 * A CÂMERA vai para o trecho que mudou, pela posição de destino (não espera a
 * folha chegar). Na primeira vez, corta direto; depois, viaja. Devolve se já
 * enquadrou, para o palco só aparecer enquadrado.
 */
export function useCamera(alvo: Node[], foco: string[] | undefined, zoomMaximo: number, duracao: number) {
  const { setViewport } = useReactFlow();
  const largura = useStore((s) => s.width);
  const altura = useStore((s) => s.height);
  const caixa = useMemo(() => caixaDe(alvo, foco), [alvo, foco]);
  const [pronto, setPronto] = useState(false);
  const jaFoi = useRef(false);
  const chave = caixa ? `${caixa.x},${caixa.y},${caixa.width},${caixa.height}` : "";

  useEffect(() => {
    if (!caixa || !largura || !altura) return;
    const vp = getViewportForBounds(caixa, largura, altura, 0.08, zoomMaximo, 0.08);
    setViewport(vp, { duration: jaFoi.current ? duracao * 1000 : 0 });
    if (!jaFoi.current) {
      jaFoi.current = true;
      setPronto(true);
    }
    // a chave resume a caixa; o resto entra por ela
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, largura, altura, zoomMaximo]);

  return pronto;
}
