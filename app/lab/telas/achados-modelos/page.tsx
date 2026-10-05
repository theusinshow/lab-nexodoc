import { BancadaDosModelos } from "./bancada";

export const metadata = { title: "Achados: modelos de layout — Laboratório" };

export default function PaginaDosModelos() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 20 }}>
        <p className="lab-trilha">Em andamento</p>
        <h1>Achados: quatro jeitos de organizar</h1>
        <p className="lab-lede">
          As mesmas funções da fila de hoje, arranjadas de quatro maneiras. Todas funcionam de verdade sobre um parecer real: marcar corrigido,
          atribuir, conversar e abrir o PDF gravam no banco deste ambiente. Troque o modelo em cima e use.
        </p>
      </header>
      <BancadaDosModelos />
    </>
  );
}
