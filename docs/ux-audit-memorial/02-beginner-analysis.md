# 02 — Perfil 1: iniciante absoluto

**Persona:** encarregado ou técnico de obra que recebeu acesso ao NexoDoc por convite. Usa WhatsApp e e-mail, abre PDF, nunca usou um "chat que audita". Lê a primeira linha de cada texto. Tem medo de apertar algo que não dá para desfazer. Não sabe o que é "gabarito", "LD", "separatriz" nem "falso positivo".

**Pergunta central:** uma pessoa que nunca viu o NexoDoc consegue concluir uma auditoria sem ajuda?

**Resposta curta: consegue chegar ao resultado, mas não sabe dizer o que o resultado significa nem quando terminou.** A entrada é boa e o processamento é o ponto mais forte do produto. Os riscos estão em três lugares: o tour, a sequência de confirmações e a leitura do resultado.

Base: execução real (f1, f2, f3) e código. A reação da persona é inferência.

## Percurso, ação por ação

| # | Pretende | Procuraria em | Escolhe | Certo? | Feedback | Dificuldade |
|---|---|---|---|---|---|---|
| 1 | "Quero conferir o memorial" | Algo escrito "memorial" | Cartão **"Auditar um memorial"** no Painel | Sim | Bom: "Precisa de memorial em PDF" | Nenhuma. A frase "precisa de" é o melhor texto da tela |
| 2 | Mandar o arquivo | Um botão "enviar" | **"Escolher o memorial"** | Sim | O orbe e o convite em primeira pessoa ("Me manda o memorial") | Se for usuário novo, **o tour de 11 passos pode abrir por cima** (B1) |
| 3 | Entender o que aconteceu | O meio da tela (maior área) | Lê o palco: "O parecer da auditoria aparece aqui. Confira a ficha do memorial no chat…" | Parcial | O palco manda olhar **para outro lugar** | O palco grande está vazio, com abas "Obra / Volume" que ela não pediu (B4) |
| 4 | Conferir a ficha | A ficha no chat | Lê "Obra", vê o selo **"confira"** | Parcial | — | "confira" parece **alerta de erro**; ela não sabe se o dado está errado ou só precisa ser lido. 3 linhas dizem "não veio na capa": também parece erro (B5) |
| 5 | Começar | Um botão grande | **"Auditar o memorial"** | Sim | Aparece "audita o memorial" **como se ela tivesse digitado** | Estranho: ela não escreveu isso (B6) |
| 6 | Esperar começar | — | Nada; o cartão novo nasceu **abaixo da dobra** | Não | Só o pílula "ir para as últimas mensagens" | Ela acha que já está rodando; clica de novo em "Auditar o memorial" → **segundo cartão** (B2) |
| 7 | Começar de verdade | Botão "Auditar" | Clica: **não acontece nada** (desligado) | Não | Texto pequeno: "Marque 'Conferi os dados da obra' para liberar" | Terceira vez que confere a mesma coisa. "Obra (gabarito)" e "Centro de custo" são palavras novas (B3) |
| 8 | Esperar | O meio da tela | Painel de processamento | Sim | **Excelente**: etapa atual, relógio, "Pode fechar a aba: eu continuo" | Depois de F5: "Enviando o documento para análise…" com 46 s decorridos contradiz "reconectada" |
| 9 | Saber o resultado | Uma frase grande: "pode" ou "não pode" | O palco abre em "Por disciplina", "Onde estão", "Falta tratar 5" | **Não** | O veredito "Revisar antes de emitir" **não está escrito no palco** em nenhum lugar visível; é um ponto âmbar num anel (f2/08) | **O ponto mais grave para ela** (B7) |
| 10 | Navegar o resultado | Abas com nome | 6 ícones sem rótulo na coluna do trilho | Não | Dica só ao passar o mouse | Não descobre "Relatório" nem "No documento" sem passar o mouse em cada ícone |
| 11 | Resolver um achado | Um botão "resolvido" | "Marcar corrigido" | Sim | Bom | **Medo**: ela não corrigiu o PDF ainda; "corrigido" no sistema significa o quê? Existe "Desfazer (Z)" e depois "Reabrir", mas ela não sabe disso antes |
| 12 | Saber se terminou | "Concluído" | Anel "0 de 5 tratados" | Parcial | — | Não existe "concluir"; ela não sabe se precisa tratar todos |
| 13 | Mandar para a prefeitura | "Baixar", "Exportar" | Ícone de documento no fim do trilho | Talvez | Abre aba nova com o PDF | Sem rótulo no palco; a Ajuda manda procurar "Exportar", que **não existe** (B8) |

## Problemas do iniciante

### B1 — O tour pode aparecer por cima da tarefa, e ensina outra coisa
- **Evidência:** f3/06–11: com `localStorage` limpo, o balão "1 de 11 · Um projeto de exemplo, para começar" abriu sobre `/nexo?intencao=auditar` e ficou aberto nas telas seguintes, para um usuário com 48+ conversas. O gatilho (`NexoWorkspace.tsx:2140-2170`) roda uma vez, na montagem, com `conv.conversations.length`, que pode ainda estar em 0 antes da lista carregar. Abriu em 1 de 3 navegadores limpos.
- **Impacto:** quem veio auditar recebe 11 balões, 5 sobre **volume** (selo, mapa, pilha); um dos alvos não existe mais (`abrir-parecer`). Ao fechar, sobra "Exemplo guiado — Escola Municip…" na barra (f3/08).
- **Situação:** Primeiro login do engenheiro convidado: clica "Auditar um memorial", o tour sequestra a tela, ele aperta "Próximo" 10 vezes sem ler e esquece o que ia fazer.
- **Solução:** ver doc 08. O tour automático sai; a orientação passa a ser contextual, ligada à tarefa escolhida.
- **Aceite:** em navegador limpo, `/nexo?intencao=auditar` nunca mostra balão de tour; nenhuma conversa "Exemplo guiado" é criada sem pedido.

### B2 — Um botão já usado continua convidando
- **Evidência:** f2 log: `botão 'Auditar o memorial' ainda clicável depois de usado: 1 true`; `cartões 'Conferi os dados' depois do clique repetido: 2`. O cartão duplicado sobrevive à auditoria com "Auditar" ativo e a frase "1 igual(is) — 100% do texto já foi lido antes" (f2/08 texto).
- **Impacto:** o medo de ação irreversível vira ansiedade: há dois "Auditar" e ela não sabe qual vale.
- **Solução:** a sugestão `slotRequest` some ou desliga depois de usada; um pedido repetido rola até o cartão existente em vez de criar outro.
- **Aceite:** clicar duas vezes em "Auditar o memorial" produz exatamente 1 cartão.

### B3 — Confirmar a mesma coisa três vezes, com nomes diferentes
- **Evidência:** ficha (Obra, Órgão, Município, **Código**) → botão → cartão (Obra **(gabarito)**, **Prefeitura**, Município, **Centro de custo**) → caixa "Conferi os dados da obra" → "Auditar" (`NexoWorkspace.tsx:1033-1052`, `ConfirmationCard.tsx:2691-2725, 2896-2935`).
- **Impacto:** o iniciante interpreta repetição como "fiz algo errado da primeira vez". Nomes diferentes para o mesmo dado parecem dados diferentes.
- **Solução:** fluxo único (doc 07, F1): a ficha é o cartão. Um botão "Conferi — auditar" ao pé da ficha.
- **Aceite:** do arquivo solto até a auditoria rodando, no máximo 2 cliques quando o código foi lido; cada dado tem um nome só em toda a jornada.

### B4 — O meio da tela não serve para nada antes do resultado
- **Evidência:** f1/06–07: palco de ~530 px vazio com "Obra / Volume" (Volume ativa); o cartão espremido nos 360 px do chat, abaixo da dobra.
- **Impacto:** o olhar vai para o centro, e o centro manda olhar para a direita.
- **Solução:** durante a preparação, o palco mostra o próprio memorial (a página da capa) e a ficha; as abas de volume não aparecem numa conversa de auditoria.
- **Aceite:** numa conversa iniciada por `intencao=auditar`, o palco nunca mostra a aba "Volume" antes de haver pranchas.

### B5 — "confira" e "não veio na capa" parecem erro
- **Evidência:** f1/06.
- **Solução:** "não veio na capa" vira campo vazio discreto com "opcional"; o selo "confira" ganha o porquê: "é por este nome que achamos texto de outra obra".
- **Aceite:** campo opcional ausente não usa cor nem itálico de alerta.

### B6 — A fala que ela não escreveu
- **Evidência:** f1/07: "audita o memorial" aparece como mensagem do usuário, seguida de "Pensou por 0,3 s" numa resposta fixa do servidor (`route.ts:258-272`).
- **Solução:** o clique no botão não fabrica uma fala do usuário nem o "Pensou por".
- **Aceite:** clicar "Auditar o memorial" não acrescenta bolha do usuário nem rótulo "Pensou por".

### B7 — O veredito não está na tela do resultado
- **Evidência:** f2/08, f3/05: no palco, o trilho compacto só tem o anel com um ponto âmbar; "Revisar antes de emitir" aparece só na dica do anel e no topo do "Resumo completo". O chat reabre rolado para o topo, longe da fala "Auditei…".
- **Impacto:** a única coisa que o iniciante precisa saber ("posso emitir?") depende de cor e de passar o mouse.
- **Solução:** faixa de veredito escrita no topo de toda leitura do resultado.
- **Aceite:** em qualquer leitura, o texto do veredito fica visível sem hover, em ≥1280 px.

### B8 — A Ajuda descreve botões que não existem
- **Evidência:** `components/telas/ajuda/dados.ts`: "Exportar, Copiar achados ou Copiar ações. Baixar .md", "Achado › Tratamento", "Ver no documento", "C confirma". No resultado vivo nada disso existe (só em `audit-result.tsx`, órfão). C **marca corrigido** (`pecas.tsx:988`).
- **Impacto:** o iniciante que procura ajuda se perde mais; pior: aperta C achando que "confirma" e encerra o achado.
- **Aceite:** cada caminho e tecla citados na Ajuda existem na tela; teste automático compara.

### B9 — Falha muda
- **Evidência:** f3/07: soltar um `.docx` → `HTTP 500 /api/nexo/classify`, **nenhuma mensagem** na tela.
- **Aceite:** arquivo não-PDF gera, em até 2 s, a frase "Este arquivo não é PDF. O Nexo audita o memorial em PDF."

### B10 — Prancha enviada para auditar vira outra tarefa
- **Evidência:** f3/08: tarefa "auditar", soltei `990_26_est_001_a.pdf` → "O que você quer que eu faça?" com "Criar a LD e a capa / Só a LD / Conferir as folhas". Nada diz "isto não é o memorial".
- **Aceite:** com `intencao=auditar` e só pranchas, o Nexo diz que recebeu prancha, não memorial, e repete o pedido do memorial antes das outras ofertas.

## Glossário que o iniciante não tem

| Termo na tela | Onde | Proposta |
|---|---|---|
| Obra (gabarito) | cartão | "Obra de referência" (some se o cartão for fundido) |
| Centro de custo | cartão | "Código" (o mesmo da ficha) |
| Análise profunda | painel de processamento | remover (não há escolha) |
| tratar como prancha | chip do anexo | "não é memorial? trocar" |
| Decisão técnica | fila | manter, com dica "o projeto segue assim de propósito, com motivo" |
| Falso positivo | fila | "A IA errou" (manter o termo técnico na dica) |
| sem dono | resumo | "ninguém atribuído" |
| ponto(s) técnico(s)/contratual(is) | veredito | plural correto |

## Nota do perfil (0–10)

| Métrica | Nota | Por quê |
|---|---|---|
| Clareza de navegação | 5 | Entrada ótima; resultado em ícones |
| Facilidade de aprendizado | 4 | Três confirmações, termos novos, tour desencontrado |
| Qualidade do feedback | 7 | Processamento exemplar; falhas mudas |
| Recuperação de erros | 5 | F5 é bom; prancha e não-PDF não recuperam |
| Tutorial | 2 | Fala de volume a quem veio auditar; pode sequestrar a tarefa |
