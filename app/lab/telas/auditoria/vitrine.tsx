"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaAuditoria, type SituacaoAud } from "./tela-auditoria";

const SITUACOES: { id: SituacaoAud; nome: string; dica: string }[] = [
  { id: "em-curso", nome: "Em curso", dica: "Linha do tempo das etapas reais: feitas em cinza, a mais lenta clara, a atual em iris, as que faltam tracejadas onde devem cair. Ao lado, o mapa das páginas lidas e o registro." },
  { id: "enviando", nome: "Enviando", dica: "Antes do primeiro marco do motor: todas as etapas ainda tracejadas, o marcador agora no zero." },
  { id: "passou", nome: "Passou do previsto", dica: "A etapa atual passou do previsto: a pílula e o restante ficam âmbar. Só isso, sem alarme." },
  { id: "retomada", nome: "Depois de recarregar", dica: "F5 ou troca de tela: as etapas desta sessão não voltam, a tela diz isso e segue esperando o servidor." },
  { id: "cancelando", nome: "Cancelando", dica: "Cancelar pede confirmação no lugar, sem janela por cima. Continuar auditando desfaz." },
  { id: "falhou", nome: "Falhou", dica: "Parou na etapa 4: diz o que aconteceu e oferece tentar de novo." },
  { id: "concluida", nome: "Concluída", dica: "A linha do tempo inteira com o tempo real de cada etapa, o veredito numa linha e Abrir o parecer." },
];

export function VitrineDaAuditoria() {
  return <Vitrine telaId="auditoria" situacoes={SITUACOES} render={(s) => <TelaAuditoria key={s} situacao={s} />} />;
}
