/*
 * O CONTEÚDO DA AJUDA, no redesenho. Cada caminho foi conferido nas telas
 * aprovadas do lab (Início D revisto, Conversa, Nexo, Resultado E, Mapa): uma
 * ajuda que descreve um botão que não existe é pior que ajuda nenhuma. No app,
 * "Onde fica" e os destinos continuam saindo da paleta e da navegação.
 */

export type Passo = { texto: string; caminho?: string[]; tecla?: string };

export type Tarefa = {
  id: string;
  nome: string;
  precisa: string;
  comeca: string;
  passos: Passo[];
  ir: string;
  palavras: string[];
  principal?: boolean;
  sinonimos?: string[];
};

export type Lugar = { id: string; nome: string; caminho: string[]; precisa: string; tecla?: string; nota?: string; sinonimos?: string[] };

export type Palavra = { id: string; termo: string; texto: string; nivel?: number; ve?: string[]; sinonimos?: string[] };

export const TAREFAS: Tarefa[] = [
  {
    id: "auditar",
    nome: "Auditar um memorial",
    principal: true,
    precisa: "O memorial descritivo em PDF.",
    comeca: "Início",
    passos: [
      { texto: "No Início, escolha a tarefa e solte o PDF. Também vale soltar direto numa conversa do Nexo.", caminho: ["Início", "Auditar um memorial"] },
      { texto: "O Nexo lê a capa e o carimbo e diz de que obra é. Confirme o projeto, ou crie um se a obra for nova." },
      { texto: "Escolha a leitura: Rápida, ou Profunda quando o memorial for longo ou a obra pedir mais cuidado. Pode fechar a aba enquanto roda.", caminho: ["Auditar"] },
      { texto: "O Resultado abre com o veredito e a fila de achados, do que impede emitir ao que é só texto.", caminho: ["Resultado", "Resumo"] },
    ],
    ir: "Abrir o Início",
    palavras: ["parecer", "achado", "veredito", "nivel"],
    sinonimos: ["auditoria", "memorial descritivo", "revisar memorial", "conferir memorial", "analisar"],
  },
  {
    id: "tratar",
    nome: "Tratar os achados",
    precisa: "Um parecer aberto.",
    comeca: "Resultado",
    passos: [
      { texto: "Abra a fila. J e K andam de achado em achado.", caminho: ["Resultado", "Achados"], tecla: "J K" },
      { texto: "Para cada um: C marca corrigido, D registra decisão técnica com o motivo, F diz que é falso positivo. Z desfaz.", tecla: "C D F" },
      { texto: "M abre o memorial na página do trecho, grifado.", caminho: ["Achado", "Ver no memorial"], tecla: "M" },
      { texto: "Para passar um achado a alguém: Atribuir a…. Atribuir não manda e-mail.", caminho: ["Achado", "Atribuir a…"] },
    ],
    ir: "Abrir o último parecer",
    palavras: ["achado", "tratamento", "nivel"],
    sinonimos: ["corrigir achado", "falso positivo", "decisao tecnica", "fila"],
  },
  {
    id: "levar",
    nome: "Levar o parecer à prefeitura",
    precisa: "Um parecer aberto.",
    comeca: "Resultado",
    passos: [
      { texto: "Na coluna da direita do Resultado, em Levar adiante: Parecer em PDF. Ele abre numa aba nova.", caminho: ["Resultado", "Levar adiante", "Parecer em PDF"] },
      { texto: "Para controlar a correção numa planilha, um achado por linha: Matriz de achados.", caminho: ["Levar adiante", "Matriz de achados"] },
    ],
    ir: "Abrir o último parecer",
    palavras: ["parecer", "veredito"],
    sinonimos: ["exportar parecer", "pdf do parecer", "relatorio", "imprimir", "planilha"],
  },
  {
    id: "ld",
    nome: "Gerar LD, capa e separatrizes",
    precisa: "As pranchas em PDF.",
    comeca: "Início",
    passos: [
      { texto: "Solte as pranchas no Nexo. Ele lê o carimbo de cada folha e põe tudo no Mapa do volume.", caminho: ["Início", "Gerar LD e capa"] },
      { texto: "Confira o que ficou em Para conferir: folha sem número, revisão diferente, carimbo ilegível.", caminho: ["Mapa do volume", "Para conferir"] },
      { texto: "Peça na conversa: “pode gerar”. Capa, separatrizes e LD saem do que está nos carimbos." },
    ],
    ir: "Abrir o Início",
    palavras: ["ld", "capa", "separatriz", "carimbo"],
    sinonimos: ["lista de documentos", "gerar capa", "separadora", "indice"],
  },
  {
    id: "volume",
    nome: "Montar o volume",
    precisa: "As pranchas lidas no Mapa do volume.",
    comeca: "Nexo",
    passos: [
      { texto: "Com as folhas no mapa, diga o que quer na conversa: “divide em 2 tomos”, “tira a ARQ-12”, “monta os volumes”. O mapa muda a cada pedido.", caminho: ["Nexo", "Mapa do volume"] },
      { texto: "Para mudar a ordem, arraste a folha no mapa. Ctrl Z desfaz.", tecla: "Ctrl Z" },
      { texto: "Os PDFs gerados aparecem na coluna da conversa; Baixar editáveis traz tudo num ZIP.", caminho: ["Conversa", "Gerados", "Baixar editáveis"] },
    ],
    ir: "Abrir o Nexo",
    palavras: ["volume", "tomo", "grupo"],
    sinonimos: ["juntar pdf", "montar tomo", "dividir tomos", "encadernar"],
  },
  {
    id: "conferir",
    nome: "Conferir as folhas",
    precisa: "As pranchas em PDF.",
    comeca: "Início",
    passos: [
      { texto: "Solte as pranchas em Conferir as folhas. O Nexo confere código, disciplina, revisão e o nome da obra em cada carimbo.", caminho: ["Início", "Conferir as folhas"] },
      { texto: "O que divergiu fica marcado no mapa; corrija o carimbo de uma folha com E.", caminho: ["Mapa do volume", "folha", "Corrigir"], tecla: "E" },
    ],
    ir: "Abrir o Início",
    palavras: ["carimbo", "folha"],
    sinonimos: ["conferir carimbo", "revisao", "codigo da prancha"],
  },
];

export const LUGARES: Lugar[] = [
  { id: "pdf", nome: "Parecer em PDF", caminho: ["Resultado", "Levar adiante", "Parecer em PDF"], precisa: "Um parecer aberto.", nota: "Abre numa aba nova.", sinonimos: ["exportar parecer", "imprimir", "relatorio"] },
  { id: "matriz", nome: "Matriz de achados", caminho: ["Resultado", "Levar adiante", "Matriz de achados"], precisa: "Um parecer aberto.", nota: "Planilha, um achado por linha.", sinonimos: ["planilha", "excel"] },
  { id: "atribuir", nome: "Atribuir um achado", caminho: ["Resultado", "Achados", "Atribuir a…"], precisa: "Um parecer aberto.", nota: "Vários de uma vez: marque e use Atribuir a…. Atribuir não manda e-mail.", sinonimos: ["delegar", "responsavel", "passar achado"] },
  { id: "link", nome: "Copiar o link de um achado", caminho: ["Achado", "Mais ações", "Copiar link do achado"], precisa: "Um achado aberto na fila.", nota: "Quem abre o link cai no mesmo achado do mesmo parecer.", sinonimos: ["compartilhar", "link"] },
  { id: "memorial", nome: "Ver o trecho no memorial", caminho: ["Achado", "Ver no memorial"], precisa: "Um achado aberto.", tecla: "M", nota: "O memorial abre na página, com o trecho grifado na cor do nível.", sinonimos: ["pagina", "evidencia", "trecho"] },
  { id: "deixou", nome: "O Nexo deixou passar algo", caminho: ["Resultado", "Levar adiante", "O Nexo deixou passar algo?"], precisa: "Um parecer aberto.", nota: "Registra o erro que a auditoria não apontou.", sinonimos: ["erro ausente", "faltou achado"] },
  { id: "carimbo", nome: "Corrigir o carimbo de uma folha", caminho: ["Nexo", "Mapa do volume", "folha", "Corrigir"], precisa: "As pranchas lidas.", tecla: "E", sinonimos: ["corrigir numero", "titulo da prancha", "revisao errada"] },
  { id: "ordem", nome: "Mudar a ordem das folhas", caminho: ["Nexo", "Mapa do volume", "arrastar a folha"], precisa: "As pranchas lidas.", tecla: "Ctrl Z", nota: "Ctrl Z desfaz o último arrasto.", sinonimos: ["reordenar", "mover", "subir", "descer"] },
  { id: "tomos", nome: "Dividir em tomos", caminho: ["Nexo", "conversa", "“divide em 2 tomos”"], precisa: "As pranchas lidas.", sinonimos: ["tomo", "dividir volume"] },
  { id: "zip", nome: "Baixar os gerados (ZIP)", caminho: ["Conversa", "Gerados", "Baixar editáveis"], precisa: "LD, capa ou volume já gerados.", sinonimos: ["exportar volume", "baixar volume", "zip", "editaveis"] },
  { id: "anexos", nome: "Anexos de um volume", caminho: ["Montar volumes", "grupo", "Anexos"], precisa: "Um volume na montagem manual.", nota: "A montagem manual continua existindo para PDFs já prontos.", sinonimos: ["anexo", "apendice"] },
];

/** Projeto › Conversa e auditoria › Volume › Grupo › Documento e página. */
export const HIERARQUIA = ["Projeto", "Conversa e auditoria", "Volume", "Grupo", "Documento e página"];

export const PALAVRAS: Palavra[] = [
  { id: "projeto", termo: "Projeto", nivel: 0, texto: "A obra. Guarda conversas, auditorias, volumes e arquivos. Cria-se em Projetos, ou nasce do memorial que o Nexo lê." },
  { id: "conversa", termo: "Conversa", nivel: 1, texto: "Um trabalho no Nexo: você solta PDFs e pede o que precisa. Ela entra num projeto quando os documentos dizem qual é." },
  { id: "parecer", termo: "Auditoria e parecer", nivel: 1, texto: "A leitura do memorial contra a obra declarada. O parecer é o que sai dela: veredito, achados e o texto para a prefeitura.", ve: ["pdf", "matriz"], sinonimos: ["auditoria"] },
  { id: "veredito", termo: "Veredito", nivel: 1, texto: "O resumo do parecer em uma palavra: Liberado, Com ressalvas, Revisar ou Não emitir. Muda conforme os achados são tratados." },
  { id: "achado", termo: "Achado", nivel: 1, texto: "Um ponto do memorial que o Nexo apontou, com o trecho, a página e o que fazer. Na tela se lê ACH-014.", ve: ["memorial", "atribuir", "link"], sinonimos: ["ach", "problema"] },
  { id: "nivel", termo: "Nível do achado", nivel: 1, texto: "O peso de um achado: Impede (não dá para emitir), Decisão (alguém precisa decidir), Revisão (conferir) e Gramática (só texto)." },
  { id: "tratamento", termo: "Tratamento", nivel: 1, texto: "O que foi feito com o achado: pendente, com alguém, corrigido, decisão técnica com motivo, ou falso positivo.", ve: ["atribuir"] },
  { id: "volume", termo: "Volume", nivel: 2, texto: "Um PDF final do pacote. Tem grupos, e cada grupo tem separatriz, lista de documentos e pranchas.", ve: ["zip", "anexos"] },
  { id: "tomo", termo: "Tomo", nivel: 2, texto: "Uma parte física do volume, encadernada à parte. “Divide em 2 tomos” separa as disciplinas.", ve: ["tomos"] },
  { id: "grupo", termo: "Grupo", nivel: 3, texto: "Uma parte do volume, quase sempre uma disciplina, aberta por sua separatriz." },
  { id: "capa", termo: "Capa", nivel: 2, texto: "A primeira folha do volume, no modelo da prefeitura: obra, bairro, fase, volume e mês." },
  { id: "ld", termo: "Lista de documentos (LD)", nivel: 3, texto: "A relação das pranchas do volume, com código, título e revisão, saída dos carimbos.", sinonimos: ["ld", "indice"] },
  { id: "separatriz", termo: "Separatriz", nivel: 3, texto: "A folha que abre cada grupo, com a disciplina. Gerada no Nexo com as pranchas." },
  { id: "folha", termo: "Folha e prancha", nivel: 4, texto: "Folha é a unidade do volume; página é do PDF. Uma prancha pode ocupar mais de uma página." },
  { id: "carimbo", termo: "Carimbo", nivel: 4, texto: "O selo no canto da prancha: número, código, disciplina, título e revisão. É dele que o Nexo tira a LD.", ve: ["carimbo"], sinonimos: ["selo"] },
];

/** Sem acento e sem caixa: quem digita "separatriz" ou "SEPARATRIZ" acha igual. */
export const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const casa = (q: string, campos: (string | undefined)[]) => !q || campos.some((c) => c && semAcento(c).includes(q));

export const achaTarefa = (q: string, t: Tarefa) => casa(q, [t.nome, t.precisa, ...t.passos.map((p) => p.texto), ...(t.sinonimos ?? [])]);
export const achaLugar = (q: string, l: Lugar) => casa(q, [l.nome, l.precisa, l.nota, ...l.caminho, ...(l.sinonimos ?? [])]);
export const achaPalavra = (q: string, p: Palavra) => casa(q, [p.termo, p.texto, ...(p.sinonimos ?? [])]);
