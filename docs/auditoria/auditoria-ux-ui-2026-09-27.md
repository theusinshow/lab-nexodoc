# Auditoria de UX/UI — NexoDoc

**Inspeção:** 27/09/2026. **Consolidação:** 28/09/2026.  
**Escopo:** experiência do software inteiro, com profundidade em montagem de volumes e revisão de achados. Auditoria de interface e integração dos fluxos; não é uma nova auditoria da arquitetura do motor.  
**Entregáveis relacionados:** [inventário de funções](inventario-funcional-ux-ui-2026-09-27.md) · [evidências e roteiro de validação](evidencias-ux-ui-2026-09-27.md).

## 1. Diagnóstico

O NexoDoc tem identidade visual própria e capacidades úteis já implementadas. O maior problema não é falta de funcionalidades: é a distância entre **ter uma função, encontrá-la, entender seu efeito e conseguir concluir a tarefa com confiança**.

Há três prioridades:

1. **Confiabilidade da montagem:** um volume vazio aparece como pronto; a montagem manual desaparece no recarregamento; os atalhos de inserção enviam páginas sempre ao primeiro volume/grupo; partes do fluxo dependem de arrastar.
2. **Revisão orientada à evidência:** o parecer disputa espaço com duas colunas largas; um cartão de achado ocupa mais de uma tela; a conversa antecede a evidência; abertura por link e acesso ao PDF têm falhas de integração.
3. **Descoberta de funções:** volumes fica sob conta/ferramentas antigas; a busca de ações depende de conhecer Ctrl+K; ações de projeto apontam para rotas inexistentes; termos diferentes descrevem a mesma operação.

**Veredito de integridade:** a identidade do produto é coerente; a integridade dos percursos operacionais precisa de correção. A marca, o chat, o canvas e a linguagem técnica devem ser preservados. Uma troca cosmética de tema não resolveria os problemas encontrados.

### Resultado da triagem

São **31 achados consolidados: 0 P0, 15 P1 e 16 P2**. Não foram criados itens de polimento P3 para inflar o relatório. P1 indica perda de trabalho, percurso importante interrompido, informação enganosa ou barreira relevante de uso. P2 indica melhoria com alternativa existente. Ausência de P0 não significa ausência de bloqueios em contextos específicos, como montagem no celular.

| Dimensão | Nota heurística, 0–4 | Base da avaliação |
|---|---:|---|
| Acessibilidade | 2 | Há controles acessíveis e suporte a teclado em partes do Nexo, mas a montagem manual depende de ponteiro e contém botões sem nome. |
| Desempenho | 2 | Há cuidados no canvas/animações, mas as conversas dos achados são carregadas por cartão. Avaliação estática; sem benchmark de latência ou FPS. |
| Responsividade | 1 | Nexo bloqueia telas pequenas; montagem manual perde a área de trabalho; 1280 px deixa pouco espaço para evidências. |
| Tematização | 3 | Identidade e tokens consistentes em boa parte da interface, com deriva na escala de fontes. Não houve certificação de contraste. |
| Integridade da implementação | 2 | Estados de prontidão, links e fontes documentais têm falhas confirmadas. |
| **Total** | **10/20** | **Necessita trabalho significativo nos percursos principais.** |

Essa nota é uma triagem do recorte inspecionado, não uma medida da qualidade do motor ou da exatidão das auditorias. A nota de desempenho tem confiança menor, por não haver ensaio de carga.

## 2. Método, cobertura e limites

- Leitura das **25 páginas do App Router**, dos componentes compartilhados e dos fluxos de volumes/achados. A cobertura por rota está no inventário.
- Navegação local com Playwright em home, projetos, detalhe de projeto, Nexo, tutorial, parecer, visor de PDF, volumes, ferramentas, login e cinco páginas administrativas.
- Inspeção das larguras **1920×1080, 1440×1000, 1280×800 e 390×844**, conforme a tela. Não significa que todas as rotas tenham sido verificadas nas quatro resoluções.
- Reprodução de estados com dados fictícios: parecer com quatro achados; PDF local de seis páginas; link de auditoria inexistente. No contexto isolado, escritas em APIs foram interceptadas. Não houve envio de e-mail, alteração de papéis ou execução de auditoria por IA.
- Administração avaliada visualmente **antes de informar o token adicional**; fluxos de dados carregados foram lidos no código, não executados. Login de erro foi inspecionado sem concluir autenticação externa.
- Detector do Impeccable executado em volumes, componentes compartilhados e Nexo: **45 + 109 + 106 = 260 apontamentos consultivos**, todos referentes à escala de fontes do design system. Não são 260 defeitos confirmados nem um resultado de conformidade WCAG.
- Não foram medidos contraste completo, leitor de tela, zoom real do navegador, desempenho com centenas de páginas, qualidade do conteúdo gerado ou exportação real ponta a ponta. As verificações sugeridas ao final são trabalho futuro, não testes já aprovados.

**Legenda de evidência:** **R** = reproduzido no navegador; **C** = confirmado por leitura da implementação; **H** = hipótese de efeito/risco a validar com usuários ou medição. Cada item distingue o fato da proposta. Referências `arquivo:linha` correspondem ao checkout inspecionado e podem mudar após correções.

## 3. Navegação e sistema visual

### G01 — P1 · Funções centrais estão em lugares de baixa descoberta

**Evidência R+C.** Home coloca Volumes e Projetos no menu da conta. No Nexo, acessos a outras áreas ficam no rodapé da sidebar, por ícones; a montagem manual é apresentada como ferramenta antiga, embora tenha finalidade que o fluxo do Nexo não substitui integralmente. Fontes: `components/layout/barra-do-topo.tsx:303`; `modules/nexo/components/NexoSidebar.tsx:417`; `app/ferramentas/page.tsx:65`; `lib/modules.ts:59`.

**Impacto:** o usuário precisa lembrar onde uma ferramenta foi escondida e pode concluir que a montagem manual foi descontinuada.

**Proposta:** navegação estável com nomes de tarefa: **Painel, Projetos, Montar volumes, Achados e Ajuda**. Administração aparece por permissão. “Montar volumes” oferece explicitamente os caminhos “Gerar a partir das pranchas” e “Montar com PDFs existentes”. A entrada Achados pode começar como uma visão consolidada dos recursos existentes, sem duplicar o motor. Conta deve concentrar identidade, preferências e saída.

**Aceite:** uma pessoa nova encontra a montagem manual e os achados recebidos sem abrir conta, conhecer atalhos ou digitar uma instrução no chat. Acesso em até duas ações a partir do shell. **Categoria:** integridade/arquitetura de informação. **Esforço:** M. **Comando:** `$impeccable shape`.

### G02 — P2 · Busca de ações depende de um atalho que precisa ser conhecido

**Evidência C.** A paleta abre por Ctrl+K e seu catálogo é limitado às partidas e algumas rotas. Não inventariar seus itens como se cobrisse todas as ferramentas. Fontes: `modules/nexo/components/PaletaDeComandos.tsx:88`; `modules/nexo/lib/paleta.ts:43`.

**Proposta:** acionador visível “Buscar ações · Ctrl+K”, com sinônimos como capa, LD, separatriz, exportar, reordenar, corrigir, atribuir e copiar link. Resultados contextuais devem indicar pré-requisitos. Ações destrutivas não devem executar diretamente na paleta; ela pode levar à área em que são feitas com proteção.

**Aceite:** mouse e teclado abrem o mesmo catálogo; busca por “anexo” encontra a ação ou explica honestamente sua indisponibilidade. **Categoria:** integridade. **Esforço:** M. **Comando:** `$impeccable onboard`.

### G03 — P1 · Ações do projeto quebram o percurso e não entregam o contexto prometido

**Evidência R+C.** “Lista de documentos” e “Capas” apontam para `/ld` e `/capas`, que retornaram 404. Fontes: `app/projetos/[id]/page.tsx:101` e `:109`. A ação de auditoria passa `?project=` por `/audit`; o redirecionamento preserva esse parâmetro, mas `app/nexo/page.tsx` não o entrega ao workspace. A home usa `?projeto=`; tampouco há consumo desse contexto nos leitores de URL do workspace. Esta segunda parte é **C**, sem executar criação de auditoria para provar associação no servidor.

**Impacto:** clicar em uma tarefa dentro do projeto pode resultar em página inexistente ou entrada genérica, inclusive com restauração de outra conversa.

**Proposta:** rotas antigas com redirecionamento compatível para intenção correta; contrato único de projeto/conversa/auditoria na URL; indicação visível “Trabalhando no projeto X” antes de qualquer processamento. O destino explícito deve prevalecer sobre a restauração da última conversa.

**Aceite:** os quatro atalhos do detalhe levam à função correta; projeto selecionado permanece inequívoco após login e F5; um link do projeto B nunca restaura silenciosamente o contexto A. **Categoria:** integridade. **Esforço:** M. **Comando:** `$impeccable harden`.

### G04 — P2 · Clicar em um achado na home abre apenas sua auditoria

**Evidência C.** O link em `components/home/painel-do-usuario.tsx:868` inclui `auditoria`, mas não `achado`. O helper `lib/link-do-achado.ts` já suporta o destino específico.

**Proposta:** carregar a identidade do achado no item da home e gerar o link pelo helper comum. Oferecer também “Copiar link do achado” no detalhe.

**Aceite:** clicar no título abre e destaca exatamente aquele achado, inclusive após autenticação; se ele não existir mais, a tela informa isso e oferece a auditoria. **Categoria:** integridade. **Esforço:** P. **Comando:** `$impeccable harden`.

### G05 — P1 · O espaço de trabalho principal é estreito em notebooks

**Evidência R+C.** No arranjo observado, sidebar ocupa 300 px e chat 520 px. A área central ficou com **528 px em 1440** e **368 px em 1280**. Fontes: `app/globals.css:175`, `:181`, `:1417`; `modules/nexo/components/NexoShell.tsx`. Há splitter funcional, inclusive por teclado, mas sua descoberta depende de perceber a divisória.

**Proposta:** manter chat disponível, com botões nomeados para recolher projetos/chat e modo **Foco na revisão**. Ao abrir evidência, priorizar o documento; ao voltar ao diálogo, restaurar a preferência. Não remover o fluxo de chat.

**Aceite:** em 1280×800, leitura do achado e documento não depende de redimensionar manualmente três painéis. A pessoa encontra “Expandir revisão” e restaura o chat sem perder estado. **Categoria:** responsividade/layout. **Esforço:** M. **Comando:** `$impeccable layout`.

### G06 — P1 · Um link recebido no celular não permite sequer revisar o achado

**Evidência R+C.** Nexo oculta sidebar, palco e chat até 1024 px e mostra o aviso de tela maior. Projetos/admin usam o portão de tela larga. Isso é uma restrição deliberada da implementação, não apenas overflow. Fontes: `app/globals.css:1477`; `components/ui/portao-de-tela-larga.tsx`.

**Proposta:** oferecer pelo menos leitura sequencial do achado, evidência, conversa e atribuição em tela pequena. A montagem avançada pode ter suporte diferente, comunicado por operação. Incluir saída clara para o painel quando uma tarefa exigir computador.

**Aceite:** abrir um link recebido em 390×844 permite identificar projeto, problema, página, responsável e situação; restrições não apagam toda a aplicação. Testar também 200% de zoom em desktop, ainda não executado aqui. **Categoria:** responsividade. **Esforço:** G. **Comando:** `$impeccable adapt`.

### G07 — P2 · Vocabulário e orientações não correspondem sempre à ação

**Evidência R+C.** “Novo projeto” cria uma conversa; montagem alterna volume/linha/grupo/bloco; instrução pede “Adicionar linha”, mas a ação diz “Adicionar volume”; slots exibem COVER/DOCUMENT e exportação usa Preview. Fontes: `NexoSidebar.tsx:233`; `modules/volume-builder/components/assembly-workspace.tsx:20`; `assembly-cell-drop-zone.tsx:100`; `export-panel.tsx:230`.

**Proposta:** glossário explícito: **Projeto → Conversas/Auditorias → Volumes → Grupos → Documentos/Páginas**. “Nova conversa” e “Novo projeto” devem ser operações diferentes. Usar “Prévia”, “Capa”, “Lista de documentos (LD)” e “Separatriz”, com explicação curta na primeira ocorrência.

**Aceite:** textos de ajuda citam o nome exato do controle visível; mesma entidade mantém o mesmo nome entre home, Nexo e volumes. **Categoria:** integridade/copy. **Esforço:** P. **Comando:** `$impeccable clarify`.

### G08 — P2 · Hierarquia visual depende demais de microrrótulos e painéis empilhados

**Evidência R+C.** Detector encontrou 260 usos consultivos fora da escala declarada. Há textos recorrentes de 9–11 px em volumes, sidebar e achados. Os números não demonstram baixo contraste; contraste precisa ser medido separadamente. Fontes: `DESIGN.md`; relatórios `detector-*.json` no diretório de evidências.

**Proposta:** consolidar escala real de tipografia e documentá-la; reservar tamanho pequeno para metadados auxiliares. Evidência, status e ações precisam de leitura confortável. Reduzir bordas e cartões dentro de cartões, usando agrupamento por espaço e títulos; preservar fontes IBM Plex, chanfros e paleta.

**Aceite:** texto necessário para decidir ou agir permanece legível em 1280×800; hierarquia de título, contexto, evidência e ação é consistente. Validar contraste dos pares reais antes de afirmar conformidade. **Categoria:** tematização/integridade. **Esforço:** M. **Comando:** `$impeccable typeset`.

### G09 — P1 · Há controles sem nome acessível e estados pouco expostos

**Evidência R+C.** Na montagem de teste, foram encontrados **sete botões nativos sem nome acessível**. Remover grupo e mover documentos usam ícones sem `aria-label`; campos têm texto visual não associado; filtros de achados de impacto/disciplina/tipo não expõem consistentemente o estado selecionado. Há outros controles corretamente nomeados; o problema não é universal. Fontes: `assembly-block-card.tsx:61`, `:106`, `:211`; `app/admin/pessoas/page.tsx:427`; `components/audit-result.tsx:3266`.

**Proposta:** nomes contextuais, como “Mover prancha 3 para antes”; labels associados; estado de seleção; foco visível e ordem de navegação. Ícones destrutivos devem esclarecer seu alvo. Avaliar alvos de toque sem confundir tamanho visual do ícone com área clicável.

**Aceite:** árvore de acessibilidade identifica operação/alvo/estado; nenhuma ação da montagem depende de adivinhar um ícone. Verificar WCAG 4.1.2, 1.3.1 e teclado. Para alvos, [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) usa 24×24 CSS px com exceções; 44×44 é uma meta de conforto, não o mínimo AA universal. **Categoria:** acessibilidade. **Esforço:** M. **Comando:** `$impeccable harden`.

## 4. Montagem de volumes — prioridade principal

Os problemas desta seção referem-se principalmente à **mesa manual `/volumes`**. O Nexo já tem persistência e tratamento de artefatos desatualizados em outros fluxos; não transferir automaticamente estas conclusões para ele.

### V01 — P1 · Volume vazio recebe sinal de pronto

**Evidência R+C.** Adicionar um volume sem importar arquivos produz status OK e libera exportação. A criação usa `status: "sem_problemas"`; `canExport` verifica apenas `rows.length > 0`; o rodapé informa “linha pronta”. Fontes: `modules/volume-builder/lib/volume/assembly-builder.ts:15`; `components/export-panel.tsx:30`, `:270`, dentro do mesmo módulo.

**Impacto:** uma pessoa pode confundir ausência de validação com aprovação. Não foi executada a exportação para afirmar qual arquivo o backend produziria.

**Proposta:** estados **Rascunho → Incompleto → Pronto para conferir → Conferido → Exportável**. Derivar prontidão de regras estruturais determinísticas, com pendências clicáveis; verificação por IA é complementar. Regras obrigatórias devem respeitar o tipo de volume, sem impor capa/LD a todo caso por convenção não validada.

**Aceite:** criar um volume vazio nunca mostra OK/pronto; exportação informa as pendências do contexto atual. Não exige pagamento/chamada de IA para detectar ausência de páginas. **Categoria:** integridade. **Esforço:** M. **Comando:** `$impeccable harden`.

### V02 — P1 · Recarregar elimina a montagem manual

**Evidência R+C.** Rascunho renomeado desapareceu após F5, sem aviso de recuperação. Metadados, arquivos, seleção e volumes vivem em `useState`. Fonte: `modules/volume-builder/components/volume-builder-page.tsx:38`.

**Proposta:** autosave do manifesto e dos arquivos locais, com indicador “Salvo neste dispositivo”/“Sincronizado” conforme a garantia real. Recuperação, identificação do projeto e aviso de arquivos indisponíveis em outra máquina. Guardar alterações antes de navegação e oferecer descarte explícito.

**Aceite:** importar, montar dois volumes, editar e recarregar preserva ordem, nomes, seleção de páginas e bytes necessários. Falha de armazenamento é visível; restauração parcial identifica o que falta. **Categoria:** integridade. **Esforço:** G. **Comando:** `$impeccable harden`.

### V03 — P1 · Inserção acessível e escolha do destino estão incompletas

**Evidência R+C.** Só existe `PointerSensor`. Enter sobre miniatura focada não a selecionou. Clicar Capa/LD/Docs aplica ao **primeiro volume e primeiro grupo**, independentemente do destino pretendido. Fontes: `volume-builder-page.tsx:76`, `:113`, `:127`, `:154`; `page-asset-tray-internal.tsx:415`, `:674`. Os alvos vazios são áreas de drop, sem seletor equivalente.

**Proposta:** seleção por mouse/teclado seguida de **Adicionar ao volume… → Grupo → Posição/tipo**. Cada slot vazio oferece “Escolher páginas”. Mostrar o destino ativo junto aos botões. Arrastar continua como atalho; mover para antes/depois e trocar de grupo precisam de alternativa explícita. Remover grip decorativo que sugere arraste onde o item não é arrastável.

**Aceite:** montar dois volumes completos sem arrastar; adicionar ao segundo grupo do segundo volume; substituir capa com aviso do alvo e opção de desfazer. Verificar [teclado, WCAG 2.1.1](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html) e [alternativa ao arraste, WCAG 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html). **Categoria:** acessibilidade/integridade. **Esforço:** G. **Comando:** `$impeccable harden`.

### V04 — P1 · A área de montagem colapsa em telas pequenas

**Evidência R+C.** Em 390×844, o grid ficou abaixo de metadados e seus painéis apresentaram **altura 0**, sem acesso útil à montagem. Em 1280×800, cabeçalho e metadados consumiram aproximadamente 560 px antes da área operacional, restando cerca de 230 px, com rolagens internas. Fonte: `volume-builder-page.tsx:382`, `:419`.

**Proposta:** resumo compacto dos metadados, expandido sob demanda com rótulo claro; documento/volume como foco do espaço. Em telas menores, etapas com rolagem natural e abas nomeadas Arquivos / Montagem / Conferência. Reservar `overflow` interno para painéis com altura efetivamente disponível.

**Aceite:** nenhum painel operacional tem altura zero nas quatro resoluções; ações finais permanecem alcançáveis; a página não termina no meio dos metadados. **Categoria:** responsividade. **Esforço:** M. **Comando:** `$impeccable adapt`.

### V05 — P1 · Exclusões e substituições não oferecem recuperação

**Evidência C.** Remover volume/grupo é imediato. Remover arquivo também retira suas referências da montagem. Não há histórico de desfazer nesse fluxo. Fontes: `volume-builder-page.tsx:88`, `:346`; `assembly-block-card.tsx:106`.

**Proposta:** desfazer/refazer para operações de montagem; mensagem de impacto “Usado em 3 grupos de 2 volumes”; confirmação apenas para perdas amplas ou irreversíveis. Substituir página deve ser diferente de adicionar.

**Aceite:** remover um arquivo usado em vários lugares mostra impacto e permite restaurar exatamente a ordem anterior; excluir grupo e trocar capa são reversíveis. **Categoria:** integridade. **Esforço:** M. **Comando:** `$impeccable harden`.

### V06 — P1 · Resultado da conferência pode permanecer após editar a montagem

**Evidência C.** `ai-validation-panel.tsx:20` mantém resultado local atualizado somente ao analisar. Não há invalidação por alteração de linhas/metadados nem vínculo desse parecer com prontidão/exportação. Não foi chamada IA para testar esta condição.

**Proposta:** associar a conferência a uma versão/hash do manifesto; qualquer alteração relevante muda para “Montagem alterada após conferência”. Exibir data, escopo e pendências. Separar validação estrutural local de análise semântica por IA.

**Aceite:** depois de conferir, trocar uma página ou alterar a sequência invalida o selo anterior; resultado atrasado não aprova uma versão mais nova. **Categoria:** integridade. **Esforço:** M. **Comando:** `$impeccable harden`.

### V07 — P2 · Prévia indisponível justamente para montagens com vários volumes

**Evidência C.** Prévia direta só aceita `single_pdf`; para múltiplos volumes a orientação é gerar ZIP. Fonte: `modules/volume-builder/components/export-panel.tsx:71`, `:210`, `:221`.

**Proposta:** prévia por volume, com seletor, total de páginas, origem e posição final. O formato do download não deve impedir inspeção anterior. Manter separadas a árvore estrutural e a prévia real do PDF.

**Aceite:** revisar o volume 2 de um pacote de três sem baixar/descompactar o ZIP. **Categoria:** integridade. **Esforço:** M. **Comando:** `$impeccable shape`.

### V08 — P2 · A classificação “Anexos” não tem destino explícito na montagem

**Evidência C.** Importação/bandeja oferecem Anexos. Modelo, exportação e validação possuem `appendices`, mas `assembly-block-card.tsx` só apresenta separatriz, LD e pranchas. Há helpers `duplicateRow`/`duplicateBlock` sem acionadores; são código disponível, não funcionalidades completas já entregues. Fontes: `imported-files-pool.tsx:206`; `assembly-builder.ts:47`, `:116`; `assembly-block-card.tsx:123`.

**Proposta:** seção Anexos com posição explícita, ou classificação unificada com função clara na sequência. Expor duplicar volume/grupo somente depois de validar cópia de identificadores, referências e estado. Adicionar mover grupo/volume para antes/depois.

**Aceite:** toda categoria importável possui caminho de inserção nomeado; não é necessário fingir que um anexo é prancha para incluí-lo. **Categoria:** integridade/descoberta. **Esforço:** M. **Comando:** `$impeccable shape`.

### V09 — P2 · Importação não explica adequadamente rejeição e processamento

**Evidência C.** Dropzone aceita apenas PDF e não usa `onDropRejected`; o tratamento de ODT no callback de arquivos aceitos não cobre a rejeição feita pelo próprio dropzone. Contagem de páginas ocorre antes de exibir os novos arquivos, sem estado de progresso por arquivo. Fontes: `shared/file-dropzone.tsx:20`, `:34`; `components/imported-files-pool.tsx:40`, `:64`.

**Proposta:** fila com nome, estado, progresso quando mensurável e falha recuperável; feedback para arquivo rejeitado, PDF ilegível e duplicado. Permitir corrigir a classificação após importar. Explicar se a classificação é manual ou sugerida; não apresentar percentual como certeza sem contexto.

**Aceite:** soltar um ODT ou PDF corrompido produz mensagem junto ao arquivo; nenhuma importação longa parece clique sem efeito; reclassificar preserva a montagem. **Categoria:** integridade/feedback. **Esforço:** M. **Comando:** `$impeccable harden`.

### V10 — P2 · Vincular projeto exige sair do trabalho independente

**Evidência C.** A mesa permite modo independente e avisa que os resultados não entram no cockpit; o caminho para projeto é navegação externa, sem seletor local que preserve a montagem. Fonte: `modules/volume-builder/components/volume-builder-page.tsx` e componente `ProjectContextStrip` usado pela página.

**Proposta:** seletor “Projeto: Independente / Escolher projeto” dentro da mesa, com resultado claro sobre armazenamento/visibilidade. Modo independente é válido e deve continuar disponível.

**Aceite:** iniciar livre, montar e vincular ao projeto depois sem perder arquivos nem ordem; salvar localmente não é confundido com publicar no projeto. **Categoria:** integridade. **Esforço:** M. **Comando:** `$impeccable shape`.

## 5. Achados — prioridade principal

### A01 — P1 · Falha ao abrir auditoria por link pode desaparecer na tela inicial

**Evidência R+C.** Com `GET /api/audits/ux-missing` respondendo 404, a tela permaneceu na saudação, sem erro visível. O estado `started` só é ativado após sucesso; a mensagem de falha está dentro do palco, que não monta nessa condição. Fontes: `modules/nexo/components/NexoWorkspace.tsx:1686`; `modules/nexo/components/PalcoDoNexo.tsx:529`.

**Proposta:** carregamento/falha do link pertencem ao shell, independentes de existir conversa aberta. Diferenciar não encontrado, acesso negado, sessão expirada e falha temporária, sem expor informações indevidas.

**Aceite:** abrir link válido, removido, sem acesso e com rede interrompida sempre produz destino ou feedback com tentar novamente/voltar. Não restaurar conversa anterior por cima do pedido. **Categoria:** integridade. **Esforço:** M. **Comando:** `$impeccable harden`.

### A02 — P1 · Mapa “No documento” e visor do achado usam fontes diferentes

**Evidência R+C.** Com auditoria salva e PDF fornecido pelo endpoint de arquivo, o visor do achado renderizou a página 3, mas o mapa mostrou falhas nas miniaturas. `PalcoDoNexo` resolve `documento` local/servidor e o passa ao relatório, mas passa apenas `memorialPdf?.url` ao canvas. Fontes: `PalcoDoNexo.tsx:194`, `:359`, `:610`.

**Proposta:** resolver a fonte uma vez e entregá-la de maneira consistente aos dois visualizadores, incluindo carregamento, erro e identidade de documento/revisão.

**Aceite:** auditoria reaberta em contexto sem blob local mostra o mesmo documento no mapa e no detalhe. A ausência de arquivo é uma condição explícita, não uma grade de avisos genéricos. **Categoria:** integridade. **Esforço:** P–M. **Comando:** `$impeccable harden`.

### A03 — P1 · Evidências do motor novo não recebem o resolvedor de fonte na tela

**Evidência C.** `AuditResult` aceita `motorFonte`, mas não foi encontrado chamador TSX que forneça a prop. Cards recebem o fallback `hasRevision: () => false` e callback de abertura ausente. Fontes: `components/audit-result.tsx:147`, `:4199`, `:4852`; `lib/audit-engine/finding-card.ts:88`; `components/achado/cartao-do-motor.tsx:85`. Além disso, o palco escolhe o primeiro arquivo com checksum; isso não representa um catálogo de fontes para múltiplos documentos.

**Impacto:** a interface do novo formato pode informar arquivo indisponível mesmo quando existe material recuperável. A reprodução visual com o fixture legado **não** prova o fluxo novo; a lacuna aqui foi confirmada na integração.

**Proposta:** resolvedor por documento, revisão e página, compartilhado entre evidência, mapa e visor. Não corrigir simplesmente apontando todas as referências para o único memorial: isso pode mostrar a fonte errada.

**Aceite:** achado com duas fontes abre cada documento/revisão correta; fonte realmente ausente fica identificada como ausente; jamais cai silenciosamente em outro arquivo. **Categoria:** integridade. **Esforço:** G. **Comando:** `$impeccable harden`.

### A04 — P2 · A lista não permite organizar o trabalho pela situação operacional

**Evidência C.** Filtros principais cobrem impacto, disciplina e tipo; não há busca textual da lista nem filtros equivalentes para responsável e ciclo de tratamento. Ordenação é definida pela implementação. Fontes: `components/audit-result.tsx:1422`, `:1522`.

**Proposta:** busca por referência, texto, documento e página; filtros Situação, Responsável, Disciplina, Impacto; atalhos “Meus pendentes”, “Sem responsável” e “Todos”. Contagens claras e ordenação explícita por impacto/página/atividade. Manter acesso visível aos resolvidos e falsos positivos.

**Aceite:** localizar um achado por referência e montar a fila de uma pessoa sem percorrer cartões; limpar filtros em uma ação; seleção em lote indica se vale para página, filtro ou todos. **Categoria:** integridade/organização. **Esforço:** M. **Comando:** `$impeccable shape`.

### A05 — P2 · Validade do achado e tratamento da correção se misturam

**Evidência R+C.** Card combina “Marcar corrigido”, “Decisão técnica”, selo de verificação e, em outra região, “Correto”, “Falso positivo” e “Gravidade errada”. Fonte: `components/audit-result.tsx:3491`, `:3533`, `:3626`, `:4498`.

**Proposta:** separar dois eixos visíveis: **Validade** — confirmar achado, falso positivo, ajustar gravidade; **Tratamento** — pendente, atribuído, correção informada, decisão técnica. Definir o significado de “corrigido” e quem o declarou. Aceitação de risco deve preservar justificativa e histórico, sem virar falso positivo.

**Aceite:** uma pessoa consegue confirmar que o achado é verdadeiro sem marcar a obra como corrigida; histórico registra autor e motivo das decisões. **Categoria:** integridade/copy. **Esforço:** M. **Comando:** `$impeccable clarify`.

### A06 — P2 · “Enviar” descreve três ações diferentes

**Evidência R+C.** No card, Enviar seleciona; na barra de lote, Enviar aplica a atribuição; na conversa, Enviar publica comentário. Fontes: `components/audit-result.tsx:3580`, `:4645`, `:4758`; `components/achado/conversa-do-achado.tsx`.

**Proposta:** “Selecionar para atribuir”, “Atribuir a [pessoa]”, “Publicar comentário” e “Notificar por e-mail”, conforme o efeito real. Mostrar resumo antes da operação em lote e resultado por item quando houver falha parcial.

**Aceite:** selecionar não parece envio concluído; atribuir não implica e-mail já enviado; barra de lote mostra quantidade e destinatário em 1280 px sem dominar a tela. **Categoria:** integridade/copy. **Esforço:** P–M. **Comando:** `$impeccable clarify`.

### A07 — P2 · A evidência fica abaixo de uma grande área de conversa

**Evidência R+C.** No fixture de quatro achados, cartões atingiram aproximadamente **468×1056 px** em 1440 px. A discussão do card legado aparece antes do bloco de evidência. Fontes: `components/audit-result.tsx:4262`, `:4318`.

**Proposta:** lista compacta para comparação + detalhe do achado selecionado. No detalhe: título, impacto/situação, o que foi encontrado, evidência e ação recomendada. Abas explícitas “Evidência”, “Conversa (n)” e “Histórico” preservam descoberta sem repetir formulário vazio em todos os cartões. Alternativa em uma coluna para telas menores.

**Aceite:** identificar problema, documento, página e evidência principal antes de atravessar uma tela de controles; conversa permanece visível e acessível por um acionador nomeado. **Categoria:** layout/integridade. **Esforço:** G. **Comando:** `$impeccable layout`.

### A08 — P2 · Conversas dos achados têm lacunas de atualização e feedback

**Evidência C.** Cada componente busca conversa ao montar; atualiza após ações próprias, sem atualização automática por atividade de outra pessoa. Manipulação de envolvidos não verifica `response.ok` e não apresenta tratamento de falha. Fonte: `components/achado/conversa-do-achado.tsx:53`, `:102`. A montagem de vários cards produz um fetch por conversa: risco de escala **H**, sem benchmark de centenas de achados.

**Proposta:** resumo/contagem na lista; carregar discussão completa ao abrir; atualizar ao retomar foco ou mecanismo de atualização compartilhada; estados de falha e tentativa; preservar rascunho de comentário ao trocar de visão. Avisar quando a informação está desatualizada.

**Aceite:** falha 403/500 ao alterar envolvidos não parece sucesso; comentário de outra sessão torna-se visível por atualização definida; abrir 100 achados não dispara 100 conversas completas sem necessidade. **Categoria:** integridade/desempenho. **Esforço:** M. **Comando:** `$impeccable optimize` e `$impeccable harden`.

### A09 — P2 · “Print do achado” promete uma captura que não é do documento

**Evidência C.** A função gera SVG com resumo textual; não captura o trecho do PDF. Fonte: `components/audit-result.tsx:858`, `:3667`.

**Proposta:** nomear “Exportar cartão do achado (SVG)”. Se captura de evidência for criada, oferecer ação distinta que preserve documento, revisão, página e marcação. Menu secundário com rótulo “Mais ações”; copiar referência/link deve ter confirmação discreta.

**Aceite:** pessoa sabe o que será baixado antes do clique; cartão textual não é apresentado como prova visual extraída do documento. **Categoria:** integridade/copy. **Esforço:** P. **Comando:** `$impeccable clarify`.

### A10 — P2 · Revisão no PDF não oferece uma sequência clara de achados

**Evidência C.** O visor tem navegação por página, zoom e marcações, mas não uma navegação dedicada anterior/próximo achado da fila filtrada. Fonte: `components/audit-result.tsx:2390`.

**Proposta:** “Achado 3 de 12”, anterior/próximo, nome do arquivo e revisão; preservar filtro, zoom e retorno à lista. Para duas fontes, alternância explícita e opção de comparação quando o espaço permitir. Sugestões e pendências do motor já têm seções próprias: promover seus contadores, sem misturá-las ao veredito principal.

**Aceite:** revisar dez achados em sequência sem fechar/reabrir o modal a cada item; fonte e página atuais são inequívocas. Não foi validada nesta auditoria a precisão das marcações no PDF. **Categoria:** integridade/fluxo. **Esforço:** M. **Comando:** `$impeccable shape`.

## 6. Projetos e administração

### P01 — P2 · Organização de projetos prioriza formulário e manutenção antes do trabalho

**Evidência R+C.** Lista mantém formulário de criação à esquerda; detalhe coloca controles de projeto antes de parte dos artefatos e ações operacionais. Busca é principalmente textual. Fontes: `components/projects/project-console.tsx:51`, `:120`, `:189`; `components/projects/project-detail-actions.tsx:113`; `app/projetos/[id]/page.tsx`.

**Proposta:** lista com atividade recente, pendências, responsável e filtro de situação; criar projeto por ação explícita. Detalhe começa com contexto e próxima tarefa, depois auditorias/volumes/arquivos. Arquivar, reativar e excluir continuam encontrados em “Configurações do projeto”, com proteção adequada.

**Aceite:** retomar projeto ativo exige menos busca visual do que criar um novo; arquivados não desaparecem sem filtro visível. **Categoria:** integridade/layout. **Esforço:** M. **Comando:** `$impeccable shape`.

### P02 — P1 · Admin confunde “não carregado” com zero ou configuração ausente

**Evidência R+C.** Sem informar o token adicional, Pessoas mostra zero/nenhum usuário, Dados aparenta listas vazias e Dinheiro/Motor mostram mensagens de ausência de banco. Em Dinheiro, `!data?.internalUsage?.enabled` inclui `data === null`. Fonte: `app/admin/dinheiro/page.tsx:550`; `app/admin/pessoas/page.tsx:417`; capturas das cinco páginas administrativas.

**Proposta:** estados distintos: “Informe a credencial para carregar”, carregando, erro de autenticação, erro de rede, vazio confirmado e configuração ausente confirmada. Métricas desconhecidas devem usar “—”, nunca zero. Preservar autorização administrativa; este é um problema de feedback, não justificativa para remover proteção.

**Aceite:** antes da carga, interface não afirma que não há usuários/consumo/banco; dados antigos exibem horário e estado de atualização; erro permite nova tentativa. **Categoria:** integridade. **Esforço:** M. **Comando:** `$impeccable harden`.

## 7. Desenho dos fluxos recomendados

### Montagem

```text
Projeto / Independente · nome da montagem · salvo há pouco · Desfazer / Refazer
Arquivos | Montagem | Conferência                         Prévia · Exportar

Arquivos disponíveis       Volume ativo > Grupo ativo       Resumo do volume
Buscar / tipo / arquivo    Capa                              Total de páginas
Selecionar páginas        Separatriz                         Pendências (3)
Adicionar ao destino…     LD                                 Conferência: pendente
                          Documentos [ordem explícita]        Ir para pendência
                          Anexos
```

Os metadados ficam em “Dados do volume”, com resumo sempre visível. Em notebook, um painel auxiliar por vez; em celular, as mesmas áreas como etapas. “Exportar” exibe exatamente o que será incluído, a ordem final e o estado de validação. A montagem assistida por IA deve desembocar no mesmo modelo editável, preservando operações manuais.

### Revisão de achados

```text
Projeto > Auditoria · situação · atualizado em…       Foco na revisão · Chat
Buscar achado… | Impacto | Situação | Responsável | Disciplina | Limpar

Fila de achados               Detalhe / documento
Ref · título · impacto       Ref 014 · validade · tratamento
Documento/página             O que foi encontrado
Responsável · situação       Evidência [arquivo · revisão · página]
                             Ação recomendada
                             Evidência | Conversa (2) | Histórico
                             Confirmar achado · Atribuir · Registrar tratamento
```

Isso é uma proposta funcional, não um mockup aprovado nem uma exigência de implementar três colunas fixas. A largura disponível decide entre painel, aba ou sequência. O chat continua acessível e conserva contexto.

## 8. Regra para nenhuma função ficar escondida

O objetivo não é mostrar todos os botões simultaneamente. É garantir **um caminho nomeado, previsível e testável** para cada capacidade.

1. Cada função autorizada possui entrada na navegação, barra contextual, menu nomeado ou busca de ações. Hover e atalho podem acelerar, mas não ser a única entrada.
2. Cada ação condicionada indica o que falta: selecionar páginas, abrir auditoria, ter permissão ou conectar arquivo. Não expor ações administrativas a quem não tem acesso.
3. “Avançado”, “Mais ações” e abas informam seu conteúdo e, quando útil, quantidade. Não esconder operações frequentes em menus genéricos.
4. Projeto, conversa, auditoria, arquivo e revisão formam contexto visível. Links conservam esse contexto após login, F5 e compartilhamento.
5. Uma lista de ações compartilhada alimenta navegação, busca, ajuda e testes de descoberta; ações destrutivas têm tratamento próprio.
6. Capacidades só presentes no modelo/código são marcadas **não expostas**. Não prometer que existem na interface até completar seu percurso.

O [inventário](inventario-funcional-ux-ui-2026-09-27.md) é a base para esse contrato. Inclui funções existentes que devem ser preservadas durante o redesenho.

## 9. O que já funciona e deve ser preservado

- Identidade técnica reconhecível: IBM Plex, paleta escura, verde-água, sinais de estado e chanfros. Evitar substituir por painel genérico.
- Chat como eixo de interação, com progresso, cancelamento, histórico e contexto documental.
- Persistência/recuperação do Nexo, distinção local/servidor, proteção de trabalho em outras abas e informações de sessão. A falha V02 é da montagem manual.
- Editor de folhas com abertura/correção, navegação por teclado, ajustes manuais, restauração e agrupamento em tomos.
- Plano de geração com revisão prévia, opções de artefato e tratamento de geração parcial/desatualizada.
- Filtros técnicos, tratamento em lote, responsáveis, comentários e decisões dos achados: o redesenho deve reorganizar, não apagar essas capacidades.
- Visor de PDF com navegação de página, zoom e marcações; splitter acessível por teclado.
- Separação entre veredito, sugestões e pendências do motor. Essas áreas existem e não devem ser descritas como funcionalidades ausentes.
- Cuidados com animação/canvas, como limite de DPR e comportamento reduzido em certos contextos. Não foi observado motivo para condenar todo efeito visual.
- Compatibilidade de várias rotas antigas do admin, inclusive preservação de query em `/admin/audits`. Reaproveitar essa disciplina nos links de projeto.

## 10. Ordem recomendada de execução

| Lote | Entrega verificável | Achados principais | Dependências |
|---|---|---|---|
| 1 · Parar perdas e percursos quebrados | Rascunho recuperável; prontidão correta; links e erros de abertura funcionam; fontes PDF consistentes; admin não inventa zero | V01, V02, V06, G03, G04, A01–A03, P02 | Contratos de contexto, versão e identidade de fonte |
| 2 · Tornar a montagem controlável | Destino explícito; teclado; desfazer; área útil de trabalho; importação compreensível | V03–V05, V08–V10, G09 | Manifesto persistido e histórico de operações |
| 3 · Organizar a revisão | Fila filtrável; detalhe com evidência; estados claros; atribuição; prévia e navegação entre achados | G05, V07, A04–A10 | Fonte documental correta e estados operacionais definidos |
| 4 · Fechar descoberta e adaptação | Navegação estável; busca de ações; ajuda contextual; projetos; leitura móvel; tipografia | G01, G02, G06–G08, P01 | Inventário reconciliado com interface final |

**P = pequeno, M = médio, G = grande**, estimativas relativas de implementação/revisão, não promessa de prazo. P1 deve orientar a seleção dentro dos lotes; mudanças independentes de baixo esforço podem avançar juntas. Não esperar um redesenho completo para corrigir 404 ou estado enganoso.

### Ferramentas sugeridas para a implementação posterior

1. `$impeccable harden`: estados, navegação, recuperação, acessibilidade e identidade de fonte.
2. `$impeccable shape`: arquitetura de informação e fluxo da montagem/revisão.
3. `$impeccable layout` e `$impeccable adapt`: área útil em notebook e leitura em telas pequenas.
4. `$impeccable clarify`: termos, validade/tratamento e ações de atribuição.
5. `$impeccable optimize`: carregamento das conversas e medição com grandes pareceres.
6. `$impeccable typeset`: escala tipográfica e hierarquia visual.
7. `$impeccable audit`: repetir a avaliação sobre os percursos corrigidos.
8. `$impeccable polish`: acabamento final, depois dos critérios funcionais aprovados.

Essas etapas podem ser executadas individualmente ou agrupadas. A presente entrega é o diagnóstico e o plano verificável; os critérios de aceite e o roteiro de evidências devem acompanhar a implementação.
