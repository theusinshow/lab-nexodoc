import { VitrineDoHistorico } from "./vitrine";

export const metadata = { title: "Histórico — Laboratório" };

export default function PaginaDoHistorico() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 24 }}>
        <p className="lab-trilha">Em andamento</p>
        <h1>Histórico de conversas</h1>
        <p className="lab-lede">
          A coluna da esquerda do Nexo, refeita. Por obra, cada conversa dizendo como terminou (o veredito e quanto falta tratar, o volume montado ou
          velho), e os exemplos e testes à parte.
        </p>
        <p className="lab-lede">
          De onde vem cada dado: código e município da obra, título, hora, auditoria rodando, folhas e documentos gerados já vêm do resumo das
          conversas. O nome da obra, o veredito, quantos faltam tratar, os tomos e o volume velho precisam entrar no mesmo resumo; os dados existem
          no banco.
        </p>
      </header>
      <VitrineDoHistorico />
    </>
  );
}
