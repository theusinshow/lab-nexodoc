"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaPecas, type SituacaoPecas } from "./tela-pecas";

export const SITUACOES: { id: SituacaoPecas; nome: string; dica: string }[] = [
  { id: "paleta", nome: "Buscar (Ctrl K)", dica: "A barra de comando por cima da tela de Projeto: obras, tarefas e o Nexo. Ctrl K abre e fecha em qualquer tela; Esc limpa e depois fecha; clique fora fecha." },
  { id: "atalhos", nome: "Atalhos (?)", dica: "Os atalhos do app: os de qualquer tela, os das listas (J/K) e os do parecer (J/K percorrem, C confirma, F marca falso positivo). As letras ficam caladas enquanto se digita." },
  { id: "aviso", nome: "Aviso passageiro", dica: "Frases do app, partidas em o que aconteceu (negrito) e o que fazer. Sucesso some em 6 s, mas o relógio para com o mouse ou o foco em cima; falha espera. Ação quando existe (Ver na fila, Tentar de novo), repetido vira 2×, no máximo três à vista. No canto, dispare os cinco tipos." },
  { id: "menu", nome: "Menu da conta", dica: "Quem você é e com que alçada (as duas chaves de Pessoas: centro de controle e escritório), atalhos, Entrar com outra conta e Sair. ↑ ↓ andam, Esc devolve o foco ao avatar. Abaixo de 1280px os destinos entram aqui." },
  { id: "sino", nome: "Com você (o sino)", dica: "O app não tem caixa de notificações; o sino passa a ser “Com você”: os achados atribuídos a você, por parecer, com quem mandou, há quanto tempo e quantos impedem a entrega. O ponto só diz que a lista não está vazia." },
  { id: "pular", nome: "Pular para o conteúdo", dica: "O primeiro Tab da página (o mesmo link do app): aparece só para quem navega pelo teclado e leva direto ao conteúdo, passando a barra." },
  { id: "confirmacao", nome: "Confirmação destrutiva", dica: "A regra dos três pesos, na tela e nunca no diálogo do navegador: some das listas (frase e verbo), apaga de verdade (faixa vermelha), apaga muito e além do banco (vai/fica e a palavra)." },
  { id: "404", nome: "Página não encontrada", dica: "O endereço pedido, por que pode não existir (inclusive projeto excluído) e a saída: buscar o código na paleta já preenchida, ou ir para Projetos." },
  { id: "erro", nome: "Página que não carregou", dica: "O app não tem página de erro própria. Esta usa a frase de lib/estado-da-carga.ts para falha de rede: diz o endereço, que nada foi alterado, e oferece Tentar de novo." },
  { id: "pilula", nome: "Barra em pílula", dica: "Proposta (ref.: Navbar Interaction, 03/10): a barra solta da borda, em cápsula; o orbe num círculo; os destinos em texto, com o realce que mora no atual e desliza para onde o mouse ou o Tab está; a busca vira ícone com Ctrl K; a conta vira a pílula clara, com um brilho violeta que segue o ponteiro. Compare com qualquer outra situação, que usa a barra atual." },
  { id: "pilula-estreita", nome: "Barra em pílula, estreita", dica: "A mesma pílula em 1280, 1100, 760 e 390px: abaixo de 1280 o orbe abre o cartão de navegação, como na barra atual." },
  { id: "estreita", nome: "Tela estreita", dica: "O Topo em 1280, 1100, 760 e 390px: nada quebra linha; a navegação vai para o menu, a busca vira ícone. E o portão das telas densas (admin) num telefone." },
];

export function VitrineDePecas() {
  return <Vitrine telaId="pecas" situacoes={SITUACOES} render={(s) => <TelaPecas key={s} situacao={s} />} />;
}
