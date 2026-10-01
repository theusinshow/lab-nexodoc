"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";
import { AgentOrbScene } from "@/modules/nexo/components/agent-orb/AgentOrbScene";
import type { AgentState } from "@/modules/nexo/components/agent-orb/agent-orb.types";

import "./orbe.css";

/*
 * O ORBE, rodada 2 (01/10/2026): o Matheus preferiu manter o orbe de hoje,
 * trocar as cores e melhorar as animações. Aqui os dois lado a lado, com o
 * orbe REAL do app (AgentOrbScene): à esquerda como está em produção (teal), à
 * direita íris com a expressão nova. Os controles disparam os mesmos eventos
 * que o app dispara: estado, progresso, arquivos no contexto, achado.
 */

const ESTADOS: { id: AgentState; nome: string; o_que_muda: string }[] = [
  { id: "idle", nome: "Repouso", o_que_muda: "Respira devagar. Igual a hoje, na íris." },
  { id: "dragging", nome: "Recebendo", o_que_muda: "Cresce mais e acelera a alma, com o anel de soltar: ele quer o arquivo." },
  { id: "reading", nome: "Lendo", o_que_muda: "A varredura acompanha o progresso real, e o arco de progresso fecha em volta." },
  { id: "analyzing", nome: "Analisando", o_que_muda: "A borda da alma ondula e gira mais: pensando, diferente de lendo." },
  { id: "auditing", nome: "Auditando", o_que_muda: "Foca (pulso baixo, aro firme) e cada achado novo sai como um anel âmbar." },
  { id: "responding", nome: "Respondendo", o_que_muda: "O pulso vira sílabas: a alma parece falar, em vez de uma onda lisa." },
  { id: "complete", nome: "Concluído", o_que_muda: "Um anel verde sai do corpo e o aro fica verde até o próximo pedido." },
  { id: "waiting", nome: "Aguardando você", o_que_muda: "Respiração lenta e aro âmbar: falta uma decisão sua." },
  { id: "error", nome: "Erro", o_que_muda: "Para de girar, aro coral e o batimento de erro." },
];

function Palco({ expressao, estado, atividade, arquivos, achados, tam }: { expressao: "hoje" | "nova"; estado: AgentState; atividade: number; arquivos: number; achados: number; tam: number }) {
  return (
    <div className="ob2-canvas" style={{ width: tam, height: tam }}>
      <Canvas dpr={[1, 2]} gl={{ alpha: true, antialias: true }} camera={{ position: [0, 0, 4.25], fov: 42 }} style={{ width: "100%", height: "100%" }}>
        <AgentOrbScene state={estado} activity={atividade} fileCount={arquivos} hovered={false} pressed={false} reduced={false} expressao={expressao} achados={achados} />
      </Canvas>
    </div>
  );
}

export function TelaOrbe() {
  const [estado, setEstado] = useState<AgentState>("idle");
  const [atividade, setAtividade] = useState(0.4);
  const [arquivos, setArquivos] = useState(2);
  const [achados, setAchados] = useState(0);
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

  return (
    <div className="ob2">
      <div className="ob2-controles">
        <div className="ob2-estados" role="radiogroup" aria-label="Estado do agente">
          {ESTADOS.map((e) => (
            <button key={e.id} type="button" role="radio" aria-checked={e.id === estado} className="ob2-estado" onClick={() => setEstado(e.id)}>
              {e.nome}
            </button>
          ))}
        </div>
        <div className="ob2-eventos">
          <label className="ob2-faixa">
            <span>{estado === "reading" ? "Progresso da leitura" : "Atividade"}</span>
            <input type="range" min={0} max={1} step={0.01} value={atividade} onChange={(e) => setAtividade(Number(e.target.value))} />
            <b className="ds-num">{Math.round(atividade * 100)}%</b>
          </label>
          <span className="ob2-arquivos">
            Arquivos no contexto
            <Botao variante="quiet" tamanho="sm" onClick={() => setArquivos((n) => Math.max(0, n - 1))} aria-label="Menos um arquivo">
              −
            </Botao>
            <b className="ds-num">{arquivos}</b>
            <Botao variante="quiet" tamanho="sm" onClick={() => setArquivos((n) => Math.min(6, n + 1))} aria-label="Mais um arquivo">
              +
            </Botao>
          </span>
          <Botao variante="ghost" tamanho="sm" onClick={() => setAchados((n) => n + 1)}>
            Achado encontrado <Tecla>A</Tecla>
          </Botao>
          <span className="ob2-dica">
            <Tecla>←</Tecla>
            <Tecla>→</Tecla> troca o estado
          </span>
        </div>
      </div>

      <p className="ob2-muda">
        <b>{ESTADOS[i].nome}.</b> {ESTADOS[i].o_que_muda}
      </p>

      <div className="ob2-lado">
        {(["hoje", "nova"] as const).map((x) => (
          <section key={x} className={`ob2-col ob2-col--${x}`} aria-label={x === "hoje" ? "O orbe de hoje" : "O orbe novo"}>
            <header>
              <h2>{x === "hoje" ? "Hoje" : "Novo"}</h2>
              <span>{x === "hoje" ? "teal, como está em produção" : "íris do sistema novo, expressão por estado"}</span>
            </header>
            <div className="ob2-palco">
              <Palco expressao={x} estado={estado} atividade={atividade} arquivos={arquivos} achados={achados} tam={380} />
            </div>
            <div className="ob2-pequenos">
              {[160, 96].map((t) => (
                <figure key={t}>
                  <div className="ob2-degrau">
                    <Palco expressao={x} estado={estado} atividade={atividade} arquivos={arquivos} achados={achados} tam={t} />
                  </div>
                  <figcaption>
                    <b className="ds-num">{t}</b> {t === 160 ? "conversa (compact)" : "porta do Nexo"}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
