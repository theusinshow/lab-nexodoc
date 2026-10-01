import { VitrineDeAdmin } from "./vitrine";

export const metadata = { title: "Administração — Laboratório" };

export default function PaginaDeAdmin() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>Administração</h1>
        <p className="lab-lede">
          O trilho e o Cockpit (aprovados) e, nesta rodada, o Dinheiro. Motor, Pessoas e Dados vêm nas próximas, um de cada vez.
        </p>
      </header>
      <VitrineDeAdmin />
    </>
  );
}
