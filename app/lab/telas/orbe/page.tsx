import { TelaOrbe } from "./tela-orbe";

export const metadata = { title: "Orbe novo — Laboratório" };

export default function PaginaDoOrbe() {
  return (
    <>
      <header className="lab-cabeca" style={{ marginBottom: 8 }}>
        <p className="lab-trilha">Orbe · rodada 5 · violeta → coral aprovada</p>
        <h1>Degradê, a alma no sinal e o carregamento</h1>
        <p className="lab-lede">
          O orbe aprovado com três coisas novas: um degradê fixo na alma (escolha a paleta em cima), a alma acompanhando a cor do sinal em concluído, aguardando e erro, e o carregamento (nascer e leitura com a cabeça acesa no arco).
        </p>
      </header>
      <TelaOrbe />
    </>
  );
}
