import { VitrineDeVolumes } from "./vitrine";

export const metadata = { title: "Montar volumes — Laboratório" };

export default function PaginaDeVolumes() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>Montar volumes</h1>
        <p className="lab-lede">
          Juntar PDFs prontos num volume, conferir e exportar. A mesa em três colunas: biblioteca, montagem e conferência, no
          mesmo painel das outras telas.
        </p>
      </header>
      <VitrineDeVolumes />
    </>
  );
}
