import { TelaOrbe } from "./tela-orbe";

export const metadata = { title: "Orbe novo — Laboratório" };

export default function PaginaDoOrbe() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 8 }}>
        <p className="lab-trilha">Orbe · rodada 3</p>
        <h1>Dar vida ao orbe</h1>
        <p className="lab-lede">
          O mesmo orbe (íris, com expressão por estado), em quatro jeitos de tirar o ar murcho: luz, corpo e movimento, iridescência, e os três juntos. Escolha um, ou diga o que misturar.
        </p>
      </header>
      <TelaOrbe />
    </>
  );
}
