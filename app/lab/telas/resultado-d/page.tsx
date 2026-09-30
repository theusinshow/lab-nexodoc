import { VitrineDoResultadoD } from "./vitrine";

export const metadata = { title: "Resultado D — Laboratório" };

export default function PaginaDoResultado() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Arquivada</p>
        <h1>Resultado D (enxuta)</h1>
        <p className="lab-lede">
          Posso emitir, e o que falta tratar. O Resumo responde a primeira pergunta numa leitura; a Fila trata um achado por vez,
          pelo teclado. Vocabulário, veredito e desfechos são os da tela de hoje.
        </p>
      </header>
      <VitrineDoResultadoD />
    </>
  );
}
