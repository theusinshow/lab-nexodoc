import { VitrineDoNexo } from "./vitrine";

export const metadata = { title: "Nexo: montar o volume — Laboratório" };

export default function PaginaDoNexo() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>Nexo: montar o volume</h1>
        <p className="lab-lede">
          Como se monta o volume hoje: uma tela só, com as conversas, o mapa do volume no centro e o chat ao lado. Cada pedido no chat
          reorganiza o mapa, e o que mudou acende.
        </p>
      </header>
      <VitrineDoNexo />
    </>
  );
}
