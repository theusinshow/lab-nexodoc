"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaEntrada, type SituacaoEntrada } from "./tela-entrada";

export const SITUACOES: { id: SituacaoEntrada; nome: string; dica: string }[] = [
  { id: "padrao", nome: "Login", dica: "Quem chega sem sessão. Um botão: Entrar com Google. Clique nele para ver o estado seguinte." },
  { id: "indo", nome: "Indo para o Google", dica: "Clicou em Entrar: o botão gira e trava até o Google responder." },
  { id: "erro", nome: "Falha no Google", dica: "O Google recusou ou a sessão não nasceu (?error=): o aviso fica acima do botão e aponta para o contato." },
  { id: "dev", nome: "Com acesso de dev", dica: "Só em desenvolvimento: entrar como o e-mail do ambiente ou como outra pessoa, para testar duas pessoas ao mesmo tempo." },
  { id: "contato", nome: "Falar com o responsável", dica: "Abre no lugar, sem modal: e-mail, o que aconteceu (até 2000 caracteres), Enviar recado ou Esc." },
  { id: "recado-enviado", nome: "Recado enviado", dica: "O correio confirmou a saída. Enviar de novo aqui mostra o caso de dev (gravado no disco, nenhum e-mail saiu)." },
  { id: "recado-nao-saiu", nome: "Recado não saiu", dica: "O ambiente não tem e-mail configurado: a tela diz que nada foi enviado, em vez de fingir que mandou." },
  { id: "sem-acesso", nome: "Sem acesso", dica: "A conta Google é válida mas não está liberada: quem entrou, quem libera (com Pedir liberação já endereçado) e Entrar com outra conta." },
  { id: "sem-responsavel", nome: "Sem acesso, sem responsável", dica: "O ambiente não declarou administradores: a tela diz isso e o que fazer." },
];

export function VitrineDeEntrada() {
  return <Vitrine telaId="entrada" situacoes={SITUACOES} render={(s) => <TelaEntrada key={s} situacao={s} />} />;
}
