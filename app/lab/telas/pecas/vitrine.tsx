"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaPecas, type SituacaoPecas } from "./tela-pecas";

const SITUACOES: { id: SituacaoPecas; nome: string; dica: string }[] = [
  { id: "paleta", nome: "Buscar (Ctrl K)", dica: "A barra de comando por cima da tela de Projeto: obras, tarefas e o Nexo. Ctrl K abre e fecha em qualquer tela; Esc limpa e depois fecha; clique fora fecha." },
  { id: "atalhos", nome: "Atalhos (?)", dica: "Os atalhos do app: os de qualquer tela, os das listas (J/K) e os do parecer (J/K percorrem, C confirma, F marca falso positivo). As letras ficam caladas enquanto se digita." },
  { id: "aviso", nome: "Aviso passageiro", dica: "As frases do parecer: sucesso some sozinho em 6 s, falha espera alguém fechar. Embaixo, no centro; não escurece e não rouba o foco. No canto, dá para disparar outros." },
  { id: "menu", nome: "Menu da conta", dica: "Quem você é (e-mail, escritório, selo Admin), os atalhos e Sair. Abaixo de 1280px os destinos entram aqui, como no app; acima, não se repetem." },
  { id: "confirmacao", nome: "Confirmação destrutiva", dica: "A regra dos três pesos, na tela e nunca no diálogo do navegador: some das listas (frase e verbo), apaga de verdade (faixa vermelha), apaga muito e além do banco (vai/fica e a palavra)." },
  { id: "404", nome: "Página não encontrada", dica: "O endereço pedido, por que pode não existir (inclusive projeto excluído) e a saída: buscar o código na paleta já preenchida, ou ir para Projetos." },
  { id: "estreita", nome: "Tela estreita", dica: "O Topo em 1280, 1100, 760 e 390px: nada quebra linha; a navegação vai para o menu, a busca vira ícone. E o portão das telas densas (admin) num telefone." },
];

export function VitrineDePecas() {
  return <Vitrine telaId="pecas" situacoes={SITUACOES} render={(s) => <TelaPecas key={s} situacao={s} />} />;
}
