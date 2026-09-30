import { VitrineDoParecer } from "./vitrine";

export const metadata = { title: "Parecer — Laboratório" };

export default function PaginaDoParecer() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>Parecer</h1>
        <p className="lab-lede">
          O documento que sai para o cliente, na aba Parecer do Resultado. Mostrado como papel, com o que se faz com ele ao lado.
        </p>
      </header>
      <VitrineDoParecer />
    </>
  );
}
