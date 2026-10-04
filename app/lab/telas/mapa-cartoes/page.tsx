import { Comparacao } from "./comparacao";

export const metadata = { title: "Cartão da folha — Laboratório" };

export default function PaginaDosCartoes() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>Cartão da folha</h1>
        <p className="lab-lede">
          Cinco jeitos de a prancha aparecer no Mapa do volume, sem o fio de cor. Cada linha mostra os mesmos seis casos: normal,
          escolhida, diverge (rev. A), número deduzido, corrigida à mão e sem número, nas três distâncias do zoom. &ldquo;Ver no
          canvas&rdquo; abre o Mapa com aquela forma.
        </p>
      </header>
      <Comparacao />
    </>
  );
}
