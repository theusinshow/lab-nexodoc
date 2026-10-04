"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaMapa, type SituacaoMapa } from "./tela-mapa";

export const SITUACOES: { id: SituacaoMapa; nome: string; dica: string }[] = [
  { id: "lendo-selos", nome: "Lendo os selos", dica: "As folhas acendem no canvas uma a uma; os tiles contam as lidas de cada tomo. Arraste para andar, role para o zoom." },
  { id: "lido", nome: "Folhas lidas", dica: "O canvas com as duas fileiras e, à direita, o checklist Antes de gerar. Afaste o zoom (−) para ver o nó virar só número; aproxime (+) para aparecer o carimbo. Clique num tile para a câmera ir ao tomo." },
  { id: "folha-aberta", nome: "Folha selecionada", dica: "A ARQ-03 aberta: a câmera centraliza nela e o lado vira o carimbo. ← e → andam de folha em folha, e a câmera acompanha." },
  { id: "corrigindo", nome: "Corrigindo a folha", dica: "A ELE-04, sem carimbo legível: os campos viram editáveis no lado. Enter aplica, Esc cancela." },
  { id: "vou-gerar", nome: "Vou gerar", dica: "Tudo conferido: o checklist fecha em 4 de 4 e o botão vira Confirmar e gerar. Os documentos tracejados no canvas são os que vão nascer." },
  { id: "desatualizado", nome: "Desatualizado", dica: "Depois de gerado: a LD corrigida e o volume velho acendem em âmbar no canvas, e o lado oferece Remontar e baixar." },
  { id: "fora-da-divisao", nome: "Fora da divisão", dica: "Uma terceira fileira, em âmbar, com os 2 documentos de antes dos tomos; o lado explica e oferece Excluir os 2." },
];

export function VitrineDoMapa() {
  return <Vitrine telaId="mapa" situacoes={SITUACOES} render={(s) => <TelaMapa key={s} situacao={s} />} />;
}
