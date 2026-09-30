import { VitrineDoMapa } from "./vitrine";

export const metadata = { title: "Mapa do volume — Laboratório" };

export default function PaginaDoMapa() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>Mapa do volume</h1>
        <p className="lab-lede">
          Conferir o que o Nexo leu de cada folha antes de gerar. O canvas de hoje, com a pele nova: fileiras por tomo, zoom que
          muda o quanto o nó conta, e à direita o checklist do que falta conferir.
        </p>
      </header>
      <VitrineDoMapa />
    </>
  );
}
