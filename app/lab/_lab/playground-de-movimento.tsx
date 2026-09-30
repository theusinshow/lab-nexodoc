"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { CURVA, DURACAO, MOLA, escalarMola, type NomeDaCurva, type NomeDaDuracao, type NomeDaMola } from "@/lib/ds/movimento";

import { useLab } from "./contexto";

/**
 * O PLAYGROUND DE MOVIMENTO. Escolha uma duração, uma curva e uma mola; as
 * quatro demonstrações repetem com elas. Cada demonstração responde a uma das
 * perguntas que justificam animar — e é assim que o catálogo inteiro vai ser
 * julgado na fase 3.
 */

const DESCRICAO_DURACAO: Record<NomeDaDuracao, string> = {
  press: "O botão afunda sob o dedo.",
  feedback: "Hover, cor, ícone que acende.",
  state: "Selo que troca, check que marca.",
  enter: "Menu, aviso, linha nova chegando.",
  layout: "Lista vira detalhe, painel abre.",
};
const DESCRICAO_CURVA: Record<NomeDaCurva, string> = {
  out: "Chega rápido e assenta. Padrão de entrada.",
  feedback: "Acompanha o gesto sem arrasto.",
  move: "De A para B com os dois pontos à vista.",
  exit: "Sai sem pedir atenção.",
};
const DESCRICAO_MOLA: Record<NomeDaMola, string> = {
  snappy: "Indicador de aba, pílula de segmento.",
  smooth: "Elemento que troca de lugar.",
  gentle: "Painel grande entrando.",
};

function Curva({ pontos }: { pontos: readonly number[] }) {
  const [x1, y1, x2, y2] = pontos;
  const s = 44;
  return (
    <svg width={s} height={s} viewBox="-4 -4 52 52" aria-hidden style={{ flex: "none" }}>
      <rect x="0" y="0" width={s} height={s} rx="6" fill="none" stroke="var(--ds-line-subtle)" />
      <path
        d={`M0 ${s} C ${x1 * s} ${s - y1 * s}, ${x2 * s} ${s - y2 * s}, ${s} 0`}
        fill="none"
        stroke="var(--ds-nexo)"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function Opcao({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: "8px 10px",
        border: 0,
        borderRadius: "var(--ds-radius-control)",
        background: ativo ? "var(--ds-surface-raised)" : "transparent",
        boxShadow: ativo ? "var(--ds-edge-strong)" : "none",
        color: "inherit",
        font: "inherit",
        textAlign: "left",
        cursor: "pointer",
        transition: "background var(--ds-dur-feedback) var(--ds-ease-feedback)",
      }}
    >
      {children}
    </button>
  );
}

export function PlaygroundDeMovimento() {
  const { escala } = useLab();
  const [duracao, setDuracao] = useState<NomeDaDuracao>("enter");
  const [curva, setCurva] = useState<NomeDaCurva>("out");
  const [mola, setMola] = useState<NomeDaMola>("snappy");
  const [rodada, setRodada] = useState(0);
  const [lugar, setLugar] = useState(0);
  const [corrigido, setCorrigido] = useState(false);

  const d = DURACAO[duracao] * escala;
  const ease = [...CURVA[curva]] as [number, number, number, number];
  const spring = escalarMola(MOLA[mola], escala);

  function repetir() {
    setRodada((r) => r + 1);
    setLugar((l) => (l + 1) % 3);
    setCorrigido(false);
    setTimeout(() => setCorrigido(true), 450 * escala);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px minmax(0, 1fr)", gap: 16 }}>
      <div className="lab-cartao" style={{ padding: 10, display: "grid", gap: 14, alignContent: "start" }}>
        <div>
          <p className="lab-nota" style={{ margin: "4px 6px 6px" }}>Duração</p>
          {(Object.keys(DURACAO) as NomeDaDuracao[]).map((k) => (
            <Opcao key={k} ativo={duracao === k} onClick={() => setDuracao(k)}>
              <span className="ds-num" style={{ width: 52, fontFamily: "var(--ds-font-mono)", fontSize: 12, color: "var(--ds-text-secondary)" }}>
                {Math.round(DURACAO[k] * 1000)} ms
              </span>
              <span style={{ display: "grid" }}>
                <span style={{ fontSize: 13 }}>{k}</span>
                <span className="lab-nota">{DESCRICAO_DURACAO[k]}</span>
              </span>
            </Opcao>
          ))}
        </div>
        <div>
          <p className="lab-nota" style={{ margin: "4px 6px 6px" }}>Curva</p>
          {(Object.keys(CURVA) as NomeDaCurva[]).map((k) => (
            <Opcao key={k} ativo={curva === k} onClick={() => setCurva(k)}>
              <Curva pontos={CURVA[k]} />
              <span style={{ display: "grid" }}>
                <span style={{ fontSize: 13 }}>{k}</span>
                <span className="lab-nota">{DESCRICAO_CURVA[k]}</span>
              </span>
            </Opcao>
          ))}
        </div>
        <div>
          <p className="lab-nota" style={{ margin: "4px 6px 6px" }}>Mola</p>
          {(Object.keys(MOLA) as NomeDaMola[]).map((k) => (
            <Opcao key={k} ativo={mola === k} onClick={() => setMola(k)}>
              <span className="ds-num" style={{ width: 52, fontFamily: "var(--ds-font-mono)", fontSize: 11, color: "var(--ds-text-secondary)" }}>
                {MOLA[k].stiffness}/{MOLA[k].damping}
              </span>
              <span style={{ display: "grid" }}>
                <span style={{ fontSize: 13 }}>{k}</span>
                <span className="lab-nota">{DESCRICAO_MOLA[k]}</span>
              </span>
            </Opcao>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={repetir}
            style={{
              height: 34,
              padding: "0 16px",
              border: 0,
              borderRadius: 999,
              background: "var(--ds-action-bg)",
              color: "var(--ds-action-fg)",
              font: "inherit",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Repetir as quatro
          </button>
          <span className="lab-nota">
            {duracao} + {curva} nas demonstrações 1, 3 e 4; mola {mola} na 2.
            {escala > 1 ? " Em câmera lenta." : ""}
          </span>
        </div>

        <div className="lab-grade" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <Demo numero="1" pergunta="O que mudou?" exemplo="O parecer ficou pronto e o aviso chega.">
            <div style={{ height: 70, display: "grid", placeItems: "center" }}>
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={rodada}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, transition: { duration: DURACAO.feedback * escala, ease: [...CURVA.exit] as [number, number, number, number] } }}
                  transition={{ duration: d, ease }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: "var(--ds-radius-row)",
                    background: "var(--ds-surface-overlay)",
                    boxShadow: "var(--ds-shadow-float)",
                    fontSize: 13,
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: 9, background: "var(--ds-nexo)" }} />
                  Parecer pronto: não emitir ainda
                </motion.div>
              </AnimatePresence>
            </div>
          </Demo>

          <Demo numero="2" pergunta="Para onde foi?" exemplo="A seleção muda de aba e a pílula leva o olho junto.">
            <div style={{ height: 70, display: "grid", placeItems: "center" }}>
              <div style={{ display: "inline-flex", gap: 2, padding: 3, borderRadius: 999, background: "var(--ds-surface-sunken)", boxShadow: "var(--ds-edge)" }}>
                {["Resumo", "Achados", "Parecer"].map((r, i) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setLugar(i)}
                    style={{ position: "relative", height: 30, padding: "0 14px", border: 0, borderRadius: 999, background: "none", color: lugar === i ? "var(--ds-text-primary)" : "var(--ds-text-tertiary)", font: "inherit", fontSize: 13, cursor: "pointer" }}
                  >
                    {lugar === i && (
                      <motion.span
                        layoutId="demo-aba"
                        transition={spring}
                        style={{ position: "absolute", inset: 0, borderRadius: 999, background: "var(--ds-surface-overlay)", boxShadow: "var(--ds-edge-strong)" }}
                      />
                    )}
                    <span style={{ position: "relative" }}>{r}</span>
                  </button>
                ))}
              </div>
            </div>
          </Demo>

          <Demo numero="3" pergunta="Deu certo?" exemplo="Marcar corrigido: o check se desenha e o rótulo troca.">
            <div style={{ height: 70, display: "grid", placeItems: "center" }}>
              <button
                type="button"
                onClick={() => setCorrigido((c) => !c)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  height: 34,
                  padding: "0 16px",
                  border: 0,
                  borderRadius: 999,
                  background: corrigido ? "var(--ds-state-ok-wash)" : "var(--ds-action-bg)",
                  color: corrigido ? "var(--ds-state-ok)" : "var(--ds-action-fg)",
                  font: "inherit",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: `background ${d}s, color ${d}s`,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <motion.path
                    key={`${rodada}-${corrigido}`}
                    d="m5 12.5 4.5 4.5L19 7.5"
                    initial={{ pathLength: corrigido ? 0 : 1 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: d, ease }}
                  />
                </svg>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={corrigido ? "sim" : "nao"}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: DURACAO.state * escala, ease }}
                  >
                    {corrigido ? "Corrigido" : "Marcar corrigido"}
                  </motion.span>
                </AnimatePresence>
              </button>
            </div>
          </Demo>

          <Demo numero="4" pergunta="Está trabalhando?" exemplo="Etapa ativa da auditoria: o pulso e o brilho só existem enquanto há trabalho.">
            <div style={{ height: 70, display: "grid", alignContent: "center", gap: 10, padding: "0 8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                <span style={{ position: "relative", width: 10, height: 10 }}>
                  <motion.span
                    animate={{ scale: [1, 0.6, 1], opacity: [1, 0.6, 1] }}
                    transition={{ duration: 1.6 * escala, repeat: Infinity, ease: "easeInOut" }}
                    style={{ position: "absolute", inset: 0, borderRadius: 9, background: "var(--ds-nexo)" }}
                  />
                </span>
                <motion.span
                  animate={{ backgroundPosition: ["100% 0", "-100% 0"] }}
                  transition={{ duration: 2.4 * escala, repeat: Infinity, ease: "linear" }}
                  style={{
                    background: "linear-gradient(90deg, var(--ds-text-tertiary) 0%, var(--ds-text-primary) 40%, var(--ds-text-tertiary) 80%)",
                    backgroundSize: "200% 100%",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  Lendo capítulo a capítulo, bloco 7 de 12
                </motion.span>
              </div>
              <div style={{ height: 4, borderRadius: 999, background: "rgb(255 255 255 / 0.07)", overflow: "hidden" }}>
                <motion.div
                  key={rodada}
                  initial={{ width: "18%" }}
                  animate={{ width: "58%" }}
                  transition={{ duration: d * 3, ease }}
                  style={{ height: "100%", borderRadius: 999, background: "var(--ds-nexo)" }}
                />
              </div>
            </div>
          </Demo>
        </div>
      </div>
    </div>
  );
}

function Demo({ numero, pergunta, exemplo, children }: { numero: string; pergunta: string; exemplo: string; children: React.ReactNode }) {
  return (
    <div className="lab-cartao" style={{ padding: 16, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="lab-nota ds-num">{numero}</span>
        <b style={{ fontWeight: 500 }}>{pergunta}</b>
      </div>
      <div style={{ borderRadius: "var(--ds-radius-row)", background: "var(--ds-surface-sunken)", boxShadow: "var(--ds-edge)" }}>{children}</div>
      <span className="lab-nota">{exemplo}</span>
    </div>
  );
}
