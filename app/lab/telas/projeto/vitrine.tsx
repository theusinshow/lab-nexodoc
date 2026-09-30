"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaProjeto, type SituacaoProjeto } from "./tela-projeto";

const SITUACOES: { id: SituacaoProjeto; nome: string; dica: string }[] = [
  { id: "com-registros", nome: "Com registros", dica: "As quatro tarefas no topo, com o estado real e a ação de cada uma. Embaixo, o que a obra tem em abas (1 a 4); à direita, o que fazer agora, em ordem." },
  { id: "item-escolhido", nome: "Documento escolhido", dica: "O memorial elétrico, ainda não auditado: o lado mostra quem enviou, quando, e oferece Auditar este memorial. ↑ ↓ andam pela tabela." },
  { id: "eventos", nome: "Eventos", dica: "A aba Eventos: quem fez o quê e quando, com o resultado. Escolher um evento leva à conversa em que ele aconteceu." },
  { id: "configuracoes", nome: "Configurações", dica: "Editar código, nome, cliente e observações no lado. Arquivar e Excluir ficam embaixo, separados; excluir confirma ali mesmo, sem janela." },
  { id: "arquivado", nome: "Arquivado", dica: "Obra entregue: tudo continua para consulta, as tarefas ficam sem ação, e o topo oferece voltar para em andamento." },
  { id: "vazio", nome: "Recém-criado", dica: "Nada ainda: as tarefas dizem 'ainda não' e oferecem começar; a tabela explica que os arquivos entram pela conversa." },
];

export function VitrineDoProjeto() {
  return <Vitrine telaId="projeto" situacoes={SITUACOES} render={(s) => <TelaProjeto key={s} situacao={s} />} />;
}
