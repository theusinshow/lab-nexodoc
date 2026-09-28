# Inventário funcional e descoberta — NexoDoc

**Inspecionado em 27/09/2026; consolidado em 28/09/2026.** Complementa a [auditoria de UX/UI](auditoria-ux-ui-2026-09-27.md).

Este inventário cobre superfícies e capacidades de uso identificadas nas rotas/componentes, não todos os endpoints internos. Uma linha marcada “existente” significa que há implementação/caminho no código; não significa que sua operação real foi executada. Não foram enviadas mensagens, gerados documentos por IA ou alterados dados administrativos para montar este inventário.

## Legenda

- **Direta:** entrada nomeada na tela pertinente.
- **Contextual:** aparece após selecionar/abrir algo; aceitável se o caminho for claro.
- **Baixa:** depende de ícone, atalho, profundidade, hover ou localização inesperada.
- **Quebrada:** acesso ou integração tem falha identificada.
- **Não exposta:** suporte no código/modelo sem percurso completo na interface; não contar como função entregue.
- **Restrita:** ferramenta administrativa/interna, cuja visibilidade deve respeitar permissão e ambiente.

“Destino recomendado” é proposta, não descrição da interface atual. Os IDs remetem ao relatório principal. Funções agrupadas em uma linha compartilham o mesmo percurso e precisam ser preservadas em conjunto.

## 1. Cobertura das 25 rotas

| Rota | Inspeção | Observação |
|---|---|---|
| `/` | Código + navegador | Painel, projetos recentes, achados e menu da conta |
| `/nexo` | Código + navegador | Entrada, tutorial, conversa, parecer, canvas/visor e links; fixtures para estados ricos |
| `/volumes` | Código + navegador | Vazio, volume vazio, arquivo local, dois volumes, teclado, F5, quatro larguras |
| `/projetos` | Código + navegador | Lista, busca e formulário; sem criar projeto |
| `/projetos/[id]` | Código + navegador | Detalhe e links de ferramentas; sem arquivar/excluir |
| `/ferramentas` | Código + navegador | Entrada da montagem manual |
| `/login` | Código + navegador | Erro de autenticação; sem fluxo OAuth completo |
| `/sem-acesso` | Código | Não foi alterada a permissão da conta para provocar esse estado |
| `/audit` | Código | Redireciona ao Nexo e preserva `project`; consumo do contexto precisa de correção |
| `/admin` | Código + navegador | Estado antes do token adicional |
| `/admin/dinheiro` | Código + navegador | Estado antes do token; dados carregados só pelo código |
| `/admin/motor` | Código + navegador | Estado antes do token; configuração/qualidade só pelo código |
| `/admin/pessoas` | Código + navegador | Estado antes do token; nenhuma alteração de usuário |
| `/admin/dados` | Código + navegador | Estado antes do token; nenhuma exclusão/expurgo |
| `/admin/audits` | Código | Compatibilidade → Dados; preserva query |
| `/admin/lds` | Código | Compatibilidade → Dados |
| `/admin/users` | Código | Compatibilidade → Pessoas |
| `/admin/usage` | Código | Compatibilidade → Dinheiro |
| `/admin/quality` | Código | Compatibilidade → Motor |
| `/admin/config` | Código | Compatibilidade → Motor |
| `/apresentacao` | Código | Material de apresentação; não é tarefa cotidiana do engenheiro |
| `/apresentacao/valores` | Código | Material complementar de apresentação |
| `/bancada-do-orbe` | Código | Bancada visual interna |
| `/bancada-do-chanfro` | Código | Bancada visual interna |
| `/bancada-do-ambiente` | Código | Bancada visual interna |

`/ld` e `/capas` **não** fazem parte dessas 25 rotas: os links no projeto apontam para elas e retornaram 404. Bancadas e apresentação não precisam virar itens da navegação principal para cumprir “nenhuma função escondida”; precisam de catálogo interno quando autorizado.

## 2. Navegação, entrada e continuidade

| Capacidade | Caminho atual/condição | Descoberta | Destino recomendado / cuidado |
|---|---|---|---|
| Entrar e retomar destino após login | `/login`, callback | Direta | Preservar query completa e contexto G03/A01 |
| Entender erro de login | Mensagem na tela de login | Direta | Manter tentativa e destino de retorno |
| Entender ausência de acesso | `/sem-acesso` | Contextual | Explicar próximo passo sem revelar conteúdo restrito |
| Ver painel e atividade | `/` | Direta | “Painel” persistente |
| Retomar projeto/conversa | Cartões da home; histórico do Nexo | Direta | Exibir contexto e última atividade |
| Abrir achado recebido | Home → auditoria | Quebrada parcialmente | Destino específico do achado G04 |
| Acessar montagem manual | Menu da conta ou Ferramentas antigas | Baixa | “Montar volumes” G01 |
| Acessar projetos | Menu da conta; ícone no Nexo | Baixa | “Projetos” com rótulo G01 |
| Ver identidade e sair | Conta / sidebar | Contextual | Manter em Conta |
| Buscar ações | Ctrl+K no Nexo | Baixa | Campo/botão “Buscar ações” G02 |
| Começar montagem assistida | Partida “Montar um volume” | Direta | Explicar insumo e diferenciar montagem com PDFs prontos |
| Começar auditoria | Partida “Auditar um memorial” | Direta | Preservar contexto do projeto |
| Conferir folhas | Partida “Conferir as folhas” | Direta | Manter caminho por tarefa |
| Nova conversa | “Novo projeto” no Nexo | Direta, nome ambíguo | “Nova conversa” G07 |
| Buscar conversas | Busca da sidebar | Direta | Não confundir com busca global de ações |
| Organizar/retomar conversas por projeto | Lista/histórico do Nexo | Contextual | Contexto e agrupamento sempre legíveis |
| Rever orientação inicial | “Como funciona” no rodapé; tutorial | Baixa | Ajuda nomeada + guias por tarefa |
| Redimensionar painéis | Divisórias; suporte por teclado | Baixa | Preservar splitter + recolher/expandir nomeados G05 |
| Recuperar estado do Nexo | Reabertura local/servidor | Contextual | Preservar indicadores e limites de armazenamento |
| Resolver sessão expirada/aba travada | Faixas de estado | Contextual | Preservar recuperação e motivo da trava |
| Operar em celular | Portão de tela larga | Quebrada para leitura | Subconjunto de revisão responsivo G06 |

## 3. Nexo: documentos, conferência e geração assistida

Fontes principais: `modules/nexo/components/NexoWorkspace.tsx`, `NexoCanvas.tsx`, `EditorDoNo.tsx`, `PlanoDeGeracao.tsx`, `FrameDoDocumento.tsx`, `ResultLinks.tsx`, `VolumesDesatualizados.tsx` e `NexoSidebar.tsx`.

| Capacidade | Caminho atual/condição | Descoberta | Destino recomendado / cuidado |
|---|---|---|---|
| Anexar arquivos PDF | Entrada, composer e drop | Direta | Manter botão além do drop |
| Anexar/conferir pasta | Fluxo de entrada de pasta | Contextual | “Importar pasta”, com lista do que será considerado |
| Revisar limpeza/seleção da pasta | Cartão contextual | Contextual | Explicar exclusões e permitir voltar |
| Enviar pedido ao Nexo | Composer | Direta | Preservar rascunho e contexto |
| Acompanhar leitura/geração | Chat, faixas e indicadores | Direta | Separar etapa, progresso real e espera |
| Parar processamento | Controle de parada | Contextual | Deixar claro o que foi preservado |
| Usar respostas/sugestões rápidas | Chips de resposta | Contextual | Atalho adicional, não único acesso à operação |
| Inspecionar mapa de folhas | Canvas | Direta após leitura | Alternativa em lista com mesma seleção |
| Navegar folhas por teclado | Setas, Enter, E no canvas | Contextual | Ajuda de teclado visível; preservar implementação existente |
| Abrir folha | Nó → Abrir / Enter | Contextual | Manter operação nomeada |
| Corrigir carimbo/dados extraídos | Nó → Corrigir / E | Contextual | Não depender só de chat ou atalho |
| Corrigir código, título, disciplina, número/total | Editor da folha | Contextual | Campos associados e estado salvo/pendente |
| Adicionar/remover/restaurar folhas na revisão | Controles contextuais da conferência | Contextual | Operações nomeadas; preservar recuperação |
| Organizar blocos/tomos | Conferência e plano | Contextual | Exibir hierarquia e efeito no resultado |
| Escolher prefeitura/modelo | Plano de geração | Direta no contexto | Preservar trava e alerta de divergência |
| Editar título/campos do documento | Frame/modelo e fallback do plano | Contextual | Preservar edição direta já existente |
| Conferir aparência do documento | Frame e modo de conferência | Contextual | Distinguir modelo editável e PDF final |
| Escolher/gerar capa, LD e separatriz | Plano de geração | Contextual | Inventário/ações “Gerar…” também encontráveis pela busca |
| Gerar volume a partir das pranchas | Fluxo assistido + plano/resultados | Contextual | Entrada comum “Montar volumes”, sem apagar caminho manual |
| Entender campos faltantes | Bloqueios no plano | Contextual | Manter motivo perto do campo e da ação |
| Baixar artefatos PDF/ODT disponíveis | Links de resultado | Contextual | Nome, formato, revisão e estado de atualização |
| Regenerar após editar | Aviso de documento desatualizado | Contextual | Preservar selo de desatualizado e vínculo com versão |
| Recuperar geração parcial | Falhas por documento no plano | Contextual | Não apresentar sucesso parcial como falha total |
| Ver uso/estado do agente | Indicadores contextuais | Contextual | Dados auxiliares, sem disputar espaço com evidência |
| Diagnóstico técnico/debug | Drawer interno | Restrita | Catálogo interno; não é ação primária de engenharia |

## 4. Mesa de montagem manual

Fontes principais: `modules/volume-builder/components/*`, `modules/volume-builder/lib/volume/*` e `components/projects/project-context-strip.tsx`.

| Capacidade | Caminho atual/condição | Descoberta | Destino recomendado / cuidado |
|---|---|---|---|
| Montar independentemente de projeto | `/volumes` sem projeto | Direta após encontrar módulo | Manter como opção explícita V10 |
| Vincular projeto durante montagem | Não há seletor local | Não exposta | Seletor que preserve trabalho V10 |
| Editar metadados da montagem | Formulário superior | Direta | Resumo compacto + “Dados do volume” V04 |
| Importar PDFs | Upload classificado | Direta | Fila de processamento/rejeição V09 |
| Escolher tipo antes de importar | Capa, LD, documentos, separatriz, anexos | Direta | Também permitir corrigir depois |
| Ver lista de arquivos importados | Botão Lista | Contextual | Informar quantidade e problemas sem exigir expandir |
| Ocultar/reabrir painel de arquivos | Controle do painel | Contextual | Preservar acionador de reabertura claro |
| Remover arquivo importado | Card do arquivo | Contextual | Impacto em volumes + desfazer V05 |
| Buscar/filtrar páginas | Bandeja | Direta | Labels e contexto por arquivo |
| Visualizar miniaturas e página | Bandeja/visor | Contextual | Estados de carregamento e falha por arquivo |
| Selecionar páginas individualmente/em conjunto | Miniaturas e controles da bandeja | Contextual | Equivalente por teclado V03 |
| Usar seleção/intervalo de páginas | Controles da bandeja/seleção | Contextual | Mostrar total e páginas exatas antes de aplicar |
| Enviar seleção para capa | Capa na bandeja → primeiro volume | Quebrada para destino livre | Seletor de destino V03 |
| Enviar seleção para LD | LD na bandeja → primeiro grupo | Quebrada para destino livre | Seletor de destino V03 |
| Enviar seleção para documentos | Docs na bandeja → primeiro grupo | Quebrada para destino livre | Seletor de destino V03 |
| Arrastar páginas a um slot | Bandeja → alvo de drop | Direta visualmente | Preservar como atalho; oferecer “Escolher páginas” |
| Criar volume | Adicionar volume | Direta | Nascer como rascunho V01 |
| Editar nome/arquivo do volume | Linha de montagem | Direta | Unificar termo volume G07 |
| Excluir volume | Ícone de exclusão | Baixa | Nome acessível + desfazer V05/G09 |
| Criar/editar grupo | Controles do volume/grupo | Contextual | Destino ativo e ordem explícitos |
| Excluir grupo | Ícone no grupo | Baixa | Nome acessível + desfazer |
| Configurar separatriz automática | Campos do grupo | Direta | Explicar origem e prévia |
| Usar separatriz própria/restaurar automática | Troca no card da separatriz | Contextual | “Usar PDF próprio” / “Restaurar automática” |
| Trocar/remover capa, LD ou documento | Slot preenchido | Contextual | Distinguir substituir/adicionar; desfazer |
| Reordenar documentos | Setas dos documentos | Baixa | Botões nomeados e posição antes/depois |
| Mover grupos/volumes livremente | Sem percurso explícito completo observado | Não exposta | Controles de sequência, além de arraste |
| Inserir anexo em seção própria | Modelo suporta; UI não oferece seção | Não exposta | Completar destino “Anexos” V08 |
| Duplicar volume/grupo | Helpers sem botão | Não exposta | Validar operação e então expor V08 |
| Pedir sugestão de montagem | Painel de sugestão | Contextual | Manter revisão do resultado e destino de aplicação |
| Conferir montagem por IA | Painel de validação | Direta no contexto | Vincular resultado à versão V06 |
| Ver árvore/estrutura | Prévia estrutural | Direta no contexto | Não confundir com PDF renderizado |
| Abrir prévia do PDF | Painel de exportação | Contextual; limitada | Prévia por volume em pacotes V07 |
| Exportar PDF único | Exportação com um volume | Contextual | Prontidão determinística V01 |
| Exportar pacote ZIP | Exportação com vários volumes | Contextual | Seleção e resumo dos volumes incluídos |
| Baixar relatório da montagem | Painel de exportação | Contextual | Formato e conteúdo explícitos |
| Salvar/retomar montagem manual | Estado apenas em memória | Não exposta | Autosave/recuperação V02 |
| Desfazer/refazer | Ausente no fluxo manual | Não exposta | Histórico de operações V05 |

## 5. Auditorias e achados

Fontes principais: `components/audit-result.tsx`, `components/achado/*`, `modules/nexo/components/PalcoDoNexo.tsx`, `AuditCanvas.tsx` e `use-abrir-auditoria-por-link.ts`.

| Capacidade | Caminho atual/condição | Descoberta | Destino recomendado / cuidado |
|---|---|---|---|
| Abrir auditoria salva por link | `?auditoria=` | Quebrada no erro inicial | Estado independente do palco A01 |
| Abrir achado específico por link | `?auditoria=&achado=` | Contextual | Todos os emissores de links devem usar o mesmo contrato |
| Ver resumo/veredito e contagens | Parecer | Direta | Preservar relação com escopo auditado |
| Ver arquivos analisados/comparações/conclusão | Visões do relatório | Contextual | Visões nomeadas e encontráveis |
| Alternar lista e mapa No documento | Barra de vistas | Direta | Mesma fonte PDF em ambas A02 |
| Comparar com auditoria anterior | Resumo contextual de diferença | Contextual | Exibir qual versão é comparada |
| Filtrar impacto | Barra de filtros | Direta | Expor estado selecionado |
| Filtrar disciplina | Barra de filtros | Direta | Preservar filtro ao abrir detalhe |
| Filtrar tipo de erro | Barra de filtros | Direta | Vocabulário consistente |
| Buscar referência/texto/documento/página | Sem busca equivalente na lista | Não exposta | Busca de achados A04 |
| Filtrar tratamento/responsável | Sem conjunto equivalente na lista | Não exposta | “Meus pendentes”, “Sem responsável”, “Todos” A04 |
| Escolher ordenação da fila | Ordem definida no código | Não exposta | Ordenação nomeada A04 |
| Selecionar achado para ação coletiva | Seleção e botão Enviar | Contextual, ambígua | “Selecionar para atribuir” A06 |
| Selecionar todos do filtro | Controle na lista | Direta | Mostrar alcance da seleção |
| Atribuir a uma pessoa | Barra de seleção | Contextual | Quantidade, destinatário e resultado A06 |
| Desfazer/limpar seleção | Barra de lote | Contextual | Preservar como ação distinta da atribuição |
| Notificar por e-mail | Avisos/pendentes de aviso | Contextual | Diferenciar atribuição de notificação; não enviar automaticamente por mudança visual |
| Marcar correção/reverter tratamento | Ação no card conforme estado | Direta | Distinguir tratamento de validade A05 |
| Registrar decisão técnica | Ação no card | Direta | Manter justificativa e autor |
| Confirmar achado / falso positivo / gravidade errada | Controles de feedback | Baixa pela distância | Eixo “Validade” A05 |
| Ler evidência/conflito/ação recomendada | Corpo do card | Baixa em cards longos | Detalhe priorizando evidência A07 |
| Abrir página no PDF | Ação da evidência | Contextual | Fonte/revisão correta A03 |
| Navegar páginas, zoom e posição | Visor PDF | Direta no visor | Preservar labels existentes |
| Navegar marcações no documento | Mapa/visor | Contextual | Não perder seleção e filtro |
| Anterior/próximo achado da fila | Não há controle dedicado no visor | Não exposta | Sequência de revisão A10 |
| Abrir referência do motor novo | Card recebe resolvedor opcional ausente | Quebrada na integração | Resolvedor por documento/revisão A03 |
| Ler/publicar comentários | Conversa do achado | Direta no card, ocupa muito espaço | Aba “Conversa (n)” + rascunho preservado A07/A08 |
| Adicionar/remover envolvidos | Controles da conversa | Contextual | Erro/sucesso explícitos A08 |
| Exportar cartão textual do achado | Menu → Print do achado | Contextual, nome impreciso | “Exportar cartão (SVG)” A09 |
| Copiar conteúdos/referências disponíveis | Ações do card/relatório | Contextual | Feedback de cópia e “Mais ações” nomeado |
| Copiar link específico | Helper existe; ação direta não observada | Não exposta como ação direta | Completar percurso de compartilhamento G04 |
| Ver sugestões | Seção recolhível com contagem | Contextual | Manter separada do veredito, com contador evidente |
| Ver pendências do motor | Seção própria e indicadores | Contextual | Acesso claro sem confundir com achados confirmados |

## 6. Projetos, administração e áreas internas

| Capacidade | Caminho atual/condição | Descoberta | Destino recomendado / cuidado |
|---|---|---|---|
| Criar projeto | Formulário em `/projetos` | Direta | Ação “Novo projeto”, diferente de conversa |
| Buscar/abrir projeto | Lista | Direta | Filtros situação/atividade P01 |
| Editar dados do projeto | Detalhe/controle | Direta | “Configurações do projeto” |
| Arquivar/reativar/excluir projeto | Controle do projeto | Direta | Manter proteções e confirmação onde irreversível |
| Abrir auditorias/artefatos do projeto | Detalhe | Contextual | Priorizar pendências e retomada |
| Iniciar auditoria a partir do projeto | `/audit?project=` | Quebrada no contexto | Corrigir contrato G03 |
| Iniciar LD/capas do projeto | `/ld`, `/capas` | Quebrada | Redirecionar com intenção/contexto G03 |
| Abrir volumes do projeto | `/volumes?project=` | Contextual | Preservar vínculo visível |
| Abrir centro administrativo | Conta/sidebar, papel admin | Restrita | Navegação nomeada por permissão |
| Informar token administrativo | Controle compartilhado admin | Restrita | Estado anterior à carga inequívoco P02 |
| Ver saúde, auditorias/LDs recentes e ações administrativas | `/admin` | Restrita | Indicar período e atualização |
| Ver custos e consumo por período/modelo/obra/tarefa | `/admin/dinheiro` | Restrita | Não mostrar zero antes de carregar |
| Configurar cotação | Dinheiro | Restrita/contextual | Efeito e vigência claros |
| Ver qualidade/feedback do motor | `/admin/motor` | Restrita | Separar dado indisponível de resultado vazio |
| Configurar modelos/regras de processamento | Motor | Restrita/contextual | Explicar efeito operacional e salvar com feedback |
| Ajustar vazão/limites | Motor → controles | Restrita/contextual | Rótulo, valor atual e impacto |
| Listar/criar/filtrar usuários | `/admin/pessoas` | Restrita | Labels e estados corretos G09/P02 |
| Alterar papel/ativação e operações em lote | Pessoas | Restrita/contextual | Preservar confirmações e resultado por item |
| Controlar entrada/cadastro | Pessoas → controles | Restrita/contextual | Não misturar ao funcionamento do motor |
| Consultar/filtrar auditorias e LDs | `/admin/dados` | Restrita | Estado vazio apenas após resposta válida |
| Excluir registros/expurgar por contexto | Dados | Restrita/contextual | Impacto explícito; não foi executado nesta auditoria |
| Usar favoritos administrativos antigos | Rotas de compatibilidade | Contextual | Preservar filtros e intenção |
| Consultar apresentação/valores | Rotas de apresentação | Restrita pelo contexto do produto | Catálogo interno, fora da navegação operacional |
| Testar orbe/chanfro/ambiente | Bancadas | Restrita/interna | Não expor como função do engenheiro |

## 7. Contrato de descoberta para a implementação

Cada capacidade acima deve ganhar um registro com:

```text
id estável · rótulo · sinônimos · área · permissão
contexto necessário · rota/ação · motivo de indisponibilidade
entrada visível · atalho opcional · risco/necessidade de confirmação
estado de execução · sucesso · erro · recuperação
```

Não é necessário construir de imediato um framework genérico. Um registro simples e testes dos percursos mais importantes já evitam que navegação, ajuda e paleta contem histórias diferentes.

Critérios de conclusão do redesenho:

- Toda linha autorizada está acessível por caminho nomeado; recursos condicionais explicam por que não estão disponíveis.
- Nenhuma função frequente depende exclusivamente de hover, arraste, atalho ou frase exata no chat.
- Nenhuma rota apresentada como ação normal retorna 404.
- Entradas que pareciam duplicadas foram diferenciadas por finalidade, especialmente montagem assistida e montagem manual.
- Funções retiradas ou ainda não concluídas são explicitamente registradas; helpers internos não viram promessas de produto.
- A implementação é revisada contra este inventário para evitar regressão de capacidade durante a simplificação visual.
