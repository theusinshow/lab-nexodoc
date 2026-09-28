# Progresso da implementação UX/UI

**Pacote:** [README.md](README.md). **Preparação:** 28/09/2026. **Execução iniciada:** 28/09/2026 (Claude Code, Opus 5.5).

Este arquivo pertence à auditoria UX/UI. Não substitui o progresso do motor em `../execucao-claude-code/`. Os IDs abaixo correspondem ao [relatório UX/UI](../auditoria-ux-ui-2026-09-27.md).

## 1. Próxima ação exata

Execução concluída em 28/09/2026 — ver [`RELATORIO-DE-EXECUCAO.md`](RELATORIO-DE-EXECUCAO.md). Nada commitado. Pendências de manutenção (fora dos 31 itens) na §6 do relatório.

## 2. Regras de atualização

- Atualizar esta seção de retomada e as linhas afetadas ao concluir uma fatia de trabalho.
- `Pendente`: não implementado/verificado nesta execução.
- `Em execução`: alteração ativa, ainda sem todos os critérios.
- `Implementado, não verificado`: código conectado, mas falta prova necessária; não conta como concluído.
- `Verificado`: critérios atendidos no caminho integrado, com evidência referenciada.
- `Já atendido, verificado`: estava resolvido antes; indicar evidência atual, sem atribuir alteração inexistente.
- `Bloqueado`: dependência externa concreta, impacto e próximo passo registrados; continuar o restante independente.
- Não usar `Não aplicável` para descartar requisito autorizado. Mudança de escopo precisa de motivo factual e decisão explícita do usuário quando retirar entrega.
- Uma linha pode ter subitens; não marcar o ID inteiro como verificado enquanto faltar qualquer critério obrigatório.
- Registrar testes executados como fatos. Comandos apenas recomendados ficam em lista separada.

## 3. Estado do checkout e ambiente

| Campo | Registro |
|---|---|
| Data/hora da execução | 28/09/2026, início da sessão |
| Branch e commit de partida | `main` @ `b18a14d` |
| Alterações preexistentes preservadas | `CHANGELOG.md` (2 linhas do pacote UX), docs não rastreados em `docs/auditoria/` (auditoria UX, inventário, evidências, pacote do motor, releases). Nenhum foi revertido. |
| Instruções locais aplicáveis | `.codex/instructions.md` (changelog, docs, preservar chat); memórias do Matheus (sem subagents; `prettier --write` proibido em arquivo sujo; `npm run lint` tem 5 erros preexistentes em `largura-do-copiloto.ts`; heredoc > 8 KB trunca) |
| Node e gerenciador de pacotes | Node v24.15.0, npm 11.12.1 (`engines: >=24`) |
| Servidor reutilizado/iniciado | Iniciado: `node scripts/prova-ux/sobe-dev.mjs` → `next dev` em 127.0.0.1:3200, pasta `.next-ux` (acrescentada a `.git/info/exclude`). O Next reescreveu `tsconfig.json` ao subir (inclui `.next-ux/*`) — **restaurar com `git checkout tsconfig.json` ao encerrar**. |
| Contexto de dados de teste | Banco da bateria `nexodoc_teste` (Neon, `DATABASE_URL_BATERIA`), IA simulada (`NEXODOC_IA_SIMULADA=1`, `OPENAI_API_KEY=sk-simulada`), `RESEND_API_KEY` vazio, `NEXODOC_ADMIN_TOKEN=ux-token-teste`. Seed: `scripts/prova-ux/seed-ux.mjs` (upsert de `ux@nexodoc.local` ADMIN e 3 projetos). PDFs sintéticos por pdf-lib em `scripts/prova-ux/fixtures.mjs`. Nenhum dado real tocado. |
| Falhas conhecidas no baseline | `.env.local` tem `NEXODOC_MOCK_MODE=false` e aponta para `nexodoc_dev` — por isso o servidor isolado. `npm run lint` com 5 erros preexistentes (memória; confirmar no fechamento). |

## 4. Matriz dos 31 itens

| ID | Prioridade | Etapa principal | Entrega resumida | Estado | Evidência / arquivos / pendência |
|---|---|---:|---|---|---|
| G01 | P1 | 5 | Navegação por tarefas e acesso às funções centrais | Verificado | `lib/navegacao-principal.ts` + `components/layout/navegacao-principal.tsx`: Painel · Projetos · Montar volumes · Achados · Ajuda (+ Administração por permissão) na barra da home (≥ 1280 px, sem invadir o orbe — medido), no menu da conta (abaixo disso: 2 ações), na barra lateral do Nexo (texto, no lugar dos ícones) e no `PageHeader` de Projetos/Volumes/Achados/Ajuda. Novas `/achados` (pendências com você + atribuídos por você, `enviadosPor`) e `/ajuda`; `/ferramentas` → `/volumes`. Prova `prova-descoberta.mjs` (1280/1920/390/1440). Capturas `g01-*`. |
| G02 | P2 | 5 | Busca de ações visível e catálogo encontrável | Verificado | Botão "Buscar ações · Ctrl+K" na barra do Nexo abre a MESMA paleta (evento `nexo:abrir-paleta`); catálogo com grupo "Onde fica" (anexo, separatriz, exportar volume/parecer, reordenar, corrigir carimbo, atribuir, copiar link) + LD/capa, cada um com pré-requisito na linha; nada destrutivo. `test:paleta` 11/11; prova: "anexo" e "separatriz". Captura `g02-paleta-anexo-1440`. |
| G03 | P1 | 1 | Rotas LD/Capas e contexto de projeto | Verificado | `prova-g03.mjs` 31/31: 4 ações do detalhe → destino correto (sem 404); `/ld`,`/capas`,`/audit?project=` → 307 canônico; sem sessão → login → Nexo com projeto B + intenção; F5 mantém B; link B não restaura A; conflito vira aviso sem trocar vínculo; projeto inexistente → aviso. Capturas `g03-*`. Arquivos: `lib/contexto-da-url.ts`, `app/ld`, `app/capas`, `app/audit`, `app/nexo/page.tsx`, `NexoWorkspace.tsx`, `BarraDoNexo.tsx`, `partidas.ts`, `ultima-conversa.ts`, `app/projetos/[id]/page.tsx`. |
| G04 | P2 | 1 | Link específico do achado e cópia | Verificado | Home usa `linkDoAchado` com `findingId` (de `targetKey`); `prova-a01-a03.mjs`: INC-002 e INC-005 da mesma auditoria focam exatamente o pedido e rolam até ele; INC-999 → aviso "não está neste parecer". "Copiar link do achado" no menu do achado (pop de confirmação/erro). Captura `g04-achado-especifico-1440`. |
| G05 | P1 | 4 | Espaço útil de revisão e recolhimento de painéis | Verificado | `modules/nexo/lib/areas-recolhidas.ts` (preferência em localStorage, useSyncExternalStore) + `NexoShell` (`data-projetos-recolhidos`/`data-chat-recolhido`) + `globals.css` (colunas reescritas) + grupo "Espaço da revisão" no palco: "Foco na revisão"/"Sair do foco", "Ocultar/Mostrar projetos", "Ocultar/Mostrar chat". Recolher não desmonta: rascunho do chat sobrevive. Prova: 1280×800 palco 368 → 1229 px; fila e detalhe lado a lado; F5 restaura; "Mostrar chat" devolve o chat com o rascunho. Captura `g05-foco-na-revisao-1280`. |
| G06 | P1 | 6 | Leitura e tratamento de achados em tela pequena | Verificado | Parecer aberto por link (`aberturaPorLink.pedida`) liga `data-leitura` no `NexoShell`: abaixo de 1024 px o palco volta em coluna única com a nota "Nesta tela dá para ler e tratar achados…"; sem parecer, o recado de tela maior continua (montar/gerar). Fila/detalhe já responsivos (A07); controles do espaço somem abaixo de 1024. Login e Projetos também sem portão. Prova `prova-leitura-estreita.mjs`: 390×844 e 640×400@2x — ler, abrir o PDF, Confirmar achado, Conversa, Voltar à lista, sem rolagem horizontal. Capturas `g06-*`. |
| G07 | P2 | 5 | Vocabulário e instruções consistentes | Verificado | "Nova conversa" (era "Novo projeto" no Nexo; "Novo projeto" ficou só em Projetos, onde cria projeto); voltar "Painel" (era "Painel de módulos"); glossário em `/ajuda` (Projeto → Conversas/Auditorias → Volumes → Grupos → Documentos/Páginas, Capa, LD, Separatriz, Prévia, Validade, Tratamento); mesa sem COVER/DOCUMENT; achados com nomes por efeito (A05/A06). Jornada `c7` da bateria atualizada para o nome novo. |
| G08 | P2 | 6 | Hierarquia e escala tipográfica | Verificado | Escala já declarada no DESIGN.md §3; acrescentada a **Regra do texto de decisão** (decidir/agir em Body/Caption; 11 px só para metadado; nada abaixo). Varridos para o piso de 11 px: `audit-result.tsx`, bandeja e fila da mesa, painel de sugestão, paleta, palco, barra lateral, barra do topo, linha da conversa (26 ocorrências de 9–10,5 px). Cartões aninhados do achado viraram fila + detalhe (A07). Contraste: axe sem violações nas telas varridas (ver limite em §6). |
| G09 | P1 | 6 | Nomes, labels, estados, foco e teclado | Verificado | `prova-a11y.mjs` (axe-core: button-name, link-name, label, select-name, aria-*, nested-interactive, color-contrast) em `/`, `/projetos`, `/achados`, `/ajuda`, `/volumes` montada, parecer (fila+detalhe e aba Conversa): 0 violações após corrigir o campo de arquivo sem rótulo da mesa (`file-dropzone.tsx`). Teclado: Enter na fila abre o achado; setas entre abas **a partir da aba focada** (defeito achado e corrigido); foco visível. Filtros com `aria-pressed`; ícones nomeados na mesa (etapa 3). |
| V01 | P1 | 2 | Prontidão estrutural verdadeira | Verificado | `prontidaoDoVolume/Montagem` (mesa.ts): volume novo é rascunho/incompleto, nunca OK; bloqueios (sem grupo, grupo sem pranchas, página inexistente, arquivo sem bytes, nome vazio/repetido/inválido) e avisos (sem capa/LD — não impostos) com destino clicável ("ir para"); exportar só sem bloqueio. `test:mesa` + `prova-mesa.mjs` (V01 ×5). Status enviado ao servidor/relatório vem da prontidão (`envio.ts`). |
| V02 | P1 | 2 | Autosave e recuperação com arquivos | Verificado | `mesa-persistencia.ts` (IndexedDB próprio `nexodoc-mesa`, manifesto + Blobs, escopo e-mail+projeto, compare-and-set por revisão) + `use-mesa.ts` (autosave 700 ms, "salvo neste dispositivo às HH:MM", falha com motivo e "Tentar salvar de novo", sem laço de reenvio). Prova: 2 volumes/2 grupos, títulos e nomes → F5 idêntico, bytes presentes; quota cheia (T05) → "não salvo" com motivo, memória preservada, retry salva; duas abas (T04) → aba velha entra em conflito e não sobrescreve. Capturas `v-mesa-recuperada-apos-f5`, `v-mesa-falha-de-gravacao`. |
| V03 | P1 | 3 | Destino explícito e alternativa ao arraste | Verificado | `destino.tsx` (Volume › Grupo › posição; botões "Adicionar N páginas como X em Volume 02 › Grupo 2" dizem o destino antes); caixas de seleção por página (Espaço), "Selecionar N pág." por arquivo; lugares vazios com "Colocar aqui"; soltar sobre item insere antes (nunca apaga). T06 por teclado: só V02›G2 recebeu. Capa/LD/separatriz substituem com frase "saiu X, entrou Y" e Desfazer. |
| V04 | P1 | 3 | Área de montagem responsiva e utilizável | Verificado | Dados do volume em resumo recolhível; áreas Arquivos/Montagem/Conferência (3 colunas ≥1536, 2+aba ≥1024, abas com rolagem natural abaixo). `prova-mesa-larguras.mjs`: 1920/1440/1280/390 e 640×400@2x (zoom 200%) — nenhuma área com altura zero, importar/montar/conferir/exportar alcançáveis, sem rolagem horizontal. Capturas `v04-mesa-*`. |
| V05 | P1 | 2 | Impacto, desfazer e refazer | Verificado | Histórico de snapshots (100 passos, digitação agrupada), Desfazer/Refazer na barra (com o nome da operação, Ctrl+Z/Ctrl+Shift+Z fora de campos) e no aviso; remover arquivo mostra impacto antes ("Usado em 5 lugares: 4 grupos de 2 volumes") e o desfazer restaura referências e bytes (bytes só são soltos quando nada no histórico os referencia). T07 na prova. |
| V06 | P1 | 2 | Conferência vinculada à versão | Verificado | `assinaturaDaMontagem` (FNV-1a sobre ordem/páginas/arquivos/nomes/metadados); conferência guarda a assinatura DO PEDIDO; situação nunca/válida/desatualizada na conferência e na exportação. T08: resposta atrasada da versão 1 chegou após edição → "desatualizada"; edição após conferir invalida. `/api/volume/analyze` interceptado (sem IA). |
| V07 | P2 | 3 | Prévia de cada volume do pacote | Verificado | `previa-do-volume.tsx`: PDF montado no cliente pelo MESMO `buildRowPdf` (sem gravar no projeto — a prévia antiga chamava `/build`, que persistia artefatos), seletor de volume, página a página + sequência. T10: prévia do volume 2 de 3 = 5 págs; ZIP real do `/api/volume/build` tem 3 PDFs com a mesma sequência página a página (texto extraído por pdf.js). Foco volta a quem abriu. |
| V08 | P2 | 3 | Anexos, duplicação e ordem de volumes/grupos | Verificado | Seção Anexos própria por grupo; duplicar volume/grupo (ids e seleções clonadas; cópia do volume nasce sem nome final); mover volume/grupo para cima/baixo e prancha para antes/depois/outro grupo, todos com nome acessível. Prova: editar a cópia não altera o original. |
| V09 | P2 | 3 | Importação com feedback e reclassificação | Verificado | Fila por arquivo (lendo/importado/não importado/duplicado/recusado) com motivo junto do nome; `onDropRejected` (ODT com instrução), sha-256 para duplicado, PDF ilegível não entra; tipo trocável por arquivo sem mover o que está montado. T09 na prova. |
| V10 | P2 | 2 | Vincular projeto sem sair da montagem | Verificado | Seletor "Projeto" na barra da mesa (Independente / projetos da organização); `moverRascunho` muda o escopo com bytes, grava já no escopo novo e atualiza a URL; aviso diz a garantia (salvo só neste dispositivo; exportar registra no projeto). Prova: F5 no projeto = mesma montagem e bytes; escopo independente ficou vazio (movido, não copiado). A rota `/volumes` só aceita projeto validado (antes o id cru ia até a exportação). |
| A01 | P1 | 1 | Erro/carregamento de link fora do palco | Verificado | Pedido por link inicia o shell (o palco mostra carregando/falha antes do sucesso); falha classificada (`nao-encontrada`, `sem-acesso`, `sem-sessao`, `rodando`, `temporaria`, `falhou`, `rede`) com saída (Tentar de novo / Entrar / Voltar ao painel). `prova-a01-a03.mjs`: 404, 403, rede, 500→retry→sucesso. Captura `a01-404-1440`. Arquivos: `use-abrir-auditoria-por-link.ts`, `PalcoDoNexo.tsx`, `lib/audit.ts` (`instavel`). |
| A02 | P1 | 1 | Fonte comum entre mapa e visor PDF | Verificado | Catálogo único (`catalogoDoParecer`) alimenta visor, cartões e mapa; sem blob local, "No documento" renderizou 6 miniaturas do PDF do servidor. Captura `a02-mapa-pdf-servidor-1440`. |
| A03 | P1 | 1 | Fonte/revisão do motor novo integrada | Verificado | `motorFonte` agora vem do mesmo catálogo (revisão por hash; nome só sem hash, único); prova: referência com revisão guardada abre `ux_memorial.pdf p.3 · revisão auditada` e mostra o texto da página 3; revisão não guardada fica "Arquivo não disponível" sem abrir outro; achado legado do orçamento abre o orçamento p.2 (antes cairia no único PDF). `test:fonte-da-evidencia` 14/14. Captura `a03-motor-abre-revisao-1440`. |
| A04 | P2 | 4 | Busca, filtros operacionais e ordenação | Verificado | `audit-result.tsx`: busca (referência, texto, documento, local, página; sem acento/caixa), Situação (Todos/Meus pendentes/Sem responsável/Pendentes/Encerrados, com contagens e `aria-pressed`), Responsável, Ordem (impacto/página/documento/referência), "Mostrando N de M", "Limpar filtros" único; seleção em lote rotulada "Selecionar os N filtrados/pendentes para atribuir". Prova T11 (`prova-achados.mjs`). |
| A05 | P2 | 4 | Validade separada de tratamento | Verificado | Detalhe com dois eixos lado a lado: **Validade** (Confirmar achado / Falso positivo / Gravidade errada) e **Tratamento** (situação em frase + Informar correção / Selecionar para atribuir / Registrar decisão técnica com motivo / Mais ações). Aba Histórico com atribuição, aviso, encerramento com autor e motivo (veredito diz que o autor não é registrado). Prova: confirmar grava só `verdict` e o tratamento continua "Pendente". |
| A06 | P2 | 4 | Selecionar, atribuir, comentar e notificar claros | Verificado | "Selecionar para atribuir" (card/fila), barra "N achados selecionados" + "Atribuir N achados a [pessoa]" + frase "Atribuir não manda e-mail"; resultado diz "ninguém recebeu e-mail ainda" e falha parcial "X de Y atribuídos"; "Publicar comentário"; cabeçalho "Notificar por e-mail (N)" → confirmação "Notificar N pessoas por e-mail". Prova: lote = exatamente os filtrados, zero POST de aviso até confirmar. |
| A07 | P2 | 4 | Fila e detalhe priorizando evidência | Verificado | Fila compacta (`data-item-da-fila`: ref, impacto, página, título, situação, nº de comentários) + detalhe do escolhido (cartão antigo reaproveitado) com abas Evidência (padrão) / Conversa (n) / Histórico. `@container`: lado a lado ≥ 52rem; abaixo, sequência com "Voltar à lista" e Anterior/Próximo ("Achado N de M"). Link com `achado=` abre direto no detalhe. Capturas `a07-achados-1280-sequencia`, `g05-foco-na-revisao-1280`. |
| A08 | P2 | 4 | Conversas: carga, atualização, erros e rascunho | Verificado | GET de feedback devolve `comentarios` (contagem filtrada por `kind=comentario`); a conversa monta só na aba; relê em `focus`/`visibilitychange` e por "Atualizar" com horário; POST/DELETE conferem `response.ok` com motivo e HTTP; rascunho por achado mora no pai. Prova T12: 0 GET só por abrir a fila; comentário de "outra sessão" aparece ao voltar à janela; 500 mantém o texto; troca de achado mantém rascunho; 403 em envolvido não parece sucesso. Limite: "outra sessão" é simulada por rota interceptada. |
| A09 | P2 | 4 | Exportação de cartão nomeada corretamente | Verificado | Item "Exportar cartão do achado (PNG)" no menu "Mais ações" (antes ícone sem texto); a imagem diz "texto do parecer, não captura do documento"; falha vira aviso. Prova: download `nexodoc-achado-INC-006.png`. |
| A10 | P2 | 4 | Anterior/próximo achado e contexto documental | Verificado | Visor: faixa "Achado N de M · INC-xxx" com "Achado anterior"/"Próximo achado" sobre a fila FILTRADA com documento; o detalhe acompanha; zoom e filtro preservados; arquivo, página e critério (revisão auditada/nome) no cabeçalho (A03). Captura `a10-visor-em-sequencia-1280`. |
| P01 | P2 | 5 | Projetos orientados a retomada | Verificado | `project-console.tsx`: lista primeiro; busca inclui observação; Ativos/Arquivados/Todos com contagem (`aria-pressed`); ordem "com você e mais recentes"/"por código"; "Novo projeto" abre o cadastro; cartão com "N achados abertos · M com você" e "Retomar". Detalhe: aviso de arquivado no topo, "Configurações do projeto" (editar/arquivar/reativar/excluir, confirmação preservada) no fim. Sem portão de tela larga (390 sem rolagem horizontal). Prova `prova-descoberta.mjs`. |
| P02 | P1 | 1 | Estados administrativos confiáveis | Verificado | `lib/estado-da-carga.ts` + `components/admin/aviso-da-carga.tsx` aplicados a Visão geral, Dinheiro, Motor (config, qualidade), Pessoas, Dados (expurgo, auditorias, LDs), Controles e Cotação. `prova-p02.mjs` 26/26: sem token nas 5 telas → "nada consultado", sem zero/"sem DATABASE_URL"/"nenhum"; token errado → negado; 500 com motivo + tentar de novo; rede com dados antigos + horário; lento → carregando; vazio válido → "Nenhuma LD". `test:estado-da-carga` 7/7. Capturas `p02-*`. |

**Contagem atual:** 31 verificados, 0 em execução, 0 pendentes.

## 5. Reconciliação do inventário

Feita linha a linha em [`INVENTARIO-FINAL.md`](INVENTARIO-FINAL.md) (28/09). Nenhuma capacidade removida; trocas de caminho marcadas como "Movido" (`/ferramentas` → `/volumes`, painel de arquivos da mesa → abas). Linhas do Nexo (§3) preservadas sem alteração de caminho. Pendente só "Operar em celular" (G06, etapa 6).

Menu contextual nomeado pode ser caminho válido. Atalho/hover/arraste exclusivo não pode ser a única entrada de função frequente. Ferramenta interna ou administrativa continua restrita por permissão.

## 6. Testes e evidências executados

| Data | IDs/casos | Comando ou procedimento real | Resultado | Evidência | Limites |
|---|---|---|---|---|---|
| 28/09 | G03/T01 | `node scripts/prova-ux/prova-g03.mjs` (Playwright, servidor 3200, banco de teste) | 31/31 ok (2 execuções) | `evidencias/g03-*.png` | 1440×1000; larguras/zoom na etapa 6 |
| 28/09 | A01, G04/T02, A02, A03/T03 | `node scripts/prova-ux/prova-a01-a03.mjs` (rotas de auditoria/arquivo interceptadas com parecer fixture + PDFs pdf-lib) | 20/20 ok, 4 execuções seguidas após trocar espera fixa por espera de conteúdo | `evidencias/a01-*`, `g04-*`, `a02-*`, `a03-*` | Parecer do motor é fixture (motor novo foi excluído em 27/09); contrato validado por `parseEngineFinding` |
| 28/09 | P02/T13 | `node scripts/prova-ux/prova-p02.mjs` | 26/26 ok | `evidencias/p02-*` | Estados de erro simulados por interceptação; sucesso contra o banco de teste real |
| 28/09 | puros | `test:contexto-da-url` (8), `test:fonte-da-evidencia` (14), `test:estado-da-carga` (7), `test:partidas`, `test:paleta`, `test:nexo:ultima`, `test:fonte-documento` (11), `test:link-achado`, `test:resolucao`, `test:atencao-painel`, `test:parecer-contrato` (81), `test:admin` | todos exit 0 | — | — |
| 28/09 | tipos | `npx tsc --noEmit -p .` (erros fora de `.next*` contados) | 0 | — | erros em `.next/dev/types` gerados, ignorados |
| 28/09 | lint parcial | `npx eslint app/admin components/admin lib/estado-da-carga.ts` | sem saída (0 problemas) | — | lint completo no fechamento |
| 28/09 | G05, A04–A10 / T11, T12 | `node scripts/prova-ux/prova-achados.mjs` (1280×800 e 1440×1000; auditoria, feedback, membros, conversa, envolvidos, atribuir e avisar interceptados — nada gravado, nenhum e-mail) | 55/55 ok (após reiniciar o dev com `.next-ux` limpo — CSS velho do Turbopack) | `evidencias/a07-*`, `g05-*`, `a06-*`, `a08-*`, `a10-*` | "Outra sessão" e falhas 403/500 simuladas; contagem de GET tolera o duplo efeito do StrictMode em dev |
| 28/09 | regressão G04/A01–A03 | `prova-a01-a03.mjs` depois da fila+detalhe | 20/20 ok | — | — |
| 28/09 | G01, G02, G07, P01 | `node scripts/prova-ux/prova-descoberta.mjs` (servidor 3200, banco de teste, só leitura) + `node scripts/test-paleta.ts` | 25/25 ok (1ª execução pegou a navegação passando sob o orbe em 1280 com "Administração" — corrigido tirando o item da barra e mantendo-o no menu da conta); paleta 11/11 | `evidencias/g01-*`, `g02-*`, `p01-*` | Banco de teste sem achados atribuídos: `/achados` provada com listas vazias; a consulta `enviadosPor` foi verificada por tipo, não com dados |
| 28/09 | G06 | `node scripts/prova-ux/prova-leitura-estreita.mjs` (rotas simuladas) | 17/17 ok | `evidencias/g06-*` | — |
| 28/09 | G09, contraste | `node scripts/prova-ux/prova-a11y.mjs` (axe-core 4.x injetado) | 11/11 ok após 2 correções (rótulo do campo de arquivo; setas das abas) | — | axe só vê `color-contrast` com fundo resolvível; o chanfro pinta fundo em `::before` (falso negativo/positivo possível) — "0 violações" não é declaração de conformidade WCAG |
| 28/09 | T14 | `node scripts/prova-ux/prova-larguras.mjs` (/, /projetos, /achados, /ajuda, /volumes × 1920/1440/1280/390/640@2x) | 30/30 ok após corrigir a home em 390 (controles da lista não quebravam linha — preexistente, 28 px de rolagem) | `evidencias/t14-*` | — |
| 28/09 | fechamento | `npm run lint`; `npx tsc -p scratchpad/ux/tsconfig.check.json`; `npm run build`; 40 `test:*` pertinentes; regressão das 10 provas UX | lint: só os 5 erros preexistentes; tsc 0; build ok (após apagar `.next/dev` gerado e corrompido de 27/09, porta 3000 livre); testes 39/40 (`test:chanfro` falha em campo do login dev, preexistente); provas 297/297 | `RELATORIO-DE-EXECUCAO.md` §3 | — |

Registrar aqui os casos T01–T14 do README, testes pertinentes existentes, lint, build, larguras e zoom. Distinguir fixture/mocks de integração com gerador real e de operação em produção.

## 7. Decisões e bloqueios

| Data | Tema | Decisão/impedimento e razão | IDs afetados | Próximo passo |
|---|---|---|---|---|
| 28/09 | Contrato de contexto | Canônico `/nexo?projeto=<id>&intencao=<auditar\|ld\|capa\|montar\|conferir>`; `project` aceito só na leitura; o servidor valida o projeto (`assertProjectAccess`) e passa `projetoPedido` + `contexto` lidos no servidor ao workspace. Destino explícito suprime a restauração da última conversa; auditoria na URL decide o próprio projeto (a query não vincula). Com o projeto aplicado, a URL passa a carregar `conversa=` para o F5 reabrir a mesma conversa; ao sair do projeto, o projeto sai da URL. | G03, A01 | — |
| 28/09 | Defeito preexistente achado | Vindo do login (redirect de server action), a montagem acontecia com `window.location` ainda em `/login` e as guardas `ref=true` eram marcadas antes do `requestAnimationFrame` cancelado pela reconexão de efeitos: `?intencao=`, `?auditoria=` e `?conversa=` se perdiam para quem chegava sem sessão. Corrigido lendo o contexto no servidor e marcando as guardas dentro do quadro executado. | G03, A01, G04 | — |
| 28/09 | Identidade da fonte | Resolvedor único `lib/fonte-da-evidencia.ts`: revisão por hash; nome só sem hash e com candidato único; hash sem arquivo = ausente. Catálogo do parecer restringe às revisões auditadas (local só substitui a URL com o mesmo hash). `auditoriaParaBuscarArquivos` passou a consultar mesmo com PDF local (GET sem custo) — teste existente atualizado com justificativa. | A02, A03 | — |
| 28/09 | Admin | Estado de carga único (sem-token/carregando/ok/erro[negado/rede/servidor/formato]); dados anteriores ficam na tela com horário; só 401/403 reabre o campo de token (antes qualquer falha reabria). | P02 | — |
| 28/09 | Fila + detalhe | O cartão inteiro virou o DETALHE do achado escolhido (um `[data-achado]` por vez); a lista virou fila `[data-item-da-fila]`. Provas antigas que contavam `[data-achado]` tiveram o seletor trocado (`prova-achados-nao-somem`, `prova-auditoria-ui`, `prova-relatorio-por-faixa`) e nomes atualizados (`prova-fila-de-achados`, `prova-validacao-do-achado`, `prova-marcacao-e-feedback`); não foram reexecutadas nesta sessão. `prova-reauditoria` (títulos em `[data-achado] h4`) e `prova-marcacao-e-feedback` (n-ésimo cartão) precisam clicar na fila antes — registrado como pendência de manutenção. | A04–A07 | reexecutar no fechamento se o ambiente delas estiver disponível |
| 28/09 | Nomes | "Marcar corrigido" → "Informar correção" (a tela não sabe se a obra foi corrigida, sabe que alguém informou); "Correto" → "Confirmar achado"; "Enviar" → "Selecionar para atribuir"/"Atribuir N a X"/"Publicar comentário"; "Avisar envolvidos" → "Notificar por e-mail (N)"; "Print do achado" → "Exportar cartão do achado (PNG)" (o arquivo é PNG, não SVG como a auditoria supôs). | A05, A06, A09 | — |

Um bloqueio precisa dizer por que fixtures/ambiente local não resolvem a validação pendente. Não bloquear tarefas independentes por falta de um teste de produção.

## 8. Registro de sessões

```text
Data: 28/09/2026 (sessão 1)
Etapa e IDs trabalhados: Etapa 1 — G03, G04, A01, A02, A03, P02 (+ G09 parcial no admin, A10 parcial no visor)
O que foi implementado e conectado: ver matriz e decisões
Arquivos alterados: app/{audit,nexo,ld,capas}/page.tsx, app/projetos/[id]/page.tsx, app/admin/{page,dinheiro/page,pessoas/page}.tsx, components/admin/{aviso-da-carga.tsx, conteudo/*}, components/audit-result.tsx, components/home/painel-do-usuario.tsx, lib/{contexto-da-url,fonte-da-evidencia,estado-da-carga,painel,fonte-do-documento}.ts, lib/audit-engine/finding-card.ts, modules/nexo/{components/{NexoWorkspace,PalcoDoNexo,BarraDoNexo,ListaDeProjetos}.tsx, components/use-abrir-auditoria-por-link.ts, lib/{audit,partidas,ultima-conversa,projeto-pedido}.ts, state/use-cartoes-de-projeto.tsx}, scripts/test-{contexto-da-url,fonte-da-evidencia,estado-da-carga,partidas,fonte-do-documento}.ts, scripts/prova-ux/*, package.json (3 scripts)
Testes/comandos executados e resultados: seção 6
Evidências de navegador: evidencias/g03-*, g04-*, a01-*, a02-*, a03-*, p02-*
Capacidades preservadas/reconciliadas: seção 5
Falhas preexistentes ou novas: defeito do login descrito em decisões (corrigido)
Pendências concretas: etapas 2–6
Próxima ação exata e arquivos relevantes: seção 1
Processos/fixtures temporários ainda ativos: next dev 3200 (tarefa de background bw5my88mr); tsconfig.json modificado pelo Next
```

```text
Data: 28/09/2026 (sessão 2, continuação)
Etapa e IDs trabalhados: Etapas 2–4 — V01–V10, G05, A04–A10 (+ G06/G07/G09 parciais)
O que foi implementado e conectado: mesa de montagem nova (mesa.ts, mesa-persistencia.ts, use-mesa.ts, components/mesa/*); fila + detalhe de achados; conversa sob demanda; áreas recolhíveis do shell
Arquivos alterados: modules/volume-builder/**, app/volumes/page.tsx, app/login/page.tsx, app/globals.css, components/audit-result.tsx, components/achado/conversa-do-achado.tsx, app/api/audits/[id]/feedback/route.ts, modules/nexo/{components/{NexoShell,PalcoDoNexo}.tsx, lib/areas-recolhidas.ts}, scripts/prova-ux/{prova-mesa,prova-mesa-larguras,prova-achados}.mjs, scripts/test-mesa.ts, 6 provas antigas (seletores)
Testes/comandos executados e resultados: seção 6
Evidências de navegador: evidencias/v-*, v04-*, a06-*, a07-*, a08-*, a10-*, g05-*
Falhas preexistentes ou novas: prévia antiga persistia artefatos (/build); GET da conversa criava linha por cartão (agora só ao abrir a aba)
Pendências concretas: etapas 5–6 e fechamento
Próxima ação exata e arquivos relevantes: seção 1
Processos/fixtures temporários ainda ativos: next dev 3200 (tarefa bsdwgtg3j); tsconfig.json modificado pelo Next
```

```text
Data: 28/09/2026 (sessão 2, fechamento)
Etapa e IDs trabalhados: Etapas 5–6 e fechamento — G01, G02, G06, G07, G08, G09, P01 + regressão
Arquivos alterados: lib/navegacao-principal.ts, components/layout/{navegacao-principal,barra-do-topo,page-header}.tsx, app/{achados,ajuda}/page.tsx, app/ferramentas/page.tsx, app/projetos/{page,[id]/page}.tsx, components/projects/{project-console,project-detail-actions}.tsx, lib/fila-de-achados.ts (enviadosPor), lib/modules.ts, modules/nexo/{components/{NexoSidebar,PaletaDeComandos,NexoShell,NexoWorkspace,PalcoDoNexo}.tsx, lib/paleta.ts}, components/home/controles-da-lista.tsx, modules/volume-builder/shared/file-dropzone.tsx, app/globals.css, DESIGN.md (regra do texto de decisão), eslint.config.mjs (.next-ux), docs/05-interface-ui.md, CHANGELOG.md, scripts/test-paleta.ts, scripts/prova-ux/{prova-descoberta,prova-leitura-estreita,prova-a11y,prova-larguras,achados-simulados}.mjs
Testes/comandos executados e resultados: seção 6
Pendências concretas: RELATORIO-DE-EXECUCAO.md §6
Processos/fixtures temporários ainda ativos: nenhum (dev da 3200 parado; tsconfig.json restaurado)
```

## 9. Fechamento

- Relatório final: [`RELATORIO-DE-EXECUCAO.md`](RELATORIO-DE-EXECUCAO.md) (matriz dos 31, resultados reais, evidências, limitações).
- Inventário final: [`INVENTARIO-FINAL.md`](INVENTARIO-FINAL.md), reconciliado linha a linha; nenhuma capacidade removida.
- Implementação completa: **sim, 31/31 verificados** — com os limites de prova declarados no relatório §5 (rotas simuladas para achados; e-mail e IA não acionados).
- Validação final: lint (só preexistentes), tipos, build, 39/40 testes puros (1 preexistente de ambiente), 297/297 verificações de navegador.
