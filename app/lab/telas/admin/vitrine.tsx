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
  { id: "motor", nome: "Motor", dica: "A medida em cima (qualidade: números, semana a semana contra a meta, comparação por nível e por modelo), a régua embaixo (vazão e limites, modelos e provedores por fluxo, metas, teste, runtime e chaves)." },
  { id: "motor-amostra", nome: "Motor, amostra inicial", dica: "Poucas auditorias revisadas e meta não declarada: o aviso de amostra do app, e os pontos da série ficam sem cor (sem meta, o painel não julga)." },
  { id: "motor-teste-falhou", nome: "Motor, teste do provider falhou", dica: "Testar provider respondeu 429: a resposta crua do provedor (key, status, code, type, raw), como o app mostra." },
  { id: "pessoas", nome: "Pessoas", dica: "A porta de entrada (quem entra sem convite, com a explicação do app), a régua, adicionar, filtrar e a tabela: papel, status, vínculo com o escritório (liberar/remover no hover) e as ações por pessoa." },
  { id: "pessoas-lote", nome: "Pessoas, em lote", dica: "Duas pessoas marcadas: a barra do lote (Tornar admins, Desativar, Ativar, Limpar) e a confirmação NA TELA com a frase do app." },
  { id: "pessoas-convite", nome: "Pessoas, exige convite", dica: "A porta fechada: conta nova sem convite leva 403 até alguém liberá-la aqui. Juliana aparece como CONVIDADO." },
  { id: "dados", nome: "Dados", dica: "O expurgo primeiro (conversas por obra, quanto cada uma guarda), depois o histórico de auditorias e a operação de LDs, com filtros e exclusão." },
  { id: "dados-expurgo", nome: "Dados, expurgar uma obra", dica: "A prévia conta o que VAI e o que FICA com o mesmo peso, avisa quantas máquinas recebem a lápide e pede a palavra (sem acento e sem caixa); o botão só acende quando confere." },
  { id: "dados-excluir", nome: "Dados, excluir auditorias", dica: "No app, o navegador pergunta; aqui a confirmação vem na tela, com a mesma frase do app." },
  { id: "erro", nome: "Token recusado", dica: "O servidor recusou o token: a frase real do app, Tentar de novo, e o campo reaberto no trilho com o aviso." },
];

export function VitrineDeAdmin() {
  return <Vitrine telaId="admin" situacoes={SITUACOES} render={(s) => <TelaAdmin key={s} situacao={s} />} />;
}
