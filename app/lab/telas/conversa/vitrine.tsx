"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaConversa, type SituacaoConversa } from "./tela-conversa";

const SITUACOES: { id: SituacaoConversa; nome: string; dica: string }[] = [
  { id: "confirmar-auditoria", nome: "Confirmar auditoria", dica: "Anexou o memorial: o Nexo mostra o que leu, campo a campo, e deixa escolher a análise antes de gastar tempo. Um botão, Auditar, com Enter." },
  { id: "escolher-projeto", nome: "Escolher o projeto", dica: "O código lido não casa com nenhum projeto: o Nexo pergunta onde guardar, com a opção de criar e o parecido que pode ser engano." },
  { id: "plano-de-geracao", nome: "Plano de geração", dica: "Pranchas anexadas: o plano inteiro num objeto só (LD, capa, separatrizes), com as decisões à vista e um botão." },
  { id: "capa-sem-prefeitura", nome: "Capa sem prefeitura", dica: "Os carimbos não dizem a prefeitura: a capa fica marcada, a escolha aparece ali e o botão só libera depois." },
  { id: "alteracao-pendente", nome: "Alteração pendente", dica: "Pediu para mudar algo já gerado: o Nexo mostra a diferença linha por linha antes de aplicar." },
  { id: "respondendo", nome: "Nexo respondendo", dica: "A resposta chega palavra por palavra; o botão de enviar vira Parar." },
  { id: "erro-resposta", nome: "Resposta falhou", dica: "Diz o que houve, que nada foi gasto, e deixa a pergunta no campo para mandar de novo." },
  { id: "respostas-rapidas", nome: "Respostas rápidas", dica: "O que o Nexo espera ouvir vira dois botões acima do campo, cada um com a sua tecla." },
];

export function VitrineDaConversa() {
  return <Vitrine telaId="conversa" situacoes={SITUACOES} render={(s) => <TelaConversa key={s} situacao={s} />} />;
}
