import Link from "next/link";

import { VitrineDoPainelB } from "./vitrine";

export const metadata = { title: "Painel B — Laboratório" };

export default function PaginaDoPainelB() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Direções para comparar</p>
        <h1>Painel B: mesa de trabalho</h1>
        <p className="lab-lede">
          Em vez de mostrar o que existe, mostra o que depende de você: uma fila só, de todas as obras, com a ação no próprio
          item. Marque algo como corrigido, peça algo ao Nexo no campo de cima, e veja o que muda.{" "}
          <Link href="/lab/telas/painel" style={{ color: "var(--ds-nexo)" }}>Comparar com o Painel A</Link>
        </p>
      </header>
      <VitrineDoPainelB />
    </>
  );
}
