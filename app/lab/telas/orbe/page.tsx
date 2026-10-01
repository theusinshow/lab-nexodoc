import { TelaOrbe } from "./tela-orbe";

export const metadata = { title: "Orbe novo — Laboratório" };

export default function PaginaDoOrbe() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 8 }}>
        <p className="lab-trilha">Orbe · rodada 4</p>
        <h1>Corpo e movimento, sem a luz</h1>
        <p className="lab-lede">
          O escolhido, sem o acréscimo de luz. Falta decidir se a cor fica andando sozinha (película) ou se só muda quando o estado tem algo a dizer, que é a proposta: o verde de concluído, o âmbar de aguardando e o coral de erro só significam algo se o resto do tempo a cor ficar parada.
        </p>
      </header>
      <TelaOrbe />
    </>
  );
}
