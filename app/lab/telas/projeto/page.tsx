import { VitrineDoProjeto } from "./vitrine";

export const metadata = { title: "Projeto — Laboratório" };

export default function PaginaDoProjeto() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>Projeto</h1>
        <p className="lab-lede">
          Tudo de uma obra: as quatro tarefas com o estado de cada uma, o que ela tem (documentos, arquivos, gerados e eventos) e o
          que fazer agora.
        </p>
      </header>
      <VitrineDoProjeto />
    </>
  );
}
