import { VitrineDeEntrada } from "./vitrine";

export const metadata = { title: "Entrada — Laboratório" };

export default function PaginaDeEntrada() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>Entrada</h1>
        <p className="lab-lede">
          Login e sem acesso. À esquerda o login de sempre; à direita o filme do Nexo, 15 s em loop feitos em HyperFrames
          (videos/nexo-entrada): do carimbo ao volume.
        </p>
      </header>
      <VitrineDeEntrada />
    </>
  );
}
