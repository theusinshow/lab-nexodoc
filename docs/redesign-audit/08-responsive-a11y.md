# 08 — Responsivo e acessibilidade

## Responsivo

15 telas principais do redesenho em 1920, 1440, 1280, 1024, 768 e 390, e 8 em 2560 (`scripts/auditoria/responsivo.mjs`, `redesign/responsivo/*.png`, `responsivo.json`). Para comparar, o atual foi capturado em 768 e 390 (`current/estreito-*.png`).

| Largura | Redesenho | Atual |
|---|---|---|
| 2560 | Sem quebra. Lista do Nexo: a auditoria sem largura máxima (UI-005). | — |
| 1920 / 1440 / 1280 | Sem rolagem lateral, sem sobreposição, sem controle fora da tela. | ok |
| 1024 | Sem rolagem nem sobreposição. O palco do Nexo aperta. | Nexo e Admin: portão |
| 768 | Nexo: a auditoria com 10 pares de controles sobrepostos; Resultado (fila) com 4 controles fora da tela e 1 sobreposição; Admin Pessoas com 10 controles fora. | Nexo e Admin: portão; Painel, Projetos e Achados cabem |
| 390 | Rolagem lateral em Painel, Nexo: a auditoria, Montar volume, Resultado (fila), Projeto e Cockpit. Texto sobreposto em Achados, Projeto e fila. | Nexo e Admin: portão; Painel, Projetos e Achados cabem, 0 px de rolagem |

**Veredito:** regressão abaixo de 1024 (UI-001, P1). O atual tem uma política escrita, o `PortaoDeTelaLarga`, e o redesenho não aplica nenhuma. A tela Peças do próprio lab descreve o portão, mas o protótipo não o usa.

## Acessibilidade

**axe-core 4.13**, regras wcag2a, wcag2aa e wcag21aa, sobre `.pt-tela` em todas as 122 situações (`redesign/inventario.json`). No atual, sobre o `document` em 7 rotas (`axe-atual.json`).

| Regra | Impacto | Redesenho | Atual |
|---|---|---|---|
| `aria-required-children` | crítico | 132 nós, 27 situações (Projetos, Projeto, Achados, Ajuda, Mapa) | 0 |
| `aria-prohibited-attr` | sério | 735 nós, 20 situações (mapa de páginas) | 0 |
| `color-contrast` | sério | 329 nós, 73 situações, 14 telas | 0 |
| `list` / `listitem` | sério | 0 | 17 nós em `/nexo` |
| Implementação `/login` (6 larguras) | — | 0 | — |

**Verificações manuais:**

| Item | Resultado | ID |
|---|---|---|
| Movimento reduzido nas telas de trabalho | Todas as animações infinitas param (11/11 situações) | ok |
| Movimento reduzido no filme da Entrada | Vídeo continua tocando (implementação e protótipo) | A11Y-001 |
| Pausa do filme (WCAG 2.2.2) | Não existe | A11Y-001 |
| Controles sem nome | 8 (Mapa corrigindo 4, Projeto configurações 4) | A11Y-005 |
| Título de página | Conversa e Montar volume sem `h1` | A11Y-006 |
| Alvos < 24 px | caixas de seleção 14 px, "conferido" 20×17, blocos da linha do tempo 20 px de altura, links do admin 18 px | A11Y-007 |
| Anel de foco | Visível em botões e links. Os campos da barra de comando e da busca da fila não mudam borda nem sombra no foco; o cursor aparece. | P4, não listado como issue: o cursor é indicador aceito por parte dos auditores, mas a regra 2.4.7 é discutível aqui |
| Pular para o conteúdo | Primeiro Tab em todas as telas com Topo | ok |
| Leitor de tela real (NVDA ou VoiceOver) | **Não testado** | — |

**Veredito:** o redesenho introduz duas falhas que o atual não tem: grade sem células e contraste. Introduz também uma falha de nível A na única tela já implementada (o filme).
