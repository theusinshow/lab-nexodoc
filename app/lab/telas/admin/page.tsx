import { VitrineDeAdmin } from "./vitrine";

export const metadata = { title: "Administração — Laboratório" };

export default function PaginaDeAdmin() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>Administração</h1>
        <p className="lab-lede">
          O trilho, o Cockpit, o Dinheiro e o Motor (aprovados) e, nesta rodada, Pessoas e Dados: os cinco destinos completos.
        </p>
      </header>
      <VitrineDeAdmin />
    </>
  );
}
