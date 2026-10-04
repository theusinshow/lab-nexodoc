# 00 — Resumo executivo

**Status: NOT YET VALIDATED**

Auditoria de 01/10/2026 sobre três versões do NexoDoc:

- **Atual:** `main`.
- **Redesenho:** `/prototipo`, 16 telas e 122 situações.
- **Implementação:** PR #9, só a Entrada.

A base é a interface renderizada (Playwright e axe-core), conferida no código quando o defeito tem causa localizável. Nada foi corrigido nesta rodada.

## Resposta curta

O redesenho ainda não pode substituir a UI atual.

O desenho em si está bom:

- 0 erros de console em 122 situações;
- dados coerentes entre telas;
- nenhuma animação que segura a tela;
- teclado de verdade;
- só dois traços leves de AI slop.

Também é melhor que o atual em tratar achados, montar volume pela conversa, Ajuda, 404 e confirmações.

O que impede a substituição:

1. **Implementação:** 2 de 16 telas (P0, por plano: a migração está parada).
2. **Regressões sobre o atual:**
   - quebra abaixo de 1024 px, onde o atual tem portão ou cabe em 390 px;
   - tabelas sem células para leitor de tela (132 violações críticas, contra 0 no atual);
   - contraste abaixo de 4,5:1 em 73 situações.
3. **A única tela já implementada** toca vídeo em loop sem pausa e ignora "reduzir movimento" (WCAG 2.2.2, nível A).
4. **Funções que somem sem decisão escrita no repositório:**
   - montagem manual (`/volumes`);
   - limpeza de conversas pelo membro;
   - os widgets do Painel;
   - o tour.

   E a tela central, Nexo: a auditoria, não tem aprovação registrada.
5. **O DESIGN.md**, que o repositório chama de "a lei", ainda descreve o sistema antigo (teal e chanfro).

## Números

| | |
|---|---|
| Problemas | 32: P0 1 · P1 6 · P2 11 · P3 13 · P4 1 |
| Paridade (50 funções) | 23 iguais · 11 melhores · 5 mudadas de propósito · 4 faltando · 2 regressões · 3 sem clareza · 1 duplicada · 1 nova |
| Botões sem efeito (protótipo) | 20 reais em 327 testados |
| axe no redesenho | 132 críticas, 1.064 sérias (no atual: 17 sérias, só em `/nexo`) |
| Implementação (`/login`) | 0 axe em 6 larguras |

## Os 7 que mais importam

| ID | Sev. | Problema |
|---|---|---|
| PARITY-001 | P0 | Implementação cobre só a Entrada |
| UI-001 | P1 | Telefone e tablet quebram; o atual não quebra |
| A11Y-002 | P1 | Grades sem células, regressão do leitor de tela |
| A11Y-001 | P1 | Filme da Entrada sem pausa e sem movimento reduzido (PR #9) |
| PARITY-003 | P1 | `/volumes` some sem decisão registrada |
| PARITY-006 | P1 | Nexo: a auditoria sem aprovação |
| UI-002 | P1 | DESIGN.md descreve o sistema antigo |

## Próximo passo

Em menos de um dia, os itens 1 a 6 de `10-improvement-opportunities.md` fecham 9 problemas: Ctrl K, botões mudos, grade, mapa de páginas, contraste e filme.

Ficam com o dono três decisões:

1. `/volumes`;
2. os controles que saem;
3. a aprovação da tela central.

## Documentos

| Arquivo | Conteúdo |
|---|---|
| 01-screen-inventory.md | 32 telas numeradas (atual, redesenho, implementação) |
| 02-feature-parity-matrix.md | 50 funções com status |
| 03-ux-audit.md | fluxos percorridos |
| 04-ui-audit.md | medidas visuais por tela |
| 05-ai-slop-audit.md | nível por tela |
| 06-design-system-audit.md | tokens, desvios, componentes |
| 07-functional-qa.md | provas rodadas, botões sem efeito, teclado |
| 08-responsive-a11y.md | 7 larguras, axe, verificações manuais |
| 09-master-issue-list.md | os 32 problemas no formato completo |
| 10-improvement-opportunities.md | correções por retorno |
| 11-final-validation.md | portões, revisão cruzada, não verificado |
| `artifacts/` | capturas (current, redesign, implementation, issues), JSON das sondas |
| `scripts/auditoria/` | os scripts que produziram tudo, reexecutáveis |
