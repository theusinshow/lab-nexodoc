# 09 — Lista mestra de problemas

Auditoria de 01/10/2026. Compara três coisas:

- **Atual:** `main`, servida em `localhost:3400` a partir da branch `migracao/fundacao-e-entrada`. O diff contra a `main` só toca login e sem-acesso.
- **Redesenho:** `/prototipo` no worktree `design/lab`, em `localhost:3200`, com 16 telas e 122 situações.
- **Implementação:** o PR #9, branch `migracao/fundacao-e-entrada`, que só tem a Entrada.

Todo problema abaixo foi reproduzido na interface renderizada (Playwright, Chromium 1440×900 salvo quando dito). Os que dependem de código têm o arquivo e a linha. O que não consegui reproduzir não entrou. Está listado em `11-final-validation.md` como "não verificado".

As capturas citadas estão em `artifacts/screenshots/`, e os dados brutos em `artifacts/*.json`.

## Contagem

| Severidade | Qtde | IDs |
|---|---|---|
| P0 | 1 | PARITY-001 |
| P1 | 6 | PARITY-003, PARITY-006, UI-001, UI-002, A11Y-001, A11Y-002 |
| P2 | 11 | PARITY-002, PARITY-004, UX-001, UX-003, UI-003, QA-001, QA-003, QA-004, QA-006, A11Y-003, A11Y-004 |
| P3 | 13 | PARITY-005, UX-002, UI-004, UI-005, UI-006, QA-002, QA-005, QA-007, A11Y-005, A11Y-006, A11Y-007, SLOP-001, SLOP-002 |
| P4 | 1 | QA-008 |

Escala:

- **P0:** impede a substituição.
- **P1:** regressão ou falha séria a corrigir antes de migrar.
- **P2:** problema real, migrar com ele exige decisão.
- **P3:** acabamento ou consistência.
- **P4:** cosmético, ou só em ambiente de dev.

---

## P0

### PARITY-001 — A implementação cobre 2 das 16 telas

- **Categoria:** Paridade · **Severidade:** P0 · **Tela:** todas menos a Entrada · **Rota:** todas menos `/login` e `/sem-acesso`
- **Componente:** —
- **Problema:** o PR #9 implementa só a Entrada, com login e sem-acesso. As outras 14 telas do redesenho continuam com a interface atual no app: Painel, Nexo, Conversa, Montar volume, Mapa, Auditoria, Resultado, Achados, Projetos, Projeto, Admin, Ajuda, peças de toda tela e 404/erro.
- **Evidência:**
  - `git diff --name-status main...migracao/fundacao-e-entrada` mostra 23 arquivos, todos de entrada, ds ou fontes.
  - Na porta 3400, `/projetos`, `/achados` e `/nexo` renderizam a interface antiga (`current/projetos.png`, `current/nexo.png`).
- **Por que importa:** a pergunta da auditoria é se dá para substituir a UI. Hoje não há o que substituir: o redesenho existe como protótipo, não como produto.
- **Hoje:** só a Entrada usa o sistema `ds`.
- **Esperado:** todas as telas aprovadas implementadas e ligadas a dados reais.
- **Recomendação:** é o plano já decidido, migração nos passos 2 a 5. Ele está em espera por decisão do dono, e não é defeito do trabalho. Tratar como portão, não como bug.
- **Confiança:** alta.

---

## P1

### PARITY-003 — "Montar volumes" (`/volumes`) saiu do redesenho sem decisão registrada no repositório

- **Categoria:** Paridade · **Severidade:** P1 · **Tela:** Montar volumes · **Rota:** `/volumes` (e `/ferramentas` → `/volumes`)
- **Componente:** `app/volumes`, no redesenho `app/lab/telas/volumes` (arquivada)
- **Problema:** a tela de montagem manual não tem versão no protótipo. O motivo está só na memória da sessão de 01/10: "Matheus não usa /volumes". Não está no `inventario.ts`, nem no `aprovacoes.json`, nem num documento do repositório.
- **Evidência:** a tela atual tem 21 controles no inventário da fase 0. Vários deles não têm equivalente no Nexo "Montar o volume" do redesenho (`redesign/nexo_*.png`, 38 controles):
  - importar PDFs já prontos por tipo (Capas, LDs, Separatrizes, Pranchas, Anexos);
  - Biblioteca de páginas com seleção por página;
  - Destino (volume, grupo, posição) e "Adicionar como…";
  - Conferência com "Baixar relatório (.md)";
  - "Editar dados do volume" (8 campos).

  A busca de ações do app atual (Ctrl K) também oferece "Montar volumes com PDFs existentes" (`current/nexo-busca-acoes.json`).
- **Por que importa:** o caso "já tenho os PDFs de capa e LD feitos fora do Nexo e só quero juntar" não tem caminho no redesenho. Se outra pessoa do escritório usa a tela, substituir a UI tira dela a única ferramenta para isso.
- **Hoje:** `/volumes` atende montagem manual completa.
- **Esperado:** decisão escrita: (a) a tela sai, quem usa e o que acontece com os dados; ou (b) as funções sem par entram no palco do Nexo; ou (c) a tela fica com a pele nova.
- **Recomendação:** antes de migrar, conferir o uso real de `/volumes` em produção, pelos eventos de montagem por usuário, e registrar a decisão no `inventario.ts`.
- **Confiança:** alta quanto à falta de registro. Média quanto ao impacto, que depende do uso real.

### PARITY-006 — A tela central do redesenho ("Nexo: a auditoria") não tem aprovação registrada

- **Categoria:** Paridade / processo · **Severidade:** P1 · **Tela:** Nexo: a auditoria · **Rota:** `/prototipo#/nexo-auditoria/*`
- **Componente:** `app/lab/telas/nexo-auditoria/tela-nexo-auditoria.tsx`
- **Problema:** o `design-lab/aprovacoes.json` tem 125 aprovações em 17 grupos e nenhuma `tela.nexo-auditoria.*`. Essa é a tela feita em 01/10 para devolver a premissa do chat que audita, e é por onde a auditoria acontece.
- **Evidência:** agregação do `aprovacoes.json` por grupo (seção 5 do `11-final-validation.md`). Todas as outras telas do protótipo estão 100% aprovadas.
- **Por que importa:** é a tela que define o produto, conforme a memória "o chat é a premissa". Migrar o resto e deixar ela por último sem parecer inverte o risco.
- **Hoje:** está construída e navegável, sem parecer do dono.
- **Esperado:** aprovação explícita, situação por situação, como as outras.
- **Recomendação:** submeter as 6 situações (pronta, rodando, achado, no-documento, respondendo, obra) ao dono antes de qualquer passo da migração que toque o Nexo.
- **Confiança:** alta.

### UI-001 — Em tela estreita o redesenho sobrepõe texto e quebra; o app atual não quebra

- **Categoria:** UI / responsivo · **Severidade:** P1 · **Telas:** Achados, Projeto, Resultado (fila), Nexo: a auditoria · **Rotas:** `#/achados/com-voce`, `#/projeto/com-registros`, `#/resultado/fila`, `#/nexo-auditoria/pronta`
- **Componente:** `mapa.css` (`.mp-grade`, `.mp-principal`), `tela-nexo-auditoria.tsx` (3 colunas), `resultado-e` (trilho)
- **Problema:** abaixo de 1024 px:
  - em 390 px, Achados e Projeto têm títulos, abas e cabeçalho de tabela escritos uns sobre os outros;
  - em 390 px, o trilho do Resultado cobre a fila;
  - em 768 px, o palco do Nexo é espremido até as colunas se sobreporem.
- **Evidência:**
  - `issues/UI-001-achados-390-redesenho.png` × `issues/UI-001-achados-390-atual.png`: o atual lê em cartões, sem sobreposição.
  - `issues/UI-001-projeto-390.png`.
  - `issues/UI-001-fila-390.png`.
  - `issues/UI-001-nexo-auditoria-768.png` × `issues/UI-001-nexo-768-atual-portao.png`: o atual mostra o portão "O Nexo pede uma tela maior".
  - `responsivo.json` registra 10 pares de controles sobrepostos em `nexo-auditoria_pronta-768` e rolagem lateral em 6 telas a 390 px.
- **Por que importa:**
  - O app atual tem uma decisão escrita para isso: `components/ui/portao-de-tela-larga.tsx` portão no Nexo e no admin, e o resto cabendo em 390 px.
  - A própria implementação nova promete no login: "No celular, dá para ler e tratar achados" (`app/login/page.tsx`).
  - No redesenho essa promessa não se cumpre, e é regressão sobre o atual.
- **Hoje:** layout de desktop encolhido, sem portão e sem versão estreita.
- **Esperado:** Achados, Resultado e Projeto legíveis em 390 px. Nexo e Admin com portão, como hoje e como a própria Peças do lab descreve ("o portão das telas densas (admin) num telefone").
- **Recomendação:** levar o `PortaoDeTelaLarga` para o protótipo nas telas densas, e dar uma regra de coluna única às listas (Achados, fila, Projeto) abaixo de 760 px.
- **Confiança:** alta.

### UI-002 — O DESIGN.md, que o repositório chama de "a lei", descreve o sistema antigo

- **Categoria:** Design system · **Severidade:** P1 · **Tela:** todas · **Rota:** —
- **Componente:** `DESIGN.md`, `app/ds.css`
- **Problema:** o `DESIGN.md` tem 40 menções a teal e chanfro e nenhuma a violeta, `--ds-*` ou ao sistema `ds`. Última alteração: 28/09, `7beea8e`. O `docs/briefing-redesenho.md` diz para levar o DESIGN.md junto porque "é a lei".
- **Evidência:** `grep -ci "teal\|chanfro" DESIGN.md` dá 40; `grep -i "violeta\|--ds-"` não acha nada. A memória "redesenho escuro" já avisava que o novo "contradiz o DESIGN.md".
- **Por que importa:** quem migrar, pessoa ou agente, vai ler a especificação errada. O sistema novo só existe como código (`app/ds.css`, `components/ds/*`) e como decisões espalhadas em memória.
- **Hoje:** a especificação diz teal e chanfro, a interface aprovada usa violeta e sem chanfro.
- **Esperado:** o DESIGN.md descrevendo tokens, escalas, componentes e regras do `ds`, com o sistema antigo marcado como aposentado.
- **Recomendação:** reescrever o DESIGN.md a partir do `app/ds.css` antes do passo 2 da migração.
- **Confiança:** alta.

### A11Y-001 — O vídeo da Entrada toca em loop sem pausa e ignora "reduzir movimento"

- **Categoria:** Acessibilidade · **Severidade:** P1 · **Tela:** Entrada · **Rota:** `/login` (implementação), `#/entrada/*` (protótipo)
- **Componente:** `components/entrada/filme.tsx` (PR #9)
- **Problema:** o filme dura 15–20 s, toca sozinho em loop e não tem controle de pausa. Com `prefers-reduced-motion: reduce` ele continua tocando, embora o código diga que nesse caso fica um quadro parado.
- **Evidência:**
  - Playwright com `reducedMotion: "reduce"` em `localhost:3400/login`: `matchMedia('(prefers-reduced-motion: reduce)').matches === true` e `video.paused === false`, em duas recargas seguidas.
  - O mesmo acontece em `/prototipo#/entrada/padrao`.
  - Em `/lab/telas/entrada` o pôster aparece. É o mesmo hook (`useReducedMotionConfig`) com resultado diferente, então a causa é de montagem ou hidratação, não de lógica. Não isolei a causa.
- **Por que importa:**
  - WCAG 2.2.2 (nível A) pede pausa para movimento automático com mais de 5 s. O `aria-hidden` não isenta.
  - É a única tela do redesenho que vai a produção no PR #9.
- **Hoje:** vídeo sempre tocando, sem botão.
- **Esperado:** quadro parado com movimento reduzido e um controle de pausa visível.
- **Recomendação:**
  - Ler `matchMedia` direto, no mesmo efeito que já mede a largura, em vez do hook do motion.
  - Pôr um botão "Pausar o filme" no canto do painel.
  - Fazer a prova com Playwright `reducedMotion`.
- **Confiança:** alta no comportamento, baixa na causa.

### A11Y-002 — As tabelas do redesenho declaram `grid`/`row` sem células; no atual elas passam no axe

- **Categoria:** Acessibilidade · **Severidade:** P1 · **Telas:** Projetos, Projeto, Achados, Ajuda, Mapa · **Rotas:** 27 situações
- **Componente:** `.mp-grade` / `.mp-g-linha` / `.mp-g-cab` (`app/lab/telas/projetos/tela-projetos.tsx:293-309` e iguais), `.mp-tiles` (Mapa)
- **Problema:** `role="grid"` e `role="row"` com filhos `<span>` sem `gridcell` nem `columnheader`.
- **Evidência:**
  - axe, regra `aria-required-children` (impacto crítico): 132 nós em 27 situações (`redesign/inventario.json`).
  - No app atual, o axe nas mesmas rotas (`/projetos`, `/achados`, `/ajuda`) dá 0 violações (`artifacts/axe-atual.json`).
- **Por que importa:** o leitor de tela anuncia uma grade e não acha células. A navegação por tabela, que é a função dessas telas, fica inútil. É regressão.
- **Hoje:** grade quebrada para tecnologia assistiva.
- **Esperado:** `role="gridcell"`/`columnheader` nos filhos, ou `<table>` de verdade, ou nenhum `role`.
- **Recomendação:** corrigir no componente comum (`mapa.css` + marcação da grade) e repetir o axe.
- **Confiança:** alta.

---

## P2

### PARITY-002 — O Painel perdeu oito controles sem registro por controle

- **Categoria:** Paridade · **Severidade:** P2 · **Tela:** Painel · **Rota:** `/` → `#/inicio/*`
- **Componente:** `components/home/*` (atual), `app/lab/telas/inicio-d2` (redesenho)
- **Problema:** saíram do Painel:
  - Foco 25/45/60;
  - Rascunho;
  - Atividade do escritório;
  - Personalizar, com conversor de obra e gerados recentemente;
  - "Meus projetos / Todos";
  - "Projetos parados";
  - "Da equipe";
  - "Expandir projeto".
- **Evidência:** `issues/PARITY-002-painel-atual.png` × `issues/PARITY-002-painel-redesenho.png`; inventário da fase 0 (`casa/painel`, 17 controles); busca no código do redesenho (`grep "Foco\|Personalizar\|Rascunho"` não acha nada nas telas aprovadas).
- **Por que importa:** o `inventario.ts` diz que "nenhum controle some sem que isso tenha sido decidido". A decisão existe, é a premissa do "uso pontual" (30/09) e o Início D2 aprovado, mas só na memória da sessão. Se alguém usa o Foco ou o Rascunho todo dia, perde sem aviso.
- **Hoje:** decisão implícita.
- **Esperado:** status INTENTIONALLY CHANGED registrado por controle no `inventario.ts` (ou em `aprovacoes.json`), com destino de cada um: some, vai para outra tela ou fica.
- **Recomendação:** acrescentar um campo `destino` aos controles do inventário e preencher os oito.
- **Confiança:** alta.

### PARITY-004 — As ações por obra da barra do Nexo não existem no redesenho

- **Categoria:** Paridade · **Severidade:** P2 · **Tela:** Nexo (barra de conversas) · **Rota:** `/nexo` → `#/nexo-auditoria/*`, `#/conversa/*`
- **Componente:** barra lateral do `NexoShell` (atual), `Conversas` (`app/lab/telas/nexo/tela-nexo.tsx`)
- **Problema:** saíram três ações do menu de cada obra:
  - "Nova conversa a partir da mais recente";
  - "Procurar o que dá para apagar";
  - "Apagar o projeto inteiro".
- **Evidência:** `issues/PARITY-004-nexo-barra-atual.png`. No redesenho a barra tem só "Nova conversa", "Buscar conversa" e a árvore. Busca no código das telas aprovadas: 0 ocorrências das três frases.
- **Por que importa:** apagar o projeto continua possível em Projeto → Configurações. Mas "procurar o que dá para apagar" é a limpeza de conversas pelo próprio usuário, e no redesenho só existe no admin (Dados, expurgo). Um membro comum perde a limpeza.
- **Hoje:** menu por obra com 3 ações.
- **Esperado:** decisão. Se a limpeza do usuário fica, ela precisa de lugar.
- **Recomendação:** pôr um menu "⋯" na linha da obra em `Conversas` com as três ações, ou registrar que saem.
- **Confiança:** alta.

### UX-001 — Duas portas para começar a mesma tarefa: Painel e Conversa nova

- **Categoria:** UX · **Severidade:** P2 · **Telas:** Painel, Conversa com o Nexo · **Rotas:** `#/inicio/padrao`, `#/conversa/nova`
- **Problema:** as duas telas oferecem o mesmo início com nomes diferentes:
  - Painel: "Auditar um memorial", "Montar um volume", "Gerar LD e capa", "Conferir as folhas", com área de soltar arquivo.
  - Conversa nova: "Auditar um memorial", "Gerar LD e capa", "Montar o volume", "Conferir o selo", com anexar.

  O Topo tem "Painel" e "Nexo" lado a lado.
- **Evidência:** `redesign/inicio_padrao.png`, `redesign/conversa_nova.png`; controles agregados por tela em `redesign/inventario.json`. "Conferir as folhas" (Painel) e "Conferir o selo" (Conversa) parecem ser a mesma tarefa com nomes diferentes.
- **Por que importa:** pela premissa ("o Nexo é um chat que audita", uso pontual), a pessoa abre para uma tarefa. Duas portas iguais obrigam a escolher entre telas antes de escolher a tarefa. A diferença de nome para a mesma ação gera dúvida.
- **Hoje:** status DUPLICATED.
- **Esperado:** uma porta. Ou o Painel leva para a conversa já com a tarefa, ou a Conversa nova é a home.
- **Recomendação:** decidir qual das duas é a home. Na outra, os atalhos de tarefa viram links para a porta escolhida. Unificar "Conferir as folhas" e "Conferir o selo".
- **Confiança:** média. A duplicidade é fato; o custo para o usuário é inferência.

### UX-003 — O protótipo não deixa testar a premissa: as respostas do chat são fixas

- **Categoria:** UX / validação · **Severidade:** P2 · **Tela:** Nexo: a auditoria, Conversa · **Rota:** `#/nexo-auditoria/respondendo`, `#/conversa/*`
- **Componente:** `responder()` em `tela-nexo-auditoria.tsx`
- **Problema:** as perguntas sobre a auditoria recebem respostas pré-escritas por palavra-chave. Não há como saber, no protótipo, se o desenho aguenta resposta longa, resposta errada, citação de achado inexistente ou demora real.
- **Evidência:** código de `responder()` e situações `respondendo`/`erro-resposta`, que são estados fixos.
- **Por que importa:** a premissa central ("onde eu tiro uma dúvida sobre o projeto auditado?") é exatamente o que o protótipo menos prova.
- **Hoje:** roteiro.
- **Esperado:** antes de validar a tela, um teste com o motor real, ou ao menos com respostas reais gravadas de auditorias antigas.
- **Recomendação:** gravar 10 respostas reais do `audit-chat` em produção e reproduzi-las no protótipo, com a mesma largura e as mesmas citações.
- **Confiança:** alta.

### UI-003 — O sistema `ds` é desviado em centenas de valores soltos

- **Categoria:** Design system · **Severidade:** P2 · **Telas:** todas · **Rota:** —
- **Componente:** 30 arquivos CSS das telas aprovadas, mais `components/ds/*.css` e `app/prototipo/*.css`
- **Problema:** os valores soltos convivem com 1.752 usos de `var(--ds-*)`.
- **Evidência:** varredura dos CSS:

  | Tipo de valor | Fora do token |
  |---|---|
  | Hex literal | 64 (41 distintos; maiores: `visor.css` 14, `mapa/cartoes.css` 12, `ds/medidas.css` 12, `auditoria.css` 6) |
  | `rgb()`/`rgba()` literal | 189 |
  | `font-size` | 40 tamanhos fora do token, de 3,6 px a 48 px |
  | `border-radius` | 22 raios fora do token |
  | Espaçamento | 663 valores px fora da escala 4/8 (3, 5, 7, 9, 11, 13, 18, 22, 26…) |
  | `z-index` | 15 níveis distintos, até 1000 |
  | Duração | `0.2s` ×41 e `0.25s` ×17 escritas à mão |

- **Por que importa:** na migração cada valor solto vira uma decisão sem dono. O tema não muda num lugar só, e as próximas telas copiam o desvio.
- **Hoje:** tokens para cor de superfície e texto; geometria e tipografia em boa parte à mão.
- **Esperado:** escala de tipo, raio, espaço, camada e duração em token, com exceção justificada em comentário (por exemplo, miniaturas de página).
- **Recomendação:** antes de migrar cada tela, uma passada de "tokenizar o que repete 3+ vezes". O resto fica comentado como exceção.
- **Confiança:** alta.

### QA-001 — Ctrl K não abre a busca em Projetos, Projeto e Achados

- **Categoria:** QA · **Severidade:** P2 · **Telas:** Projetos, Projeto, Achados · **Rotas:** `#/projetos/*`, `#/projeto/*`, `#/achados/*`
- **Componente:** `tela-projetos.tsx:229-230`, `tela-projeto.tsx:267-268`, `tela-achados.tsx:171-172`
- **Problema:** o atalho de lista J/K trata `e.key === "k"` e chama `preventDefault()` sem olhar `ctrlKey`. O atalho global (`app/prototipo/prototipo.tsx:157`) ignora evento tratado, então Ctrl K morre. O Topo dessas telas mostra "Buscar obra, código ou ação (Ctrl K)".
- **Evidência:** Playwright: Ctrl K em `#/projetos/lista`, `#/projeto/com-registros` e `#/achados/com-voce` deixa 0 diálogos e o foco no `BODY`. Em `#/mapa/lido`, `#/resultado/fila`, `#/conversa/nova` e `#/admin/cockpit`, abre a barra com foco no campo (`artifacts/teclado-e-movimento.json`).
- **Por que importa:** o atalho prometido falha justamente nas telas de lista. Se o código migrar como está, o defeito vai junto.
- **Hoje:** Ctrl K morto em 3 telas.
- **Esperado:** abre a busca em toda tela, exceto onde a própria tela é a busca.
- **Recomendação:** nos três handlers, sair cedo quando `e.ctrlKey || e.metaKey || e.altKey`, como já faz `resultado-e/fila.tsx:177`.
- **Confiança:** alta.

### QA-003 — O botão principal do Mapa e o seletor de tomos não fazem nada

- **Categoria:** QA · **Severidade:** P2 · **Tela:** Mapa do volume · **Rota:** `#/mapa/lido`, `#/mapa/vou-gerar`
- **Componente:** `app/lab/telas/mapa/lado.tsx:117`
- **Problema:** "Confirmar e gerar" (e "Gerar mesmo assim") é um `<Botao>` sem `onClick`. "2 tomos ⌄" (`tela-mapa.tsx:232`) tem `aria-haspopup="listbox"` e chevron, mas não abre lista. O controle "Nº de tomos" do inventário existe só como desenho.
- **Evidência:** sonda de cliques (`artifacts/botoes-mortos.json`): "Gerar mesmo assim" e "2 tomos" não causam mutação nem navegação. Código sem handler. Captura em `issues/QA-003-mapa-lido.png`.
- **Por que importa:** é a ação que fecha o fluxo do Mapa. O protótipo foi pedido para "testar todos os tipos de interações", e aqui o fluxo termina num botão mudo.
- **Hoje:** clique sem efeito.
- **Esperado:** levar a `#/nexo/gerando` ou `#/mapa/desatualizado` → montado, como a conversa faz.
- **Recomendação:** ligar com `useIr()`.
- **Confiança:** alta.

### QA-004 — "Recolher as conversas" e "Recolher o chat" funcionam numa tela do Nexo e não na outra

- **Categoria:** QA / consistência · **Severidade:** P2 · **Tela:** Nexo: montar o volume · **Rota:** `#/nexo/*`
- **Componente:** `app/lab/telas/nexo/tela-nexo.tsx:471-474`
- **Problema:** os dois botões não têm `onClick` em `tela-nexo.tsx`. Em `tela-nexo-auditoria.tsx:163-166`, o mesmo par alterna estado com `aria-pressed`.
- **Evidência:** sonda de cliques: os dois estão mortos em `#/nexo/lido` e funcionam em `#/nexo-auditoria/pronta` (0 mortos em 45). Captura em `issues/QA-004-nexo-lido.png`.
- **Por que importa:** é o mesmo shell e o mesmo ícone com comportamentos diferentes. Na migração, dois componentes para uma peça.
- **Hoje:** dois `Topo` do palco divergentes.
- **Esperado:** um componente de cabeçalho do palco usado pelas duas telas.
- **Recomendação:** extrair o cabeçalho do palco de `tela-nexo-auditoria.tsx` e usá-lo em `tela-nexo.tsx`.
- **Confiança:** alta.

### QA-006 — No admin, cartões com seta e "Abrir Pessoas" não abrem nada; "atualizar" e "sair" também não

- **Categoria:** QA · **Severidade:** P2 · **Tela:** Administração · **Rota:** `#/admin/*`
- **Componente:** `Numero` em `app/lab/telas/admin/tela-admin.tsx:133-150`, botões em `:89`, `:95`, `:317`
- **Problema:** os números do Cockpit são `<button>` com `title="Abrir {para}"` e seta, mas sem handler. Na sessão admin, "atualizar", "sair" e "Atualizar R" também não fazem nada.
- **Evidência:** sonda de cliques: 9 mortos em `#/admin/cockpit`, 8 em `#/admin/pessoas` e 6 em `#/admin/dados` (`botoes-mortos.json`). Código sem `onClick`. Captura em `issues/QA-006-admin-cockpit.png`.
- **Por que importa:** a seta promete navegação. "sair" deveria levar a `#/admin/sem-token`, que existe.
- **Hoje:** affordance falsa.
- **Esperado:** número leva à seção, "sair" leva a sem-token e "atualizar" mostra o esqueleto da rede simulada.
- **Recomendação:** ligar com `useIr()` e com o mesmo estado de carregamento das outras telas.
- **Confiança:** alta para tiles, atualizar e sair. "Filtrar" (Dados) e "Salvar" (Pessoas) entraram na sonda, mas podem ser não-operação legítima sem mudança, por isso ficaram fora.

### A11Y-003 — O mapa de páginas põe `aria-label` em `<span>` sem papel

- **Categoria:** Acessibilidade · **Severidade:** P2 · **Telas:** Nexo: a auditoria, Auditoria rodando, Resultado, Admin · **Rotas:** 20 situações
- **Componente:** `MapaDasPaginas` (`components/ds/graficos.tsx`)
- **Problema:** `span[aria-label="Página N: x pontos"]` não tem `role`, e o rótulo é ignorado.
- **Evidência:** axe `aria-prohibited-attr`, 735 nós.
- **Por que importa:** a informação "onde estão os achados" some para leitor de tela.
- **Hoje:** os rótulos não são lidos.
- **Esperado:** `role="img"` em cada célula, ou um resumo textual único ("achados nas páginas 1, 6, 9…") e as células `aria-hidden`.
- **Recomendação:** a segunda opção, que evita 42 paradas de leitura.
- **Confiança:** alta.

### A11Y-004 — Contraste abaixo de 4,5:1 em 73 situações

- **Categoria:** Acessibilidade · **Severidade:** P2 · **Telas:** 14 de 16 · **Rotas:** 73 situações
- **Componente:** tokens de texto terciário e "nada"
- **Problema:** axe `color-contrast`, 329 nós. Casos medidos:

  | Onde | Texto / fundo | Razão |
  |---|---|---|
  | Projetos, "nada" | `#54575f` / `#121317` | 2,56 |
  | "Perguntar ao Nexo", texto pequeno | `#80858f` / `#f2f3f5` | 3,33 |
  | Painel, mês do gráfico | `#6e737c` / `#0a0e11` | 4,06 |
  | Texto terciário `#80858f` sobre superfície elevada | — | 4,24 / 4,34 |

  No último caso o token fica abaixo do próprio valor que promete.
- **Evidência:** `redesign/inventario.json` (campo `axe`). No atual: 0 nas mesmas rotas, exceto `/nexo`, que tem `list`/`listitem` (`axe-atual.json`).
- **Por que importa:** é regressão sobre o atual. Texto terciário carrega datas, contagens e "sem dono".
- **Hoje:** cinza demais sobre superfícies elevadas.
- **Esperado:** 4,5:1 para texto normal em toda superfície em que o token é usado.
- **Recomendação:** clarear o terciário só nas superfícies elevadas (`--ds-texto-3` por camada). Tirar do axe as miniaturas decorativas do Mapa com `aria-hidden`, que hoje somam ruído (2,49:1 em texto de papel desenhado).
- **Confiança:** alta.

---

## P3

### PARITY-005 — "Como funciona o Nexo" (tour com projeto de exemplo) não tem equivalente

- **Categoria:** Paridade · **Severidade:** P3 · **Tela:** Nexo · **Rota:** `/nexo`
- **Problema:** o tour de 11 passos que abre o projeto de exemplo (`issues/PARITY-005-tour-atual.png`) não aparece no redesenho. Há "primeiro-acesso" no Painel, mas só com texto.
- **Evidência:** `grep "Como funciona"` não acha nada nas telas aprovadas.
- **Por que importa:** é o único caminho de aprender sem gastar uma auditoria real.
- **Recomendação:** decidir. Se sai, registrar; se fica, a Ajuda pode abrir o projeto de exemplo.
- **Confiança:** alta no fato.

### UX-002 — Os atalhos Ctrl A e Ctrl L disputam com o navegador

- **Categoria:** UX · **Severidade:** P3 · **Tela:** todas · **Rota:** sobreposição "Atalhos de teclado" (`?`)
- **Problema:** a lista mostra "Ir para auditoria Ctrl A" e "Ir para montagem de LDs Ctrl L", herdados de `GLOBAL_SHORTCUTS` do app atual. Ctrl A é "selecionar tudo"; Ctrl L é a barra de endereço.
- **Evidência:** texto da sobreposição capturado em `teclado-e-movimento.json`; `components/keyboard-shortcuts-help.tsx:14-27` no atual.
- **Recomendação:** trocar por sequência (G depois A, como Linear e GitHub) ou tirar. O redesenho já mudou o mundo (LD virou conversa), e o atalho para "montagem de LDs" perdeu o destino.
- **Confiança:** alta.

### UI-004 — Cinco estilos de título de página

- **Categoria:** UI · **Severidade:** P3 · **Telas:** todas
- **Problema:** o `h1` muda de estilo de tela para tela (medido no DOM):

  | Telas | Estilo do `h1` |
  |---|---|
  | Projetos, Achados, Admin, Ajuda, Mapa, Projeto | 24/400 |
  | Resultado, Nexo: a auditoria | 28/300 |
  | Painel, Auditoria | 30/300 |
  | 404 | 30/500 |
  | Entrada | 30/600 |

  Conversa e Montar volume não têm `h1`.
- **Recomendação:** dois níveis, página e documento, em token.
- **Confiança:** alta.

### UI-005 — Em 2560 px as linhas da fila esticam a mais de 1.000 px

- **Categoria:** UI · **Severidade:** P3 · **Tela:** Nexo: a auditoria · **Rota:** `#/nexo-auditoria/pronta`
- **Problema:** em "Falta tratar", o título do achado fica à esquerda e disciplina e responsável no fim de uma linha de cerca de 1.100 px. O mapa "Onde estão" vira quadrados de 60 px.
- **Evidência:** `issues/UI-005-nexo-auditoria-2560.png`.
- **Por que importa:** 2560 é a tela de quem usa (memória "testar em 2560"). O olho cruza a tela inteira para ligar achado e dono.
- **Recomendação:** largura máxima de leitura na lista (cerca de 960 px), com o excedente para o palco ou o chat.
- **Confiança:** alta.

### UI-006 — Telas aprovadas acopladas ao CSS de outra tela, e 17 versões arquivadas na mesma árvore

- **Categoria:** Design system / manutenção · **Severidade:** P3
- **Problema:** Projetos e Projeto reusam `mapa.css` (`.mp-grade`, `.mp-painel`, `.mp-conf`), então a grade de lista é "do Mapa". Em `app/lab/telas` há 17 pastas de versões arquivadas: inicio-d, -e, -f, painel, -b, -oficio, resultado, -c, -d, -v1, auditoria-v1, -cheia, conversa-v1, projetos-c, volumes, mapa-cartoes, orbe.
- **Por que importa:** a migração vai copiar a grade como "estilo do Mapa". A correção de A11Y-002 tem de ser feita num lugar que não é óbvio.
- **Recomendação:** extrair `.mp-grade` e `.mp-painel` para `components/ds` (Grade, Painel) antes de migrar listas, e mover as arquivadas para fora do caminho de build.
- **Confiança:** alta.

### QA-002 — No Painel, Ctrl K não faz nada

- **Categoria:** QA · **Severidade:** P3 · **Tela:** Painel · **Rota:** `#/inicio/*`
- **Problema:** é intencional ("onde a própria tela é a busca", `prototipo.tsx:152`), mas o foco não vai para a barra do Painel. A sobreposição de atalhos diz "Buscar obra, código ou ação, Ctrl K, em qualquer tela".
- **Evidência:** Ctrl K em `#/inicio/padrao` deixa o foco no `BODY`.
- **Recomendação:** no Painel, Ctrl K foca a barra.
- **Confiança:** alta.

### QA-005 — As escolhas do chat em "Montar o volume" não respondem

- **Categoria:** QA · **Severidade:** P3 · **Tela:** Nexo: montar o volume · **Rota:** `#/nexo/lido`
- **Problema:** "Dividir assim ↵" e "Um tomo só" (`tela-nexo.tsx:216`) não têm `onEscolher`. Na Conversa e no Nexo: a auditoria, as `Saidas` levam à situação seguinte.
- **Evidência:** sonda de cliques.
- **Recomendação:** "Dividir assim" leva a `#/nexo/dividido`.
- **Confiança:** alta.

### QA-007 — Os atalhos de navegação listados não estão ligados no protótipo

- **Categoria:** QA · **Severidade:** P3 · **Tela:** todas
- **Problema:** a sobreposição lista Ctrl G, Ctrl A, Ctrl L e Ctrl Shift A. Nenhum tem handler no protótipo: `grep` em `app/prototipo` e `app/lab/telas/_comum` não acha `"g"` com `ctrlKey`.
- **Recomendação:** ligar, ou tirar da lista junto com UX-002.
- **Confiança:** alta.

### A11Y-005 — Oito controles sem nome acessível

- **Categoria:** Acessibilidade · **Severidade:** P3 · **Rotas:** `#/mapa/corrigindo` (4), `#/projeto/configuracoes` (4)
- **Evidência:** campo `semNome` do inventário: controle visível sem texto, `aria-label` nem `aria-labelledby`.
- **Recomendação:** rotular os campos do formulário de correção da folha e de configurações da obra.
- **Confiança:** alta no número. Não abri cada um para nomear.

### A11Y-006 — Conversa e Montar volume não têm título de página

- **Categoria:** Acessibilidade · **Severidade:** P3 · **Rotas:** `#/conversa/*`, `#/nexo/*`
- **Evidência:** `document.querySelectorAll("h1").length === 0` nas duas.
- **Recomendação:** `h1` visualmente oculto com o nome da conversa.
- **Confiança:** alta.

### A11Y-007 — Alvos de clique menores que 24 px

- **Categoria:** Acessibilidade · **Severidade:** P3
- **Evidência:** `responsivo.json`:
  - caixas de seleção de Pessoas: 14×14;
  - "Marcar como conferido" do Mapa: 20×17;
  - blocos da linha do tempo da Auditoria: 20 px de altura;
  - "atualizar · trocar · sair" do admin: 18 px de altura.
- **Por que importa:** WCAG 2.5.8 (AA, 2.2). O axe 2.1 não pega.
- **Recomendação:** área de clique de 24 px via `::after`, sem mudar o desenho.
- **Confiança:** média. Algumas podem cair na exceção de espaçamento.

### SLOP-001 — "Boa noite, Victor." como título do Painel

- **Categoria:** AI slop · **Nível:** AI-SLOP-LOW · **Severidade:** P3 · **Rota:** `#/inicio/padrao`
- **Problema:** a saudação por hora é o padrão mais reconhecível de interface gerada. Ela ocupa o `h1` da tela de início de tarefa.
- **Evidência:** `redesign/inicio_padrao.png`. O app atual já tem "Boa noite, Usuario. O que vamos montar — ou auditar?" no Nexo (`current/inventario.json`, `/audit`), então é herança, não regressão.
- **Recomendação:** pôr a tarefa no título ("O que vamos auditar?") e o nome no Topo, onde ele já está.
- **Confiança:** média, porque é juízo de gosto, com evidência de padrão.

### SLOP-002 — Violeta + orbe brilhante + "IA" é a combinação mais associada a produto genérico de IA

- **Categoria:** AI slop · **Nível:** AI-SLOP-LOW · **Severidade:** P3
- **Problema:** o próprio dono levantou isso em 01/10 ("meio IA slop"). Grafite, ciano e CAD foram avaliados, e ele decidiu manter o violeta.
- **Por que importa:** registro apenas. A decisão é consciente e o resto da interface (tabelas densas, monoespaçada nos códigos, sem gradiente decorativo) contrabalança.
- **Recomendação:** nenhuma ação. O risco fica controlado se o violeta continuar restrito a sinal (orbe, seleção, atual), como hoje.
- **Confiança:** alta no registro.

---

## P4

### QA-008 — No login de dev, o placeholder mostra o e-mail do ambiente

- **Categoria:** QA · **Severidade:** P4 · **Rota:** `/login` (PR #9)
- **Problema:** `placeholder={\`em branco: ${devUser?.email}\`}` (`app/login/page.tsx:112`) mostra o e-mail pessoal do dono.
- **Por que importa:** só aparece com `isDevAuthEnabled()`, que é falso em produção. Captura de tela de dev compartilhada expõe o e-mail.
- **Recomendação:** "em branco: entra como o usuário do ambiente".
- **Confiança:** alta.
