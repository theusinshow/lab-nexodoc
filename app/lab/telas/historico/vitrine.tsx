"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaHistorico, type SituacaoHistorico } from "./tela-historico";

export const SITUACOES: { id: SituacaoHistorico; nome: string; dica: string }[] = [
  { id: "dia", nome: "Um dia de trabalho", dica: "Agora (a auditoria rodando), Hoje, Esta semana, Antes. A obra fica no grupo da conversa mais recente; cada conversa diz como terminou. Teclado: / busca, ↑ ↓ andam, ← → recolhem a obra." },
  { id: "busca", nome: "Buscando", dica: "“cric”: casa no município, no código, na obra e no título; o trecho fica marcado e as obras recolhidas se abrem." },
  { id: "auditorias", nome: "Só auditorias", dica: "O filtro tira volumes e documentos; as obras sem auditoria somem." },
  { id: "exemplos", nome: "Exemplos e testes abertos", dica: "O projeto de exemplo e as simulações da bateria ficam à parte, recolhidos no fim, e mais apagados." },
  { id: "vazio", nome: "Primeira vez", dica: "Ninguém conversou ainda: a coluna diz o que vai aparecer ali." },
];

export function VitrineDoHistorico() {
  return <Vitrine telaId="historico" situacoes={SITUACOES} render={(s) => <TelaHistorico key={s} situacao={s} />} />;
}
