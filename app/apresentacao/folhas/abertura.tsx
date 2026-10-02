"use client";

import { AgentOrb } from "@/modules/nexo/components/agent-orb/AgentOrb";

import type { Slide } from "../palco";
import { Entra, Linhas, MONO } from "../pecas";

/**
 * A CAPA. Sem moldura (a folha não tem bloco): o nome à esquerda, o orbe vivo à
 * direita numa atmosfera violeta parada, e os créditos nos cantos — dispostos
 * no espaço, e não enfileirados numa linha de pontos.
 *
 * O ORBE VIVO, o mesmo da porta do Nexo, violeta para coral. É a única coisa do
 * deck que se move sozinha, e é por isso que está na capa: o produto se
 * apresentando. SEM `transform: scale()` nele — o canvas mede a si mesmo para
 * dimensionar o WebGL e enxergaria a caixa já transformada.
 */
export const CAPA: Slide = {
  rotulo: "Capa",
  numero: "01",
  notas:
    "Abrir sem preâmbulo. Deixar o orbe respirar dois segundos antes de falar — ele é o produto se apresentando sozinho. Nome, o que é, quem fez. Não explicar a capa.",
  corpo: (
    <div style={{ position: "relative", flex: 1 }}>
      <div
        aria-hidden="true"
        className="ap-surge"
        style={{
          position: "absolute",
          left: 1000,
          top: 40,
          width: 1000,
          height: 1000,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--ds-nexo) 20%, transparent), color-mix(in srgb, var(--ds-p-coral) 5%, transparent) 42%, transparent 66%)",
          filter: "blur(20px)",
          animationDuration: "1600ms",
        }}
      />
      <div
        className="ap-surge"
        style={{
          position: "absolute",
          left: 1350,
          top: 390,
          width: 300,
          height: 300,
          display: "grid",
          placeItems: "center",
          animationDelay: "200ms",
        }}
      >
        <AgentOrb size="hero" state="idle" />
      </div>

      <Entra
        atraso={120}
        style={{
          position: "absolute",
          left: 120,
          top: 64,
          fontSize: 20,
          color: "var(--ds-text-tertiary)",
        }}
      >
        Apresentação de software
      </Entra>
      <Entra
        atraso={120}
        style={{
          position: "absolute",
          right: 120,
          top: 64,
          fontFamily: MONO,
          fontSize: 18,
          color: "var(--ds-text-tertiary)",
        }}
      >
        2026
      </Entra>

      <div style={{ position: "absolute", left: 120, top: 360, width: 1100 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 176,
            fontWeight: 500,
            letterSpacing: "-0.055em",
            lineHeight: 0.95,
            color: "var(--ds-text-primary)",
          }}
        >
          <Linhas linhas={["NexoDoc"]} atraso={280} />
        </h1>
        <p
          style={{
            margin: "40px 0 0",
            fontSize: 46,
            fontWeight: 400,
            letterSpacing: "-0.025em",
            lineHeight: 1.18,
            color: "var(--ds-text-secondary)",
          }}
        >
          <Linhas
            linhas={[
              "Conferência e montagem documental",
              "para projetos de engenharia",
            ]}
            atraso={560}
            passo={100}
          />
        </p>
      </div>

      <Entra
        atraso={900}
        style={{
          position: "absolute",
          left: 120,
          bottom: 64,
          fontFamily: MONO,
          fontSize: 19,
          color: "var(--ds-text-tertiary)",
        }}
      >
        <span className="ap-neon" data-texto="Coded by M">
          Coded by M
        </span>
      </Entra>
    </div>
  ),
};
