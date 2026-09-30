"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaAuditoria, type SituacaoAud } from "./tela-auditoria";

const SITUACOES: { id: SituacaoAud; nome: string; dica: string }[] = [
  { id: "em-curso", nome: "Em curso", dica: "As etapas reais do motor: a atual pulsa e diz o que está fazendo, as feitas dizem o que apuraram. O registro ao lado recebe linha nova com a hora." },
  { id: "enviando", nome: "Enviando", dica: "Antes do primeiro marco do motor: o envio enche e a primeira etapa começa." },
  { id: "passou", nome: "Passou do previsto", dica: "A etapa atual levou mais que o previsto dela: o tempo fica âmbar e a etapa ganha o selo. Só isso, sem alarme." },
  { id: "retomada", nome: "Depois de recarregar", dica: "F5 ou troca de tela: as etapas desta sessão não voltam, a tela diz isso e segue esperando o servidor." },
  { id: "cancelando", nome: "Cancelando", dica: "Cancelar pede confirmação no lugar, sem janela por cima. Continuar auditando desfaz." },
  { id: "falhou", nome: "Falhou", dica: "Parou na etapa 4: diz o que aconteceu e oferece tentar de novo." },
  { id: "concluida", nome: "Concluída", dica: "Todas as etapas com o que apuraram, o veredito numa linha e Abrir o parecer." },
];

export function VitrineDaAuditoria() {
  return <Vitrine telaId="auditoria" situacoes={SITUACOES} render={(s) => <TelaAuditoria key={s} situacao={s} />} />;
}
