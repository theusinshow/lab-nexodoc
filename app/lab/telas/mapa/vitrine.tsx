"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaMapa, type SituacaoMapa } from "./tela-mapa";

const SITUACOES: { id: SituacaoMapa; nome: string; dica: string }[] = [
  { id: "lendo-selos", nome: "Lendo os selos", dica: "As folhas acendem uma a uma, na ordem das páginas; as já lidas podem ser abertas enquanto o resto termina. A linha iris embaixo da barra é o progresso." },
  { id: "lido", nome: "Folhas lidas", dica: "Tudo lido. À direita, o que foi lido por disciplina e as marcas que pedem conferência: clique numa para apagar as outras folhas. Troque a densidade com 1, 2 e 3." },
  { id: "folha-aberta", nome: "Folha selecionada", dica: "A ARQ-03 aberta: o carimbo inteiro, por que ela diverge e o que fazer. Ande com ← e →; Esc volta ao resumo." },
  { id: "corrigindo", nome: "Corrigindo a folha", dica: "A ELE-04, sem carimbo legível: os campos viram editáveis ali mesmo. Enter aplica, Esc cancela." },
  { id: "vou-gerar", nome: "Vou gerar", dica: "O plano pronto: os documentos a gerar estão tracejados em cada tomo, e a barra de baixo confirma. A folha sem número é lembrada antes de gerar." },
  { id: "desatualizado", nome: "Desatualizado", dica: "A LD do tomo 01 mudou depois que o volume foi montado: uma linha em cima diz isso e oferece remontar." },
  { id: "fora-da-divisao", nome: "Fora da divisão", dica: "Documentos gerados antes da divisão em tomos ficam numa fileira própria, em âmbar, com Excluir." },
];

export function VitrineDoMapa() {
  return <Vitrine telaId="mapa" situacoes={SITUACOES} render={(s) => <TelaMapa key={s} situacao={s} />} />;
}
