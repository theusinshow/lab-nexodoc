"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";

import { Botao, Tecla } from "@/components/ds/basicos";
import { AgentOrbScene, type VidaDoOrbe } from "@/modules/nexo/components/agent-orb/AgentOrbScene";
import type { AgentState } from "@/modules/nexo/components/agent-orb/agent-orb.types";

import "./orbe.css";

/*
 * O ORBE, rodada 3 (01/10/2026): o de hoje, em íris e com expressão por
 * estado, ficou "murcho, sem vida". Quatro jeitos de dar vida ao MESMO orbe
 * (luz, corpo e movimento, iridescência, e os três juntos), ao lado do atual.
 * É o orbe real do app (AgentOrbScene); só muda a prop `vida`. Os controles
 * disparam os eventos que o app dispara: estado, progresso, arquivos, achado.
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

const VARIACOES: { id: string; nome: string; o_que: string; vida: Partial<VidaDoOrbe> }[] = [
  { id: "atual", nome: "Atual", o_que: "A íris da rodada 2, para comparar.", vida: {} },
  { id: "luz", nome: "Mais luz", o_que: "O vidro acende por dentro e a aura ilumina o fundo: vira fonte de luz.", vida: { luz: 1, aura: 1, vigor: 0.25 } },
  { id: "corpo", nome: "Mais corpo e movimento", o_que: "Lâminas cheias até o centro, o pulso de cada estado aparece, respira e gira mais.", vida: { vigor: 1, respira: 1, giro: 1.8, aura: 0.35 } },
  { id: "irid", nome: "Iridescente", o_que: "O aro e a alma andam de tom entre a íris e um azul-gelo, como película.", vida: { irid: 0.85, luz: 0.5, aura: 0.6, vigor: 0.35, iris2: "#8fdcff" } },
  { id: "tudo", nome: "Tudo junto", o_que: "Luz, corpo e película juntos, em doses menores.", vida: { luz: 0.8, aura: 0.8, vigor: 0.8, irid: 0.55, respira: 0.7, giro: 1.5, iris2: "#8fdcff" } },
];

function Palco({ estado, atividade, arquivos, achados, tam, vida }: { estado: AgentState; atividade: number; arquivos: number; achados: number; tam: number; vida: Partial<VidaDoOrbe> }) {
  return (
    <div className="ob2-canvas" style={{ width: tam, height: tam }}>
      <Canvas dpr={[1, 2]} gl={{ alpha: true, antialias: true }} camera={{ position: [0, 0, 4.25], fov: 42 }} style={{ width: "100%", height: "100%" }}>
        <AgentOrbScene state={estado} activity={atividade} fileCount={arquivos} hovered={false} pressed={false} reduced={false} achados={achados} vida={vida} />
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
        {VARIACOES.map((v) => (
          <section key={v.id} className="ob2-col" aria-label={v.nome}>
            <header>
              <h2>{v.nome}</h2>
            </header>
            <p className="ob2-o-que">{v.o_que}</p>
            <div className="ob2-palco">
              <Palco estado={estado} atividade={atividade} arquivos={arquivos} achados={achados} tam={300} vida={v.vida} />
            </div>
            <div className="ob2-pequeno">
              <Palco estado={estado} atividade={atividade} arquivos={arquivos} achados={achados} tam={96} vida={v.vida} />
              <span>
                <b className="ds-num">96</b> porta do Nexo
              </span>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
