# Execução integral de UX/UI — instruções para Claude Code

**Preparado em 28/09/2026. Estado: plano de implementação; nenhuma correção é considerada entregue por este documento.**

Este documento orienta a implementação da auditoria de UX/UI do NexoDoc. O usuário quer melhorar o software inteiro, com prioridade para montagem de volumes e páginas de achados, preservando capacidades e tornando cada função encontrável.

**A missão é implementar, integrar e verificar todos os 31 itens.** Não encerrar na leitura, em outro relatório, em um protótipo, na primeira etapa ou somente nos P1. Executar em incrementos verificáveis, continuando entre as etapas sem pedir aprovação rotineira.

## 1. Pacote e fontes de verdade

| Documento | Finalidade |
|---|---|
| [PROMPT.md](PROMPT.md) | Instrução pronta para colar no Claude Code |
| [PROGRESSO.md](PROGRESSO.md) | Estado dos 31 itens, evidências e ponto exato de retomada |
| [Auditoria UX/UI](../auditoria-ux-ui-2026-09-27.md) | Diagnóstico, prioridades, fontes e critérios originais |
| [Inventário funcional](../inventario-funcional-ux-ui-2026-09-27.md) | Capacidades que precisam continuar encontráveis e operacionais |
| [Evidências](../evidencias-ux-ui-2026-09-27.md) | Capturas anteriores, limites e roteiros de reprodução |
| [DESIGN.md](../../../DESIGN.md) | Identidade visual atual; combinar com o CSS real |
| [package.json](../../../package.json) | Comandos e dependências existentes |
| [Instruções locais](../../../.codex/instructions.md) | Regras do projeto, preservação do chat e changelog |

Leia este documento, a auditoria e o inventário antes de decidir a estrutura. Depois, consulte código e evidências por etapa. As linhas citadas na auditoria são pontos de partida, não números imutáveis. Confirme o estado atual antes de alterar: o checkout pode ter evoluído.

### Separação em relação ao trabalho anterior

- Este pacote é **UX/UI**, em `execucao-ux-ui-claude-code/`.
- `docs/auditoria/execucao-claude-code/` é outro pacote, sobre o motor. Não substitua seu progresso nem execute suas etapas como parte desta missão. Não herde a limitação de execução por sessão daquele plano.
- IDs como `A01` são locais à auditoria UX/UI. Não os confunda com IDs iguais nos relatórios do motor. Use prefixo `UX-` em commits/relatórios quando houver ambiguidade.
- Preserve melhorias integradas no motor. Não refazer prompts, investigação, regras de veredito, cache ou cobrança para resolver um problema de apresentação.
- Correções de integração necessárias à UX estão no escopo: rotas, contexto, fontes PDF, persistência da montagem, estados de API e ligação de controles. Uma prop sem chamador não é uma função entregue.
- `docs/09-design-system.md` é explicitamente histórico: a referência visual é `DESIGN.md` e o sistema atual. Trechos antigos de MVP, como ausência de login/banco, não descrevem o produto atual e não justificam remover capacidades.
- Siga instruções atuais do usuário e arquivos de instrução aplicáveis. Este pacote não depende de instalar skills, plugins ou outro framework.

## 2. Resultado esperado

Ao final, o engenheiro deve conseguir:

1. Encontrar Projetos, Montar volumes, Achados e Ajuda por nomes visíveis.
2. Distinguir montagem assistida a partir das pranchas de montagem manual com PDFs existentes.
3. Montar vários volumes e grupos, escolher onde cada página entra, reordenar, desfazer e recuperar o trabalho após F5.
4. Saber se a montagem está incompleta, conferida ou alterada após a conferência.
5. Ver a prévia de cada volume antes do download, inclusive quando a saída final é ZIP.
6. Abrir um achado pelo link, encontrar a evidência no arquivo/revisão/página corretos e revisar a fila sem perder contexto.
7. Diferenciar confirmação do achado, atribuição, correção informada, decisão técnica, comentário e notificação.
8. Usar as operações principais pelo teclado e ler/tratar um achado recebido no celular.
9. Entender quando algo ainda não carregou, falhou, está vazio ou requer condição/permissão.

O chat continua parte central do Nexo. Preservar IBM Plex, chanfros, tema escuro e sinais de estado. Ganho de clareza não significa trocar a identidade por um dashboard genérico.

## 3. Forma de trabalho

### Antes da primeira alteração

1. Inspecione `git status`, instruções locais, ambiente Node e scripts pertinentes. Node requerido no pacote inspecionado: `>=24`; confirme no checkout.
2. Registre alterações preexistentes e preserve-as, inclusive documentos não rastreados. Não usar reset/clean/reversão em massa para começar.
3. Reproduza os problemas da primeira etapa e registre baseline. Se um item já estiver corrigido, demonstre pelo caminho de uso e teste pertinente antes de marcá-lo assim.
4. Reutilize servidor de desenvolvimento adequado. Registre os processos que iniciar para encerrar somente esses processos no final.
5. Use dados sintéticos e ambiente de teste para escritas. Leia os scripts antes de executar: alguns `prova:*`, seeds e baterias podem acessar banco ou serviços reais. Não imprimir segredos.

### Durante a implementação

- Faça fatias funcionais completas, não uma coleção de componentes desconectados.
- Resolva escolhas locais autonomamente e registre decisões relevantes. Não pedir confirmação a cada tela, fase ou botão.
- Reutilize componentes, contratos, armazenamento, testes e endpoints adequados. Não criar uma segunda fonte de verdade por conveniência visual.
- Não execute chamadas pagas de IA, envios reais de e-mail ou alterações em dados reais apenas para demonstrar a UI. Mocks de transporte são apropriados; exportação com PDF sintético deve exercitar o gerador real quando possível.
- Se precisar de schema, prepare migração compatível e valide em banco de teste identificado. Não aplicar migração em produção como efeito colateral da implementação local.
- Implantação, push e publicação não são necessários para concluir este pacote local. Deixe o resultado revisável. Autorização explícita adicional do usuário prevalece.
- Não esconder erros com `catch` vazio, tratar desconhecido como sucesso, fabricar métricas ou retirar validação para liberar um botão.
- Não substituir testes comportamentais por busca de strings, presença de JSX ou screenshots isolados.
- Rodar verificações proporcionais ao risco. Não executar toda a bateria a cada ajuste de CSS; ampliar diante de novos problemas e no fechamento pertinente.

### Continuidade e bloqueios

Atualize `PROGRESSO.md` ao concluir cada fatia relevante. Ao se aproximar do limite da sessão, registre código alterado, testes reais, problemas restantes e próxima ação específica. Retome desse ponto sem refazer a auditoria.

Um bloqueio deve identificar a informação/acesso que falta, o comportamento afetado e o que ainda pode avançar. Continue os itens independentes. Dificuldade ou tamanho da tarefa não justificam declarar concluído ou abandonar os P2. Trabalho sem validação necessária permanece `implementado, não verificado`.

## 4. Contratos necessários

### 4.1 Contexto de navegação

Normalizar projeto, conversa, auditoria e achado na entrada. Suportar links legados pertinentes, inclusive `project`/`projeto`, sem manter dois contratos divergentes. Escolher uma forma canônica e documentar compatibilidade.

Destino explícito tem prioridade sobre restauração da última conversa. Auditoria deve determinar seu projeto autorizado; parâmetros conflitantes não podem associar silenciosamente um registro a outro projeto. Query string não é autorização.

Após login, recarga, mudança de aba e retorno de visor, manter contexto correto. Redirecionar `/ld` e `/capas` à intenção correspondente no fluxo existente, preservando projeto. Redirecionar ambas a uma saudação genérica não atende G03.

### 4.2 Identidade da evidência

Resolver documento e revisão/hash, além da página, usando a identidade prevista pelo motor. Achado com duas fontes abre cada fonte real; revisão ausente deve ser indicada como tal.

O mesmo resolvedor alimenta card, mapa e visor. Não usar primeiro checksum como solução genérica nem `hasRevision: () => true`. Não remover verificação de revisão para fazer um botão funcionar. Fallback legado precisa ser explícito e não escolher documento contraditório à referência.

### 4.3 Montagem persistida

O manifesto deve representar, reutilizando tipos existentes quando adequados:

```text
versão do schema · identidade do rascunho · escopo do usuário/projeto
metadados · volumes ordenados · grupos ordenados · slots ordenados
arquivos e identidades · seleções de páginas · estado de gravação
revisão/hash do conteúdo · conferência vinculada à revisão
```

Persistir também bytes locais necessários ou referências recuperáveis reais. Salvar só nomes não recupera uma montagem. Não serializar `File`/`Map` em localStorage esperando conservar conteúdo. Reutilizar padrões de IndexedDB/armazenamento existentes quando apropriado, sem colidir com chaves do Nexo.

Proteger escopo entre usuários e concorrência entre abas. Rascunho antigo não pode sobrescrever edição nova silenciosamente. Mostrar a garantia verdadeira: salvo neste dispositivo é diferente de sincronizado. Falha de quota, storage bloqueado ou arquivo ausente deve permitir recuperação do que existe.

### 4.4 Prontidão e conferência

Volume nasce como rascunho. Regras estruturais locais detectam, conforme o tipo, páginas ausentes, seleções inválidas, fontes indisponíveis e outros impedimentos definidos no produto. Separar avisos de bloqueios e oferecer navegação até a pendência.

Associar conferência ao conteúdo analisado. Alteração relevante invalida resultado; resposta tardia antiga não aprova versão nova. IA não é necessária para detectar volume vazio.

### 4.5 Operações reversíveis

Inserir, substituir, reordenar, duplicar, remover e reclassificar têm alvo explícito. Uma seleção de várias páginas aplicada de uma vez deve poder ser desfeita como uma operação compreensível.

Remover arquivo usado informa impacto. Desfazer restaura referências e bytes enquanto a operação for recuperável; não descartar conteúdo antes de permitir recuperação. Duplicação gera identidades próprias e não acopla edições das cópias.

### 4.6 Validade, tratamento e colaboração

Separar validade do achado da situação de tratamento, preservando enums/contratos que funcionam. Não alterar veredito do motor porque o usuário informou correção de uma prancha. Decisão técnica preserva motivo, autoria e histórico.

Comentários, envolvidos, atribuição e notificação têm efeitos distintos. Verificar respostas HTTP, comunicar falhas parciais e conservar rascunhos. Atualização entre sessões precisa de comportamento definido, por exemplo revalidação ao retornar à aba, sem impor infraestrutura nova desnecessariamente.

## 5. Seis etapas cobrindo os 31 itens

Os IDs têm uma etapa principal para rastreabilidade. Acessibilidade, feedback, responsividade e preservação de capacidades devem ser considerados em todas as etapas, não apenas no final.

### Etapa 1 — Restaurar percursos e fontes confiáveis

**IDs:** G03, G04, A01, A02, A03, P02.

**Entrada no código:** `app/projetos/[id]/page.tsx`, `app/audit/page.tsx`, `app/nexo/page.tsx`, `components/home/painel-do-usuario.tsx`, `lib/link-do-achado.ts`, `modules/nexo/components/NexoWorkspace.tsx`, `PalcoDoNexo.tsx`, `components/audit-result.tsx`, `components/achado/cartao-do-motor.tsx`, páginas/componentes administrativos.

| ID | Trabalho obrigatório | Prova de conclusão |
|---|---|---|
| G03 | Corrigir ações LD/Capas/Auditar e contrato de projeto; preservar URLs antigas | Quatro ações do projeto abrem a tarefa correta, sem 404 nem troca silenciosa de projeto; login/F5 mantêm contexto |
| G04 | Propagar ID do achado na home, usar helper e expor copiar link específico | Dois achados da mesma auditoria abrem detalhes diferentes e corretos |
| A01 | Carregamento/erro do link no shell, mesmo antes de `started` | 404, 403 e falha transitória têm feedback e saída; sucesso abre o solicitado |
| A02 | Alimentar mapa e visor com a mesma fonte local/servidor | PDF salvo sem blob local aparece em ambos |
| A03 | Integrar `motorFonte` e resolver múltiplos documentos/revisões | Casos novo e legado funcionam; fonte ausente não abre outro arquivo |
| P02 | Modelar não carregado/carregando/erro/vazio/sucesso no admin | Sem token não aparecem zeros ou diagnóstico de banco inventados; respostas simuladas cobrem todos os estados |

Não encerrar com botão habilitado e callback vazio. Validar chamada e renderização do conteúdo solicitado.

### Etapa 2 — Tornar a montagem recuperável e coerente

**IDs:** V01, V02, V05, V06, V10.

**Entrada no código:** `modules/volume-builder/components/volume-builder-page.tsx`, `export-panel.tsx`, `ai-validation-panel.tsx`, `lib/volume/assembly-builder.ts`, validadores, tipos e padrões de armazenamento do projeto.

| ID | Trabalho obrigatório | Prova de conclusão |
|---|---|---|
| V01 | Prontidão derivada da estrutura; pendências com destino | Volume vazio não é OK/exportável; erro indica como completar |
| V02 | Autosave e recuperação de manifesto + arquivos; estados de gravação | Dois volumes voltam após F5 com páginas, nomes, grupos e bytes; falha de storage não é sucesso |
| V05 | Desfazer/refazer e impacto de remoção/substituição | Remover arquivo usado em dois volumes e desfazer restaura ambos; nova operação trata corretamente o histórico de refazer |
| V06 | Conferência vinculada à versão | Alteração invalida selo; resposta atrasada não aprova estado novo |
| V10 | Vincular projeto dentro da mesa sem perder montagem | Rascunho independente passa a projeto autorizado e conserva ordem/arquivos; garantia de armazenamento fica clara |

Definir essas operações e seu estado evita criar vários controles visuais com comportamentos divergentes na etapa seguinte.

### Etapa 3 — Completar a operação de volumes

**IDs:** V03, V04, V07, V08, V09.

**Entrada no código:** bandeja de páginas, `assembly-row.tsx`, `assembly-block-card.tsx`, `assembly-cell-drop-zone.tsx`, importação/dropzone, prévia e exportação.

| ID | Trabalho obrigatório | Prova de conclusão |
|---|---|---|
| V03 | Escolha de volume/grupo/posição; seleção e inserção por teclado; alternativa ao drag | Inserir capa/LD/documentos no segundo volume e no segundo grupo quando aplicável, sem arrastar; destino aparece antes de aplicar |
| V04 | Resumo compacto de metadados; área útil; layout adaptado | Nenhum painel com altura zero; importação/montagem/conferência/exportação alcançáveis nas quatro larguras |
| V07 | Prévia real por volume, inclusive em ZIP | Abrir volume 2 de 3 sem baixar pacote e conferir sequência final |
| V08 | Destino de anexos; duplicar e mover volume/grupo conectados à UI | Inserir anexo, duplicar grupo e volume, editar cópia sem alterar original, mover antes/depois |
| V09 | Fila de importação, rejeição/erro por arquivo e reclassificação | PDF válido, corrompido, duplicado e ODT rejeitado dão feedback; reclassificar preserva referências das páginas usadas |

**Composição recomendada:** cabeçalho com projeto/nome/salvamento/desfazer; áreas nomeadas Arquivos, Montagem e Conferência; destino ativo inequívoco; Prévia e Exportar com prontidão real. Metadados podem recolher, desde que Dados do volume e seu resumo continuem visíveis.

Arraste é atalho, nunca a única operação. Não trocar apenas o nome do botão e manter handlers que usam `firstRow`/`firstBlock`.

Prévia e download compartilham o manifesto efetivo. Revogar URLs temporárias quando não usadas, sem quebrar visores ainda abertos. Árvore estrutural não substitui PDF renderizado.

### Etapa 4 — Transformar achados em uma fila de revisão

**IDs:** G05, A04, A05, A06, A07, A08, A09, A10.

**Entrada no código:** shell/CSS, `components/audit-result.tsx`, `components/achado/conversa-do-achado.tsx`, visor/canvas e APIs existentes de tratamento/atribuição.

| ID | Trabalho obrigatório | Prova de conclusão |
|---|---|---|
| G05 | Recolher projetos/chat por controles nomeados; foco na revisão; preferência restaurável | Em 1280×800, abrir evidência não exige encontrar e arrastar splitter; chat reabre preservado |
| A04 | Busca, situação, responsável, ordenação, contagens e fila | Encontrar referência/página/pessoa, limpar filtros, ver resolvidos; seleção informa alcance |
| A05 | Separar validade e tratamento | Confirmar achado não marca correção; decisão técnica não vira falso positivo |
| A06 | Nomear selecionar, atribuir, comentar e notificar pelo efeito | Seleção não afirma envio; lote mostra destinatário, quantidade e resultado |
| A07 | Lista compacta e detalhe centrado em evidência; conversa/histórico encontráveis | Problema e fonte aparecem antes de formulários; conversa tem aba nomeada e contagem |
| A08 | Carga contextual da discussão, atualização entre sessões, erros e rascunho | Falha HTTP não parece sucesso; rascunho sobrevive à troca de detalhe; fila grande não carrega todas as conversas completas |
| A09 | Nome verdadeiro para SVG textual; menu nomeado e feedback de cópia | Exportação se anuncia como cartão, não como captura do PDF |
| A10 | Anterior/próximo achado filtrado, posição, fonte/revisão e retorno preservado | Percorrer dez achados mantendo filtro; abrir duas fontes; sugestões/pendências acessíveis |

**Modelo recomendado:** cabeçalho de contexto → busca/filtros → fila compacta → detalhe. No detalhe: título, impacto, validade/tratamento, problema, evidência, ação recomendada; abas Evidência, Conversa e Histórico. Em largura insuficiente, lista e detalhe viram vistas sequenciais, não três colunas espremidas.

Não usar texto de referência como única identidade se não for globalmente único. Preserve IDs e escopo da auditoria. Paginação/virtualização, se necessária após medição, não pode quebrar foco, links profundos ou seleção em lote.

### Etapa 5 — Tornar o software inteiro encontrável

**IDs:** G01, G02, G07, P01.

**Entrada no código:** topo, sidebar, paleta, home, projetos e ferramentas.

| ID | Trabalho obrigatório | Prova de conclusão |
|---|---|---|
| G01 | Navegação por tarefa e distinção entre os dois caminhos de montagem | Montagem manual e achados recebidos encontrados em até duas ações, sem menu de conta/atalho obrigatório |
| G02 | Acionador visível de busca de ações e catálogo contextual | Anexo, capa, LD, atribuir e exportar encontram ação válida ou explicação da condição faltante |
| G07 | Glossário/copy consistentes; projeto distinto de conversa | Ajuda cita controles existentes; Nova conversa não se apresenta como Novo projeto; sem COVER/DOCUMENT/Preview indevidos |
| P01 | Projetos orientados a retomada/pendências; criar/administrar em posições claras | Retomar ativo, encontrar arquivado e acessar configurações sem perder ações |

Entradas propostas: Painel, Projetos, Montar volumes, Achados, Ajuda; administração por permissão. Implementar Achados como acesso útil à fila/área consolidada existente ou adaptada, preservando escopo de acesso. Não acrescentar link para rota vazia.

Catálogo de ações simples: ID, rótulo, sinônimos, contexto, permissão, destino e motivo de indisponibilidade. Compartilhar com paleta/ajuda quando adequado. Menus secundários são permitidos se nomeados. Ações destrutivas não executam diretamente por busca acidental.

Reconciliar **todas as linhas** do inventário: preservar entrada, entregar equivalente melhor ou justificar por que capacidade interna permanece restrita. Não retirar função de usuário para fazer a tela parecer limpa.

### Etapa 6 — Fechar adaptação, acessibilidade e consistência

**IDs:** G06, G08, G09; revisão transversal dos anteriores.

| ID | Trabalho obrigatório | Prova de conclusão |
|---|---|---|
| G06 | Substituir bloqueio total por experiência útil em tela pequena | Link em 390×844 permite ler achado/fonte/situação, conversar e atribuir; navegação/saída clara |
| G08 | Consolidar escala de texto/tokens e reduzir ruído de painéis | Informação decisiva legível; fonte pequena reservada a metadados; documentação e estilos concordam |
| G09 | Nomes/contexto dos controles, labels, estados, foco e teclado | Nenhum botão sem nome nos fluxos avaliados; filtros expõem estado; modais/troca de vista preservam foco |

**Larguras obrigatórias:** 1920×1080, 1440×1000, 1280×800 e 390×844 nos percursos principais. Testar também zoom real de 200%, não apenas captura com outras dimensões.

Na montagem pequena, usar etapas/abas com rolagem natural. V04 continua obrigatório: não trocar o colapso por mensagem que bloqueia tudo. Limite de uma interação avançada, se necessário, deve ser localizado, mantendo consulta/navegação úteis e sem declarar suporte integral ao recurso bloqueado.

Verificar contraste dos pares reais de texto/estado, foco, `prefers-reduced-motion`, leitura sem depender somente de cor e retorno de foco de diálogos. Meta usual de texto normal: 4,5:1; aplicar critérios pertinentes a texto grande/controles. Alvos AA têm regra de 24×24 CSS px e exceções; 44×44 é meta de conforto de toque, não mínimo AA universal. Referências no relatório original.

Os 260 apontamentos do detector são consultivos de escala tipográfica. Não tratá-los como 260 bugs nem ajustar fontes cegamente para zerar uma ferramenta.

## 6. Verificação

### 6.1 Base existente

O repositório possui scripts de testes diretos em Node e Playwright. Confirme comandos, leia efeitos colaterais e use os que cobrem contratos alterados. Não instalar outro framework só por este trabalho.

| Área | Scripts pertinentes existentes na preparação |
|---|---|
| Links, fonte, projeto e painel | `test:link-achado`, `test:fonte-documento`, `test:resolucao`, `test:atencao-painel` |
| Contrato do parecer/card | `test:parecer-contrato` |
| Validade, atribuição e conversa | `test:desfecho`, `test:conversa-achado`, `test:quem-avisar` |
| Layout/legibilidade | `test:nexo:largura`, `test:nexo:layout`, `test:contraste` |
| Geração assistida preservada | `test:nexo:tomos`, `test:nexo:desatualizados`, `test:nexo:slots`, `test:nexo:pre-volume`, `test:nexo:volumes-prontos`, `test:nexo:decisoes`, `test:ld` |
| Sessão e isolamento | `test:nexo:session`, `test:security:audits`, `test:security:p2` |
| Admin | `test:admin` |

Executar com `npm run <nome>`. A lista não demonstra cobertura completa nem que os testes passaram no baseline. Corrigir regressões introduzidas e distinguir falhas anteriores com evidência. Se teste codifica layout antigo alterado intencionalmente, atualizar expectativa com justificativa, não simplesmente apagá-lo.

**Fechamento:** `npm run lint`, `npm run build`, testes pertinentes e navegador. Build executa `prisma generate` no pacote atual; não equivale a migração ou validação de produção. Não declarar aprovado se falhou por código ou ambiente.

### 6.2 Novos testes necessários

Adicionar testes comportamentais onde a correção altera estado de risco: persistência, recuperação, versão de conferência, destino, histórico, seleção/atribuição e fonte. Testes não precisam espelhar cada classe CSS.

| Caso | Preparação | Resultado obrigatório |
|---|---|---|
| T01 · Contexto | Dois projetos/conversas; último trabalho A | Link B abre B após login/F5; conflito não troca vínculo silenciosamente |
| T02 · Link | Dois achados da mesma auditoria e ID ausente | Alvo correto selecionado; ausente tem feedback/retorno |
| T03 · Fontes | Local, remoto, duas fontes/revisões e ausente | Card/mapa/visor concordam; nenhum arquivo errado |
| T04 · Rascunho | Dois volumes/dois grupos com páginas e nomes editados | F5 preserva montagem/bytes; outra aba não sobrescreve silenciosamente |
| T05 · Falha de gravação | Quota/storage indisponível | Não mostra salvo; mantém memória e oferece recuperação possível |
| T06 · Destino/teclado | Bandeja com múltiplas páginas | Inserir no segundo grupo do segundo volume sem drag e sem alterar o primeiro |
| T07 · Histórico | Remover arquivo compartilhado, trocar capa, duplicar grupo | Desfazer/refazer preserva ordem, identidade e independência das cópias |
| T08 · Conferência | Analisar revisão 1 e editar para 2 antes/depois da resposta | Resultado da revisão 1 nunca aprova 2 |
| T09 · Importação | Válido, corrompido, duplicado, rejeitado | Resultado por arquivo; reclassificação preserva referências |
| T10 · Saída | Três volumes sintéticos com páginas identificáveis | Prévia individual e PDF/ZIP real têm mesma sequência, totais e arquivos esperados |
| T11 · Revisão | Fila com estados/responsáveis variados | Busca/filtros/ordem, seleção e anterior/próximo preservam contexto |
| T12 · Colaboração | Duas sessões de teste; HTTP 403/500 | Atualização conforme política; falha não parece sucesso; rascunho preservado |
| T13 · Admin | Sem token, carregando, vazio, sucesso e erros | Estado correto, sem zero/configuração ausente inventados |
| T14 · Adaptação/descoberta | Quatro larguras, zoom 200%, teclado | Controles alcançáveis; capacidades têm caminho; leitura móvel útil |

T10 usa PDF identificado por página e inspeção do resultado por parser/visor. Resposta 200 sozinha não basta. Em T12, simular transporte de e-mail e verificar intenção/payload sem entregar a pessoas reais.

### 6.3 Evidência visual e desempenho

Guardar capturas novas por fluxo/viewport/estado em `evidencias/` neste pacote ou diretório de QA documentado. Não sobrescrever as anteriores. Registrar procedimento e resultado observável; screenshot não substitui operação.

Perfilar fila pequena e grande com fixtures. Medir número de requisições de conversa no carregamento, ao abrir detalhe e comportamento de interação/rolagem. Registrar ambiente e tamanho da amostra. Não inventar FPS, latência ou ganho percentual; não atribuir ganho do frontend ao motor.

## 7. Critérios de encerramento

- [ ] 31 IDs implementados/verificados, ou já corrigidos confirmados por evidência atual.
- [ ] Nenhum P1 encerrado por ter apenas botão, stub, helper ou teste isolado.
- [ ] Inventário revisado linha a linha, com caminho final, permissão e condições; nenhuma capacidade removida silenciosamente.
- [ ] Montagem manual recuperável, destino explícito, reversível e operável por teclado.
- [ ] Prévia/exportação exercitadas com PDFs sintéticos reais.
- [ ] Links abrem contexto correto e erros aparecem mesmo antes do palco.
- [ ] Legado e motor novo mostram evidência do documento/revisão corretos.
- [ ] Validade, tratamento, atribuição, comentário e notificação claros.
- [ ] Leitura/tratamento de achados no celular e área útil no notebook.
- [ ] Admin/falhas assíncronas não inventam sucesso ou zero.
- [ ] Identidade, chat, geração assistida, decisões e isolamento preservados.
- [ ] Testes, lint e build com resultados reais; bloqueios/falhas visíveis.
- [ ] Documentação e `CHANGELOG.md` atualizados; evidências e retomada entregues.

Bloqueio externo significa **parcial com bloqueio identificado**, não tudo concluído. Continuar o restante independente. Não rebaixar critério de aceite para fechar a tabela.

## 8. Entrega final do Claude Code

Criar `RELATORIO-DE-EXECUCAO.md` neste pacote com:

1. O que mudou para quem monta volumes e quem revisa achados.
2. Matriz dos 31 IDs com status, arquivos/commits pertinentes e evidências de uso.
3. Caminho final das capacidades do inventário, inclusive menus e ações contextuais.
4. Decisões de contexto, armazenamento, fonte documental e estados operacionais.
5. Comandos/resultados, distinguindo unidade, integração, navegador e leitura de código.
6. Capturas antes/depois comparáveis e desempenho realmente medido.
7. Limitações, migrações preparadas se houver, problemas preexistentes e validações pendentes.

Atualizar `PROGRESSO.md` e indicar próxima ação exata quando houver trabalho. A resposta final resume resultado e aponta evidência; não substitui implementação por recomendações.
