"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaVolumes, type SituacaoVolumes } from "./tela-volumes";

const SITUACOES: { id: SituacaoVolumes; nome: string; dica: string }[] = [
  { id: "vazio", nome: "Nada importado", dica: "Primeira vez: as três etapas no topo dizem a sequência; só a 1 está aberta, e o lado explica como funciona." },
  { id: "arquivos", nome: "1. Arquivos", dica: "Os PDFs numa tabela, com o tipo lido (trocável) e a fila do que está entrando. À direita, o que o Nexo entendeu e UMA ação: Montar o volume." },
  { id: "montagem", nome: "2. Montagem", dica: "O Nexo montou pela ordem de sempre: capa, e por disciplina separatriz, LD e pranchas. Cada linha diz em que página do PDF começa. A LD que falta é uma linha âmbar com Escolher a LD." },
  { id: "escolher-paginas", nome: "Escolher a LD", dica: "A biblioteca só aparece aqui, no lado, já filtrada para LDs, com o aviso de que essas páginas já são a LD de outra disciplina." },
  { id: "conferir", nome: "3. Conferir e exportar", dica: "A prévia do volume ocupa o centro (← → andam); o lado diz o que falta, para onde vai e Gerar PDF." },
  { id: "exportando", nome: "Exportando", dica: "Gerar PDF: a barra anda no lugar do botão." },
  { id: "falha-gravacao", nome: "Falha de gravação", dica: "O rascunho não salvou: o aviso fica no topo, ao lado de desfazer, com Tentar de novo." },
  { id: "recuperado", nome: "Recuperado após recarregar", dica: "A montagem voltou do rascunho deste dispositivo: uma linha diz isso e oferece começar do zero." },
];

export function VitrineDeVolumes() {
  return <Vitrine telaId="volumes" situacoes={SITUACOES} render={(s) => <TelaVolumes key={s} situacao={s} />} />;
}
