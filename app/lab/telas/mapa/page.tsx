import { VitrineDoMapa } from "./vitrine";

export const metadata = { title: "Mapa do volume — Laboratório" };

export default function PaginaDoMapa() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>Mapa do volume</h1>
        <p className="lab-lede">
          Conferir o que o Nexo leu de cada folha antes de gerar. Uma fileira por tomo, as folhas por disciplina, e um inspetor à
          direita com o carimbo inteiro. O zoom virou densidade: 1, 2 e 3.
        </p>
      </header>
      <VitrineDoMapa />
    </>
  );
}
