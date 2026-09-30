"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Uma cor do sistema, lida AO VIVO do CSS — não uma cópia do valor, que
 * envelheceria no primeiro ajuste de tom. Quando a cor é de texto ou de sinal,
 * mede o contraste contra cada fundo em que ela vai morar e diz se passa.
 *
 * Contraste pelo WCAG 2: 4,5:1 para texto pequeno, 3:1 para texto grande e
 * para elementos gráficos (ícone, borda que carrega sentido). Cor com alfa não
 * é medida: o resultado depende do que está atrás, e um número aqui mentiria.
 */

function lerCor(el: Element, token: string) {
  return getComputedStyle(el).getPropertyValue(token).trim();
}

/** Resolve qualquer cor CSS para [r,g,b,a] pintando num canvas 1x1. */
function rgba(cor: string): [number, number, number, number] | null {
  if (!cor) return null;
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "#000";
  ctx.fillStyle = cor;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
}

function luminancia([r, g, b]: [number, number, number, number]) {
  const f = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contraste(a: string, b: string) {
  const x = rgba(a);
  const y = rgba(b);
  if (!x || !y || x[3] < 1 || y[3] < 1) return null;
  const [l1, l2] = [luminancia(x), luminancia(y)].sort((p, q) => q - p);
  return (l1 + 0.05) / (l2 + 0.05);
}

export function AmostraDeCor({
  token,
  nome,
  papel,
  sobre,
  piso = 4.5,
  alta = false,
}: {
  token: string;
  nome: string;
  papel: string;
  /** Fundos contra os quais medir, como tokens. Vazio: não mede. */
  sobre?: { token: string; nome: string }[];
  /** 4,5 para texto; 3 para gráfico e texto grande. */
  piso?: number;
  /** Amostra alta (superfícies), para ver o plano e não só a cor. */
  alta?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [valor, setValor] = useState("");
  const [medidas, setMedidas] = useState<{ nome: string; razao: number | null }[]>([]);

  useEffect(() => {
    const el = ref.current?.closest(".ds");
    if (!el) return;
    const v = lerCor(el, token);
    setValor(v);
    setMedidas((sobre ?? []).map((s) => ({ nome: s.nome, razao: contraste(v, lerCor(el, s.token)) })));
  }, [token, sobre]);

  return (
    <div ref={ref} className="lab-cartao" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          height: alta ? 96 : 56,
          background: `var(${token})`,
          // Contorno por dentro: a amostra da própria página não some no fundo.
          boxShadow: "inset 0 0 0 1px var(--ds-line-subtle)",
        }}
      />
      <div style={{ padding: "12px 14px", display: "grid", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <b style={{ fontWeight: 500 }}>{nome}</b>
          <span className="lab-nota" style={{ marginLeft: "auto", fontFamily: "var(--ds-font-mono)", fontSize: 11 }}>
            {valor}
          </span>
        </div>
        <span className="ds-code" style={{ justifySelf: "start", fontSize: 11 }}>
          {token}
        </span>
        <span style={{ color: "var(--ds-text-secondary)", fontSize: "var(--ds-text-2xs)", lineHeight: 1.45, marginTop: 4 }}>
          {papel}
        </span>
        {medidas.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
            {medidas.map((m) => {
              const passa = m.razao !== null && m.razao >= piso;
              return (
                <span
                  key={m.nome}
                  title={`Contraste sobre ${m.nome}. Piso: ${piso}:1.`}
                  className="lab-pilula ds-num"
                  style={{
                    fontSize: 11,
                    padding: "0 7px",
                    background: passa ? "var(--ds-state-ok-wash)" : "var(--ds-state-error-wash)",
                    color: passa ? "var(--ds-state-ok)" : "var(--ds-state-error)",
                  }}
                >
                  {m.nome} {m.razao ? m.razao.toFixed(1).replace(".", ",") : "—"}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
