"use client";

import { CartaoDaFolha, ESTILOS, type Distancia } from "../mapa/cartoes";
import { FOLHAS } from "../mapa/dados";
import "../mapa/cartoes.css";
import "../mapa/mapa.css";

/** Os casos que o cartão precisa contar: normal, escolhida, diverge, deduzido, à mão, sem número. */
const CASOS = ["ARQ-02", "ARQ-01", "ARQ-03", "EST-06", "HID-04", "ELE-04"].map((id) => FOLHAS.find((f) => f.id === id)!);
const FAIXAS: { d: Distancia; nome: string }[] = [
  { d: "media", nome: "Zoom de trabalho: número, sigla e título" },
  { d: "perto", nome: "De perto: o carimbo inteiro" },
  { d: "longe", nome: "De longe (em escala): só o padrão" },
];

export function Comparacao() {
  return (
    <div className="ds ctc">
      {ESTILOS.map((e) => (
        <section key={e.id} className="ctc-estilo">
          <div>
            <h2 className="ctc-nome">{e.nome}</h2>
            <p className="ctc-ideia">{e.ideia}</p>
            <a className="ctc-link" href={`/lab/telas/mapa?cartao=${e.id}`}>
              Ver no canvas
            </a>
          </div>
          <div className="ctc-faixas">
            {FAIXAS.map((fx) => (
              <div key={fx.d} className="ctc-faixa">
                <span>{fx.nome}</span>
                <div className={`ctc-fileira${fx.d === "longe" ? " ctc-fileira--longe" : ""}`}>
                  {CASOS.map((f, i) => (
                    <CartaoDaFolha key={f.id} f={f} estilo={e.id} distancia={fx.d} escolhida={fx.d === "media" && i === 1} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
