import { VitrineDoNexoAuditoria } from "./vitrine";

export const metadata = { title: "Nexo: a auditoria na conversa — Laboratório" };

export default function PaginaDoNexoAuditoria() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>Nexo: a auditoria na conversa</h1>
        <p className="lab-lede">
          A premissa de volta: o Nexo é um chat que audita. A auditoria acontece numa conversa, no mesmo shell do Montar o volume: conversas por obra, o palco com a
          auditoria e o resultado, e o chat ao lado para tirar dúvida sobre o projeto auditado.
        </p>
      </header>
      <VitrineDoNexoAuditoria />
    </>
  );
}
