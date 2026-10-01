import { VitrineDeAjuda } from "./vitrine";

export const metadata = { title: "Ajuda — Laboratório" };

export default function PaginaDeAjuda() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>Ajuda</h1>
        <p className="lab-lede">
          Como faço, onde fica e o que quer dizer. A mesma língua de Projetos; os caminhos são os das telas aprovadas do redesenho.
        </p>
      </header>
      <VitrineDeAjuda />
    </>
  );
}
