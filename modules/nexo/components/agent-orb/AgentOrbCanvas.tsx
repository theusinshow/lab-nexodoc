"use client";

/**
 * Canvas R3F do Nexo Core — carregado dynamic ssr:false (WebGL precisa do DOM).
 * `pointerEvents:none`: a hit-area/hover/click ficam no container DOM (o brief pede
 * não capturar eventos indevidamente). `frameloop` pausa em aba oculta e vira
 * `demand` em reduced-motion (perf). DPR limitado.
 */

import { Canvas } from "@react-three/fiber";

import { AgentOrbScene } from "./AgentOrbScene";
import type { AgentState } from "./agent-orb.types";

export function AgentOrbCanvas({
  state,
  activity,
  fileCount,
  hovered,
  pressed,
  ouvindo = false,
  reduced,
  visible,
}: {
  state: AgentState;
  activity: number;
  fileCount: number;
  hovered: boolean;
  pressed: boolean;
  /** Cursor no composer — o aro sobe um pouco. */
  ouvindo?: boolean;
  reduced: boolean;
  visible: boolean;
}) {
  const frameloop = reduced ? "demand" : visible ? "always" : "never";
  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={frameloop}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      /*
       * A câmera enquadrava ±1,23 unidades (tan(21°)·3,2) e a órbita dos
       * satélites vive a 1,34: eles eram CORTADOS pela borda da própria caixa
       * quando passavam pelos lados, e o anel de estado sumia virando quatro
       * arcos nos cantos. Recuar para 3,7 abriu o quadro para ±1,42.
       *
       * Não bastou. Sobrava 0,08 de margem para o CENTRO do satélite, e satélite
       * tem raio e tem brilho: no primeiro projeto grande eles continuavam
       * batendo numa parede invisível e sumindo de repente — sem borda desenhada,
       * só a tesoura. Em 4,25 o quadro vai a ±1,63 e a margem passa a 0,29, que
       * cabe o ponto e o halo dele.
       *
       * A esfera fica proporcionalmente menor DENTRO do quadro — por isso a
       * caixa em `AgentOrb` cresce na mesma medida (1,149× desta vez): o orbe
       * aparece do mesmo tamanho na tela, com folga em volta em vez de corte.
       */
      camera={{ position: [0, 0, 4.25], fov: 42 }}
      /*
       * MEDIDO SEM O ZOOM (produção, 02/10/2026). Em tela grande o `.ds` ganha
       * `zoom: 1.25`; a medição padrão (getBoundingClientRect) devolve a caixa
       * JÁ ampliada, o R3F grava esse número como largura em CSS — que o zoom
       * amplia de novo — e o canvas saía 1,25× maior que o círculo que o
       * recorta: o orbe aparecia cortado à direita e embaixo, batendo nas
       * bordas. `offsetSize` mede pelo offsetWidth, em px de layout.
       */
      resize={{ offsetSize: true }}
      style={{ width: "100%", height: "100%", pointerEvents: "none" }}
    >
      <AgentOrbScene
        state={state}
        activity={activity}
        fileCount={fileCount}
        hovered={hovered}
        pressed={pressed}
        ouvindo={ouvindo}
        reduced={reduced}
      />
    </Canvas>
  );
}
