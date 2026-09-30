"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaResultado, type SituacaoRes } from "../resultado-c/tela-resultado";

const SITUACOES: { id: SituacaoRes; nome: string; dica: string }[] = [
  { id: "parecer", nome: "Pronto", dica: "O parecer como papel, claro no meio do escuro. As chaves ao lado mudam o papel na hora: tire os tratados, os motivos ou mostre quem cuida de cada achado." },
  { id: "parecer-gerando", nome: "Gerando PDF", dica: "Clicou em Parecer em PDF: o botão vira uma barra que corre, sem janela por cima." },
  { id: "parecer-erro", nome: "PDF falhou", dica: "Diz o que houve, que o texto está salvo e que tentar de novo não refaz a auditoria." },
];

export function VitrineDoParecer() {
  return <Vitrine telaId="parecer" situacoes={SITUACOES} render={(s) => <TelaResultado key={s} situacao={s} />} />;
}
