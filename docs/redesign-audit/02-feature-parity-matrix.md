# 02 — Matriz de paridade

A base é o inventário da fase 0 (`lib/design-lab/inventario.ts`, 19 telas e 154 controles), conferido contra:

- as capturas do atual;
- os controles agregados do redesenho (`redesign/inventario.json`);
- `grep` no código das telas aprovadas, para controles que vivem em menu e a captura não abre.

**Coluna Impl.:** ✗ = não implementado no PR #9. Isso vale para tudo fora da Entrada (PARITY-001).

| # | Função (atual) | Onde hoje | Redesenho | Status | Impl. | Ref. |
|---|---|---|---|---|---|---|
| 1 | Entrar com Google | `/login` | Entrada | PARITY | ✓ | — |
| 2 | Entrar como dev / como outra pessoa | `/login` | Entrada, dev | PARITY | ✓ | QA-008 |
| 3 | Falar com o responsável (recado) | `/login` | Entrada, contato | IMPROVED (sempre visível, estados de envio) | ✓ | — |
| 4 | Hero do login (orbe + carimbo do produto) | `/login` | filme HyperFrames | INTENTIONALLY CHANGED (aprovado 01/10) | ✓ | A11Y-001 |
| 5 | Pedir liberação / trocar de conta | `/sem-acesso` | Entrada, sem-acesso | PARITY | ✓ (código) | — |
| 6 | Continuar de onde parou | `/` | Painel, "Continuar" | PARITY | ✗ | — |
| 7 | Precisa da sua atenção (meus achados) | `/` | Topo "Com você" + Painel | PARITY | ✗ | — |
| 8 | Projetos abertos, Meus/Todos, parados, da equipe, expandir | `/` | — (Projetos tem "Paradas há mais de 20 dias") | INTENTIONALLY CHANGED, sem registro | ✗ | PARITY-002 |
| 9 | Foco 25/45/60, Rascunho, Atividade do escritório | `/` | — | INTENTIONALLY CHANGED, sem registro | ✗ | PARITY-002 |
| 10 | Personalizar (conversor de obra, gerados recentes) | `/` | — | INTENTIONALLY CHANGED, sem registro | ✗ | PARITY-002 |
| 11 | Começar tarefa (auditar, montar, LD/capa, conferir) | `/nexo` boas-vindas | Painel **e** Conversa nova | DUPLICATED | ✗ | UX-001 |
| 12 | Soltar arquivos em qualquer lugar | `/nexo` | Painel (arrastando), Conversa (anexando), Nexo (soltou) | PARITY | ✗ | — |
| 13 | Buscar ações (Ctrl K) | `/nexo` | Barra de comando em todas as telas | IMPROVED (global), com defeito | ✗ | QA-001, QA-002 |
| 14 | "Montar volumes com PDFs existentes" na busca | `/nexo` Ctrl K | — | MISSING IN REDESIGN | ✗ | PARITY-003 |
| 15 | Árvore de obras e conversas | `/nexo` barra | Conversas | PARITY | ✗ | — |
| 16 | Nova conversa a partir da mais recente | `/nexo` menu da obra | — | MISSING IN REDESIGN | ✗ | PARITY-004 |
| 17 | Procurar o que dá para apagar | `/nexo` menu da obra | só admin (Dados, expurgo) | MISSING IN REDESIGN (para membro) | ✗ | PARITY-004 |
| 18 | Apagar o projeto inteiro | `/nexo` menu da obra | Projeto → Configurações → Excluir (segurar) | INTENTIONALLY CHANGED (mudou de lugar) | ✗ | PARITY-004 |
| 19 | Como funciona o Nexo (tour + exemplo) | `/nexo` | — | UNCLEAR | ✗ | PARITY-005 |
| 20 | Foco na revisão / Ocultar projetos / Ocultar chat | `/nexo` | Tela cheia / Recolher conversas / Recolher chat | PARITY no Nexo: a auditoria; quebrado em Montar volume | ✗ | QA-004 |
| 21 | Perguntar sobre a auditoria no chat | `/nexo` | Nexo: a auditoria + "Perguntar ao Nexo" no Resultado | IMPROVED (citação abre o achado), respostas roteirizadas | ✗ | UX-003 |
| 22 | Auditoria rodando: cancelar, tempo, etapas, retomada | `/nexo` | Auditoria rodando (7) | IMPROVED (linha do tempo por bloco, registro) | ✗ | — |
| 23 | Resultado: Resumo / Achados / Parecer / No documento | `/nexo` | Resultado (21) | PARITY (Relatório = aba Parecer) | ✗ | — |
| 24 | Exportar: Parecer em PDF, Relatório, Matriz | `/nexo` EXPORTAR | Parecer em PDF, Matriz de achados | PARITY | ✗ | — |
| 25 | Registrar erro ausente | `/nexo` | "O Nexo deixou passar algo?" | PARITY | ✗ | — |
| 26 | Fila: busca, filtros, Todos/Meus/Sem dono/Pendentes/Encerrados | `/nexo` | fila | PARITY | ✗ | — |
| 27 | Fila: selecionar e atribuir em lote, Enviar e-mail | `/nexo` | fila (Atribuir a…, Enviar) | PARITY | ✗ | — |
| 28 | Cancelar a notificação por e-mail | `/nexo` | não achado no código | UNCLEAR | ✗ | — |
| 29 | Achado: corrigido, decisão técnica, falso positivo, gravidade errada | `/nexo` | fila (C/D/F, "Gravidade errada" no menu) | PARITY | ✗ | — |
| 30 | Copiar link do achado, cartão do achado | `/nexo` | fila (menu "Mais") | PARITY | ✗ | — |
| 31 | Ver no memorial / abrir página / visor de PDF | `/nexo` | "Ver no memorial, p. N" + visor | IMPROVED (destaque no trecho) | ✗ | — |
| 32 | No documento: miniaturas, transcrever e auditar, PDF remoto | `/nexo` | documento (3) | PARITY; minimapa saiu do No documento (existe no Mapa) | ✗ | — |
| 33 | Mapa do volume: tomos, corrigir folha, aplicar, excluir, gerar | `/nexo` | Mapa (7) | PARITY no desenho; "Confirmar e gerar" mudo | ✗ | QA-003 |
| 34 | Montar volume pela conversa | `/nexo` | Nexo: montar o volume (7) | IMPROVED (arrasto com física, setas) | ✗ | QA-004, QA-005 |
| 35 | Montagem manual: biblioteca, destino, adicionar como, conferência .md, dados do volume | `/volumes` | — | MISSING IN REDESIGN, decisão só em memória | ✗ | PARITY-003 |
| 36 | Projetos: busca, Ativos/Arquivados/Todos, novo, retomar, arquivar | `/projetos` | Projetos (6) | PARITY, exceto o seletor de ordem, que saiu (fica fixo "atualizadas primeiro"); sem registro | ✗ | — |
| 37 | Projeto: módulos, documentos, arquivos, artefatos, eventos, configurações | `/projetos/[id]` | Projeto (6) | PARITY (Artefatos = Gerados pelo Nexo) | ✗ | — |
| 38 | Achados: com você, atribuídos por você, abrir o parecer, nova auditoria | `/achados` | Achados (5) | PARITY | ✗ | — |
| 39 | Ajuda: para onde ir, onde fica, glossário | `/ajuda` | Ajuda (6): Tarefas, Onde fica, Palavras + busca | IMPROVED (busca) | ✗ | — |
| 40 | Admin: token, cockpit, dinheiro, motor, pessoas, dados | `/admin/*` | Admin (17) | PARITY; cartões do cockpit sem destino no protótipo | ✗ | QA-006 |
| 41 | Admin: portão de tela larga | `/admin` | descrito em Peças, não aplicado | REGRESSION (no protótipo) | ✗ | UI-001 |
| 42 | Nexo: portão abaixo de 1024 px | `/nexo` | nenhum | REGRESSION | ✗ | UI-001 |
| 43 | Atalhos globais (Ctrl G/A/L/Shift A, ?) | todas | `?` lista; só Ctrl K e `?` ligados | PARITY na lista, MISSING no comportamento | ✗ | QA-007, UX-002 |
| 44 | Pular para o conteúdo | todas | Topo | PARITY | ✓ (login) | — |
| 45 | Menu da conta: sair, trocar de conta | todas | Topo (alçadas, atalhos, sair, entrar com outra conta) | IMPROVED | ✗ | — |
| 46 | Página 404 | qualquer | 404 desenhada, com busca | IMPROVED | ✗ | — |
| 47 | Página de erro de carga | — | "Página que não carregou" | NEW FEATURE | ✗ | — |
| 48 | Esqueletos e rede lenta | parcial | esqueleto por tela + rede simulada | IMPROVED | ✗ | — |
| 49 | Confirmação destrutiva | `window.confirm` em partes | 3 pesos, segurar para excluir, digitar o nome | IMPROVED | ✗ | — |
| 50 | Rotas de intenção (`/audit`, `/capas`, `/ld`) | redirects | não modeladas no protótipo | UNCLEAR | ✗ | — |

## Resumo

| Status | Qtde |
|---|---|
| PARITY | 23 |
| IMPROVED | 11 |
| INTENTIONALLY CHANGED | 5 (3 sem registro) |
| DUPLICATED | 1 |
| MISSING IN REDESIGN | 4 |
| REGRESSION | 2 (portões de tela estreita) |
| NEW FEATURE | 1 |
| UNCLEAR | 3 |
| **Total** | **50** |
| MISSING IN IMPLEMENTATION | 44 de 50 (só as linhas 1–5 e 44 estão no PR #9) |

Algumas linhas PARITY têm ressalva na própria linha: 20, 33, 36, 40 e 43.
