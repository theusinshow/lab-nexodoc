/**
 * O ROTEIRO do tutorial da TELA DE RESULTADO da auditoria — cada parte e cada
 * botão, na ordem em que a pessoa encontra (08/10/2026, pedido do Matheus:
 * "um tutorial focado em cada opção e cada botão para ver o que cada opção faz").
 *
 * Roda sobre o parecer DE VERDADE que está aberto, não sobre um exemplo: o
 * resultado já tem o que mostrar. O tour só troca de leitura (Resumo, Achados,
 * Relatório, No documento) clicando no trilho, como a pessoa faria; nunca clica
 * em nada que grave (encerrar, atribuir, votar), porque o parecer é real.
 *
 * Mesma regra de texto do tour do Nexo: uma frase diz O QUE é, a outra diz o
 * que a pessoa FAZ com aquilo. Os rótulos citados são os da tela; o teste
 * (`scripts/test-nexo-tour.ts`) confere que todo alvo existe no código vivo.
 */
import type { PassoDoTour } from "./passos-do-tour.ts";

export const PASSOS_DO_TOUR_DO_RESULTADO: PassoDoTour[] = [
  {
    id: "abertura",
    capitulo: "Resumo",
    titulo: "O resultado da auditoria, parte por parte",
    corpo:
      "Vou mostrar o que cada parte desta tela diz e o que cada botão faz. Nada é alterado no parecer durante o passo a passo. Setas do teclado andam; Esc ou um clique fora sai, e o botão de interrogação do trilho retoma de onde você parou.",
    clicarAntes: '[data-tour="vista-summary"]',
  },

  // --- Resumo -----------------------------------------------------------------
  {
    id: "faixa-do-veredito",
    titulo: "O veredito vem primeiro",
    corpo:
      "Diz se o memorial pode ser emitido: vermelho é não emitir, âmbar é revisar antes, verde é liberado. Embaixo, quantos achados você já tratou e quantos bloqueios continuam abertos.",
    alvo: '[data-tour="faixa-do-veredito"]',
    lado: "abaixo",
  },
  {
    id: "falta-tratar",
    titulo: "Falta tratar",
    corpo:
      "Os achados ainda abertos, do mais grave para o mais leve, agrupados pelo nível. Clique numa linha para abrir o achado inteiro na fila.",
    alvo: '[data-tour="falta-tratar"]',
    lado: "acima",
  },
  {
    id: "acoes-da-linha",
    titulo: "Atalhos de cada linha",
    corpo:
      "Aparecem ao passar o mouse. O visto marca o achado como corrigido sem abrir a fila; a lupa abre o memorial na página do trecho; a seta abre o achado.",
    alvo: '[data-tour="linha-do-resumo"] .rc-acoes',
    revelar: '[data-tour="linha-do-resumo"]',
    lado: "esquerda",
    soSeExistir: '[data-tour="linha-do-resumo"]',
  },
  {
    id: "abrir-a-fila",
    titulo: "Abrir a fila",
    corpo: "Leva à lista completa de achados, um por vez, com tudo o que dá para fazer em cada um.",
    alvo: '[data-tour="abrir-a-fila"]',
    lado: "esquerda",
    soSeExistir: '[data-tour="abrir-a-fila"]',
  },
  {
    id: "por-disciplina",
    titulo: "Por disciplina",
    corpo:
      "Quantos achados cada disciplina tem e quantos ainda estão pendentes. Clique numa disciplina para abrir a fila no primeiro achado pendente dela.",
    alvo: '[data-tour="por-disciplina"]',
    lado: "abaixo",
    soSeExistir: '[data-tour="por-disciplina"]',
  },
  {
    id: "onde-estao",
    titulo: "Onde estão",
    corpo:
      "As páginas do memorial, em miniatura: quanto mais escura, mais pontos marcados nela. \"No documento\" abre essa leitura em tamanho grande.",
    alvo: '[data-tour="onde-estao"]',
    lado: "abaixo",
    soSeExistir: '[data-tour="onde-estao"]',
  },
  {
    id: "o-que-foi-lido",
    titulo: "O que foi lido",
    corpo:
      "O arquivo auditado, quantas páginas e caracteres a IA leu e que análises rodaram. Serve para conferir se a auditoria leu o documento certo e inteiro.",
    alvo: '[data-tour="o-que-foi-lido"]',
    lado: "acima",
    soSeExistir: '[data-tour="o-que-foi-lido"]',
  },

  // --- O trilho -----------------------------------------------------------------
  {
    id: "anel",
    capitulo: "Trilho",
    titulo: "O anel do veredito",
    corpo:
      "O ponto no meio tem a cor do veredito e o anel enche conforme os achados são tratados. Clique nele para o resumo completo: linha do tempo da auditoria, páginas e achados por nível.",
    alvo: '[data-tour="veredito-parecer"]',
    lado: "esquerda",
  },
  {
    id: "vistas",
    titulo: "Quatro leituras do mesmo parecer",
    corpo:
      "Resumo, Achados (a fila), Relatório e No documento. O número no ícone da fila é quanto falta tratar. As teclas 1, 2, 3 e 4 trocam entre elas.",
    alvo: '[data-tour="vistas"]',
    lado: "esquerda",
  },
  {
    id: "perguntar",
    titulo: "Perguntar ao Nexo",
    corpo: "Abre a conversa desta auditoria com o campo pronto. Pergunte o que quiser sobre o parecer ou sobre um achado.",
    alvo: '[data-tour="perguntar-ao-nexo"]',
    lado: "esquerda",
    soSeExistir: '[data-tour="perguntar-ao-nexo"]',
  },
  {
    id: "parecer-pdf",
    titulo: "Parecer em PDF",
    corpo:
      "Gera o parecer formal, com veredito, achados e o que já foi tratado, e abre numa aba nova para salvar ou mandar.",
    alvo: '[data-tour="parecer-pdf"]',
    lado: "esquerda",
  },

  // --- A fila -------------------------------------------------------------------
  {
    id: "fila",
    capitulo: "Achados",
    titulo: "A fila de achados",
    corpo: "À esquerda a lista, à direita o achado escolhido. É aqui que cada achado é tratado, um de cada vez.",
    alvo: '[data-tour="palco-do-resultado"]',
    lado: "esquerda",
    clicarAntes: '[data-tour="vista-findings"]',
  },
  {
    id: "busca",
    titulo: "Buscar e filtrar",
    corpo:
      "A busca acha por texto, referência ou página. O botão ao lado abre os filtros: responsável, gravidade, disciplina, tipo, ordem e agrupamento.",
    alvo: '[data-tour="fila-busca"]',
    lado: "abaixo",
    soSeExistir: '[data-tour="fila-busca"]',
  },
  {
    id: "situacoes",
    titulo: "Pendentes, Meus, Corrigidos",
    corpo:
      "Escolhem o que a lista mostra: o que falta tratar, o que está com você, o que já foi corrigido. Em \"Mais\" ficam Todos, Sem responsável e Encerrados.",
    alvo: '[data-tour="fila-situacoes"]',
    lado: "abaixo",
    soSeExistir: '[data-tour="fila-situacoes"]',
  },
  {
    id: "linhas",
    titulo: "A lista",
    corpo:
      "Cada linha é um achado, com a disciplina e o responsável. Passe o mouse para marcar corrigido ou atribuir sem abrir; a caixa da linha seleciona vários para atribuir de uma vez.",
    alvo: '[data-tour="fila-linhas"]',
    lado: "direita",
    soSeExistir: '[data-tour="fila-linhas"]',
  },
  {
    id: "faltou",
    titulo: "Faltou apontar algum problema?",
    corpo: "Se você viu um erro que a auditoria não apontou, conte aqui o que ficou de fora e em que página: fica registrado nesta auditoria.",
    alvo: '[data-tour="faltou"]',
    lado: "direita",
    soSeExistir: '[data-tour="faltou"]',
  },
  {
    id: "identidade",
    titulo: "Quem é o achado",
    corpo:
      "O código, o nível (o que impede emitir ou pede decisão), a disciplina e de onde veio: regra verificada, IA conferida por um segundo modelo ou a conversa. À direita, as setas andam entre achados e o elo copia o link deste.",
    alvo: '[data-tour="achado-identidade"]',
    lado: "abaixo",
    soSeExistir: '[data-tour="achado-identidade"]',
  },
  {
    id: "atribuir",
    titulo: "Atribuir",
    corpo:
      "Passa o achado para alguém do escritório resolver. Não manda e-mail sozinho: o aviso sai pela barra \"Notificar por e-mail\", que aparece no topo da lista.",
    alvo: '[data-tour="atribuir"]',
    lado: "abaixo",
    soSeExistir: '[data-tour="atribuir"]',
  },
  {
    id: "avaliar-ia",
    titulo: "A IA acertou?",
    corpo:
      "\"Procede\" diz que a IA leu certo; \"Gravidade errada\" diz se era mais ou menos grave. É um voto para calibrar o motor: não encerra o achado.",
    alvo: '[data-tour="avaliar-ia"]',
    lado: "abaixo",
    soSeExistir: '[data-tour="avaliar-ia"]',
  },
  {
    id: "partes",
    titulo: "O que está errado, por que importa, o que fazer",
    corpo:
      "À esquerda, o problema, a consequência e a correção recomendada. À direita, a página do memorial com o trecho marcado; \"Ampliar\" abre o PDF nela.",
    alvo: '[data-tour="achado-conteudo"]',
    lado: "acima",
    soSeExistir: '[data-tour="achado-conteudo"]',
  },
  {
    id: "texto-corrigido",
    titulo: "Texto corrigido",
    corpo:
      "A IA escreve o trecho já corrigido: o que procurar no memorial e o que colocar no lugar, prontos para copiar. Só aparece quando a correção é de texto.",
    alvo: '[data-tour="texto-corrigido"]',
    lado: "abaixo",
    soSeExistir: '[data-tour="texto-corrigido"]',
  },
  {
    id: "abas",
    titulo: "Evidência, Conversa, Histórico",
    corpo:
      "Evidência traz os trechos que sustentam o achado; Conversa é onde a equipe comenta este achado; Histórico mostra quem fez o quê e quando.",
    alvo: '[data-tour="achado-abas"]',
    lado: "acima",
    soSeExistir: '[data-tour="achado-abas"]',
  },
  {
    id: "encerrar",
    titulo: "Encerrar o achado",
    corpo:
      "Marcar corrigido: você corrigiu ou vai corrigir o memorial (o PDF não muda sozinho). Decisão técnica: o projeto segue assim de propósito, e o motivo vai no parecer. Falso positivo: a IA errou. Tudo se desfaz com Z logo depois, ou com Reabrir.",
    alvo: '[data-tour="encerrar"]',
    lado: "acima",
    soSeExistir: '[data-tour="encerrar"]',
  },
  {
    id: "atalhos",
    titulo: "Atalhos",
    corpo:
      "J e K andam, C, D e F encerram, M abre o PDF na página do trecho. A tecla ? mostra a lista inteira.",
    alvo: '[data-tour="atalhos-da-fila"]',
    lado: "acima",
    soSeExistir: '[data-tour="atalhos-da-fila"]',
  },

  // --- As outras leituras ---------------------------------------------------------
  {
    id: "relatorio",
    capitulo: "Outras leituras",
    titulo: "Relatório",
    corpo:
      "O parecer em texto corrido, seção por seção. \"Copiar o texto\" leva tudo para colar num e-mail ou num documento.",
    alvo: '[data-tour="relatorio-barra"]',
    lado: "abaixo",
    clicarAntes: '[data-tour="vista-report"]',
  },
  {
    id: "no-documento",
    titulo: "No documento",
    corpo:
      "As páginas do memorial com uma etiqueta em cada trecho apontado; clique numa para abrir o achado. \"Com achados\" e \"Todas\" escolhem as páginas, e cada nível da legenda liga e desliga as etiquetas dele.",
    alvo: '[data-tour="no-documento-barra"]',
    lado: "abaixo",
    soSeExistir: '[data-tour="chip-no-documento"]',
    clicarAntes: '[data-tour="chip-no-documento"]',
  },
  {
    id: "fecho",
    titulo: "É isso",
    corpo:
      "Para rever este passo a passo, use o botão de interrogação no trilho, abaixo do Parecer em PDF.",
    alvo: '[data-tour="tour-do-resultado"]',
    lado: "esquerda",
    clicarAntes: '[data-tour="vista-summary"]',
  },
];
