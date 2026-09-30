import { VitrineDaConversaV1 } from "./vitrine";

export const metadata = { title: "Conversa, primeira versão — Laboratório" };

export default function PaginaDaConversa() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Arquivada</p>
        <h1>Conversa, primeira versão</h1>
        <p className="lab-lede">
          Entender o pedido, mostrar o que entendeu e pedir só a confirmação necessária. Mesma estrutura do Resultado: a conversa à
          esquerda, a coluna com o que existe nela à direita.
        </p>
      </header>
      <VitrineDaConversaV1 />
    </>
  );
}
