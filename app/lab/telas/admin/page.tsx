import { VitrineDeAdmin } from "./vitrine";

export const metadata = { title: "Administração — Laboratório" };

export default function PaginaDeAdmin() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>Administração</h1>
        <p className="lab-lede">
          Primeira rodada: o trilho (veredito, cinco destinos, token) e o Cockpit. Dinheiro, Motor, Pessoas e Dados vêm nas próximas, um de cada vez.
        </p>
      </header>
      <VitrineDeAdmin />
    </>
  );
}
