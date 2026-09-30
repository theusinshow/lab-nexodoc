/**
 * INVENTÁRIO — fase 0 do redesenho. Toda tela do produto, em toda situação em
 * que ela pode estar, com os controles que existem HOJE.
 *
 * É a lista de conferência do projeto inteiro: nenhuma tela migra sem que cada
 * situação dela tenha sido desenhada e aprovada no /lab, e nenhum controle some
 * sem que isso tenha sido decidido. O `id` de tela e de situação é o mesmo que
 * o arquivo de aprovações usa (`design-lab/aprovacoes.json`), então a lista e o
 * registro das decisões não se desencontram.
 *
 * Levantado em 29/09/2026 a partir das rotas, dos componentes e de capturas do
 * app rodando. Quando uma tela ganhar ou perder uma situação no código, ela
 * entra ou sai daqui no mesmo commit.
 */

export interface Situacao {
  id: string;
  nome: string;
  /** O que dispara esta situação — para reproduzir no lab e no app. */
  quando: string;
}

export interface Tela {
  id: string;
  nome: string;
  rota: string;
  /** Onde o código mora hoje. */
  fontes: string[];
  /** Para quê a tela existe, numa frase. É contra isto que o desenho se mede. */
  trabalho: string;
  situacoes: Situacao[];
  /** Os controles de hoje. Nenhum sai sem decisão registrada. */
  controles: string[];
}

export interface Grupo {
  id: string;
  nome: string;
  telas: Tela[];
}

export const INVENTARIO: Grupo[] = [
  {
    id: "entrada",
    nome: "Entrada",
    telas: [
      {
        id: "login",
        nome: "Login",
        rota: "/login",
        fontes: ["app/login", "components/login"],
        trabalho: "Entrar com a conta do escritório, sem dúvida sobre o que acontece depois.",
        situacoes: [
          { id: "padrao", nome: "Padrão", quando: "Visitante sem sessão." },
          { id: "redirecionando", nome: "Indo para o Google", quando: "Clicou em Entrar com Google." },
          { id: "erro", nome: "Falha na autenticação", quando: "O Google recusou ou a sessão não nasceu." },
          { id: "dev", nome: "Com acesso de dev", quando: "NEXODOC_DEV_AUTH=true." },
        ],
        controles: ["Entrar com Google", "Entrar como outra pessoa (e-mail, dev)", "Entrar como dev", "Falar com o responsável"],
      },
      {
        id: "sem-acesso",
        nome: "Sem acesso",
        rota: "/sem-acesso",
        fontes: ["app/sem-acesso"],
        trabalho: "Dizer por que não entrou e quem pode liberar.",
        situacoes: [
          { id: "nao-liberada", nome: "Conta não liberada", quando: "Conta Google fora da lista do escritório." },
          { id: "convidado", nome: "Convite pendente", quando: "Membro INVITED que ainda não entrou." },
        ],
        controles: ["Pedir liberação ao responsável", "Trocar de conta"],
      },
    ],
  },
  {
    id: "casa",
    nome: "Casa",
    telas: [
      {
        id: "painel",
        nome: "Painel",
        rota: "/",
        fontes: ["app/page.tsx", "components/home"],
        trabalho: "Mostrar onde a pessoa parou e o que está esperando por ela.",
        situacoes: [
          { id: "primeiro-acesso", nome: "Primeiro acesso", quando: "Nenhum projeto, nenhuma conversa." },
          { id: "com-projetos", nome: "Com projetos", quando: "Uso normal." },
          { id: "linha-aberta", nome: "Projeto expandido", quando: "Clicou na seta de um projeto." },
          { id: "nexo-trabalhando", nome: "Nexo trabalhando", quando: "Há auditoria ou geração em curso." },
          { id: "nada-pendente", nome: "Nada pendente", quando: "Sem achados, sem projetos parados." },
          { id: "carregando", nome: "Carregando", quando: "Primeira pintura, lista vindo do servidor." },
          { id: "erro-lista", nome: "Lista não carregou", quando: "Falha de rede ou do servidor." },
          { id: "personalizando", nome: "Personalizando", quando: "Abriu Personalizar em Seu espaço." },
          { id: "foco-rodando", nome: "Foco rodando", quando: "Iniciou o cronômetro de foco." },
        ],
        controles: [
          "Esfera (falar com o Nexo)", "Continuar (retomar)", "Meus achados", "Projetos parados", "Da equipe",
          "Meus projetos / Todos", "Ordem (mais parados primeiro)", "Expandir projeto", "Nova auditoria (no projeto)",
          "Ver todos os projetos", "Personalizar", "Foco 25/45/60", "Iniciar / Zerar", "Rascunho", "Atividade do escritório",
          "Menu do usuário",
        ],
      },
    ],
  },
  {
    id: "nexo",
    nome: "Nexo",
    telas: [
      {
        id: "nexo-vazio",
        nome: "Conversa nova",
        rota: "/nexo",
        fontes: ["app/nexo", "modules/nexo/components/NexoWorkspace.tsx", "NexoSidebar.tsx", "PartidasDoNexo.tsx", "ZonaDeSolta.tsx"],
        trabalho: "Receber os PDFs e o pedido, sem cerimônia.",
        situacoes: [
          { id: "padrao", nome: "Conversa nova", quando: "Nova conversa ou primeira visita." },
          { id: "tour", nome: "Tour de 11 passos", quando: "Primeira visita (projeto de exemplo semeado)." },
          { id: "arrastando", nome: "Arquivo sobre a tela", quando: "Arrastando PDFs para dentro." },
          { id: "soltos", nome: "Arquivos soltos", quando: "Soltou; FichaDoDrop classifica cada um." },
          { id: "gravacao-local", nome: "Salvo só nesta máquina", quando: "Servidor não confirmou a gravação." },
          { id: "sem-espaco", nome: "Navegador sem espaço", quando: "IndexedDB recusou (cota)." },
          { id: "barra-recolhida", nome: "Barra recolhida", quando: "Ocultou projetos." },
          { id: "paleta", nome: "Buscar ações aberto", quando: "Ctrl K." },
        ],
        controles: [
          "Nova conversa", "Buscar ações (Ctrl K)", "Buscar obra ou código", "Árvore de projetos (expandir, conversas)",
          "Novo projeto", "Montar um volume", "Auditar um memorial", "Conferir as folhas", "Anexar arquivos", "Anexar PDFs",
          "Enviar (Enter)", "Painel / Projetos / Montar volumes / Achados / Ajuda / Administração", "Como funciona o Nexo", "Conta",
        ],
      },
      {
        id: "chat",
        nome: "Entrada no chat",
        rota: "/nexo",
        fontes: ["NexoChat.tsx", "NexoComposer.tsx", "ConfirmationCard.tsx", "QuickReplyChips.tsx", "PlanoDeGeracao.tsx"],
        trabalho: "Entender o pedido, mostrar o que entendeu e pedir só a confirmação necessária.",
        situacoes: [
          { id: "confirmar-auditoria", nome: "Confirmar auditoria", quando: "Memorial anexado." },
          { id: "escolher-projeto", nome: "Escolher o projeto", quando: "A obra lida não casou com um projeto." },
          { id: "plano-de-geracao", nome: "Plano de geração", quando: "Pranchas anexadas: LD, capa, separatriz, volume." },
          { id: "capa-sem-prefeitura", nome: "Capa sem prefeitura", quando: "A capa precisa da prefeitura e ela não veio." },
          { id: "alteracao-pendente", nome: "Alteração pendente", quando: "Pediu mudança num artefato já gerado." },
          { id: "respondendo", nome: "Nexo respondendo", quando: "Resposta chegando em fluxo." },
          { id: "erro-resposta", nome: "Resposta falhou", quando: "Erro do modelo ou de rede." },
          { id: "respostas-rapidas", nome: "Respostas rápidas", quando: "Sim, pode gerar / Agora não." },
        ],
        controles: ["Auditar", "Auditar de novo", "Confirmar e gerar", "Aplicar alteração", "Conferir o selo", "Baixar os editáveis (ZIP)", "Sim, pode gerar", "Agora não", "Parar", "Enviar"],
      },
      {
        id: "auditoria-rodando",
        nome: "Auditoria rodando",
        rota: "/nexo",
        fontes: ["AuditoriaEmCurso.tsx", "lib/audit-progress.ts", "etapas-da-auditoria.ts", "use-reconectar-auditoria.ts"],
        trabalho: "Mostrar que o trabalho anda, em que parte está, e que dá para sair.",
        situacoes: [
          { id: "enviando", nome: "Enviando", quando: "Antes do primeiro marco do motor." },
          { id: "em-curso", nome: "Etapa em curso", quando: "Marcos chegando." },
          { id: "passou-do-previsto", nome: "Passou do previsto", quando: "Etapa estourou o próprio orçamento." },
          { id: "retomada", nome: "Retomada", quando: "F5 ou troca de conversa: sem marcos, só espera." },
          { id: "cancelando", nome: "Cancelando", quando: "Clicou em Cancelar." },
          { id: "falhou", nome: "Falhou", quando: "Erro na auditoria do memorial." },
        ],
        controles: ["Cancelar", "Parar (no compositor)", "Tempo decorrido", "Mapa do volume / Auditoria", "Foco na revisão", "Ocultar projetos", "Ocultar chat"],
      },
      {
        id: "resultado-resumo",
        nome: "Resultado: resumo",
        rota: "/nexo",
        fontes: ["PalcoDoNexo.tsx", "components/audit-result.tsx", "aviso-de-auditoria-incompleta.tsx"],
        trabalho: "Dar o veredito de emissão em uma leitura.",
        situacoes: [
          { id: "nao-emitir", nome: "Não emitir", quando: "Há bloqueio." },
          { id: "emitir", nome: "Pode emitir", quando: "Sem bloqueio." },
          { id: "parcial", nome: "Análise parcial", quando: "Cobertura do motor incompleta." },
          { id: "legado", nome: "Auditado antes de guardar", quando: "Documento anterior ao armazenamento." },
          { id: "comparado", nome: "Comparado com a anterior", quando: "Segunda auditoria na conversa." },
          { id: "abrindo", nome: "Abrindo a auditoria", quando: "Buscando o parecer no servidor." },
          { id: "nao-abriu", nome: "Não deu para abrir", quando: "Parecer não encontrado." },
        ],
        controles: ["Resumo / Achados / Parecer / No documento", "Exportar (Parecer em PDF, Relatório, Matriz)", "Registrar erro ausente", "Voltar ao painel"],
      },
      {
        id: "resultado-achados",
        nome: "Resultado: fila de achados",
        rota: "/nexo",
        fontes: ["components/audit-result.tsx", "components/achado"],
        trabalho: "Tratar cada achado até a fila zerar.",
        situacoes: [
          { id: "lista", nome: "Fila", quando: "Aba Achados aberta." },
          { id: "detalhe", nome: "Achado aberto", quando: "Clicou num achado." },
          { id: "filtrado", nome: "Com filtros", quando: "Responsável, ordem, gravidade, disciplina, tipo." },
          { id: "vazio-filtro", nome: "Nada com esses filtros", quando: "Filtro sem resultado." },
          { id: "selecionando", nome: "Selecionando para atribuir", quando: "Marcou achados." },
          { id: "enviar-email", nome: "Enviar por e-mail", quando: "Enviar com recado." },
          { id: "decisao-tecnica", nome: "Decisão técnica", quando: "Registrar decisão com motivo." },
          { id: "encerrado", nome: "Encerrado", quando: "Corrigido, falso positivo ou decidido." },
          { id: "foco", nome: "Foco na revisão", quando: "Projetos e chat recolhidos." },
          { id: "link-invalido", nome: "Link de achado inválido", quando: "Abriu link que não casa." },
        ],
        controles: [
          "Buscar por texto, referência ou página", "Responsável", "Ordem", "Gravidade / disciplina / tipo", "Todos / Meus pendentes / Sem responsável / Pendentes / Encerrados",
          "Selecionar pendentes para atribuir", "Limpar seleção", "Voltar à lista", "Anterior (K) / Próximo (J)", "Evidência / Conversa / Histórico",
          "Abrir página", "Marcar corrigido", "Informar correção", "Registrar decisão técnica", "Falso positivo", "Gravidade errada", "Atribuir a…",
          "Enviar (e-mail com recado)", "Cancelar a notificação", "Copiar link do achado", "Cartão do achado (print)",
        ],
      },
      {
        id: "resultado-parecer",
        nome: "Resultado: parecer",
        rota: "/nexo",
        fontes: ["components/audit-result.tsx"],
        trabalho: "O documento que sai para o cliente.",
        situacoes: [
          { id: "pronto", nome: "Pronto", quando: "Aba Parecer." },
          { id: "gerando-pdf", nome: "Gerando PDF", quando: "Exportar parecer." },
          { id: "erro-pdf", nome: "PDF falhou", quando: "Não foi possível gerar o parecer em PDF." },
        ],
        controles: ["Parecer em PDF", "Relatório", "Matriz de achados"],
      },
      {
        id: "no-documento",
        nome: "No documento",
        rota: "/nexo",
        fontes: ["AuditCanvas.tsx", "MemorialPageNode.tsx", "FindingCardNode.tsx"],
        trabalho: "Ver onde cada achado mora no PDF.",
        situacoes: [
          { id: "paginas", nome: "Páginas com achados", quando: "Aba No documento." },
          { id: "paginas-mudas", nome: "Páginas não lidas", quando: "Páginas só com desenho." },
          { id: "pdf-remoto", nome: "PDF não está nesta máquina", quando: "Arquivo só no servidor." },
        ],
        controles: ["Zoom +/−", "Enquadrar", "Minimapa", "Ver parecer completo", "Transcrever e auditar", "Abrir achado", "Abrir página"],
      },
      {
        id: "visor-pdf",
        nome: "Visor de PDF",
        rota: "/nexo",
        fontes: ["components/audit-pdf-viewer-internal.tsx", "VisorDaFolha.tsx"],
        trabalho: "Mostrar o trecho grifado na página certa.",
        situacoes: [
          { id: "grifado", nome: "Trecho grifado", quando: "Abriu página de um achado." },
          { id: "carregando", nome: "Carregando página", quando: "PDF grande." },
          { id: "indisponivel", nome: "Arquivo indisponível", quando: "PDF não está nesta tela." },
        ],
        controles: ["Achado anterior / Próximo achado", "Página anterior / Próxima página", "Ir para a página", "Diminuir / Aumentar zoom", "Fechar visor de PDF"],
      },
      {
        id: "mapa-do-volume",
        nome: "Mapa do volume",
        rota: "/nexo",
        fontes: ["NexoCanvas.tsx", "FolhaNode.tsx", "EditorDoNo.tsx", "NavegacaoDoCanvas.tsx", "VolumesDesatualizados.tsx"],
        trabalho: "Conferir o que o Nexo leu de cada folha antes de gerar.",
        situacoes: [
          { id: "lendo-selos", nome: "Lendo os selos", quando: "x de y folhas analisadas." },
          { id: "lido", nome: "Folhas lidas", quando: "Leitura concluída." },
          { id: "folha-aberta", nome: "Folha selecionada", quando: "Clicou numa folha." },
          { id: "corrigindo", nome: "Corrigindo a folha", quando: "Editar aqui / Alterar no chat." },
          { id: "vou-gerar", nome: "Vou gerar", quando: "Plano pronto para confirmar." },
          { id: "desatualizado", nome: "Desatualizado", quando: "Folha mudou depois de gerar." },
          { id: "fora-da-divisao", nome: "Fora da divisão", quando: "Folha sem tomo." },
        ],
        controles: ["Nº de tomos", "Corrigir a folha", "Abrir (página original)", "Editar aqui", "Alterar no chat", "Aplicar", "Excluir", "Confirmar e gerar", "Folha anterior / Próxima folha", "Zoom"],
      },
    ],
  },
  {
    id: "trabalho",
    nome: "Trabalho",
    telas: [
      {
        id: "projetos",
        nome: "Projetos",
        rota: "/projetos",
        fontes: ["app/projetos/page.tsx", "CartaoDeProjeto.tsx", "ListaDeProjetos.tsx"],
        trabalho: "Achar a obra e ver o que está esperando nela.",
        situacoes: [
          { id: "lista", nome: "Lista", quando: "Uso normal." },
          { id: "vazia", nome: "Nenhum projeto", quando: "Escritório novo." },
          { id: "busca-vazia", nome: "Busca sem resultado", quando: "Termo não casa." },
          { id: "arquivados", nome: "Arquivados", quando: "Filtro Arquivados." },
          { id: "novo", nome: "Novo projeto", quando: "Clicou em Novo projeto." },
        ],
        controles: ["Buscar por código, nome, cliente ou observação", "Ativos / Arquivados / Todos", "Ordem", "Novo projeto", "Retomar", "Arquivar"],
      },
      {
        id: "projeto",
        nome: "Projeto",
        rota: "/projetos/[id]",
        fontes: ["app/projetos/[id]/page.tsx", "components/projects"],
        trabalho: "Tudo de uma obra: arquivos, artefatos, eventos e o que fazer a seguir.",
        situacoes: [
          { id: "com-registros", nome: "Com registros", quando: "Obra em andamento." },
          { id: "vazio", nome: "Recém-criado", quando: "Nenhum arquivo, artefato ou evento." },
        ],
        controles: ["Auditar documentos", "Montar LD", "Gerar capas", "Montar volume", "Documentos", "Arquivos enviados", "Artefatos", "Eventos"],
      },
      {
        id: "achados",
        nome: "Achados",
        rota: "/achados",
        fontes: ["app/achados/page.tsx"],
        trabalho: "O que está comigo e o que eu mandei para alguém.",
        situacoes: [
          { id: "com-itens", nome: "Com itens", quando: "Há achados atribuídos." },
          { id: "vazio", nome: "Nada pendente", quando: "Fila zerada." },
        ],
        controles: ["Nova auditoria", "Abrir (leva ao parecer)"],
      },
      {
        id: "volumes",
        nome: "Montar volumes",
        rota: "/volumes",
        fontes: ["app/volumes/page.tsx", "modules/volume-builder"],
        trabalho: "Montar o volume com PDFs prontos, conferir e exportar.",
        situacoes: [
          { id: "vazio", nome: "Nada importado", quando: "Primeira vez." },
          { id: "montando", nome: "Montando", quando: "Arquivos importados, volumes criados." },
          { id: "selecao", nome: "Páginas selecionadas", quando: "Selecionou na biblioteca." },
          { id: "conferencia", nome: "Conferência", quando: "Aba Conferência." },
          { id: "previa", nome: "Prévia aberta", quando: "Abrir prévia." },
          { id: "exportando", nome: "Exportando", quando: "Gerar PDF / ZIP." },
          { id: "falha-gravacao", nome: "Falha de gravação", quando: "Rascunho não salvou." },
          { id: "recuperado", nome: "Recuperado após F5", quando: "Rascunho restaurado." },
        ],
        controles: [
          "Gerar a partir das pranchas", "Projeto", "Desfazer / Refazer", "Editar dados do volume", "Montagem / Conferência",
          "Tipo do arquivo (Capas, LDs, Separatrizes, Pranchas, Anexos)", "Importar PDFs", "Buscar na biblioteca", "Filtros da biblioteca",
          "Limpar seleção", "Destino (volume, grupo, posição)", "Adicionar como…", "Adicionar volume", "Sugerir montagem", "Mover",
          "Conferir esta versão", "Prévia de…", "Abrir prévia", "Gerar PDF", "Baixar relatório (.md)", "Ir para (pendência)",
        ],
      },
      {
        id: "ajuda",
        nome: "Ajuda",
        rota: "/ajuda",
        fontes: ["app/ajuda"],
        trabalho: "Onde fica cada função e o que cada palavra quer dizer.",
        situacoes: [{ id: "padrao", nome: "Padrão", quando: "Sempre." }],
        controles: ["Para onde ir (6 destinos)", "Onde fica (10 funções)", "Glossário"],
      },
    ],
  },
  {
    id: "admin",
    nome: "Administração",
    telas: [
      {
        id: "admin",
        nome: "Centro de controle",
        rota: "/admin",
        fontes: ["app/admin", "components/admin"],
        trabalho: "Está tudo de pé, quanto custou, o motor melhora, quem entra, o que o banco guarda.",
        situacoes: [
          { id: "sem-token", nome: "Aguardando token", quando: "Token de admin não informado." },
          { id: "cockpit", nome: "Cockpit", quando: "Token aceito." },
          { id: "dinheiro", nome: "Dinheiro", quando: "Custos, teto, cotação." },
          { id: "motor", nome: "Motor", quando: "Qualidade das auditorias." },
          { id: "pessoas", nome: "Pessoas", quando: "Membros e convites." },
          { id: "dados", nome: "Dados", quando: "O que o banco guarda." },
          { id: "erro", nome: "Servidor não respondeu", quando: "Falha ao carregar." },
        ],
        controles: ["Voltar", "Cockpit / Dinheiro / Motor / Pessoas / Dados", "Token de admin", "Entrar", "Período", "Declarar cotação", "Teto de gasto", "Convidar"],
      },
    ],
  },
  {
    id: "transversal",
    nome: "Peças de toda tela",
    telas: [
      {
        id: "transversal",
        nome: "Transversais",
        rota: "—",
        fontes: ["PaletaDeComandos.tsx", "TourDoNexo.tsx", "components/keyboard-shortcuts-help.tsx", "components/ui"],
        trabalho: "O que aparece por cima de qualquer tela.",
        situacoes: [
          { id: "paleta", nome: "Buscar ações", quando: "Ctrl K." },
          { id: "atalhos", nome: "Ajuda de atalhos", quando: "Tecla ?." },
          { id: "toast", nome: "Aviso passageiro", quando: "Ação concluída ou falhou." },
          { id: "confirmacao", nome: "Confirmação destrutiva", quando: "Excluir, arquivar." },
          { id: "menu-usuario", nome: "Menu do usuário", quando: "Clicou no avatar." },
          { id: "404", nome: "Página não encontrada", quando: "Rota ou recurso inexistente." },
          { id: "tela-estreita", nome: "Tela estreita", quando: "Portão de tela larga." },
        ],
        controles: ["Ctrl G / Ctrl A / Ctrl L / Ctrl Shift A / ?", "Pular para o conteúdo", "Sair"],
      },
    ],
  },
];

export function contarInventario() {
  const telas = INVENTARIO.flatMap((g) => g.telas);
  return {
    telas: telas.length,
    situacoes: telas.reduce((n, t) => n + t.situacoes.length, 0),
    controles: telas.reduce((n, t) => n + t.controles.length, 0),
  };
}
