import { VitrineDeAchados } from "./vitrine";

export const metadata = { title: "Achados — Laboratório" };

export default function PaginaDeAchados() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>Achados</h1>
        <p className="lab-lede">
          O que está com você e o que você passou a alguém, de todas as obras. Abrir leva ao parecer no Nexo, onde a fila e o
          tratamento moram.
        </p>
      </header>
      <VitrineDeAchados />
    </>
  );
}
