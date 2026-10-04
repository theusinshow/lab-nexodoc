"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaVolumes, type SituacaoVolumes } from "./tela-volumes";

const SITUACOES: { id: SituacaoVolumes; nome: string; dica: string }[] = [
  { id: "vazio", nome: "Nada importado", dica: "Primeira vez, modo independente: escolha o tipo dos próximos PDFs e solte. A montagem diz como o volume nasce." },
  { id: "montando", nome: "Montando", dica: "Arquivos à esquerda (importar aberto, com a fila), a montagem à direita. Grupo 2 é o destino; a LD que falta aparece em âmbar. Campos e Ordenar abrem só quando pedidos." },
  { id: "selecao", nome: "Páginas selecionadas", dica: "2 páginas de uma LD selecionadas: o destino no pé dos Arquivos acende e oferece Adicionar como; a LD vazia do Grupo 2 oferece Colocar aqui." },
  { id: "conferencia", nome: "Conferência", dica: "A aba Conferência: pendências, a conferência da versão e Prévia e exportação, com Gerar PDF." },
  { id: "previa", nome: "Prévia aberta", dica: "A prévia do volume, peça a peça, sobre a montagem. ← → andam, Esc fecha." },
  { id: "exportando", nome: "Exportando", dica: "Gerar PDF: a barra anda no lugar dos botões." },
  { id: "falha-gravacao", nome: "Falha de gravação", dica: "O rascunho não salvou: a barra da mesa diz isso com a frase do app." },
  { id: "recuperado", nome: "Recuperado após F5", dica: "O rascunho deste dispositivo voltou depois de recarregar: uma linha diz isso." },
];

export function VitrineDeVolumes() {
  return <Vitrine telaId="volumes" situacoes={SITUACOES} render={(s) => <TelaVolumes key={s} situacao={s} />} />;
}
