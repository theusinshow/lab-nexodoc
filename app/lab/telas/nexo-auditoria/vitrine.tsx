"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaNexoAuditoria, type SituacaoNexoAud } from "./tela-nexo-auditoria";

export const SITUACOES: { id: SituacaoNexoAud; nome: string; dica: string }[] = [
  { id: "pronta", nome: "Auditoria pronta", dica: "O resultado no palco e o resumo no chat. Escreva uma pergunta no campo (ex.: “por que a ACH-001 bloqueia?”, “o que trava a emissão?”): o Nexo responde e abre o achado ao lado. Clique numa citação para abrir o achado." },
  { id: "rodando", nome: "Auditando", dica: "A auditoria roda no palco; no chat, o passo em curso com o orbe. No protótipo, termina sozinha e o resultado abre ali." },
  { id: "achado", nome: "Pergunta sobre um achado", dica: "“Por que a ACH-002 bloqueia?”: a resposta cita o achado e o palco já abre nele, na fila." },
  { id: "no-documento", nome: "Onde está no memorial", dica: "“Me mostra onde isso aparece”: o palco abre a página 6 com o trecho grifado." },
  { id: "respondendo", nome: "Resumo para o cliente", dica: "A resposta chegando, palavra por palavra, com o relatório no palco." },
  { id: "obra", nome: "Pergunta sobre a obra", dica: "“O que falta pra emitir a 117-25?”: a resposta olha a obra inteira e oferece o próximo passo." },
];

export function VitrineDoNexoAuditoria() {
  return <Vitrine telaId="nexo-auditoria" situacoes={SITUACOES} render={(s) => <TelaNexoAuditoria key={s} situacao={s} />} />;
}
