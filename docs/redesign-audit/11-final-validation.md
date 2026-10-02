# 11 — Validação final

## 1. Status

**NOT YET VALIDATED**

O redesenho é bom como desenho: coerente, técnico, sem slop relevante e melhor que o atual em vários fluxos. Mas a UI atual ainda não pode ser substituída, por quatro motivos:

1. **Não há implementação para substituir.** O PR #9 cobre 2 de 16 telas (PARITY-001, P0).
2. **Há regressões verificadas sobre o atual:** tela estreita (UI-001) e acessibilidade (A11Y-002, A11Y-004).
3. **A única tela já implementada tem uma falha de nível A** (A11Y-001).
4. **Faltam decisões registradas** para funções que somem (PARITY-002, -003, -004), e a tela central não tem aprovação (PARITY-006).

## 2. Portões

| # | Portão | Situação | Bloqueia |
|---|---|---|---|
| G1 | Toda tela aprovada tem implementação ligada a dados reais | 2/16 | sim |
| G2 | Nenhum controle do inventário some sem decisão registrada | 3 grupos sem registro (Painel, `/volumes`, menu da obra) e 3 UNCLEAR | sim |
| G3 | A tela central do produto aprovada pelo dono | Nexo: a auditoria, 0/6 situações | sim |
| G4 | Zero violação axe crítica e nenhuma regressão de a11y sobre o atual | 132 críticas, 1.064 sérias; o atual tem 17 sérias | sim |
| G5 | Nenhuma regressão responsiva sobre o atual (390, 768) | regressão em 4 telas | sim |
| G6 | WCAG 2.2.2 e movimento reduzido na Entrada | falha | sim (para o PR #9) |
| G7 | Especificação do sistema escrita (DESIGN.md) | descreve o sistema antigo | sim (para migrar) |
| G8 | 0 erros de console em todas as situações | 0/122 | ok |
| G9 | Fluxos do protótipo navegáveis ponta a ponta | prova de 25 passos ok; 20 botões mudos | parcial |
| G10 | Dados coerentes entre telas | `prova-coerencia.mjs` ok | ok |
| G11 | Sem animação que segura a tela | 0 infinitas em repouso fora de orbe e progresso; todas param com movimento reduzido | ok (exceto o filme, G6) |
| G12 | Sem AI slop relevante | 2 itens LOW | ok |

## 3. Resposta à pergunta

> Podemos substituir a UI atual do NexoDoc pelo redesign sem perder funcionalidade, sem introduzir regressões?

**Não, ainda não.** Há três motivos, e só o primeiro é esperado.

1. **Quase nada está implementado.** A migração está parada por decisão do dono.
2. **O próprio redesenho, mesmo implementado como está, introduziria regressões:**
   - quebra em telefone e tablet;
   - tabelas inacessíveis;
   - contraste abaixo do mínimo.
3. **Perderia funções sem decisão escrita:**
   - montagem manual com PDFs prontos;
   - limpeza de conversas pelo membro;
   - os widgets do Painel;
   - o tour com o projeto de exemplo.

Nenhum desses é defeito de concepção. Todos têm correção localizada (ver `10-improvement-opportunities.md`).

## 4. Revisão cruzada (árbitro)

Reverifiquei os achados P0–P2 por um segundo caminho, diferente do que os encontrou:

| ID | 1º caminho | 2º caminho | Mantido? |
|---|---|---|---|
| PARITY-001 | `git diff --name-status` | captura das rotas na 3400 | sim |
| PARITY-003 | inventário da fase 0 | código das telas aprovadas e busca de ações do atual | sim; impacto depende do uso real |
| PARITY-006 | agregação do `aprovacoes.json` | lista de pastas de telas × chaves aprovadas | sim |
| UI-001 | métricas de `responsivo.mjs` | leitura das capturas, comparada com o atual na mesma largura | sim; vira P2 se o dono declarar o celular fora de escopo, mas a nota do próprio PR #9 diz o contrário |
| UI-002 | `grep` no DESIGN.md | data do último commit (28/09) × início do `ds` | sim |
| A11Y-001 | `teclado-e-movimento.mjs` | script isolado, duas recargas, `matchMedia === true` e `video.paused === false` | sim |
| A11Y-002 | axe | marcação em `tela-projetos.tsx:293-309` | sim |
| A11Y-003/004 | axe | casos medidos com cor e razão | sim |
| QA-001 | `teclado-e-movimento.mjs` | segundo script e causa no código (3 handlers) | sim |
| QA-003/004/006 | sonda de cliques | ausência de `onClick` no código | sim |
| UX-001 | inventário de controles | capturas lado a lado | sim; confiança média no custo |
| UX-003 | código de `responder()` | situação "respondendo" é fixa | sim |
| PARITY-002/004 | inventário e capturas do atual | `grep` sem ocorrência nas telas aprovadas | sim |

**Descartados na revisão:**

- 16 "botões mortos" que eram aba, filtro ou seção já selecionada, ou não-operação legítima.
- "Diálogos sem armadilha de foco": as confirmações são inline por decisão, então não há armadilha a cobrar.
- "Anel de foco ausente nos campos": o cursor é indicador discutível. Ficou como observação P4 em `08`, não como issue.
- Contraste das miniaturas do Mapa como problema de leitura: é desenho. Virou recomendação de `aria-hidden` dentro de A11Y-004.
- "Times New Roman" na Entrada: é fallback dentro do filme, sem efeito visível.

## 5. Aprovações registradas (`design-lab/aprovacoes.json`)

| Grupo | Aprovadas |
|---|---|
| inv.login, inv.sem-acesso | 2 |
| tela.entrada | 9 |
| tela.inicio-d2 | 7 |
| tela.conversa | 15 |
| tela.nexo | 7 |
| tela.mapa | 7 |
| tela.auditoria | 7 |
| tela.resultado-e, tela.parecer, tela.documento | 15 + 3 + 3 |
| tela.achados | 5 |
| tela.projetos | 6 |
| tela.projeto | 6 |
| tela.admin | 17 |
| tela.ajuda | 6 |
| tela.pecas | 10 |
| **tela.nexo-auditoria** | **0** |

## 6. Passada final de navegação

Feita no fim, depois de escrever tudo, para conferir que o protótipo auditado é o mesmo do começo:

- `scripts/prova-prototipo.mjs`: 25 passos ok, "erros: nenhum". Inclui Painel → Continuar → Nexo: a auditoria, 404 → Projetos e Menu → Sair → Entrada.
- `scripts/prova-coerencia.mjs`: "tudo coerente".

## 7. Não verificado

- `/sem-acesso` renderizado. Exige conta inativa; conferido só no código.
- Leitor de tela real (NVDA ou VoiceOver). Só axe e inspeção de marcação.
- Respostas reais do chat (`audit-chat`). O protótipo é roteirizado.
- PDFs reais no "No documento" e no visor. O protótipo usa papel desenhado.
- Volume grande: 200 achados ou 400 folhas.
- Navegadores além do Chromium (Firefox, Safari).
- `npm run bateria` do app na branch do PR #9.
- A causa raiz de A11Y-001: o comportamento está provado, a causa não.
- Uso real de `/volumes` em produção, que decide a severidade de PARITY-003.

## 8. Limitações do método

- **Sem subagentes.** Os 13 papéis pedidos rodaram em sequência, na mesma conversa, por regra do dono. A revisão cruzada é minha contra mim, por caminho diferente (seção 4), não por outra pessoa.
- **"Botão morto"** é "sem mutação de DOM nem troca de endereço em 600 ms". Pega affordance falsa, mas não pega botão que faz a coisa errada.
- **O produto atual** foi visto pela branch do PR #9, cujo diff só toca login e sem-acesso. O login atual veio da `main` pura, servida por webpack na 3300; o Turbopack recusou o node_modules ligado por junção no worktree temporário.
