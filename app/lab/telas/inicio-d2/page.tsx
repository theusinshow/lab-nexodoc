import { VitrineDoInicioD2 } from "./vitrine";

export const metadata = { title: "Início D revisto — Laboratório" };

export default function PaginaDoInicioD2() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>Início: D revisto</h1>
        <p className="lab-lede">
          As tarefas do D em uma fileira compacta, a barra de comando em cima como busca, e duas colunas curtas: o que retomar e
          o que está com você.
        </p>
      </header>
      <VitrineDoInicioD2 />
    </>
  );
}
