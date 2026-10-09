/**
 * O ROTEIRO do passo a passo do MAPA DO VOLUME (09/10/2026). Montar volume
 * ficou sem explicação quando o tour do primeiro acesso saiu; este roteiro
 * volta a ensinar, mas só quando a pessoa pede (o "?" ao lado das abas), sobre
 * o volume DE VERDADE que está aberto.
 *
 * Mesmas regras do roteiro do resultado: uma frase diz o que é, a outra o que
 * a pessoa faz; os rótulos citados são os da tela; o tour só troca de vista
 * (clica em "Volume"), nunca em Montar, Baixar ou Dividir — o volume é real.
 * O teste (`scripts/test-nexo-tour.ts`) confere que todo alvo existe.
 */
import type { PassoDoTour } from "./passos-do-tour.ts";

export const PASSOS_DO_TOUR_DO_VOLUME: PassoDoTour[] = [
  {
    id: "abertura",
    capitulo: "O mapa",
    titulo: "O volume, parte por parte",
    corpo:
      "Vou mostrar como as folhas viram volume e onde se monta e se baixa. Nada é montado nem baixado durante o passo a passo. Setas andam; Esc ou um clique fora sai, e o \"?\" retoma de onde você parou.",
    clicarAntes: '[data-tour="aba-volume"]',
  },
  {
    id: "abas",
    titulo: "Três jeitos de ver",
    corpo:
      "Volume é este mapa, onde se organiza e monta. Lista mostra as capas e os tomos em folha A4, sem o mapa. Obra junta todos os volumes do projeto, para quem monta vários.",
    alvo: '[data-tour="abas-do-volume"]',
    lado: "direita",
  },
  {
    id: "fileiras",
    titulo: "Cada fileira é um tomo",
    corpo:
      "As folhas lidas ficam na ordem em que o volume vai sair, uma fileira por tomo. Arrastar uma folha para outra fileira muda o tomo dela, e a montagem obedece ao que estiver aqui.",
    alvo: '[data-tour="canvas-do-volume"]',
    lado: "direita",
  },
  {
    id: "cabeca",
    titulo: "O cabeçalho do tomo",
    corpo:
      "Diz em que pé o tomo está: o que falta, se já foi montado e quanto pesa. É daqui que o tomo é montado e baixado, um por um.",
    alvo: '[data-tour="cabeca-do-tomo"]',
    aproximar: true,
    lado: "abaixo",
    soSeExistir: '[data-tour="cabeca-do-tomo"]',
  },
  {
    id: "pecas",
    titulo: "Capa, separatriz e LD",
    corpo:
      "Os documentos que o Nexo escreve a partir dos selos. A capa abre o volume; cada disciplina ganha uma separatriz e uma LD (lista de documentos) antes das pranchas dela. A separatriz nasce ao montar.",
    alvo: '[data-tour="pecas-do-tomo"]',
    aproximar: true,
    lado: "abaixo",
    soSeExistir: '[data-tour="pecas-do-tomo"]',
  },
  {
    id: "acao",
    titulo: "Montar",
    corpo:
      "Junta capa, separatrizes, LDs e pranchas num PDF só. Se faltar a capa e a LD, o botão diz \"Gerar capa e LD\" primeiro. Depois de uma mudança, vira \"Remontar\". Botão apagado explica o motivo ao passar o mouse.",
    alvo: '[data-tour="acao-do-tomo"]',
    aproximar: true,
    lado: "abaixo",
    soSeExistir: '[data-tour="acao-do-tomo"]',
  },
  {
    id: "teto",
    titulo: "Acima de 20 MB",
    corpo:
      "A prefeitura recusa arquivo acima de 20 MB. Comprimir imagens reduz só as imagens das pranchas; Dividir reparte as folhas em mais tomos, sem perda nenhuma.",
    alvo: '[data-tour="saidas-do-teto"]',
    aproximar: true,
    lado: "abaixo",
    soSeExistir: '[data-tour="saidas-do-teto"]',
  },
  {
    id: "conferencia",
    titulo: "Conferência da LD",
    corpo:
      "A LD ao lado do mapa, na mesma ordem: cada linha diz se bate com a prancha. Clicar numa linha seleciona a folha no mapa, e a seleção no mapa rola a lista até ela.",
    alvo: '[data-tour="conferencia-da-ld"]',
    lado: "esquerda",
    soSeExistir: '[data-tour="conferencia-da-ld"]',
  },

  // --- A entrega -----------------------------------------------------------------
  {
    id: "doca",
    capitulo: "A entrega",
    titulo: "A doca de entrega",
    corpo:
      "Fica sempre no rodapé: quantos tomos já foram montados, o peso total e os dois botões, na ordem em que se usa.",
    alvo: '[data-tour="doca"]',
    lado: "acima",
    soSeExistir: '[data-tour="doca"]',
  },
  {
    id: "editaveis",
    titulo: "1. Editáveis (ODT)",
    corpo:
      "Capa e LDs em ODT, num ZIP, para guardar na pasta do projeto. É o que a equipe corrige depois, por isso vem primeiro: os volumes só liberam com eles baixados.",
    alvo: '[data-tour="doca-editaveis"]',
    lado: "acima",
    soSeExistir: '[data-tour="doca-editaveis"]',
  },
  {
    id: "volumes",
    titulo: "2. Baixar o volume",
    corpo:
      "Os PDFs montados, um por tomo, prontos para entregar à prefeitura. Se uma folha mudar depois, o Nexo avisa no chat que o volume ficou desatualizado.",
    alvo: '[data-tour="doca-volumes"]',
    lado: "acima",
    soSeExistir: '[data-tour="doca-volumes"]',
  },
  {
    id: "fecho",
    titulo: "É isso",
    corpo: "Para rever, use o \"?\" ao lado das abas. O resto se pede no chat, em português: \"divide em dois tomos\", \"muda o volume para II\".",
    alvo: '[data-tour="tour-do-volume"]',
    lado: "direita",
  },
];
