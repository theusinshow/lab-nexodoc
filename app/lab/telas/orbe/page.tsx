import { TelaOrbe } from "./tela-orbe";

export const metadata = { title: "Orbe novo — Laboratório" };

export default function PaginaDoOrbe() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 8 }}>
        <p className="lab-trilha">Orbe · rodada 2</p>
        <h1>O orbe de hoje, em íris e com expressão</h1>
        <p className="lab-lede">
          O mesmo orbe do app (vidro, alma e satélites), com a cor do sistema novo e uma assinatura de movimento por estado. À esquerda como está em produção; à direita o novo. Os controles disparam os eventos que o app dispara de verdade.
        </p>
      </header>
      <TelaOrbe />
    </>
  );
}
