# 11 — Execução (08/10/2026)

Matheus aprovou tudo menos o **ponto 6** (abas com nome no lugar do trilho, fundir "Resumo completo" no Resumo). Ficaram de fora junto com ele: U09, U10, U25, R8 e D5. Decisões aplicadas: **D1** um clique "Conferi — auditar"; **D2** regra do veredito intacta + linha do tratamento; **D3** sem botão novo — a Ajuda aponta para o "Copiar o texto" que o Relatório já tinha; **D4** dicas no navegador.

Nada foi commitado: tudo está local na `main`, para teste em `http://localhost:3400/nexo`.

## O que mudou

| Item | O que está na tela agora | Onde |
|---|---|---|
| U02 + D2 | Faixa escrita do veredito no topo de toda leitura (menos a "geral"), com "x de y achados tratados" e, com tudo tratado, a linha "depois do tratamento" | `components/telas/resultado/faixa-do-veredito.tsx` |
| U01, R2, R3, D1 | A ficha do memorial já traz o cartão; o cartão não repete os dados (só numa rodada nova sem ficha); um botão "Conferi — auditar" / "Conferi — transcrever e auditar" com a declaração ao lado; a caixa e o "Auditar o memorial" saíram | `NexoWorkspace.tsx` (`appendMemorialIntake`), `ConfirmationCard.tsx` |
| U05, R12, R13 | Pedido escrito repetido: o cartão anterior sem parecer vira "Esta proposta foi refeita mais abaixo" — um cartão vivo só | `ConfirmationCard.tsx` (`superada`) |
| U18 | Sem código lido, o seletor de projeto aparece sozinho, antes do clique ("Conferi — auditar neste projeto") | `ConfirmationCard.tsx` |
| U03 | O tour não abre mais sozinho; passos com alvo morto (pilha, parecer completo) saíram; teste garante que todo alvo existe | `NexoWorkspace.tsx`, `passos-do-tour.ts`, `scripts/test-nexo-tour.ts` |
| Tutorial (doc 08) | Dicas de uma vez: "Enquanto lê" (processamento), "Como encerrar um achado" (1ª revisão), "Dá para ir mais rápido" (após 3 encerramentos com mouse); `?` abre a lista de atalhos; M1 virou uma frase no convite ("Leva de 1 a 5 minutos…"); "Como funciona o Nexo" traz as dicas de volta | `modules/nexo/lib/dicas-da-auditoria.ts`, `components/telas/comum/dica-de-uma-vez.tsx`, `fila-a.tsx`, `use-fila.ts` |
| U04, D3 | Ajuda reescrita contra a tela viva; teste que reprova rótulo inexistente (pegou também 2 desvios antigos da Ajuda de volume) | `components/telas/ajuda/dados.ts`, `scripts/test-ajuda-rotulos.ts` |
| U07 | Prancha na tarefa de auditar: "Isto é prancha, não o memorial descritivo. Para auditar, me manda o memorial em PDF." | `NexoWorkspace.tsx` (`appendSelosIntake`) |
| U08 | Palco da preparação mostra a capa real do memorial; abas "Obra/Volume" só com folhas ou documentos | `NexoCanvas.tsx` (`CapaDoMemorial`), `VistaDoVolume.tsx` |
| U11 | Fila abaixo de 1600 px recolhe a lista de conversas (sem gravar); grades com coluna `minmax(0,1fr)`; detalhe estreito empilha; altura compensa a faixa — a 1440×900 os três botões de encerrar ficam inteiros | `areas-recolhidas.ts`, `PalcoDoNexo.tsx`, `fila-a.css`, `embutido.css` |
| U13 | Abrir uma conversa leva o chat ao fim (fala final da auditoria) | `NexoChat.tsx` |
| U14 | Tecla com cara de tecla (borda inferior); "Abrir a fila" sem o "2" | `app/ds.css`, `resumo.tsx` |
| U16 | "Obra de referência", "Código", sem "Análise profunda", "sem responsável" | vários |
| U17 | Plurais por `lib/plural.ts` no veredito, no escopo e na comparação ("1 capítulo igual") | `lib/audit-report.ts`, `lib/audit-fingerprint.ts` |
| U21, R11 | "Nova conversa" na tela vazia da tarefa mantém a tarefa; tarefa escolhida mostra "Fazer outra coisa" no lugar dos 3 chips | `NexoWorkspace.tsx`, `PartidasDoNexo.tsx` |
| U22, U23 | Pós-F5 "Reconectada: aguardando o servidor"; título e anel empilham em palco estreito | `AuditoriaEmCurso.tsx`, `auditoria.css` |
| U12, U24 | Título da conversa pelo arquivo ("Memorial bateria, revisão A"); memorial sem auditoria diz "memorial lido, auditoria não rodou"; Painel "Continuar" usa a pasta quando não há projeto | `conversation-store.tsx`, `estado-da-conversa.ts`, `HistoricoDeConversas.tsx`, `app/page.tsx` |
| R4 | Atribuir com a mesma lista (busca, você primeiro) na linha, no lote e no detalhe | `fila-a/pecas.tsx` (`ListaDePessoas`) |
| R10 | "Perguntar ao Nexo" no trilho só com o chat oculto | `PalcoDoNexo.tsx` |
| P7 | Apagados: `AuditCanvas`, `FindingCardNode`, `MemorialPageNode`, `RecurringStackNode`, `audit-canvas-realce`, `layout-auditoria` e o teste deles | — |

## Correções da própria auditoria

- **U06 era falso positivo**: o .docx foi injetado num input que só a gaveta de depuração alcança. A frase de recusa real ficou neutra ("o memorial ou as pranchas").
- **"Cidades duplicadas" (U12) era falso**: cada grupo é uma obra; o nome sem acento vem do carimbo.
- **U19**: a barra "Notificar por e-mail" já aparece sozinha no topo da fila depois de atribuir — resolvido dizendo isso na Ajuda, sem controle novo.

## Ficou de fora

- `components/audit-result.tsx` (a tela `AuditResult` morta, ~3.000 linhas) e `resultado/fila.tsx` (vivo só pelo `Trecho`): exportam funções usadas pelo trilho e pelo palco; separar é cirurgia própria.
- "tratar como prancha" continua (as jornadas c2/c3 e duas provas dependem do rótulo; gravidade baixa).
- "Usar um memorial de exemplo" (doc 08, M1): o exemplo segue no tour sob demanda.
- "propôs auditoria · 0,1 s" ainda aparece no pedido ESCRITO (o botão, que era o caso comum, saiu).

## Verificação

- `tsc` (config que exclui `.next`): 0 erros. `eslint` nos arquivos mexidos: só os 5 erros antigos de `largura-do-copiloto.ts`.
- Bateria completa (08/10): 21/21 jornadas depois de atualizar a3, a6, a7, a8, c3, x2 e o helper; `test-audit-engine-verdict` ajustado aos plurais. **Vermelho pré-existente, não meu:** `test-limite-do-anexo` (teto de arquivo escrito em `entrega-do-volume.ts`, commit b2998c66 de 06/10).
- Prova real na 3400 (`scratchpad/ux-audit/fase4.mjs`, duas auditorias reais do 990-26, ~50 s cada): todas as 17 checagens verdes; capturas em `scratchpad/ux-audit/f5`.
