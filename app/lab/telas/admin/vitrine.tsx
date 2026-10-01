"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaAdmin, type SituacaoAdmin } from "./tela-admin";

const SITUACOES: { id: SituacaoAdmin; nome: string; dica: string }[] = [
  { id: "sem-token", nome: "Aguardando token", dica: "Ninguém informou o token: o campo abre no pé do trilho, o veredito diz “aguardando token” e os números ficam em “—” (zero não é “não sei”)." },
  { id: "cockpit", nome: "Cockpit", dica: "Tudo de pé: o veredito no trilho, “nada exigindo ação”, os cinco números (cada um abre o seu destino), auditorias e LDs recentes e quem fez o quê." },
  { id: "atencao", nome: "Exige ação", dica: "Degradado: o motivo sob o veredito e a faixa do que exige ação, com as frases do app. A falha aparece em coral nos números e na lista." },
  { id: "erro", nome: "Token recusado", dica: "O servidor recusou o token: a frase real do app, Tentar de novo, e o campo reaberto no trilho com o aviso." },
];

export function VitrineDeAdmin() {
  return <Vitrine telaId="admin" situacoes={SITUACOES} render={(s) => <TelaAdmin key={s} situacao={s} />} />;
}
