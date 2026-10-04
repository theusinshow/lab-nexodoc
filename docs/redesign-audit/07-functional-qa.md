# 07 — QA funcional

## O que foi rodado

| Prova | Script | Resultado |
|---|---|---|
| Varredura das 122 situações (captura, inventário, console, axe) | `scripts/auditoria/captura-redesenho.mjs` | 0 erros de console; 0 rolagem lateral em 1440 |
| Botões sem efeito: clique em página recém-carregada, sem mutação de DOM nem troca de endereço em 600 ms | `scripts/auditoria/botoes-mortos.mjs` | 16 telas, 327 botões testados, 36 sem efeito. Saem da conta os 10 que já estão selecionados (aba, filtro ou seção atual, sem efeito por definição) e os 6 que podem ser não-operação legítima. Ficam 20 reais, todos conferidos no código |
| Teclado, foco, diálogos, movimento | `scripts/auditoria/teclado-e-movimento.mjs` | Ver abaixo |
| Produto atual: todas as rotas | `scripts/auditoria/captura-atual.mjs`, `nexo-atual.mjs` | 0 erros (exceto o 404 esperado) |
| Implementação: login em 6 larguras | `scripts/auditoria/captura-implementacao.mjs` | 0 axe; 0 rolagem lateral |
| Provas anteriores do protótipo: fluxo 25 passos, varredura, carregamento, coerência 15, nexo-auditoria 6, micro 9, cartão-nav 9 | `scripts/prova-*.mjs` | passavam na última rodada antes da auditoria; não reexecutadas |

## Botões sem efeito, conferidos no código

| Tela | Botão | Causa | ID |
|---|---|---|---|
| Mapa | Confirmar e gerar / Gerar mesmo assim | sem `onClick` (`mapa/lado.tsx:117`) | QA-003 |
| Mapa | "2 tomos ⌄" (`aria-haspopup="listbox"`, sem lista) | sem `onClick` (`mapa/tela-mapa.tsx:232`) | QA-003 |
| Montar volume | Recolher as conversas, Recolher o chat | sem `onClick` (`nexo/tela-nexo.tsx:471-474`) | QA-004 |
| Montar volume | Dividir assim, Um tomo só | `Saidas` sem `onEscolher` (`nexo/tela-nexo.tsx:216`) | QA-005 |
| Admin | os 5 números do Cockpit (com seta e "Abrir …") | `Numero` sem `onClick` (`admin/tela-admin.tsx:135`) | QA-006 |
| Admin | atualizar, sair, Atualizar R | sem handler (`:89`, `:95`, `:317`) | QA-006 |
| Admin, Pessoas | "Entra na PROSUL como MEMBER", "Usuário", "Membro", "Salvar" | opção já marcada ou nada a salvar: não-operação legítima provável | — (não reportado) |
| Admin, Dados | Filtrar (×2) | não conferido no código | — (não reportado) |

**Sem efeito por estar selecionado (descartados):** "Mapa do volume" (Nexo), "Todas 33" (Mapa), "Com você" e "Todos 4" (Achados), "Em andamento 8" (Projetos), "Documentos 5" (Projeto), "Tarefas 6" (Ajuda), e as seções atuais da trilha do admin: Cockpit, Pessoas, Dados.

## Teclado

| Verificação | Resultado |
|---|---|
| Ctrl K | Abre e foca o campo em Mapa, Resultado, Conversa e Admin. **Morto** em Projetos, Projeto e Achados (QA-001). Sem efeito no Painel (QA-002). |
| Esc | Fecha a barra (duas vezes: limpa, depois fecha) em todas as telas onde abriu. |
| `?` | Abre "Atalhos de teclado" em todas. Lista Ctrl G/A/L/Shift A sem handler (QA-007). |
| Tab | "Pular para o conteúdo" primeiro, depois Topo e conteúdo; anel de foco visível em todos os controles, exceto o campo da barra de comando e o campo de busca da fila (têm cursor; ver A11Y em 08). |
| Diálogos | "Novo projeto", as confirmações e as Configurações da obra são inline (no lado ou na tela), não modais. Por isso não há armadilha de foco a testar. Coerente com a regra "confirmação sempre na tela". |

## Implementação (PR #9)

| Verificação | Resultado |
|---|---|
| Login renderiza, Google e dev visíveis, recado | ok em 6 larguras |
| Movimento reduzido | **falha**: o vídeo toca (A11Y-001) |
| Sem acesso | não renderizável sem conta inativa; não verificado em tela |
| Placeholder de dev | mostra o e-mail do ambiente (QA-008, só em dev) |
| Bateria do app (`npm run bateria`) | não rodada nesta auditoria |
