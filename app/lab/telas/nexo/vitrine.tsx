"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaNexo, type SituacaoNexo } from "./tela-nexo";

const SITUACOES: { id: SituacaoNexo; nome: string; dica: string }[] = [
  { id: "soltou", nome: "Soltou os PDFs", dica: "As pranchas entram pelo chat; o Nexo lê os selos e as folhas acendem no mapa, uma a uma, numa fileira só." },
  { id: "lido", nome: "Leu as folhas", dica: "Tudo lido: o chat resume e propõe a divisão na própria frase (tomos e onde começa o 02), com as saídas embaixo." },
  { id: "dividido", nome: "Dividiu em 2 tomos", dica: "Pediu no chat; o mapa virou duas fileiras e as folhas que mudaram de lugar (HID e ELE) acendem uma vez." },
  { id: "tirou", nome: "Tirou uma folha", dica: "\"tira a ARQ-12\": a folha fica apagada e riscada no lugar, com Restaurar no chat, até gerar." },
  { id: "gerando", nome: "Gerando", dica: "\"pode gerar\": as peças saem no chat e os papéis de capa, LD e separatrizes passam a gerados no mapa, acendendo." },
  { id: "montado", nome: "Volumes montados", dica: "\"monta os 2 volumes\": os volumes nascem no fim das fileiras e no chat, com Baixar os 2." },
  { id: "desatualizado", nome: "Volume ficou velho", dica: "Corrigiu a LD pelo chat: a LD e o volume do tomo 01 acendem em âmbar no mapa, e o chat oferece Remontar e baixar." },
];

export function VitrineDoNexo() {
  return <Vitrine telaId="nexo" reiniciavel situacoes={SITUACOES} render={(s) => <TelaNexo key={s} situacao={s} />} />;
}
