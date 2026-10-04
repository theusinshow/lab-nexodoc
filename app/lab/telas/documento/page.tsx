import { VitrineDoDocumento } from "./vitrine";

export const metadata = { title: "No documento — Laboratório" };

export default function PaginaDoDocumento() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>No documento</h1>
        <p className="lab-lede">
          A aba No documento do Resultado: o memorial página a página, com cada achado no lugar dele. Hoje é um canvas de arrastar; aqui,
          uma grade, com o mesmo gesto de acender o par.
        </p>
      </header>
      <VitrineDoDocumento />
    </>
  );
}
