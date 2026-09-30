"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaMapa, type SituacaoMapa } from "./tela-mapa";

const SITUACOES: { id: SituacaoMapa; nome: string; dica: string }[] = [
  { id: "lendo-selos", nome: "Lendo os selos", dica: "Os tiles contam as folhas lidas de cada tomo; as linhas ainda não lidas são esqueleto e viram texto quando o selo é lido." },
  { id: "lido", nome: "Folhas lidas", dica: "À direita, o checklist Antes de gerar: 3 itens para conferir. Marque as caixas (a barra anda) ou use Ver. ↑ ↓ andam pela tabela, / busca." },
  { id: "folha-aberta", nome: "Folha selecionada", dica: "A ARQ-03 aberta: o lado vira o carimbo inteiro dela. A seleção desliza de linha em linha com ↑ e ↓; Esc volta ao checklist." },
  { id: "corrigindo", nome: "Corrigindo a folha", dica: "A ELE-04, sem carimbo legível: os campos viram editáveis no lado. Enter aplica, Esc cancela." },
  { id: "vou-gerar", nome: "Vou gerar", dica: "Tudo conferido: o checklist fecha em 4 de 4 e o botão vira Confirmar e gerar." },
  { id: "desatualizado", nome: "Desatualizado", dica: "Depois de gerado, o lado lista o que existe do tomo; a LD corrigida deixou o volume velho, e o botão é Remontar e baixar." },
  { id: "fora-da-divisao", nome: "Fora da divisão", dica: "Um terceiro tile, em âmbar, com os 2 documentos de antes da divisão numa tabela própria e Excluir os 2." },
];

export function VitrineDoMapa() {
  return <Vitrine telaId="mapa" situacoes={SITUACOES} render={(s) => <TelaMapa key={s} situacao={s} />} />;
}
