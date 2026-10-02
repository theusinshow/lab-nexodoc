import { Esqueleto as E } from "@/components/ds/basicos";

import "@/components/telas/comum/esqueletos.css";

/*
 * O destino do admin carregando. O cabeçalho e o trilho são do layout (já
 * estão na tela); aqui fica só a forma do conteúdo, nas medidas do Cockpit:
 * a fila de cinco números, as duas colunas e o bloco de baixo. O `ds-skel`
 * só aparece depois de 120 ms, então carga rápida não pisca.
 */
export default function CarregandoAdmin() {
  return (
    <div className="sk-pilha" style={{ gap: 12 }} aria-busy="true">
      <div className="sk-grade5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="sk-cartao sk-pilha" style={{ gap: 10, padding: 14 }}>
            <E largura="60%" altura={10} />
            <E largura={40} altura={20} />
            <E largura="80%" altura={8} />
          </div>
        ))}
      </div>
      <div className="sk-colunas">
        <E largura="100%" altura={180} raio={16} />
        <E largura="100%" altura={180} raio={16} />
      </div>
      <E largura="100%" altura={130} raio={16} />
    </div>
  );
}
