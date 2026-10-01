"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaNexo, type SituacaoNexo } from "./tela-nexo";

export const SITUACOES: { id: SituacaoNexo; nome: string; dica: string }[] = [
  { id: "soltou", nome: "Lendo os selos", dica: "Os PDFs entraram pelo chat; 14 de 33 folhas já viraram carimbo no mapa, a da vez está marcada e as outras esperam em contorno." },
  { id: "lido", nome: "Leu as folhas", dica: "Tudo lido: o chat propõe a divisão na própria frase, e o mapa mostra onde cortaria (o traço antes da HID-01)." },
  { id: "dividido", nome: "Dividiu em 2 tomos", dica: "Duas fileiras; o que mudou de lugar (HID e ELE) fica contornado. Arraste uma folha para outro lugar ou outro tomo." },
  { id: "tirou", nome: "Tirou uma folha", dica: "A ARQ-12 fica riscada no lugar, com Restaurar no chat, até gerar." },
  { id: "gerando", nome: "Gerou", dica: "Capa, LD e separatrizes dos 2 tomos gerados: o papel sai do molde tracejado e vira papel." },
  { id: "montado", nome: "Volumes montados", dica: "Os volumes no fim das fileiras e no chat, com Baixar os 2." },
  { id: "desatualizado", nome: "Volume ficou velho", dica: "A LD do tomo 01 foi corrigida pelo chat: ela e o volume ficam com contorno âmbar, e o chat oferece Remontar e baixar." },
];

export function VitrineDoNexo() {
  return <Vitrine telaId="nexo" situacoes={SITUACOES} render={(s) => <TelaNexo key={s} situacao={s} />} />;
}
