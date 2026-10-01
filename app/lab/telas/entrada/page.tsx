import { VitrineDeEntrada } from "./vitrine";

export const metadata = { title: "Entrada — Laboratório" };

export default function PaginaDeEntrada() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>Entrada</h1>
        <p className="lab-lede">
          Login e sem acesso. Um painel só no chão pontilhado do mapa; o orbe gigante e a saudação animada saem. Os textos são os do app.
        </p>
      </header>
      <VitrineDeEntrada />
    </>
  );
}
