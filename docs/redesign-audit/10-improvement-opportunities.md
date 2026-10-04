# 10 — Oportunidades de melhoria

Em ordem de retorno sobre esforço. Cada item fecha um ou mais problemas da lista mestra. Nada aqui foi aplicado: esta rodada é só auditoria.

| # | O que fazer | Fecha | Esforço |
|---|---|---|---|
| 1 | Sair cedo nos três handlers J/K quando houver Ctrl, Meta ou Alt | QA-001 | minutos |
| 2 | Ligar com `useIr()`: Confirmar e gerar (Mapa), seletor de tomos, Recolher conversas e chat (Montar volume), Dividir assim / Um tomo só, números do Cockpit, atualizar e sair do admin | QA-003, -004, -005, -006 | 1 h |
| 3 | `role="gridcell"`/`columnheader` na grade comum (`.mp-g-linha`, `.mp-g-cab`, `.mp-tiles`) | A11Y-002 | 1 h |
| 4 | Mapa de páginas: um resumo textual e as células `aria-hidden` | A11Y-003 | 30 min |
| 5 | Terciário por camada: clarear `--ds-texto-3` nas superfícies elevadas; `aria-hidden` nas miniaturas desenhadas | A11Y-004 | 1 h + revisão visual |
| 6 | Filme da Entrada: `matchMedia` direto e botão de pausa | A11Y-001 | 1 h |
| 7 | Portão de tela larga no Nexo e no Admin do protótipo; coluna única em Achados, fila e Projeto abaixo de 760 px | UI-001 | meio dia |
| 8 | Registrar no `inventario.ts` o destino de cada controle que sai (Painel ×8, `/volumes` ×21, menu da obra ×3, tour, ordem de Projetos) | PARITY-002, -003, -004, -005 | 1 h com o dono |
| 9 | Levantar o uso real de `/volumes` em produção antes de decidir | PARITY-003 | 30 min de consulta |
| 10 | Aprovação das 6 situações de Nexo: a auditoria | PARITY-006 | sessão com o dono |
| 11 | Uma porta de início: o Painel abre a conversa com a tarefa, ou a Conversa nova vira a home; um nome só para "conferir" | UX-001 | decisão + meio dia |
| 12 | Gravar 10 respostas reais do `audit-chat` e tocar no protótipo | UX-003 | meio dia |
| 13 | DESIGN.md novo a partir de `app/ds.css` e `components/ds` | UI-002 | 1 dia |
| 14 | Tokens de tipo (2 níveis de título), raio, espaço, camada e duração; extrair Grade e Painel para `components/ds` | UI-003, -004, -006 | 1–2 dias |
| 15 | Cabeçalho do palco do Nexo como componente único | QA-004 | 1 h |
| 16 | Atalhos de navegação em sequência (G A, G L) ou fora da lista | UX-002, QA-007 | 1 h |
| 17 | Largura máxima de leitura na fila do palco em telas largas | UI-005 | 30 min |
| 18 | Título do Painel pela tarefa, não pela hora | SLOP-001 | minutos |

**Sequência sugerida:**

1. Itens 1 a 6: fecham 9 problemas em menos de um dia.
2. Itens 8 a 10: são decisões do dono e destravam G2 e G3.
3. Item 7.
4. Itens 13 e 14, antes de retomar a migração no passo 2.
