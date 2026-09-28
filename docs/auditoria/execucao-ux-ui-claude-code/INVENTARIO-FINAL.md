# Inventário final — reconciliação com o inventário de 27/09

**Reconciliado em 28/09/2026**, linha a linha, contra [`inventario-funcional-ux-ui-2026-09-27.md`](../inventario-funcional-ux-ui-2026-09-27.md). Para cada capacidade: o caminho **agora**, a descoberta **agora** (mesma legenda do inventário), e a evidência. "Preservado" = caminho e comportamento mantidos sem alteração nesta execução (não retestado além do que a linha diz). Nenhuma capacidade foi removida; as trocas de caminho estão marcadas como **Movido**.

Legenda de evidência: `prova-*` = prova Playwright em `scripts/prova-ux/`; `test:*` = teste puro em `package.json`; "código" = verificado por leitura/typecheck, sem prova de navegador.

## 1. Rotas

| Rota | Agora | Evidência |
|---|---|---|
| `/` | Painel + **navegação principal** na barra (≥ 1280 px) e no menu da conta | prova-descoberta |
| `/nexo` | Idem, com navegação em texto na barra lateral, "Buscar ações", "Foco na revisão" | prova-descoberta, prova-achados |
| `/volumes` | "Montar volumes com PDFs existentes" — mesa nova | prova-mesa, prova-mesa-larguras |
| `/projetos`, `/projetos/[id]` | Lista primeiro, filtros de situação, "Novo projeto" como ação; detalhe com Configurações ao fim | prova-descoberta |
| `/ferramentas` | **Movido**: redireciona para `/volumes` (a montagem manual não é legado) | prova-descoberta |
| `/achados` | **Novo**: achados com você e atribuídos por você, abrindo o parecer | prova-descoberta |
| `/ajuda` | **Novo**: destinos, "Onde fica" (mesmo catálogo da paleta) e glossário com âncoras | prova-descoberta |
| `/ld`, `/capas` | **Novos** (eram 404): redirecionam a `/nexo?projeto=&intencao=ld|capa` | prova-g03 |
| `/audit` | Redireciona com `intencao=auditar` e o projeto validado no servidor | prova-g03 |
| `/login` | Formulário em coluna abaixo de 1024 px (não bloqueia celular) | prova-mesa-larguras (390), captura |
| `/admin/*` | Estados de carga sem zero inventado | prova-p02 |
| Demais (`/sem-acesso`, compatibilidade admin, apresentação, bancadas) | Preservado | — |

## 2. Navegação, entrada e continuidade

| Capacidade | Caminho agora | Descoberta agora | Evidência |
|---|---|---|---|
| Entrar e retomar destino após login | Contexto lido no servidor; guardas no quadro executado | Direta | prova-g03, prova-a01-a03 |
| Entender erro de login | Preservado | Direta | — |
| Entender ausência de acesso | Preservado | Contextual | — |
| Ver painel e atividade | "Painel" na navegação | Direta | prova-descoberta |
| Retomar projeto/conversa | Home, Nexo, e "Retomar" em Projetos | Direta | prova-descoberta |
| Abrir achado recebido | Home e `/achados` → parecer; link com `achado=` abre o detalhe do achado | Direta | prova-a01-a03, prova-achados |
| Acessar montagem manual | **Movido**: "Montar volumes" na navegação (barra, Nexo, cabeçalhos, menu da conta) | Direta | prova-descoberta |
| Acessar projetos | "Projetos" na navegação | Direta | prova-descoberta |
| Ver identidade e sair | Conta (preservado) | Contextual | — |
| Buscar ações | Botão "Buscar ações · Ctrl+K" na barra do Nexo + Ctrl+K (mesma paleta) | Direta | prova-descoberta, test:paleta |
| Começar montagem assistida / auditoria / conferir | Partidas (preservado) + paleta | Direta | test:partidas |
| Nova conversa | **Renomeado** "Nova conversa" (era "Novo projeto") | Direta | prova-descoberta |
| Buscar conversas | Busca da barra lateral (preservado; distinta de "Buscar ações") | Direta | — |
| Organizar/retomar conversas por projeto | Preservado; nome do projeto no lugar do id cru | Contextual | prova-g03 |
| Rever orientação inicial | "Como funciona o Nexo" em texto + `/ajuda` | Direta | prova-descoberta |
| Redimensionar painéis | Splitter preservado + **"Foco na revisão"/"Ocultar projetos"/"Ocultar chat"** com preferência restaurada | Direta | prova-achados (G05) |
| Recuperar estado do Nexo / aba travada | Preservado | Contextual | — |
| Operar em celular | Ver G06 na matriz (etapa 6) | — | — |

## 3. Nexo: documentos, conferência e geração assistida

Nenhuma linha desta seção teve caminho alterado (anexar, pasta, composer, progresso, parar, chips, canvas, teclado do canvas, abrir/corrigir folha, editor, adicionar/remover folhas, blocos, prefeitura/modelo, frame, gerar capa/LD/separatriz, volume das pranchas, campos faltantes, baixar artefatos, regenerar, geração parcial, uso do agente, diagnóstico). **Preservado.** Acréscimos de descoberta: "Gerar a capa", "Gerar a lista de documentos (LD)", "Separatriz" e "Corrigir o carimbo" agora aparecem na busca de ações com o pré-requisito dito na linha (test:paleta), e LD/capa têm entrada por link (`intencao=ld|capa`, prova-g03).

## 4. Mesa de montagem manual

| Capacidade | Caminho agora | Descoberta agora | Evidência |
|---|---|---|---|
| Montar sem projeto | "Independente" no seletor Projeto | Direta | prova-mesa |
| Vincular projeto durante a montagem | Seletor "Projeto" na barra da mesa (move o rascunho com os arquivos) | Direta | prova-mesa (V10) |
| Editar metadados | "Dados do volume" recolhível | Direta | prova-mesa |
| Importar PDFs | Área Arquivos, fila por arquivo com motivo | Direta | prova-mesa (T09) |
| Escolher tipo antes / corrigir depois | Tipo na entrada + seletor por arquivo | Direta | prova-mesa |
| Ver lista de arquivos importados | Área Arquivos (contagem e problemas visíveis) | Direta | prova-mesa |
| Ocultar/reabrir painel de arquivos | **Movido**: abas Arquivos/Montagem/Conferência abaixo de 1536 px; três colunas acima | Direta | prova-mesa-larguras |
| Remover arquivo importado | Botão com impacto ("usado em N lugares") + Desfazer | Direta | prova-mesa (T07) |
| Buscar/filtrar páginas | Campo "Buscar páginas…" (preservado) | Direta | código |
| Miniaturas e visor | Preservado, URLs estáveis por arquivo | Contextual | prova-mesa |
| Selecionar páginas | Caixa por página (Espaço) e "Selecionar N pág." por arquivo | Direta | prova-mesa (T06) |
| Seleção/intervalo | Preservado, frases "Página/Páginas" | Contextual | test:mesa |
| Enviar para capa/LD/documentos | Destino explícito Volume › Grupo › posição; botão diz o destino | Direta | prova-mesa (V03) |
| Arrastar páginas | Preservado como atalho | Direta | prova-mesa |
| Criar volume | Nasce rascunho, nunca "OK" | Direta | test:mesa (V01) |
| Editar nome/arquivo do volume | Campos rotulados | Direta | prova-mesa |
| Excluir volume/grupo | Botão com nome ("Remover Volume 02") + Desfazer | Direta | prova-mesa |
| Criar/editar grupo | Botões nomeados | Direta | prova-mesa |
| Separatriz automática / própria / restaurar | "Separatriz (PDF próprio)" / "Restaurar automática" | Contextual | código |
| Trocar/remover capa, LD, documento | Substituição com frase "saiu X, entrou Y" + Desfazer | Direta | test:mesa |
| Reordenar documentos | "Mover prancha N para antes/depois" | Direta | prova-mesa |
| Mover grupos/volumes | **Novo percurso**: mover para cima/baixo | Direta | prova-mesa (V08) |
| Anexos em seção própria | **Novo**: seção Anexos por grupo | Direta | prova-mesa (V08) |
| Duplicar volume/grupo | **Novo**: botões Duplicar | Direta | prova-mesa (V08) |
| Pedir sugestão de montagem | Painel de sugestão preservado, aplicado pelo histórico (desfazível) | Contextual | código |
| Conferir montagem por IA | Vinculada à assinatura da montagem | Direta | prova-mesa (T08) |
| Ver estrutura | "Estrutura planejada" (≠ prévia) | Direta | prova-mesa |
| Prévia do PDF | Por volume, no cliente, sem gravar no projeto | Direta | prova-mesa (T10) |
| Exportar PDF / ZIP / relatório | Área Conferência, liberada só sem bloqueio; "Baixar relatório (.md)" | Direta | prova-mesa (T10) |
| Salvar/retomar | **Novo**: autosave local com arquivos, recuperação e conflito entre abas | Direta | prova-mesa (V02, T04, T05) |
| Desfazer/refazer | **Novo**: barra + Ctrl+Z, 100 passos | Direta | prova-mesa (V05) |

## 5. Auditorias e achados

| Capacidade | Caminho agora | Descoberta agora | Evidência |
|---|---|---|---|
| Abrir auditoria por link | Estados próprios (404/403/rede/500) com saída | Direta | prova-a01-a03 |
| Abrir achado por link | Detalhe do achado, fila atrás de "Voltar à lista" em coluna estreita | Direta | prova-a01-a03, prova-achados |
| Resumo/veredito, arquivos, comparações, conclusão | Preservado | Direta | — |
| Lista × No documento | Mesma fonte (revisão auditada) | Direta | prova-a01-a03 |
| Comparar com auditoria anterior | Preservado | Contextual | — |
| Filtrar impacto/disciplina/tipo | Preservado + `aria-pressed` | Direta | prova-achados |
| Buscar referência/texto/documento/página | **Novo**: campo de busca da fila | Direta | prova-achados (T11) |
| Filtrar situação/responsável | **Novo**: Todos/Meus pendentes/Sem responsável/Pendentes/Encerrados + Responsável | Direta | prova-achados |
| Ordenar a fila | **Novo**: impacto/página/documento/referência | Direta | prova-achados |
| Selecionar para ação coletiva | "Selecionar para atribuir" (fila e Tratamento) | Direta | prova-achados |
| Selecionar todos do filtro | "Selecionar os N filtrados/pendentes para atribuir" | Direta | prova-achados |
| Atribuir | "Atribuir N achados a [pessoa]" + frase "não manda e-mail" + resultado parcial | Direta | prova-achados |
| Limpar seleção | "Limpar" na barra (preservado) | Contextual | — |
| Notificar por e-mail | "Notificar por e-mail (N)" → confirmação com nomes | Direta | prova-achados (T12) |
| Informar correção / reverter | "Informar correção" no eixo Tratamento (era "Marcar corrigido") | Direta | prova-achados |
| Registrar decisão técnica | "Registrar decisão técnica" + motivo; Histórico mostra autor e motivo | Direta | prova-achados |
| Confirmar / falso positivo / gravidade errada | Eixo "Validade", ao lado do Tratamento | Direta | prova-achados |
| Ler evidência/conflito/ação | Aba Evidência, primeira do detalhe | Direta | prova-achados |
| Abrir página no PDF | "Ver no documento" pela revisão auditada | Direta | prova-a01-a03 |
| Páginas, zoom, posição | Preservado | Direta | prova-achados |
| Marcações no documento | Preservado | Contextual | — |
| Anterior/próximo achado | **Novo**: no detalhe e no visor ("Achado N de M"), zoom e filtro preservados | Direta | prova-achados (A10) |
| Referência do motor novo | Resolvedor ligado ao catálogo | Contextual | prova-a01-a03 |
| Ler/publicar comentários | Aba "Conversa (n)" carregada ao abrir, relida ao voltar à janela, rascunho por achado | Direta | prova-achados (T12) |
| Envolvidos | Erro HTTP visível; sucesso dito | Contextual | prova-achados |
| Exportar cartão | "Mais ações" › "Exportar cartão do achado (PNG)" (o arquivo é PNG) | Contextual | prova-achados |
| Copiar conteúdos | "Mais ações" / Exportar (preservado) | Contextual | — |
| Copiar link do achado | "Mais ações" › "Copiar link do achado" | Contextual | prova-a01-a03 |
| Sugestões / pendências do motor | Seções próprias (preservado) | Contextual | — |
| Achados de todas as auditorias | **Novo**: `/achados` | Direta | prova-descoberta |

## 6. Projetos, administração e áreas internas

| Capacidade | Caminho agora | Descoberta agora | Evidência |
|---|---|---|---|
| Criar projeto | Botão "Novo projeto" em Projetos abre o cadastro | Direta | prova-descoberta |
| Buscar/abrir projeto | Busca (código, nome, cliente, observação) + Ativos/Arquivados/Todos com contagem + ordem; "Retomar" | Direta | prova-descoberta |
| Editar dados / arquivar / reativar / excluir | "Configurações do projeto", no fim do detalhe; aviso no topo quando arquivado; confirmação de exclusão preservada | Direta | prova-descoberta |
| Abrir auditorias/artefatos do projeto | Preservado, depois da próxima ação | Contextual | — |
| Pendências por projeto | **Novo**: "N achados abertos · M com você" no cartão | Direta | código (consulta única) |
| Iniciar auditoria/LD/capas do projeto | Corrigidos (G03) | Direta | prova-g03 |
| Abrir volumes do projeto | Só com projeto validado no servidor | Contextual | prova-mesa |
| Centro administrativo | "Administração" por permissão (Nexo, cabeçalhos, conta) | Restrita | prova-descoberta |
| Token e estados de carga admin | Um estado por tela, com horário e "Tentar de novo" | Restrita | prova-p02 |
| Custos, cotação, motor, vazão, pessoas, dados, expurgo, favoritos antigos | Preservado (só estados de carga e rótulos) | Restrita | prova-p02 |
| Apresentação, bancadas | Preservado, fora da navegação | Restrita | — |

## 7. Contrato de descoberta

O registro único pedido no §7 do inventário ficou em três fontes que se referenciam: `lib/navegacao-principal.ts` (destinos), `modules/nexo/lib/paleta.ts` (ações, sinônimos e pré-requisito) e `app/ajuda/page.tsx` (que lê as duas). `test:paleta` garante que termos do trabalho (anexo, capa, LD, separatriz, exportar, reordenar, corrigir, atribuir, copiar link) acham a função ou dizem onde ela fica, e que nada destrutivo entra na paleta.
