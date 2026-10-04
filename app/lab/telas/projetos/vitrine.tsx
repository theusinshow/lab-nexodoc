"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaProjetos, type SituacaoProjetos } from "./tela-projetos";

export const SITUACOES: { id: SituacaoProjetos; nome: string; dica: string }[] = [
  { id: "lista", nome: "Lista", dica: "As obras em andamento, atualizadas primeiro. À direita, por onde começar: o que espera por você e o que está parado. ↑ ↓ andam, / busca." },
  { id: "obra-escolhida", nome: "Obra escolhida", dica: "A 117-25 escolhida: o que espera nela, o que aconteceu por último e Retomar (Enter). Auditar e Montar volume entram direto na tarefa." },
  { id: "busca-vazia", nome: "Busca sem resultado", dica: "A busca não casa: a tabela diz o que procurou, onde a busca olha, e oferece limpar ou procurar em todos." },
  { id: "arquivados", nome: "Arquivados", dica: "A aba Arquivados, com uma obra entregue aberta: Abrir, e Voltar para em andamento." },
  { id: "novo", nome: "Novo projeto", dica: "O cadastro no lado, sem sair da lista: código, nome, cliente e observações. Enter cria, Esc cancela." },
  { id: "vazia", nome: "Nenhum projeto", dica: "Escritório novo: o painel inteiro diz de onde os projetos vêm e oferece criar ou auditar um memorial." },
];

export function VitrineDeProjetos() {
  return <Vitrine telaId="projetos" situacoes={SITUACOES} render={(s) => <TelaProjetos key={s} situacao={s} />} />;
}
