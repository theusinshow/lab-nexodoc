import { VitrineDoInicioF } from "./vitrine";

export const metadata = { title: "Início F — Laboratório" };

export default function PaginaDoInicioF() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>Início: barra de comando</h1>
        <p className="lab-lede">
          Uma entrada só, feita para o teclado. Clique em “Tela cheia” e use de verdade: digite, ande com as setas, Enter, Esc,
          Ctrl 1 a 4.
        </p>
      </header>
      <VitrineDoInicioF />
    </>
  );
}
