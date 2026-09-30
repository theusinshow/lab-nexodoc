import { VitrineDeProjetos } from "./vitrine";

export const metadata = { title: "Projetos — Laboratório" };

export default function PaginaDeProjetos() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>Projetos</h1>
        <p className="lab-lede">
          Achar a obra e entrar nela. A mesma língua do Mapa: um painel, a tabela das obras e, à direita, por onde começar ou a obra
          escolhida.
        </p>
      </header>
      <VitrineDeProjetos />
    </>
  );
}
