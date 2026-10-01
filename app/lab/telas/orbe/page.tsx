import { TelaOrbe } from "./tela-orbe";

export const metadata = { title: "Orbe novo — Laboratório" };

export default function PaginaDoOrbe() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 8 }}>
        <p className="lab-trilha">Orbe novo · rodada 1</p>
        <h1>Quatro direções para o orbe</h1>
        <p className="lab-lede">
          Do zero, sem a esfera de vidro teal. As quatro leem os mesmos nove estados do agente do app e aparecem em todos os degraus, do herói ao favicon de 16px, e em uso na barra e na conversa. Escolha uma (ou o que misturar) e ela vira a família completa.
        </p>
      </header>
      <TelaOrbe />
    </>
  );
}
