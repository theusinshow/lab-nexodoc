import Link from "next/link";

import { VitrineDoOficio } from "./vitrine";

export const metadata = { title: "Painel: o ofício — Laboratório" };

export default function PaginaDoOficio() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Para comparar</p>
        <h1>Painel: o ofício</h1>
        <p className="lab-lede">
          O mesmo painel na linguagem da revisão de documento, e não na de um app de IA: abre num carimbo com as duas funções, o que trava a emissão vem com o trecho
          sublinhado a caneta, a interface é grafite e a cor fica no orbe e na marcação.{" "}
          <Link href="/lab/telas/painel" style={{ color: "var(--ds-text-primary)", textDecoration: "underline" }}>
            Comparar com o Painel atual
          </Link>
        </p>
      </header>
      <VitrineDoOficio />
    </>
  );
}
