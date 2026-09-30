"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaResultado, type SituacaoRes } from "../resultado-c/tela-resultado";

const SITUACOES: { id: SituacaoRes; nome: string; dica: string }[] = [
  { id: "parecer", nome: "Relatório", dica: "O parecer em texto corrido, como a aba de hoje: projeto, status e os achados em ordem de impacto, com Copiar o texto. O papel diagramado continua no Parecer em PDF, agora à vista no painel." },
  { id: "parecer-gerando", nome: "Gerando PDF", dica: "Clicou em Parecer em PDF: um aviso embaixo diz que ele abre numa aba nova, como hoje." },
  { id: "parecer-erro", nome: "PDF falhou", dica: "O aviso vira erro, com Tentar de novo ali mesmo." },
];

export function VitrineDoParecer() {
  return <Vitrine telaId="parecer" situacoes={SITUACOES} render={(s) => <TelaResultado key={s} situacao={s} />} />;
}
