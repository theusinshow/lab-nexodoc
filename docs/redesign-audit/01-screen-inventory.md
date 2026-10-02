# 01 — Inventário de telas

Toda tela das três versões, numerada. Fontes:

- **Atual:** captura em `localhost:3400` (`current/inventario.json`), com o usuário dev logado.
- **Redesenho:** o painel Alt P do `/prototipo` (`redesign/inventario.json`). Cada situação foi aberta pelo próprio endereço, com recarga.
- **Implementação:** `localhost:3400` deslogado, em 6 larguras (`implementation/inventario.json`).

## Atual (main)

| ID | Tela | Rota | Situações vistas | Notas |
|---|---|---|---|---|
| SCREEN-001 | Login | `/login` | padrão | `current/login-main.png` (main pura, servidor webpack 3300) |
| SCREEN-002 | Sem acesso | `/sem-acesso` | — | Logado vai para `/nexo`, deslogado para `/login`. Só renderiza com conta inativa, então não foi vista |
| SCREEN-003 | Painel | `/` | com projetos, Personalizar aberto | Seções: Onde você parou, Precisa da sua atenção, Seus projetos abertos, Seu espaço (Foco, Rascunho, Atividade) |
| SCREEN-004 | Nexo, boas-vindas | `/nexo` | padrão, tour, busca de ações, menu da conta | "Boa noite, Usuario. O que vamos montar — ou auditar?", 3 tarefas, área de soltar |
| SCREEN-005 | Nexo, auditoria | `/nexo` (obra 117-25) | conversa + canvas | Abas: Mapa do volume / Auditoria; Resumo / Achados / Parecer / No documento; EXPORTAR |
| SCREEN-006 | Nexo, como funciona | `/nexo` | projeto de exemplo | tour de 11 passos |
| SCREEN-007 | Projetos | `/projetos` | lista | cartões; Ativos / Arquivados / Todos; ordem; Novo projeto |
| SCREEN-008 | Projeto | `/projetos/[id]` | com registros | estatísticas, próxima ação, 4 módulos, Artefatos, Arquivos, Documentos, Eventos, Configurações |
| SCREEN-009 | Achados | `/achados` | com itens | Com você (11), Atribuídos por você (12) |
| SCREEN-010 | Ajuda | `/ajuda` | padrão | Para onde ir, Onde fica, Glossário |
| SCREEN-011 | Montar volumes | `/volumes` (e `/ferramentas`) | vazio | montagem manual com biblioteca de páginas |
| SCREEN-012 | Centro de controle | `/admin`, `/admin/{pessoas,dados,dinheiro,motor}` | com token | `/admin/{audits,lds,usage,quality,users,config}` redirecionam |
| SCREEN-013 | Página 404 | qualquer rota inexistente | — | "This page could not be found." (padrão do Next, em inglês, fundo branco) |
| SCREEN-014 | Redirecionamentos de intenção | `/audit`, `/capas`, `/ld` | — | vão para `/nexo?intencao=…` |

Erros de console nas 23 rotas atuais: 0, exceto a 404, que tem 1 erro e 1 resposta 404 esperados.

## Redesenho (`/prototipo`)

| ID | Tela | Hash | Situações | Aprovada? |
|---|---|---|---|---|
| SCREEN-015 | Entrada | `#/entrada/*` | 9: padrao, indo, erro, dev, contato, recado-enviado, recado-nao-saiu, sem-acesso, sem-responsavel | sim (9) |
| SCREEN-016 | Painel (Início D2) | `#/inicio/*` | 7: padrao, buscando, tarefa-escolhida, arquivo-recebido, arrastando, nada-com-voce, primeiro-acesso | sim (7) |
| SCREEN-017 | Nexo: a auditoria | `#/nexo-auditoria/*` | 6: pronta, rodando, achado, no-documento, respondendo, obra | **não registrada** (PARITY-006) |
| SCREEN-018 | Conversa com o Nexo | `#/conversa/*` | 15 | sim (15) |
| SCREEN-019 | Nexo: montar o volume | `#/nexo/*` | 7 | sim (7) |
| SCREEN-020 | Mapa do volume | `#/mapa/*` | 7 | sim (7) |
| SCREEN-021 | Auditoria rodando | `#/auditoria/*` | 7 | sim (7) |
| SCREEN-022 | Resultado da auditoria | `#/resultado/*` | 21 (resumo, fila, parecer, documento) | sim (15 + 3 parecer + 3 documento) |
| SCREEN-023 | Achados | `#/achados/*` | 5 | sim (5) |
| SCREEN-024 | Projetos | `#/projetos/*` | 6 | sim (6) |
| SCREEN-025 | Projeto (uma obra) | `#/projeto/*` | 6 | sim (6) |
| SCREEN-026 | Administração | `#/admin/*` | 17 | sim (17) |
| SCREEN-027 | Ajuda | `#/ajuda/*` | 6 | sim (6) |
| SCREEN-028 | Confirmações | `#/confirmacoes/confirmacao` | 1 | sim (dentro de Peças, 10) |
| SCREEN-029 | Página que não existe | `#/pagina-404/404` | 1 | sim (Peças) |
| SCREEN-030 | Página que não carregou | `#/pagina-erro/erro` | 1 | sim (Peças) |

Totais: 122 situações; 0 erros de console; 0 rolagem lateral em 1440. As peças de toda tela (Topo, menu da conta, Ctrl K, `?`, avisos, esqueletos) estão em todas as telas.

**Fora do redesenho (arquivadas):**

- Montar volumes manual (`app/lab/telas/volumes`), ver PARITY-003.
- Painel A, B e "ofício".
- Início D, E e F.
- Resultado v1, C e D.
- Auditoria v1 e "cheia".
- Conversa v1.
- Projetos C.

## Implementação (PR #9)

| ID | Tela | Rota | Larguras | Notas |
|---|---|---|---|---|
| SCREEN-031 | Login | `/login` | 1920, 1440, 1280, 1024, 768, 390 | axe 0 violações em todas; sem rolagem lateral; filme some abaixo de 900 px e a nota de celular aparece |
| SCREEN-032 | Sem acesso | `/sem-acesso` | — | não renderizável sem conta inativa (redireciona); conferido só no código (`components/entrada/*`) |
