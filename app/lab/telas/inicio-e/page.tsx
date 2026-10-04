import Link from "next/link";

import { VitrineDoInicioE } from "./vitrine";

export const metadata = { title: "Início E — Laboratório" };

export default function PaginaDoInicioE() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>Início: a mesa</h1>
        <p className="lab-lede">
          Você começa pelos documentos, não pela tarefa. Solta os PDFs na mesa, o Nexo lê e separa em pilhas, e diz o que dá para
          fazer com o que está ali.{" "}
          <Link href="/lab/telas/inicio-d" style={{ color: "var(--ds-nexo)" }}>Comparar com o Início D</Link>
        </p>
      </header>
      <VitrineDoInicioE />
    </>
  );
}
