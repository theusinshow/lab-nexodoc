import { VitrineDoInicioD } from "./vitrine";

export const metadata = { title: "Início D — Laboratório" };

export default function PaginaDoInicioD() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>Início: tarefa primeiro</h1>
        <p className="lab-lede">
          O Nexo é aberto para uma tarefa pontual, não para acompanhar o dia. Então a primeira tela leva direto à tarefa, e diz o
          que você precisa ter em mãos. Substitui o Painel e a Conversa nova, que faziam o mesmo trabalho.
        </p>
      </header>
      <VitrineDoInicioD />
    </>
  );
}
