"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaConversa, type SituacaoConversa } from "./tela-conversa";

const SITUACOES: { id: SituacaoConversa; nome: string; dica: string }[] = [
  { id: "nova", nome: "Conversa nova", dica: "A pergunta no centro, o campo e os atalhos do que se faz aqui. O modo de análise mora dentro do campo." },
  { id: "anexando", nome: "Anexando", dica: "Soltou os PDFs: eles viram peças no campo, e o que ainda está sendo lido diz isso. O X aparece ao passar o mouse." },
  { id: "confirmar-auditoria", nome: "Confirmar auditoria", dica: "O que o Nexo fez numa linha, o que ele leu em texto, a decisão na frase (análise [profunda]) e as saídas empilhadas: Auditar com Enter, as outras com 1 e 2." },
  { id: "escolher-projeto", nome: "Escolher o projeto", dica: "O código lido não existe: as três saídas possíveis, a primeira com Enter." },
  { id: "plano-de-geracao", nome: "Plano de geração", dica: "O que sai, numa lista curta; o que está decidido, numa frase com as partes editáveis. Clique em Criciúma ou em 1 tomo." },
  { id: "capa-sem-prefeitura", nome: "Capa sem prefeitura", dica: "A lacuna vazia fica em âmbar na frase; a saída principal passa a ser gerar o que já pode." },
  { id: "alteracao-pendente", nome: "Alteração pendente", dica: "O que já foi gerado aparece como peça (abrir, baixar). A mudança mostra a linha riscada antes de aplicar." },
  { id: "respondendo", nome: "Nexo respondendo", dica: "A linha de estado brilha enquanto ele consulta; o texto chega palavra por palavra; enviar vira Parar." },
  { id: "erro-resposta", nome: "Resposta falhou", dica: "Uma linha só, sem caixa vermelha: o que houve, que nada foi gasto, e Tentar de novo. A pergunta fica no campo." },
];

export function VitrineDaConversa() {
  return <Vitrine telaId="conversa" situacoes={SITUACOES} render={(s) => <TelaConversa key={s} situacao={s} />} />;
}
