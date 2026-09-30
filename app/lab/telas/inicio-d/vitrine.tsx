"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaInicioD, type SituacaoD } from "./tela-inicio-d";

const SITUACOES: { id: SituacaoD; nome: string; dica: string }[] = [
  { id: "padrao", nome: "Abrindo para fazer algo", dica: "Quatro tarefas, cada uma dizendo o que você precisa ter em mãos. Clique numa: o cartão cresce e vira a tarefa, os outros viram atalhos." },
  { id: "tarefa-escolhida", nome: "Tarefa escolhida", dica: "Auditar escolhido: a área de soltar diz exatamente o que soltar. Clique nela para simular um arquivo." },
  { id: "arrastando", nome: "Arrastando um arquivo", dica: "Com um arquivo sobre a tela, cada cartão vira um alvo e o de baixo do mouse diz o que vai acontecer. Arraste um PDF de verdade até um cartão." },
  { id: "arquivo-recebido", nome: "Arquivo recebido", dica: "O Nexo leu capa e carimbo, achou a obra e diz o que vai conferir, quanto tempo e quanto custa. Uma ação: Auditar." },
  { id: "achados-com-voce", nome: "Com achado para você", dica: "Quem recebeu achado normalmente chega pelo e-mail. Aqui, só um aviso discreto acima das tarefas." },
  { id: "primeiro-acesso", nome: "Primeiro acesso", dica: "Sem histórico: no lugar de Continuar, uma frase de como funciona." },
];

export function VitrineDoInicioD() {
  return <Vitrine telaId="inicio-d" situacoes={SITUACOES} render={(s) => <TelaInicioD key={s} situacao={s} />} />;
}
