# 05 — Inventário de redundâncias

Legenda: **Desnecessária** = pode sair sem perda; **Justificada** = existe em contextos diferentes e deve ficar (às vezes com ajuste); **Parcial** = o conceito fica, a forma muda.

## Resumo

| # | Redundância | Veredito | Preservar |
|---|---|---|---|
| R1 | 7 rótulos para "começar auditoria" | Parcial | As 8 portas; muda só o nome |
| R2 | Ficha + cartão mostram os mesmos dados | **Desnecessária** | A ficha (editável) |
| R3 | Três confirmações em série | **Desnecessária** | A conferência explícita (1 clique) |
| R4 | Atribuir em 4 lugares | Parcial | Linha, lote, detalhe (um componente) |
| R5 | "Marcar corrigido" na linha e no detalhe | Justificada | Os dois |
| R6 | "Copiar link" em 2 lugares | **Desnecessária** (o menu "Mais" vive só no lab) | O botão do detalhe |
| R7 | "Procede / Gravidade errada" no menu "Mais" e à vista | **Desnecessária** (mesmo caso) | O voto à vista |
| R8 | "Resumo" × "Resumo completo" × "Onde estão" × "No documento" | **Desnecessária** em parte | Resumo (com veredito) e No documento |
| R9 | Veredito em 4 lugares, nenhum visível no palco | Parcial | Uma faixa fixa |
| R10 | "Perguntar ao Nexo" no trilho com o chat aberto ao lado | Parcial | Só quando o chat estiver oculto |
| R11 | Chips da saudação repetem a tarefa escolhida no Painel | **Desnecessária** quando há `intencao` | Os chips na saudação sem tarefa |
| R12 | Cartão de proposta duplicado por clique repetido | **Desnecessária** (defeito) | — |
| R13 | Dois botões "Auditar de novo" (fala final e cartão duplicado) | Desnecessária | O da fala final |

---

### R1 — Sete nomes para a mesma ação
1. **Onde:** "Auditar um memorial" (Painel, saudação, Ctrl K), "Auditar documentos" (Projetos, Projeto), "Nova auditoria" (Achados), "Escolher o memorial" (zona), "Auditar o memorial" (sugestão), "Auditar" (cartão), "Auditar neste projeto" (seletor). Ver doc 01, "As 8 portas".
2. **Hoje:** todas levam a `/nexo?intencao=auditar` ou ao mesmo cartão.
3. **Por que prejudica:** "Auditar documentos" sugere que se audita prancha; "Nova auditoria" sugere formulário. Nome diferente sugere funcionalidade diferente.
4. **Desnecessária?** As portas não; os nomes, sim.
5. **Solução:** porta = "Auditar um memorial"; ação final = "Conferi — auditar".
6. **Preservar:** todas as 8 portas (contexto: quem está em Projetos não deve voltar ao Painel).

### R2 — Os mesmos dados da obra, duas vezes, com nomes diferentes
1. **Onde:** ficha (`fichaDoMemorial`, `NexoWorkspace.tsx:1037`) e cartão (`ConfirmationCard.tsx:2691-2725`).
2. **Hoje:** Obra/Órgão/Município/Código na ficha; Obra (gabarito)/Prefeitura/Município/Centro de custo no cartão; duas tipografias (ficha em sans, cartão em mono, f2/05).
3. **Por que prejudica:** dupla leitura; nomes diferentes; corrigir no cartão é impossível (ele manda voltar "à ficha, acima").
4. **Desnecessária:** sim.
5. **Solução:** o cartão deixa de repetir; o que só ele tem (base de comparação, páginas mudas, estimativa, seletor de projeto, "obra lida do próprio memorial") passa para o rodapé da ficha.
6. **Preservar:** a ficha editável com lápis, que é a régua real (`corrigirFicha`).

### R3 — Três confirmações para um fato
1. **Onde:** botão "Auditar o memorial" → caixa "Conferi os dados da obra" → "Auditar".
2. **Hoje:** 3 cliques + 1 rolagem; a caixa trava o botão.
3. **Por que prejudica:** tempo, e a repetição treina a pessoa a marcar a caixa sem ler, o que derrota o propósito dela.
4. **Desnecessária:** os dois primeiros portões, sim. **A conferência explícita, não**: foi adicionada em 05/10 por um incidente real (141-26).
5. **Solução:** um botão primário na ficha, com o verbo da garantia: **"Conferi — auditar"**.
6. **Preservar:** que nenhuma auditoria comece sem um gesto explícito de quem viu a obra.
- **Divergência registrada:** ver doc 10, D1.

### R4 — Atribuir em quatro lugares
1. **Onde:** linha rápida (`AcoesRapidas`, `pecas.tsx:314`), lote (`BarraDeSelecao`, `:446`), detalhe (`Atribuidor`, `:645`), `Responsavel` "Atribuir a…/Trocar" (`:726`, **usado só no lab e no `audit-result.tsx` órfão**).
2. **Hoje:** três componentes de menu diferentes (MenuSolto sem busca × Flutuante com busca).
3. **Por que prejudica:** comportamento diferente por lugar (com e sem busca); rótulos diferentes.
4. **Desnecessária?** Os três contextos vivos são justificados (varrer, lote, ler); o quarto é código morto.
5. **Solução:** o `Atribuidor` (com busca e "você" primeiro) nos três lugares.
6. **Preservar:** atribuição em lote.

### R5 — "Marcar corrigido" na linha e no detalhe
- Justificada: na linha serve à varredura ("já sei que este está corrigido") sem abrir o detalhe. **Preservar os dois.** Ajuste: mesmo ícone e mesma dica nos dois.

### R6 e R7 — Menu "Mais" (`CabecaDoAchado`) com "Copiar link", "O achado procede", "Gravidade errada"
- **Onde:** `pecas.tsx:461-497`. **Uso:** só `app/lab/telas/achados-modelos/*`. Na tela viva, o voto está à vista (`AvaliarIA`) e o link no botão `CopiarLink`.
- **Veredito:** redundância **de código**, não de tela. Apagar quando os modelos do lab forem aposentados. Preservar `AvaliarIA` e `CopiarLink`.

### R8 — Quatro jeitos de ver "onde estão os achados" e dois "Resumo"
1. **Onde:** Resumo → "Onde estão" (quadradinhos de tom); Resumo completo → "Páginas do memorial" (os mesmos quadradinhos); No documento (miniaturas reais com pinos); Resumo completo (veredito, linha do tempo, por nível).
2. **Hoje:** f2/08 e f2/09 mostram "Tom da página = pontos marcados nela" duas vezes, com três quadrados sem número.
3. **Por que prejudica:** os quadradinhos não dizem nada (não há número de página nem legenda), e ocupam o lugar do veredito.
4. **Desnecessária:** sim, os quadradinhos. "No documento" é a versão útil.
5. **Solução:** o Resumo fica com: faixa do veredito, motivo, falta tratar (por nível), por disciplina, "O que foi lido", linha do tempo recolhida. "Onde estão" vira um link "Ver no documento (3 páginas com achado)".
6. **Preservar:** No documento; a linha do tempo (pedido do Matheus em 02/10: "a mesma tela que enquanto a auditoria tá rodando"). Ela continua acessível, recolhida.

### R9 — Veredito em quatro lugares, nenhum visível no palco
- **Onde:** dica do anel; "Resumo completo"; fala final no chat; PDF.
- **Hoje:** com o trilho compacto, o palco mostra só o ponto colorido.
- **Solução:** uma faixa de veredito fixa no topo do palco. As outras ocorrências continuam (chat e PDF são outros meios). A do anel vira redundante e pode sair da dica.

### R10 — "Perguntar ao Nexo" com o chat aberto
- **Onde:** `trilho.tsx:166`. f2/14: clicar não muda nada visível, porque o chat já está ao lado.
- **Solução:** mostrar o botão só quando o chat estiver oculto (ou focar o campo com um destaque visível).
- **Preservar:** o caminho para perguntar quando o resultado está em tela cheia (premissa "o chat é o produto").

### R11 — A tarefa escolhida duas vezes
- **Onde:** Painel "Auditar um memorial" → saudação com os chips "Montar um volume / **Auditar um memorial** / Conferir as folhas" (f1/03).
- **Solução:** com `intencao`, os chips somem; fica um link discreto "fazer outra coisa".

### R12 e R13 — Cartão duplicado e "Auditar" sobrevivente
- **Onde:** f2: 2 cartões; o segundo sobrevive à auditoria com "Auditar" e comparação "1 igual(is)".
- **Solução:** a sugestão usada desliga; o servidor (ou o cliente) não cria uma segunda proposta de auditoria para o mesmo memorial enquanto houver uma aberta: rola até ela.
- **Aceite:** 2 cliques em "Auditar o memorial" = 1 cartão; depois do parecer, nenhum "Auditar" ativo além de "Auditar de novo" na fala final.

## Redundâncias que parecem e não são

| Par | Por que fica |
|---|---|
| 8 portas de entrada | Cada tela tem o seu contexto (projeto, achados) |
| Veredito no chat e no PDF | Meios diferentes: conversa e documento oficial |
| "Ver no memorial" no detalhe e as páginas do achado | Página específica × página do grifo principal |
| Teclas e botões para as mesmas ações | Acessibilidade e velocidade |
| "Auditar sem transcrever" ao lado de "Transcrever e auditar" | Decisão de gasto; o texto diz o que se perde |
