"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";
import { AgentOrbScene, CORES_DO_ORBE, type CoresDoOrbe } from "@/modules/nexo/components/agent-orb/AgentOrbScene";
import type { AgentState } from "@/modules/nexo/components/agent-orb/agent-orb.types";

import "./orbe.css";

/*
 * O ORBE, rodada 5 (01/10/2026). Aprovado o corpo e movimento sem a luz; agora:
 *  - a alma acompanha o sinal (concluído, aguardando, erro) com uma paleta
 *    própria por sinal, e não misturando tintas;
 *  - um degradê FIXO de cor na alma (não anda sozinho: é a cor do objeto);
 *  - o carregamento: nascer (a alma cresce do centro e assenta) e a leitura
 *    com a cabeça acesa correndo na ponta do arco de progresso.
 * É o orbe real do app (AgentOrbScene).
 */

const ESTADOS: { id: AgentState; nome: string }[] = [
  { id: "idle", nome: "Repouso" },
  { id: "dragging", nome: "Recebendo" },
  { id: "reading", nome: "Lendo" },
  { id: "analyzing", nome: "Analisando" },
  { id: "auditing", nome: "Auditando" },
  { id: "responding", nome: "Respondendo" },
  { id: "complete", nome: "Concluído" },
  { id: "waiting", nome: "Aguardando você" },
  { id: "error", nome: "Erro" },
];

const PALETAS: { id: string; nome: string; o_que: string; cores: CoresDoOrbe }[] = [
  { id: "iris", nome: "Íris", o_que: "Um tom só, como está.", cores: CORES_DO_ORBE },
  { id: "rosa", nome: "Íris → rosa", o_que: "Violeta no fundo, rosa nas pontas das lâminas.", cores: { corpo: "#120f1c", aro: "#b9a4ff", almaProfunda: "#8a7cf8", miolo: "#fff4fb", almaClara: "#ef9ad6", laminaClara: "#f6cdea" } },
  { id: "gelo", nome: "Íris → azul-gelo", o_que: "Violeta no fundo, azul claro nas pontas.", cores: { corpo: "#0d1020", aro: "#a8b6ff", almaProfunda: "#8a8ef6", miolo: "#f4fbff", almaClara: "#8fdcff", laminaClara: "#cdeeff" } },
  { id: "coral", nome: "Violeta → coral suave", o_que: "Mais quente: violeta no fundo, coral claro nas pontas.", cores: { corpo: "#140f1a", aro: "#c3a3ff", almaProfunda: "#9a6cf0", miolo: "#fff6f4", almaClara: "#ffa293", laminaClara: "#ffd6ce" } },
];

function Orbe({ estado, atividade, arquivos, achados, cores, tam, nascer = 0 }: { estado: AgentState; atividade: number; arquivos: number; achados: number; cores: CoresDoOrbe; tam: number; nascer?: number }) {
  return (
    <div className="ob2-canvas" style={{ width: tam, height: tam }}>
      <Canvas key={nascer} dpr={[1, 2]} gl={{ alpha: true, antialias: true }} camera={{ position: [0, 0, 4.25], fov: 42 }} style={{ width: "100%", height: "100%" }}>
        <AgentOrbScene state={estado} activity={atividade} fileCount={arquivos} hovered={false} pressed={false} reduced={false} achados={achados} cores={cores} sempreNascer />
      </Canvas>
    </div>
  );
}

export function TelaOrbe() {
  const [estado, setEstado] = useState<AgentState>("idle");
  const [atividade, setAtividade] = useState(0.4);
  const [arquivos, setArquivos] = useState(2);
  const [achados, setAchados] = useState(0);
  const [paleta, setPaleta] = useState(PALETAS[1]);
  const [nascer, setNascer] = useState(0);
  const leitura = useRef(0);
  const i = ESTADOS.findIndex((e) => e.id === estado);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight") setEstado(ESTADOS[(i + 1) % ESTADOS.length].id);
      if (e.key === "ArrowLeft") setEstado(ESTADOS[(i - 1 + ESTADOS.length) % ESTADOS.length].id);
      if (e.key.toLowerCase() === "a") setAchados((n) => n + 1);
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [i]);
  useEffect(() => () => cancelAnimationFrame(leitura.current), []);

  // Simular leitura: o progresso anda de 0 a 100% em 6 s, e o orbe conclui no fim
  const simularLeitura = () => {
    cancelAnimationFrame(leitura.current);
    setEstado("reading");
    const t0 = performance.now();
    const passo = (agora: number) => {
      const p = Math.min(1, (agora - t0) / 6000);
      setAtividade(p);
      if (p < 1) leitura.current = requestAnimationFrame(passo);
      else setTimeout(() => setEstado("complete"), 400);
    };
    leitura.current = requestAnimationFrame(passo);
  };

  return (
    <div className="ob2">
      <section className="ob2-paletas" aria-labelledby="ob2-paletas">
        <h2 id="ob2-paletas">O degradê da alma (fixo, não anda sozinho)</h2>
        <div className="ob2-paletas-grade" role="radiogroup" aria-label="Paleta">
          {PALETAS.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={paleta.id === p.id} className="ob2-paleta" onClick={() => setPaleta(p)}>
              <Orbe estado="idle" atividade={0.4} arquivos={0} achados={0} cores={p.cores} tam={150} />
              <b>{p.nome}</b>
              <span>{p.o_que}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="ob2-controles">
        <div className="ob2-estados" role="radiogroup" aria-label="Estado do agente">
          {ESTADOS.map((e) => (
            <button key={e.id} type="button" role="radio" aria-checked={e.id === estado} className="ob2-estado" onClick={() => setEstado(e.id)}>
              {e.nome}
            </button>
          ))}
        </div>
        <div className="ob2-eventos">
          <Botao variante="ghost" tamanho="sm" onClick={() => setNascer((n) => n + 1)}>
            Nascer de novo
          </Botao>
          <Botao variante="ghost" tamanho="sm" onClick={simularLeitura}>
            Simular leitura
          </Botao>
          <label className="ob2-faixa">
            <span>{estado === "reading" ? "Progresso da leitura" : "Atividade"}</span>
            <input type="range" min={0} max={1} step={0.01} value={atividade} onChange={(e) => setAtividade(Number(e.target.value))} />
            <b className="ds-num">{Math.round(atividade * 100)}%</b>
          </label>
          <span className="ob2-arquivos">
            Arquivos
            <Botao variante="quiet" tamanho="sm" onClick={() => setArquivos((n) => Math.max(0, n - 1))} aria-label="Menos um arquivo">
              −
            </Botao>
            <b className="ds-num">{arquivos}</b>
            <Botao variante="quiet" tamanho="sm" onClick={() => setArquivos((n) => Math.min(6, n + 1))} aria-label="Mais um arquivo">
              +
            </Botao>
          </span>
          <Botao variante="quiet" tamanho="sm" onClick={() => setAchados((n) => n + 1)}>
            Achado encontrado <Tecla>A</Tecla>
          </Botao>
        </div>
      </div>

      <section className="ob2-col ob2-col--grande" aria-label="O orbe na paleta escolhida">
        <header>
          <h2>{paleta.nome}</h2>
          <span>{ESTADOS[i].nome}</span>
        </header>
        <div className="ob2-palco ob2-palco--grande">
          <Orbe estado={estado} atividade={atividade} arquivos={arquivos} achados={achados} cores={paleta.cores} tam={420} nascer={nascer} />
        </div>
        <div className="ob2-pequeno">
          <Orbe estado={estado} atividade={atividade} arquivos={arquivos} achados={achados} cores={paleta.cores} tam={96} nascer={nascer} />
          <span>
            <b className="ds-num">96</b> porta do Nexo
          </span>
        </div>
      </section>
    </div>
  );
}
