"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaPainelB, type SituacaoB } from "./tela-painel-b";

const SITUACOES: { id: SituacaoB; nome: string; dica: string }[] = [
  { id: "dia-normal", nome: "Dia normal", dica: "A fila em três faixas. Clique num item para ver a evidência; clique na ação (Marcar corrigido, Decidir) e veja o item sair, o número descer e o Desfazer aparecer." },
  { id: "item-aberto", nome: "Item aberto", dica: "O achado abre no lugar, com o trecho do memorial e a página, sem sair do painel." },
  { id: "escrevendo", nome: "Pedindo ao Nexo", dica: "O campo cresce e sugere os pedidos comuns. Aperte Enter: o pedido vai para Em andamento." },
  { id: "nexo-terminando", nome: "Nexo terminando", dica: "A auditoria chega a 100%: o cartão vira Pronto e o parecer entra no topo da fila." },
  { id: "soltando-pdf", nome: "Soltando um PDF", dica: "Arraste um PDF para a tela, ou clique para fechar. Ao soltar, vira um trabalho em andamento." },
  { id: "fila-vazia", nome: "Fila zerada", dica: "Tudo resolvido: a fila comemora sem festa e mostra o que você fechou na semana." },
  { id: "primeiro-acesso", nome: "Primeiro acesso", dica: "Nada ainda: o campo do Nexo ganha destaque e cada área explica o que vai aparecer nela." },
  { id: "carregando", nome: "Carregando", dica: "O esqueleto tem o formato da fila que vai chegar." },
  { id: "deu-erro", nome: "Deu erro", dica: "A fila não carregou, mas o Nexo e a lateral seguem funcionando. Tente de novo." },
];

export function VitrineDoPainelB() {
  return <Vitrine telaId="painel-b" situacoes={SITUACOES} render={(s) => <TelaPainelB key={s} situacao={s} />} />;
}
