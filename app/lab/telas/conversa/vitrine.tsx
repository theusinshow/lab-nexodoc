"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaConversa, type SituacaoConversa } from "./tela-conversa";

export const SITUACOES: { id: SituacaoConversa; nome: string; dica: string }[] = [
  { id: "nova", nome: "Conversa nova", dica: "Pergunta, campo e atalhos entram em três tempos. O campo acende a borda em violeta no foco." },
  { id: "anexando", nome: "Anexando", dica: "Os PDFs entram um depois do outro; o que está sendo lido tem uma barra fina correndo no pé. Tire um pelo X: os vizinhos escorregam para o lugar." },
  { id: "confirmar-auditoria", nome: "Confirmar auditoria", dica: "A resposta entra em ordem de leitura: o visto se desenha, depois o texto, a frase, as saídas em cascata. Troque [profunda]: o valor desliza e o sublinhado acende." },
  { id: "escolher-projeto", nome: "Escolher o projeto", dica: "O código lido não existe: as três saídas possíveis, a primeira com Enter." },
  { id: "arquivo-sem-selo", nome: "PDF sem selo", dica: "Um dos arquivos não tem carimbo legível: a linha de estado vira aviso âmbar, e a primeira saída é tratá-lo como prancha." },
  { id: "auditoria-pronta", nome: "Auditoria pronta", dica: "O fecho da auditoria na conversa: quantos achados, o mais sério, e abrir o resultado. Auditar de novo abre uma nova rodada." },
  { id: "plano-de-geracao", nome: "Plano de geração", dica: "O que sai, numa lista; o que está decidido, na frase, inclusive a caracterização da obra (endereço, centro de custo, data). Embaixo, de onde a obra foi lida." },
  { id: "capa-sem-prefeitura", nome: "Capa sem prefeitura", dica: "A lacuna vazia fica em âmbar e pisca o sublinhado duas vezes, para chamar o olho; depois para." },
  { id: "gerando", nome: "Gerando", dica: "Peça por peça: a da vez gira e brilha; quando acaba, vira arquivo com um brilho que passa uma vez. Recarregue a situação para ver de novo." },
  { id: "alteracao-pendente", nome: "Alteração pendente", dica: "A linha que sai se risca na frente de quem lê, e só depois aparece o \"sai\"." },
  { id: "montar-volume", nome: "Montar o volume", dica: "Os tomos e onde começa o tomo 02 são decisões na frase, como a capa." },
  { id: "volume-montado", nome: "Volume montado", dica: "Os dois tomos nascem como peças. A conferência que não rodou é um aviso na linha de estado, não um erro." },
  { id: "conferir-selo", nome: "Conferir o selo", dica: "O carimbo das pranchas contra o memorial, campo por campo; os vistos se desenham em sequência." },
  { id: "respondendo", nome: "Nexo respondendo", dica: "Três pontos respiram antes da primeira palavra; depois o giro, as palavras acendendo, e no fim o giro vira visto e aparece Copiar resposta (passe o mouse)." },
  { id: "erro-resposta", nome: "Resposta falhou", dica: "Uma linha só, sem caixa vermelha: o que houve, que nada foi gasto, e Tentar de novo. A pergunta fica no campo." },
];

export function VitrineDaConversa() {
  return <Vitrine telaId="conversa" situacoes={SITUACOES} render={(s) => <TelaConversa key={s} situacao={s} />} />;
}
