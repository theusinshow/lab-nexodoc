import { VitrineDaAuditoria } from "./vitrine";

export const metadata = { title: "Auditoria rodando (v1) — Laboratório" };

export default function PaginaDaAuditoria() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Telas para aprovar</p>
        <h1>Auditoria rodando, primeira versão</h1>
        <p className="lab-lede">
          O que acontece depois de clicar em Auditar. As etapas são as reais do motor, com os nomes e as descrições de hoje; ao
          lado, o registro do que o Nexo vai apurando.
        </p>
      </header>
      <VitrineDaAuditoria />
    </>
  );
}
