import { VitrineDoPainel } from "./vitrine-do-painel";

export const metadata = { title: "Painel — Laboratório" };

export default function PaginaDoPainel() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>Painel</h1>
        <p className="lab-lede">
          Escolha uma situação nos botões abaixo, clique à vontade na tela e diga se está bom. Uma decisão por situação.
        </p>
      </header>
      <VitrineDoPainel />
    </>
  );
}
