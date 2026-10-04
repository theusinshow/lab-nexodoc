"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaPainelOficio, type SituacaoDoOficio } from "./tela-painel-oficio";

const SITUACOES: { id: SituacaoDoOficio; nome: string; dica: string }[] = [
  { id: "dia-normal", nome: "Dia normal", dica: "Abre no carimbo e no que trava a emissão. Clique num achado para ver o trecho do documento; ordene as obras pelo cabeçalho." },
  { id: "nexo-trabalhando", nome: "Nexo trabalhando", dica: "Uma auditoria rodando: o orbe do topo trabalha e o mostrador conta os blocos lidos e o tempo que falta." },
  { id: "nada-travando", nome: "Nada travando", dica: "Tudo liberado: o carimbo diz \"nada\" e a seção vira uma linha, sem festa." },
  { id: "arrastando", nome: "Soltando um PDF", dica: "Os dois destinos do arquivo, memorial e pranchas. Clique para fechar, ou arraste um PDF de verdade." },
  { id: "primeiro-acesso", nome: "Primeiro acesso", dica: "Nenhuma obra ainda. A tela diz o que fazer, no lugar onde as coisas vão aparecer." },
  { id: "carregando", nome: "Carregando", dica: "As obras ainda vêm do servidor: o esqueleto tem as colunas da tabela." },
  { id: "erro", nome: "Deu erro", dica: "O servidor não respondeu. Tentar de novo mostra a recuperação." },
];

export function VitrineDoOficio() {
  return <Vitrine telaId="painel-oficio" situacoes={SITUACOES} render={(s) => <TelaPainelOficio key={s} situacao={s} />} />;
}
