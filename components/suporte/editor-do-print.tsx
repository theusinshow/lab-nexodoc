"use client";

import { Eraser, Highlighter, Undo2 } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as PE } from "react";

import { Botao, Segmento } from "@/components/ds/basicos";

/*
 * RISCAR E BORRAR o print antes de mandar. As marcas ficam numa lista à parte
 * (desfazer é tirar a última) e só viram pixels no "Usar este print": o borrão
 * é pixelado a partir da imagem original e sai IRREVERSÍVEL no arquivo enviado.
 */
type Ponto = { x: number; y: number };
type Marca = { tipo: "risco"; pontos: Ponto[] } | { tipo: "borrao"; de: Ponto; ate: Ponto };
type Ferramenta = "risco" | "borrao";

const COR_DO_RISCO = "#ffb224";
const BLOCO = 14;

function desenhar(ctx: CanvasRenderingContext2D, img: HTMLImageElement, marcas: Marca[], extra: Marca | null) {
  const { width: w, height: h } = ctx.canvas;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, w, h);
  for (const m of extra ? [...marcas, extra] : marcas) {
    if (m.tipo === "borrao") {
      const x = Math.min(m.de.x, m.ate.x);
      const y = Math.min(m.de.y, m.ate.y);
      const lw = Math.abs(m.ate.x - m.de.x);
      const lh = Math.abs(m.ate.y - m.de.y);
      if (lw < 2 || lh < 2) continue;
      const pw = Math.max(1, Math.round(lw / BLOCO));
      const ph = Math.max(1, Math.round(lh / BLOCO));
      const tmp = document.createElement("canvas");
      tmp.width = pw;
      tmp.height = ph;
      tmp.getContext("2d")!.drawImage(img, (x / w) * img.naturalWidth, (y / h) * img.naturalHeight, (lw / w) * img.naturalWidth, (lh / h) * img.naturalHeight, 0, 0, pw, ph);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tmp, 0, 0, pw, ph, x, y, lw, lh);
      ctx.imageSmoothingEnabled = true;
    } else if (m.pontos.length > 1) {
      ctx.strokeStyle = COR_DO_RISCO;
      ctx.lineWidth = Math.max(3, w / 300);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(m.pontos[0].x, m.pontos[0].y);
      for (const p of m.pontos.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  }
}

export function EditorDoPrint({ src, onPronto, onCancelar }: { src: string; onPronto: (dataUrl: string) => void; onCancelar: () => void }) {
  const tela = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [ferramenta, setFerramenta] = useState<Ferramenta>("borrao");
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const atual = useRef<Marca | null>(null);

  useEffect(() => {
    const i = new Image();
    i.onload = () => setImg(i);
    i.src = src;
  }, [src]);

  const redesenhar = () => {
    const c = tela.current;
    if (!c || !img) return;
    desenhar(c.getContext("2d")!, img, marcas, atual.current);
  };
  useEffect(() => {
    const c = tela.current;
    if (!c || !img) return;
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    redesenhar();
  }, [img]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(redesenhar, [marcas]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && (e.stopPropagation(), onCancelar());
    document.addEventListener("keydown", esc, true);
    return () => document.removeEventListener("keydown", esc, true);
  }, [onCancelar]);

  const ponto = (e: PE<HTMLCanvasElement>): Ponto => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * e.currentTarget.width, y: ((e.clientY - r.top) / r.height) * e.currentTarget.height };
  };

  return (
    <div className="sp-editor" role="dialog" aria-modal="true" aria-label="Editar o print" data-suporte-fora="1">
      <div className="sp-editor-barra">
        <Segmento<Ferramenta>
          rotulo="Ferramenta"
          valor={ferramenta}
          onTroca={setFerramenta}
          opcoes={[
            {
              valor: "borrao",
              rotulo: (
                <>
                  <Eraser size={14} aria-hidden /> Borrar
                </>
              ),
            },
            {
              valor: "risco",
              rotulo: (
                <>
                  <Highlighter size={14} aria-hidden /> Riscar
                </>
              ),
            },
          ]}
        />
        <Botao variante="quiet" onClick={() => setMarcas((m) => m.slice(0, -1))} disabled={!marcas.length}>
          <Undo2 size={14} aria-hidden /> Desfazer
        </Botao>
        <span className="sp-editor-dica">Borre o que não deve sair daqui: nomes, valores, dados de cliente.</span>
        <Botao variante="ghost" onClick={onCancelar}>
          Cancelar
        </Botao>
        <Botao variante="primary" onClick={() => tela.current && onPronto(tela.current.toDataURL("image/webp", 0.8))} disabled={!img}>
          Usar este print
        </Botao>
      </div>
      <div className="sp-editor-palco">
        <canvas
          ref={tela}
          className="sp-editor-tela"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            const p = ponto(e);
            atual.current = ferramenta === "risco" ? { tipo: "risco", pontos: [p] } : { tipo: "borrao", de: p, ate: p };
          }}
          onPointerMove={(e) => {
            const m = atual.current;
            if (!m) return;
            const p = ponto(e);
            if (m.tipo === "risco") m.pontos.push(p);
            else m.ate = p;
            redesenhar();
          }}
          onPointerUp={() => {
            const m = atual.current;
            atual.current = null;
            if (m) setMarcas((lista) => [...lista, m]);
          }}
        />
      </div>
    </div>
  );
}
