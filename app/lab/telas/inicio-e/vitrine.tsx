"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaInicioE, type SituacaoE } from "./tela-inicio-e";

const SITUACOES: { id: SituacaoE; nome: string; dica: string }[] = [
  { id: "vazia", nome: "Mesa vazia", dica: "O começo. Clique na mesa (ou arraste um PDF de verdade até ela) para ver os documentos chegarem." },
  { id: "chegando", nome: "Documentos chegando", dica: "As folhas caem soltas, o Nexo lê cada carimbo (a linha passa por cada uma) e elas deslizam para as pilhas." },
  { id: "arrumada", nome: "Mesa arrumada", dica: "Memorial, capa, LD e pranchas por disciplina. Passe o mouse numa pilha para abrir em leque; passe numa ação embaixo para ver quais pilhas ela usa." },
  { id: "escolhendo", nome: "Escolhendo o que fazer", dica: "Com o mouse em Gerar LD e capa: as pranchas acendem e o resto apaga." },
  { id: "pilha-aberta", nome: "Pilha aberta", dica: "A pilha de Arquitetura aberta folha por folha, com o código lido de cada carimbo. Uma folha sem carimbo aparece marcada." },
  { id: "so-memorial", nome: "Só o memorial", dica: "Com só o memorial, dá para auditar; as outras ações dizem o que falta." },
  { id: "misturadas", nome: "Duas obras", dica: "Três pranchas de outra obra vieram junto. O Nexo avisa e trava as ações até separar. Clique em Tirar as da SIM099-26." },
];

export function VitrineDoInicioE() {
  return <Vitrine telaId="inicio-e" situacoes={SITUACOES} render={(s) => <TelaInicioE key={s} situacao={s} />} />;
}
