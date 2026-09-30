import { contarInventario } from "@/lib/design-lab/inventario";

import { AndamentoDasFases } from "./_lab/andamento";
import { ITENS_DO_INVENTARIO, ITENS_DOS_FUNDAMENTOS } from "./_lab/itens";

export default function VisaoGeral() {
  const n = contarInventario();
  return (
    <>
      <header className="lab-cabeca">
        <p className="lab-trilha">Laboratório</p>
        <h1>O redesenho do Nexo, peça por peça</h1>
        <p className="lab-lede">
          Cada fundamento, componente, micro-interação e tela do sistema novo passa por aqui antes de chegar ao app.
          Você olha, exercita e decide; a decisão fica gravada no repositório e é ela que a implementação segue.
        </p>
      </header>

      <section className="lab-secao">
        <div className="lab-secao-cabeca">
          <div>
            <h2>Fases</h2>
            <p>
              Uma fase só começa quando a anterior está aprovada. O inventário tem{" "}
              <b className="ds-num">{n.telas} telas</b>, <b className="ds-num">{n.situacoes} situações</b> e{" "}
              <b className="ds-num">{n.controles} controles</b>, e cada um deles precisa ter um lugar no desenho novo.
            </p>
          </div>
        </div>
        <AndamentoDasFases
          fases={[
            { numero: "0", nome: "Inventário", href: "/lab/inventario", itens: ITENS_DO_INVENTARIO, descricao: "Toda tela, situação e controle que existe hoje. Confirme que nada ficou de fora." },
            { numero: "1", nome: "Fundamentos", href: "/lab/fundamentos", itens: ITENS_DOS_FUNDAMENTOS, descricao: "Cor, tipo, espaço, raio, elevação, movimento e foco." },
            { numero: "2", nome: "Componentes", itens: [], descricao: "Cada peça em todos os estados: botão, campo, lista, aba, menu, compositor." },
            { numero: "3", nome: "Micro-interações", itens: [], descricao: "Cada movimento isolado, com repetição e câmera lenta." },
            { numero: "4", nome: "Telas e fluxos", itens: [], descricao: "Cada tela em cada situação, e os caminhos inteiros animados." },
            { numero: "5", nome: "Migração", itens: [], descricao: "Tokens, moldura e tela por tela no app, com a bateria verde." },
          ]}
        />
      </section>

      <section className="lab-secao">
        <div className="lab-secao-cabeca">
          <div>
            <h2>Como decidir aqui</h2>
            <p>
              Todo item tem um selo com três estados. <b>Aprovado</b> libera o item para a próxima fase.{" "}
              <b>Pedir mudança</b> abre uma nota: escreva o que mudar e por quê. <b>Pendente</b> é o começo de tudo.
              As chaves no rodapé do trilho deixam qualquer animação quatro vezes mais lenta, ou a desligam como faz quem
              pede menos movimento ao sistema.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
