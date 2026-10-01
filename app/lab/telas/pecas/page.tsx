import { VitrineDePecas } from "./vitrine";

export const metadata = { title: "Peças de toda tela — Laboratório" };

export default function PaginaDePecas() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>Peças de toda tela</h1>
        <p className="lab-lede">
          O que aparece por cima de qualquer tela, ou em volta dela: buscar, atalhos, aviso passageiro, menu da conta, confirmar antes de apagar, a página que não existe e a tela estreita. As sobreposições estão por cima da tela de Projeto aprovada, com o Topo ligado.
        </p>
      </header>
      <VitrineDePecas />
    </>
  );
}
