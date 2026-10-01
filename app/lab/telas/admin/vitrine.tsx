"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaAdmin, type SituacaoAdmin } from "./tela-admin";

const SITUACOES: { id: SituacaoAdmin; nome: string; dica: string }[] = [
  { id: "sem-token", nome: "Aguardando token", dica: "Ninguém informou o token: o campo abre no pé do trilho, o veredito diz “aguardando token” e os números ficam em “—” (zero não é “não sei”)." },
  { id: "cockpit", nome: "Cockpit", dica: "Tudo de pé: o veredito no trilho, “nada exigindo ação”, os cinco números (cada um abre o seu destino), auditorias e LDs recentes e quem fez o quê." },
  { id: "atencao", nome: "Exige ação", dica: "Degradado: o motivo sob o veredito e a faixa do que exige ação, com as frases do app. A falha aparece em coral nos números e na lista." },
  { id: "dinheiro", nome: "Dinheiro", dica: "Teto e cotação abrem a tela, cada valor dizendo de onde veio (declarado aqui, vem do ambiente); a fatura do período na régua; uso diário, modelos, itens de custo, custo por obra e uso interno. O real vem colado no dólar, com “≈”." },
  { id: "dinheiro-sem-cotacao", nome: "Dinheiro, sem cotação", dica: "Ninguém declarou a cotação: a tela diz isso e tudo fica em dólar. Nenhum real é inventado." },
  { id: "dinheiro-sem-preco", nome: "Dinheiro, chamadas sem preço", dica: "Um modelo fora da tabela de preços: o total vira piso (“≥”), a ressalva diz quantas chamadas e qual modelo, e a tabela por obra avisa que é amostra dos 500 eventos mais recentes." },
  { id: "erro", nome: "Token recusado", dica: "O servidor recusou o token: a frase real do app, Tentar de novo, e o campo reaberto no trilho com o aviso." },
];

export function VitrineDeAdmin() {
  return <Vitrine telaId="admin" situacoes={SITUACOES} render={(s) => <TelaAdmin key={s} situacao={s} />} />;
}
