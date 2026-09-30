"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaInicioD2, type SituacaoD2 } from "./tela-inicio-d2";

const SITUACOES: { id: SituacaoD2; nome: string; dica: string }[] = [
  { id: "padrao", nome: "Abrindo", dica: "A barra de busca em cima, as quatro tarefas numa fileira, e embaixo o que retomar e o que está com você. Clique numa tarefa para abrir logo abaixo." },
  { id: "buscando", nome: "Buscando", dica: "Digitar na barra abre a lista por cima: “117” traz a obra e as ações dela. Setas, Enter, Esc; clique fora fecha." },
  { id: "tarefa-escolhida", nome: "Tarefa escolhida", dica: "Auditar aberta: a faixa de soltar diz o que soltar. Clique nela para simular o arquivo." },
  { id: "arquivo-recebido", nome: "Arquivo recebido", dica: "Ficha técnica do que o Nexo leu: obra, revisão, o que vai fazer, tempo e custo. Uma ação." },
  { id: "arrastando", nome: "Arrastando", dica: "Com arquivo sobre a tela, cada tarefa vira alvo e diz o que vai acontecer." },
  { id: "nada-com-voce", nome: "Nada com você", dica: "Sem achado atribuído: a coluna diz isso em uma linha." },
  { id: "primeiro-acesso", nome: "Primeiro acesso", dica: "Sem histórico: as colunas explicam o que vai aparecer nelas." },
];

export function VitrineDoInicioD2() {
  return <Vitrine telaId="inicio-d2" situacoes={SITUACOES} render={(s) => <TelaInicioD2 key={s} situacao={s} />} />;
}
