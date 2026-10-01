"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaAjuda, type SituacaoAjuda } from "./tela-ajuda";

export const SITUACOES: { id: SituacaoAjuda; nome: string; dica: string }[] = [
  { id: "inicio", nome: "Ajuda", dica: "As tarefas, com Auditar um memorial marcada como o principal. À direita, o atalho para ela e como achar o resto (Ctrl K no Nexo, / aqui)." },
  { id: "tarefa", nome: "Tarefa escolhida", dica: "Auditar um memorial: o que precisa, os passos com o caminho até cada botão, a ação para começar e as palavras da tarefa (abrem o glossário)." },
  { id: "onde-fica", nome: "Onde fica", dica: "Parecer em PDF: o trajeto em degraus (Resultado › Levar adiante › Parecer em PDF), o que precisa antes e Ir para lá." },
  { id: "palavra", nome: "Palavra", dica: "Achado: a definição, onde ele fica na obra (projeto, auditoria, volume, grupo, folha) e onde mexer nele." },
  { id: "busca", nome: "Busca", dica: "“separatriz” procura nas três abas de uma vez, sem acento; a aba mostra o que achou e o resto aparece em “Também em”." },
  { id: "busca-vazia", nome: "Busca sem resultado", dica: "Nada casa: a tela diz onde a busca olha e sugere a palavra que aparece na tela." },
];

export function VitrineDeAjuda() {
  return <Vitrine telaId="ajuda" situacoes={SITUACOES} render={(s) => <TelaAjuda key={s} situacao={s} />} />;
}
