"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaProjetosC, type SituacaoC } from "./tela-projetos-c";

const SITUACOES: { id: SituacaoC; nome: string; dica: string }[] = [
  { id: "todas", nome: "Todas as obras", dica: "Cada linha é uma obra; o ponto colorido é a etapa atual e o texto ao lado do código diz o que a segura. Troque Em andamento/Emitidas e filtre por prefeitura." },
  { id: "gargalo", nome: "Gargalo", dica: "Filtrado por Correções: as obras paradas esperando correção de achado. Clique em outra etapa, ou de novo nesta para soltar." },
  { id: "obra-aberta", nome: "Obra aberta", dica: "A linha abre com há quanto tempo a obra está na etapa e o próximo passo como botão." },
  { id: "carregando", nome: "Carregando", dica: "As trilhas vazias no formato da tabela." },
  { id: "vazio", nome: "Nenhuma obra", dica: "Escritório novo: diz como a primeira obra entra na linha." },
];

export function VitrineDeProjetosC() {
  return <Vitrine telaId="projetos-c" situacoes={SITUACOES} render={(s) => <TelaProjetosC key={s} situacao={s} />} />;
}
