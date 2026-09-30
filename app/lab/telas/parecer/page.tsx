import { VitrineDoParecer } from "./vitrine";

export const metadata = { title: "Relatório — Laboratório" };

export default function PaginaDoParecer() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>Relatório</h1>
        <p className="lab-lede">
          A aba Relatório do Resultado: o parecer em texto corrido, como hoje. O papel diagramado sai pelo Parecer em PDF, no painel.
        </p>
      </header>
      <VitrineDoParecer />
    </>
  );
}
